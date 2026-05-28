const mongoose = require('mongoose');
const {
    mongodbPoolSize,
    mongodbPoolActive,
    mongodbPoolAvailable,
    mongodbPoolPending,
} = require('./metrics');

/**
 * Extract MongoDB connection pool statistics from the underlying driver topology.
 * Defensive coding to handle differences between MongoDB driver versions (5.x, 6.x).
 */
const getPoolStats = () => {
    const topology = mongoose.connection?.client?.topology;
    if (!topology) return null;

    const servers = topology.s?.servers;
    if (servers && servers.size > 0) {
        let totalSize = 0;
        let totalActive = 0;
        let totalAvailable = 0;
        let totalPending = 0;

        servers.forEach((server) => {
            // Driver 6.x: thử nhiều path để tìm pool object
            const pool =
                server?.s?.connectionPool ??
                server?.connectionPool ??
                server?.s?.pool ??
                server?.pool ??
                null;
            if (!pool) return;

            // Lấy maxPoolSize: thử options trên pool, rồi connection options
            const maxPoolSize =
                pool.options?.maxPoolSize ??
                pool.maxPoolSize ??
                mongoose.connection.client?.options?.maxPoolSize ??
                mongoose.connection.options?.maxPoolSize ??
                200;
            totalSize += maxPoolSize;

            // Driver 6.x dùng availableConnectionCount / checkedOutCount / waitQueueSize
            const availableCount =
                pool.availableConnectionCount ??
                pool.availableCount ??
                pool.available ??
                0;

            const checkedOut =
                pool.checkedOutCount ??
                pool.currentCheckedOutCount ??
                0;

            const activeCount =
                checkedOut ||
                (typeof pool.size === 'number' ? pool.size - availableCount : 0);

            const pending =
                pool.waitQueueSize ??
                pool.pendingConnectionCount ??
                pool.pending ??
                0;

            totalActive += activeCount;
            totalAvailable += availableCount;
            totalPending += pending;
        });

        return { size: totalSize, active: totalActive, available: totalAvailable, pending: totalPending };
    }

    // Fallback: direct pool on topology
    const pool = topology.s?.pool || topology.s?.connectionPool;
    if (pool) {
        const size = pool.options?.maxPoolSize || mongoose.connection.client?.options?.maxPoolSize || 200;
        const available = pool.availableConnectionCount ?? pool.availableCount ?? 0;
        const active = pool.checkedOutCount ?? (pool.size ? pool.size - available : 0);
        const pending = pool.waitQueueSize ?? 0;
        return { size, active, available, pending };
    }

    return null;
};

/**
 * Update MongoDB Prometheus gauges from runtime pool stats.
 * Safe to call even when DB is not connected.
 */
const collectMongoMetrics = async () => {
    if (mongoose.connection.readyState !== 1) {
        mongodbPoolSize.set(0);
        mongodbPoolActive.set(0);
        mongodbPoolAvailable.set(0);
        mongodbPoolPending.set(0);
        return;
    }

    try {
        const stats = getPoolStats();
        if (stats) {
            mongodbPoolSize.set(stats.size);
            mongodbPoolActive.set(stats.active);
            mongodbPoolAvailable.set(stats.available);
            mongodbPoolPending.set(stats.pending);
        } else {
            // Không đọc được pool stats nhưng DB đã connected: báo configured size
            const configuredSize =
                mongoose.connection.client?.options?.maxPoolSize ??
                mongoose.connection.options?.maxPoolSize ??
                200;
            mongodbPoolSize.set(configuredSize);
            mongodbPoolActive.set(0);
            mongodbPoolAvailable.set(0);
            mongodbPoolPending.set(0);
        }
    } catch (err) {
        mongodbPoolSize.set(0);
        mongodbPoolActive.set(0);
        mongodbPoolAvailable.set(0);
        mongodbPoolPending.set(0);
    }
};

module.exports = {
    collectMongoMetrics,
    getPoolStats,
};
