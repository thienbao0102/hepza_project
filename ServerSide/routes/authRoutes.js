const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { verifyCsrfToken } = require('../middleware/csrf');
const {
    loginPasswordLimiter,
    loginOtpVerifyLimiter,
    loginOtpResendLimiter,
    resetPasswordLimiter,
    changePasswordLimiter,
    refreshLimiter
} = require('../middleware/rateLimiter');

router.post('/login', loginPasswordLimiter, authController.login);
router.post('/verify-login-otp', loginOtpVerifyLimiter, authController.verifyLoginOtp);
router.post('/resend-login-otp', loginOtpResendLimiter, authController.resendLoginOtp);
router.post('/change-password', authenticate, verifyCsrfToken, changePasswordLimiter, authController.changePassword);
router.post('/request-password-reset', resetPasswordLimiter, authController.requestPasswordReset);
router.get('/reset-password/init', authController.initiateResetPassword);
router.post('/reset-password', resetPasswordLimiter, authController.resetPassword);
router.post('/logout', authenticate, verifyCsrfToken, authController.logout);
router.get('/me', authenticate, authController.getAuthenticatedUser);
router.post('/refresh', refreshLimiter, authController.refresh);

module.exports = router;
