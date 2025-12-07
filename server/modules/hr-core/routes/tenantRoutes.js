import express from 'express';
import { requireAuth, requireRole } from '../../../shared/middleware/auth.js';
import { ROLES } from '../../../shared/constants/modules.js';
import TenantConfig from '../models/TenantConfig.js';
import { clearModuleCache } from '../../../shared/middleware/moduleGuard.js';

const router = express.Router();

router.use(requireAuth);

// Get tenant configuration
router.get('/config', async (req, res) => {
    try {
        const config = await TenantConfig.findOne({ tenantId: req.tenantId });

        if (!config) {
            return res.status(404).json({
                success: false,
                message: 'Tenant configuration not found'
            });
        }

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
