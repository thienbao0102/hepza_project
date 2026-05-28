const logger = require('../utils/logger');

const SKIPPED_PATHS = new Set([
  '/api/health',
  '/api/docs',
  '/api/docs.json',
]);

function requestLogger(req, res, next) {
  if (SKIPPED_PATHS.has(req.path)) {
    return next();
  }

  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const message = `${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs.toFixed(1)}ms`;

    if (res.statusCode >= 500) {
      logger.error(message);
      return;
    }

    if (res.statusCode >= 400) {
      logger.warn(message);
      return;
    }

    logger.debug(message);
  });

  return next();
}

module.exports = requestLogger;
