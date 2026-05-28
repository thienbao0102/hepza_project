const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const { authenticate, authorize, checkFirstLogin, checkAccessByRole } = require('../middleware/auth');
const { verifyCsrfToken } = require('../middleware/csrf');
const { taxLookupLimiter, representativeTransferLimiter } = require('../middleware/rateLimiter');
const { mixedUpload } = require('../config/multer');

// API add new company from file import (chỉ admin)
router.post('/add-list-company', authenticate, verifyCsrfToken, checkFirstLogin, authorize(['admin', 'manager']), companyController.addCompanyFromFile);

// API add single company (chỉ admin)
router.post('/add-company', authenticate, verifyCsrfToken, checkFirstLogin, authorize(['admin', 'manager']), companyController.addSingleCompany);

// API get all companies as conditions with pagination
router.get('/get-all-companies', authenticate, checkFirstLogin, authorize(['admin', 'manager', 'company']), companyController.getAllCompaniesAsConditions);

router.get('/tax-lookup/:taxCode', authenticate, checkFirstLogin, authorize(['admin', 'manager']), taxLookupLimiter, companyController.lookupTaxCode);

// API get strictly filtered company list for Management Panel
router.get('/get-managed-companies', authenticate, checkFirstLogin, authorize(['manager']), companyController.getManagedCompanies);

// API get soft deleted company (chỉ admin)
router.get('/get-deleted-companies', authenticate, checkFirstLogin, authorize(['admin', 'manager']), companyController.getDeletedCompanies); // Get soft-deleted companies

// API delete company by company_id (chỉ admin)
router.delete('/delete-company/:company_id', authenticate, verifyCsrfToken, checkFirstLogin, authorize(['admin', 'manager']), companyController.deleteCompanyById);

// API delete multiple companies by company_ids (chỉ admin)
router.delete('/delete-companies', authenticate, verifyCsrfToken, checkFirstLogin, authorize(['admin', 'manager']), companyController.deleteCompaniesByIds);

// API HARD delete all companies (chỉ admin)
router.delete('/delete-company-all/', authenticate, verifyCsrfToken, checkFirstLogin, authorize(['admin']), companyController.deleteAllCompany);

router.put('/restore-company/:company_id', authenticate, verifyCsrfToken, checkFirstLogin, authorize(['admin', 'manager']), companyController.restoreCompany);
router.put('/restore-companies', authenticate, verifyCsrfToken, checkFirstLogin, authorize(['admin', 'manager']), companyController.restoreCompanies);

// API update company information (admin hoặc chính công ty đó)
router.put('/update-company/:company_id', authenticate, verifyCsrfToken, checkFirstLogin, [authorize(['admin', 'manager', 'company']), checkAccessByRole], companyController.updateCompany);
router.put('/set-representative/:company_id', authenticate, verifyCsrfToken, checkFirstLogin, authorize(['admin', 'manager', 'company']), representativeTransferLimiter, companyController.setRepresentativeUser);

// Preview xóa mềm
router.get('/preview-soft-delete', authenticate, checkFirstLogin, authorize(['admin', 'manager']), companyController.previewSoftDelete);

// Preview xóa cứng
router.get('/preview-hard-delete', authenticate, checkFirstLogin, authorize(['admin', 'manager']), companyController.previewHardDelete);

// Hard delete single company
router.delete('/hard-delete-company/:company_id', authenticate, verifyCsrfToken, checkFirstLogin, authorize(['admin', 'manager']), companyController.hardDeleteCompany);

// Hard delete multiple companies
router.delete('/hard-delete-companies', authenticate, verifyCsrfToken, checkFirstLogin, authorize(['admin', 'manager']), companyController.hardDeleteCompanies);

// Preview import company from file (chỉ admin)
router.post('/preview-import-company', authenticate, verifyCsrfToken, checkFirstLogin, authorize(['admin', 'manager']), companyController.previewImportCompanies);

router.get('/get-company/:company_id', authenticate, checkFirstLogin, authorize(['admin', 'manager', 'company']), companyController.getCompany);

router.post('/add_license/:company_id', authenticate, verifyCsrfToken, checkFirstLogin, authorize(['company', 'admin', 'manager']), mixedUpload.single('attachment'), companyController.addLicense);

router.put('/update_license/:company_id', authenticate, verifyCsrfToken, checkFirstLogin, authorize(['company', 'admin', 'manager']), mixedUpload.single('attachment'), companyController.updateLicense);

router.delete('/delete_license/:company_id', authenticate, verifyCsrfToken, checkFirstLogin, authorize(['company', 'admin', 'manager']), companyController.deleteLicense);

router.get('/get_license/:company_id', authenticate, checkFirstLogin, [authorize(['admin', 'manager', 'company']), checkAccessByRole], companyController.getLicense);

router.delete('/delete_licenses/:company_id', authenticate, verifyCsrfToken, checkFirstLogin, authorize(['company', 'admin', 'manager']), companyController.deleteMultipleLicenses);

module.exports = router;
