const express = require('express');
const router = express.Router();
const emissionController = require('../controllers/emissionController');
const { authenticate, authorize, checkFirstLogin, checkAccessByRole } = require('../middleware/auth');
const { verifyCsrfToken } = require('../middleware/csrf');
const redisCache = require('../middleware/redisCache');

router.get('/get-emission-data', authenticate, checkFirstLogin, [authorize(['admin', 'manager', 'company']), checkAccessByRole], redisCache({ durationInSeconds: 300 }), emissionController.getDataEmission);

module.exports = router;