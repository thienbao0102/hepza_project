const mongoose = require('mongoose');
const { AsyncLocalStorage } = require('async_hooks');
const { mongodbQueryDuration, mongodbQueriesTotal } = require('../monitoring/metrics');

const queryCounter = new AsyncLocalStorage();

const PERF_LOG_ENABLED = process.env.PERF_LOG_ENABLED === 'true';
const PERF_SLOW_QUERY_MS = Number(process.env.PERF_SLOW_QUERY_MS) || 100;

// 1. Express Middleware for route duration and DB call counting
const perfMiddleware = (req, res, next) => {
    if (!PERF_LOG_ENABLED) return next();

    const store = { dbCalls: 0, start: Date.now() };
    queryCounter.run(store, () => {
        res.on('finish', () => {
            const duration = Date.now() - store.start;
            // Only log our scoped endpoints or if it's generally slow
            if (req.url.includes('/api/resource-waste') || req.url.includes('/api/summary') || req.url.includes('/api/emission') || req.url.includes('/api/report')) {
                console.log(`[PERF_API] ${req.method} ${req.url.split('?')[0]} - DB Queries: ${store.dbCalls} - ${duration}ms`);
            }
        });
        next();
    });
};

// 2. Mongoose Plugin to track exact query execution
const perfMongoosePlugin = function (schema) {
    // If globally disabled, skip attaching heavy hooks
    if (!PERF_LOG_ENABLED) return;

    const preHook = function () {
        this._startTime = Date.now();
        const store = queryCounter.getStore();
        if (store) store.dbCalls++;
    };

    const postHook = function (docs, next) {
        if (!this._startTime) return next();
        const executionTime = Date.now() - this._startTime;
        const op = this.op || 'unknown';
        const collName = this.mongooseCollection ? this.mongooseCollection.name : 'unknown_collection';

        // Prometheus metrics (always record, not just slow queries)
        mongodbQueriesTotal.inc({ op, collection: collName });
        mongodbQueryDuration.observe({ op, collection: collName }, executionTime / 1000);

        if (executionTime > PERF_SLOW_QUERY_MS) {
            // Prevent logging massive pipeline configurations, just log the collection and operation
            let queryStr = '{}';
            try {
                if (op === 'aggregate') {
                    queryStr = 'Pipeline: [...]';
                } else if (this.getFilter) {
                    queryStr = JSON.stringify(this.getFilter());
                }
            } catch (e) { }

            // Filter out noisy default auth/user queries if they aren't the focus, or keep all
            console.warn(`[SLOW_DB] ${collName}.${op}() took ${executionTime}ms. Filter: ${queryStr}`);
        }
        next();
    };

    // Attach to common read/write operations
    schema.pre(/^find|aggregate|count|updateOne|updateMany|deleteOne|deleteMany/, preHook);
    schema.post(/^find|aggregate|count|updateOne|updateMany|deleteOne|deleteMany/, postHook);
};

// Apply plugin globally to all mongoose schemas
if (PERF_LOG_ENABLED) {
    mongoose.plugin(perfMongoosePlugin);
}

module.exports = {
    perfMiddleware,
    perfMongoosePlugin // Exported just in case, but it's applied globally above
};
