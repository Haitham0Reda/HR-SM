// controller/license.controller.js
import License, { MODULES } from '../models/license.model.js';
import LicenseAudit from '../models/licenseAudit.model.js';
import UsageTracking from '../models/usageTracking.model.js';
import licenseValidator from '../services/licenseValidator.service.js';
import usageTracker from '../services/usageTracker.service.js';
import logger from '../../../utils/logger.js';

/**
 * Create or update a license
 * POST /api/v1/licenses
 */
export const createOrUpdateLicense = async (req, res) => {
    try {
        const {
            tenantId,
            subscriptionId,
            modules,
            billingCycle,
            status,
            trialEndsAt,
            paymentMethod,
            billingEmail
        } = req.body;

        // Validate required fields
        if (!tenantId || !subscriptionId) {
            return res.status(400).json({
                error: 'MISSING_REQUIRED_FIELDS',
                message: 'tenantId and subscriptionId are required'
            });
        }

        // Check if license already exists
        let license = await License.findByTenantId(tenantId);
        const isUpdate = !!license;

        if (isUpdate) {
            // Store previous state for audit
            const previousState = license.toObject();

            // Update existing license
            if (subscriptionId) license.subscriptionId = subscriptionId;
            if (modules) license.modules = modules;
            if (billingCycle) license.billingCycle = billingCycle;
            if (status) license.status = status;
            if (trialEndsAt !== undefined) license.trialEndsAt = trialEndsAt;
            if (paymentMethod !== undefined) license.paymentMethod = paymentMethod;
            if (billingEmail !== undefined) license.billingEmail = billingEmail;

            await license.save();

            // Log license update for each module
            for (const module of license.modules) {
                await LicenseAudit.logLicenseUpdated(
                    tenantId,
                    module.key,
                    previousState,
                    license.toObject(),
                    {
                        userId: req.user?._id,
                        ipAddress: req.ip,
                        userAgent: req.get('user-agent')
                    }
                );
            }

            // Invalidate cache
            licenseValidator.invalidateCache(tenantId);

            logger.info('License updated', { tenantId, subscriptionId });

            res.json({
                success: true,
                message: 'License updated successfully',
                license
            });
        } else {
            // Create new license
            license = new License({
                tenantId,
                subscriptionId,
                modules: modules || [],
                billingCycle: billingCycle || 'monthly',
                status: status || 'trial',
                trialEndsAt,
                paymentMethod,
                billingEmail
            });

            await license.save();

            // Log license creation
            await LicenseAudit.createLog({
                tenantId,
                moduleKey: MODULES.CORE_HR,
                eventType: 'LICENSE_CREATED',
                details: {
                    subscriptionId,
                    status: license.status,
                    userId: req.user?._id,
                    ipAddress: req.ip,
                    userAgent: req.get('user-agent')
                },
                severity: 'info'
            });

            logger.info('License created', { tenantId, subscriptionId });

            res.status(201).json({
                success: true,
                message: 'License created successfully',
                license
            });
        }
    } catch (error) {
        logger.error('Create/update license error', {
            error: error.message,
            stack: error.stack
        });

        res.status(500).json({
            error: 'LICENSE_OPERATION_FAILED',
            message: 'Failed to create or update license',
            details: error.message
        });
    }
};

/**
 * Get license details for a tenant
 * GET /api/v1/licenses/:tenantId
 */
