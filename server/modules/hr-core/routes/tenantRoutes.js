import express from 'express';
import { requireAuth, requireRole } from '../../../shared/middleware/auth.js';
import { ROLES } from '../../../shared/constants/modules.js';
import TenantConfig from '../models/TenantConfig.js';
import Tenant from '../../../platform/tenants/models/Tenant.js';
import { clearModuleCache } from '../../../shared/middleware/moduleGuard.js';

const router = express.Router();

router.use(requireAuth);

// Get tenant information (company name, etc.)
router.get('/info', async (req, res) => {
    try {
        const tenantId = req.tenantId;
        
        if (!tenantId) {
            return res.status(400).json({
                success: false,
                error: 'TENANT_ID_MISSING',
                message: 'Tenant ID is required'
            });
        }

        // Find tenant by tenantId
        let tenant = await Tenant.findOne({ tenantId }).select('tenantId name domain status config contactInfo metadata');
        
        if (!tenant) {
            const allowAutoProvision = process.env.AUTO_PROVISION_TENANT === 'true' || process.env.NODE_ENV !== 'production';
            if (!allowAutoProvision) {
                return res.status(404).json({
                    success: false,
                    error: 'TENANT_NOT_FOUND',
                    message: 'Tenant not found'
                });
            }
            tenant = await Tenant.create({
                tenantId,
                name: 'Demo Tenant',
                status: 'active',
                deploymentMode: 'saas',
                enabledModules: [{ moduleId: 'hr-core', enabledAt: new Date(), enabledBy: 'system' }],
                config: {},
                limits: {},
                usage: {}
            });
        }

        res.json({
            success: true,
            tenant: {
                tenantId: tenant.tenantId,
                name: tenant.name,
                domain: tenant.domain,
                status: tenant.status,
                config: tenant.config,
                contactInfo: tenant.contactInfo,
                metadata: tenant.metadata
            }
        });
    } catch (error) {
        console.error('Get tenant info error:', error);
        res.status(500).json({
            success: false,
            error: 'TENANT_INFO_FETCH_FAILED',
            message: 'Failed to retrieve tenant information'
        });
    }
});

// Get tenant configuration
router.get('/config', async (req, res) => {
    try {
        const tenantId = req.tenantId;
        let config = await TenantConfig.findOne({ tenantId });

        if (!config) {
            const allowAutoProvision = process.env.AUTO_PROVISION_TENANT_CONFIG === 'true' || process.env.NODE_ENV !== 'production';
            if (!allowAutoProvision) {
                return res.status(404).json({
                    success: false,
                    message: 'Tenant configuration not found'
                });
            }
            const tenant = await Tenant.findOne({ tenantId }).lean();
            config = await TenantConfig.create({
                tenantId,
                companyName: tenant?.name || 'Demo Company',
                deploymentMode: 'saas'
            });
            if (tenant?.enabledModules?.length) {
                tenant.enabledModules.forEach(em => {
                    config.enableModule(em.moduleId);
                });
                await config.save();
            }
        }

        // Sync enabled modules from Tenant model (platform) -> TenantConfig (hr-core)
        try {
            const tenant = await Tenant.findOne({ tenantId }).lean();
            let updated = false;
            if (tenant?.enabledModules?.length) {
                tenant.enabledModules.forEach(em => {
                    const current = config.modules.get(em.moduleId);
                    if (!current?.enabled) {
                        config.enableModule(em.moduleId);
                        updated = true;
                    }
                });
            }
            if (updated) {
                await config.save();
                clearModuleCache(tenantId);
            }
        } catch (_) {}

        res.json({
            success: true,
            data: config
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Update tenant configuration
router.put('/config', requireRole(ROLES.ADMIN), async (req, res) => {
    try {
        const config = await TenantConfig.findOne({ tenantId: req.tenantId });

        if (!config) {
            return res.status(404).json({
                success: false,
                message: 'Tenant configuration not found'
            });
        }

        const allowedUpdates = ['companyName', 'settings'];
        allowedUpdates.forEach(field => {
            if (req.body[field] !== undefined) {
                config[field] = req.body[field];
            }
        });

        await config.save();

        res.json({
            success: true,
            data: config
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// Enable module
router.post('/modules/:moduleName/enable', requireRole(ROLES.ADMIN), async (req, res) => {
    try {
        const { moduleName } = req.params;
        const config = await TenantConfig.findOne({ tenantId: req.tenantId });

        if (!config) {
            return res.status(404).json({
                success: false,
                message: 'Tenant configuration not found'
            });
        }

        config.enableModule(moduleName);
        await config.save();

        // Clear cache
        clearModuleCache(req.tenantId);

        res.json({
            success: true,
            message: `Module ${moduleName} enabled successfully`,
            data: config
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// Disable module
router.post('/modules/:moduleName/disable', requireRole(ROLES.ADMIN), async (req, res) => {
    try {
        const { moduleName } = req.params;
        const config = await TenantConfig.findOne({ tenantId: req.tenantId });

        if (!config) {
            return res.status(404).json({
                success: false,
                message: 'Tenant configuration not found'
            });
        }

        config.disableModule(moduleName);
        await config.save();

        // Clear cache
        clearModuleCache(req.tenantId);

        res.json({
            success: true,
            message: `Module ${moduleName} disabled successfully`,
            data: config
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// Get enabled modules
router.get('/modules', async (req, res) => {
    try {
        const config = await TenantConfig.findOne({ tenantId: req.tenantId });

        if (!config) {
            return res.status(404).json({
                success: false,
                message: 'Tenant configuration not found'
            });
        }

        const enabledModules = [];
        config.modules.forEach((value, key) => {
            if (value.enabled) {
                enabledModules.push({
                    name: key,
                    ...value
                });
            }
        });

        res.json({
            success: true,
            data: enabledModules
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

export default router;
