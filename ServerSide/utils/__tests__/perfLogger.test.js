const mockMongodbQueriesTotal = { inc: jest.fn() };
const mockMongodbQueryDuration = { observe: jest.fn() };

describe('perfLogger', () => {
    let mongooseMock;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetModules();
        delete require.cache[require.resolve('mongoose')];
        mongooseMock = {
            plugin: jest.fn(),
        };
        jest.doMock('mongoose', () => mongooseMock);
        jest.doMock('../../monitoring/metrics', () => ({
            mongodbQueriesTotal: mockMongodbQueriesTotal,
            mongodbQueryDuration: mockMongodbQueryDuration,
        }));
    });

    afterEach(() => {
        jest.dontMock('mongoose');
        jest.dontMock('../../monitoring/metrics');
        delete process.env.PERF_LOG_ENABLED;
        delete process.env.PERF_SLOW_QUERY_MS;
    });

    const loadModule = () => require('../perfLogger');

    test('does not attach plugin when PERF_LOG_ENABLED is false', () => {
        process.env.PERF_LOG_ENABLED = 'false';
        loadModule();
        expect(mongooseMock.plugin).not.toHaveBeenCalled();
    });

    test('attaches plugin when PERF_LOG_ENABLED is true', () => {
        process.env.PERF_LOG_ENABLED = 'true';
        loadModule();
        expect(mongooseMock.plugin).toHaveBeenCalledWith(expect.any(Function));
    });

    test('perfMiddleware skips when disabled', () => {
        process.env.PERF_LOG_ENABLED = 'false';
        const { perfMiddleware } = loadModule();
        const next = jest.fn();
        perfMiddleware({}, {}, next);
        expect(next).toHaveBeenCalled();
    });

    test('perfMiddleware logs scoped endpoint when enabled', (done) => {
        process.env.PERF_LOG_ENABLED = 'true';
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        const { perfMiddleware } = loadModule();

        const res = { on: jest.fn((event, cb) => { if (event === 'finish') setTimeout(cb, 5); }) };
        const req = { method: 'GET', url: '/api/resource-waste/list' };
        perfMiddleware(req, res, () => {
            setTimeout(() => {
                expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[PERF_API]'));
                consoleSpy.mockRestore();
                done();
            }, 20);
        });
    });

    test('perfMiddleware does not log unscoped endpoint', (done) => {
        process.env.PERF_LOG_ENABLED = 'true';
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        const { perfMiddleware } = loadModule();

        const res = { on: jest.fn((event, cb) => { if (event === 'finish') setTimeout(cb, 5); }) };
        const req = { method: 'GET', url: '/api/auth/login' };
        perfMiddleware(req, res, () => {
            setTimeout(() => {
                expect(consoleSpy).not.toHaveBeenCalled();
                consoleSpy.mockRestore();
                done();
            }, 20);
        });
    });

    test('mongoose plugin skips when disabled', () => {
        process.env.PERF_LOG_ENABLED = 'false';
        const { perfMongoosePlugin } = loadModule();
        const schema = { pre: jest.fn(), post: jest.fn() };
        perfMongoosePlugin(schema);
        expect(schema.pre).not.toHaveBeenCalled();
    });

    test('mongoose plugin attaches hooks when enabled', () => {
        process.env.PERF_LOG_ENABLED = 'true';
        const { perfMongoosePlugin } = loadModule();
        const schema = { pre: jest.fn(), post: jest.fn() };
        perfMongoosePlugin(schema);
        expect(schema.pre).toHaveBeenCalled();
        expect(schema.post).toHaveBeenCalled();
    });

    test('mongoose post hook warns on slow query', () => {
        process.env.PERF_LOG_ENABLED = 'true';
        process.env.PERF_SLOW_QUERY_MS = '1';
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
        const { perfMongoosePlugin } = loadModule();
        const schema = { pre: jest.fn(), post: jest.fn() };
        perfMongoosePlugin(schema);

        const postCb = schema.post.mock.calls[0][1];
        const ctx = {
            op: 'find',
            mongooseCollection: { name: 'users' },
            getFilter: jest.fn().mockReturnValue({ name: 'test' }),
            _startTime: Date.now() - 10,
        };
        const next = jest.fn();
        postCb.call(ctx, null, next);

        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[SLOW_DB]'));
        expect(next).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    test('mongoose post hook skips when _startTime missing', () => {
        process.env.PERF_LOG_ENABLED = 'true';
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
        const { perfMongoosePlugin } = loadModule();
        const schema = { pre: jest.fn(), post: jest.fn() };
        perfMongoosePlugin(schema);

        const postCb = schema.post.mock.calls[0][1];
        const ctx = { _startTime: null };
        const next = jest.fn();
        postCb.call(ctx, null, next);

        expect(consoleSpy).not.toHaveBeenCalled();
        expect(next).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    test('mongoose post hook handles aggregate operation', () => {
        process.env.PERF_LOG_ENABLED = 'true';
        process.env.PERF_SLOW_QUERY_MS = '1';
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
        const { perfMongoosePlugin } = loadModule();
        const schema = { pre: jest.fn(), post: jest.fn() };
        perfMongoosePlugin(schema);

        const postCb = schema.post.mock.calls[0][1];
        const ctx = {
            op: 'aggregate',
            mongooseCollection: { name: 'logs' },
            _startTime: Date.now() - 10,
        };
        const next = jest.fn();
        postCb.call(ctx, null, next);

        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Pipeline: [...]'));
        consoleSpy.mockRestore();
    });

    test('mongoose post hook records Prometheus metrics', () => {
        process.env.PERF_LOG_ENABLED = 'true';
        process.env.PERF_SLOW_QUERY_MS = '99999';
        const { perfMongoosePlugin } = loadModule();
        const schema = { pre: jest.fn(), post: jest.fn() };
        perfMongoosePlugin(schema);

        const postCb = schema.post.mock.calls[0][1];
        const ctx = {
            op: 'find',
            mongooseCollection: { name: 'users' },
            getFilter: jest.fn().mockReturnValue({ name: 'test' }),
            _startTime: Date.now() - 50,
        };
        const next = jest.fn();
        postCb.call(ctx, null, next);

        expect(mockMongodbQueriesTotal.inc).toHaveBeenCalledWith({ op: 'find', collection: 'users' });
        expect(mockMongodbQueryDuration.observe).toHaveBeenCalledWith(
            { op: 'find', collection: 'users' },
            expect.any(Number)
        );
        expect(next).toHaveBeenCalled();
    });

    test('mongoose post hook records Prometheus metrics for unknown collection', () => {
        process.env.PERF_LOG_ENABLED = 'true';
        process.env.PERF_SLOW_QUERY_MS = '99999';
        const { perfMongoosePlugin } = loadModule();
        const schema = { pre: jest.fn(), post: jest.fn() };
        perfMongoosePlugin(schema);

        const postCb = schema.post.mock.calls[0][1];
        const ctx = {
            op: 'aggregate',
            _startTime: Date.now() - 20,
        };
        const next = jest.fn();
        postCb.call(ctx, null, next);

        expect(mockMongodbQueriesTotal.inc).toHaveBeenCalledWith({ op: 'aggregate', collection: 'unknown_collection' });
        expect(mockMongodbQueryDuration.observe).toHaveBeenCalledWith(
            { op: 'aggregate', collection: 'unknown_collection' },
            expect.any(Number)
        );
        expect(next).toHaveBeenCalled();
    });
});
