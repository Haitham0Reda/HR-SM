import { QueryTypes, Op } from 'sequelize';
import { mainAppDb } from '../config/database.js';
import { getModelForConnection } from '../config/sharedModels.js';
import { companyLogger } from '../utils/companyLogger.js';
import fs from 'fs/promises';
import path from 'path';
import zlib from 'zlib';
import crypto from 'crypto';
import { promisify } from 'util';

import AuditLog from '../../hrsm-license-server/src/models/AuditLog.js';
import SecurityEvent from '../platform/system/models/securityEvent.model.js';
import User from '../modules/hr-core/users/models/user.model.js';
import License from '../platform/system/models/license.model.js';
import DataRetentionPolicy from '../modules/data-management/models/dataRetentionPolicy.model.js';
import DataArchive from '../modules/data-management/models/dataArchive.model.js';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

class DataRetentionService {
  constructor() {
    this.archiveBasePath = process.env.ARCHIVE_BASE_PATH || './archives';

    // Model registry mapping data types to Sequelize models
    this.modelRegistry = new Map([
      ['audit_logs', { model: AuditLog, dateField: 'timestamp' }],
      ['security_logs', { model: SecurityEvent, dateField: 'timestamp' }],
      ['user_data', { model: User, dateField: 'createdAt' }],
      ['employee_records', { model: User, dateField: 'createdAt' }],
      ['license_data', { model: License, dateField: 'createdAt' }]
    ]);

    this.supportedCollections = this.modelRegistry;
  }

  /**
   * Create a new data retention policy
   */
  async createRetentionPolicy(tenantId, policyData, createdBy) {
    try {
      const policy = await DataRetentionPolicy.create({
        tenant_id: tenantId,
        policy_name: policyData.policyName || policyData.policy_name,
        description: policyData.description,
        data_type: policyData.dataType || policyData.data_type,
        retention_period: policyData.retentionPeriod || policyData.retention_period,
        archival_settings: policyData.archivalSettings || policyData.archival_settings || { enabled: false },
        deletion_settings: policyData.deletionSettings || policyData.deletion_settings || { softDelete: true },
        legal_requirements: policyData.legalRequirements || policyData.legal_requirements || {},
        execution_schedule: policyData.executionSchedule || policyData.execution_schedule || { frequency: 'daily', time: '02:00', timezone: 'UTC' },
        status: policyData.status || 'active',
        created_by: createdBy
      });

      companyLogger(tenantId).compliance('Data retention policy created', {
        policyId: policy.id,
        dataType: policy.data_type,
        retentionPeriod: policy.retention_period,
        createdBy,
        compliance: true,
        audit: true
      });

      return policy;
    } catch (error) {
      companyLogger(tenantId).error('Failed to create retention policy', {
        error: error.message,
        policyData,
        createdBy
      });
      throw error;
    }
  }

  /**
   * Update an existing retention policy
   */
  async updateRetentionPolicy(tenantId, policyId, updates, updatedBy) {
    try {
      const policy = await DataRetentionPolicy.findOne({
        where: { id: policyId, tenant_id: tenantId }
      });

      if (!policy) {
        throw new Error('Retention policy not found');
      }

      // Map incoming camelCase keys to snake_case attribute names
      const fieldMap = {
        policyName: 'policy_name',
        dataType: 'data_type',
        retentionPeriod: 'retention_period',
        archivalSettings: 'archival_settings',
        deletionSettings: 'deletion_settings',
        executionSchedule: 'execution_schedule',
        legalRequirements: 'legal_requirements'
      };

      // Record changes for configuration history
      const changes = {};
      Object.keys(updates).forEach(key => {
        const snakeKey = fieldMap[key] || key;
        const currentVal = policy[snakeKey];
        const newVal = updates[key];
        if (JSON.stringify(currentVal) !== JSON.stringify(newVal)) {
          changes[key] = { from: currentVal, to: newVal };
        }
      });

      if (Object.keys(changes).length > 0) {
        const history = [...(policy.configuration_history || [])];
        history.push({
          changedBy: updatedBy,
          changedAt: new Date(),
          changes,
          reason: updates.reason || 'Policy update'
        });
        policy.configuration_history = history;
      }

      // Apply updates
      Object.keys(updates).forEach(key => {
        if (key === 'reason') return;
        const snakeKey = fieldMap[key] || key;
        policy[snakeKey] = updates[key];
      });
      policy.updated_by = updatedBy;

      await policy.save();

      companyLogger(tenantId).compliance('Data retention policy updated', {
        policyId: policy.id,
        changes,
        updatedBy,
        compliance: true,
        audit: true
      });

      return policy;
    } catch (error) {
      companyLogger(tenantId).error('Failed to update retention policy', {
        error: error.message,
        policyId,
        updates,
        updatedBy
      });
      throw error;
    }
  }

