const { redisClient } = require('../../config/redis');

const mockCacheOperationsTotal = { inc: jest.fn() };
const mockCacheDuration = { observe: jest.fn() };

jest.mock('../../monitoring/metrics', () => ({
    cacheOperationsTotal: mockCacheOperationsTotal,
    cacheDuration: mockCacheDuration,
}));

jest.mock('../../config/redis', () => ({
    redisClient: {
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue('OK'),
        del: jest.fn().mockResolvedValue(1),
        hget: jest.fn().mockResolvedValue(null),
        hset: jest.fn().mockResolvedValue(1),
        hdel: jest.fn().mockResolvedValue(1),
        hgetall: jest.fn().mockResolvedValue({}),
        hkeys: jest.fn().mockResolvedValue([]),
        lpush: jest.fn().mockResolvedValue(1),
        ltrim: jest.fn().mockResolvedValue('OK'),
        setex: jest.fn().mockResolvedValue('OK'),
        expire: jest.fn().mockResolvedValue(1),
        sadd: jest.fn().mockResolvedValue(1),
        srem: jest.fn().mockResolvedValue(1),
        smembers: jest.fn().mockResolvedValue([]),
        scard: jest.fn().mockResolvedValue(0),
        multi: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
    },
}));

const cacheManagerModule = require('../cacheManager');
const InMemoryStrategy = cacheManagerModule.InMemoryStrategy;
const CacheManager = cacheManagerModule.CacheManager;

describe('InMemoryStrategy', () => {
  let cache;
  beforeEach(() => {
    cache = new InMemoryStrategy();
  });

  test('get returns null for missing key', async () => {
    expect(await cache.get('missing')).toBeUndefined();
  });

  test('set and get roundtrip', async () => {
    await cache.set('key1', { a: 1 }, 3600);
    expect(await cache.get('key1')).toEqual({ a: 1 });
  });

  test('del removes key', async () => {
    await cache.set('key2', 'val', 3600);
    await cache.del('key2');
    expect(await cache.get('key2')).toBeUndefined();
  });

  test('hset and hget roundtrip', async () => {
    await cache.hset('hash1', 'field1', { b: 2 }, 3600);
    expect(await cache.hget('hash1', 'field1')).toEqual({ b: 2 });
  });

  test('hdel removes hash field', async () => {
    await cache.hset('hash2', 'f1', 'v1', 3600);
    await cache.hdel('hash2', 'f1');
    expect(await cache.hget('hash2', 'f1')).toBeUndefined();
  });

  test('hgetall returns all fields', async () => {
    await cache.hset('hash3', 'f1', 'v1', 3600);
    await cache.hset('hash3', 'f2', 'v2', 3600);
    expect(await cache.hgetall('hash3')).toEqual({ f1: 'v1', f2: 'v2' });
  });

  test('hkeys returns field names', async () => {
    await cache.hset('hash4', 'a', 1, 3600);
    await cache.hset('hash4', 'b', 2, 3600);
    const keys = await cache.hkeys('hash4');
    expect(keys.sort()).toEqual(['a', 'b']);
  });

  test('lpush prepends and ltrim slices list', async () => {
    await cache.lpush('list1', 'first');
    await cache.lpush('list1', 'second');
    expect(await cache.store.get('list1')).toEqual(['second', 'first']);
    await cache.ltrim('list1', 0, 0);
    expect(await cache.store.get('list1')).toEqual(['second']);
  });

  test('sadd and smembers roundtrip', async () => {
    await cache.sadd('set1', 'a', 'b');
    const members = await cache.smembers('set1');
    expect(members.sort()).toEqual(['a', 'b']);
  });

  test('srem removes members', async () => {
    await cache.sadd('set2', 'a', 'b', 'c');
    const removed = await cache.srem('set2', 'b');
    expect(removed).toBe(1);
    expect((await cache.smembers('set2')).sort()).toEqual(['a', 'c']);
  });

  test('scard returns set size', async () => {
    await cache.sadd('set3', 'x', 'y');
    expect(await cache.scard('set3')).toBe(2);
    await cache.srem('set3', 'x');
    expect(await cache.scard('set3')).toBe(1);
  });

  test('smembers returns empty array for missing key', async () => {
    expect(await cache.smembers('missing-set')).toEqual([]);
  });

  test('scard returns 0 for missing key', async () => {
    expect(await cache.scard('missing-set')).toBe(0);
  });
});

