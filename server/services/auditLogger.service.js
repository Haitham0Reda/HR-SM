import AuditLog from '../modules/hr-core/models/AuditLog.js';
import winston from 'winston';
import crypto from 'crypto';
import os from 'os';

/**
 * Enhanced Audit Logger Service
 * Provides comprehensive audit logging with license operations tracking
 */
class AuditLoggerService {
  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'audit-logger' },
      transports: [
        new winston.transports.File({ 
          filename: 'logs/audit-error.log', 
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5
        }),
        new winston.transports.File({ 
          filename: 'logs/audit-combined.log',
          maxsize: 5242880, // 5MB
          maxFiles: 10
        })
      ]
    });

    // Add console transport in development
    if (process.env.NODE_ENV !== 'production') {
      this.logger.add(new winston.transports.Console({
        format: winston.format.simple()
      }));
    }

    this.systemInfo = {
      hostname: os.hostname(),
      service: 'hr-sm-backend',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };
  }

  /**
   * Generate a correlation ID for tracking related events
   * @returns {string} Correlation ID
   */
  generateCorrelationId() {
    return `audit_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  /**
   * Extract request information from Express request object
   * @param {Object} req - Express request object
   * @returns {Object} Request information
   */
  extractRequestInfo(req) {
    if (!req) return {};

    return {
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('User-Agent'),
      requestId: req.id || req.headers['x-request-id'],
      sessionId: req.sessionID || req.session?.id,
      method: req.method,
      url: req.originalUrl || req.url,
      referer: req.get('Referer')
    };
  }

  /**
   * Create a comprehensive audit log entry
   * @param {Object} logData - Audit log data
   * @param {Object} req - Express request object (optional)
   * @returns {Promise<Object>} Created audit log
   */
  async createAuditLog(logData, req = null) {
    try {
      const requestInfo = this.extractRequestInfo(req);
      const startTime = Date.now();

      const auditLogData = {
        action: logData.action,
        resource: logData.resource,
        resourceId: logData.resourceId,
        userId: logData.userId,
        tenantId: logData.tenantId, // Add tenantId field for baseSchemaPlugin
        changes: logData.changes,
        category: logData.category || 'data_modification',
        severity: logData.severity || 'medium',
        status: logData.status || 'success',
        errorMessage: logData.errorMessage,
        errorCode: logData.errorCode,
        module: logData.module,
        
        // Request information
        ipAddress: requestInfo.ipAddress,
        userAgent: requestInfo.userAgent,
        requestId: requestInfo.requestId,
        sessionId: requestInfo.sessionId,
        
        // License information (if applicable)
        licenseInfo: logData.licenseInfo,
        
        // System information
        systemInfo: {
          ...this.systemInfo,
          ...logData.systemInfo
        },
        
        // Performance metrics
        performance: {
          duration: Date.now() - startTime,
          ...logData.performance
        },
        
        // Compliance and metadata
        retentionPolicy: logData.retentionPolicy || 'standard',
        complianceFlags: logData.complianceFlags || {},
        tags: logData.tags || [],
        correlationId: logData.correlationId || this.generateCorrelationId(),
        parentEventId: logData.parentEventId
      };

      // Create the audit log in database
      const auditLog = await AuditLog.createAuditLog(auditLogData);

      // Also log to Winston for additional persistence
      this.logger.info('Audit log created', {
        auditLogId: auditLog._id,
        action: auditLog.action,
        resource: auditLog.resource,
        userId: auditLog.userId,
        category: auditLog.category,
        severity: auditLog.severity,
        correlationId: auditLog.correlationId,
        timestamp: auditLog.createdAt
      });

      return auditLog;
    } catch (error) {
      this.logger.error('Failed to create audit log', {
        error: error.message,
        stack: error.stack,
        logData
      });
      throw error;
    }
  }

  /**
   * Log license creation event
   * @param {Object} licenseData - License information
   * @param {Object} req - Express request object
   * @returns {Promise<Object>} Audit log entry
   */
  async logLicenseCreation(licenseData, req = null) {
    return await this.createAuditLog({
      action: 'license_create',
      resource: 'license',
      resourceId: licenseData.licenseId,
      userId: licenseData.createdBy,
      category: 'license_management',
      severity: 'high',
      licenseInfo: {
        licenseNumber: licenseData.licenseNumber,
        tenantId: licenseData.tenantId,
        licenseType: licenseData.type,
        expiresAt: licenseData.expiresAt
      },
      changes: {
        after: {
          licenseNumber: licenseData.licenseNumber,
          tenantId: licenseData.tenantId,
          type: licenseData.type,
          features: licenseData.features,
          expiresAt: licenseData.expiresAt
        }
      },
      tags: ['license', 'creation', 'security'],
      complianceFlags: { sox: true }
    }, req);
  }

  /**
   * Log license validation event
   * @param {Object} validationData - Validation information
   * @param {Object} req - Express request object
   * @returns {Promise<Object>} Audit log entry
   */
  async logLicenseValidation(validationData, req = null) {
    return await this.createAuditLog({
      action: 'license_validate',
      resource: 'license',
      resourceId: validationData.licenseId,
      category: 'license_management',
      severity: validationData.valid ? 'low' : 'high',
      status: validationData.valid ? 'success' : 'failure',
      errorMessage: validationData.error,
      licenseInfo: {
        licenseNumber: validationData.licenseNumber,
        tenantId: validationData.tenantId,
        licenseType: validationData.licenseType,
        machineId: validationData.machineId,
        validationResult: validationData.valid ? 'valid' : 'invalid'
      },
      performance: {
        duration: validationData.duration
      },
      tags: ['license', 'validation', validationData.valid ? 'success' : 'failure']
    }, req);
  }

  /**
   * Log license renewal event
   * @param {Object} renewalData - Renewal information
   * @param {Object} req - Express request object
   * @returns {Promise<Object>} Audit log entry
   */
  async logLicenseRenewal(renewalData, req = null) {
    return await this.createAuditLog({
      action: 'license_renew',
      resource: 'license',
      resourceId: renewalData.licenseId,
      userId: renewalData.renewedBy,
      category: 'license_management',
      severity: 'medium',
      licenseInfo: {
        licenseNumber: renewalData.licenseNumber,
        tenantId: renewalData.tenantId,
        licenseType: renewalData.licenseType,
        expiresAt: renewalData.newExpiresAt
      },
      changes: {
        before: { expiresAt: renewalData.oldExpiresAt },
        after: { expiresAt: renewalData.newExpiresAt },
        fields: ['expiresAt']
      },
      tags: ['license', 'renewal'],
      complianceFlags: { sox: true }
    }, req);
  }

  /**
   * Log license revocation event
   * @param {Object} revocationData - Revocation information
   * @param {Object} req - Express request object
   * @returns {Promise<Object>} Audit log entry
   */
  async logLicenseRevocation(revocationData, req = null) {
    return await this.createAuditLog({
      action: 'license_revoke',
      resource: 'license',
      resourceId: revocationData.licenseId,
      userId: revocationData.revokedBy,
      category: 'license_management',
      severity: 'critical',
      licenseInfo: {
        licenseNumber: revocationData.licenseNumber,
        tenantId: revocationData.tenantId,
        licenseType: revocationData.licenseType
      },
      changes: {
        before: { status: 'active' },
        after: { status: 'revoked', reason: revocationData.reason },
        fields: ['status', 'revokedAt', 'revocationReason']
      },
      tags: ['license', 'revocation', 'security'],
      complianceFlags: { sox: true, gdpr: true }
    }, req);
  }

  /**
   * Log system health check event
   * @param {Object} healthData - Health check information
   * @returns {Promise<Object>} Audit log entry
   */
  async logSystemHealthCheck(healthData) {
    return await this.createAuditLog({
      action: 'system_health_check',
      resource: 'system',
      category: 'system_operation',
      severity: healthData.status === 'healthy' ? 'low' : 'high',
      status: healthData.status === 'healthy' ? 'success' : 'warning',
      changes: {
        after: {
          healthScore: healthData.healthScore,
          status: healthData.status,
          alerts: healthData.alerts?.length || 0
        }
      },
      performance: {
        cpuUsage: healthData.metrics?.cpu?.usage,
        memoryUsage: healthData.metrics?.memory?.system?.percentage
      },
      tags: ['system', 'health', 'monitoring']
    });
  }

  /**
   * Log security event
   * @param {Object} securityData - Security event information
   * @param {Object} req - Express request object
   * @returns {Promise<Object>} Audit log entry
   */
  async logSecurityEvent(securityData, req = null) {
    return await this.createAuditLog({
      action: 'security_event',
      resource: securityData.resource || 'system',
      resourceId: securityData.resourceId,
      userId: securityData.userId,
      category: 'security',
      severity: securityData.severity || 'high',
      status: securityData.status || 'warning',
      errorMessage: securityData.message,
      errorCode: securityData.code,
      changes: securityData.details,
      tags: ['security', 'threat', securityData.type || 'unknown'],
      complianceFlags: { sox: true, gdpr: true },
      retentionPolicy: 'extended'
    }, req);
  }

  /**
   * Log tenant management event
   * @param {Object} tenantData - Tenant management information
   * @param {Object} req - Express request object
   * @returns {Promise<Object>} Audit log entry
   */
  async logTenantManagement(tenantData, req = null) {
    return await this.createAuditLog({
      action: tenantData.action, // tenant_create, tenant_suspend, etc.
      resource: 'tenant',
      resourceId: tenantData.tenantId,
      userId: tenantData.performedBy,
      category: 'tenant_management',
      severity: 'medium',
      changes: tenantData.changes,
      licenseInfo: tenantData.licenseInfo,
      tags: ['tenant', 'management', tenantData.action.split('_')[1]],
      complianceFlags: { gdpr: true }
    }, req);
  }

  /**
   * Log module management event
   * @param {Object} moduleData - Module management information
   * @param {Object} req - Express request object
   * @returns {Promise<Object>} Audit log entry
   */
  async logModuleManagement(moduleData, req = null) {
    return await this.createAuditLog({
      action: moduleData.action, // module_enable, module_disable
      resource: 'module',
      resourceId: moduleData.moduleId,
      userId: moduleData.performedBy,
      category: 'module_management',
      severity: 'medium',
      module: moduleData.moduleName,
      changes: {
        before: { enabled: moduleData.previousState },
        after: { enabled: moduleData.newState },
        fields: ['enabled']
      },
      licenseInfo: {
        tenantId: moduleData.tenantId,
        licenseNumber: moduleData.licenseNumber
      },
      tags: ['module', moduleData.action.split('_')[1], moduleData.moduleName]
    }, req);
  }

  /**
   * Query audit logs with filters
   * @param {Object} filters - Query filters
   * @returns {Promise<Array>} Audit logs
   */
  async queryAuditLogs(filters = {}) {
    try {
      return await AuditLog.queryAuditLogs(filters);
    } catch (error) {
      this.logger.error('Failed to query audit logs', {
        error: error.message,
        filters
      });
      throw error;
    }
  }

  /**
   * Get audit statistics
   * @param {Object} filters - Query filters
   * @returns {Promise<Object>} Audit statistics
   */
  async getAuditStatistics(filters = {}) {
    try {
      const pipeline = [];
      
      // Match stage
      const matchStage = {};
      if (filters.startDate || filters.endDate) {
        matchStage.createdAt = {};
        if (filters.startDate) matchStage.createdAt.$gte = new Date(filters.startDate);
        if (filters.endDate) matchStage.createdAt.$lte = new Date(filters.endDate);
      }
      if (filters.tenantId) matchStage['licenseInfo.tenantId'] = filters.tenantId;
      if (filters.category) matchStage.category = filters.category;
      
      if (Object.keys(matchStage).length > 0) {
        pipeline.push({ $match: matchStage });
      }

      // Group and count
      pipeline.push({
        $group: {
          _id: null,
          total: { $sum: 1 },
          byAction: { $push: '$action' },
          byCategory: { $push: '$category' },
          bySeverity: { $push: '$severity' },
          byStatus: { $push: '$status' },
          licenseEvents: {
            $sum: {
              $cond: [{ $regexMatch: { input: '$action', regex: /^license_/ } }, 1, 0]
            }
          },
          securityEvents: {
            $sum: {
              $cond: [{ $eq: ['$category', 'security'] }, 1, 0]
            }
          },
          systemEvents: {
            $sum: {
              $cond: [{ $eq: ['$category', 'system_operation'] }, 1, 0]
            }
          },
          criticalEvents: {
            $sum: {
              $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0]
            }
          },
          failedEvents: {
            $sum: {
              $cond: [{ $eq: ['$status', 'failure'] }, 1, 0]
            }
          }
        }
      });

      const result = await AuditLog.aggregate(pipeline);
      const stats = result[0] || {
        total: 0,
        byAction: [],
        byCategory: [],
        bySeverity: [],
        byStatus: [],
        licenseEvents: 0,
        securityEvents: 0,
        systemEvents: 0,
        criticalEvents: 0,
        failedEvents: 0
      };

      // Count occurrences
      const countOccurrences = (arr) => {
        return arr.reduce((acc, item) => {
          acc[item] = (acc[item] || 0) + 1;
          return acc;
        }, {});
      };

      return {
        total: stats.total,
        byAction: countOccurrences(stats.byAction),
        byCategory: countOccurrences(stats.byCategory),
        bySeverity: countOccurrences(stats.bySeverity),
        byStatus: countOccurrences(stats.byStatus),
        licenseEvents: stats.licenseEvents,
        securityEvents: stats.securityEvents,
        systemEvents: stats.systemEvents,
        criticalEvents: stats.criticalEvents,
        failedEvents: stats.failedEvents
      };
    } catch (error) {
      this.logger.error('Failed to get audit statistics', {
        error: error.message,
        filters
      });
      throw error;
    }
  }

  /**
   * Clean up old audit logs based on retention policy
   * @param {number} daysToKeep - Number of days to keep logs
   * @returns {Promise<Object>} Cleanup result
   */
  async cleanupOldLogs(daysToKeep = 365) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      // Don't delete logs with extended or permanent retention
      const result = await AuditLog.deleteMany({
        createdAt: { $lt: cutoffDate },
        retentionPolicy: 'standard'
      });

      this.logger.info('Audit log cleanup completed', {
        deletedCount: result.deletedCount,
        cutoffDate,
        daysToKeep
      });

      return {
        deletedCount: result.deletedCount,
        cutoffDate,
        daysToKeep
      };
    } catch (error) {
      this.logger.error('Failed to cleanup old audit logs', {
        error: error.message,
        daysToKeep
      });
      throw error;
    }
  }

  /**
   * Verify audit log integrity
   * @param {string} auditLogId - Audit log ID to verify
   * @returns {Promise<Object>} Verification result
   */
  async verifyLogIntegrity(auditLogId) {
    try {
      const auditLog = await AuditLog.findById(auditLogId);
      if (!auditLog) {
        throw new Error('Audit log not found');
      }

      // Recalculate hash
      const dataToHash = JSON.stringify({
        action: auditLog.action,
        resource: auditLog.resource,
        resourceId: auditLog.resourceId,
        userId: auditLog.userId,
        changes: auditLog.changes,
        timestamp: auditLog.createdAt
      });
      
      const calculatedHash = crypto.createHash('sha256').update(dataToHash).digest('hex');
      const isValid = calculatedHash === auditLog.hash;

      return {
        auditLogId,
        isValid,
        storedHash: auditLog.hash,
        calculatedHash,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Failed to verify audit log integrity', {
        error: error.message,
        auditLogId
      });
      throw error;
    }
  }
}

export default new AuditLoggerService();