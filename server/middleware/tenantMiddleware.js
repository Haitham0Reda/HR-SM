/**
 * Tenant Middleware (PostgreSQL)
 * 
 * Handles tenant identification and context injection for the single database model.
 * Injects tenant_id into request context instead of switching database connections.
 */

import multiTenantDB from '../config/multiTenant.js';
import jwt from 'jsonwebtoken';

/**
 * Middleware to identify and set tenant context
 * Tenant can be identified through:
 * 1. JWT token (preferred for authenticated requests)
 * 2. Header: x-tenant-id or x-company-id
 * 3. Query parameter: tenant or company
 * 4. Subdomain (if configured)
 */
export const tenantMiddleware = async (req, res, next) => {
    try {
        let tenantId = null;

        // Method 1: Extract from JWT token
        const token = req.header('Authorization')?.replace('Bearer ', '') || 
                     req.cookies?.token;

        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                if (decoded.tenant_id) {
                    tenantId = decoded.tenant_id;
                } else if (decoded.company) {
                    // Support legacy 'company' field
                    tenantId = decoded.company;
                }
            } catch (jwtError) {
                // JWT verification failed, continue with other methods
                if (process.env.LOG_LEVEL === 'debug') {
                    console.warn('JWT verification failed:', jwtError.message);
                }
            }
        }

        // Method 2: Header (x-tenant-id takes precedence over x-company-id)
        if (!tenantId) {
            tenantId = req.header('x-tenant-id') || req.header('x-company-id');
        }

        // Method 3: Query parameter
        if (!tenantId) {
            tenantId = req.query.tenant || req.query.company;
        }

        // Method 4: Subdomain (if using subdomain routing)
        if (!tenantId && req.hostname) {
            const subdomain = req.hostname.split('.')[0];
            if (subdomain && subdomain !== 'www' && subdomain !== 'api' && subdomain !== 'localhost') {
                tenantId = subdomain;
            }
        }

        // Validate tenant ID if present
        if (tenantId) {
            try {
                tenantId = multiTenantDB.validateTenantId(tenantId);
            } catch (validationError) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid tenant identifier',
                    error: process.env.NODE_ENV === 'development' ? validationError.message : undefined
                });
            }
        }

        // For routes that don't require tenant context, allow to proceed
        // (e.g., health checks, public endpoints)
        if (!tenantId) {
            // Check if this is a route that requires tenant context
            const requiresTenant = !req.path.match(/^\/(health|api\/health|ping|status)/);
            
            if (requiresTenant) {
                return res.status(400).json({
                    success: false,
                    message: 'Tenant identification required',
                    hint: 'Provide tenant ID via JWT token, x-tenant-id header, or query parameter'
                });
            }
        }

        // Inject tenant context into request
        if (tenantId) {
            req.tenantId = tenantId;
            req.tenantContext = {
                tenant_id: tenantId
            };

            // Add database connection reference
            req.db = multiTenantDB.getConnection();

            // Log tenant context in development mode
            if (process.env.LOG_LEVEL === 'debug') {
                console.log(`Tenant context set: ${tenantId} for ${req.method} ${req.path}`);
            }
        }

        next();
    } catch (error) {
        console.error('Tenant middleware error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Tenant context initialization failed',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

/**
 * Middleware to ensure tenant context exists
 * Use this for routes that absolutely require tenant identification
 */
export const requireTenant = async (req, res, next) => {
    if (!req.tenantId || !req.tenantContext) {
        return res.status(400).json({
            success: false,
            message: 'Tenant identification required',
            hint: 'Provide tenant ID via JWT token, x-tenant-id header, or query parameter'
        });
    }

    try {
        // Verify tenant exists and is active
        const tenantExists = await multiTenantDB.tenantExists(req.tenantId);
        
        if (!tenantExists) {
            return res.status(404).json({
                success: false,
                message: 'Tenant not found or inactive'
            });
        }

        // Optionally fetch and attach tenant metadata
        const tenantMetadata = await multiTenantDB.getTenantMetadata(req.tenantId);
        if (tenantMetadata) {
            req.tenant = tenantMetadata;
        }

        next();
    } catch (error) {
        console.error('Tenant verification error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Tenant verification failed',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Helper function to get tenant-scoped query options
 * Automatically adds tenant_id to where clause
 * 
 * @param {Object} req - Express request object
 * @param {Object} additionalWhere - Additional where conditions
 * @returns {Object} Query options with tenant_id
 */
export const getTenantQueryOptions = (req, additionalWhere = {}) => {
    if (!req.tenantId) {
        throw new Error('Tenant context not available');
    }

    return {
        where: {
            tenant_id: req.tenantId,
            ...additionalWhere
        }
    };
};

/**
 * Helper function to add tenant_id to data before creation
 * 
 * @param {Object} req - Express request object
 * @param {Object} data - Data to be created
 * @returns {Object} Data with tenant_id
 */
export const addTenantToData = (req, data) => {
    if (!req.tenantId) {
        throw new Error('Tenant context not available');
    }

    return {
        ...data,
        tenant_id: req.tenantId
    };
};

/**
 * Legacy helper function for backward compatibility
 * @deprecated Use req.db directly instead
 */
export const getCompanyModel = (req, modelName, schema) => {
    console.warn('Warning: getCompanyModel() is deprecated. Use Sequelize models directly with tenant_id filtering.');
    
    if (!req.db) {
        throw new Error('Database connection not available');
    }
    
    return req.db.model(modelName);
};

export default { 
    tenantMiddleware, 
    requireTenant, 
    getTenantQueryOptions, 
    addTenantToData,
    getCompanyModel 
};