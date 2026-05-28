const cacheManager = require('../lib/cacheManager');

const isLargeEnoughToCache = (data, req) => {
    // 1. NGƯỜI BẢO VỆ HIỆU NĂNG (PERFORMANCE EXCEPTION):
    // Các endpoint dashboard/báo cáo dưới đây tốn mười mấy giây chạy kết quả
    // Payload rất nhỏ, nhưng chi phí CPU Database cao khủng khiếp -> Bắt buộc phải Cache vô điều kiện
    if (req && req.originalUrl) {
        const url = req.originalUrl;
        if (url.includes('/api/report') ||
            url.includes('/api/resource-waste') ||
            url.includes('/api/emission') ||
            url.includes('/api/summary-record')) {
            return true;
        }
    }

    if (!data) return false;

    // 2. LOGIC CŨ BẢO VỆ RAM CHUNG CỦA HỆ THỐNG:
    // Yêu cầu dữ liệu phải thực sự lớn mới cache để tránh tốn memory cho các query nhỏ lẻ khác
    const MIN_ITEMS = 50;
    const MIN_BYTES = 50 * 1024; // 50KB

    // If it's an array, check length
    if (Array.isArray(data)) {
        if (data.length >= MIN_ITEMS) return true;
    }

    // If it's an object, check common list properties
    if (typeof data === 'object') {
        const listKeys = ['companies', 'zones', 'groups', 'industries', 'data', 'users', 'records', 'emissions', 'resources'];
        for (const key of listKeys) {
            if (Array.isArray(data[key])) {
                if (data[key].length >= MIN_ITEMS) return true;
            }
        }

        // As a fallback, try to stringify and check byte size
        try {
            const str = JSON.stringify(data);
            if (Buffer.byteLength(str) >= MIN_BYTES) return true;
        } catch (error) {
            return false;
        }
    }

    return false;
};

/**
 * Caching middleware specifically targeting high-traffic roles with large data
 * @param {Object} options - Cache options
 * @param {number} options.durationInSeconds - TTL in seconds (default: 300)
 * @param {Array<string>} options.targetRoles - Roles to apply caching to (default: ['admin', 'manager', 'company'])
 */
const redisCache = (options = {}) => {
    const durationInSeconds = options.durationInSeconds || 300;
    const targetRoles = options.targetRoles || ['admin', 'manager', 'company'];

    return async (req, res, next) => {
        // Only cache GET requests
        if (req.method !== 'GET') {
            return next();
        }

        // Cache được phục vụ cho 3 nhóm đối tượng:
        // 1. Manager & Company: Có số lượng user lớn, query đồng thời nhiều.
        // 2. Admin: Số lượng ít, nhưng mỗi lần query đều quét toàn bộ hệ thống (toàn DB) 
        //    nên rất tốn CPU và cần được cache khi xuất báo cáo.
        if (!req.user || !targetRoles.includes(req.user.role)) {
            return next();
        }

        const role = req.user.role;
        // Phân lập cache theo scope (zone_id hoặc company_id) để đảm bảo an toàn dữ liệu
        // Các user cùng role và cùng scope sẽ dùng chung 1 cache key
        let scopeId = '';
        if (role === 'company') {
            if (!req.user.company_id) return next();
            scopeId = `company_id:${req.user.company_id}:`;
        } else if (role === 'manager') {
            if (!req.user.zone_id) return next();
            scopeId = `zone_id:${req.user.zone_id}:`;
        } else if (role === 'admin') {
            scopeId = 'global:'; // Admin cache is global
        }

        const key = `cache:role:${role}:${scopeId}${req.originalUrl || req.url}`;

        try {
            const cachedResponse = await cacheManager.get(key);
            if (cachedResponse) {
                // cacheManager parses JSON for us if it was saved as JSON String
                return res.status(200).json(cachedResponse);
            }

            // Override res.json to capture and cache response
            const originalJson = res.json;
            res.json = function (body) {
                // Check if response is successful enough to cache
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    if (isLargeEnoughToCache(body, req)) {
                        // cacheManager.set internally stringifies objects
                        cacheManager.set(key, body, durationInSeconds).catch(err => {
                            console.error('Redis cache error:', err);
                        });
                    }
                }

                return originalJson.call(this, body);
            };

            next();
        } catch (error) {
            console.error('Redis cache middleware error:', error);
            // If cache fails, continue to normal route handler
            next();
        }
    };
};

module.exports = redisCache;
