import TenantConfig from '../../modules/hr-core/models/TenantConfig.js';

// Cache for feature flags to reduce DB queries
const featureFlagCache = new Map();
const CACHE_TTL = 60000; // 1 minute

export const requireModule = (moduleName) => {
    return async (req, res, next) => {
        try {
            const tenantId = req.tenantId;

            if (!tenantId) {
                return res.status(401).json({
                    success: false,
                    message: 'Tenant context required'
                });
            }

            // Check cache first
            const cacheKey = `${tenantId}:${moduleName}`;
            const cached = featureFlagCache.get(cacheKey);

            if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
                if (!cached.enabled) {
                    return res.status(403).json({
                        success: false,
                        message: `Module '${moduleName}' is not enabled for your organization`
                    });
                }
                return next();
            }

            // Fetch from database
            const config = await TenantConfig.findOne({ tenantId });

            if (!config) {
                return res.status(500).json({
                    success: false,
                    message: 'Tenant configuration not found'
                });
            }

            const moduleEnabled = config.modules?.[moduleName]?.enabled;

            // Update cache
            featureFlagCache.set(cacheKey, {
                enabled: moduleEnabled,
                timestamp: Date.now()
            });

            if (!moduleEnabled) {
                return res.status(403).json({
                    success: false,
                    message: `Module '${moduleName}' is not enabled for your organization`
                });
            }

            next();
        } catch (error) {
            console.error('Module guard error:', error);
            res.status(500).json({
                success: false,
                message: 'Error checking module access'
            });
        }
    };
};

// Clear cache for a tenant (call when config changes)
export const clearModuleCache = (tenantId) => {
    for (const key of featureFlagCache.keys()) {
        if (key.startsWith(`${tenantId}:`)) {
            featureFlagCache.delete(key);
        }
    }
};

export default requireModule;
