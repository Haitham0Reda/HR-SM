// controller/licenseAudit.controller.js
import auditLoggerService from '../services/auditLogger.service.js';
import logger from '../utils/logger.js';

/**
 * Query audit logs with filters
 * GET /api/v1/licenses/audit
 */
export const queryAuditLogs = async (req, res) => {
    try {
        const {
            tenantId,
            moduleKey,
            eventType,
            severity,
            startDate,
            endDate,
            limit = 100,
            skip = 0
        } = req.query;

        // Validate limit and skip
        const parsedLimit = Math.min(parseInt(limit) || 100, 1000); // Max 1000 records
        const parsedSkip = parseInt(skip) || 0;

        // Build filters
        const filters = {
            limit: parsedLimit,
            skip: parsedSkip
        };

        if (tenantId) filters.tenantId = tenantId;
        if (moduleKey) filters.moduleKey = moduleKey;
        if (eventType) filters.eventType = eventType;
        if (severity) filters.severity = severity;
        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;

        // Query audit logs
        const logs = await auditLoggerService.queryLogs(filters);

        res.status(200).json({
            success: true,
            count: logs.length,
            filters,
            data: logs
        });
    } catch (error) {
        logger.error('Error querying audit logs', {
            error: error.message,
            stack: error.stack,
            query: req.query
        });

        res.status(500).json({
            success: false,
            error: 'AUDIT_QUERY_FAILED',
            message: 'Failed to query audit logs',
            details: error.message
        });
    }
};

/**
 * Get audit log statistics
 * GET /api/v1/licenses/audit/statistics
 */
export const getAuditStatistics = async (req, res) => {
    try {
        const { tenantId, startDate, endDate } = req.query;

        const statistics = await auditLoggerService.getStatistics(
            tenantId || null,
            startDate || null,
            endDate || null
        );

        res.status(200).json({
            success: true,
            data: statistics
        });
    } catch (error) {
        logger.error('Error getting audit statistics', {
            error: error.message,
            stack: error.stack,
            query: req.query
        });

        res.status(500).json({
            success: false,
            error: 'STATISTICS_FAILED',
            message: 'Failed to get audit statistics',
            details: error.message
        });
    }
};

/**
 * Get recent violations (high-priority events)
 * GET /api/v1/licenses/audit/violations
 */
export const getRecentViolations = async (req, res) => {
    try {
        const { tenantId, limit = 50 } = req.query;

        const parsedLimit = Math.min(parseInt(limit) || 50, 500); // Max 500 records

        const violations = await auditLoggerService.getRecentViolations(
            tenantId || null,
            parsedLimit
        );

        res.status(200).json({
            success: true,
            count: violations.length,
            data: violations
        });
    } catch (error) {
        logger.error('Error getting recent violations', {
            error: error.message,
            stack: error.stack,
            query: req.query
        });

        res.status(500).json({
            success: false,
            error: 'VIOLATIONS_QUERY_FAILED',
            message: 'Failed to get recent violations',
            details: error.message
        });
    }
};

/**
 * Get audit trail for a specific module
 * GET /api/v1/licenses/audit/module/:moduleKey
 */
export const getModuleAuditTrail = async (req, res) => {
    try {
        const { moduleKey } = req.params;
        const { tenantId, days = 30 } = req.query;

        if (!tenantId) {
            return res.status(400).json({
                success: false,
                error: 'MISSING_TENANT_ID',
                message: 'Tenant ID is required'
            });
        }

        const parsedDays = Math.min(parseInt(days) || 30, 365); // Max 365 days

        const auditTrail = await auditLoggerService.getModuleAuditTrail(
            tenantId,
            moduleKey,
            parsedDays
        );

        res.status(200).json({
            success: true,
            moduleKey,
            tenantId,
            days: parsedDays,
            count: auditTrail.length,
            data: auditTrail
        });
    } catch (error) {
        logger.error('Error getting module audit trail', {
            error: error.message,
            stack: error.stack,
            params: req.params,
            query: req.query
        });

        res.status(500).json({
            success: false,
            error: 'AUDIT_TRAIL_FAILED',
            message: 'Failed to get module audit trail',
            details: error.message
        });
    }
};

/**
 * Get available event types and severity levels
 * GET /api/v1/licenses/audit/metadata
 */
export const getAuditMetadata = async (req, res) => {
    try {
        const eventTypes = auditLoggerService.getEventTypes();
        const severityLevels = auditLoggerService.getSeverityLevels();

        res.status(200).json({
            success: true,
            data: {
                eventTypes,
                severityLevels
            }
        });
    } catch (error) {
        logger.error('Error getting audit metadata', {
            error: error.message,
            stack: error.stack
        });

        res.status(500).json({
            success: false,
            error: 'METADATA_FAILED',
            message: 'Failed to get audit metadata',
            details: error.message
        });
    }
};

/**
 * Create a manual audit log entry (admin only)
 * POST /api/v1/licenses/audit
 */
export const createAuditLog = async (req, res) => {
    try {
        const {
            tenantId,
            moduleKey,
            eventType,
            details = {},
            severity = 'info'
        } = req.body;

        // Validate required fields
        if (!tenantId || !moduleKey || !eventType) {
            return res.status(400).json({
                success: false,
                error: 'MISSING_REQUIRED_FIELDS',
                message: 'tenantId, moduleKey, and eventType are required'
            });
        }

        // Create audit log
        const auditLog = await auditLoggerService.createLog({
            tenantId,
            moduleKey,
            eventType,
            details: {
                ...details,
                userId: req.user?.id,
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
                manualEntry: true
            },
            severity
        });

        res.status(201).json({
            success: true,
            data: auditLog
        });
    } catch (error) {
        logger.error('Error creating audit log', {
            error: error.message,
            stack: error.stack,
            body: req.body
        });

        res.status(500).json({
            success: false,
            error: 'AUDIT_CREATION_FAILED',
            message: 'Failed to create audit log',
            details: error.message
        });
    }
};

/**
 * Clean up old audit logs (admin only)
 * DELETE /api/v1/licenses/audit/cleanup
 */
export const cleanupOldLogs = async (req, res) => {
    try {
        const { daysToKeep = 365 } = req.query;

        const parsedDays = parseInt(daysToKeep) || 365;

        const result = await auditLoggerService.cleanupOldLogs(parsedDays);

        res.status(200).json({
            success: true,
            message: 'Old audit logs cleaned up successfully',
            data: result
        });
    } catch (error) {
        logger.error('Error cleaning up old audit logs', {
            error: error.message,
            stack: error.stack,
            query: req.query
        });

        res.status(500).json({
            success: false,
            error: 'CLEANUP_FAILED',
            message: 'Failed to cleanup old audit logs',
            details: error.message
        });
    }
};
