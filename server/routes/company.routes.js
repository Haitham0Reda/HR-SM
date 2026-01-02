/**
 * Company Routes
 * 
 * Routes for managing company information including email domains
 */

import express from 'express';
import CompanyService from '../services/CompanyService.js';
import { requireAuth, requireRole } from '../shared/middleware/auth.js';

const router = express.Router();
const companyService = new CompanyService();

/**
 * Get company information
 * GET /api/companies/:tenantId
 */
router.get('/:tenantId', requireAuth, async (req, res) => {
    try {
        const { tenantId } = req.params;
        
        // Check if user has access to this tenant
        if (req.user.tenantId !== tenantId && req.user.role !== 'super-admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied to this company'
            });
        }

        const company = await companyService.getCompanyByTenantId(tenantId);
        
        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }

        res.json({
            success: true,
            data: company
        });
    } catch (error) {
        console.error('❌ Error getting company:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * Get company email domain
 * GET /api/companies/:tenantId/email-domain
 */
router.get('/:tenantId/email-domain', requireAuth, async (req, res) => {
    try {
        const { tenantId } = req.params;
        
        // Check if user has access to this tenant
        if (req.user.tenantId !== tenantId && req.user.role !== 'super-admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied to this company'
            });
        }

        const emailDomain = await companyService.getCompanyEmailDomain(tenantId);
        
        if (!emailDomain) {
            return res.status(404).json({
                success: false,
                message: 'Email domain not configured for this company'
            });
        }

        res.json({
            success: true,
            data: { emailDomain }
        });
    } catch (error) {
        console.error('❌ Error getting company email domain:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * Update company email domain
 * PUT /api/companies/:tenantId/email-domain
 */
router.put('/:tenantId/email-domain', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const { tenantId } = req.params;
        const { emailDomain } = req.body;
        
        // Check if user has access to this tenant
        if (req.user.tenantId !== tenantId && req.user.role !== 'super-admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied to this company'
            });
        }

        if (!emailDomain) {
            return res.status(400).json({
                success: false,
                message: 'Email domain is required'
            });
        }

        // Validate email domain format
        const { validateEmailDomain } = await import('../utils/emailGenerator.js');
        if (!validateEmailDomain(emailDomain)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email domain format'
            });
        }

        const company = await companyService.updateCompanyEmailDomain(tenantId, emailDomain);

        res.json({
            success: true,
            data: company,
            message: `Email domain updated to ${emailDomain}`
        });
    } catch (error) {
        console.error('❌ Error updating company email domain:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * Get all companies (super-admin only)
 * GET /api/companies
 */
router.get('/', requireAuth, requireRole('super-admin'), async (req, res) => {
    try {
        const { status, plan, page, limit, search } = req.query;
        
        const result = await companyService.getCompanies(
            { status, plan, search },
            { page, limit }
        );

        res.json({
            success: true,
            data: result.companies,
            pagination: result.pagination
        });
    } catch (error) {
        console.error('❌ Error getting companies:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * Create new company (super-admin only)
 * POST /api/companies
 */
router.post('/', requireAuth, requireRole('super-admin'), async (req, res) => {
    try {
        const companyData = req.body;
        
        if (!companyData.emailDomain) {
            return res.status(400).json({
                success: false,
                message: 'Email domain is required'
            });
        }

        // Validate email domain format
        const { validateEmailDomain } = await import('../utils/emailGenerator.js');
        if (!validateEmailDomain(companyData.emailDomain)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email domain format'
            });
        }

        const company = await companyService.createCompany(companyData);

        res.status(201).json({
            success: true,
            data: company,
            message: 'Company created successfully'
        });
    } catch (error) {
        console.error('❌ Error creating company:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * Update company (admin only)
 * PUT /api/companies/:tenantId
 */
router.put('/:tenantId', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const { tenantId } = req.params;
        const updateData = req.body;
        
        // Check if user has access to this tenant
        if (req.user.tenantId !== tenantId && req.user.role !== 'super-admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied to this company'
            });
        }

        // Validate email domain if provided
        if (updateData.emailDomain) {
            const { validateEmailDomain } = await import('../utils/emailGenerator.js');
            if (!validateEmailDomain(updateData.emailDomain)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid email domain format'
                });
            }
        }

        const company = await companyService.updateCompany(tenantId, updateData);

        res.json({
            success: true,
            data: company,
            message: 'Company updated successfully'
        });
    } catch (error) {
        console.error('❌ Error updating company:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

export default router;