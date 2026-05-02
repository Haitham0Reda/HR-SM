import logger from '../utils/logger.js';
import AuditLog from '../models/AuditLog.js';

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
      const auditEntry = await AuditLog.create({
        operation,
        licenseNumber,
        tenantId,
        result,
        details,
        metadata,
        performedBy,
        errorMessage
      });

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
    return await AuditLog.findAll({
      where: { licenseNumber },
      order: [['timestamp', 'DESC']],
      limit,
      offset,
      raw: true
    });
  }

  /**
   * Get audit logs for a tenant
   */
  async getTenantAuditLogs(tenantId, limit = 100, offset = 0) {
    return await AuditLog.findAll({
      where: { tenantId },
      order: [['timestamp', 'DESC']],
      limit,
      offset,
      raw: true
    });
  }

  /**
   * Get audit logs by operation type
   */
  async getOperationAuditLogs(operation, limit = 100, offset = 0) {
    return await AuditLog.findAll({
      where: { operation },
      order: [['timestamp', 'DESC']],
      limit,
      offset,
      raw: true
    });
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
    const { Op } = await import('sequelize');
    const { licenseServerDb } = await import('../../config/database.js');
    
    const stats = await licenseServerDb.query(`
      SELECT 
        operation,
        result,
        COUNT(*) as count
      FROM license_audit_logs
      WHERE timestamp >= :startDate AND timestamp <= :endDate
      GROUP BY operation, result
      ORDER BY operation, result
    `, {
      replacements: { 
        startDate: new Date(startDate), 
        endDate: new Date(endDate) 
      },
      type: licenseServerDb.QueryTypes.SELECT
    });

    // Transform to match original format
    const grouped = {};
    stats.forEach(row => {
      if (!grouped[row.operation]) {
        grouped[row.operation] = {
          _id: row.operation,
          results: [],
          total: 0
        };
      }
      grouped[row.operation].results.push({
        result: row.result,
        count: parseInt(row.count)
      });
      grouped[row.operation].total += parseInt(row.count);
    });

    return Object.values(grouped);
  }
}

export default new AuditService();