  /**
   * Get retention policies for a tenant
   */
  async getRetentionPolicies(tenantId, filters = {}) {
    try {
      const where = { tenant_id: tenantId };
      if (filters.dataType || filters.data_type) where.data_type = filters.dataType || filters.data_type;
      if (filters.status) where.status = filters.status;

      const policies = await DataRetentionPolicy.findAll({
        where,
        order: [['created_at', 'DESC']]
      });

      return policies;
    } catch (error) {
      companyLogger(tenantId).error('Failed to get retention policies', {
        error: error.message,
        filters
      });
      throw error;
    }
  }

  /**
   * Execute retention policies that are due
   */
  async executeRetentionPolicies(tenantId = null) {
    try {
      const where = {
        status: 'active',
        [Op.or]: [
          { next_execution: { [Op.lte]: new Date() } },
          { next_execution: null }
        ]
      };

      if (tenantId) {
        where.tenant_id = tenantId;
      }

      const policies = await DataRetentionPolicy.findAll({ where });
      const results = [];

      for (const policy of policies) {
        try {
          const result = await this.executeSinglePolicy(policy);
          results.push(result);
        } catch (error) {
          companyLogger(policy.tenant_id).error('Failed to execute retention policy', {
            policyId: policy.id,
            error: error.message
          });

          await policy.updateStatistics({
            processed: 0,
            archived: 0,
            deleted: 0,
            error: error.message
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Failed to execute retention policies:', error);
      throw error;
    }
  }

  /**
   * Execute a single retention policy
   */
  async executeSinglePolicy(policy) {
    const startTime = Date.now();
    let processed = 0;
    let archived = 0;
    let deleted = 0;

    try {
      companyLogger(policy.tenant_id).info('Executing retention policy', {
        policyId: policy.id,
        dataType: policy.data_type,
        retentionPeriod: policy.retention_period
      });

      const collectionConfig = this.supportedCollections.get(policy.data_type);
      if (!collectionConfig) {
        throw new Error(`Unsupported data type: ${policy.data_type}`);
      }

      const retentionCutoff = this.calculateCutoffDate(policy.retention_period);
      const archivalCutoff = policy.archival_settings.enabled
        ? this.calculateCutoffDate(policy.archival_settings.archiveAfter)
        : null;

      const Model = collectionConfig.model;
      const dateField = collectionConfig.dateField;

      const query = {
        tenant_id: policy.tenant_id,
        [dateField]: { [Op.lt]: retentionCutoff }
      };

      // Archive eligible records first
      if (policy.archival_settings.enabled && archivalCutoff) {
        const archiveQuery = {
          tenant_id: policy.tenant_id,
          [dateField]: {
            [Op.lt]: archivalCutoff,
            [Op.gte]: retentionCutoff
          }
        };

        const recordsToArchive = await Model.findAll({ where: archiveQuery, raw: true });

        if (recordsToArchive.length > 0) {
          const archiveResult = await this.archiveRecords(policy, recordsToArchive, collectionConfig);
          archived = archiveResult.record_count;
        }
      }

      // Delete records that exceed retention period
      if (policy.deletion_settings.softDelete) {
        const [updateCount] = await Model.update(
          {
            deletedAt: new Date(),
            deletedBy: 'retention_policy',
            deletionReason: `Retention policy: ${policy.policy_name}`
          },
          { where: query }
        );
        deleted = updateCount;
      } else {
        deleted = await Model.destroy({ where: query });
      }

      processed = archived + deleted;

      const processingTime = Date.now() - startTime;
      await policy.updateStatistics({ processed, archived, deleted, processingTime });

      companyLogger(policy.tenant_id).compliance('Retention policy executed', {
        policyId: policy.id,
        dataType: policy.data_type,
        processed,
        archived,
        deleted,
        processingTime,
        compliance: true,
        audit: true
      });

      return {
        policyId: policy.id,
        dataType: policy.data_type,
        processed,
        archived,
        deleted,
        processingTime,
        success: true
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      await policy.updateStatistics({ processed, archived, deleted, processingTime, error: error.message });
      throw error;
    }
  }

  /**
   * Archive records to storage
   */
  async archiveRecords(policy, records, collectionConfig) {
    try {
      const archiveId = this.generateArchiveId();
      const archivePath = path.join(
        this.archiveBasePath,
        policy.tenant_id.toString(),
        policy.data_type,
        `${archiveId}.json`
      );

      await fs.mkdir(path.dirname(archivePath), { recursive: true });

      const archiveData = {
        metadata: {
          archiveId,
          tenantId: policy.tenant_id,
          dataType: policy.data_type,
          sourceCollection: collectionConfig.model.name,
          recordCount: records.length,
          createdAt: new Date().toISOString(),
          retentionPolicyId: policy.id
        },
        records
      };

      let fileData = JSON.stringify(archiveData, null, 2);
      let originalSize = Buffer.byteLength(fileData, 'utf8');
      let compressedSize = originalSize;
      let checksum;

      if (policy.archival_settings.compressionEnabled) {
        const compressed = await gzip(fileData);
        fileData = compressed;
        compressedSize = compressed.length;
      }

      if (policy.archival_settings.encryptionEnabled) {
        const encryptionResult = this.encryptData(fileData);
        fileData = encryptionResult.encrypted;
        archiveData.metadata.encryption = {
          algorithm: 'aes-256-cbc',
          keyId: encryptionResult.keyId,
          iv: encryptionResult.iv
        };
      }

      checksum = crypto.createHash('sha256').update(fileData).digest('hex');

      await fs.writeFile(archivePath, fileData);

      const archive = await DataArchive.create({
        tenant_id: policy.tenant_id,
        archive_id: archiveId,
        source_collection: collectionConfig.model.name,
        source_database: mainAppDb.config.database,
        data_type: policy.data_type,
        retention_policy_id: policy.id,
        record_count: records.length,
        date_range: {
          startDate: new Date(Math.min(...records.map(r => new Date(r[collectionConfig.dateField])))),
          endDate: new Date(Math.max(...records.map(r => new Date(r[collectionConfig.dateField]))))
        },
        storage: {
          location: 'local',
          localPath: archivePath
        },
        file_info: {
          originalSize,
          compressedSize,
          compressionRatio: ((originalSize - compressedSize) / originalSize * 100).toFixed(2),
          format: 'json',
          checksum,
          checksumAlgorithm: 'sha256'
        },
        compression: {
          enabled: policy.archival_settings.compressionEnabled,
          algorithm: 'gzip',
          level: 6
        },
        encryption: {
          enabled: policy.archival_settings.encryptionEnabled,
          algorithm: 'aes-256-cbc'
        },
        status: 'completed',
        created_by: policy.created_by
      });

      await archive.addAuditEntry('created', policy.created_by, {
        recordCount: records.length,
        originalSize,
        compressedSize,
        compressionEnabled: policy.archival_settings.compressionEnabled,
        encryptionEnabled: policy.archival_settings.encryptionEnabled
      });

      companyLogger(policy.tenant_id).compliance('Data archived', {
        archiveId,
        dataType: policy.data_type,
        recordCount: records.length,
        originalSize,
        compressedSize,
        compliance: true,
        audit: true
      });

      return archive;

    } catch (error) {
      companyLogger(policy.tenant_id).error('Failed to archive records', {
        error: error.message,
        dataType: policy.data_type,
        recordCount: records.length
      });
      throw error;
    }
  }

  /**
   * Restore archived data
   */
  async restoreArchive(tenantId, archiveId, targetCollection = null, userId = null) {
    try {
      const archive = await DataArchive.findOne({
        where: { tenant_id: tenantId, archive_id: archiveId }
      });

      if (!archive) {
        throw new Error('Archive not found');
      }

      if (!archive.restoration.canRestore) {
        throw new Error('Archive cannot be restored');
      }

      let fileData = await fs.readFile(archive.storage.localPath);

      if (archive.encryption.enabled) {
        fileData = this.decryptData(fileData, archive.encryption);
      }

      if (archive.compression.enabled) {
        fileData = await gunzip(fileData);
      }

      const archiveData = JSON.parse(fileData.toString());
      const records = archiveData.records;

      const collectionConfig = this.supportedCollections.get(archive.data_type);
      const Model = collectionConfig.model;

      const restoredRecords = [];
      for (const record of records) {
        try {
          delete record.id;
          delete record.createdAt;
          delete record.updatedAt;

          const restoredRecord = await Model.create(record);
          restoredRecords.push(restoredRecord);
        } catch (error) {
          console.warn(`Failed to restore record: ${error.message}`);
        }
      }

      // Update restoration history in the JSONB field
      const restoration = { ...(archive.restoration || { canRestore: true, restorationHistory: [] }) };
      restoration.restorationHistory = [...(restoration.restorationHistory || [])];
      restoration.restorationHistory.push({
        restoredAt: new Date(),
        restoredBy: userId,
        targetLocation: targetCollection || archive.source_collection,
        status: restoredRecords.length === records.length ? 'success' : 'partial',
        recordsRestored: restoredRecords.length,
        notes: `Restored ${restoredRecords.length} of ${records.length} records`
      });
      archive.restoration = restoration;
      await archive.save();

      if (userId) {
        await archive.logAccess(userId, 'restore', null, null);
      }

      await archive.addAuditEntry('restored', userId, {
        recordsRestored: restoredRecords.length,
        totalRecords: records.length,
        targetCollection: targetCollection || archive.source_collection
      });

      companyLogger(tenantId).compliance('Archive restored', {
        archiveId,
        recordsRestored: restoredRecords.length,
        totalRecords: records.length,
        restoredBy: userId,
        compliance: true,
        audit: true
      });

      return {
        archiveId,
        recordsRestored: restoredRecords.length,
        totalRecords: records.length,
        status: restoredRecords.length === records.length ? 'success' : 'partial'
      };

    } catch (error) {
      companyLogger(tenantId).error('Failed to restore archive', {
        error: error.message,
        archiveId,
        userId
      });
      throw error;
    }
  }

  /**
   * Get archives for a tenant
   */
  async getArchives(tenantId, filters = {}) {
    try {
      const where = { tenant_id: tenantId };
      if (filters.status) where.status = filters.status;
      if (filters.dataType || filters.data_type) where.data_type = filters.dataType || filters.data_type;

      const archives = await DataArchive.findAll({
        where,
        order: [['created_at', 'DESC']]
      });

      return archives;
    } catch (error) {
      companyLogger(tenantId).error('Failed to get archives', {
        error: error.message,
        filters
      });
      throw error;
    }
  }

  /**
   * Delete expired archives
   */
  async deleteExpiredArchives(tenantId = null) {
    try {
      const where = {};
      if (tenantId) where.tenant_id = tenantId;

      const allArchives = await DataArchive.findAll({ where });
      const now = new Date();

      const expiredArchives = allArchives.filter(archive => {
        if (archive.legal_hold && archive.legal_hold.isOnHold) return false;
        if (!archive.scheduled_deletion || !archive.scheduled_deletion.deleteAfter) return false;
        return new Date(archive.scheduled_deletion.deleteAfter) <= now;
      });

      const results = [];

      for (const archive of expiredArchives) {
        try {
          if (archive.storage.localPath) {
            await fs.unlink(archive.storage.localPath);
          }

          await archive.addAuditEntry('deleted', null, {
            reason: 'Scheduled deletion',
            deleteAfter: archive.scheduled_deletion.deleteAfter
          });

          await archive.destroy();

          companyLogger(archive.tenant_id).compliance('Archive deleted', {
            archiveId: archive.archive_id,
            reason: 'Scheduled deletion',
            compliance: true,
            audit: true
          });

          results.push({
            archiveId: archive.archive_id,
            tenantId: archive.tenant_id,
            deleted: true
          });

        } catch (error) {
          companyLogger(archive.tenant_id).error('Failed to delete archive', {
            archiveId: archive.archive_id,
            error: error.message
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Failed to delete expired archives:', error);
      throw error;
    }
  }

  /**
   * Helper methods
   */
  calculateCutoffDate(period) {
    const now = new Date();
    const { value, unit } = period;

    switch (unit) {
      case 'days':
        return new Date(now.getTime() - (value * 24 * 60 * 60 * 1000));
      case 'months':
        return new Date(now.getFullYear(), now.getMonth() - value, now.getDate());
      case 'years':
        return new Date(now.getFullYear() - value, now.getMonth(), now.getDate());
      default:
        throw new Error(`Unsupported time unit: ${unit}`);
    }
  }

  generateArchiveId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 8);
    return `ARC-${timestamp}-${random}`.toUpperCase();
  }

  encryptData(data) {
    const algorithm = 'aes-256-cbc';
    const key = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipher(algorithm, key);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return {
      encrypted,
      keyId: crypto.createHash('sha256').update(key).digest('hex'),
      iv: iv.toString('hex')
    };
  }

  decryptData(encryptedData, encryptionInfo) {
    const algorithm = 'aes-256-cbc';
    const decipher = crypto.createDecipher(algorithm, 'encryption-key');
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Get retention statistics for a tenant
   */
  async getRetentionStatistics(tenantId) {
    try {
      const policies = await DataRetentionPolicy.findAll({ where: { tenant_id: tenantId } });
      const archives = await DataArchive.findAll({ where: { tenant_id: tenantId } });

      const stats = {
        totalPolicies: policies.length,
        activePolicies: policies.filter(p => p.status === 'active').length,
        totalArchives: archives.length,
        totalArchivedRecords: archives.reduce((sum, a) => sum + a.record_count, 0),
        totalArchiveSize: archives.reduce((sum, a) => sum + (a.file_info.compressedSize || a.file_info.originalSize), 0),
        archivesByDataType: {},
        policiesByDataType: {},
        recentExecutions: []
      };

      policies.forEach(policy => {
        stats.policiesByDataType[policy.data_type] = (stats.policiesByDataType[policy.data_type] || 0) + 1;
      });

      archives.forEach(archive => {
        if (!stats.archivesByDataType[archive.data_type]) {
          stats.archivesByDataType[archive.data_type] = { count: 0, records: 0, size: 0 };
        }
        stats.archivesByDataType[archive.data_type].count++;
        stats.archivesByDataType[archive.data_type].records += archive.record_count;
        stats.archivesByDataType[archive.data_type].size += (archive.file_info.compressedSize || archive.file_info.originalSize);
      });

      stats.recentExecutions = policies
        .filter(p => p.last_executed)
        .sort((a, b) => b.last_executed - a.last_executed)
        .slice(0, 10)
        .map(p => ({
          policyId: p.id,
          policyName: p.policy_name,
          dataType: p.data_type,
          lastExecuted: p.last_executed,
          lastProcessedCount: p.statistics.lastProcessedCount,
          status: p.statistics.lastError ? 'failed' : 'success'
        }));

      return stats;
    } catch (error) {
      companyLogger(tenantId).error('Failed to get retention statistics', {
        error: error.message
      });
      throw error;
    }
  }
}

export default new DataRetentionService();
