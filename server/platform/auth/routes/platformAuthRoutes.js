import express from 'express';
import * as platformAuthController from '../controllers/platformAuthController.js';
import { authenticatePlatformUser } from '../../middleware/platformAuth.js';

const router = express.Router();

/**
 * Platform Authentication Routes
 * Base path: /api/platform/auth
 */

// Public routes (no authentication required)
router.post('/login', platformAuthController.login);

// Protected routes (authentication required)
router.post('/logout', authenticatePlatformUser, platformAuthController.logout);
router.get('/me', authenticatePlatformUser, platformAuthController.me);
router.post('/change-password', authenticatePlatformUser, platformAuthController.changePassword);

export default router;
