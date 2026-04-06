import { Op } from 'sequelize';
import Tenant from '../models/Tenant.sequelize.js';
import Plan from '../../subscriptions/models/Plan.sequelize.js';
import AppError from '../../../core/errors/AppError.js';
import { ERROR_TYPES } from '../../../core/errors/errorTypes.js';

/**
 * Tenant Service (Sequelize)
 * Handles CRUD operations for tenants
 */
class TenantService {
  /**
   * Get tenant by ID
   */
  async getTenantById(tenantId) {
    const tenant = await Tenant.findOne({
      where: { tenant_id: tenantId },
      include: [{ model: Plan, as: 'plan' }]
    });

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
   * Get tenant by UUID
   */
  async getTenantByUUID(id) {
    const tenant = await Tenant.findByPk(id, {
      include: [{ model: Plan, as: 'plan' }]
    });

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
   */
  async listTenants(filters = {}) {
    const {
      status,
      deploymentMode,
      page = 1,
      limit = 20
    } = filters;

    const where = {};

    if (status) where.status = status;
    if (deploymentMode) where.deployment_mode = deploymentMode;

    const offset = (page - 1) * limit;

    const { count, rows } = await Tenant.findAndCountAll({
      where,
      include: [{ model: Plan, as: 'plan' }],
      order: [['created_at', 'DESC']],
      offset,
      limit
    });

    return {
      tenants: rows,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit)
      }
    };
  }

  /**
   * Update tenant
   */
  async updateTenant(tenantId, updateData) {
    // Don't allow updating certain fields directly
    delete updateData.tenantId;
    delete updateData.createdAt;
    delete updateData.usage;

    const tenant = await Tenant.findOne({
      where: { tenant_id: tenantId }
    });

    if (!tenant) {
      throw new AppError(
        `Tenant with ID ${tenantId} not found`,
        404,
        ERROR_TYPES.TENANT_NOT_FOUND
      );
    }

    await tenant.update(updateData);

    return await Tenant.findOne({
      where: { tenant_id: tenantId },
      include: [{ model: Plan, as: 'plan' }]
    });
  }

  /**
   * Suspend tenant
   */
  async suspendTenant(tenantId, reason = '') {
    const tenant = await Tenant.findOne({
      where: { tenant_id: tenantId }
    });

    if (!tenant) {
      throw new AppError(
        `Tenant with ID ${tenantId} not found`,
        404,
        ERROR_TYPES.TENANT_NOT_FOUND
      );
    }

    const metadata = tenant.metadata || {};
    metadata.suspensionReason = reason;
    metadata.suspendedAt = new Date();

    await tenant.update({
      status: 'suspended',
      metadata
    });

    return tenant;
  }

  /**
   * Reactivate tenant
   */
  async reactivateTenant(tenantId) {
    const tenant = await Tenant.findOne({
      where: { tenant_id: tenantId }
    });

    if (!tenant) {
      throw new AppError(
        `Tenant with ID ${tenantId} not found`,
        404,
        ERROR_TYPES.TENANT_NOT_FOUND
      );
    }

    const metadata = tenant.metadata || {};
    delete metadata.suspensionReason;
    delete metadata.suspendedAt;
    metadata.reactivatedAt = new Date();

    await tenant.update({
      status: 'active',
      metadata
    });

    return tenant;
  }

  /**
   * Delete tenant
   */
  async deleteTenant(tenantId) {
    const tenant = await Tenant.findOne({
      where: { tenant_id: tenantId }
    });

    if (!tenant) {
      throw new AppError(
        `Tenant with ID ${tenantId} not found`,
        404,
        ERROR_TYPES.TENANT_NOT_FOUND
      );
    }

    await tenant.destroy();

    return { message: 'Tenant deleted successfully' };
  }

  /**
   * Update tenant usage
   */
  async updateUsage(tenantId, usageData) {
    const tenant = await Tenant.findOne({
      where: { tenant_id: tenantId }
    });

    if (!tenant) {
      throw new AppError(
        `Tenant with ID ${tenantId} not found`,
        404,
        ERROR_TYPES.TENANT_NOT_FOUND
      );
    }

    const usage = { ...tenant.usage, ...usageData };
    await tenant.update({ usage });

    return tenant;
  }

  /**
   * Check tenant limits
   */
  async checkLimits(tenantId) {
    const tenant = await this.getTenantById(tenantId);
    return tenant.checkLimits();
  }

  /**
   * Reset monthly usage
   */
  async resetMonthlyUsage(tenantId) {
    const tenant = await Tenant.findOne({
      where: { tenant_id: tenantId }
    });

    if (!tenant) {
      throw new AppError(
        `Tenant with ID ${tenantId} not found`,
        404,
        ERROR_TYPES.TENANT_NOT_FOUND
      );
    }

    tenant.resetMonthlyUsage();
    await tenant.save();

    return tenant;
  }
}

export default new TenantService();
