// server/middleware/csrf.js
const crypto = require('crypto');
const cacheManager = require('../lib/cacheManager');

function generateCsrfToken() {
  return crypto.randomBytes(32).toString('hex');
}

async function verifyCsrfToken(req, res, next) {
  // Skip CSRF in test environment
  if (process.env.NODE_ENV === 'test') return next();

  const csrfHeader = req.headers['x-csrf-token'];
  const methodsToCheck = ['POST', 'PUT', 'DELETE', 'PATCH'];
  if (methodsToCheck.includes(req.method)) {
    if (!csrfHeader) {
      return res.status(403).json({
        message: 'Missing CSRF token in header',
        errorCode: 'MISSING_CSRF_HEADER',
      });
    }
    const storedCsrfToken = await cacheManager.get(`csrf:${req.user.user_id}`);
    if (!storedCsrfToken || storedCsrfToken !== csrfHeader) {
      return res.status(403).json({
        message: 'Invalid CSRF token',
        errorCode: 'INVALID_CSRF_TOKEN',
      });
    }
  }
  next();
}

module.exports = { generateCsrfToken, verifyCsrfToken };