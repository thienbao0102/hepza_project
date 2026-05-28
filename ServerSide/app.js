/**
 * Express app setup - exported for use in tests and index.js
 * Environment variables (dotenv) must be loaded before requiring this file.
 */
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const { createMetricsHandler, httpMetricsMiddleware } = require('./monitoring/metrics');
const { collectMongoMetrics } = require('./monitoring/mongoMetrics');
const logger = require('./utils/logger');
const requestLogger = require('./middleware/requestLogger');
const { buildOpenApiSpec, renderSwaggerHtml } = require('./utils/openapiSpec');
require('./utils/perfLogger'); // Initialize global mongoose execution logging
const { perfMiddleware } = require('./utils/perfLogger');

logger.installConsoleBridge();

const authRoutes = require('./routes/authRoutes');
const companyRoutes = require('./routes/companyRoutes');
const userRoutes = require('./routes/userRoutes');
const industrialZoneRoutes = require('./routes/industrialZoneRoutes');
const hashTagRoutes = require('./routes/hashtagRoutes');
const summaryRecordRoutes = require('./routes/summaryRecordRoutes');
const emissionRoutes = require('./routes/emissionRoutes');
const solutionRoutes = require('./routes/solutionRoutes');
const resoureceAndWasteRoutes = require('./routes/resoureceAndWasteRoutes');
const industryRoutes = require('./routes/industryRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const exportRoutes = require('./routes/exportRouter');
const businessSymbiosisRoutes = require('./routes/businessSymbiosisRoutes');
const errorLogRoutes = require('./routes/errorLogRoutes');
const regulationRoutes = require('./routes/regulationRoutes');
const environmentalReportRoutes = require('./routes/environmentalReportRoutes');
const onlineRoutes = require('./routes/onlineRoutes');
const enterpriseListRoutes = require('./routes/enterpriseListRoutes');
const wasteCodeRoutes = require('./routes/wasteCodeRoutes');

const API_CONTENT_SECURITY_POLICY = [
    "default-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "form-action 'none'",
].join('; ');

const SWAGGER_CONTENT_SECURITY_POLICY = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "img-src 'self' data:",
    "style-src 'self' 'unsafe-inline' https://unpkg.com",
    "script-src 'self' 'unsafe-inline' https://unpkg.com",
    "font-src 'self' data: https://unpkg.com",
    "connect-src 'self'",
].join('; ');

const app = express();
app.use(compression());
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(httpMetricsMiddleware);
app.use(perfMiddleware); // Enable endpoint duration and DB fan-out tracking

const isProduction = process.env.NODE_ENV === 'production';

app.use((req, res, next) => {
    if (isProduction || req.secure || req.headers['x-forwarded-proto'] === 'https') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), payment=(), usb=(), geolocation=(self)');
    res.setHeader('Content-Security-Policy', API_CONTENT_SECURITY_POLICY);
    next();
});

const allowedOrigins = (process.env.ORIGIN || 'http://localhost:3000').split(',');

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'), false);
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'x-csrf-token', 'Authorization', 'Accept'],
}));

app.options(/(.*)/, cors());

app.get('/api/metrics', createMetricsHandler([collectMongoMetrics]));

const globalRateLimitMultiplier = Number(process.env.RATELIMIT_MULTIPLIER) || 1;

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500 * globalRateLimitMultiplier,
    message: 'Quá nhiều yêu cầu từ IP này, vui lòng thử lại sau 15 phút.',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);
app.use(requestLogger);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
const path = require('path');
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health Check (Docker, monitoring, CI/CD)
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        env: process.env.NODE_ENV || 'development'
    });
});

app.get('/api/docs.json', (req, res) => {
    res.json(buildOpenApiSpec(req));
});

app.get('/api/docs', (req, res) => {
    res.setHeader('Content-Security-Policy', SWAGGER_CONTENT_SECURITY_POLICY);
    res.type('html').send(renderSwaggerHtml());
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/users', userRoutes);
app.use('/api/zones', industrialZoneRoutes);
app.use('/api/hashtags', hashTagRoutes);
app.use('/api/report', summaryRecordRoutes);
app.use('/api/emission', emissionRoutes);
app.use('/api/solution', solutionRoutes);
app.use('/api/resource-waste', resoureceAndWasteRoutes);
app.use('/api/industries', industryRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/business-symbiosis', businessSymbiosisRoutes);
app.use('/api/error-logs', errorLogRoutes);
app.use('/api/regulations', regulationRoutes);
app.use('/api/env-reports', environmentalReportRoutes);
app.use('/api/online', onlineRoutes);
app.use('/api/enterprise-list', enterpriseListRoutes);
app.use('/api/waste-codes', wasteCodeRoutes);

module.exports = app;
