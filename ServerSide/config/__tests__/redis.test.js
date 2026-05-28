const mockInstances = [];
const mockOptions = [];

jest.mock('ioredis', () => {
    return jest.fn().mockImplementation((url, opts) => {
        const inst = {
            status: 'ready',
            on: jest.fn(),
            quit: jest.fn().mockResolvedValue(undefined),
            disconnect: jest.fn(),
        };
        mockInstances.push(inst);
        mockOptions.push(opts);
        return inst;
    });
});

jest.mock('../../utils/logger', () => ({
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
}));

const logger = require('../../utils/logger');

describe('redis config', () => {
    beforeEach(() => {
        mockInstances.length = 0;
        mockOptions.length = 0;
        logger.warn.mockClear();
        logger.error.mockClear();
        logger.info.mockClear();
    });

    const getRedis = () => {
        let mod;
        jest.isolateModules(() => {
            mod = require('../redis');
        });
        return mod;
    };

    test('createRedisClient uses REDIS_URL when set', () => {
        process.env.REDIS_URL = 'redis://localhost:6379';
        getRedis();
        expect(mockInstances.length).toBeGreaterThanOrEqual(1);
        delete process.env.REDIS_URL;
    });

    test('createRedisClient falls back to host/port options', () => {
        delete process.env.REDIS_URL;
        process.env.REDIS_SOCKET_HOST = '127.0.0.1';
        process.env.REDIS_SOCKET_PORT = '6380';
        getRedis();
        expect(mockInstances.length).toBeGreaterThanOrEqual(1);
        delete process.env.REDIS_SOCKET_HOST;
        delete process.env.REDIS_SOCKET_PORT;
    });

    test('createRedisClient enables tls for rediss://', () => {
        process.env.REDIS_URL = 'rediss://secure:6379';
        getRedis();
        expect(mockInstances.length).toBeGreaterThanOrEqual(1);
        delete process.env.REDIS_URL;
    });

    test('client registers error handler', () => {
        getRedis();
        const inst = mockInstances[0];
        expect(inst.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    test('error handler logs ECONNRESET as warning', () => {
        getRedis();
        const inst = mockInstances[0];
        const errorHandler = inst.on.mock.calls.find(c => c[0] === 'error')[1];
        errorHandler({ code: 'ECONNRESET', message: 'connection reset' });
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Kết nối bị ngắt'));
    });

    test('error handler disconnects on max clients', () => {
        getRedis();
        const inst = mockInstances[0];
        const errorHandler = inst.on.mock.calls.find(c => c[0] === 'error')[1];
        errorHandler({ message: 'max number of clients reached' });
        expect(inst.disconnect).toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalledWith('[Redis] Max clients reached, forcing reconnect');
    });

    test('getBullClient recreates client if status is end', () => {
        const redis = getRedis();
        const before = mockInstances.length;
        mockInstances[mockInstances.length - 1].status = 'end';
        redis.bullRedisClient;
        expect(mockInstances.length).toBe(before + 1);
    });

    test('getPubSubClient returns same client while healthy', () => {
        const redis = getRedis();
        const before = mockInstances.length;
        redis.pubClient;
        redis.pubClient;
        expect(mockInstances.length).toBe(before + 1);
    });

    test('getDedicatedPubClient recreates on close status', () => {
        const redis = getRedis();
        const before = mockInstances.length;
        mockInstances[mockInstances.length - 1].status = 'close';
        redis.dedicatedPubClient;
        expect(mockInstances.length).toBe(before + 1);
    });

    test('shutdownRedis quits clients and clears references', async () => {
        const redis = getRedis();
        const inst = mockInstances[0];
        await redis.shutdownRedis();
        expect(inst.quit).toHaveBeenCalled();
    });

    test('retryStrategy returns increasing delay', () => {
        getRedis();
        const opts = mockOptions[0];
        expect(opts.retryStrategy(1)).toBe(500);
        expect(opts.retryStrategy(10)).toBe(5000);
        expect(opts.retryStrategy(21)).toBeNull();
    });

    test('reconnectOnError returns true for known errors', () => {
        getRedis();
        const opts = mockOptions[0];
        expect(opts.reconnectOnError(new Error('ECONNRESET'))).toBe(true);
        expect(opts.reconnectOnError(new Error('ETIMEDOUT'))).toBe(true);
        expect(opts.reconnectOnError(new Error('ECONNREFUSED'))).toBe(true);
        expect(opts.reconnectOnError(new Error('unknown'))).toBe(false);
    });

    test('subClient getter returns pubSub client', () => {
        const redis = getRedis();
        expect(redis.subClient).toBeDefined();
    });
});
