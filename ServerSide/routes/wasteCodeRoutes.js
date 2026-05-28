const express = require('express');
const router = express.Router();
const wasteCodeController = require('../controllers/wasteCodeController');
const { authenticate, checkFirstLogin } = require('../middleware/auth');

router.get('/lookup', authenticate, checkFirstLogin, wasteCodeController.lookupWasteCode);
router.get('/search', authenticate, checkFirstLogin, wasteCodeController.searchWasteCodes);

module.exports = router;
