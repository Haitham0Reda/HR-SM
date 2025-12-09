const Tenant = require('../models/Tenant');
const AppError = require('../../../core/errors/AppError');
const { ERROR_TYPES } = require('../../../core/errors/errorTypes');

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
}

module.exports = new TenantService();
