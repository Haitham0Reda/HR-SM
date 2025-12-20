import Tenant from '../models/Tenant.js';
import AppError from '../../../core/errors/AppError.js';
import { ERROR_TYPES } from '../../../core/errors/errorTypes.js';

/**
 * Tenant Service
 * Handles CRUD operations for tenants
 */
class TenantService {
  /**
   * Get tenant by ID
   * 
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Tenant object
   * @throws {AppError} If tenant not found
   */
  async getTenantById(tenantId) {
    const tenant = await Tenant.findOne({ tenantId }).populate('subscription.planId');

    if (!tenant) {
      throw new AppError(
        `Tenant with ID ${tenantId} not found`,
        404,
        ERROR_TYPES.TENANT_NOT_FOUND
      );
    }

    return tenant;
  }

  /**
   * Get tenant by MongoDB _id
   * 
   * @param {string} id - MongoDB _id
   * @returns {Promise<Object>} Tenant object
   * @throws {AppError} If tenant not found
   */
  async getTenantByMongoId(id) {
    const tenant = await Tenant.findById(id).populate('subscription.planId');

    if (!tenant) {
      throw new AppError(
        `Tenant not found`,
        404,
        ERROR_TYPES.TENANT_NOT_FOUND
      );
    }

    return tenant;
  }

