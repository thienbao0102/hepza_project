const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, authorize, checkFirstLogin } = require('../middleware/auth');
const { verifyCsrfToken } = require('../middleware/csrf');
const { companyCreateAccountLimiter, companyDeleteUserLimiter } = require('../middleware/rateLimiter');

router.post('/create-account', authenticate, verifyCsrfToken, checkFirstLogin, authorize(['admin', 'manager', 'company']), companyCreateAccountLimiter, userController.createUser);
router.put('/update-user/:user_id', authenticate, verifyCsrfToken, checkFirstLogin, authorize(['admin', 'manager', 'company']), userController.updateUser);
router.delete('/delete-user/:user_id', authenticate, verifyCsrfToken, checkFirstLogin, authorize(['admin', 'manager', 'company']), companyDeleteUserLimiter, userController.deleteUser);
router.delete('/delete-users', authenticate, verifyCsrfToken, checkFirstLogin, authorize(['admin', 'manager', 'company']), userController.deleteUsers);
router.get('/get-users/:role', authenticate, checkFirstLogin, authorize(['admin', 'manager', 'company']), userController.getUsersByRole);
router.get('/get-user/:user_id', authenticate, checkFirstLogin, authorize(['admin', 'manager', 'company']), userController.getUserById);
router.put('/restore-user/:user_id', authenticate, verifyCsrfToken, checkFirstLogin, authorize(['admin', 'manager', 'company']), userController.restoreUser);
router.put('/restore-users', authenticate, verifyCsrfToken, checkFirstLogin, authorize(['admin', 'manager', 'company']), userController.restoreUsers);
router.put('/profile/update_profile', authenticate, verifyCsrfToken, checkFirstLogin, userController.updateMyProfile);
router.post('/profile/verify_email_otp', authenticate, verifyCsrfToken, checkFirstLogin, userController.verifyEmailOtp);
router.delete('/hard-delete-user/:user_id', authenticate, verifyCsrfToken, checkFirstLogin, authorize(['admin', 'manager', 'company']), companyDeleteUserLimiter, userController.hardDeleteUser);
router.delete('/hard-delete-users', authenticate, verifyCsrfToken, checkFirstLogin, authorize(['admin', 'manager', 'company']), userController.hardDeleteUsers);
router.get('/get-deleted-users/:role', authenticate, verifyCsrfToken, checkFirstLogin, authorize(['admin', 'manager', 'company']), userController.getTrashUsers);

router.get('/preview-soft-delete', authenticate, checkFirstLogin, authorize(['admin', 'manager', 'company']), userController.previewSoftDelete);
router.get('/preview-hard-delete', authenticate, checkFirstLogin, authorize(['admin', 'manager', 'company']), userController.previewHardDelete);

router.post('/admin-reset-password/:user_id', authenticate, verifyCsrfToken, checkFirstLogin, authorize(['admin', 'manager']), userController.adminResetPassword);

module.exports = router;
