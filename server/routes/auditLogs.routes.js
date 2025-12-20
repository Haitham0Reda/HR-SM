import express from 'express';
import auditLoggerService from '../services/auditLogger.service.js';
import { body, query, validationResult } from 'express-validator';

const router = express.Router();

/**
 * Query audit logs with filters
 * GET /api/v1/audit-logs
 */
router.get('/', [
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO date'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO date'),
  query('userId').optional().isMongoId().withMessage('User ID must be a valid MongoDB ObjectId'),
  query('action').optional().isString().withMessage('Action must be a string'),
  query('resource').optional().isString().withMessage('Resource must be a string'),
  query('category').optional().isIn([
    'authentication', 'authorization', 'data_modification', 'system_operation',
    'license_management', 'tenant_management', 'security', 'performance',
    'backup_recovery', 'module_management', 'audit', 'compliance'
  ]).withMessage('Invalid category'),
  query('severity').optional().isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid severity'),
  query('status').optional().isIn(['success', 'failure', 'warning', 'info']).withMessage('Invalid status'),
  query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be between 1 and 1000'),
  query('skip').optional().isInt({ min: 0 }).withMessage('Skip must be a non-negative integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      userId: req.query.userId,
      action: req.query.action,
      resource: req.query.resource,
      category: req.query.category,
      severity: req.query.severity,
      status: req.query.status,
      licenseNumber: req.query.licenseNumber,
      tenantId: req.query.tenantId,
      correlationId: req.query.correlationId,
      limit: parseInt(req.query.limit) || 100,
      skip: parseInt(req.query.skip) || 0
    };

    const auditLogs = await auditLoggerService.queryAuditLogs(filters);

    res.json({
      success: true,
      data: auditLogs,
      count: auditLogs.length,
      filters
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to query audit logs',
      error: error.message
    });
  }
});

/**
 * Get audit log statistics
 * GET /api/v1/audit-logs/statistics
 */
router.get('/statistics', [
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO date'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO date'),
  query('tenantId').optional().isString().withMessage('Tenant ID must be a string'),
  query('category').optional().isString().withMessage('Category must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      tenantId: req.query.tenantId,
      category: req.query.category
    };

    const statistics = await auditLoggerService.getAuditStatistics(filters);

    res.json({
      success: true,
      data: statistics,
      filters
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get audit statistics',
      error: error.message
    });
  }
});

/**
 * Get specific audit log by ID
 * GET /api/v1/audit-logs/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid audit log ID format'
      });
    }

    const AuditLog = (await import('../modules/hr-core/models/AuditLog.js')).default;
    const auditLog = await AuditLog.findById(id);

    if (!auditLog) {
      return res.status(404).json({
        success: false,
        message: 'Audit log not found'
      });
    }

    res.json({
      success: true,
      data: auditLog
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get audit log',
      error: error.message
    });
  }
});

/**
 * Verify audit log integrity
 * POST /api/v1/audit-logs/:id/verify
 */
router.post('/:id/verify', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid audit log ID format'
      });
    }

    const verificationResult = await auditLoggerService.verifyLogIntegrity(id);

    res.json({
      success: true,
      data: verificationResult
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to verify audit log integrity',
      error: error.message
    });
  }
});

/**
 * Create manual audit log entry
 * POST /api/v1/audit-logs
 */
router.post('/', [
  body('action').notEmpty().withMessage('Action is required'),
  body('resource').notEmpty().withMessage('Resource is required'),
  body('category').optional().isIn([
    'authentication', 'authorization', 'data_modification', 'system_operation',
    'license_management', 'tenant_management', 'security', 'performance',
    'backup_recovery', 'module_management', 'audit', 'compliance'
  ]).withMessage('Invalid category'),
  body('severity').optional().isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid severity'),
  body('status').optional().isIn(['success', 'failure', 'warning', 'info']).withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const auditData = {
      action: req.body.action,
      resource: req.body.resource,
      resourceId: req.body.resourceId,
      userId: req.body.userId || req.user?._id,
      category: req.body.category || 'data_modification',
      severity: req.body.severity || 'medium',
      status: req.body.status || 'success',
      errorMessage: req.body.errorMessage,
      errorCode: req.body.errorCode,
      module: req.body.module,
      changes: req.body.changes,
      licenseInfo: req.body.licenseInfo,
      tags: req.body.tags || [],
      correlationId: req.body.correlationId
    };

    const auditLog = await auditLoggerService.createAuditLog(auditData, req);

    res.status(201).json({
      success: true,
      data: auditLog,
      message: 'Audit log created successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create audit log',
      error: error.message
    });
  }
});

/**
 * Clean up old audit logs
 * DELETE /api/v1/audit-logs/cleanup
 */
router.delete('/cleanup', [
  body('daysToKeep').isInt({ min: 1, max: 3650 }).withMessage('Days to keep must be between 1 and 3650')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { daysToKeep } = req.body;
    const result = await auditLoggerService.cleanupOldLogs(daysToKeep);

    // Log the cleanup operation
    await auditLoggerService.createAuditLog({
      action: 'delete',
      resource: 'audit_logs',
      userId: req.user?._id,
      category: 'audit',
      severity: 'medium',
      changes: {
        after: {
          deletedCount: result.deletedCount,
          cutoffDate: result.cutoffDate,
          daysToKeep: result.daysToKeep
        }
      },
      tags: ['cleanup', 'maintenance']
    }, req);

    res.json({
      success: true,
      data: result,
      message: `Cleaned up ${result.deletedCount} old audit logs`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup audit logs',
      error: error.message
    });
  }
});

/**
 * Export audit logs
 * GET /api/v1/audit-logs/export
 */
router.get('/export', [
  query('format').optional().isIn(['json', 'csv']).withMessage('Format must be json or csv'),
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO date'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO date'),
  query('category').optional().isString().withMessage('Category must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const format = req.query.format || 'json';
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      category: req.query.category,
      limit: 10000 // Large limit for export
    };

    const auditLogs = await auditLoggerService.queryAuditLogs(filters);

    // Log the export operation
    await auditLoggerService.createAuditLog({
      action: 'export',
      resource: 'audit_logs',
      userId: req.user?._id,
      category: 'audit',
      severity: 'medium',
      changes: {
        after: {
          exportedCount: auditLogs.length,
          format,
          filters
        }
      },
      tags: ['export', 'compliance']
    }, req);

    if (format === 'csv') {
      // Convert to CSV format
      const csvHeader = 'ID,Timestamp,Action,Resource,User ID,Category,Severity,Status,IP Address,Correlation ID\n';
      const csvRows = auditLogs.map(log => 
        `${log._id},${log.createdAt},${log.action},${log.resource},${log.userId || ''},${log.category},${log.severity},${log.status},${log.ipAddress || ''},${log.correlationId || ''}`
      ).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvHeader + csvRows);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.json"`);
      res.json({
        success: true,
        exportedAt: new Date().toISOString(),
        count: auditLogs.length,
        filters,
        data: auditLogs
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to export audit logs',
      error: error.message
    });
  }
});

export default router;