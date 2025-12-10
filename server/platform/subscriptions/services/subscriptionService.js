import Tenant from '../../tenants/models/Tenant.js';
import Plan from '../models/Plan.js';
import AppError from '../../../core/errors/AppError.js';
import { ERROR_TYPES } from '../../../core/errors/errorTypes.js';

/**
 * Subscription Management Service
 * Handles subscription operations for tenants
 */
class SubscriptionService {
  /**
   * Assign plan to tenant
   * 
   * @param {string} tenantId - Tenant ID
   * @param {string} planId - Plan ID (MongoDB _id)
   * @param {string} billingCycle - monthly or yearly
   * @returns {Promise<Object>} Updated tenant
   * @throws {AppError} If assignment fails
   */
  async assignPlan(tenantId, planId, billingCycle = 'monthly') {
    // Validate plan exists
    const plan = await Plan.findById(planId);
    if (!plan) {
      throw new AppError(
        'Plan not found',
        404,
        ERROR_TYPES.PLAN_NOT_FOUND
      );
    }

    if (!plan.isActive) {
      throw new AppError(
        'Plan is not active',
        400,
        ERROR_TYPES.PLAN_INACTIVE
      );
    }

    // Get tenant
    const tenant = await Tenant.findOne({ tenantId });
    if (!tenant) {
      throw new AppError(
        `Tenant with ID ${tenantId} not found`,
        404,
        ERROR_TYPES.TENANT_NOT_FOUND
      );
    }

    // Calculate expiration date based on billing cycle
    const startDate = new Date();
    const expiresAt = new Date(startDate);
    
    if (billingCycle === 'yearly') {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    } else {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    }

    // Update tenant subscription
    tenant.subscription = {
      planId: plan._id,
      status: 'active',
      startDate,
      expiresAt,
      autoRenew: true,
      billingCycle
    };

    // Update limits based on plan
    tenant.limits = {
      maxUsers: plan.limits.maxUsers,
      maxStorage: plan.limits.maxStorage,
      apiCallsPerMonth: plan.limits.apiCallsPerMonth
    };

    // Enable modules included in plan
    const includedModuleIds = plan.getIncludedModuleIds();
    
    // Always include hr-core
    if (!includedModuleIds.includes('hr-core')) {
      includedModuleIds.unshift('hr-core');
    }

    // Update enabled modules
    tenant.enabledModules = includedModuleIds.map(moduleId => ({
      moduleId,
      enabledAt: new Date(),
      enabledBy: 'subscription'
    }));

    // Change status from trial to active if applicable
    if (tenant.status === 'trial') {
      tenant.status = 'active';
    }

    await tenant.save();

    return tenant.populate('subscription.planId');
  }

