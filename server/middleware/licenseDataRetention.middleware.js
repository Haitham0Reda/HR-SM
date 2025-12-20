import DataRetentionPolicy from '../models/DataRetentionPolicy.js';
import { companyLogger } from '../utils/companyLogger.js';

/**
 * Middleware to ensure license data is included in retention policies
 * This middleware automatically creates or updates retention policies for license data
 */
export const ensureLicenseDataRetention = async (req, res, next) => {
  try {
    const { tenantId } = req;
    
    if (!tenantId) {
      return next();
    }

    // Check if license data retention policy exists
    const existingPolicy = await DataRetentionPolicy.findOne({
      tenantId,
      dataType: 'license_data',
      status: 'active'
    });

    if (!existingPolicy) {
      // Create default license data retention policy
      const defaultLicenseRetentionPolicy = {
        policyName: 'License Data Retention Policy',
        description: 'Automatic retention policy for license validation and usage data',
        dataType: 'license_data',
        retentionPeriod: {
          value: 7,
          unit: 'years' // Keep license data for 7 years for compliance
        },
        archivalSettings: {
          enabled: true,
          archiveAfter: {
            value: 2,
            unit: 'years'
          },
          archiveLocation: 'both', // Local and cloud
          compressionEnabled: true,
          encryptionEnabled: true
        },
        deletionSettings: {
          softDelete: true,
          hardDeleteAfter: {
            value: 30,
            unit: 'days'
          },
          requireApproval: true,
          approvalRequired: ['admin', 'compliance_officer']
        },
        legalRequirements: {
          minimumRetention: {
            value: 5,
            unit: 'years'
          },
          maximumRetention: {
            value: 10,
            unit: 'years'
          },
          jurisdiction: 'US',
          regulatoryFramework: ['SOX', 'GDPR'],
          dataClassification: 'confidential'
        },
        executionSchedule: {
          frequency: 'monthly',
          time: '02:00',
          timezone: 'UTC'
        },
        createdBy: req.user?._id || null
      };

      const policy = new DataRetentionPolicy({
        tenantId,
        ...defaultLicenseRetentionPolicy
      });

      await policy.save();

      // Log policy creation
      companyLogger(tenantId).compliance('License data retention policy auto-created', {
        policyId: policy._id,
        dataType: 'license_data',
        retentionPeriod: policy.retentionPeriod,
        autoCreated: true,
        compliance: true,
        audit: true
      });

      console.log(`✅ Created license data retention policy for tenant ${tenantId}`);
    }

    next();
  } catch (error) {
    console.error('Failed to ensure license data retention policy:', error);
    // Don't block the request, just log the error
    next();
  }
};

/**
 * Middleware to validate license data retention compliance
 * Checks if license operations comply with retention policies
 */
export const validateLicenseRetentionCompliance = async (req, res, next) => {
  try {
    const { tenantId } = req;
    
    if (!tenantId) {
      return next();
    }

    // Get license data retention policy
    const policy = await DataRetentionPolicy.findOne({
      tenantId,
      dataType: 'license_data',
      status: 'active'
    });

    if (!policy) {
      // If no policy exists, create one
      return ensureLicenseDataRetention(req, res, next);
    }

    // Check if policy is due for execution
    if (policy.isDueForExecution()) {
      companyLogger(tenantId).compliance('License data retention policy due for execution', {
        policyId: policy._id,
        nextExecution: policy.nextExecution,
        lastExecuted: policy.lastExecuted,
        compliance: true,
        audit: true
      });
    }

    // Add policy info to request for use in controllers
    req.licenseRetentionPolicy = policy;

    next();
  } catch (error) {
    console.error('Failed to validate license retention compliance:', error);
    // Don't block the request, just log the error
    next();
  }
};

/**
 * Middleware to log license data access for retention tracking
 */
