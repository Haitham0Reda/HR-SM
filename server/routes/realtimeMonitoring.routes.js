import express from 'express';
import realtimeMonitoringService from '../services/realtimeMonitoring.service.js';

const router = express.Router();

/**
 * Get real-time monitoring service health status
 * GET /api/v1/monitoring/realtime/health
 */
router.get('/health', (req, res) => {
  try {
    const healthStatus = realtimeMonitoringService.getHealthStatus();
    res.json({
      success: true,
      data: healthStatus
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get real-time monitoring health status',
      error: error.message
    });
  }
});

/**
 * Get connection statistics
 * GET /api/v1/monitoring/realtime/stats
 */
router.get('/stats', (req, res) => {
  try {
    const stats = realtimeMonitoringService.getConnectionStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get connection statistics',
      error: error.message
    });
  }
});

/**
 * Broadcast custom event to platform admin clients
 * POST /api/v1/monitoring/realtime/broadcast
 */
router.post('/broadcast', (req, res) => {
  try {
    const { event, data } = req.body;
    
    if (!event) {
      return res.status(400).json({
        success: false,
        message: 'Event name is required'
      });
    }

    realtimeMonitoringService.broadcastToPlatform(event, data || {});
    
    res.json({
      success: true,
      message: 'Event broadcasted successfully',
      event,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to broadcast event',
      error: error.message
    });
  }
});

export default router;