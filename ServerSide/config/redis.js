// config/redis.js
const Redis = require('ioredis');
const logger = require('../utils/logger');

let bullClient = null;
let pubSubClient = null;
let dedicatedPubClient = null;

const createRedisClient = (type = 'bull') => {
    const isBull = type === 'bull';

    const client = new Redis(process.env.REDIS_URL || {
        host: process.env.REDIS_SOCKET_HOST || 'localhost',
        port: parseInt(process.env.REDIS_SOCKET_PORT || '6379', 10),
        username: process.env.REDIS_USERNAME || undefined,
        password: process.env.REDIS_PASS || undefined,
        db: 0,
    }, {
        // QUAN TRỌNG NHẤT: BullMQ BẮT BUỘC PHẢI CÓ 2 CÁI NÀY
        maxRetriesPerRequest: null,        // BullMQ tự quản lý retry
        enableOfflineQueue: true,
        // Các option production an toàn
        connectTimeout: 10000,
        lazyConnect: true,
        retryStrategy: (times) => {
            if (times > 20) return null;
            return Math.min(times * 500, 10000);
        },
        reconnectOnError: (err) => {
            const targetError = ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED'];
            return targetError.some(e => err.message.includes(e));
        },
        keepAlive: 30000,
        family: 4, // IPv4
        tls: process.env.REDIS_URL?.includes('rediss://') ? {} : undefined,
    });

    // client.on('connect', () => console.log(`[Redis:${type}] Đang kết nối...`));
    // client.on('ready', () => console.log(`[Redis:${type}] Sẵn sàng!`));
    client.on('error', (err) => {
        if (err.code === 'ECONNRESET') {
            logger.warn(`[Redis:${type}] Kết nối bị ngắt đột ngột, đang tự reconnect...`);
        }
        if (err.message.includes('max number of clients')) {
            logger.error('[Redis] Max clients reached, forcing reconnect');
            client.disconnect(); // Buộc ngắt để tạo lại
        }
        else {
            logger.error(`[Redis:${type}] Lỗi:`, err.message);
        }
    });
    // client.on('close', () => console.warn(`[Redis:${type}] Kết nối đã đóng`));
    // client.on('reconnecting', () => console.log(`[Redis:${type}] Đang reconnect...`));

    return client;
};

// BullMQ client – BẮT BUỘC phải có maxRetriesPerRequest: null
const getBullClient = () => {
    if (!bullClient || ['end', 'close', 'error'].includes(bullClient.status)) {
        // console.log('[BullMQ] Tạo lại Redis client mới...');
        bullClient = createRedisClient('bull');
    }
    return bullClient;
};

// Pub/Sub client – DÙNG RIÊNG, KHÔNG DÙNG CHUNG VỚI BULLMQ
const getPubSubClient = () => {
    if (!pubSubClient || ['end', 'close', 'error'].includes(pubSubClient.status)) {
        // console.log('[Pub/Sub] Tạo lại Redis client mới...');
        pubSubClient = createRedisClient('pubsub');
    }
    return pubSubClient;
};

// Client dành riêng để publish – KHÔNG bị BullMQ làm hỏng
const getDedicatedPubClient = () => {
    if (!dedicatedPubClient || ['end', 'close', 'error'].includes(dedicatedPubClient.status)) {
        // console.log('[Redis:dedicated-pub] Tạo client mới dành riêng để publish...');
        dedicatedPubClient = createRedisClient('dedicated-pub');
    }
    return dedicatedPubClient;
};

// Graceful shutdown
const shutdownRedis = async () => {
    // console.log('Đang đóng Redis clients...');
    try { await bullClient?.quit(); } catch (e) { }
    try { await pubSubClient?.quit(); } catch (e) { }
    bullClient = null;
    pubSubClient = null;
};

module.exports = {
    get bullRedisClient() { return getBullClient(); },           // LAZY
    get dedicatedPubClient() { return getDedicatedPubClient(); }, // LAZY
    get pubClient() { return getPubSubClient(); },
    get subClient() { return getPubSubClient(); },
    redisClient: getBullClient(),
    shutdownRedis,
};
