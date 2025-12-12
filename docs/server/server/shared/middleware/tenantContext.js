// Middleware to inject tenant context into requests
export const tenantContext = (req, res, next) => {
    // Skip tenant context for platform routes - they don't need tenant filtering
    if (req.path.startsWith('/api/platform')) {
        return next();
    }
    
    // Skip tenant context for health check and non-API routes
    if (req.path === '/health' || !req.path.startsWith('/api')) {
        return next();
    }
    
    // Extract tenantId from authenticated user
    if (req.user && req.user.tenantId) {
        req.tenantId = req.user.tenantId;
    } else if (req.headers['x-tenant-id']) {
        // Fallback for system operations
        req.tenantId = req.headers['x-tenant-id'];
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
};

export default tenantContext;
