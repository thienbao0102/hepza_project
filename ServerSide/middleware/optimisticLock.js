/**
 * Optimistic-lock middleware — requireVersion
 *
 * Attaches to routes that perform write operations
 * (PUT / PATCH / DELETE-soft).
 *
 * Current behaviour (backward-compatible):
 *   • If `req.body.__v` is present  → passes through (services will validate it)
 *   • If `req.body.__v` is missing  → logs a WARNING but still calls next()
 *     so that existing clients that haven't been updated yet keep working.
 *
 * Once all FE clients send `__v`, the warning can be upgraded to a hard reject.
 */
const requireVersion = (req, res, next) => {
    // Only check write methods (GET/HEAD/OPTIONS don't carry body)
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }

    if (req.body && (req.body.__v === undefined || req.body.__v === null)) {
        console.warn(
            `[OptimisticLock] ⚠ Missing __v in ${req.method} ${req.originalUrl} — ` +
            `client should include __v for conflict detection`
        );
    }

    next();
};

module.exports = { requireVersion };
