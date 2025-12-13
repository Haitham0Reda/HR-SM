import ModuleManagementService from '../services/ModuleManagementService.js';
import Company from '../models/Company.js';
import logger from '../../utils/logger.js';

/**
 * Module Controller
 * Handles platform admin operations for managing company modules
 */
class ModuleController {
  /**
   * Get all available modules
   */
  async getAvailableModules(req, res) {
    try {
      const modules = ModuleManagementService.getAvailableModules();
      
      res.json({
        success: true,
        modules
      });
    } catch (error) {
      logger.error('Failed to get available modules', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to get available modules'
      });
    }
  }

  /**
   * Get modules for a specific tier
   */
  async getModulesForTier(req, res) {
    try {
      const { tier } = req.params;
      
      if (!['starter', 'business', 'enterprise'].includes(tier)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid tier. Must be starter, business, or enterprise'
        });
      }

      const modules = ModuleManagementService.getModulesForTier(tier);
      
      res.json({
        success: true,
        tier,
        modules
      });
    } catch (error) {
      logger.error('Failed to get modules for tier', { 
        tier: req.params.tier,
        error: error.message 
      });
      res.status(500).json({
        success: false,
        message: 'Failed to get modules for tier'
      });
    }
  }

  /**
   * Get all companies with their module status
   */
  async getAllCompaniesModules(req, res) {
    try {
      const { page = 1, limit = 20, status, search } = req.query;
      
      // Build query
      const query = {};
      if (status) query.status = status;
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { slug: { $regex: search, $options: 'i' } },
          { adminEmail: { $regex: search, $options: 'i' } }
        ];
      }

      // Get companies with pagination
      const companies = await Company.find(query)
        .select('name slug status subscription modules usage adminEmail createdAt')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Company.countDocuments(query);

      // Format response with module information
      const companiesWithModules = companies.map(company => {
        const enabledModules = company.getEnabledModules();
        const moduleCount = enabledModules.length;
        
        return {
          id: company._id,
          name: company.name,
          slug: company.slug,
          status: company.status,
          adminEmail: company.adminEmail,
          subscription: company.subscription,
          usage: company.usage,
          enabledModules,
          moduleCount,
          isSubscriptionActive: company.isSubscriptionActive(),
          daysUntilExpiration: company.getDaysUntilExpiration(),
          createdAt: company.createdAt
        };
      });

      res.json({
        success: true,
        companies: companiesWithModules,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.error('Failed to get companies modules', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to get companies modules'
      });
    }
  }

  /**
   * Get specific company modules
   */
  async getCompanyModules(req, res) {
    try {
      const { companyId } = req.params;
      
      const result = await ModuleManagementService.getCompanyModules(companyId);
      
      if (!result.success) {
        return res.status(404).json(result);
      }

      res.json(result);
    } catch (error) {
      logger.error('Failed to get company modules', { 
        companyId: req.params.companyId,
        error: error.message 
      });
      res.status(500).json({
        success: false,
        message: 'Failed to get company modules'
      });
    }
  }

  /**
   * Enable module for company
   */
  async enableModule(req, res) {
    try {
      const { companyId } = req.params;
      const { moduleKey, tier = 'starter', customLimits } = req.body;

      if (!moduleKey) {
        return res.status(400).json({
          success: false,
          message: 'Module key is required'
        });
      }

      const result = await ModuleManagementService.enableModuleForCompany(
        companyId, 
        moduleKey, 
        tier, 
        customLimits
      );

      const statusCode = result.success ? 200 : 400;
      res.status(statusCode).json(result);
    } catch (error) {
      logger.error('Failed to enable module', { 
        companyId: req.params.companyId,
        moduleKey: req.body.moduleKey,
        error: error.message 
      });
      res.status(500).json({
        success: false,
        message: 'Failed to enable module'
      });
    }
  }

  /**
   * Disable module for company
   */
  async disableModule(req, res) {
    try {
      const { companyId } = req.params;
      const { moduleKey } = req.body;

      if (!moduleKey) {
        return res.status(400).json({
          success: false,
          message: 'Module key is required'
        });
      }

      const result = await ModuleManagementService.disableModuleForCompany(companyId, moduleKey);

      const statusCode = result.success ? 200 : 400;
      res.status(statusCode).json(result);
    } catch (error) {
      logger.error('Failed to disable module', { 
        companyId: req.params.companyId,
        moduleKey: req.body.moduleKey,
        error: error.message 
      });
      res.status(500).json({
        success: false,
        message: 'Failed to disable module'
      });
    }
  }

  /**
   * Update module limits for company
   */
  async updateModuleLimits(req, res) {
    try {
      const { companyId } = req.params;
      const { moduleKey, limits } = req.body;

      if (!moduleKey || !limits) {
        return res.status(400).json({
          success: false,
          message: 'Module key and limits are required'
        });
      }

      const result = await ModuleManagementService.updateModuleLimits(companyId, moduleKey, limits);

      const statusCode = result.success ? 200 : 400;
      res.status(statusCode).json(result);
    } catch (error) {
      logger.error('Failed to update module limits', { 
        companyId: req.params.companyId,
        moduleKey: req.body.moduleKey,
        error: error.message 
      });
      res.status(500).json({
        success: false,
        message: 'Failed to update module limits'
      });
    }
  }

  /**
   * Generate license for company
   */
  async generateLicense(req, res) {
    try {
      const { companyId } = req.params;
      const secretKey = process.env.LICENSE_SECRET_KEY;

      if (!secretKey) {
        return res.status(500).json({
          success: false,
          message: 'License secret key not configured'
        });
      }

      const result = await ModuleManagementService.generateCompanyLicense(companyId, secretKey);

      const statusCode = result.success ? 200 : 400;
      res.status(statusCode).json(result);
    } catch (error) {
      logger.error('Failed to generate license', { 
        companyId: req.params.companyId,
        error: error.message 
      });
      res.status(500).json({
        success: false,
        message: 'Failed to generate license'
      });
    }
  }

  /**
   * Check module access for company
   */
  async checkModuleAccess(req, res) {
    try {
      const { companyId, moduleKey } = req.params;
      
      const result = await ModuleManagementService.checkModuleAccess(companyId, moduleKey);
      
      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      logger.error('Failed to check module access', { 
        companyId: req.params.companyId,
        moduleKey: req.params.moduleKey,
        error: error.message 
      });
      res.status(500).json({
        success: false,
        message: 'Failed to check module access'
      });
    }
  }

  /**
   * Update company usage
   */
  async updateUsage(req, res) {
    try {
      const { companyId } = req.params;
      const { usage } = req.body;

      if (!usage) {
        return res.status(400).json({
          success: false,
          message: 'Usage data is required'
        });
      }

      const result = await ModuleManagementService.updateCompanyUsage(companyId, usage);

      const statusCode = result.success ? 200 : 400;
      res.status(statusCode).json(result);
    } catch (error) {
      logger.error('Failed to update usage', { 
        companyId: req.params.companyId,
        error: error.message 
      });
      res.status(500).json({
        success: false,
        message: 'Failed to update usage'
      });
    }
  }

  /**
   * Bulk enable module for multiple companies
   */
  async bulkEnableModule(req, res) {
    try {
      const { companyIds, moduleKey, tier = 'starter' } = req.body;

      if (!companyIds || !Array.isArray(companyIds) || !moduleKey) {
        return res.status(400).json({
          success: false,
          message: 'Company IDs array and module key are required'
        });
      }

      const result = await ModuleManagementService.bulkEnableModule(companyIds, moduleKey, tier);

      res.json({
        success: true,
        result
      });
    } catch (error) {
      logger.error('Failed to bulk enable module', { 
        moduleKey: req.body.moduleKey,
        error: error.message 
      });
      res.status(500).json({
        success: false,
        message: 'Failed to bulk enable module'
      });
    }
  }

  /**
   * Get companies with expired subscriptions
   */
  async getExpiredSubscriptions(req, res) {
    try {
      const companies = await ModuleManagementService.getExpiredSubscriptions();
      
      const formattedCompanies = companies.map(company => ({
        id: company._id,
        name: company.name,
        slug: company.slug,
        status: company.status,
        adminEmail: company.adminEmail,
        subscription: company.subscription,
        daysOverdue: Math.abs(company.getDaysUntilExpiration()),
        enabledModules: company.getEnabledModules()
      }));

      res.json({
        success: true,
        companies: formattedCompanies,
        count: formattedCompanies.length
      });
    } catch (error) {
      logger.error('Failed to get expired subscriptions', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to get expired subscriptions'
      });
    }
  }

  /**
   * Get module usage statistics
   */
  async getModuleStats(req, res) {
    try {
      const stats = {};
      const availableModules = ModuleManagementService.getAvailableModules();

      // Get stats for each module
      for (const moduleKey of Object.keys(availableModules)) {
        const enabledCompanies = await Company.findByModule(moduleKey, true);
        const totalCompanies = await Company.findByModule(moduleKey, false);
        
        stats[moduleKey] = {
          name: availableModules[moduleKey].name,
          enabledCompanies: enabledCompanies.length,
          totalCompanies: totalCompanies.length,
          enabledPercentage: totalCompanies.length > 0 
            ? Math.round((enabledCompanies.length / totalCompanies.length) * 100) 
            : 0
        };
      }

      // Get overall stats
      const totalCompanies = await Company.countDocuments();
      const activeCompanies = await Company.countDocuments({ status: 'active' });
      const expiredSubscriptions = await Company.countDocuments({
        'subscription.endDate': { $lt: new Date() },
        status: { $in: ['active', 'trial'] }
      });

      res.json({
        success: true,
        moduleStats: stats,
        overallStats: {
          totalCompanies,
          activeCompanies,
          expiredSubscriptions,
          activePercentage: totalCompanies > 0 
            ? Math.round((activeCompanies / totalCompanies) * 100) 
            : 0
        }
      });
    } catch (error) {
      logger.error('Failed to get module stats', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to get module stats'
      });
    }
  }
}

export default new ModuleController();