const express = require('express');
const router = express.Router();
const controller = require('../controllers/environmentalReportController');
const { authenticate, authorize, checkFirstLogin, checkAccessByRole } = require('../middleware/auth');
const { verifyCsrfToken } = require('../middleware/csrf');
const { documentUpload } = require('../config/multer');

// Upload environmental report (company only)
router.post(
  '/upload',
  authenticate,
  checkFirstLogin,
  verifyCsrfToken,
  [authorize(['company']), checkAccessByRole],
  documentUpload.single('file'),
  controller.uploadReport
);

// List reports for a company (all authorized roles)
router.get(
  '/:companyId',
  authenticate,
  checkFirstLogin,
  [authorize(['admin', 'manager', 'company']), checkAccessByRole],
  controller.getReports
);

// Download a report file
router.get(
  '/download/:id',
  authenticate,
  checkFirstLogin,
  [authorize(['admin', 'manager', 'company']), checkAccessByRole],
  controller.downloadReport
);

// Delete a report (company only)
router.delete(
  '/:id',
  authenticate,
  checkFirstLogin,
  verifyCsrfToken,
  [authorize(['company']), checkAccessByRole],
  controller.deleteReport
);

module.exports = router;
