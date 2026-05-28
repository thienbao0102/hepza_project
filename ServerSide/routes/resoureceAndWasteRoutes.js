const express = require('express');
const router = express.Router();
const resourceAndWasteController = require('../controllers/resourceAndWasteController');
const { authenticate, authorize, checkFirstLogin, checkAccessByRole } = require('../middleware/auth');
const { verifyCsrfToken } = require('../middleware/csrf');
const redisCache = require('../middleware/redisCache');
router.post('/insert-data', authenticate, checkFirstLogin, verifyCsrfToken, [authorize(['admin', 'manager', 'company']), checkAccessByRole], resourceAndWasteController.insertDataResourceAndWaste);

router.post('/update-data', authenticate, checkFirstLogin, verifyCsrfToken, [authorize(['admin', 'manager', 'company']), checkAccessByRole], resourceAndWasteController.updateDataResourceAndWaste);

router.get('/get-data-resource', authenticate, checkFirstLogin, [authorize(['admin', 'manager', 'company']), checkAccessByRole], redisCache({ durationInSeconds: 300 }), resourceAndWasteController.getDataResource);

router.get('/get-all-data-resource-with-history', authenticate, checkFirstLogin, [authorize(['admin', 'manager', 'company']), checkAccessByRole], redisCache({ durationInSeconds: 300 }), resourceAndWasteController.getAllResourceDataWithHistory);

// Import resources from Excel file
router.post('/import-data', authenticate, checkFirstLogin, verifyCsrfToken, [authorize(['admin', 'manager', 'company']), checkAccessByRole], resourceAndWasteController.importDataResourceFromExcel);

// Upload bill image for electricity/water fuel resources (HTTP multipart — not socket)
const { imageUpload, mixedUpload, processUploadedFiles } = require('../config/multer');
router.post(
  '/fuel-resources/:id/upload-bill',
  authenticate,
  checkFirstLogin,
  verifyCsrfToken,
  [authorize(['admin', 'manager', 'company']), checkAccessByRole],
  imageUpload.single('billImage'),
  processUploadedFiles,
  resourceAndWasteController.uploadFuelBillImage
);

router.post(
  '/waste-resources/:id/upload-attachments',
  authenticate,
  checkFirstLogin,
  verifyCsrfToken,
  [authorize(['admin', 'manager', 'company']), checkAccessByRole],
  mixedUpload.array('attachments', 5),
  processUploadedFiles,
  resourceAndWasteController.uploadWasteAttachments
);

module.exports = router;