// controller/subscription.controller.js
import subscriptionService from '../services/subscription.service.js';
import logger from '../utils/logger.js';

/**
 * Create a new subscription
 * POST /api/v1/subscriptions
 */
export const createSubscription = async (req, res) => {
    try {
        const {
            tenantId,
            modules,
            billingCycle,
            billingEmail,
            paymentMethod,
            isTrial,
            trialDays
        } = req.body;

        // Validate required fields
        if (!tenantId) {
            return res.status(400).json({
                error: 'VALIDATION_ERROR',
                message: 'tenantId is required'
            });
        }

        if (!modules || !Array.isArray(modules) || modules.length === 0) {
            return res.status(400).json({
                error: 'VALIDATION_ERROR',
                message: 'At least one module must be specified'
            });
        }

        // Create subscription
        const license = await subscriptionService.createSubscription({
            tenantId,
            modules,
            billingCycle,
            billingEmail,
            paymentMethod,
            isTrial,
            trialDays
        });

        res.status(201).json({
            success: true,
            message: 'Subscription created successfully',
            data: {
                subscriptionId: license.subscriptionId,
                tenantId: license.tenantId,
                status: license.status,
                modules: license.modules,
                billingCycle: license.billingCycle,
                trialEndsAt: license.trialEndsAt,
                createdAt: license.createdAt
            }
        });

    } catch (error) {
        logger.error('Create subscription error', {
            error: error.message,
            stack: error.stack,
            body: req.body
        });

        if (error.message.includes('already exists')) {
            return res.status(409).json({
                error: 'SUBSCRIPTION_EXISTS',
                message: error.message
            });
        }

        res.status(500).json({
            error: 'SUBSCRIPTION_CREATION_FAILED',
            message: 'Failed to create subscription',
            details: error.message
        });
    }
};

/**
 * Get subscription status
 * GET /api/v1/subscriptions/:tenantId
 */
export const getSubscriptionStatus = async (req, res) => {
    try {
        const { tenantId } = req.params;

        if (!tenantId) {
            return res.status(400).json({
                error: 'VALIDATION_ERROR',
                message: 'tenantId is required'
            });
        }

        const status = await subscriptionService.getSubscriptionStatus(tenantId);

        if (!status.exists) {
            return res.status(404).json({
                error: 'SUBSCRIPTION_NOT_FOUND',
                message: 'No subscription found for this tenant'
            });
        }

        res.status(200).json({
            success: true,
            data: status
        });

    } catch (error) {
        logger.error('Get subscription status error', {
            error: error.message,
            stack: error.stack,
            tenantId: req.params.tenantId
        });

        res.status(500).json({
            error: 'SUBSCRIPTION_STATUS_FAILED',
            message: 'Failed to retrieve subscription status',
            details: error.message
        });
    }
};

/**
 * Upgrade subscription
 * POST /api/v1/subscriptions/:tenantId/upgrade
 */
export const upgradeSubscription = async (req, res) => {
    try {
        const { tenantId } = req.params;
        const { modules } = req.body;

        if (!tenantId) {
            return res.status(400).json({
                error: 'VALIDATION_ERROR',
                message: 'tenantId is required'
            });
        }

        if (!modules || !Array.isArray(modules) || modules.length === 0) {
            return res.status(400).json({
                error: 'VALIDATION_ERROR',
                message: 'At least one module must be specified for upgrade'
            });
        }

        const license = await subscriptionService.upgradeSubscription(tenantId, modules);

        res.status(200).json({
            success: true,
            message: 'Subscription upgraded successfully',
            data: {
                subscriptionId: license.subscriptionId,
                tenantId: license.tenantId,
                status: license.status,
                modules: license.modules,
                updatedAt: license.updatedAt
            }
        });

    } catch (error) {
        logger.error('Upgrade subscription error', {
            error: error.message,
            stack: error.stack,
            tenantId: req.params.tenantId,
            body: req.body
        });

        if (error.message.includes('No subscription found')) {
            return res.status(404).json({
                error: 'SUBSCRIPTION_NOT_FOUND',
                message: error.message
            });
        }

        if (error.message.includes('Cannot upgrade')) {
            return res.status(400).json({
                error: 'UPGRADE_NOT_ALLOWED',
                message: error.message
            });
        }

        res.status(500).json({
            error: 'SUBSCRIPTION_UPGRADE_FAILED',
            message: 'Failed to upgrade subscription',
            details: error.message
        });
    }
};

