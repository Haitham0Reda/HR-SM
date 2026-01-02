import express from 'express';
import ModuleAccessService from '../services/ModuleAccessService.js';
import CompanyService from '../services/CompanyService.js';
import { requireAuth } from '../shared/middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();
const companyService = new CompanyService();

/**
 * Company Module Routes
 * Used by HR applications to check module access and manage usage
 */

/**
 * Get company modules and their status
 * GET /api/v1/company/modules
 */
router.get('/modules', requireAuth, async (req, res) => {
  try {
    // Extract company slug from request
    const companySlug = ModuleAccessService.extractCompanySlug(req);
    
    if (!companySlug) {
      return res.status(400).json({
        success: false,
        message: 'Company identification required'
      });
    }

    const result = await ModuleAccessService.getCompanyModules(companySlug);
    res.json(result);

  } catch (error) {
    logger.error('Failed to get company modules', {
      error: error.message,
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      message: 'Failed to get company modules'
    });
  }
});

/**
 * Check access to a specific module
 * GET /api/v1/company/modules/:moduleKey/access
 */
router.get('/modules/:moduleKey/access', requireAuth, async (req, res) => {
  try {
    const { moduleKey } = req.params;
    const companySlug = ModuleAccessService.extractCompanySlug(req);
    
    if (!companySlug) {
      return res.status(400).json({
        success: false,
        message: 'Company identification required'
      });
    }

    const result = await ModuleAccessService.checkAccess(companySlug, moduleKey);
    
    res.json({
      success: true,
      moduleKey,
      ...result
    });

  } catch (error) {
    logger.error('Failed to check module access', {
      moduleKey: req.params.moduleKey,
      error: error.message,
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      message: 'Failed to check module access'
    });
  }
});

/**
 * Check access to multiple modules
 * POST /api/v1/company/modules/check-access
 */
router.post('/modules/check-access', requireAuth, async (req, res) => {
  try {
    const { moduleKeys } = req.body;
    
    if (!Array.isArray(moduleKeys)) {
      return res.status(400).json({
        success: false,
        message: 'moduleKeys must be an array'
      });
    }

    const companySlug = ModuleAccessService.extractCompanySlug(req);
    
    if (!companySlug) {
      return res.status(400).json({
        success: false,
        message: 'Company identification required'
      });
    }

    const result = await ModuleAccessService.checkMultipleAccess(companySlug, moduleKeys);
    res.json(result);

  } catch (error) {
    logger.error('Failed to check multiple module access', {
      error: error.message,
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      message: 'Failed to check module access'
    });
  }
});

/**
 * Update company usage statistics
 * PUT /api/v1/company/usage
 */
router.put('/usage', requireAuth, async (req, res) => {
  try {
    const { usage } = req.body;
    
    if (!usage || typeof usage !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Usage data is required'
      });
    }

    const companySlug = ModuleAccessService.extractCompanySlug(req);
    
    if (!companySlug) {
      return res.status(400).json({
        success: false,
        message: 'Company identification required'
      });
    }

    const result = await ModuleAccessService.updateUsage(companySlug, usage);
    res.json(result);

  } catch (error) {
    logger.error('Failed to update usage', {
      error: error.message,
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      message: 'Failed to update usage'
    });
  }
});

/**
 * Track API call usage
 * POST /api/v1/company/usage/api-call
 */
router.post('/usage/api-call', requireAuth, async (req, res) => {
  try {
    const { module: moduleKey } = req.body;
    const companySlug = ModuleAccessService.extractCompanySlug(req);
    
    if (!companySlug) {
      return res.status(400).json({
        success: false,
        message: 'Company identification required'
      });
    }

    // Increment API call count
    const result = await ModuleAccessService.updateUsage(companySlug, {
      apiCalls: 1 // This would be incremented, not set to 1
    });

    res.json(result);

  } catch (error) {
    logger.error('Failed to track API call', {
      error: error.message,
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      message: 'Failed to track API call'
    });
  }
});

/**
 * Get available modules (public information)
 * GET /api/v1/company/available-modules
 */
router.get('/available-modules', async (req, res) => {
  try {
    const ModuleManagementService = (await import('../platform/services/ModuleManagementService.js')).default;
    const modules = ModuleManagementService.getAvailableModules();
    
    res.json({
      success: true,
      modules
    });

  } catch (error) {
    logger.error('Failed to get available modules', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: 'Failed to get available modules'
    });
  }
});

/**
 * Get company email domain
 * GET /api/v1/company/email-domain
 */
router.get('/email-domain', requireAuth, async (req, res) => {
  try {
    // Extract company slug from request (tenant ID)
    const companySlug = ModuleAccessService.extractCompanySlug(req) || req.user?.tenantId;
    
    if (!companySlug) {
      return res.status(400).json({
        success: false,
        message: 'Company identification required'
      });
    }

    const emailDomain = await companyService.getCompanyEmailDomain(companySlug);
    
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
    logger.error('Failed to get company email domain', {
      error: error.message,
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      message: 'Failed to get email domain'
    });
  }
});

/**
 * Update company email domain
 * PUT /api/v1/company/email-domain
 */
router.put('/email-domain', requireAuth, async (req, res) => {
  try {
    // Check if user has admin permissions
    const userRole = req.user?.role;
    if (!['admin', 'hr', 'super-admin'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Admin privileges required to update email domain'
      });
    }

    // Extract company slug from request (tenant ID)
    const companySlug = ModuleAccessService.extractCompanySlug(req) || req.user?.tenantId;
    
    if (!companySlug) {
      return res.status(400).json({
        success: false,
        message: 'Company identification required'
      });
    }

    const { emailDomain } = req.body;
    
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

    const company = await companyService.updateCompanyEmailDomain(companySlug, emailDomain);

    res.json({
      success: true,
      data: company,
      message: `Email domain updated to ${emailDomain}`
    });
  } catch (error) {
    logger.error('Failed to update company email domain', {
      error: error.message,
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update email domain'
    });
  }
});

/**
 * Middleware to require specific module access
 * Can be used to protect routes that require specific modules
 */
export const requireModule = (moduleKey) => {
  return ModuleAccessService.requireModule(moduleKey);
};

/**
 * Middleware to require any of multiple modules
 */
export const requireAnyModule = (moduleKeys) => {
  return ModuleAccessService.requireAnyModule(moduleKeys);
};

export default router;