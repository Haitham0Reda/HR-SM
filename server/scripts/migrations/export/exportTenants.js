/**
 * Tenant Data Export Module
 * 
 * Exports tenant data from the source database (hrsm_platform) for migration.
 * Includes tenant records with related subscription and module data.
 * 
 * Requirements: 2.1
 */

import { MigrationLogger } from '../utils/migrationLogger.js';
import { MigrationError } from '../errors/MigrationErrors.js';

/**
 * Export all tenant records from source database
 * 
 * @param {mongoose.mongo.Db} sourceDb - Source database connection
 * @param {Object} options - Export options
 * @param {number} options.batchSize - Number of records to fetch per batch
 * @param {boolean} options.includeDeleted - Whether to include soft-deleted records
 * @returns {Promise<Object>} Export data with tenant records and metadata
 */
export async function exportTenants(sourceDb, options = {}) {
  const logger = new MigrationLogger();
  const batchSize = options.batchSize || 100;
  const includeDeleted = options.includeDeleted || false;

  try {
    logger.info('Starting tenant data export from source database');
    logger.info('Export options:', { batchSize, includeDeleted });

    // Build query filter
    const query = {};
    if (!includeDeleted) {
      // Exclude soft-deleted tenants (status: 'cancelled' or 'deleted')
      query.status = { $nin: ['cancelled', 'deleted'] };
    }

    // Get tenants collection
    const tenantsCollection = sourceDb.collection('tenants');

    // Count total records to export
    const totalCount = await tenantsCollection.countDocuments(query);
    logger.info(`Found ${totalCount} tenant records to export`);

    if (totalCount === 0) {
      logger.warn('No tenant records found in source database');
      return {
        tenants: [],
        metadata: {
          totalRecords: 0,
          exportedAt: new Date(),
          sourceDatabase: sourceDb.databaseName,
          includeDeleted
        }
      };
    }

    // Fetch all tenant records
    // Using cursor for memory efficiency with large datasets
    const tenants = [];
    const cursor = tenantsCollection.find(query).batchSize(batchSize);

    let processedCount = 0;
    while (await cursor.hasNext()) {
      const tenant = await cursor.next();
      
      // Structure tenant data for export
      const exportedTenant = structureTenantForExport(tenant);
      tenants.push(exportedTenant);
      
      processedCount++;
      
      // Log progress every batch
      if (processedCount % batchSize === 0) {
        logger.info(`Exported ${processedCount}/${totalCount} tenant records`);
      }
    }

    logger.success(`Successfully exported ${tenants.length} tenant records`);

    // Return structured export data
    return {
      tenants,
      metadata: {
        totalRecords: tenants.length,
        exportedAt: new Date(),
        sourceDatabase: sourceDb.databaseName,
        includeDeleted,
        batchSize
      }
    };

  } catch (error) {
    logger.error('Failed to export tenant data:', error);
    throw new TenantExportError('Tenant export failed', error);
  }
}

/**
 * Structure tenant data for export with proper schema
 * Maps source schema to destination schema format
 * 
 * @param {Object} tenant - Raw tenant document from source database
 * @returns {Object} Structured tenant data for migration
 */
