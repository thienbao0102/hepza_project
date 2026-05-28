const originalEnv = process.env.NODE_ENV;

describe('logger', () => {
  let logger;
  let errorSpy, warnSpy, logSpy;

  beforeAll(() => {
    process.env.NODE_ENV = 'development';
  });

  afterAll(() => {
    process.env.NODE_ENV = originalEnv;
  });

  beforeEach(() => {
    jest.resetModules();
    delete process.env.LOG_LEVEL;
    delete process.env.LOG_SCOPE;
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    logger = require('../logger');
  });

  afterEach(() => {
    errorSpy.mockRestore();
    warnSpy.mockRestore();
    logSpy.mockRestore();
  });

  test('error logs to console.error with ISO timestamp', () => {
    logger.error('something broke');
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('[ERROR] something broke'));
  });

  test('warn logs to console.warn', () => {
    logger.warn('watch out');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[WARN] watch out'));
  });

  test('info logs to console.log', () => {
    logger.info('hello');
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[INFO] hello'));
  });

  test('debug logs to console.log when LOG_LEVEL allows', () => {
    process.env.LOG_LEVEL = 'debug';
    logger.debug('details');
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[DEBUG] details'));
  });

  test('debug is silent when LOG_LEVEL is info', () => {
    process.env.LOG_LEVEL = 'info';
    logger.debug('details');
    expect(logSpy).not.toHaveBeenCalled();
  });

  test('error includes serialized meta objects', () => {
    logger.error('fail', { id: 1 });
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('"id":1'));
  });

  test('error includes Error stack', () => {
    const err = new Error('boom');
    logger.error('crash', err);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Error: boom'));
  });

  test('uses LOG_SCOPE in output', () => {
    process.env.LOG_SCOPE = 'worker';
    logger.info('msg');
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[worker]'));
  });

  test('falls back to server scope when LOG_SCOPE missing', () => {
    logger.info('msg');
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[server]'));
  });

  test('falls back to development level when NODE_ENV unknown', () => {
    const saved = process.env.NODE_ENV;
    delete process.env.NODE_ENV;
    delete process.env.LOG_LEVEL;
    logger.debug('msg');
    expect(logSpy).toHaveBeenCalled();
    process.env.NODE_ENV = saved;
  });

  test('respects LOG_LEVEL over NODE_ENV', () => {
    process.env.NODE_ENV = 'development';
    process.env.LOG_LEVEL = 'warn';
    logger.info('msg');
    expect(logSpy).not.toHaveBeenCalled();
  });

  test('handles circular meta gracefully', () => {
    const obj = { a: 1 };
    obj.self = obj;
    logger.info('circular', obj);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('circular'));
  });

  test('filters empty meta strings', () => {
    logger.info('msg', '', null, undefined);
    expect(logSpy).toHaveBeenCalledWith(expect.not.stringContaining('null null'));
  });
});
