import express from 'express';

const router = express.Router();

// Middleware to bypass validation for logs endpoint
const bypassValidationForLogs = (req, res, next) => {
    // Mark this request to bypass certain validations
    req.skipValidation = true;
    req.isLogsEndpoint = true;
    next();
};

/**
 * Health check for logs endpoint
 * @route GET /api/v1/logs/health
 * @access Public
 */
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Logs endpoint is healthy',
        timestamp: new Date().toISOString()
    });
});

/**
 * Get logs endpoint
 * @route GET /api/v1/logs
 * @access Protected
 */
router.get('/', async (req, res) => {
    try {
        const { level, startDate, endDate, limit = 100 } = req.query;
        
        // Mock logs data
        const logs = [
            {
                id: 1,
                timestamp: new Date(),
                level: 'info',
                message: 'User login successful',
                source: 'auth.controller',
                userId: 'user123',
                metadata: { ip: '192.168.1.1' }
            },
            {
                id: 2,
                timestamp: new Date(Date.now() - 60000),
                level: 'error',
                message: 'Database connection failed',
                source: 'database.service',
                error: 'Connection timeout',
                metadata: { retries: 3 }
            },
            {
                id: 3,
                timestamp: new Date(Date.now() - 120000),
                level: 'warn',
                message: 'High memory usage detected',
                source: 'monitoring.service',
                metadata: { usage: '85%' }
            }
        ];

        // Apply filters
        let filteredLogs = logs;
        if (level) {
            filteredLogs = filteredLogs.filter(log => log.level === level);
        }

        res.json({
            success: true,
            data: filteredLogs.slice(0, parseInt(limit)),
            total: filteredLogs.length,
            message: 'Logs retrieved successfully'
        });
        
    } catch (error) {
        console.error('Error retrieving logs:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve logs'
        });
    }
});

/**
 * Frontend logging endpoint
 * @route POST /api/v1/logs
 * @access Public (for frontend error logging)
 */
router.post('/', async (req, res) => {
    try {
        // Add more detailed logging for debugging
        console.log('📥 Logs endpoint called (bypassing validation)');
        console.log('📥 Content-Type:', req.get('Content-Type'));
        console.log('📥 Body type:', typeof req.body);
        console.log('📥 Body keys:', req.body ? Object.keys(req.body) : 'no body');
        
        const { logs, batchId, timestamp } = req.body || {};
        
        // Validate required fields
        if (!logs || !Array.isArray(logs)) {
            console.log('❌ Invalid logs format:', { logs: typeof logs, isArray: Array.isArray(logs) });
            return res.status(400).json({
                success: false,
                error: 'Invalid logs format - logs must be an array'
            });
        }
        
        // For now, just log to console in development
        if (process.env.NODE_ENV === 'development') {
            console.log('Frontend logs received:', {
                batchId,
                timestamp,
                count: logs?.length || 0,
                logs: logs?.slice(0, 3) // Only log first 3 for brevity
            });
        }
        
        // In production, you might want to store these logs properly
        // For now, just acknowledge receipt
        res.json({
            success: true,
            message: 'Logs received',
            batchId,
            processed: logs?.length || 0
        });
        
    } catch (error) {
        console.error('Error processing frontend logs:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process logs'
        });
    }
});

export default router;