/**
 * Downgrade subscription
 * POST /api/v1/subscriptions/:tenantId/downgrade
 */
export const downgradeSubscription = async (req, res) => {
    try {
        const { tenantId } = req.params;
        const { modules, preserveData = true } = req.body;

        if (!tenantId) {
            return res.status(400).json({
                error: 'VALIDATION_ERROR',
                message: 'tenantId is required'
            });
        }

        if (!modules || !Array.isArray(modules) || modules.length === 0) {
            return res.status(400).json({
                error: 'VALIDATION_ERROR',
                message: 'At least one module must be specified for downgrade'
            });
        }

        const license = await subscriptionService.downgradeSubscription(
            tenantId,
            modules,
            preserveData
        );

        res.status(200).json({
            success: true,
            message: 'Subscription downgraded successfully',
            data: {
                subscriptionId: license.subscriptionId,
                tenantId: license.tenantId,
                status: license.status,
                modules: license.modules,
                updatedAt: license.updatedAt
            }
        });

    } catch (error) {
        logger.error('Downgrade subscription error', {
            error: error.message,
            stack: error.stack,
            tenantId: req.params.tenantId,
            body: req.body
        });

        if (error.message.includes('No subscription found')) {
            return res.status(404).json({
                error: 'SUBSCRIPTION_NOT_FOUND',
                message: error.message
            });
        }

        if (error.message.includes('Cannot downgrade')) {
            return res.status(400).json({
                error: 'DOWNGRADE_NOT_ALLOWED',
                message: error.message
            });
        }

        res.status(500).json({
            error: 'SUBSCRIPTION_DOWNGRADE_FAILED',
            message: 'Failed to downgrade subscription',
            details: error.message
        });
    }
};

/**
 * Cancel subscription
 * POST /api/v1/subscriptions/:tenantId/cancel
 */
export const cancelSubscription = async (req, res) => {
    try {
        const { tenantId } = req.params;
        const { immediate = false } = req.body;

        if (!tenantId) {
            return res.status(400).json({
                error: 'VALIDATION_ERROR',
                message: 'tenantId is required'
            });
        }

        const license = await subscriptionService.cancelSubscription(tenantId, immediate);

        res.status(200).json({
            success: true,
            message: 'Subscription cancelled successfully',
            data: {
                subscriptionId: license.subscriptionId,
                tenantId: license.tenantId,
                status: license.status,
                immediate,
                updatedAt: license.updatedAt
            }
        });

    } catch (error) {
        logger.error('Cancel subscription error', {
            error: error.message,
            stack: error.stack,
            tenantId: req.params.tenantId,
            body: req.body
        });

        if (error.message.includes('No subscription found')) {
            return res.status(404).json({
                error: 'SUBSCRIPTION_NOT_FOUND',
                message: error.message
            });
        }

        if (error.message.includes('already cancelled')) {
            return res.status(400).json({
                error: 'ALREADY_CANCELLED',
                message: error.message
            });
        }

        res.status(500).json({
            error: 'SUBSCRIPTION_CANCELLATION_FAILED',
            message: 'Failed to cancel subscription',
            details: error.message
        });
    }
};

/**
 * Reactivate subscription
 * POST /api/v1/subscriptions/:tenantId/reactivate
 */
