/**
 * Company Logs API Routes
 * Provides endpoints for managing company-specific logs
 */

import express from 'express';
import companyLogService from '../services/companyLogService.js';
import { getLoggerForTenant } from '../utils/companyLogger.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

/**
 * GET /api/v1/platform/company-logs/stats
 * Get log statistics for all companies (admin only)
 */
router.get('/stats', admin, async (req, res) => {
    try {
        const stats = await companyLogService.getAllCompanyLogStats();
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * GET /api/v1/platform/company-logs/:tenantId/files
 * Get log files for a specific company
 */
router.get('/:tenantId/files', async (req, res) => {
    try {
        const { tenantId } = req.params;
        
        // Check if user has access to this tenant's logs
        if (req.user.role !== 'admin' && req.user.tenantId !== tenantId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied to this company\'s logs'
            });
        }

        const files = await companyLogService.getCompanyLogFiles(tenantId);
        res.json({
            success: true,
            data: files
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * GET /api/v1/platform/company-logs/:tenantId/files/:fileName
 * Read content of a specific log file
 */
router.get('/:tenantId/files/:fileName', async (req, res) => {
    try {
        const { tenantId, fileName } = req.params;
        const { lines = 100, offset = 0, search } = req.query;
        
        // Check if user has access to this tenant's logs
        if (req.user.role !== 'admin' && req.user.tenantId !== tenantId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied to this company\'s logs'
            });
        }

        const content = await companyLogService.readLogFile(tenantId, fileName, {
            lines: parseInt(lines),
            offset: parseInt(offset),
            search
        });

        res.json({
            success: true,
            data: content
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * GET /api/v1/platform/company-logs/:tenantId/summary
 * Get log summary for a company
 */
router.get('/:tenantId/summary', async (req, res) => {
    try {
        const { tenantId } = req.params;
        const { days = 7 } = req.query;
        
        // Check if user has access to this tenant's logs
        if (req.user.role !== 'admin' && req.user.tenantId !== tenantId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied to this company\'s logs'
            });
        }

        const summary = await companyLogService.getCompanyLogSummary(tenantId, parseInt(days));
        res.json({
            success: true,
            data: summary
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * POST /api/v1/platform/company-logs/:tenantId/search
 * Search through company logs
 */
router.post('/:tenantId/search', async (req, res) => {
    try {
        const { tenantId } = req.params;
        const { searchTerm, logType, dateFrom, dateTo, maxResults = 1000 } = req.body;
        
        // Check if user has access to this tenant's logs
        if (req.user.role !== 'admin' && req.user.tenantId !== tenantId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied to this company\'s logs'
            });
        }

        if (!searchTerm) {
            return res.status(400).json({
                success: false,
                message: 'Search term is required'
            });
        }

        const results = await companyLogService.searchCompanyLogs(tenantId, searchTerm, {
            logType,
            dateFrom,
            dateTo,
            maxResults: parseInt(maxResults)
        });

        res.json({
            success: true,
            data: results
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * POST /api/v1/platform/company-logs/:tenantId/archive
 * Archive company logs
 */
router.post('/:tenantId/archive', admin, async (req, res) => {
    try {
        const { tenantId } = req.params;
        
        // Check if user has access to manage this tenant's logs
        if (req.user.role !== 'admin' && req.user.tenantId !== tenantId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied to manage this company\'s logs'
            });
        }

        const result = await companyLogService.archiveCompanyLogs(tenantId);
        
        // Log the archive action
        const logger = getLoggerForTenant(tenantId);
        logger.audit('Logs archived', {
            archivedBy: req.user.email,
            archivePath: result.archivePath,
            archiveSize: result.sizeMB + 'MB'
        });

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * DELETE /api/v1/platform/company-logs/:tenantId/cleanup
 * Clean up old log files
 */
router.delete('/:tenantId/cleanup', admin, async (req, res) => {
    try {
        const { tenantId } = req.params;
        const { daysToKeep = 30, keepAuditLogs = true } = req.body;
        
        // Check if user has access to manage this tenant's logs
        if (req.user.role !== 'admin' && req.user.tenantId !== tenantId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied to manage this company\'s logs'
            });
        }

        const result = await companyLogService.cleanupCompanyLogs(
            tenantId, 
            parseInt(daysToKeep), 
            keepAuditLogs
        );
        
        // Log the cleanup action
        const logger = getLoggerForTenant(tenantId);
        logger.audit('Log cleanup performed', {
            cleanedBy: req.user.email,
            daysToKeep: parseInt(daysToKeep),
            keepAuditLogs,
            deletedFiles: result.deletedFiles
        });

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * GET /api/v1/platform/company-logs/:tenantId/routing-analytics
 * Get routing analytics for a company
 */
router.get('/:tenantId/routing-analytics', async (req, res) => {
    try {
        const { tenantId } = req.params;
        const { days = 30 } = req.query;
        
        // Check if user has access to this tenant's logs
        if (req.user.role !== 'admin' && req.user.tenantId !== tenantId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied to this company\'s analytics'
            });
        }

        const analytics = await companyLogService.getCompanyRoutingAnalytics(tenantId, parseInt(days));
        res.json({
            success: true,
            data: analytics
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * GET /api/v1/platform/company-logs/:tenantId/feature-usage
 * Get feature usage report for a company
 */
router.get('/:tenantId/feature-usage', async (req, res) => {
    try {
        const { tenantId } = req.params;
        const { days = 7 } = req.query;
        
        // Check if user has access to this tenant's logs
        if (req.user.role !== 'admin' && req.user.tenantId !== tenantId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied to this company\'s feature usage'
            });
        }

        const featureUsage = await companyLogService.getCompanyFeatureUsage(tenantId, parseInt(days));
        res.json({
            success: true,
            data: featureUsage
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * GET /api/v1/platform/company-logs/:tenantId/user-activities
 * Get detailed user activity tracking for a company
 */
router.get('/:tenantId/user-activities', async (req, res) => {
    try {
        const { tenantId } = req.params;
        const { 
            userId = null, 
            days = 7, 
            activityType = null, 
            includeRealTime = true,
            limit = 1000 
        } = req.query;
        
        // Check if user has access to this tenant's logs
        if (req.user.role !== 'admin' && req.user.tenantId !== tenantId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied to this company\'s user activities'
            });
        }

        const userActivities = await companyLogService.getUserActivityTracking(tenantId, {
            userId,
            days: parseInt(days),
            activityType,
            includeRealTime: includeRealTime === 'true',
            limit: parseInt(limit)
        });

        res.json({
            success: true,
            data: userActivities
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * GET /api/v1/platform/company-logs/:tenantId/real-time-sessions
 * Get real-time user sessions for a company
 */
router.get('/:tenantId/real-time-sessions', async (req, res) => {
    try {
        const { tenantId } = req.params;
        
        // Check if user has access to this tenant's logs
        if (req.user.role !== 'admin' && req.user.tenantId !== tenantId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied to this company\'s real-time sessions'
            });
        }

        const realTimeSessions = await companyLogService.getRealTimeUserSessions(tenantId);
        res.json({
            success: true,
            data: realTimeSessions
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * GET /api/v1/platform/company-logs/:tenantId/user-timeline/:userId
 * Get activity timeline for a specific user
 */
router.get('/:tenantId/user-timeline/:userId', async (req, res) => {
    try {
        const { tenantId, userId } = req.params;
        const { days = 1 } = req.query;
        
        // Check if user has access to this tenant's logs
        if (req.user.role !== 'admin' && req.user.tenantId !== tenantId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied to this company\'s user timeline'
            });
        }

        const timeline = await companyLogService.getUserActivityTimeline(tenantId, userId, parseInt(days));
        res.json({
            success: true,
            data: timeline
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * POST /api/v1/platform/company-logs/:tenantId/test
 * Test logging for a company (development/testing endpoint)
 */
router.post('/:tenantId/test', admin, async (req, res) => {
    try {
        const { tenantId } = req.params;
        const { level = 'info', message = 'Test log message', metadata = {} } = req.body;
        
        // Check if user has access to this tenant
        if (req.user.role !== 'admin' && req.user.tenantId !== tenantId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied to test logging for this company'
            });
        }

        const logger = getLoggerForTenant(tenantId);
        
        // Log based on specified level
        switch (level) {
            case 'error':
                logger.error(message, { ...metadata, testLog: true, testedBy: req.user.email });
                break;
            case 'warn':
                logger.warn(message, { ...metadata, testLog: true, testedBy: req.user.email });
                break;
            case 'audit':
                logger.audit(message, { ...metadata, testLog: true, testedBy: req.user.email });
                break;
            case 'security':
                logger.security(message, { ...metadata, testLog: true, testedBy: req.user.email });
                break;
            default:
                logger.info(message, { ...metadata, testLog: true, testedBy: req.user.email });
        }

        res.json({
            success: true,
            message: 'Test log created successfully',
            data: {
                level,
                message,
                tenantId,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

export default router;