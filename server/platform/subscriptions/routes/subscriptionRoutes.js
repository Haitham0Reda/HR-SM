const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const { authenticatePlatform } = require('../../../core/middleware/platformAuthentication');
const { platformGuard } = require('../../../core/middleware/platformAuthorization');

/**
 * Subscription Management Routes
 * Base path: /api/platform/subscriptions
 * 
 * All routes require Platform JWT authentication and appropriate permissions
 */

// Plan management routes
router.get('/plans', 
  authenticatePlatform,
  ...platformGuard('subscriptions:read', 'LIST_PLANS'),
  subscriptionController.listPlans
);

router.post('/plans', 
  authenticatePlatform,
  ...platformGuard('subscriptions:create', 'CREATE_PLAN'),
  subscriptionController.createPlan
);

router.get('/plans/:id', 
  authenticatePlatform,
  ...platformGuard('subscriptions:read', 'VIEW_PLAN'),
  subscriptionController.getPlan
);

router.patch('/plans/:id', 
  authenticatePlatform,
  ...platformGuard('subscriptions:update', 'UPDATE_PLAN'),
  subscriptionController.updatePlan
);

router.delete('/plans/:id', 
  authenticatePlatform,
  ...platformGuard('subscriptions:delete', 'DELETE_PLAN'),
  subscriptionController.deletePlan
);

// Tenant subscription management routes
router.get('/tenants/:id/subscription', 
  authenticatePlatform,
  ...platformGuard('subscriptions:read', 'VIEW_TENANT_SUBSCRIPTION'),
  subscriptionController.getTenantSubscription
);

router.patch('/tenants/:id/subscription', 
  authenticatePlatform,
  ...platformGuard('subscriptions:update', 'ASSIGN_PLAN_TO_TENANT'),
  subscriptionController.assignPlanToTenant
);

router.post('/tenants/:id/upgrade', 
  authenticatePlatform,
  ...platformGuard('subscriptions:update', 'UPGRADE_TENANT_PLAN'),
  subscriptionController.upgradeTenantPlan
);

router.post('/tenants/:id/downgrade', 
  authenticatePlatform,
  ...platformGuard('subscriptions:update', 'DOWNGRADE_TENANT_PLAN'),
  subscriptionController.downgradeTenantPlan
);

router.post('/tenants/:id/cancel', 
  authenticatePlatform,
  ...platformGuard('subscriptions:update', 'CANCEL_TENANT_SUBSCRIPTION'),
  subscriptionController.cancelTenantSubscription
);

router.post('/tenants/:id/renew', 
  authenticatePlatform,
  ...platformGuard('subscriptions:update', 'RENEW_TENANT_SUBSCRIPTION'),
  subscriptionController.renewTenantSubscription
);

module.exports = router;
