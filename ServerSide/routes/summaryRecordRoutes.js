const express = require('express');
const router = express.Router();
const { authenticate, authorize, checkFirstLogin, checkAccessByRole } = require('../middleware/auth');
const { verifyCsrfToken } = require('../middleware/csrf');
const summaryRecordController = require('../controllers/summaryRecordController');
const redisCache = require('../middleware/redisCache');
router.get('/get-summary-record', authenticate, checkFirstLogin, [authorize(['admin', 'manager', 'company'])], redisCache({ durationInSeconds: 300 }), summaryRecordController.getSummaryRecord);

router.get('/get-summary-record-by-periodkey', authenticate, checkFirstLogin, [authorize(['admin', 'manager', 'company'])], redisCache({ durationInSeconds: 300 }), summaryRecordController.getSummaryRecordByPeriodKey);

module.exports = router;