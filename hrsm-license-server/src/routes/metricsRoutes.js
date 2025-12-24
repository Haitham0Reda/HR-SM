// License Server Metrics Routes
import express from 'express';
import metricsService from '../services/metricsService.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * GET /metrics
 * Expose Prometheus metrics for license server
 */
router.get('/', async (req, res) => {
    try {
        const metrics = await metricsService.getMetrics();
        res.set('Content-Type', metricsService.getContentType());
        res.send(metrics);
    } catch (error) {
        logger.error('Error fetching license server metrics', { 
            error: error.message,
            stack: error.stack 
        });
        res.status(500).json({
            error: 'METRICS_FETCH_FAILED',
            message: 'Failed to fetch license server metrics'
        });
    }
});

/**
 * GET /metrics/health
 * Get license server specific health metrics
 */
router.get('/health', async (req, res) => {
    try {
        // Get basic health information
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            cpu: process.cpuUsage()
        };

        res.json(health);
    } catch (error) {
        logger.error('Error fetching license server health metrics', { 
            error: error.message 
        });
        res.status(500).json({
            error: 'HEALTH_METRICS_FETCH_FAILED',
            message: 'Failed to fetch license server health metrics'
        });
    }
});

export default router;