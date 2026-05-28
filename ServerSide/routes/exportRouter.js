const express = require('express');
const router = express.Router();
const companyController = require('../controllers/exportController');
const { authenticate, authorize, checkFirstLogin, checkAccessByRole } = require('../middleware/auth');
const { verifyCsrfToken } = require('../middleware/csrf');

router.get('/export-resource-waste',
    authenticate, checkFirstLogin, verifyCsrfToken, [authorize(['admin', 'manager', 'company'])],
    companyController.exportResourceWaste
);

router.post('/init',
    authenticate, checkFirstLogin, verifyCsrfToken, [authorize(['admin', 'manager', 'company'])],
    companyController.initExport
);

router.get('/:export_id/status',
    authenticate, checkFirstLogin, verifyCsrfToken, [authorize(['admin', 'manager', 'company'])],
    companyController.getExportStatus
);

router.get('/:export_id/download',
    authenticate, checkFirstLogin, verifyCsrfToken, [authorize(['admin', 'manager', 'company'])],
    companyController.downloadExport
);

router.get('/history',
    authenticate, checkFirstLogin, verifyCsrfToken,
    companyController.getExportHistory
);

router.delete('/history/:id',
    authenticate, checkFirstLogin, verifyCsrfToken,
    companyController.deleteExportHistory
);

router.patch('/history/:id',
    authenticate, checkFirstLogin, verifyCsrfToken,
    companyController.updateExportHistoryStatus
);

module.exports = router;