export const logLicenseDataAccess = (action = 'access') => {
  return async (req, res, next) => {
    try {
      const { tenantId, user } = req;
      const { licenseNumber, licenseId } = req.params;
      
      if (tenantId) {
        // Log license data access for retention tracking
        companyLogger(tenantId).compliance('License data accessed', {
          action,
          licenseNumber: licenseNumber || licenseId,
          userId: user?._id,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          endpoint: req.originalUrl,
          method: req.method,
          timestamp: new Date(),
          dataType: 'license_data',
          compliance: true,
          audit: true
        });
      }

      next();
    } catch (error) {
      console.error('Failed to log license data access:', error);
      // Don't block the request, just log the error
      next();
    }
  };
};

/**
 * Middleware to ensure license data is properly classified for retention
 */
export const classifyLicenseData = async (req, res, next) => {
  try {
    const { body } = req;
    
    // Add data classification metadata to license data
    if (body && typeof body === 'object') {
      body._dataClassification = {
        type: 'license_data',
        sensitivity: 'confidential',
        retentionRequired: true,
        complianceFrameworks: ['SOX', 'GDPR'],
        createdAt: new Date(),
        createdBy: req.user?._id
      };
    }

    next();
  } catch (error) {
    console.error('Failed to classify license data:', error);
    // Don't block the request, just log the error
    next();
  }
};

/**
 * Function to create license-specific retention policies for all tenants
 * This can be run as a migration or setup script
 */
export const createLicenseRetentionPoliciesForAllTenants = async () => {
  try {
    console.log('🔄 Creating license data retention policies for all tenants...');

    // Get all tenants (this would need to be adapted based on your tenant model)
    const mongoose = await import('mongoose');
    const Tenant = mongoose.model('Tenant');
    const tenants = await Tenant.find({ status: 'active' });

    let created = 0;
    let skipped = 0;

    for (const tenant of tenants) {
      try {
        // Check if policy already exists
        const existingPolicy = await DataRetentionPolicy.findOne({
          tenantId: tenant._id,
          dataType: 'license_data',
          status: 'active'
        });

        if (existingPolicy) {
          skipped++;
          continue;
        }

        // Create license data retention policy
        const policy = new DataRetentionPolicy({
          tenantId: tenant._id,
          policyName: 'License Data Retention Policy',
          description: 'Automatic retention policy for license validation and usage data',
          dataType: 'license_data',
          retentionPeriod: {
            value: 7,
            unit: 'years'
          },
          archivalSettings: {
            enabled: true,
            archiveAfter: {
              value: 2,
              unit: 'years'
            },
            archiveLocation: 'both',
            compressionEnabled: true,
            encryptionEnabled: true
          },
          deletionSettings: {
            softDelete: true,
            hardDeleteAfter: {
              value: 30,
              unit: 'days'
            },
            requireApproval: true,
            approvalRequired: ['admin', 'compliance_officer']
          },
          legalRequirements: {
            minimumRetention: {
              value: 5,
              unit: 'years'
            },
            maximumRetention: {
              value: 10,
              unit: 'years'
            },
            jurisdiction: 'US',
            regulatoryFramework: ['SOX', 'GDPR'],
            dataClassification: 'confidential'
          },
          executionSchedule: {
            frequency: 'monthly',
            time: '02:00',
            timezone: 'UTC'
          },
          createdBy: null // System created
        });

        await policy.save();
        created++;

        // Log policy creation
        companyLogger(tenant._id).compliance('License data retention policy created', {
          policyId: policy._id,
          dataType: 'license_data',
          systemCreated: true,
          compliance: true,
          audit: true
        });

      } catch (error) {
        console.error(`Failed to create license retention policy for tenant ${tenant._id}:`, error);
      }
    }

    console.log(`✅ License data retention policy creation complete:`);
    console.log(`   - Created: ${created} policies`);
    console.log(`   - Skipped: ${skipped} policies (already exist)`);
    console.log(`   - Total tenants: ${tenants.length}`);

    return { created, skipped, total: tenants.length };

  } catch (error) {
    console.error('Failed to create license retention policies for all tenants:', error);
    throw error;
  }
};

export default {
  ensureLicenseDataRetention,
  validateLicenseRetentionCompliance,
  logLicenseDataAccess,
  classifyLicenseData,
  createLicenseRetentionPoliciesForAllTenants
};