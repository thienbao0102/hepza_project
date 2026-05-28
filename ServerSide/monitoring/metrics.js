const client = require('prom-client');

const registry = new client.Registry();
const serviceName = process.env.METRICS_SERVICE_NAME || process.env.LOG_SCOPE || 'api';

registry.setDefaultLabels({
    app: 'hepza',
    service: serviceName,
    env: process.env.NODE_ENV || 'development',
});

client.collectDefaultMetrics({
    register: registry,
    prefix: 'hepza_',
    labels: { app: 'hepza', service: serviceName, env: process.env.NODE_ENV || 'development' },
});

const httpRequestDuration = new client.Histogram({
    name: 'hepza_http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 3, 5, 10, 15, 30],
    registers: [registry],
});

const httpRequestsTotal = new client.Counter({
    name: 'hepza_http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
    registers: [registry],
});

const httpRequestsInFlight = new client.Gauge({
    name: 'hepza_http_requests_in_flight',
    help: 'Current number of in-flight HTTP requests',
    registers: [registry],
});

const httpErrorsTotal = new client.Counter({
    name: 'hepza_http_errors_total',
    help: 'Total number of HTTP errors (4xx and 5xx)',
    labelNames: ['method', 'route', 'status_class'],
    registers: [registry],
});

const cacheOperationsTotal = new client.Counter({
    name: 'hepza_cache_operations_total',
    help: 'Total number of cache operations by result',
    labelNames: ['operation', 'result'],
    registers: [registry],
});

const cacheDuration = new client.Histogram({
    name: 'hepza_cache_duration_seconds',
    help: 'Cache operation duration in seconds',
    labelNames: ['operation'],
    buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
    registers: [registry],
});

const mongodbQueryDuration = new client.Histogram({
    name: 'hepza_mongodb_query_duration_seconds',
    help: 'MongoDB query duration in seconds',
    labelNames: ['op', 'collection'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
    registers: [registry],
});

const mongodbQueriesTotal = new client.Counter({
    name: 'hepza_mongodb_queries_total',
    help: 'Total number of MongoDB queries',
    labelNames: ['op', 'collection'],
    registers: [registry],
});

const nodejsHttpConnections = new client.Gauge({
    name: 'hepza_nodejs_http_connections',
    help: 'Current number of active HTTP connections',
    registers: [registry],
});

const mongodbPoolSize = new client.Gauge({
    name: 'hepza_mongodb_pool_size',
    help: 'MongoDB connection pool max size',
    registers: [registry],
});

const mongodbPoolActive = new client.Gauge({
    name: 'hepza_mongodb_pool_active',
    help: 'MongoDB active connections',
    registers: [registry],
});

const mongodbPoolAvailable = new client.Gauge({
    name: 'hepza_mongodb_pool_available',
    help: 'MongoDB available connections in pool',
    registers: [registry],
});

const mongodbPoolPending = new client.Gauge({
    name: 'hepza_mongodb_pool_pending',
    help: 'MongoDB pending connection requests',
    registers: [registry],
});

const socketConnections = new client.Gauge({
    name: 'hepza_socket_connections',
    help: 'Current number of authenticated socket connections',
    registers: [registry],
});

const socketAuthenticatedUsers = new client.Gauge({
    name: 'hepza_socket_authenticated_users',
    help: 'Current number of authenticated users with at least one socket connection',
    registers: [registry],
});

const socketConnectionEvents = new client.Counter({
    name: 'hepza_socket_connection_events_total',
    help: 'Socket connection lifecycle events',
    labelNames: ['event'],
    registers: [registry],
});

const socketAuthFailures = new client.Counter({
    name: 'hepza_socket_auth_failures_total',
    help: 'Socket authentication failures',
    labelNames: ['reason'],
    registers: [registry],
});

const bullQueueJobs = new client.Gauge({
    name: 'hepza_bullmq_jobs',
    help: 'BullMQ jobs grouped by state',
    labelNames: ['queue', 'state'],
    registers: [registry],
});

const bullQueueJobOutcomes = new client.Counter({
    name: 'hepza_bullmq_job_outcomes_total',
    help: 'BullMQ processed jobs grouped by outcome',
    labelNames: ['queue', 'status'],
    registers: [registry],
});

const bullQueueJobDuration = new client.Histogram({
    name: 'hepza_bullmq_job_duration_seconds',
    help: 'BullMQ job processing duration in seconds',
    labelNames: ['queue', 'status'],
    buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 30, 60, 120],
    registers: [registry],
});

const nodejsHeapUsed = new client.Gauge({
    name: 'hepza_nodejs_heap_used_bytes',
    help: 'Node.js heap used in bytes (custom collector)',
    registers: [registry],
});

const nodejsHeapTotal = new client.Gauge({
    name: 'hepza_nodejs_heap_total_bytes',
    help: 'Node.js heap total in bytes (custom collector)',
    registers: [registry],
});

