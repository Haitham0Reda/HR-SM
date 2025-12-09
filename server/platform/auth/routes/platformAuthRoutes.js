const express = require('express');
const router = express.Router();
const platformAuthController = require('../controllers/platformAuthController');

// Import authentication middleware
const { authenticatePlatform } = require('../../../core/middleware/platformAuthentication');

/**
 * Platform Authentication Routes
 * Base path: /api/platform/auth
 */

// Public routes (no authentication required)
router.post('/login', platformAuthController.login);

// Protected routes (authentication required)
router.post('/logout', authenticatePlatform, platformAuthController.logout);
router.get('/me', authenticatePlatform, platformAuthController.me);
router.post('/change-password', authenticatePlatform, platformAuthController.changePassword);

module.exports = router;
