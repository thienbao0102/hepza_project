const express = require('express');
const router = express.Router();
const industrialZoneController = require('../controllers/industrialZoneController');
const { authenticate, authorize, checkFirstLogin } = require('../middleware/auth');
const { imageUpload, processUploadedFiles } = require('../config/multer'); // Tái sử dụng từ config
const { verifyCsrfToken } = require('../middleware/csrf');

// API get all industrial zones (chỉ admin hoặc manager)
router.get(
  '/get-all-zones',
  authenticate,
  checkFirstLogin,
  industrialZoneController.getAllIndustrialZones
);

// API get industrial zone by id (chỉ admin hoặc manager)
router.get(
  '/get-zone/:zone_id',
  authenticate,
  checkFirstLogin,
  industrialZoneController.getZoneById
);

// API create industrial zone (chỉ admin)
router.post(
  '/add-zone',
  authenticate,
  verifyCsrfToken,
  checkFirstLogin,
  authorize(['admin']),
  imageUpload.single('image'),
  processUploadedFiles,
  industrialZoneController.createIndustrialZone
);

// API update industrial zone (chỉ admin)
router.put(
  '/update-zone/:zone_id',
  authenticate,
  verifyCsrfToken,
  checkFirstLogin,
  authorize(['admin']),
  imageUpload.single('image'),
  processUploadedFiles,
  industrialZoneController.updateIndustrialZone
);

// API xem trước xóa mềm (chỉ admin)
router.get(
  '/preview-soft-delete',
  authenticate,
  checkFirstLogin,
  authorize(['admin']),
  industrialZoneController.previewSoftDelete
);

// API xem trước xóa cứng (chỉ admin)
router.get(
  '/preview-hard-delete',
  authenticate,
  checkFirstLogin,
  authorize(['admin']),
  industrialZoneController.previewHardDelete
);

// API delete industrial zone (chỉ admin)
router.delete(
  '/delete-zone/:zone_id',
  authenticate,
  verifyCsrfToken,
  checkFirstLogin,
  authorize(['admin']),
  industrialZoneController.deleteIndustrialZone
);

// API restore industrial zone (chỉ admin)
router.put(
  '/restore-zone/:zone_id',
  authenticate,
  verifyCsrfToken,
  checkFirstLogin,
  authorize(['admin']),
  industrialZoneController.restoreIndustrialZone
);

// API delete multiple industrial zones (chỉ admin)
router.post(
  '/delete-zones',
  authenticate,
  verifyCsrfToken,
  checkFirstLogin,
  authorize(['admin']),
  industrialZoneController.deleteIndustrialZones
);

// API restore multiple industrial zones (chỉ admin)
router.put(
  '/restore-zones',
  authenticate,
  verifyCsrfToken,
  checkFirstLogin,
  authorize(['admin']),
  industrialZoneController.restoreIndustrialZones
);

// API hard delete industrial zone (chỉ admin)
router.delete(
  '/hard-delete-zone/:zone_id',
  authenticate,
  verifyCsrfToken,
  checkFirstLogin,
  authorize(['admin']),
  industrialZoneController.hardDeleteIndustrialZone
);

// API hard delete multiple industrial zones (chỉ admin)
router.post(
  '/hard-delete-zones',
  authenticate,
  verifyCsrfToken,
  checkFirstLogin,
  authorize(['admin']),
  industrialZoneController.hardDeleteIndustrialZones
);

module.exports = router;