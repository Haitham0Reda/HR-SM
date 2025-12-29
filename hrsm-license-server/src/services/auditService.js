import logger from '../utils/logger.js';
import mongoose from 'mongoose';

// Audit log schema for license operations
const auditLogSchema = new mongoose.Schema({
  operation: {
    type: String,
    required: true,
    enum: ['create', 'validate', 'renew', 'revoke', 'suspend', 'reactivate', 'activate', 'usage_update']
  },
  licenseNumber: {
    type: String,
    required: true
  },
  tenantId: {
    type: String,
    required: true
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  result: {
    type: String,
    enum: ['success', 'failure', 'warning'],
    required: true
  },
  errorMessage: String,
  metadata: {
    userAgent: String,
    ipAddress: String,
    machineId: String,
    requestId: String
  },
  performedBy: {
    type: String,
    default: 'system'
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient querying
auditLogSchema.index({ licenseNumber: 1, timestamp: -1 });
auditLogSchema.index({ tenantId: 1, timestamp: -1 });
auditLogSchema.index({ operation: 1, timestamp: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema, 'license_audit_logs');

class AuditService {
  /**
   * Log license operation for audit trail
   * @param {string} operation - Type of operation (create, validate, renew, etc.)
   * @param {string} licenseNumber - License number
   * @param {string} tenantId - Tenant ID
   * @param {string} result - Operation result (success, failure, warning)
   * @param {Object} details - Additional operation details
   * @param {Object} metadata - Request metadata (IP, user agent, etc.)
   * @param {string} performedBy - Who performed the operation
   * @param {string} errorMessage - Error message if operation failed
   */
  async logOperation(operation, licenseNumber, tenantId, result, details = {}, metadata = {}, performedBy = 'system', errorMessage = null) {
    try {
      // Create audit log entry
      const auditEntry = new AuditLog({
        operation,
        licenseNumber,
        tenantId,
        result,
        details,
        metadata,
        performedBy,
        errorMessage
      });

      // Save to database
      await auditEntry.save();

      // Also log to Winston for immediate visibility
      const logLevel = result === 'failure' ? 'error' : result === 'warning' ? 'warn' : 'info';
      logger[logLevel]('License operation audit', {
        operation,
        licenseNumber,
        tenantId,
        result,
        details,
        metadata,
        performedBy,
        errorMessage
      });

    } catch (error) {
      // If audit logging fails, at least log to Winston
      logger.error('Failed to create audit log entry', {
        operation,
        licenseNumber,
        tenantId,
        result,
        error: error.message
      });
    }
  }

  /**
   * Log license creation
   */
  async logLicenseCreation(licenseNumber, tenantId, licenseData, performedBy = 'system') {
    await this.logOperation(
      'create',
      licenseNumber,
      tenantId,
      'success',
      {
        type: licenseData.type,
        features: licenseData.features,
        expiresAt: licenseData.expiresAt,
        maxActivations: licenseData.maxActivations
      },
      {},
      performedBy
    );
  }

  /**
   * Log license validation
   */
  async logLicenseValidation(licenseNumber, tenantId, validationResult, metadata = {}) {
    const result = validationResult.valid ? 'success' : 'failure';
    await this.logOperation(
      'validate',
      licenseNumber,
      tenantId,
      result,
      {
        valid: validationResult.valid,
        code: validationResult.code,
        machineId: metadata.machineId,
        domain: metadata.domain
      },
      metadata,
      'system',
      validationResult.error
    );
  }

  /**
   * Log license renewal
   */
  async logLicenseRenewal(licenseNumber, tenantId, oldExpiryDate, newExpiryDate, performedBy = 'system') {
    await this.logOperation(
      'renew',
      licenseNumber,
      tenantId,
      'success',
      {
        oldExpiryDate,
        newExpiryDate,
        extensionDays: Math.ceil((new Date(newExpiryDate) - new Date(oldExpiryDate)) / (1000 * 60 * 60 * 24))
      },
      {},
      performedBy
    );
  }

  /**
   * Log license revocation
   */
  async logLicenseRevocation(licenseNumber, tenantId, reason, performedBy = 'system') {
    await this.logOperation(
      'revoke',
      licenseNumber,
      tenantId,
      'success',
      { reason },
      {},
      performedBy
    );
  }

  /**
   * Log license suspension
   */
  async logLicenseSuspension(licenseNumber, tenantId, reason, performedBy = 'system') {
    await this.logOperation(
      'suspend',
      licenseNumber,
      tenantId,
      'success',
      { reason },
      {},
      performedBy
    );
  }

  /**
   * Log license reactivation
   */
  async logLicenseReactivation(licenseNumber, tenantId, performedBy = 'system') {
    await this.logOperation(
      'reactivate',
      licenseNumber,
      tenantId,
      'success',
      {},
      {},
      performedBy
    );
  }

  /**
   * Log license activation (machine binding)
   */
  async logLicenseActivation(licenseNumber, tenantId, machineId, ipAddress, activationType = 'new') {
    await this.logOperation(
      'activate',
      licenseNumber,
      tenantId,
      'success',
      {
        activationType, // 'new' or 'existing'
        machineId,
        ipAddress
      },
      { machineId, ipAddress }
    );
  }

  /**
   * Log usage tracking updates
   */
  async logUsageUpdate(licenseNumber, tenantId, usageData) {
    await this.logOperation(
      'usage_update',
      licenseNumber,
      tenantId,
      'success',
      {
        currentUsers: usageData.currentUsers,
        currentStorage: usageData.currentStorage,
        apiCallsThisMonth: usageData.apiCallsThisMonth
      }
    );
  }

  /**
   * Get audit logs for a specific license
   */
  async getLicenseAuditLogs(licenseNumber, limit = 100, offset = 0) {
    return await AuditLog.find({ licenseNumber })
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip(offset)
      .lean();
  }

  /**
   * Get audit logs for a tenant
   */
  async getTenantAuditLogs(tenantId, limit = 100, offset = 0) {
    return await AuditLog.find({ tenantId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip(offset)
      .lean();
  }

  /**
   * Get audit logs by operation type
   */
  async getOperationAuditLogs(operation, limit = 100, offset = 0) {
    return await AuditLog.find({ operation })
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip(offset)
      .lean();
  }

  /**
   * Log license operation (alias for logOperation with different parameter format)
   */
  async logLicenseOperation({ operation, licenseNumber, tenantId, performedBy, details, ipAddress, userAgent }) {
    const metadata = {
      ipAddress,
      userAgent
    };
    
    await this.logOperation(
      operation.toLowerCase(),
      licenseNumber,
      tenantId,
      'success', // Assume success unless error is thrown
      details,
      metadata,
      performedBy
    );
  }

  /**
   * Get audit statistics
   */
  async getAuditStatistics(startDate, endDate) {
    const matchStage = {
      timestamp: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };

    const stats = await AuditLog.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            operation: '$operation',
            result: '$result'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.operation',
          results: {
            $push: {
              result: '$_id.result',
              count: '$count'
            }
          },
          total: { $sum: '$count' }
        }
      }
    ]);

    return stats;
  }
}

export default new AuditService();