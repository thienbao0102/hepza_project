const rateLimit = require('express-rate-limit');

const RATELIMIT_MULTIPLIER = Number(process.env.RATELIMIT_MULTIPLIER) || 1;

const buildLimiter = ({ windowMs, max, keyGenerator, error, skip }) =>
    rateLimit({
        windowMs,
        max: max * RATELIMIT_MULTIPLIER,
        keyGenerator,
        skip,
        handler: (_req, res) => {
            res.status(429).json({ error });
        },
        standardHeaders: true,
        legacyHeaders: false,
    });

const getEmailAndIpKey = (req) => {
    const email = req.body?.email?.toString().trim().toLowerCase();
    return email ? `${email}-${req.ip}` : req.ip;
};

const getUserAndIpKey = (req) => {
    const userId = req.user?.user_id || req.body?.user_id || req.body?.email;
    return userId ? `${userId}-${req.ip}` : req.ip;
};

const getCompanyActionKey = (action) => (req) => `${getUserAndIpKey(req)}-${action}`;

const loginPasswordLimiter = buildLimiter({
    windowMs: 60 * 60 * 1000,
    max: 10,
    keyGenerator: getEmailAndIpKey,
    error: 'Quá nhiều lần đăng nhập, thử lại sau 1 giờ',
});

const loginOtpVerifyLimiter = buildLimiter({
    windowMs: 10 * 60 * 1000,
    max: 5,
    keyGenerator: getEmailAndIpKey,
    error: 'Quá nhiều lần xác thực OTP đăng nhập, vui lòng thử lại sau 10 phút',
});

const loginOtpResendLimiter = buildLimiter({
    windowMs: 10 * 60 * 1000,
    max: 5,
    keyGenerator: getEmailAndIpKey,
    error: 'Quá nhiều lần gửi lại OTP đăng nhập, vui lòng thử lại sau 10 phút',
});

const resetPasswordLimiter = buildLimiter({
    windowMs: 60 * 60 * 1000,
    max: 5,
    keyGenerator: getEmailAndIpKey,
    error: 'Quá nhiều yêu cầu reset mật khẩu, thử lại sau 1 giờ',
});

const changePasswordLimiter = buildLimiter({
    windowMs: 60 * 60 * 1000,
    max: 5,
    keyGenerator: (req) => req.user?.user_id || req.ip,
    error: 'Quá nhiều yêu cầu đổi mật khẩu, thử lại sau 1 giờ',
});

const refreshLimiter = buildLimiter({
    windowMs: 15 * 60 * 1000,
    max: 20,
    keyGenerator: (req) => {
        const userAgent = req.headers['user-agent'] || 'unknown-agent';
        return `${userAgent}-${req.ip}`;
    },
    error: 'Quá nhiều yêu cầu refresh, thử lại sau 15 phút',
});

const taxLookupLimiter = buildLimiter({
    windowMs: 60 * 1000,
    max: 10,
    keyGenerator: (req) => req.user?.user_id || req.ip,
    error: 'Bạn đã tra cứu MST quá nhiều lần. Vui lòng thử lại sau 1 phút.',
});

const representativeTransferLimiter = buildLimiter({
    windowMs: 15 * 60 * 1000,
    max: 5,
    keyGenerator: (req) => req.user?.user_id || req.ip,
    error: 'Bạn đã thử nhượng quyền quá nhiều lần. Vui lòng thử lại sau 15 phút.',
});

const companyCreateAccountLimiter = buildLimiter({
    windowMs: 15 * 60 * 1000,
    max: 5,
    keyGenerator: getCompanyActionKey('create-company-sub-account'),
    skip: (req) => req.user?.role !== 'company',
    error: 'Bạn đã thử xác minh mật khẩu quá nhiều lần. Vui lòng thử lại sau 15 phút.',
});

const companyDeleteUserLimiter = buildLimiter({
    windowMs: 15 * 60 * 1000,
    max: 5,
    keyGenerator: getCompanyActionKey('delete-company-sub-account'),
    skip: (req) => req.user?.role !== 'company',
    error: 'Bạn đã thử xác minh mật khẩu quá nhiều lần. Vui lòng thử lại sau 15 phút.',
});

module.exports = {
    loginPasswordLimiter,
    loginOtpVerifyLimiter,
    loginOtpResendLimiter,
    resetPasswordLimiter,
    changePasswordLimiter,
    refreshLimiter,
    taxLookupLimiter,
    representativeTransferLimiter,
    companyCreateAccountLimiter,
    companyDeleteUserLimiter,
};
