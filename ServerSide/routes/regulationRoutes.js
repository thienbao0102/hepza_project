const express = require('express');
const router = express.Router();
const regulationController = require('../controllers/regulationController');
const { authenticate, authorize, checkFirstLogin, checkAccessByRole } = require('../middleware/auth');
const { verifyCsrfToken } = require('../middleware/csrf');

router.get('/get-regulation-data', authenticate, checkFirstLogin, [authorize(['admin', 'manager', 'company']), checkAccessByRole], regulationController.getRegulationData);

router.get(
    '/:regulationId',
    authenticate,
    checkFirstLogin,
    [authorize(['admin', 'manager', 'company']), checkAccessByRole],
    regulationController.getRegulationDetail
);

router.post(
    '/add-regulation',
    authenticate,
    verifyCsrfToken,
    checkFirstLogin,
    authorize(['admin']),
    regulationController.createRegulation
);

router.put(
    '/update-regulation/:regulationId',
    authenticate,
    verifyCsrfToken,
    checkFirstLogin,
    authorize(['admin']),
    regulationController.updateRegulation
);

router.delete(
    '/delete-regulation/:regulationId',
    authenticate,
    verifyCsrfToken,
    checkFirstLogin,
    authorize(['admin']),
    regulationController.deleteRegulation
);

router.delete(
    '/delete-regulations',
    authenticate,
    verifyCsrfToken,
    checkFirstLogin,
    authorize(['admin']),
    regulationController.deleteMultipleRegulations
);

module.exports = router;
