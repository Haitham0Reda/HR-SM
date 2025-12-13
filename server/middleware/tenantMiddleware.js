/**
 * Tenant Middleware
 * 
 * Handles company/tenant identification and database connection switching
 */

import multiTenantDB from '../config/multiTenant.js';
import jwt from 'jsonwebtoken';

/**
 * Middleware to identify and set company context
 * Company can be identified through:
 * 1. JWT token (preferred for authenticated requests)
 * 2. Header: x-company-id
 * 3. Query parameter: company
 * 4. Subdomain (if configured)
 */
export const tenantMiddleware = async (req, res, next) => {
    try {
        let companyName = null;

        // Method 1: Extract from JWT token
        const token = req.header('Authorization')?.replace('Bearer ', '') || 
                     req.cookies?.token;

        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                if (decoded.company) {
                    companyName = decoded.company;
                }
            } catch (jwtError) {
                // JWT verification failed, continue with other methods
                console.warn('JWT verification failed:', jwtError.message);
            }
        }

        // Method 2: Header
        if (!companyName) {
            companyName = req.header('x-company-id');
        }

        // Method 3: Query parameter
        if (!companyName) {
            companyName = req.query.company;
        }

        // Method 4: Subdomain (if using subdomain routing)
        if (!companyName && req.hostname) {
            const subdomain = req.hostname.split('.')[0];
            if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
                companyName = subdomain;
            }
        }

        // Default to main database if no company specified
        if (!companyName) {
            companyName = 'main';
        }

        // Sanitize company name
        const sanitizedCompanyName = multiTenantDB.sanitizeCompanyName(companyName);

        // Get company database connection
        const companyConnection = await multiTenantDB.getCompanyConnection(sanitizedCompanyName);

        // Add to request object
        req.company = {
            name: companyName,
            sanitizedName: sanitizedCompanyName,
            connection: companyConnection,
            backupPath: multiTenantDB.getCompanyBackupPath(companyName),
            uploadPath: multiTenantDB.getCompanyUploadPath(companyName)
        };

        next();
    } catch (error) {
        console.error('Tenant middleware error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Database connection error',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

/**
 * Middleware to ensure company exists
 */
export const requireCompany = async (req, res, next) => {
    if (!req.company) {
        return res.status(400).json({
            success: false,
            message: 'Company identification required'
        });
    }

    try {
        // Check if company exists in database
        const companyCollection = req.company.connection.collection('companies');
        const companyExists = await companyCollection.findOne({ 
            sanitizedName: req.company.sanitizedName 
        });

        if (!companyExists) {
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }

        // Add company data to request
        req.companyData = companyExists;
        next();
    } catch (error) {
        console.error('Company verification error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Company verification failed'
        });
    }
};

/**
 * Helper function to get model for company database
 */
export const getCompanyModel = (req, modelName, schema) => {
    if (!req.company || !req.company.connection) {
        throw new Error('Company connection not available');
    }
    
    return req.company.connection.model(modelName, schema);
};

export default { tenantMiddleware, requireCompany, getCompanyModel };