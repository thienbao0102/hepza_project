const express = require('express');
const router = express.Router();
const industryController = require('../controllers/industryController');
const { authenticate, authorize, checkFirstLogin } = require('../middleware/auth');
const { verifyCsrfToken } = require('../middleware/csrf');

// API get all industry groups (admin, manager, company)
router.get('/get-all-groups', authenticate, checkFirstLogin, industryController.getAllIndustryGroups);

// API get all industries (admin, manager, company)
router.get('/get-all-industries', authenticate, checkFirstLogin, industryController.getAllIndustries);

// API get industry group by id (admin, manager, company)
router.get('/get-group/:group_id', authenticate, checkFirstLogin, industryController.getIndustryGroupById);

// API get industry by id (admin, manager, company)
router.get('/get-industry/:industry_id', authenticate, checkFirstLogin, industryController.getIndustryById);

// API create industry group (chỉ admin)
router.post('/add-group', authenticate, verifyCsrfToken, checkFirstLogin, authorize(['admin']), industryController.createIndustryGroup);

// API create industry (chỉ admin)
router.post('/add-industry', authenticate, verifyCsrfToken, checkFirstLogin, authorize(['admin']), industryController.createIndustry);

// API update industry group (chỉ admin)
router.put('/update-group/:group_id', authenticate, verifyCsrfToken, checkFirstLogin, authorize(['admin']), industryController.updateIndustryGroup);

// API update industry (chỉ admin)
router.put('/update-industry/:industry_id', authenticate, verifyCsrfToken, checkFirstLogin, authorize(['admin']), industryController.updateIndustry);

// API delete industry group (chỉ admin) - hard delete
router.delete('/delete-group/:group_id', authenticate, verifyCsrfToken, checkFirstLogin, authorize(['admin']), industryController.deleteIndustryGroup);

// API delete industry (chỉ admin) - hard delete
router.delete('/delete-industry/:industry_id', authenticate, verifyCsrfToken, checkFirstLogin, authorize(['admin']), industryController.deleteIndustry);

module.exports = router;