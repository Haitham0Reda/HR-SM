import express from 'express';
import * as platformAuthController from '../controllers/platformAuthController.js';
import { authenticatePlatform } from '../../../core/middleware/platformAuthentication.js';

const router = express.Router();

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

export default router;
