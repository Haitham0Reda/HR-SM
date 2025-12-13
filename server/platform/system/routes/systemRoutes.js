import express from 'express';
import { authenticatePlatformUser } from '../../middleware/platformAuth.js';

const router = express.Router();

/**
 * Platform System Routes
 * Base path: /api/platform/system
 */

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Platform system is healthy',
    timestamp: new Date().toISOString()
  });
});

// System status (protected)
router.get('/status', authenticatePlatformUser, (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'operational',
      version: '1.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    }
  });
});

export default router;