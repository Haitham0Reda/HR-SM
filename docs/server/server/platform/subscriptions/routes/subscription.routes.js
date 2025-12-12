// routes/subscription.routes.js
import express from 'express';
import subscriptionController from '../controllers/subscription.controller.js';
import { protect } from '../../../middleware/authMiddleware.js';
import { admin } from '../../../middleware/authMiddleware.js';

const router = express.Router();

/**
 * All subscription routes require authentication and admin privileges
 */
router.use(protect);
router.use(admin);

/**
 * @route   POST /api/v1/subscriptions
 * @desc    Create a new subscription
 * @access  Admin
 * @body    {
 *            tenantId: string,
 *            modules: Array<{moduleKey: string, tier: string, limits?: object}>,
 *            billingCycle?: string,
 *            billingEmail?: string,
 *            paymentMethod?: string,
 *            isTrial?: boolean,
 *            trialDays?: number
 *          }
 */
router.post('/', subscriptionController.createSubscription);

/**
 * @route   GET /api/v1/subscriptions/:tenantId
 * @desc    Get subscription status for a tenant
 * @access  Admin
 */
router.get('/:tenantId', subscriptionController.getSubscriptionStatus);

/**
 * @route   POST /api/v1/subscriptions/:tenantId/upgrade
 * @desc    Upgrade subscription by adding or upgrading modules
 * @access  Admin
 * @body    {
 *            modules: Array<{moduleKey: string, tier: string, limits?: object, expiresAt?: Date}>
 *          }
 */
router.post('/:tenantId/upgrade', subscriptionController.upgradeSubscription);

/**
 * @route   POST /api/v1/subscriptions/:tenantId/downgrade
 * @desc    Downgrade subscription by removing or downgrading modules
 * @access  Admin
 * @body    {
 *            modules: Array<{moduleKey: string, action: 'remove'|'downgrade', tier?: string, limits?: object}>,
 *            preserveData?: boolean
 *          }
 */
router.post('/:tenantId/downgrade', subscriptionController.downgradeSubscription);

/**
 * @route   POST /api/v1/subscriptions/:tenantId/cancel
 * @desc    Cancel a subscription
 * @access  Admin
 * @body    {
 *            immediate?: boolean
 *          }
 */
router.post('/:tenantId/cancel', subscriptionController.cancelSubscription);

/**
 * @route   POST /api/v1/subscriptions/:tenantId/reactivate
 * @desc    Reactivate a cancelled or expired subscription
 * @access  Admin
 */
router.post('/:tenantId/reactivate', subscriptionController.reactivateSubscription);

/**
 * @route   POST /api/v1/subscriptions/:tenantId/trial/expire
 * @desc    Handle trial period expiration
 * @access  Admin
 * @body    {
 *            convertToActive?: boolean
 *          }
 */
router.post('/:tenantId/trial/expire', subscriptionController.handleTrialExpiration);

/**
 * @route   POST /api/v1/subscriptions/:tenantId/expire
 * @desc    Handle subscription expiration
 * @access  Admin
 */
router.post('/:tenantId/expire', subscriptionController.handleSubscriptionExpiration);

export default router;