export const reactivateSubscription = async (req, res) => {
    try {
        const { tenantId } = req.params;

        if (!tenantId) {
            return res.status(400).json({
                error: 'VALIDATION_ERROR',
                message: 'tenantId is required'
            });
        }

        const license = await subscriptionService.reactivateSubscription(tenantId);

        res.status(200).json({
            success: true,
            message: 'Subscription reactivated successfully',
            data: {
                subscriptionId: license.subscriptionId,
                tenantId: license.tenantId,
                status: license.status,
                modules: license.modules,
                updatedAt: license.updatedAt
            }
        });

    } catch (error) {
        logger.error('Reactivate subscription error', {
            error: error.message,
            stack: error.stack,
            tenantId: req.params.tenantId
        });

        if (error.message.includes('No subscription found')) {
            return res.status(404).json({
                error: 'SUBSCRIPTION_NOT_FOUND',
                message: error.message
            });
        }

        if (error.message.includes('already active')) {
            return res.status(400).json({
                error: 'ALREADY_ACTIVE',
                message: error.message
            });
        }

        res.status(500).json({
            error: 'SUBSCRIPTION_REACTIVATION_FAILED',
            message: 'Failed to reactivate subscription',
            details: error.message
        });
    }
};

/**
 * Handle trial expiration
 * POST /api/v1/subscriptions/:tenantId/trial/expire
 */
export const handleTrialExpiration = async (req, res) => {
    try {
        const { tenantId } = req.params;
        const { convertToActive = false } = req.body;

        if (!tenantId) {
            return res.status(400).json({
                error: 'VALIDATION_ERROR',
                message: 'tenantId is required'
            });
        }

        const license = await subscriptionService.handleTrialExpiration(
            tenantId,
            convertToActive
        );

        res.status(200).json({
            success: true,
            message: convertToActive
                ? 'Trial converted to active subscription'
                : 'Trial expired successfully',
            data: {
                subscriptionId: license.subscriptionId,
                tenantId: license.tenantId,
                status: license.status,
                modules: license.modules,
                updatedAt: license.updatedAt
            }
        });

    } catch (error) {
        logger.error('Handle trial expiration error', {
            error: error.message,
            stack: error.stack,
            tenantId: req.params.tenantId,
            body: req.body
        });

        if (error.message.includes('No subscription found')) {
            return res.status(404).json({
                error: 'SUBSCRIPTION_NOT_FOUND',
                message: error.message
            });
        }

        if (error.message.includes('not in trial')) {
            return res.status(400).json({
                error: 'NOT_IN_TRIAL',
                message: error.message
            });
        }

        res.status(500).json({
            error: 'TRIAL_EXPIRATION_FAILED',
            message: 'Failed to handle trial expiration',
            details: error.message
        });
    }
};

/**
 * Handle subscription expiration
 * POST /api/v1/subscriptions/:tenantId/expire
 */
export const handleSubscriptionExpiration = async (req, res) => {
    try {
        const { tenantId } = req.params;

        if (!tenantId) {
            return res.status(400).json({
                error: 'VALIDATION_ERROR',
                message: 'tenantId is required'
            });
        }

        const license = await subscriptionService.handleSubscriptionExpiration(tenantId);

        res.status(200).json({
            success: true,
            message: 'Subscription expired successfully',
            data: {
                subscriptionId: license.subscriptionId,
                tenantId: license.tenantId,
                status: license.status,
                modules: license.modules,
                updatedAt: license.updatedAt
            }
        });

    } catch (error) {
        logger.error('Handle subscription expiration error', {
            error: error.message,
            stack: error.stack,
            tenantId: req.params.tenantId
        });

        if (error.message.includes('No subscription found')) {
            return res.status(404).json({
                error: 'SUBSCRIPTION_NOT_FOUND',
                message: error.message
            });
        }

        res.status(500).json({
            error: 'SUBSCRIPTION_EXPIRATION_FAILED',
            message: 'Failed to handle subscription expiration',
            details: error.message
        });
    }
};

export default {
    createSubscription,
    getSubscriptionStatus,
    upgradeSubscription,
    downgradeSubscription,
    cancelSubscription,
    reactivateSubscription,
    handleTrialExpiration,
    handleSubscriptionExpiration
};