describe('CacheManager singleton', () => {
  beforeEach(() => {
    CacheManager.instance = null;
  });

  test('defaults to InMemoryStrategy when CACHE_BACKEND is not redis', () => {
    const original = process.env.CACHE_BACKEND;
    delete process.env.CACHE_BACKEND;
    const cm = new CacheManager('memory');
    expect(cm.strategy).toBeInstanceOf(InMemoryStrategy);
    process.env.CACHE_BACKEND = original;
  });

  test('delegates get/set/del to strategy', async () => {
    const cm = new CacheManager('memory');
    await cm.set('k', 'v', 60);
    expect(await cm.get('k')).toBe('v');
    await cm.del('k');
    expect(await cm.get('k')).toBeUndefined();
  });
});

describe('RedisStrategy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    CacheManager.instance = null;
  });

  test('get parses JSON', async () => {
    redisClient.get.mockResolvedValue('{"a":1}');
    const cm = new CacheManager('redis');
    const result = await cm.get('key1');
    expect(result).toEqual({ a: 1 });
  });

  test('get returns null for missing key', async () => {
    redisClient.get.mockResolvedValue(null);
    const cm = new CacheManager('redis');
    const result = await cm.get('key1');
    expect(result).toBeNull();
  });

  test('get returns raw value on parse error', async () => {
    redisClient.get.mockResolvedValue('not-json');
    const cm = new CacheManager('redis');
    const result = await cm.get('key1');
    expect(result).toBe('not-json');
  });

  test('set stringifies object', async () => {
    const cm = new CacheManager('redis');
    await cm.set('key1', { a: 1 }, 60);
    expect(redisClient.set).toHaveBeenCalledWith('key1', '{"a":1}', 'EX', 60);
  });

  test('set converts primitive to string', async () => {
    const cm = new CacheManager('redis');
    await cm.set('key1', 42, 60);
    expect(redisClient.set).toHaveBeenCalledWith('key1', '42', 'EX', 60);
  });

  test('del calls redis del', async () => {
    const cm = new CacheManager('redis');
    await cm.del('key1');
    expect(redisClient.del).toHaveBeenCalledWith('key1');
  });

  test('hget parses JSON', async () => {
    redisClient.hget.mockResolvedValue('{"b":2}');
    const cm = new CacheManager('redis');
    const result = await cm.hget('hash1', 'field1');
    expect(result).toEqual({ b: 2 });
  });

  test('hget returns null for missing field', async () => {
    redisClient.hget.mockResolvedValue(null);
    const cm = new CacheManager('redis');
    const result = await cm.hget('hash1', 'field1');
    expect(result).toBeNull();
  });

  test('hset stringifies and sets TTL', async () => {
    const cm = new CacheManager('redis');
    await cm.hset('hash1', 'field1', { c: 3 }, 120);
    expect(redisClient.hset).toHaveBeenCalledWith('hash1', 'field1', '{"c":3}');
    expect(redisClient.expire).toHaveBeenCalledWith('hash1', 120);
  });

  test('hset without TTL', async () => {
    const cm = new CacheManager('redis');
    await cm.hset('hash1', 'field1', 'val');
    expect(redisClient.expire).not.toHaveBeenCalled();
  });

  test('hdel calls redis hdel', async () => {
    const cm = new CacheManager('redis');
    await cm.hdel('hash1', 'field1');
    expect(redisClient.hdel).toHaveBeenCalledWith('hash1', 'field1');
  });

  test('hgetall parses all fields', async () => {
    redisClient.hgetall.mockResolvedValue({ f1: '1', f2: '"two"' });
    const cm = new CacheManager('redis');
    const result = await cm.hgetall('hash1');
    expect(result).toEqual({ f1: 1, f2: 'two' });
  });

  test('hgetall handles non-JSON values', async () => {
    redisClient.hgetall.mockResolvedValue({ f1: 'raw' });
    const cm = new CacheManager('redis');
    const result = await cm.hgetall('hash1');
    expect(result).toEqual({ f1: 'raw' });
  });

  test('hkeys calls redis hkeys', async () => {
    redisClient.hkeys.mockResolvedValue(['f1', 'f2']);
    const cm = new CacheManager('redis');
    const result = await cm.hkeys('hash1');
    expect(result).toEqual(['f1', 'f2']);
  });

  test('lpush stringifies value', async () => {
    const cm = new CacheManager('redis');
    await cm.lpush('list1', { x: 1 });
    expect(redisClient.lpush).toHaveBeenCalledWith('list1', '{"x":1}');
  });

  test('ltrim calls redis ltrim', async () => {
    const cm = new CacheManager('redis');
    await cm.ltrim('list1', 0, 9);
    expect(redisClient.ltrim).toHaveBeenCalledWith('list1', 0, 9);
  });

  test('setex stringifies object', async () => {
    const cm = new CacheManager('redis');
    await cm.setex('key1', 60, { y: 2 });
    expect(redisClient.setex).toHaveBeenCalledWith('key1', 60, '{"y":2}');
  });

  test('expire calls redis expire', async () => {
    const cm = new CacheManager('redis');
    await cm.expire('key1', 300);
    expect(redisClient.expire).toHaveBeenCalledWith('key1', 300);
  });

  test('sadd stringifies objects', async () => {
    const cm = new CacheManager('redis');
    await cm.sadd('set1', 'a', { b: 1 });
    expect(redisClient.sadd).toHaveBeenCalledWith('set1', 'a', '{"b":1}');
  });

  test('srem stringifies objects', async () => {
    const cm = new CacheManager('redis');
    await cm.srem('set1', 'a', { b: 1 });
    expect(redisClient.srem).toHaveBeenCalledWith('set1', 'a', '{"b":1}');
  });

  test('smembers parses JSON members', async () => {
    redisClient.smembers.mockResolvedValue(['1', '"two"', 'raw']);
    const cm = new CacheManager('redis');
    const result = await cm.smembers('set1');
    expect(result).toEqual([1, 'two', 'raw']);
  });

  test('scard calls redis scard', async () => {
    redisClient.scard.mockResolvedValue(5);
    const cm = new CacheManager('redis');
    const result = await cm.scard('set1');
    expect(result).toBe(5);
  });

  test('multi returns redis multi', async () => {
    const cm = new CacheManager('redis');
    const result = cm.multi();
    expect(redisClient.multi).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  test('tracks cache hit metrics', async () => {
    redisClient.get.mockResolvedValue('{"cached":true}');
    const cm = new CacheManager('redis');
    await cm.get('key1');
    expect(mockCacheOperationsTotal.inc).toHaveBeenCalledWith({ operation: 'get', result: 'hit' });
    expect(mockCacheDuration.observe).toHaveBeenCalledWith({ operation: 'get' }, expect.any(Number));
  });

  test('tracks cache miss metrics', async () => {
    redisClient.get.mockResolvedValue(null);
    const cm = new CacheManager('redis');
    await cm.get('key1');
    expect(mockCacheOperationsTotal.inc).toHaveBeenCalledWith({ operation: 'get', result: 'miss' });
    expect(mockCacheDuration.observe).toHaveBeenCalledWith({ operation: 'get' }, expect.any(Number));
  });

  test('tracks set success metrics', async () => {
    const cm = new CacheManager('redis');
    await cm.set('key1', { a: 1 }, 60);
    expect(mockCacheOperationsTotal.inc).toHaveBeenCalledWith({ operation: 'set', result: 'success' });
    expect(mockCacheDuration.observe).toHaveBeenCalledWith({ operation: 'set' }, expect.any(Number));
  });

  test('tracks error metrics', async () => {
    redisClient.get.mockRejectedValue(new Error('redis down'));
    const cm = new CacheManager('redis');
    await expect(cm.get('key1')).rejects.toThrow('redis down');
    expect(mockCacheOperationsTotal.inc).toHaveBeenCalledWith({ operation: 'get', result: 'error' });
    expect(mockCacheDuration.observe).toHaveBeenCalledWith({ operation: 'get' }, expect.any(Number));
  });
});
