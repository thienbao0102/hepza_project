// routes/hashtagRoutes.js
const express = require('express');
const router = express.Router();
const hashtagController = require('../controllers/hashtagController');
const { authenticate, authorize, checkFirstLogin } = require('../middleware/auth');
const { verifyCsrfToken } = require('../middleware/csrf');

// API get all hashtags (all roles, để chọn khi tạo post)
router.get(
  '/get-all-hashtags',
  authenticate,
  checkFirstLogin,
  hashtagController.getAllHashtags
);

// API create hashtag (admin only)
router.post(
  '/add-hashtag',
  authenticate,
  verifyCsrfToken,
  checkFirstLogin,
  authorize(['admin']),
  hashtagController.createHashtag
);

// API update hashtag (admin only)
router.put(
  '/update-hashtag/:hashtag_id',
  authenticate,
  verifyCsrfToken,
  checkFirstLogin,
  authorize(['admin']),
  hashtagController.updateHashtag
);

// API delete hashtag (admin only, soft delete)
router.delete(
  '/delete-hashtag/:hashtag_id',
  authenticate,
  verifyCsrfToken,
  checkFirstLogin,
  authorize(['admin']),
  hashtagController.deleteHashtag
);

module.exports = router;