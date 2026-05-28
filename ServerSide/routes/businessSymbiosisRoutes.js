const businessSysmbiosisController = require('../controllers/businessSymbiosisController');
const express = require('express');
const { authenticate, authorize, checkFirstLogin, checkAccessByRole } = require('../middleware/auth');
const { verifyCsrfToken } = require('../middleware/csrf');
const redisCache = require('../middleware/redisCache');
const { mixedUpload } = require('../config/multer');
const router = express.Router();

const MAX_FILES = 5;

//recommendation list output by buy demand
router.get('/buy-demand/recommendations', authenticate, checkFirstLogin, verifyCsrfToken, [authorize(['admin', 'manager', 'company']), checkAccessByRole], redisCache({ durationInSeconds: 300 }), businessSysmbiosisController.getBusinessSymbiosisByBuyDemand);
//recommendation list input by sell supply
router.get('/sell-supply/recommendations', authenticate, checkFirstLogin, verifyCsrfToken, [authorize(['admin', 'manager', 'company']), checkAccessByRole], redisCache({ durationInSeconds: 300 }), businessSysmbiosisController.getBusinessSymbiosisBySellSupply);
//insert data buy demand (multipart — max 5 files)
router.post('/add-buy-demand', authenticate, checkFirstLogin, verifyCsrfToken, [authorize(['admin', 'manager', 'company']), checkAccessByRole], mixedUpload.array('attachments', MAX_FILES), businessSysmbiosisController.insertDataBusinessSymbiosisBuyDemand);
//insert data sell supply (multipart — max 5 files)
router.post('/add-sell-supply', authenticate, checkFirstLogin, verifyCsrfToken, [authorize(['admin', 'manager', 'company']), checkAccessByRole], mixedUpload.array('attachments', MAX_FILES), businessSysmbiosisController.insertDataBusinessSymbiosisSellSupply);
//get list data buy demand
router.get('/buy-demand/list', authenticate, checkFirstLogin, [authorize(['admin', 'manager', 'company']), checkAccessByRole], businessSysmbiosisController.getBusinessSymbiosisBuyDemandList);
//get list data sell supply
router.get('/sell-supply/list', authenticate, checkFirstLogin, [authorize(['admin', 'manager', 'company']), checkAccessByRole], businessSysmbiosisController.getBusinessSymbiosisSellSupplyList);
//recommandation search data output by buy demand
router.get('/buy-demand/recommand-search', authenticate, checkFirstLogin, [authorize(['admin', 'manager', 'company']), checkAccessByRole], businessSysmbiosisController.recommandSearchBusinessSymbiosisByBuyDemand);
//recommandation search data input by sell supply
router.get('/sell-supply/recommand-search', authenticate, checkFirstLogin, [authorize(['admin', 'manager', 'company']), checkAccessByRole], businessSysmbiosisController.recommandSearchBusinessSymbiosisBySellSupply);
//delete buy demand by id
router.delete('/buy-demand/delete/:_id', authenticate, checkFirstLogin, verifyCsrfToken, [authorize(['admin', 'manager', 'company']), checkAccessByRole], businessSysmbiosisController.deleteBusinessSymbiosisBuyDemandById);
//delete sell supply by id
router.delete('/sell-supply/delete/:_id', authenticate, checkFirstLogin, verifyCsrfToken, [authorize(['admin', 'manager', 'company']), checkAccessByRole], businessSysmbiosisController.deleteBusinessSymbiosisSellSupplyById);
//update buy demand by id (multipart — max 5 files)
router.put('/buy-demand/update/:_id', authenticate, checkFirstLogin, verifyCsrfToken, [authorize(['admin', 'manager', 'company']), checkAccessByRole], mixedUpload.array('attachments', MAX_FILES), businessSysmbiosisController.updateBusinessSymbiosisBuyDemandById);
//update sell supply by id (multipart — max 5 files)
router.put('/sell-supply/update/:_id', authenticate, checkFirstLogin, verifyCsrfToken, [authorize(['admin', 'manager', 'company']), checkAccessByRole], mixedUpload.array('attachments', MAX_FILES), businessSysmbiosisController.updateBusinessSymbiosisSellSupplyById);
//get all buy demand exlduding company
router.get('/buy-demand/get-all-excluding-company', authenticate, checkFirstLogin, [authorize(['admin', 'manager', 'company']), checkAccessByRole], businessSysmbiosisController.findAllBuyDemandsExcludingCompany);
//get all sell supply exlduding company
router.get('/sell-supply/get-all-excluding-company', authenticate, checkFirstLogin, [authorize(['admin', 'manager', 'company']), checkAccessByRole], businessSysmbiosisController.findAllSellSuppliesExcludingCompany);
//proxy download attachment from Cloudinary
router.get('/download', authenticate, checkFirstLogin, [authorize(['admin', 'manager', 'company']), checkAccessByRole], businessSysmbiosisController.proxyDownloadAttachment);

module.exports = router;