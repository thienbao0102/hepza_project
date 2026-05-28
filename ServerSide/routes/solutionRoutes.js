const express = require('express');
const router = express.Router();
const solutionController = require('../controllers/solutionController');
const { authenticate, authorize, checkFirstLogin, checkAccessByRole } = require('../middleware/auth');
const { verifyCsrfToken } = require('../middleware/csrf');

router.get('/get-solution-data', authenticate, checkFirstLogin, [authorize(['admin', 'manager', 'company']), checkAccessByRole], solutionController.getSolutionData);

router.get(
    '/:solutionId',
    authenticate,
    checkFirstLogin,
    [authorize(['admin', 'manager', 'company']), checkAccessByRole],
    solutionController.getSolutionDetail
);

router.post(
    '/add-solution',
    authenticate,
    verifyCsrfToken,
    checkFirstLogin,
    authorize(['admin']),
    solutionController.createSolution
);

router.put(
    '/update-solution/:solutionId',
    authenticate,
    verifyCsrfToken,
    checkFirstLogin,
    authorize(['admin']),
    solutionController.updateSolution
);

router.delete(
    '/delete-solution/:solutionId',
    authenticate,
    verifyCsrfToken,
    checkFirstLogin,
    authorize(['admin']),
    solutionController.deleteSolution
);

router.post(
    '/delete-solutions',
    authenticate,
    verifyCsrfToken,
    checkFirstLogin,
    authorize(['admin']),
    solutionController.deleteMultipleSolutions
);

module.exports = router;
