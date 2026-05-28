const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const Company = require('../models/companyModel');
const cacheManager = require('../lib/cacheManager');
const { JWT_VERIFY_OPTIONS } = require('../utils/jwtOptions');

const authTokenName = process.env.NODE_ENV === 'production' ? '__Secure-authToken' : 'authToken';

const authenticate = async (req, res, next) => {
    const token = req.cookies[authTokenName];

    if (!token) return res.status(401).json({ message: 'Bạn chưa đăng nhập' }); // Thử refresh token

    // Kiểm tra blacklist
    const isBlacklisted = await cacheManager.get(`blacklist:${token}`);
    if (isBlacklisted) return res.status(401).json({ message: 'Phiên đăng nhập đã bị thu hồi' }); // Logout ngay

    jwt.verify(token, process.env.JWT_SECRET, JWT_VERIFY_OPTIONS, async (err, decoded) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ code: 'EXPIRED', message: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại' }); // Thử refresh token
            }
            return res.status(401).json({ code: 'INVALID', message: 'Phiên đăng nhập không hợp lệ' }); // Logout ngay
        }

        // Check cache trước
        let user = await cacheManager.get(`user:${decoded.user_id}`);
        if (!user) {
            user = await User.findOne({ user_id: decoded.user_id, deleted_at: null }).lean();
            if (!user) return res.status(401).json({ message: 'Tài khoản không tồn tại' }); // Logout ngay
            await cacheManager.set(`user:${decoded.user_id}`, user, 15 * 60); // Cache 15 phút
        }

        req.user = { ...decoded, ...user }; // Combine token data with full user profile
        req.userDetails = user; // Keep for legacy compatibility if needed
        next();
    });
};

const authorize = (roles = []) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: `Bạn không có quyền (${req.user.role}) để truy cập tài nguyên này` });
        }
        next();
    };
};

const checkFirstLogin = (req, res, next) => {
    if (req.userDetails.firstLogin && req.path !== '/change-password') {
        return res.status(403).json({ message: 'Vui lòng đổi mật khẩu trước khi tiếp tục', firstLogin: true });
    }
    next();
};

const checkAccessByRole = async (req, res, next) => {
    const user = req.userDetails;
    const companyId = req.params.company_id || req.body?.company_id || req.query?.company_id;

    // Một số route không yêu cầu company_id, hoặc là GET request (Option 1: cho phép xem chéo)
    if (!companyId || req.method === 'GET') {
        return next();
    }

    if (user.role === 'manager') {
        const company = await Company.findOne({ company_id: companyId, deleted_at: null });
        if (!company) {
            return res.status(404).json({ message: 'Company not found' });
        }
        if (company.zone_id !== user.zone_id) {
            return res.status(403).json({ message: 'Doanh nghiệp này không thuộc khu vực bạn quản lý' });
        }
    }

    if (user.role === 'company') {
        if (user.company_id !== companyId) {
            return res.status(403).json({ message: 'Bạn không được phép truy cập doanh nghiệp khác' });
        }
    }

    next();
};

module.exports = {
    authenticate,
    authorize,
    checkFirstLogin,
    checkAccessByRole,
};
