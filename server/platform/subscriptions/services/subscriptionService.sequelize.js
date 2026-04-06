import { Op } from 'sequelize';
import Tenant from '../../tenants/models/Tenant.sequelize.js';
import Plan from '../models/Plan.sequelize.js';
import AppError from '../../../core/errors/AppError.js';
import { ERROR_TYPES } from '../../../core/errors/errorTypes.js';

/**
 * Subscription Management Service (Sequelize)
 * Handles subscription operations for tenants
 */
class SubscriptionService {
  /**
   * Assign plan to tenant
   */
  async assignPlan(tenantId, planId, billingCycle = 'monthly') {
    // Validate plan exists
    const plan = await Plan.findByPk(planId);
    if (!plan) {
      throw new AppError(
        'Plan not found',
        404,
        ERROR_TYPES.PLAN_NOT_FOUND
      );
    }

    if (!plan.is_active) {
      throw new AppError(
        'Plan is not active',
        400,
        ERROR_TYPES.PLAN_INACTIVE
      );
    }

    // Get tenant
    const tenant = await Tenant.findOne({ where: { tenant_id: tenantId } });
    if (!tenant) {
      throw new AppError(
        `Tenant with ID ${tenantId} not found`,
        404,
        ERROR_TYPES.TENANT_NOT_FOUND
      );
    }

    // Calculate expiration date
    const startDate = new Date();
    const expiresAt = new Date(startDate);
    
    if (billingCycle === 'yearly') {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    } else {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    }

    // Update tenant subscription
    const subscription = {
      planId: plan.id,
      status: 'active',
      startDate,
      expiresAt,
      autoRenew: true,
      billingCycle
    };

    // Update limits based on plan
    const limits = plan.limits || {};

    // Enable modules included in plan
    const includedModuleIds = plan.getIncludedModuleIds();
    
    // Always include hr-core
    if (!includedModuleIds.includes('hr-core')) {
      includedModuleIds.unshift('hr-core');
    }

    // Update enabled modules
    const enabledModules = includedModuleIds.map(moduleId => ({
      moduleId,
      enabledAt: new Date(),
      enabledBy: 'subscription'
    }));

    // Change status from trial to active if applicable
    const status = tenant.status === 'trial' ? 'active' : tenant.status;

    await tenant.update({
      subscription,
      limits,
      enabledModules,
      status
    });

    return await Tenant.findOne({
      where: { tenant_id: tenantId },
      include: [{ model: Plan, as: 'plan' }]
    });
  }

  /**
   * Enable module for tenant
   */
  async enableModule(tenantId, moduleId) {
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

    // Check if module is already enabled
    if (tenant.isModuleEnabled(moduleId)) {
      return tenant;
    }

    // Check if plan includes this module
    const plan = tenant.plan;
    if (plan && !plan.includesModule(moduleId)) {
      throw new AppError(
        `Module ${moduleId} is not included in current plan`,
        400,
        ERROR_TYPES.MODULE_NOT_IN_PLAN
      );
    }

    // Enable module
    tenant.enableModule(moduleId, 'subscription');
    await tenant.save();

    return tenant;
  }

  /**
   * Handle subscription expiration
   */
  async handleExpiration(tenantId) {
    const tenant = await Tenant.findOne({ where: { tenant_id: tenantId } });
    
    if (!tenant) {
      throw new AppError(
        `Tenant with ID ${tenantId} not found`,
        404,
        ERROR_TYPES.TENANT_NOT_FOUND
      );
    }

    const subscription = tenant.subscription || {};
    subscription.status = 'expired';
    
    await tenant.update({
      subscription,
      status: 'suspended'
    });

    return tenant;
  }

  /**
   * Renew subscription
   */
  async renewSubscription(tenantId, billingCycle = null) {
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

    const subscription = tenant.subscription || {};
    const cycle = billingCycle || subscription.billingCycle || 'monthly';
    
    const startDate = new Date();
    const expiresAt = new Date(startDate);
    
    if (cycle === 'yearly') {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    } else {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    }

    subscription.status = 'active';
    subscription.startDate = startDate;
    subscription.expiresAt = expiresAt;
    subscription.billingCycle = cycle;

    await tenant.update({
      subscription,
      status: 'active'
    });

    return tenant;
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(tenantId, immediate = false) {
    const tenant = await Tenant.findOne({ where: { tenant_id: tenantId } });
    
    if (!tenant) {
      throw new AppError(
        `Tenant with ID ${tenantId} not found`,
        404,
        ERROR_TYPES.TENANT_NOT_FOUND
      );
    }

    const subscription = tenant.subscription || {};
    subscription.status = 'cancelled';
    subscription.autoRenew = false;

    const updates = { subscription };

    if (immediate) {
      updates.status = 'cancelled';
    }

    await tenant.update(updates);

    return tenant;
  }
}

export default new SubscriptionService();
