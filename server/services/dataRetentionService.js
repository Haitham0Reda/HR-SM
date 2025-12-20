import mongoose from 'mongoose';
import DataRetentionPolicy from '../models/DataRetentionPolicy.js';
import DataArchive from '../models/DataArchive.js';
import { companyLogger } from '../utils/companyLogger.js';
import fs from 'fs/promises';
import path from 'path';
import zlib from 'zlib';
import crypto from 'crypto';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

class DataRetentionService {
  constructor() {
    this.archiveBasePath = process.env.ARCHIVE_BASE_PATH || './archives';
    this.supportedCollections = new Map([
      ['audit_logs', { model: 'AuditLog', dateField: 'timestamp' }],
      ['security_logs', { model: 'SecurityEvent', dateField: 'timestamp' }],
      ['user_data', { model: 'User', dateField: 'createdAt' }],
      ['employee_records', { model: 'User', dateField: 'createdAt' }],
      ['insurance_policies', { model: 'InsurancePolicy', dateField: 'createdAt' }],
      ['insurance_claims', { model: 'InsuranceClaim', dateField: 'createdAt' }],
      ['family_members', { model: 'FamilyMember', dateField: 'createdAt' }],
      ['beneficiaries', { model: 'Beneficiary', dateField: 'createdAt' }],
      ['license_data', { model: 'License', dateField: 'createdAt' }],
      ['backup_logs', { model: 'BackupLog', dateField: 'createdAt' }],
      ['performance_logs', { model: 'PerformanceLog', dateField: 'timestamp' }],
      ['system_logs', { model: 'SystemLog', dateField: 'timestamp' }],
      ['compliance_logs', { model: 'ComplianceLog', dateField: 'timestamp' }],
      ['financial_records', { model: 'FinancialRecord', dateField: 'createdAt' }],
      ['documents', { model: 'Document', dateField: 'createdAt' }],
      ['reports', { model: 'Report', dateField: 'createdAt' }]
    ]);
  }