  /**
   * List all tenants with optional filters
   * 
   * @param {Object} filters - Filter options
   * @param {string} filters.status - Filter by status
   * @param {string} filters.deploymentMode - Filter by deployment mode
   * @param {number} filters.page - Page number (default: 1)
   * @param {number} filters.limit - Items per page (default: 20)
   * @returns {Promise<Object>} Paginated tenants
   */
  async listTenants(filters = {}) {
    const {
      status,
      deploymentMode,
      page = 1,
      limit = 20
    } = filters;

    const query = {};

    if (status) {
      query.status = status;
    }

    if (deploymentMode) {
      query.deploymentMode = deploymentMode;
    }

    const skip = (page - 1) * limit;

    const [tenants, total] = await Promise.all([
      Tenant.find(query)
        .populate('subscription.planId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Tenant.countDocuments(query)
    ]);

    return {
      tenants,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Update tenant
   * 
   * @param {string} tenantId - Tenant ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated tenant
   * @throws {AppError} If update fails
   */
  async updateTenant(tenantId, updateData) {
    // Don't allow updating certain fields directly
    delete updateData.tenantId;
    delete updateData.createdAt;
    delete updateData.usage;

    const tenant = await Tenant.findOneAndUpdate(
      { tenantId },
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('subscription.planId');

    if (!tenant) {
      throw new AppError(
        `Tenant with ID ${tenantId} not found`,
        404,
        ERROR_TYPES.TENANT_NOT_FOUND
      );
    }

    return tenant;
  }

  /**
   * Suspend tenant
   * 
   * @param {string} tenantId - Tenant ID
   * @param {string} reason - Reason for suspension
   * @returns {Promise<Object>} Updated tenant
   * @throws {AppError} If suspension fails
   */
  async suspendTenant(tenantId, reason = '') {
    const tenant = await Tenant.findOneAndUpdate(
      { tenantId },
      {
        status: 'suspended',
        'metadata.suspensionReason': reason,
        'metadata.suspendedAt': new Date(),
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!tenant) {
      throw new AppError(
        `Tenant with ID ${tenantId} not found`,
        404,
        ERROR_TYPES.TENANT_NOT_FOUND
      );
    }

    return tenant;
  }

  /**
   * Reactivate suspended tenant
   * 
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated tenant
   * @throws {AppError} If reactivation fails
   */
  async reactivateTenant(tenantId) {
    const tenant = await Tenant.findOne({ tenantId });

    if (!tenant) {
      throw new AppError(
        `Tenant with ID ${tenantId} not found`,
        404,
        ERROR_TYPES.TENANT_NOT_FOUND
      );
    }

    if (tenant.status !== 'suspended') {
      throw new AppError(
        'Only suspended tenants can be reactivated',
        400,
        ERROR_TYPES.INVALID_OPERATION
      );
    }

    tenant.status = 'active';
    tenant.updatedAt = new Date();

    // Clear suspension metadata
    if (tenant.metadata) {
      delete tenant.metadata.suspensionReason;
      delete tenant.metadata.suspendedAt;
    }

    await tenant.save();

    return tenant;
  }

  /**
   * Delete tenant (soft delete - archive)
   * 
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Archived tenant
   * @throws {AppError} If deletion fails
   */
  async deleteTenant(tenantId) {
    const tenant = await Tenant.findOne({ tenantId });

    if (!tenant) {
      throw new AppError(
        `Tenant with ID ${tenantId} not found`,
        404,
        ERROR_TYPES.TENANT_NOT_FOUND
      );
    }

    // Archive tenant by changing status
    tenant.status = 'cancelled';
    tenant.updatedAt = new Date();
    tenant.metadata = tenant.metadata || {};
    tenant.metadata.archivedAt = new Date();

    await tenant.save();

    return tenant;
  }

  /**
   * Update tenant usage statistics
   * 
   * @param {string} tenantId - Tenant ID
   * @param {Object} usageData - Usage data to update
   * @returns {Promise<Object>} Updated tenant
   */
  async updateUsage(tenantId, usageData) {
    const tenant = await Tenant.findOne({ tenantId });

    if (!tenant) {
      throw new AppError(
        `Tenant with ID ${tenantId} not found`,
        404,
        ERROR_TYPES.TENANT_NOT_FOUND
      );
    }

    // Update usage fields
    if (usageData.userCount !== undefined) {
      tenant.usage.userCount = usageData.userCount;
    }

    if (usageData.storageUsed !== undefined) {
      tenant.usage.storageUsed = usageData.storageUsed;
    }

    if (usageData.apiCallsThisMonth !== undefined) {
      tenant.usage.apiCallsThisMonth = usageData.apiCallsThisMonth;
    }

    await tenant.save();

    return tenant;
  }

  /**
   * Increment API call counter
   * 
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<void>}
   */
  async incrementApiCalls(tenantId) {
    await Tenant.findOneAndUpdate(
      { tenantId },
      { $inc: { 'usage.apiCallsThisMonth': 1 } }
    );
  }

  /**
   * Check if tenant has exceeded limits
   * 
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Exceeded limits
   */
  async checkLimits(tenantId) {
    const tenant = await this.getTenantById(tenantId);
    return tenant.checkLimits();
  }

  /**
   * Reset monthly usage for all tenants
   * 
   * @returns {Promise<number>} Number of tenants reset
   */
  async resetMonthlyUsage() {
    const result = await Tenant.updateMany(
      {},
      {
        'usage.apiCallsThisMonth': 0,
        'usage.lastResetDate': new Date()
      }
    );

    return result.modifiedCount;
  }

  /**
   * Get tenant statistics
   * 
   * @returns {Promise<Object>} Statistics
   */
  async getStatistics() {
    const [
      totalTenants,
      activeTenants,
      suspendedTenants,
      trialTenants,
      cancelledTenants
    ] = await Promise.all([
      Tenant.countDocuments(),
      Tenant.countDocuments({ status: 'active' }),
      Tenant.countDocuments({ status: 'suspended' }),
      Tenant.countDocuments({ status: 'trial' }),
      Tenant.countDocuments({ status: 'cancelled' })
    ]);

    return {
      total: totalTenants,
      active: activeTenants,
      suspended: suspendedTenants,
      trial: trialTenants,
      cancelled: cancelledTenants
    };
  }

  /**
   * Get tenant metrics with aggregation
   * 
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Aggregated metrics
   */
  async getTenantMetricsAggregation(tenantId) {
    const result = await Tenant.aggregate([
      { $match: { tenantId } },
      {
        $project: {
          tenantId: 1,
          name: 1,
          // Usage percentages
          storageUsagePercentage: {
            $cond: {
              if: { $gt: ['$restrictions.maxStorage', 0] },
              then: {
                $multiply: [
                  { $divide: ['$usage.storageUsed', { $multiply: ['$restrictions.maxStorage', 1024, 1024] }] },
                  100
                ]
              },
              else: 0
            }
          },
          userUsagePercentage: {
            $cond: {
              if: { $gt: ['$restrictions.maxUsers', 0] },
              then: {
                $multiply: [
                  { $divide: ['$usage.activeUsers', '$restrictions.maxUsers'] },
                  100
                ]
              },
              else: 0
            }
          },
          apiUsagePercentage: {
            $cond: {
              if: { $gt: ['$restrictions.maxAPICallsPerMonth', 0] },
              then: {
                $multiply: [
                  { $divide: ['$usage.apiCallsThisMonth', '$restrictions.maxAPICallsPerMonth'] },
                  100
                ]
              },
              else: 0
            }
          },
          // License days remaining
          licenseDaysRemaining: {
            $cond: {
              if: { $ne: ['$license.expiresAt', null] },
              then: {
                $divide: [
                  { $subtract: ['$license.expiresAt', new Date()] },
                  86400000 // milliseconds in a day
                ]
              },
              else: null
            }
          },
          // Risk factors
          isHighRisk: {
            $or: [
              { $gte: ['$metrics.errorRate', 5] },
              { $lte: ['$metrics.availability', 99] },
              { $eq: ['$billing.paymentStatus', 'past_due'] },
              {
                $lte: [
                  '$license.expiresAt',
                  new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
                ]
              }
            ]
          }
        }
      }
    ]);

    return result[0] || null;
  }

  /**
   * Bulk update tenants
   * 
   * @param {Array} tenantIds - Array of tenant IDs
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object>} Update result
   */
  async bulkUpdateTenants(tenantIds, updates) {
    // Don't allow updating certain fields
    delete updates.tenantId;
    delete updates.createdAt;
    delete updates.usage;

    const result = await Tenant.updateMany(
      { tenantId: { $in: tenantIds } },
      { ...updates, updatedAt: new Date() },
      { runValidators: true }
    );

    return result;
  }

  /**
   * Bulk suspend tenants
   * 
   * @param {Array} tenantIds - Array of tenant IDs
   * @param {string} reason - Suspension reason
   * @returns {Promise<Object>} Update result
   */
  async bulkSuspendTenants(tenantIds, reason = '') {
    const result = await Tenant.updateMany(
      { tenantId: { $in: tenantIds } },
      {
        status: 'suspended',
        'metadata.suspensionReason': reason,
        'metadata.suspendedAt': new Date(),
        updatedAt: new Date()
      }
    );

    return result;
  }

  /**
   * Bulk reactivate tenants
   * 
   * @param {Array} tenantIds - Array of tenant IDs
   * @returns {Promise<Object>} Update result
   */
  async bulkReactivateTenants(tenantIds) {
    const result = await Tenant.updateMany(
      { 
        tenantId: { $in: tenantIds },
        status: 'suspended'
      },
      {
        status: 'active',
        $unset: {
          'metadata.suspensionReason': '',
          'metadata.suspendedAt': ''
        },
        updatedAt: new Date()
      }
    );

    return result;
  }

  /**
   * Bulk enable module for tenants
   * 
   * @param {Array} tenantIds - Array of tenant IDs
   * @param {string} moduleId - Module ID to enable
   * @param {string} enabledBy - User who enabled the module
   * @returns {Promise<Array>} Updated tenants
   */
  async bulkEnableModule(tenantIds, moduleId, enabledBy = 'platform-admin') {
    const tenants = await Tenant.find({ tenantId: { $in: tenantIds } });
    
    const updatedTenants = [];
    for (const tenant of tenants) {
      if (!tenant.isModuleEnabled(moduleId)) {
        tenant.enableModule(moduleId, enabledBy);
        await tenant.save();
        updatedTenants.push(tenant);
      }
    }

    return updatedTenants;
  }

  /**
   * Bulk disable module for tenants
   * 
   * @param {Array} tenantIds - Array of tenant IDs
   * @param {string} moduleId - Module ID to disable
   * @returns {Promise<Array>} Updated tenants
   */
  async bulkDisableModule(tenantIds, moduleId) {
    const tenants = await Tenant.find({ tenantId: { $in: tenantIds } });
    
    const updatedTenants = [];
    for (const tenant of tenants) {
      if (tenant.isModuleEnabled(moduleId)) {
        tenant.disableModule(moduleId);
        await tenant.save();
        updatedTenants.push(tenant);
      }
    }

    return updatedTenants;
  }

  /**
   * Create tenant with license integration
   * 
   * @param {Object} data - Creation data
   * @param {Object} data.tenantData - Tenant information
   * @param {Object} data.licenseData - License configuration
   * @param {Object} data.adminUser - Admin user data
   * @param {string} data.createdBy - Creator ID
   * @returns {Promise<Object>} Created tenant and license info
   */
  async createTenantWithLicense({ tenantData, licenseData, adminUser, createdBy }) {
    // Import license service (assuming it exists)
    const licenseService = await import('../../../services/licenseValidationService.js');
    
    try {
      // First, create the license via license server
      const licenseResponse = await licenseService.default.createLicense({
        tenantId: tenantData.tenantId || tenantData.name.toLowerCase().replace(/\s+/g, '-'),
        tenantName: tenantData.name,
        type: licenseData.type || 'trial',
        modules: licenseData.modules || ['hr-core'],
        maxUsers: licenseData.maxUsers || 50,
        maxStorage: licenseData.maxStorage || 10240,
        maxAPICallsPerMonth: licenseData.maxAPICallsPerMonth || 100000,
        expiresAt: licenseData.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        domain: tenantData.domain,
        createdBy
      });

      // Create tenant with license information
      const tenant = new Tenant({
        ...tenantData,
        tenantId: tenantData.tenantId || tenantData.name.toLowerCase().replace(/\s+/g, '-'),
        license: {
          licenseKey: licenseResponse.token,
          licenseNumber: licenseResponse.licenseNumber,
          licenseType: licenseData.type || 'trial',
          licenseStatus: 'active',
          expiresAt: licenseData.expiresAt,
          licenseExpiresAt: licenseData.expiresAt,
          features: licenseData.modules || ['hr-core'],
          limits: {
            maxUsers: licenseData.maxUsers || 50,
            maxStorage: licenseData.maxStorage || 10240,
            maxAPICallsPerMonth: licenseData.maxAPICallsPerMonth || 100000
          }
        },
        restrictions: {
          maxUsers: licenseData.maxUsers || 50,
          maxStorage: licenseData.maxStorage || 10240,
          maxAPICallsPerMonth: licenseData.maxAPICallsPerMonth || 100000
        },
        billing: {
          currentPlan: licenseData.type || 'trial'
        }
      });

      await tenant.save();

      // Create admin user (this would typically be handled by tenant provisioning service)
      // For now, we'll return the tenant and license info
      
      return {
        tenant,
        license: {
          licenseNumber: licenseResponse.licenseNumber,
          token: licenseResponse.token,
          expiresAt: licenseData.expiresAt
        },
        adminUser: {
          // This would contain the created admin user info
          email: adminUser.email,
          created: true
        }
      };
    } catch (error) {
      throw new AppError(
        `Failed to create tenant with license: ${error.message}`,
        500,
        ERROR_TYPES.TENANT_CREATION_FAILED
      );
    }
  }

  /**
   * Get license status for tenant
   * 
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} License status
   */
  async getLicenseStatus(tenantId) {
    const tenant = await this.getTenantById(tenantId);
    
    if (!tenant.license?.licenseKey) {
      return {
        status: 'unlicensed',
        message: 'No license found for this tenant'
      };
    }

    // Validate license with license server
    const licenseService = await import('../../../services/licenseValidationService.js');
    
    try {
      const validationResult = await licenseService.default.validateLicense(
        tenant.license.licenseKey,
        tenant.tenantId
      );

      return {
        status: validationResult.valid ? 'valid' : 'invalid',
        licenseNumber: tenant.license.licenseNumber,
        licenseType: tenant.license.licenseType,
        expiresAt: tenant.license.expiresAt,
        daysRemaining: tenant.licenseDaysRemaining,
        features: tenant.license.features,
        lastValidated: tenant.license.lastValidatedAt,
        validationCount: tenant.license.validationCount,
        validationResult
      };
    } catch (error) {
      return {
        status: 'validation_failed',
        error: error.message,
        licenseNumber: tenant.license.licenseNumber,
        lastValidated: tenant.license.lastValidatedAt
      };
    }
  }

  /**
   * Update tenant license
   * 
   * @param {string} tenantId - Tenant ID
   * @param {Object} licenseData - License data to update
   * @returns {Promise<Object>} Updated tenant
   */
  async updateTenantLicense(tenantId, licenseData) {
    const tenant = await this.getTenantById(tenantId);

    // Update license fields
    if (licenseData.licenseKey) {
      tenant.license.licenseKey = licenseData.licenseKey;
    }
    if (licenseData.licenseNumber) {
      tenant.license.licenseNumber = licenseData.licenseNumber;
    }
    if (licenseData.expiresAt) {
      tenant.license.expiresAt = licenseData.expiresAt;
      tenant.license.licenseExpiresAt = licenseData.expiresAt;
    }
    if (licenseData.licenseType) {
      tenant.license.licenseType = licenseData.licenseType;
    }
    if (licenseData.features) {
      tenant.license.features = licenseData.features;
    }

    await tenant.save();
    return tenant;
  }

  /**
   * Get tenants needing attention
   * 
   * @returns {Promise<Array>} Tenants needing attention
   */
  async getTenantsNeedingAttention() {
    return await Tenant.findTenantsNeedingAttention();
  }

  /**
   * Get tenant analytics
   * 
   * @returns {Promise<Object>} Analytics data
   */
  async getTenantAnalytics() {
    const [
      basicAnalytics,
      revenueByPlan,
      usageAnalytics,
      performanceMetrics,
      complianceOverview
    ] = await Promise.all([
      Tenant.getAnalytics(),
      Tenant.getRevenueByPlan(),
      Tenant.getUsageAnalytics(),
      Tenant.getPerformanceMetrics(),
      Tenant.getComplianceOverview()
    ]);

    return {
      basic: basicAnalytics[0] || {},
      revenue: {
        byPlan: revenueByPlan,
        total: basicAnalytics[0]?.totalRevenue || 0
      },
      usage: usageAnalytics[0] || {},
      performance: performanceMetrics[0] || {},
      compliance: complianceOverview[0] || {}
    };
  }

  /**
   * Get revenue analytics
   * 
   * @param {string} period - Period for analytics ('month', 'quarter', 'year')
   * @returns {Promise<Object>} Revenue analytics
   */
  async getRevenueAnalytics(period = 'month') {
    const revenueByPlan = await Tenant.getRevenueByPlan();
    
    // This would typically include time-series data
    // For now, return current revenue breakdown
    return {
      byPlan: revenueByPlan,
      period,
      total: revenueByPlan.reduce((sum, plan) => sum + (plan.totalRevenue || 0), 0),
      growth: 0 // Would be calculated from historical data
    };
  }

  /**
   * Get usage analytics
   * 
   * @returns {Promise<Object>} Usage analytics
   */
  async getUsageAnalytics() {
    return await Tenant.getUsageAnalytics();
  }

  /**
   * Get performance analytics
   * 
   * @returns {Promise<Object>} Performance analytics
   */
  async getPerformanceAnalytics() {
    return await Tenant.getPerformanceMetrics();
  }
}

export default new TenantService();
