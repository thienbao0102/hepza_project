const express = require('express');
const router = express.Router();
const errorLogController = require('../controllers/errorLog.controller');

// Create error log (public or authenticated user)
router.post('/', errorLogController.createErrorLog);

// Get all error logs (Admin only ideally, but keeping open for now as per minimal requirements, can add auth later)
router.get('/', errorLogController.getAllErrorLogs);

// Update error status
router.patch('/:id/status', errorLogController.updateErrorStatus);

// Delete error log
router.delete('/:id', errorLogController.deleteErrorLog);

module.exports = router;
