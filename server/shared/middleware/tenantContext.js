import Tenant from '../../platform/tenants/models/Tenant.js';
import logger from '../../utils/logger.js';

// Cache for tenant data to reduce DB queries
const tenantCache = new Map();
const TENANT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Middleware to inject tenant context into requests
export const tenantContext = async (req, res, next) => {
    // Skip tenant context for platform routes - they don't need tenant filtering
    if (req.path.startsWith('/api/platform')) {
        return next();
    }
    
    // Skip tenant context for health check and non-API routes
    if (req.path === '/health' || !req.path.startsWith('/api')) {
        return next();
    }
    
    try {
        // Extract tenantId from authenticated user
        let tenantId = null;
        if (req.user && req.user.tenantId) {
            tenantId = req.user.tenantId;
        } else if (req.headers['x-tenant-id']) {
            // Fallback for system operations
            tenantId = req.headers['x-tenant-id'];
        }

        if (tenantId) {
            req.tenantId = tenantId;

            // Try to get tenant from cache first
            const cacheKey = `tenant_${tenantId}`;
            const cached = tenantCache.get(cacheKey);

            if (cached && Date.now() - cached.timestamp < TENANT_CACHE_TTL) {
                req.tenant = cached.tenant;
            } else {
                // Fetch tenant from database with license information
                const tenant = await Tenant.findOne({ tenantId }).select(
                    'tenantId name status enabledModules license usage restrictions billing'
                ).lean();

                if (tenant) {
                    // Cache the tenant data
                    tenantCache.set(cacheKey, {
                        tenant,
                        timestamp: Date.now()
                    });
                    req.tenant = tenant;
                } else {
                    logger.warn('Tenant not found', { tenantId });
                }
            }
        }

        // Attach tenant context to all models
        req.withTenant = (Model) => {
            return {
                ...Model,
                find: (...args) => Model.find(...args).where({ tenantId: req.tenantId }),
                findOne: (...args) => Model.findOne(...args).where({ tenantId: req.tenantId }),
                findById: (id) => Model.findOne({ _id: id, tenantId: req.tenantId }),
                create: (data) => Model.create({ ...data, tenantId: req.tenantId }),
                updateOne: (filter, update) => Model.updateOne({ ...filter, tenantId: req.tenantId }, update),
                deleteOne: (filter) => Model.deleteOne({ ...filter, tenantId: req.tenantId })
            };
        };

        next();
    } catch (error) {
        logger.error('Tenant context middleware error', {
            error: error.message,
            tenantId: req.tenantId
        });
        next(); // Continue without tenant context rather than failing
    }
};

// Clear tenant cache for a specific tenant (call when tenant data changes)
export const clearTenantCache = (tenantId) => {
    const cacheKey = `tenant_${tenantId}`;
    tenantCache.delete(cacheKey);
    logger.debug('Tenant cache cleared', { tenantId });
};

// Clear all tenant cache
export const clearAllTenantCache = () => {
    const size = tenantCache.size;
    tenantCache.clear();
    logger.debug('All tenant cache cleared', { entriesCleared: size });
};

export default tenantContext;