export const getLicenseDetails = async (req, res) => {
    try {
        const { tenantId } = req.params;

        let license = await License.findByTenantId(tenantId);

        if (!license) {
            const allowAutoProvision = process.env.AUTO_PROVISION_LICENSE === 'true' || process.env.NODE_ENV !== 'production';
            if (!allowAutoProvision) {
                return res.status(404).json({
                    error: 'LICENSE_NOT_FOUND',
                    message: 'No license found for this tenant'
                });
            }
            const subscriptionId = `SUB-DEV-${Date.now()}`;
            license = await License.create({
                tenantId,
                subscriptionId,
                modules: [
                    {
                        key: MODULES.CORE_HR,
                        enabled: true,
                        tier: 'starter',
                        limits: {},
                        activatedAt: new Date(),
                        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                    }
                ],
                billingCycle: 'monthly',
                status: 'trial',
                trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            });
        }

        // Enrich license data with expiration info
        const enrichedLicense = {
            ...license.toObject(),
            isExpired: license.isExpired(),
            isInTrial: license.isInTrial(),
            modules: license.modules.map(module => ({
                ...module,
                daysUntilExpiration: license.getDaysUntilExpiration(module.key)
            }))
        };

        res.json({
            success: true,
            license: enrichedLicense
        });
    } catch (error) {
        logger.error('Get license details error', {
            tenantId: req.params.tenantId,
            error: error.message,
            stack: error.stack
        });

        res.status(500).json({
            error: 'LICENSE_FETCH_FAILED',
            message: 'Failed to retrieve license details',
            details: error.message
        });
    }
};

/**
 * Get usage metrics for a tenant
 * GET /api/v1/licenses/:tenantId/usage
 */
export const getUsageMetrics = async (req, res) => {
    try {
        const { tenantId } = req.params;
        const { period, moduleKey } = req.query;

        // Verify license exists
        const license = await License.findByTenantId(tenantId);

        if (!license) {
            return res.status(404).json({
                error: 'LICENSE_NOT_FOUND',
                message: 'No license found for this tenant'
            });
        }

        let usageData;

        if (moduleKey) {
            // Get usage for specific module
            usageData = await usageTracker.getUsage(tenantId, moduleKey, { period });
        } else {
            // Get usage for all modules
            usageData = await usageTracker.getTenantUsage(tenantId, { period });
        }

        if (!usageData.success) {
            return res.status(500).json({
                error: 'USAGE_FETCH_FAILED',
                message: usageData.error
            });
        }

        res.json({
            success: true,
            usage: usageData
        });
    } catch (error) {
        logger.error('Get usage metrics error', {
            tenantId: req.params.tenantId,
            error: error.message,
            stack: error.stack
        });

        res.status(500).json({
            error: 'USAGE_FETCH_FAILED',
            message: 'Failed to retrieve usage metrics',
            details: error.message
        });
    }
};

/**
 * Query audit logs with filtering
 * GET /api/v1/licenses/audit
 */
export const queryAuditLogs = async (req, res) => {
    try {
        const {
            tenantId,
            moduleKey,
            eventType,
            severity,
            startDate,
            endDate,
            limit = 100,
            skip = 0
        } = req.query;

        // Parse limit and skip as integers
        const parsedLimit = parseInt(limit, 10);
        const parsedSkip = parseInt(skip, 10);

        // Validate limit and skip
        if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 1000) {
            return res.status(400).json({
                error: 'INVALID_LIMIT',
                message: 'Limit must be between 1 and 1000'
            });
        }

        if (isNaN(parsedSkip) || parsedSkip < 0) {
            return res.status(400).json({
                error: 'INVALID_SKIP',
                message: 'Skip must be a non-negative integer'
            });
        }

        // Query audit logs
        const logs = await LicenseAudit.queryLogs({
            tenantId,
            moduleKey,
            eventType,
            severity,
            startDate,
            endDate,
            limit: parsedLimit,
            skip: parsedSkip
        });

        // Get total count for pagination
        const query = {};
        if (tenantId) query.tenantId = tenantId;
        if (moduleKey) query.moduleKey = moduleKey;
        if (eventType) query.eventType = eventType;
        if (severity) query.severity = severity;
        if (startDate || endDate) {
            query.timestamp = {};
            if (startDate) query.timestamp.$gte = new Date(startDate);
            if (endDate) query.timestamp.$lte = new Date(endDate);
        }

        const totalCount = await LicenseAudit.countDocuments(query);

        res.json({
            success: true,
            logs,
            pagination: {
                total: totalCount,
                limit: parsedLimit,
                skip: parsedSkip,
                hasMore: parsedSkip + logs.length < totalCount
            }
        });
    } catch (error) {
        logger.error('Query audit logs error', {
            query: req.query,
            error: error.message,
            stack: error.stack
        });

        res.status(500).json({
            error: 'AUDIT_QUERY_FAILED',
            message: 'Failed to query audit logs',
            details: error.message
        });
    }
};