const nodejsEventLoopLag = new client.Gauge({
    name: 'hepza_nodejs_eventloop_lag_runtime_seconds',
    help: 'Node.js event loop lag in seconds (custom collector)',
    registers: [registry],
});

const activeSocketIds = new Set();
const userSocketCounts = new Map();

const normalizeRoute = (req) => {
    if (req.baseUrl && req.route && typeof req.route.path === 'string') {
        return `${req.baseUrl}${req.route.path}`.replace(/\/+/g, '/');
    }

    if (req.route && typeof req.route.path === 'string') {
        return req.route.path;
    }

    if (req.path === '/api/health') return '/api/health';
    if (req.path === '/api/metrics') return '/api/metrics';

    return 'unmatched';
};

const finalizeSocketGauges = () => {
    socketConnections.set(activeSocketIds.size);
    socketAuthenticatedUsers.set(userSocketCounts.size);
};

const httpMetricsMiddleware = (req, res, next) => {
    if (req.path === '/api/metrics') {
        return next();
    }

    httpRequestsInFlight.inc();
    const end = httpRequestDuration.startTimer();
    let settled = false;

    const finalize = () => {
        if (settled) return;
        settled = true;

        const statusCode = res.statusCode || 0;
        const labels = {
            method: req.method,
            route: normalizeRoute(req),
            status_code: String(statusCode),
        };

        end(labels);
        httpRequestsTotal.inc(labels);
        httpRequestsInFlight.dec();

        if (statusCode >= 400) {
            const statusClass = statusCode >= 500 ? '5xx' : '4xx';
            httpErrorsTotal.inc({
                method: req.method,
                route: normalizeRoute(req),
                status_class: statusClass,
            });
        }
    };

    res.once('finish', finalize);
    res.once('close', finalize);

    next();
};

const trackSocketConnection = (socket) => {
    activeSocketIds.add(socket.id);
    socketConnectionEvents.inc({ event: 'connect' });

    const userId = socket.user?.user_id;
    if (userId) {
        userSocketCounts.set(userId, (userSocketCounts.get(userId) || 0) + 1);
    }

    finalizeSocketGauges();
};

const trackSocketDisconnection = (socket) => {
    activeSocketIds.delete(socket.id);
    socketConnectionEvents.inc({ event: 'disconnect' });

    const userId = socket.user?.user_id;
    if (userId) {
        const remaining = (userSocketCounts.get(userId) || 1) - 1;
        if (remaining <= 0) {
            userSocketCounts.delete(userId);
        } else {
            userSocketCounts.set(userId, remaining);
        }
    }

    finalizeSocketGauges();
};

const markSocketAuthFailure = (reason = 'unknown') => {
    socketAuthFailures.inc({ reason });
};

const refreshBullQueueMetrics = async (queue, queueName = 'notification-queue-v2') => {
    if (!queue) return;

    const counts = await queue.getJobCounts(
        'waiting',
        'active',
        'completed',
        'failed',
        'delayed',
        'paused'
    );

    ['waiting', 'active', 'completed', 'failed', 'delayed', 'paused'].forEach((state) => {
        bullQueueJobs.set({ queue: queueName, state }, counts[state] || 0);
    });
};

const observeBullJobOutcome = (job, status = 'completed', queueName = 'notification-queue-v2') => {
    bullQueueJobOutcomes.inc({ queue: queueName, status });

    const processedOn = Number(job?.processedOn || 0);
    const finishedOn = Number(job?.finishedOn || Date.now());
    if (processedOn > 0 && finishedOn >= processedOn) {
        bullQueueJobDuration.observe(
            { queue: queueName, status },
            (finishedOn - processedOn) / 1000
        );
    }
};

const createMetricsHandler = (collectors = []) => async (_req, res) => {
    try {
        for (const collector of collectors) {
            await collector();
        }

        const body = await registry.metrics();
        res.statusCode = 200;
        res.setHeader('Content-Type', registry.contentType);
        res.end(body);
    } catch (error) {
        res.statusCode = 500;
        res.end(error.message);
    }
};

module.exports = {
    createMetricsHandler,
    httpMetricsMiddleware,
    markSocketAuthFailure,
    observeBullJobOutcome,
    refreshBullQueueMetrics,
    registry,
    trackSocketConnection,
    trackSocketDisconnection,
    httpErrorsTotal,
    cacheOperationsTotal,
    cacheDuration,
    mongodbQueryDuration,
    mongodbQueriesTotal,
    nodejsHttpConnections,
    mongodbPoolSize,
    mongodbPoolActive,
    mongodbPoolAvailable,
    mongodbPoolPending,
    nodejsHeapUsed,
    nodejsHeapTotal,
    nodejsEventLoopLag,
};
