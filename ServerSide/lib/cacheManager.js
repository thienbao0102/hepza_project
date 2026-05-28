const { redisClient } = require('../config/redis');
const { cacheOperationsTotal, cacheDuration } = require('../monitoring/metrics');

class CacheStrategy {
  async get(key) { throw new Error('Not implemented'); }
  async set(key, value, ttl) { throw new Error('Not implemented'); }
  async del(key) { throw new Error('Not implemented'); }
  async delByPattern(pattern) { throw new Error('Not implemented'); }
  async hget(hash, field) { throw new Error('Not implemented'); }
  async hset(hash, field, value, ttl) { throw new Error('Not implemented'); }
  async hdel(hash, field) { throw new Error('Not implemented'); }
  async hgetall(hash) { throw new Error('Not implemented'); }
  async hkeys(hash) { throw new Error('Not implemented'); }
  async lpush(key, value) { throw new Error('Not implemented'); }
  async ltrim(key, start, stop) { throw new Error('Not implemented'); }
  async setex(key, ttl, value) { throw new Error('Not implemented'); }
  async expire(key, ttl) { throw new Error('Not implemented'); }
  async sadd(key, ...members) { throw new Error('Not implemented'); }
  async srem(key, ...members) { throw new Error('Not implemented'); }
  async smembers(key) { throw new Error('Not implemented'); }
  async scard(key) { throw new Error('Not implemented'); }
  multi() { throw new Error('Not implemented'); }
}

class RedisStrategy extends CacheStrategy {
  constructor() {
    super();
    // Client này đã được kết nối và quản lý ở /config/redis.js
    this.client = redisClient;
  }

  async get(key) {
    const value = await this.client.get(key);
    try {
      return value ? JSON.parse(value) : null;
    } catch (e) {
      return value; // Trả về giá trị gốc nếu không phải JSON
    }
  }

  async set(key, value, ttl) {
    const stringValue = typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value);
    await this.client.set(key, stringValue, 'EX', ttl);
  }

  async del(key) {
    await this.client.del(key);
  }

  async delByPattern(pattern) {
    let cursor = '0';
    const keysToDelete = [];
    do {
      const [newCursor, keys] = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = newCursor;
      keysToDelete.push(...keys);
    } while (cursor !== '0');

    if (keysToDelete.length > 0) {
      await this.client.del(...keysToDelete);
    }
  }

  async hget(hash, field) {
    const value = await this.client.hget(hash, field);
    return value ? JSON.parse(value) : null;
  }

  async hset(hash, field, value, ttl) {
    // Sửa lại để dùng đúng cú pháp hSet cho một field
    await this.client.hset(hash, field, JSON.stringify(value));
    if (ttl) await this.client.expire(hash, ttl);
  }

  async hdel(hash, field) {
    await this.client.hdel(hash, field);
  }

  async hgetall(hash) {
    const data = await this.client.hgetall(hash);
    const result = {};
    for (const [field, value] of Object.entries(data)) {
      // FIX: Thêm try-catch để xử lý an toàn
      try {
        result[field] = JSON.parse(value);
      } catch (e) {
        result[field] = value;
      }
    }
    return result;
  }

  async hkeys(hash) {
    return await this.client.hkeys(hash);
  }

  async lpush(key, value) {
    await this.client.lpush(key, JSON.stringify(value));
  }

  async ltrim(key, start, stop) {
    await this.client.ltrim(key, start, stop);
  }

  async setex(key, ttl, value) {
    const stringValue = typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value);
    await this.client.setex(key, ttl, stringValue);
  }

  async expire(key, ttl) {
    await this.client.expire(key, ttl);
  }

  async sadd(key, ...members) {
    // stringify members if they are objects, but typically for user_ids it's just strings
    const strMembers = members.map(m => typeof m === 'object' && m !== null ? JSON.stringify(m) : String(m));
    return this.client.sadd(key, ...strMembers);
  }

  async srem(key, ...members) {
    const strMembers = members.map(m => typeof m === 'object' && m !== null ? JSON.stringify(m) : String(m));
    return this.client.srem(key, ...strMembers);
  }

  async smembers(key) {
    const members = await this.client.smembers(key);
    return members.map(m => {
      try { return JSON.parse(m); } catch (e) { return m; }
    });
  }

  async scard(key) {
    return this.client.scard(key);
  }

  multi() {
    return this.client.multi();
  }
}

class InMemoryStrategy extends CacheStrategy {
  constructor() {
    super();
    this.store = new Map();
  }

  async get(key) {
    return this.store.get(key);
  }

  async set(key, value, ttl) {
    this.store.set(key, value);
    setTimeout(() => this.store.delete(key), ttl * 1000).unref();
  }

  async del(key) {
    this.store.delete(key);
  }

