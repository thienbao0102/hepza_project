const express = require('express');
const router = express.Router();
const onlineController = require('../controllers/onlineController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/count', authenticate, authorize(['admin']), onlineController.getOnlineCount);
router.get('/users', authenticate, authorize(['admin']), onlineController.getOnlineUsersList);

module.exports = router;
