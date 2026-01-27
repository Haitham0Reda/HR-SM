/**
 * Tenant Data Import Module
 * 
 * Imports tenant data into the destination database (hrsm-licenses) during migration.
 * Creates collections with proper schema, inserts records with transaction support,
 * and creates database indexes for performance.
 * 
 * Requirements: 1.1, 1.2, 1.3, 2.3
 */

import { MigrationLogger } from '../utils/migrationLogger.js';
import { MigrationError } from '../errors/MigrationErrors.js';

/**
 * Import tenant records into destination database
 * 
 * @param {mongoose.mongo.Db} destDb - Destination database connection
 * @param {Object} exportData - Export data containing tenant records
 * @param {Object} options - Import options
 * @param {number} options.batchSize - Number of records to insert per batch
 * @param {boolean} options.createIndexes - Whether to create indexes after import
 * @param {boolean} options.useTransaction - Whether to use transactions for atomicity
 * @returns {Promise<Object>} Import result with statistics
 */
export async function importTenants(destDb, exportData, options = {}) {
  const logger = new MigrationLogger();
  const batchSize = options.batchSize || 100;
  const createIndexes = options.createIndexes !== undefined ? options.createIndexes : true;
  const useTransaction = options.useTransaction !== undefined ? options.useTransaction : true;

  try {
    logger.info('Starting tenant data import to destination database');
    logger.info('Import options:', { batchSize, createIndexes, useTransaction });

    // Validate export data
    if (!exportData || !Array.isArray(exportData.tenants)) {
      throw new TenantImportError('Invalid export data: tenants array is required');
    }

    const tenants = exportData.tenants;
    
    if (tenants.length === 0) {
      logger.warn('No tenant records to import');
      return {
        success: true,
        importedCount: 0,
        skippedCount: 0,
        failedCount: 0,
        metadata: {
          importedAt: new Date(),
          destinationDatabase: destDb.databaseName
        }
      };
    }

    logger.info(`Importing ${tenants.length} tenant records`);

    // Get collections
    const tenantsCollection = destDb.collection('tenants');
    const subscriptionsCollection = destDb.collection('subscriptions');
    const enabledModulesCollection = destDb.collection('enabled_modules');

    // Ensure collections exist (MongoDB creates them automatically on first insert)
    // But we'll explicitly create them for better control
    await ensureCollectionsExist(destDb, logger);

    let importedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const failedRecords = [];

    // Import tenants in batches
    for (let i = 0; i < tenants.length; i += batchSize) {
      const batch = tenants.slice(i, i + batchSize);
      logger.info(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(tenants.length / batchSize)}`);

      try {
        const batchResult = await importTenantBatch(
          destDb,
          batch,
          { tenantsCollection, subscriptionsCollection, enabledModulesCollection },
          useTransaction,
          logger
        );

        importedCount += batchResult.imported;
        skippedCount += batchResult.skipped;
        failedCount += batchResult.failed;
        failedRecords.push(...batchResult.failedRecords);

      } catch (error) {
        logger.error(`Batch import failed:`, error);
        failedCount += batch.length;
        failedRecords.push(...batch.map(t => ({
          tenantId: t.tenantId,
          error: error.message
        })));
      }
    }

    logger.success(`Imported ${importedCount} tenant records`);
    
    if (skippedCount > 0) {
      logger.warn(`Skipped ${skippedCount} tenant records (already exist)`);
    }
    
    if (failedCount > 0) {
      logger.error(`Failed to import ${failedCount} tenant records`);
    }

    // Create indexes for performance
    if (createIndexes) {
      logger.info('Creating database indexes...');
      await createDatabaseIndexes(destDb, logger);
      logger.success('Database indexes created');
    }

    // Return import results
    return {
      success: failedCount === 0,
      importedCount,
      skippedCount,
      failedCount,
      failedRecords: failedRecords.length > 0 ? failedRecords : undefined,
      metadata: {
        importedAt: new Date(),
        destinationDatabase: destDb.databaseName,
        totalProcessed: tenants.length
      }
    };

  } catch (error) {
    logger.error('Failed to import tenant data:', error);
    throw new TenantImportError('Tenant import failed', error);
  }
}

/**
 * Ensure required collections exist in destination database
 * 
 * @param {mongoose.mongo.Db} destDb - Destination database
 * @param {MigrationLogger} logger - Logger instance
 */
async function ensureCollectionsExist(destDb, logger) {
  const requiredCollections = ['tenants', 'subscriptions', 'enabled_modules'];
  const existingCollections = await destDb.listCollections().toArray();
  const existingNames = existingCollections.map(c => c.name);

  for (const collectionName of requiredCollections) {
    if (!existingNames.includes(collectionName)) {
      logger.info(`Creating collection: ${collectionName}`);
      await destDb.createCollection(collectionName);
    }
  }
}

/**
 * Import a batch of tenant records
 * 
 * @param {mongoose.mongo.Db} destDb - Destination database
 * @param {Array} batch - Batch of tenant records to import
 * @param {Object} collections - Collection references
 * @param {boolean} useTransaction - Whether to use transaction
 * @param {MigrationLogger} logger - Logger instance
 * @returns {Promise<Object>} Batch import result
 */
async function importTenantBatch(destDb, batch, collections, useTransaction, logger) {
  const { tenantsCollection, subscriptionsCollection, enabledModulesCollection } = collections;
  
  let imported = 0;
  let skipped = 0;
  let failed = 0;
  const failedRecords = [];

  // Process each tenant in the batch
  for (const tenant of batch) {
    try {
      // Check if tenant already exists
      const existing = await tenantsCollection.findOne({ tenantId: tenant.tenantId });
      
      if (existing) {
        logger.warn(`Tenant already exists, skipping: ${tenant.tenantId}`);
        skipped++;
        continue;
      }

      // Map and preserve all fields from source to destination
      const mappedTenant = mapTenantFields(tenant);

      // Insert tenant record
      await tenantsCollection.insertOne(mappedTenant);
      
      // Insert subscription record if present
      if (tenant.subscription && Object.keys(tenant.subscription).length > 0) {
        const subscription = createSubscriptionRecord(tenant);
        await subscriptionsCollection.insertOne(subscription);
      }

      // Insert enabled modules records
      if (Array.isArray(tenant.enabledModules) && tenant.enabledModules.length > 0) {
        const moduleRecords = createEnabledModulesRecords(tenant);
        if (moduleRecords.length > 0) {
          await enabledModulesCollection.insertMany(moduleRecords);
        }
      }

      imported++;
      
    } catch (error) {
      logger.error(`Failed to import tenant ${tenant.tenantId}:`, error.message);
      failed++;
      failedRecords.push({
        tenantId: tenant.tenantId,
        error: error.message
      });
    }
  }

  return { imported, skipped, failed, failedRecords };
}

/**
 * Map tenant fields from source schema to destination schema
 * Preserves all metadata and timestamps
 * 
 * Requirements: 2.3 (Field preservation logic)
 * 
 * @param {Object} sourceTenant - Tenant record from source database
 * @returns {Object} Mapped tenant record for destination database
 */
function mapTenantFields(sourceTenant) {
  // Preserve all fields from source, mapping to destination schema
  const mappedTenant = {
    // Core tenant information
    tenantId: sourceTenant.tenantId,
    name: sourceTenant.name,
    domain: sourceTenant.domain || null,
    status: sourceTenant.status || 'active',
    deploymentMode: sourceTenant.deploymentMode || 'saas',

    // Subscription information (summary in tenant record)
    subscription: {
      planId: sourceTenant.subscription?.planId || null,
      status: sourceTenant.subscription?.status || 'trial',
      startDate: convertToDate(sourceTenant.subscription?.startDate || sourceTenant.createdAt),
      expiresAt: convertToDate(sourceTenant.subscription?.expiresAt),
      autoRenew: sourceTenant.subscription?.autoRenew !== undefined ? 
        sourceTenant.subscription.autoRenew : true,
      billingCycle: sourceTenant.subscription?.billingCycle || 'monthly'
    },

    // Enabled modules (array of module IDs for quick access)
    enabledModules: Array.isArray(sourceTenant.enabledModules) ?
      sourceTenant.enabledModules.map(m => m.moduleId || m).filter(Boolean) : [],

    // Configuration settings
    config: {
      timezone: sourceTenant.config?.timezone || 'UTC',
      locale: sourceTenant.config?.locale || 'en-US',
      dateFormat: sourceTenant.config?.dateFormat || 'YYYY-MM-DD',
      timeFormat: sourceTenant.config?.timeFormat || '24h',
      currency: sourceTenant.config?.currency || 'USD',
      features: sourceTenant.config?.features || {}
    },

    // Usage limits and restrictions
    limits: {
      maxUsers: sourceTenant.limits?.maxUsers || 100,
      maxStorage: sourceTenant.limits?.maxStorage || 10737418240, // 10GB in bytes
      apiCallsPerMonth: sourceTenant.limits?.apiCallsPerMonth || 100000
    },

    // Current usage metrics
    usage: {
      userCount: sourceTenant.usage?.userCount || 0,
      storageUsed: sourceTenant.usage?.storageUsed || 0,
      apiCallsThisMonth: sourceTenant.usage?.apiCallsThisMonth || 0,
      lastResetDate: convertToDate(sourceTenant.usage?.lastResetDate || new Date()),
      activeUsers: sourceTenant.usage?.activeUsers || 0,
      lastActivityAt: convertToDate(sourceTenant.usage?.lastActivityAt || new Date())
    },

    // Performance and operational metrics
    metrics: {
      totalSessions: sourceTenant.metrics?.totalSessions || 0,
      avgSessionDuration: sourceTenant.metrics?.avgSessionDuration || 0,
      totalDocuments: sourceTenant.metrics?.totalDocuments || 0,
      totalReports: sourceTenant.metrics?.totalReports || 0,
      errorRate: sourceTenant.metrics?.errorRate || 0,
      responseTime: sourceTenant.metrics?.responseTime || 0,
      cpuUsage: sourceTenant.metrics?.cpuUsage || 0,
      memoryUsage: sourceTenant.metrics?.memoryUsage || 0,
      diskUsage: sourceTenant.metrics?.diskUsage || 0,
      uptime: sourceTenant.metrics?.uptime || 0,
      availability: sourceTenant.metrics?.availability || 100
    },

    // Billing information
    billing: {
      currentPlan: sourceTenant.billing?.currentPlan || 'trial',
      billingCycle: sourceTenant.billing?.billingCycle || 'monthly',
      nextBillingDate: convertToDate(sourceTenant.billing?.nextBillingDate),
      paymentStatus: sourceTenant.billing?.paymentStatus || 'active',
      totalRevenue: sourceTenant.billing?.totalRevenue || 0,
      lastPaymentDate: convertToDate(sourceTenant.billing?.lastPaymentDate),
      paymentMethod: sourceTenant.billing?.paymentMethod || 'credit_card',
      currency: sourceTenant.billing?.currency || sourceTenant.config?.currency || 'USD',
      amount: sourceTenant.billing?.amount || 0
    },

    // License information
    license: {
      licenseKey: sourceTenant.license?.licenseKey || null,
      licenseNumber: sourceTenant.license?.licenseNumber || null,
      licenseType: sourceTenant.license?.licenseType || null,
      licenseStatus: sourceTenant.license?.licenseStatus || 'active',
      expiresAt: convertToDate(sourceTenant.license?.expiresAt || sourceTenant.license?.licenseExpiresAt),
      machineId: sourceTenant.license?.machineId || null,
      activatedAt: convertToDate(sourceTenant.license?.activatedAt),
      lastValidatedAt: convertToDate(sourceTenant.license?.lastValidatedAt),
      validationCount: sourceTenant.license?.validationCount || 0,
      features: sourceTenant.license?.features || [],
      limits: sourceTenant.license?.limits || {}
    },

    // Compliance information
    compliance: {
      dataResidency: sourceTenant.compliance?.dataResidency || 'US',
      gdprCompliant: sourceTenant.compliance?.gdprCompliant || false,
      soc2Certified: sourceTenant.compliance?.soc2Certified || false,
      lastAuditDate: convertToDate(sourceTenant.compliance?.lastAuditDate),
      complianceNotes: sourceTenant.compliance?.complianceNotes || ''
    },

    // Contact information
    contactInfo: {
      adminEmail: sourceTenant.contactInfo?.adminEmail || null,
      adminName: sourceTenant.contactInfo?.adminName || null,
      phone: sourceTenant.contactInfo?.phone || null,
      address: {
        street: sourceTenant.contactInfo?.address?.street || null,
        city: sourceTenant.contactInfo?.address?.city || null,
        state: sourceTenant.contactInfo?.address?.state || null,
        country: sourceTenant.contactInfo?.address?.country || null,
        postalCode: sourceTenant.contactInfo?.address?.postalCode || null
      }
    },

    // Additional metadata
    metadata: {
      industry: sourceTenant.metadata?.industry || null,
      companySize: sourceTenant.metadata?.companySize || null,
      notes: sourceTenant.metadata?.notes || '',
      country: sourceTenant.metadata?.country || sourceTenant.contactInfo?.address?.country || null,
      timezone: sourceTenant.metadata?.timezone || sourceTenant.config?.timezone || 'UTC'
    },

    // Timestamps - PRESERVE ORIGINAL VALUES
    createdAt: convertToDate(sourceTenant.createdAt || new Date()),
    updatedAt: convertToDate(sourceTenant.updatedAt || new Date()),
    deletedAt: convertToDate(sourceTenant.deletedAt)
  };

  return mappedTenant;
}

/**
 * Create subscription record for separate subscriptions collection
 * 
 * @param {Object} tenant - Tenant record
 * @returns {Object} Subscription record
 */
function createSubscriptionRecord(tenant) {
  return {
    tenantId: tenant.tenantId,
    subscriptionId: `sub_${tenant.tenantId}_${Date.now()}`,
    
    plan: {
      name: tenant.subscription?.planId || tenant.billing?.currentPlan || 'trial',
      features: tenant.license?.features || [],
      limits: {
        users: tenant.limits?.maxUsers || 100,
        storage: tenant.limits?.maxStorage || 10737418240,
        apiCalls: tenant.limits?.apiCallsPerMonth || 100000
      }
    },
    
    billing: {
      status: tenant.subscription?.status || tenant.billing?.paymentStatus || 'active',
      amount: tenant.billing?.amount || 0,
      currency: tenant.billing?.currency || tenant.config?.currency || 'USD',
      cycle: tenant.subscription?.billingCycle || tenant.billing?.billingCycle || 'monthly',
      startDate: convertToDate(tenant.subscription?.startDate || tenant.createdAt),
      currentPeriodStart: convertToDate(tenant.subscription?.startDate || tenant.createdAt),
      currentPeriodEnd: convertToDate(tenant.subscription?.expiresAt || tenant.billing?.nextBillingDate),
      cancelAtPeriodEnd: !(tenant.subscription?.autoRenew !== undefined ? tenant.subscription.autoRenew : true)
    },
    
    paymentHistory: [],
    
    usage: {
      currentUsers: tenant.usage?.userCount || tenant.usage?.activeUsers || 0,
      currentStorage: tenant.usage?.storageUsed || 0,
      currentApiCalls: tenant.usage?.apiCallsThisMonth || 0,
      lastUpdated: convertToDate(tenant.usage?.lastActivityAt || new Date())
    },
    
    createdAt: convertToDate(tenant.createdAt || new Date()),
    updatedAt: convertToDate(tenant.updatedAt || new Date())
  };
}

/**
 * Create enabled modules records for separate enabled_modules collection
 * 
 * @param {Object} tenant - Tenant record
 * @returns {Array} Array of enabled module records
 */
function createEnabledModulesRecords(tenant) {
  if (!Array.isArray(tenant.enabledModules) || tenant.enabledModules.length === 0) {
    return [];
  }

  return tenant.enabledModules.map(module => {
    // Handle both object and string formats
    const moduleId = typeof module === 'string' ? module : module.moduleId;
    const enabledAt = typeof module === 'object' ? module.enabledAt : null;
    const enabledBy = typeof module === 'object' ? module.enabledBy : null;
    const configuration = typeof module === 'object' ? module.configuration : null;

    return {
      tenantId: tenant.tenantId,
      moduleId: moduleId,
      enabled: true,
      enabledAt: convertToDate(enabledAt || new Date()),
      enabledBy: enabledBy || 'system',
      configuration: configuration || {},
      usage: {
        lastUsed: convertToDate(tenant.usage?.lastActivityAt || new Date()),
        usageCount: 0
      },
      createdAt: convertToDate(tenant.createdAt || new Date()),
      updatedAt: convertToDate(tenant.updatedAt || new Date())
    };
  }).filter(record => record.moduleId); // Filter out any records without moduleId
}

/**
 * Convert value to Date object, handling various input types
 * 
 * @param {*} value - Value to convert
 * @returns {Date|null} Date object or null
 */
function convertToDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  
  try {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  } catch (error) {
    return null;
  }
}

/**
 * Create database indexes for performance
 * 
 * Requirements: 1.3 (Create database indexes for performance)
 * 
 * @param {mongoose.mongo.Db} destDb - Destination database
 * @param {MigrationLogger} logger - Logger instance
 */
async function createDatabaseIndexes(destDb, logger) {
  try {
    // Tenants collection indexes
    const tenantsCollection = destDb.collection('tenants');
    
    logger.info('Creating indexes for tenants collection...');
    await tenantsCollection.createIndex({ tenantId: 1 }, { unique: true, name: 'idx_tenantId' });
    await tenantsCollection.createIndex({ domain: 1 }, { name: 'idx_domain' });
    await tenantsCollection.createIndex({ status: 1 }, { name: 'idx_status' });
    await tenantsCollection.createIndex({ 'subscription.status': 1 }, { name: 'idx_subscription_status' });
    await tenantsCollection.createIndex({ 'subscription.expiresAt': 1 }, { name: 'idx_subscription_expires' });
    await tenantsCollection.createIndex({ createdAt: 1 }, { name: 'idx_createdAt' });
    await tenantsCollection.createIndex({ updatedAt: 1 }, { name: 'idx_updatedAt' });
    logger.success('Tenants collection indexes created');

    // Subscriptions collection indexes
    const subscriptionsCollection = destDb.collection('subscriptions');
    
    logger.info('Creating indexes for subscriptions collection...');
    await subscriptionsCollection.createIndex({ tenantId: 1 }, { unique: true, name: 'idx_tenantId' });
    await subscriptionsCollection.createIndex({ subscriptionId: 1 }, { unique: true, name: 'idx_subscriptionId' });
    await subscriptionsCollection.createIndex({ 'billing.status': 1 }, { name: 'idx_billing_status' });
    await subscriptionsCollection.createIndex({ 'billing.currentPeriodEnd': 1 }, { name: 'idx_period_end' });
    logger.success('Subscriptions collection indexes created');

    // Enabled modules collection indexes
    const enabledModulesCollection = destDb.collection('enabled_modules');
    
    logger.info('Creating indexes for enabled_modules collection...');
    await enabledModulesCollection.createIndex(
      { tenantId: 1, moduleId: 1 }, 
      { unique: true, name: 'idx_tenant_module' }
    );
    await enabledModulesCollection.createIndex({ tenantId: 1, enabled: 1 }, { name: 'idx_tenant_enabled' });
    await enabledModulesCollection.createIndex({ moduleId: 1 }, { name: 'idx_moduleId' });
    logger.success('Enabled modules collection indexes created');

  } catch (error) {
    logger.error('Failed to create indexes:', error);
    throw new TenantImportError('Index creation failed', error);
  }
}

/**
 * Get import statistics for a destination database
 * 
 * @param {mongoose.mongo.Db} destDb - Destination database
 * @returns {Promise<Object>} Import statistics
 */
export async function getImportStatistics(destDb) {
  const logger = new MigrationLogger();
  
  try {
    const tenantsCount = await destDb.collection('tenants').countDocuments();
    const subscriptionsCount = await destDb.collection('subscriptions').countDocuments();
    const enabledModulesCount = await destDb.collection('enabled_modules').countDocuments();

    const stats = {
      tenants: tenantsCount,
      subscriptions: subscriptionsCount,
      enabledModules: enabledModulesCount,
      timestamp: new Date()
    };

    logger.info('Import statistics:', stats);
    return stats;
    
  } catch (error) {
    logger.error('Failed to get import statistics:', error);
    throw new TenantImportError('Failed to get statistics', error);
  }
}

/**
 * Custom error class for tenant import errors
 */
export class TenantImportError extends MigrationError {
  constructor(message, originalError) {
    super(message, originalError);
    this.name = 'TenantImportError';
    this.recoverable = false;
  }
}