  /**
   * Create a new data retention policy
   */
  async createRetentionPolicy(tenantId, policyData, createdBy) {
    try {
      const policy = new DataRetentionPolicy({
        tenantId,
        ...policyData,
        createdBy
      });

      await policy.save();

      // Log policy creation
      companyLogger(tenantId).compliance('Data retention policy created', {
        policyId: policy._id,
        dataType: policy.dataType,
        retentionPeriod: policy.retentionPeriod,
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
        _id: policyId,
        tenantId
      });

      if (!policy) {
        throw new Error('Retention policy not found');
      }

      // Store configuration history
      const changes = {};
      Object.keys(updates).forEach(key => {
        if (policy[key] !== updates[key]) {
          changes[key] = {
            from: policy[key],
            to: updates[key]
          };
        }
      });

      if (Object.keys(changes).length > 0) {
        policy.configurationHistory.push({
          changedBy: updatedBy,
          changes,
          reason: updates.reason || 'Policy update'
        });
      }

      // Apply updates
      Object.assign(policy, updates);
      policy.updatedBy = updatedBy;

      await policy.save();

      // Log policy update
      companyLogger(tenantId).compliance('Data retention policy updated', {
        policyId: policy._id,
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
      const query = { tenantId, ...filters };
      const policies = await DataRetentionPolicy.find(query)
        .populate('createdBy', 'firstName lastName email')
        .populate('updatedBy', 'firstName lastName email')
        .sort({ createdAt: -1 });

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
      const query = {
        status: 'active',
        $or: [
          { nextExecution: { $lte: new Date() } },
          { nextExecution: null }
        ]
      };

      if (tenantId) {
        query.tenantId = tenantId;
      }

      const policies = await DataRetentionPolicy.find(query);
      const results = [];

      for (const policy of policies) {
        try {
          const result = await this.executeSinglePolicy(policy);
          results.push(result);
        } catch (error) {
          companyLogger(policy.tenantId).error('Failed to execute retention policy', {
            policyId: policy._id,
            error: error.message
          });
          
          policy.updateStatistics({
            processed: 0,
            archived: 0,
            deleted: 0,
            error: error.message
          });
          await policy.save();
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
      companyLogger(policy.tenantId).info('Executing retention policy', {
        policyId: policy._id,
        dataType: policy.dataType,
        retentionPeriod: policy.retentionPeriod
      });

      // Get collection configuration
      const collectionConfig = this.supportedCollections.get(policy.dataType);
      if (!collectionConfig) {
        throw new Error(`Unsupported data type: ${policy.dataType}`);
      }

      // Calculate cutoff dates
      const retentionCutoff = this.calculateCutoffDate(policy.retentionPeriod);
      const archivalCutoff = policy.archivalSettings.enabled ? 
        this.calculateCutoffDate(policy.archivalSettings.archiveAfter) : null;

      // Get the model
      const Model = mongoose.model(collectionConfig.model);
      const dateField = collectionConfig.dateField;

      // Find records to process
      const query = {
        tenantId: policy.tenantId,
        [dateField]: { $lt: retentionCutoff }
      };

      // If archival is enabled, first archive eligible records
      if (policy.archivalSettings.enabled && archivalCutoff) {
        const archiveQuery = {
          tenantId: policy.tenantId,
          [dateField]: { 
            $lt: archivalCutoff,
            $gte: retentionCutoff
          }
        };

        const recordsToArchive = await Model.find(archiveQuery).lean();
        if (recordsToArchive.length > 0) {
          const archiveResult = await this.archiveRecords(
            policy, 
            recordsToArchive, 
            collectionConfig
          );
          archived = archiveResult.recordCount;
        }
      }

      // Delete records that exceed retention period
      if (policy.deletionSettings.softDelete) {
        // Soft delete - mark as deleted
        const updateResult = await Model.updateMany(
          query,
          { 
            deletedAt: new Date(),
            deletedBy: 'retention_policy',
            deletionReason: `Retention policy: ${policy.policyName}`
          }
        );
        deleted = updateResult.modifiedCount;
      } else {
        // Hard delete - remove from database
        const deleteResult = await Model.deleteMany(query);
        deleted = deleteResult.deletedCount;
      }

      processed = archived + deleted;

      // Update policy statistics
      const processingTime = Date.now() - startTime;
      policy.updateStatistics({
        processed,
        archived,
        deleted,
        processingTime
      });
      await policy.save();

      // Log execution results
      companyLogger(policy.tenantId).compliance('Retention policy executed', {
        policyId: policy._id,
        dataType: policy.dataType,
        processed,
        archived,
        deleted,
        processingTime,
        compliance: true,
        audit: true
      });

      return {
        policyId: policy._id,
        dataType: policy.dataType,
        processed,
        archived,
        deleted,
        processingTime,
        success: true
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      policy.updateStatistics({
        processed,
        archived,
        deleted,
        processingTime,
        error: error.message
      });
      await policy.save();

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
        policy.tenantId.toString(),
        policy.dataType,
        `${archiveId}.json`
      );

      // Ensure directory exists
      await fs.mkdir(path.dirname(archivePath), { recursive: true });

      // Prepare archive data
      const archiveData = {
        metadata: {
          archiveId,
          tenantId: policy.tenantId,
          dataType: policy.dataType,
          sourceCollection: collectionConfig.model,
          recordCount: records.length,
          createdAt: new Date().toISOString(),
          retentionPolicyId: policy._id
        },
        records
      };

      let fileData = JSON.stringify(archiveData, null, 2);
      let originalSize = Buffer.byteLength(fileData, 'utf8');
      let compressedSize = originalSize;
      let checksum;

      // Apply compression if enabled
      if (policy.archivalSettings.compressionEnabled) {
        const compressed = await gzip(fileData);
        fileData = compressed;
        compressedSize = compressed.length;
      }

      // Apply encryption if enabled
      if (policy.archivalSettings.encryptionEnabled) {
        const encryptionResult = this.encryptData(fileData);
        fileData = encryptionResult.encrypted;
        archiveData.metadata.encryption = {
          algorithm: 'aes-256-cbc',
          keyId: encryptionResult.keyId,
          iv: encryptionResult.iv
        };
      }

      // Calculate checksum
      checksum = crypto.createHash('sha256').update(fileData).digest('hex');

      // Write archive file
      await fs.writeFile(archivePath, fileData);

      // Create archive record
      const archive = new DataArchive({
        tenantId: policy.tenantId,
        archiveId,
        sourceCollection: collectionConfig.model,
        sourceDatabase: mongoose.connection.name,
        dataType: policy.dataType,
        retentionPolicyId: policy._id,
        recordCount: records.length,
        dateRange: {
          startDate: new Date(Math.min(...records.map(r => new Date(r[collectionConfig.dateField])))),
          endDate: new Date(Math.max(...records.map(r => new Date(r[collectionConfig.dateField]))))
        },
        storage: {
          location: 'local',
          localPath: archivePath
        },
        fileInfo: {
          originalSize,
          compressedSize,
          compressionRatio: ((originalSize - compressedSize) / originalSize * 100).toFixed(2),
          format: 'json',
          checksum,
          checksumAlgorithm: 'sha256'
        },
        compression: {
          enabled: policy.archivalSettings.compressionEnabled,
          algorithm: 'gzip',
          level: 6
        },
        encryption: {
          enabled: policy.archivalSettings.encryptionEnabled,
          algorithm: 'aes-256-cbc'
        },
        status: 'completed',
        createdBy: policy.createdBy
      });

      await archive.save();

      // Add audit entry
      archive.addAuditEntry('created', policy.createdBy, {
        recordCount: records.length,
        originalSize,
        compressedSize,
        compressionEnabled: policy.archivalSettings.compressionEnabled,
        encryptionEnabled: policy.archivalSettings.encryptionEnabled
      });

      await archive.save();

      companyLogger(policy.tenantId).compliance('Data archived', {
        archiveId,
        dataType: policy.dataType,
        recordCount: records.length,
        originalSize,
        compressedSize,
        compliance: true,
        audit: true
      });

      return archive;

    } catch (error) {
      companyLogger(policy.tenantId).error('Failed to archive records', {
        error: error.message,
        dataType: policy.dataType,
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
        tenantId,
        archiveId
      });

      if (!archive) {
        throw new Error('Archive not found');
      }

      if (!archive.restoration.canRestore) {
        throw new Error('Archive cannot be restored');
      }

      // Read archive file
      let fileData = await fs.readFile(archive.storage.localPath);

      // Decrypt if needed
      if (archive.encryption.enabled) {
        fileData = this.decryptData(fileData, archive.encryption);
      }

      // Decompress if needed
      if (archive.compression.enabled) {
        fileData = await gunzip(fileData);
      }

      // Parse archive data
      const archiveData = JSON.parse(fileData.toString());
      const records = archiveData.records;

      // Get target model
      const collectionConfig = this.supportedCollections.get(archive.dataType);
      const Model = mongoose.model(collectionConfig.model);

      // Restore records
      const restoredRecords = [];
      for (const record of records) {
        try {
          // Remove MongoDB-specific fields
          delete record._id;
          delete record.__v;
          
          const restoredRecord = new Model(record);
          await restoredRecord.save();
          restoredRecords.push(restoredRecord);
        } catch (error) {
          console.warn(`Failed to restore record: ${error.message}`);
        }
      }

      // Update restoration history
      archive.restoration.restorationHistory.push({
        restoredAt: new Date(),
        restoredBy: userId,
        targetLocation: targetCollection || archive.sourceCollection,
        status: restoredRecords.length === records.length ? 'success' : 'partial',
        recordsRestored: restoredRecords.length,
        notes: `Restored ${restoredRecords.length} of ${records.length} records`
      });

      // Log access
      if (userId) {
        archive.logAccess(userId, 'restore', null, null);
      }

      // Add audit entry
      archive.addAuditEntry('restored', userId, {
        recordsRestored: restoredRecords.length,
        totalRecords: records.length,
        targetCollection: targetCollection || archive.sourceCollection
      });

      await archive.save();

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
      const query = { tenantId, ...filters };
      const archives = await DataArchive.find(query)
        .populate('retentionPolicyId', 'policyName')
        .populate('createdBy', 'firstName lastName email')
        .sort({ createdAt: -1 });

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
      const query = {
        'scheduledDeletion.deleteAfter': { $lte: new Date() },
        'legalHold.isOnHold': { $ne: true }
      };

      if (tenantId) {
        query.tenantId = tenantId;
      }

      const expiredArchives = await DataArchive.find(query);
      const results = [];

      for (const archive of expiredArchives) {
        try {
          // Delete physical file
          if (archive.storage.localPath) {
            await fs.unlink(archive.storage.localPath);
          }

          // Add audit entry
          archive.addAuditEntry('deleted', null, {
            reason: 'Scheduled deletion',
            deleteAfter: archive.scheduledDeletion.deleteAfter
          });

          await archive.save();

          // Remove from database
          await DataArchive.deleteOne({ _id: archive._id });

          companyLogger(archive.tenantId).compliance('Archive deleted', {
            archiveId: archive.archiveId,
            reason: 'Scheduled deletion',
            compliance: true,
            audit: true
          });

          results.push({
            archiveId: archive.archiveId,
            tenantId: archive.tenantId,
            deleted: true
          });

        } catch (error) {
          companyLogger(archive.tenantId).error('Failed to delete archive', {
            archiveId: archive.archiveId,
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
    // This is a simplified implementation
    // In production, you would retrieve the actual key using the keyId
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
      const policies = await DataRetentionPolicy.find({ tenantId });
      const archives = await DataArchive.find({ tenantId });

      const stats = {
        totalPolicies: policies.length,
        activePolicies: policies.filter(p => p.status === 'active').length,
        totalArchives: archives.length,
        totalArchivedRecords: archives.reduce((sum, a) => sum + a.recordCount, 0),
        totalArchiveSize: archives.reduce((sum, a) => sum + (a.fileInfo.compressedSize || a.fileInfo.originalSize), 0),
        archivesByDataType: {},
        policiesByDataType: {},
        recentExecutions: []
      };

      // Group by data type
      policies.forEach(policy => {
        stats.policiesByDataType[policy.dataType] = (stats.policiesByDataType[policy.dataType] || 0) + 1;
      });

      archives.forEach(archive => {
        if (!stats.archivesByDataType[archive.dataType]) {
          stats.archivesByDataType[archive.dataType] = {
            count: 0,
            records: 0,
            size: 0
          };
        }
        stats.archivesByDataType[archive.dataType].count++;
        stats.archivesByDataType[archive.dataType].records += archive.recordCount;
        stats.archivesByDataType[archive.dataType].size += (archive.fileInfo.compressedSize || archive.fileInfo.originalSize);
      });

      // Recent executions
      stats.recentExecutions = policies
        .filter(p => p.lastExecuted)
        .sort((a, b) => b.lastExecuted - a.lastExecuted)
        .slice(0, 10)
        .map(p => ({
          policyId: p._id,
          policyName: p.policyName,
          dataType: p.dataType,
          lastExecuted: p.lastExecuted,
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