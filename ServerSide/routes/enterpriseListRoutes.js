const express = require('express');
const router = express.Router();
const enterpriseListController = require('../controllers/enterpriseListController');
const { authenticate, authorize, checkFirstLogin, checkAccessByRole } = require('../middleware/auth');

// Route API: Lấy danh sách doanh nghiệp ĐÃ khai báo tài nguyên/chất thải
router.get(
    '/',
    authenticate,
    checkFirstLogin,
    [authorize(['admin', 'manager']), checkAccessByRole],
    enterpriseListController.getEnterprises
);

// Route API mới: Lấy danh sách doanh nghiệp CHƯA khai báo trong kỳ báo cáo (tháng) được chọn
router.get(
    '/undeclared',
    authenticate,
    checkFirstLogin,
    [authorize(['admin', 'manager']), checkAccessByRole],
    enterpriseListController.getUndeclaredEnterprises
);

// Route API mới: Lấy danh sách doanh nghiệp CHƯA khai báo trong kỳ báo cáo (năm) được chọn
router.get(
    '/yearly-matrix',
    authenticate,
    checkFirstLogin,
    [authorize(['admin', 'manager']), checkAccessByRole],
    enterpriseListController.getYearlyMatrix
);

module.exports = router;
