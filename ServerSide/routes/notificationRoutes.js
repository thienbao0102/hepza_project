const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate, authorize, checkFirstLogin, checkAccessByRole } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');
const { verifyCsrfToken } = require('../middleware/csrf');
const { mixedUpload } = require('../config/multer');

// Rate limiter cho gửi thông báo: 10 giây 1 lần
const sendNotificationLimiter = rateLimit({
    windowMs: 10 * 1000,
    max: 1,
    keyGenerator: (req) => req.user?.user_id || req.ip,
    handler: (req, res) => {
        res.status(429).json({ error: 'Vui lòng đợi 10 giây trước khi gửi thông báo tiếp theo để tránh spam.' });
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Route cho admin và manager
router.post('/create-template', authenticate, verifyCsrfToken, checkFirstLogin, authorize(['admin', 'manager']), mixedUpload.array('attachments', 5), notificationController.createTemplate);
router.put('/update-template/:template_id', authenticate, verifyCsrfToken, checkFirstLogin, authorize(['admin', 'manager']), mixedUpload.array('attachments', 5), notificationController.updateTemplate);
router.patch('/disable-template/:template_id', authenticate, verifyCsrfToken, checkFirstLogin, authorize(['admin', 'manager']), notificationController.disableTemplate);
router.get('/get-templates', authenticate, checkFirstLogin, [authorize(['admin', 'manager']), checkAccessByRole], notificationController.getTemplates);
router.get('/get-template/:template_id', authenticate, checkFirstLogin, authorize(['admin', 'manager']), notificationController.getTemplateById);
router.post('/send', authenticate, verifyCsrfToken, checkFirstLogin, [authorize(['admin', 'manager']), checkAccessByRole], sendNotificationLimiter, notificationController.sendNotification);
router.get('/get-send-history', authenticate, checkFirstLogin, [authorize(['admin', 'manager']), checkAccessByRole], notificationController.getSendHistory);
router.get('/get-send-log-senders', authenticate, checkFirstLogin, [authorize(['admin', 'manager']), checkAccessByRole], notificationController.getLogSenders);
router.put('/restore-template/:template_id', authenticate, verifyCsrfToken, checkFirstLogin, authorize(['admin', 'manager']), notificationController.restoreTemplate);
router.post('/send-immediate', authenticate, verifyCsrfToken, checkFirstLogin, [authorize(['admin', 'manager']), checkAccessByRole], sendNotificationLimiter, mixedUpload.array('attachments', 5), notificationController.sendImmediateNotification);
router.delete('/hard-delete-template/:template_id', authenticate, verifyCsrfToken, checkFirstLogin, authorize(['admin', 'manager']), notificationController.hardDeleteTemplate);
router.get('/get-send-log/:log_id', authenticate, checkFirstLogin, [authorize(['admin', 'manager']), checkAccessByRole], notificationController.getSendLogById);
router.post('/revoke-send-logs', authenticate, verifyCsrfToken, checkFirstLogin, authorize(['admin', 'manager']), notificationController.revokeSendLogs);
router.post('/estimate-recipients', authenticate, checkFirstLogin, authorize(['admin', 'manager']), notificationController.estimateRecipients);

// Route cho user
router.get('/my-notifications', authenticate, checkFirstLogin, notificationController.getUserNotifications);
router.put('/read/:notification_I_id', authenticate, verifyCsrfToken, checkFirstLogin, notificationController.markAsRead);
router.put('/pin/:notification_I_id', authenticate, verifyCsrfToken, checkFirstLogin, notificationController.pinNotification);
router.put('/unpin/:notification_I_id', authenticate, verifyCsrfToken, checkFirstLogin, notificationController.unpinNotification);
router.get('/get-notification-instance/:notification_I_id', authenticate, checkFirstLogin, notificationController.getNotificationInstanceById);
router.delete('/delete/:notification_I_id', authenticate, verifyCsrfToken, checkFirstLogin, notificationController.deleteNotification);
router.post('/delete-multiple', authenticate, verifyCsrfToken, checkFirstLogin, notificationController.deleteMultipleNotifications);

module.exports = router;