  /**
   * Enable module for tenant based on plan
   * 
   * @param {string} tenantId - Tenant ID
   * @param {string} moduleId - Module ID to enable
   * @returns {Promise<Object>} Updated tenant
   * @throws {AppError} If enablement fails
   */
  async enableModule(tenantId, moduleId) {
    const tenant = await Tenant.findOne({ tenantId }).populate('subscription.planId');
    
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
    const plan = tenant.subscription.planId;
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
   * 
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated tenant
   */
  async handleExpiration(tenantId) {
    const tenant = await Tenant.findOne({ tenantId });
    
    if (!tenant) {
      throw new AppError(
        `Tenant with ID ${tenantId} not found`,
        404,
        ERROR_TYPES.TENANT_NOT_FOUND
      );
    }

    // Check if subscription is expired
    if (!tenant.subscription.expiresAt || tenant.subscription.expiresAt > new Date()) {
      return tenant; // Not expired
    }

    // Handle auto-renewal
    if (tenant.subscription.autoRenew) {
      return await this.renewSubscription(tenantId);
    }

    // Expire subscription
    tenant.subscription.status = 'expired';
    
    // Disable optional modules (keep hr-core)
    tenant.enabledModules = tenant.enabledModules.filter(
      module => module.moduleId === 'hr-core'
    );

    // Change tenant status to suspended
    tenant.status = 'suspended';

    await tenant.save();

    return tenant;
  }

  /**
   * Renew subscription
   * 
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated tenant
   */
  async renewSubscription(tenantId) {
    const tenant = await Tenant.findOne({ tenantId }).populate('subscription.planId');
    
    if (!tenant) {
      throw new AppError(
        `Tenant with ID ${tenantId} not found`,
        404,
        ERROR_TYPES.TENANT_NOT_FOUND
      );
    }

    const plan = tenant.subscription.planId;
    if (!plan) {
      throw new AppError(
        'No plan assigned to tenant',
        400,
        ERROR_TYPES.NO_PLAN_ASSIGNED
      );
    }

    // Calculate new expiration date
    const startDate = new Date();
    const expiresAt = new Date(startDate);
    
    if (tenant.subscription.billingCycle === 'yearly') {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    } else {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    }

    // Update subscription
    tenant.subscription.status = 'active';
    tenant.subscription.startDate = startDate;
    tenant.subscription.expiresAt = expiresAt;

    // Reactivate tenant if suspended
    if (tenant.status === 'suspended') {
      tenant.status = 'active';
    }

    await tenant.save();

    return tenant;
  }

  /**
   * Upgrade subscription plan
   * 
   * @param {string} tenantId - Tenant ID
   * @param {string} newPlanId - New plan ID
   * @returns {Promise<Object>} Updated tenant
   */
  async upgradePlan(tenantId, newPlanId) {
    const tenant = await Tenant.findOne({ tenantId }).populate('subscription.planId');
    
    if (!tenant) {
      throw new AppError(
        `Tenant with ID ${tenantId} not found`,
        404,
        ERROR_TYPES.TENANT_NOT_FOUND
      );
    }

    const newPlan = await Plan.findById(newPlanId);
    if (!newPlan) {
      throw new AppError(
        'New plan not found',
        404,
        ERROR_TYPES.PLAN_NOT_FOUND
      );
    }

    // Update subscription plan
    tenant.subscription.planId = newPlan._id;

    // Update limits
    tenant.limits = {
      maxUsers: newPlan.limits.maxUsers,
      maxStorage: newPlan.limits.maxStorage,
      apiCallsPerMonth: newPlan.limits.apiCallsPerMonth
    };

    // Enable new modules from upgraded plan
    const newModuleIds = newPlan.getIncludedModuleIds();
    
    newModuleIds.forEach(moduleId => {
      if (!tenant.isModuleEnabled(moduleId)) {
        tenant.enableModule(moduleId, 'upgrade');
      }
    });

    await tenant.save();

    return tenant.populate('subscription.planId');
  }

  /**
   * Downgrade subscription plan
   * 
   * @param {string} tenantId - Tenant ID
   * @param {string} newPlanId - New plan ID
   * @returns {Promise<Object>} Updated tenant
   */
  async downgradePlan(tenantId, newPlanId) {
    const tenant = await Tenant.findOne({ tenantId }).populate('subscription.planId');
    
    if (!tenant) {
      throw new AppError(
        `Tenant with ID ${tenantId} not found`,
        404,
        ERROR_TYPES.TENANT_NOT_FOUND
      );
    }

    const newPlan = await Plan.findById(newPlanId);
    if (!newPlan) {
      throw new AppError(
        'New plan not found',
        404,
        ERROR_TYPES.PLAN_NOT_FOUND
      );
    }

    // Update subscription plan
    tenant.subscription.planId = newPlan._id;

    // Update limits
    tenant.limits = {
      maxUsers: newPlan.limits.maxUsers,
      maxStorage: newPlan.limits.maxStorage,
      apiCallsPerMonth: newPlan.limits.apiCallsPerMonth
    };

    // Disable modules not in new plan (preserve data)
    const newModuleIds = newPlan.getIncludedModuleIds();
    
    // Keep hr-core always enabled
    if (!newModuleIds.includes('hr-core')) {
      newModuleIds.push('hr-core');
    }

    // Filter enabled modules to only those in new plan
    tenant.enabledModules = tenant.enabledModules.filter(
      module => newModuleIds.includes(module.moduleId)
    );

    await tenant.save();

    return tenant.populate('subscription.planId');
  }

  /**
   * Cancel subscription
   * 
   * @param {string} tenantId - Tenant ID
   * @param {boolean} immediate - Cancel immediately or at end of period
   * @returns {Promise<Object>} Updated tenant
   */
  async cancelSubscription(tenantId, immediate = false) {
    const tenant = await Tenant.findOne({ tenantId });
    
    if (!tenant) {
      throw new AppError(
        `Tenant with ID ${tenantId} not found`,
        404,
        ERROR_TYPES.TENANT_NOT_FOUND
      );
    }

    if (immediate) {
      // Cancel immediately
      tenant.subscription.status = 'cancelled';
      tenant.subscription.autoRenew = false;
      tenant.status = 'suspended';
      
      // Disable optional modules
      tenant.enabledModules = tenant.enabledModules.filter(
        module => module.moduleId === 'hr-core'
      );
    } else {
      // Cancel at end of period
      tenant.subscription.autoRenew = false;
      tenant.subscription.status = 'cancelled';
    }

    await tenant.save();

    return tenant;
  }

  /**
   * Get subscription details for tenant
   * 
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Subscription details
   */
  async getSubscription(tenantId) {
    const tenant = await Tenant.findOne({ tenantId }).populate('subscription.planId');
    
    if (!tenant) {
      throw new AppError(
        `Tenant with ID ${tenantId} not found`,
        404,
        ERROR_TYPES.TENANT_NOT_FOUND
      );
    }

    return {
      subscription: tenant.subscription,
      enabledModules: tenant.enabledModules,
      limits: tenant.limits,
      usage: tenant.usage
    };
  }

  /**
   * Check for expired subscriptions and handle them
   * 
   * @returns {Promise<number>} Number of subscriptions handled
   */
  async processExpiredSubscriptions() {
    const expiredTenants = await Tenant.findExpiredSubscriptions();
    
    let processedCount = 0;
    
    for (const tenant of expiredTenants) {
      try {
        await this.handleExpiration(tenant.tenantId);
        processedCount++;
      } catch (error) {
        console.error(`Failed to process expiration for tenant ${tenant.tenantId}:`, error);
      }
    }

    return processedCount;
  }
}

export default new SubscriptionService();