function structureTenantForExport(tenant) {
  // Core tenant information
  const exportedTenant = {
    tenantId: tenant.tenantId,
    name: tenant.name,
    domain: tenant.domain || null,
    status: tenant.status || 'active',
    deploymentMode: tenant.deploymentMode || 'saas',

    // Subscription information
    subscription: {
      planId: tenant.subscription?.planId || null,
      status: tenant.subscription?.status || 'trial',
      startDate: tenant.subscription?.startDate || tenant.createdAt,
      expiresAt: tenant.subscription?.expiresAt || null,
      autoRenew: tenant.subscription?.autoRenew !== undefined ? tenant.subscription.autoRenew : true,
      billingCycle: tenant.subscription?.billingCycle || 'monthly'
    },

    // Enabled modules with metadata
    enabledModules: (tenant.enabledModules || []).map(module => ({
      moduleId: module.moduleId,
      enabledAt: module.enabledAt || new Date(),
      enabledBy: module.enabledBy || 'system',
      configuration: module.configuration || {}
    })),

    // Configuration settings
    config: {
      timezone: tenant.config?.timezone || 'UTC',
      locale: tenant.config?.locale || 'en-US',
      dateFormat: tenant.config?.dateFormat || 'YYYY-MM-DD',
      timeFormat: tenant.config?.timeFormat || '24h',
      currency: tenant.config?.currency || 'USD',
      features: tenant.config?.features || {}
    },

    // Usage limits and restrictions
    limits: {
      maxUsers: tenant.limits?.maxUsers || tenant.restrictions?.maxUsers || 100,
      maxStorage: tenant.limits?.maxStorage || tenant.restrictions?.maxStorage || 10737418240,
      apiCallsPerMonth: tenant.limits?.apiCallsPerMonth || tenant.restrictions?.maxAPICallsPerMonth || 100000
    },

    // Current usage metrics
    usage: {
      userCount: tenant.usage?.userCount || tenant.usage?.activeUsers || 0,
      storageUsed: tenant.usage?.storageUsed || 0,
      apiCallsThisMonth: tenant.usage?.apiCallsThisMonth || 0,
      lastResetDate: tenant.usage?.lastResetDate || new Date(),
      activeUsers: tenant.usage?.activeUsers || 0,
      lastActivityAt: tenant.usage?.lastActivityAt || new Date()
    },

    // Performance and operational metrics
    metrics: {
      totalSessions: tenant.metrics?.totalSessions || 0,
      avgSessionDuration: tenant.metrics?.avgSessionDuration || 0,
      totalDocuments: tenant.metrics?.totalDocuments || 0,
      totalReports: tenant.metrics?.totalReports || 0,
      errorRate: tenant.metrics?.errorRate || 0,
      responseTime: tenant.metrics?.responseTime || 0,
      cpuUsage: tenant.metrics?.cpuUsage || 0,
      memoryUsage: tenant.metrics?.memoryUsage || 0,
      diskUsage: tenant.metrics?.diskUsage || 0,
      uptime: tenant.metrics?.uptime || 0,
      availability: tenant.metrics?.availability || 100
    },

    // Billing information
    billing: {
      currentPlan: tenant.billing?.currentPlan || 'trial',
      billingCycle: tenant.billing?.billingCycle || 'monthly',
      nextBillingDate: tenant.billing?.nextBillingDate || null,
      paymentStatus: tenant.billing?.paymentStatus || 'active',
      totalRevenue: tenant.billing?.totalRevenue || 0,
      lastPaymentDate: tenant.billing?.lastPaymentDate || null,
      paymentMethod: tenant.billing?.paymentMethod || 'credit_card',
      currency: tenant.config?.currency || 'USD',
      amount: tenant.billing?.amount || 0
    },

    // License information
    license: {
      licenseKey: tenant.license?.licenseKey || null,
      licenseNumber: tenant.license?.licenseNumber || null,
      licenseType: tenant.license?.licenseType || null,
      licenseStatus: tenant.license?.licenseStatus || 'active',
      expiresAt: tenant.license?.expiresAt || tenant.license?.licenseExpiresAt || null,
      machineId: tenant.license?.machineId || null,
      activatedAt: tenant.license?.activatedAt || null,
      lastValidatedAt: tenant.license?.lastValidatedAt || null,
      validationCount: tenant.license?.validationCount || 0,
      features: tenant.license?.features || [],
      limits: tenant.license?.limits || {}
    },

    // Compliance information
    compliance: {
      dataResidency: tenant.compliance?.dataResidency || 'US',
      gdprCompliant: tenant.compliance?.gdprCompliant || false,
      soc2Certified: tenant.compliance?.soc2Certified || false,
      lastAuditDate: tenant.compliance?.lastAuditDate || null,
      complianceNotes: tenant.compliance?.complianceNotes || ''
    },

    // Contact information
    contactInfo: {
      adminEmail: tenant.contactInfo?.adminEmail || null,
      adminName: tenant.contactInfo?.adminName || null,
      phone: tenant.contactInfo?.phone || null,
      address: tenant.contactInfo?.address || {
        street: null,
        city: null,
        state: null,
        country: null,
        postalCode: null
      }
    },

    // Additional metadata
    metadata: {
      industry: tenant.metadata?.industry || null,
      companySize: tenant.metadata?.companySize || null,
      notes: tenant.metadata?.notes || '',
      country: tenant.contactInfo?.address?.country || null,
      timezone: tenant.config?.timezone || 'UTC'
    },

    // Timestamps
    createdAt: tenant.createdAt || new Date(),
    updatedAt: tenant.updatedAt || new Date(),
    deletedAt: tenant.deletedAt || null
  };

  return exportedTenant;
}

/**
 * Export tenant count for validation
 * 
 * @param {mongoose.mongo.Db} sourceDb - Source database connection
 * @param {Object} query - Query filter
 * @returns {Promise<number>} Count of tenant records
 */
export async function getTenantCount(sourceDb, query = {}) {
  const logger = new MigrationLogger();
  
  try {
    const tenantsCollection = sourceDb.collection('tenants');
    const count = await tenantsCollection.countDocuments(query);
    logger.info(`Tenant count: ${count}`);
    return count;
  } catch (error) {
    logger.error('Failed to get tenant count:', error);
    throw new TenantExportError('Failed to count tenants', error);
  }
}

/**
 * Export specific tenant by tenantId
 * 
 * @param {mongoose.mongo.Db} sourceDb - Source database connection
 * @param {string} tenantId - Tenant ID to export
 * @returns {Promise<Object|null>} Exported tenant data or null if not found
 */
export async function exportTenantById(sourceDb, tenantId) {
  const logger = new MigrationLogger();
  
  try {
    logger.info(`Exporting tenant: ${tenantId}`);
    
    const tenantsCollection = sourceDb.collection('tenants');
    const tenant = await tenantsCollection.findOne({ tenantId });
    
    if (!tenant) {
      logger.warn(`Tenant not found: ${tenantId}`);
      return null;
    }
    
    const exportedTenant = structureTenantForExport(tenant);
    logger.success(`Successfully exported tenant: ${tenantId}`);
    
    return exportedTenant;
  } catch (error) {
    logger.error(`Failed to export tenant ${tenantId}:`, error);
    throw new TenantExportError(`Failed to export tenant ${tenantId}`, error);
  }
}

/**
 * Custom error class for tenant export errors
 */
export class TenantExportError extends MigrationError {
  constructor(message, originalError) {
    super(message, originalError);
    this.name = 'TenantExportError';
    this.recoverable = false;
  }
}