  async delByPattern(pattern) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
      }
    }
  }

  async hget(hash, field) {
    return this.store.get(`${hash}:${field}`);
  }

  async hset(hash, field, value, ttl) {
    this.store.set(`${hash}:${field}`, value);
    setTimeout(() => this.store.delete(`${hash}:${field}`), ttl * 1000).unref();
  }

  async hdel(hash, field) {
    this.store.delete(`${hash}:${field}`);
  }

  async hgetall(hash) {
    const result = {};
    for (const [key, value] of this.store.entries()) {
      if (key.startsWith(`${hash}:`)) {
        const field = key.slice(hash.length + 1);
        result[field] = value;
      }
    }
    return result;
  }

  async hkeys(hash) {
    const keys = [];
    for (const key of this.store.keys()) {
      if (key.startsWith(`${hash}:`)) {
        keys.push(key.slice(hash.length + 1));
      }
    }
    return keys;
  }

  async lpush(key, value) {
    let list = this.store.get(key) || [];
    list.unshift(value);
    this.store.set(key, list);
  }

  async ltrim(key, start, stop) {
    let list = this.store.get(key) || [];
    list = list.slice(start, stop + 1);
    this.store.set(key, list);
  }

  async sadd(key, ...members) {
    let setObj = this.store.get(key);
    if (!(setObj instanceof Set)) {
      setObj = new Set();
    }
    let added = 0;
    for (const m of members) {
      if (!setObj.has(m)) {
        setObj.add(m);
        added++;
      }
    }
    this.store.set(key, setObj);
    return added;
  }

  async srem(key, ...members) {
    let setObj = this.store.get(key);
    if (!(setObj instanceof Set)) {
      return 0;
    }
    let removed = 0;
    for (const m of members) {
      if (setObj.has(m)) {
        setObj.delete(m);
        removed++;
      }
    }
    if (setObj.size === 0) {
      this.store.delete(key);
    }
    return removed;
  }

  async smembers(key) {
    let setObj = this.store.get(key);
    if (!(setObj instanceof Set)) {
      return [];
    }
    return Array.from(setObj);
  }

  async scard(key) {
    let setObj = this.store.get(key);
    if (!(setObj instanceof Set)) return 0;
    return setObj.size;
  }
}

class CacheManager {
  static instance = null;
  constructor(strategy = process.env.CACHE_BACKEND || 'redis') {
    if (CacheManager.instance) return CacheManager.instance;
    this.strategy = strategy === 'redis' ? new RedisStrategy() : new InMemoryStrategy();
    CacheManager.instance = this;
  }

  async _track(operation, fn) {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = (Date.now() - start) / 1000;
      cacheDuration.observe({ operation }, duration);

      if (operation === 'get' || operation === 'hget') {
        cacheOperationsTotal.inc({ operation, result: result !== null ? 'hit' : 'miss' });
      } else {
        cacheOperationsTotal.inc({ operation, result: 'success' });
      }

      return result;
    } catch (err) {
      const duration = (Date.now() - start) / 1000;
      cacheDuration.observe({ operation }, duration);
      cacheOperationsTotal.inc({ operation, result: 'error' });
      throw err;
    }
  }

  async get(key) { return this._track('get', () => this.strategy.get(key)); }
  async set(key, value, ttl = 3600) { return this._track('set', () => this.strategy.set(key, value, ttl)); }
  async del(key) { return this._track('del', () => this.strategy.del(key)); }
  async delByPattern(pattern) { return this._track('delByPattern', () => this.strategy.delByPattern(pattern)); }
  async hget(hash, field) { return this._track('hget', () => this.strategy.hget(hash, field)); }
  async hset(hash, field, value, ttl) { return this._track('hset', () => this.strategy.hset(hash, field, value, ttl)); }
  async hdel(hash, field) { return this._track('hdel', () => this.strategy.hdel(hash, field)); }
  async hgetall(hash) { return this.strategy.hgetall(hash); }
  async hkeys(hash) { return this.strategy.hkeys(hash); }
  async lpush(key, value) { return this.strategy.lpush(key, value); }
  async ltrim(key, start, stop) { return this.strategy.ltrim(key, start, stop); }
  async setex(key, ttl, value) { return this.strategy.setex(key, ttl, value); }
  async expire(key, ttl) { return this.strategy.expire(key, ttl); }
  async sadd(key, ...members) { return this.strategy.sadd(key, ...members); }
  async srem(key, ...members) { return this.strategy.srem(key, ...members); }
  async smembers(key) { return this.strategy.smembers(key); }
  async scard(key) { return this.strategy.scard(key); }
  multi() { return this.strategy.multi(); }
}

const cacheManagerInstance = new CacheManager();
cacheManagerInstance.CacheStrategy = CacheStrategy;
cacheManagerInstance.RedisStrategy = RedisStrategy;
cacheManagerInstance.InMemoryStrategy = InMemoryStrategy;
cacheManagerInstance.CacheManager = CacheManager;
module.exports = cacheManagerInstance;