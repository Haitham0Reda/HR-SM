import subscriptionService from '../services/subscriptionService.js';
import Plan from '../models/Plan.js';
import asyncHandler from '../../../utils/asyncHandler.js';

/**
 * Subscription Controller
 * Handles HTTP requests for subscription management
 */

/**
 * List all plans
 * GET /api/platform/subscriptions/plans
 * 
 * Query params:
 * - active: Filter by active status (true/false)
 * - public: Filter by public status (true/false)
 */
export const listPlans = asyncHandler(async (req, res) => {
  const { active, public: isPublic } = req.query;

  let plans;

  if (active === 'true' && isPublic === 'true') {
    plans = await Plan.findPublic();
  } else if (active === 'true') {
    plans = await Plan.findActive();
  } else {
    const query = {};
    if (active !== undefined) {
      query.isActive = active === 'true';
    }
    if (isPublic !== undefined) {
      query.isPublic = isPublic === 'true';
    }
    plans = await Plan.find(query).sort({ sortOrder: 1, tier: 1 });
  }

  res.status(200).json({
    success: true,
    data: {
      plans
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

/**
 * Get plan by ID
 * GET /api/platform/subscriptions/plans/:id
 */
export const getPlan = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const plan = await Plan.findById(id);

  if (!plan) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'PLAN_NOT_FOUND',
        message: 'Plan not found'
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    });
  }

  res.status(200).json({
    success: true,
    data: {
      plan
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

/**
 * Create new plan
 * POST /api/platform/subscriptions/plans
 * 
 * Body: Plan data
 */
export const createPlan = asyncHandler(async (req, res) => {
  const planData = req.body;

  const plan = new Plan(planData);
  await plan.save();

  res.status(201).json({
    success: true,
    data: {
      plan
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

/**
 * Update plan
 * PATCH /api/platform/subscriptions/plans/:id
 * 
 * Body: Fields to update
 */
export const updatePlan = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  const plan = await Plan.findByIdAndUpdate(
    id,
    { ...updateData, updatedAt: new Date() },
    { new: true, runValidators: true }
  );

  if (!plan) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'PLAN_NOT_FOUND',
        message: 'Plan not found'
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    });
  }

  res.status(200).json({
    success: true,
    data: {
      plan
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

/**
 * Delete plan
 * DELETE /api/platform/subscriptions/plans/:id
 */
export const deletePlan = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Soft delete by setting isActive to false
  const plan = await Plan.findByIdAndUpdate(
    id,
    { isActive: false, updatedAt: new Date() },
    { new: true }
  );

  if (!plan) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'PLAN_NOT_FOUND',
        message: 'Plan not found'
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    });
  }

  res.status(200).json({
    success: true,
    data: {
      plan,
      message: 'Plan deactivated successfully'
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

/**
 * Assign plan to tenant
 * PATCH /api/platform/subscriptions/tenants/:id/subscription
 * 
 * Body:
 * - planId: Plan ID (required)
 * - billingCycle: monthly or yearly (default: monthly)
 */
export const assignPlanToTenant = asyncHandler(async (req, res) => {
  const { id: tenantId } = req.params;
  const { planId, billingCycle } = req.body;

  if (!planId) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'Plan ID is required'
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    });
  }

  const tenant = await subscriptionService.assignPlan(tenantId, planId, billingCycle);

  res.status(200).json({
    success: true,
    data: {
      tenant,
      message: 'Plan assigned successfully'
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

/**
 * Get tenant subscription
 * GET /api/platform/subscriptions/tenants/:id/subscription
 */
export const getTenantSubscription = asyncHandler(async (req, res) => {
  const { id: tenantId } = req.params;

  const subscription = await subscriptionService.getSubscription(tenantId);

  res.status(200).json({
    success: true,
    data: subscription,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

/**
 * Upgrade tenant plan
 * POST /api/platform/subscriptions/tenants/:id/upgrade
 * 
 * Body:
 * - planId: New plan ID (required)
 */
export const upgradeTenantPlan = asyncHandler(async (req, res) => {
  const { id: tenantId } = req.params;
  const { planId } = req.body;

  if (!planId) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'Plan ID is required'
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    });
  }

  const tenant = await subscriptionService.upgradePlan(tenantId, planId);

  res.status(200).json({
    success: true,
    data: {
      tenant,
      message: 'Plan upgraded successfully'
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

/**
 * Downgrade tenant plan
 * POST /api/platform/subscriptions/tenants/:id/downgrade
 * 
 * Body:
 * - planId: New plan ID (required)
 */
export const downgradeTenantPlan = asyncHandler(async (req, res) => {
  const { id: tenantId } = req.params;
  const { planId } = req.body;

  if (!planId) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'Plan ID is required'
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    });
  }

  const tenant = await subscriptionService.downgradePlan(tenantId, planId);

  res.status(200).json({
    success: true,
    data: {
      tenant,
      message: 'Plan downgraded successfully'
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

/**
 * Cancel tenant subscription
 * POST /api/platform/subscriptions/tenants/:id/cancel
 * 
 * Body:
 * - immediate: Cancel immediately (default: false)
 */
export const cancelTenantSubscription = asyncHandler(async (req, res) => {
  const { id: tenantId } = req.params;
  const { immediate = false } = req.body;

  const tenant = await subscriptionService.cancelSubscription(tenantId, immediate);

  res.status(200).json({
    success: true,
    data: {
      tenant,
      message: immediate 
        ? 'Subscription cancelled immediately' 
        : 'Subscription will be cancelled at end of period'
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

/**
 * Renew tenant subscription
 * POST /api/platform/subscriptions/tenants/:id/renew
 */
export const renewTenantSubscription = asyncHandler(async (req, res) => {
  const { id: tenantId } = req.params;

  const tenant = await subscriptionService.renewSubscription(tenantId);

  res.status(200).json({
    success: true,
    data: {
      tenant,
      message: 'Subscription renewed successfully'
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});
