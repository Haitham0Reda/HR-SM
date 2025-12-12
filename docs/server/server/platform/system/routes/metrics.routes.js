// routes/metrics.routes.js
import express from 'express';
import metricsService from '../services/metrics.service.js';
import alertManager from '../services/alertManager.service.js';
import logger from '../../../core/logging/logger.js';

const router = express.Router();

/**
 * GET /api/v1/metrics
 * Expose Prometheus metrics
 */
router.get('/', async (req, res) => {
    try {
        const metrics = await metricsService.getMetrics();
        res.set('Content-Type', metricsService.getContentType());
        res.send(metrics);
    } catch (error) {
        logger.error('Error fetching metrics', { error: error.message });
        res.status(500).json({
            error: 'METRICS_FETCH_FAILED',
            message: 'Failed to fetch metrics'
        });
    }
});

/**
 * GET /api/v1/metrics/alerts/stats
 * Get alert manager statistics
 */
router.get('/alerts/stats', async (req, res) => {
    try {
        const stats = alertManager.getAlertStats();
        res.json(stats);
    } catch (error) {
        logger.error('Error fetching alert stats', { error: error.message });
        res.status(500).json({
            error: 'ALERT_STATS_FETCH_FAILED',
            message: 'Failed to fetch alert statistics'
        });
    }
});

/**
 * POST /api/v1/metrics/alerts/check-expiration
 * Manually trigger license expiration check
 */
router.post('/alerts/check-expiration', async (req, res) => {
    try {
        await alertManager.checkLicenseExpirationAlerts();
        res.json({
            success: true,
            message: 'License expiration check completed'
        });
    } catch (error) {
        logger.error('Error checking license expiration', { error: error.message });
        res.status(500).json({
            error: 'EXPIRATION_CHECK_FAILED',
            message: 'Failed to check license expiration'
        });
    }
});

export default router;