/**
 * Activate a module for a tenant
 * POST /api/v1/licenses/:tenantId/modules/:moduleKey/activate
 */
export const activateModule = async (req, res) => {
    try {
        const { tenantId, moduleKey } = req.params;
        const { tier, limits, expiresAt } = req.body;

        // Validate required fields
        if (!tier) {
            return res.status(400).json({
                error: 'MISSING_REQUIRED_FIELDS',
                message: 'tier is required'
            });
        }

        // Validate tier
        const validTiers = ['starter', 'business', 'enterprise'];
        if (!validTiers.includes(tier)) {
            return res.status(400).json({
                error: 'INVALID_TIER',
                message: `tier must be one of: ${validTiers.join(', ')}`
            });
        }

        // Validate module key
        if (!Object.values(MODULES).includes(moduleKey)) {
            return res.status(400).json({
                error: 'INVALID_MODULE',
                message: `Invalid module key: ${moduleKey}`
            });
        }

        // Get license
        const license = await License.findByTenantId(tenantId);

        if (!license) {
            return res.status(404).json({
                error: 'LICENSE_NOT_FOUND',
                message: 'No license found for this tenant'
            });
        }

        // Activate module
        await license.activateModule(moduleKey, tier, limits || {}, expiresAt);

        // Log module activation
        await LicenseAudit.logModuleActivated(tenantId, moduleKey, {
            tier,
            limits,
            expiresAt,
            userId: req.user?._id,
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });

        // Invalidate cache
        licenseValidator.invalidateCache(tenantId, moduleKey);

        logger.info('Module activated', { tenantId, moduleKey, tier });

        res.json({
            success: true,
            message: 'Module activated successfully',
            module: license.getModuleLicense(moduleKey)
        });
    } catch (error) {
        logger.error('Activate module error', {
            tenantId: req.params.tenantId,
            moduleKey: req.params.moduleKey,
            error: error.message,
            stack: error.stack
        });

        res.status(500).json({
            error: 'MODULE_ACTIVATION_FAILED',
            message: 'Failed to activate module',
            details: error.message
        });
    }
};

/**
 * Deactivate a module for a tenant
 * POST /api/v1/licenses/:tenantId/modules/:moduleKey/deactivate
 */
export const deactivateModule = async (req, res) => {
    try {
        const { tenantId, moduleKey } = req.params;

        // Validate module key
        if (!Object.values(MODULES).includes(moduleKey)) {
            return res.status(400).json({
                error: 'INVALID_MODULE',
                message: `Invalid module key: ${moduleKey}`
            });
        }

        // Prevent deactivating Core HR
        if (moduleKey === MODULES.CORE_HR) {
            return res.status(400).json({
                error: 'CANNOT_DEACTIVATE_CORE_HR',
                message: 'Core HR module cannot be deactivated'
            });
        }

        // Get license
        const license = await License.findByTenantId(tenantId);

        if (!license) {
            return res.status(404).json({
                error: 'LICENSE_NOT_FOUND',
                message: 'No license found for this tenant'
            });
        }

        // Check if module exists
        const module = license.getModuleLicense(moduleKey);
        if (!module) {
            return res.status(404).json({
                error: 'MODULE_NOT_FOUND',
                message: 'Module not found in license'
            });
        }

        // Deactivate module
        await license.deactivateModule(moduleKey);

        // Log module deactivation
        await LicenseAudit.logModuleDeactivated(tenantId, moduleKey, {
            userId: req.user?._id,
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });

        // Invalidate cache
        licenseValidator.invalidateCache(tenantId, moduleKey);

        logger.info('Module deactivated', { tenantId, moduleKey });

        res.json({
            success: true,
            message: 'Module deactivated successfully',
            module: license.getModuleLicense(moduleKey)
        });
    } catch (error) {
        logger.error('Deactivate module error', {
            tenantId: req.params.tenantId,
            moduleKey: req.params.moduleKey,
            error: error.message,
            stack: error.stack
        });

        res.status(500).json({
            error: 'MODULE_DEACTIVATION_FAILED',
            message: 'Failed to deactivate module',
            details: error.message
        });
    }
};
