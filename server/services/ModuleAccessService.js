import Company from '../platform/models/Company.js';
import ModuleManagementService from '../platform/services/ModuleManagementService.js';
import logger from '../utils/logger.js';

/**
 * Module Access Service
 * Provides module access checking for HR applications
 * Used by tenant applications to verify module permissions
 */
class ModuleAccessService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Check if company has access to a module
   * @param {string} companySlug - Company slug
   * @param {string} moduleKey - Module key
   * @returns {Promise<Object>} Access check result
   */
  async checkAccess(companySlug, moduleKey) {
    try {
      const cacheKey = `${companySlug}:${moduleKey}`;
      
      // Check cache first
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          return cached.result;
        }
        this.cache.delete(cacheKey);
      }

      // Find company by slug (try both underscore and hyphen formats)
      let company = await Company.findOne({ slug: companySlug });
      
      // If not found and slug contains hyphens, try converting to underscores
      if (!company && companySlug.includes('-')) {
        const underscoreSlug = companySlug.replace(/-/g, '_');
        company = await Company.findOne({ slug: underscoreSlug });
      }
      
      // If not found and slug contains underscores, try converting to hyphens
      if (!company && companySlug.includes('_')) {
        const hyphenSlug = companySlug.replace(/_/g, '-');
        company = await Company.findOne({ slug: hyphenSlug });
      }
      
      if (!company) {
        const result = { hasAccess: false, reason: `Company not found: ${companySlug}` };
        this.cacheResult(cacheKey, result);
        return result;
      }

      // Use ModuleManagementService to check access
      const result = await ModuleManagementService.checkModuleAccess(company._id, moduleKey);
      
      // Cache the result
      this.cacheResult(cacheKey, result);
      
      return result;

    } catch (error) {
      logger.error('Module access check failed', {
        companySlug,
        moduleKey,
        error: error.message
      });

      return { hasAccess: false, reason: 'Internal error' };
    }
  }

  /**
   * Get all enabled modules for a company
   * @param {string} companySlug - Company slug
   * @returns {Promise<Object>} Company modules information
   */
  async getCompanyModules(companySlug) {
    try {
      const cacheKey = `modules:${companySlug}`;
      
      // Check cache first
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          return cached.result;
        }
        this.cache.delete(cacheKey);
      }

      // Find company by slug (try both underscore and hyphen formats)
      let company = await Company.findOne({ slug: companySlug });
      
      // If not found and slug contains hyphens, try converting to underscores
      if (!company && companySlug.includes('-')) {
        const underscoreSlug = companySlug.replace(/-/g, '_');
        company = await Company.findOne({ slug: underscoreSlug });
      }
      
      // If not found and slug contains underscores, try converting to hyphens
      if (!company && companySlug.includes('_')) {
        const hyphenSlug = companySlug.replace(/_/g, '-');
        company = await Company.findOne({ slug: hyphenSlug });
      }
      
      if (!company) {
        const result = { success: false, message: `Company not found: ${companySlug}` };
        this.cacheResult(cacheKey, result);
        return result;
      }

      // Get modules using ModuleManagementService
      const result = await ModuleManagementService.getCompanyModules(company._id);
      
      // Cache the result
      this.cacheResult(cacheKey, result);
      
      return result;

    } catch (error) {
      logger.error('Failed to get company modules', {
        companySlug,
        error: error.message
      });

      return { success: false, message: 'Internal error' };
    }
  }

  /**
   * Check multiple modules at once
   * @param {string} companySlug - Company slug
   * @param {Array} moduleKeys - Array of module keys
   * @returns {Promise<Object>} Access results for all modules
   */
  async checkMultipleAccess(companySlug, moduleKeys) {
    try {
      const results = {};
      
      // Check each module
      for (const moduleKey of moduleKeys) {
        results[moduleKey] = await this.checkAccess(companySlug, moduleKey);
      }

      return {
        success: true,
        companySlug,
        modules: results
      };

    } catch (error) {
      logger.error('Multiple module access check failed', {
        companySlug,
        moduleKeys,
        error: error.message
      });

      return { success: false, message: 'Internal error' };
    }
  }

  /**
   * Middleware to check module access
   * @param {string} moduleKey - Module key to check
   * @returns {Function} Express middleware function
   */
  requireModule(moduleKey) {
    return async (req, res, next) => {
      try {
        // Get company slug from request (could be from subdomain, header, or token)
        const companySlug = this.extractCompanySlug(req);
        
        if (!companySlug) {
          return res.status(400).json({
            success: false,
            message: 'Company identification required'
          });
        }

        // Check module access
        const accessResult = await this.checkAccess(companySlug, moduleKey);
        
        if (!accessResult.hasAccess) {
          return res.status(403).json({
            success: false,
            message: `Access denied to module: ${moduleKey}`,
            reason: accessResult.reason,
            violations: accessResult.violations
          });
        }

        // Add module info to request
        req.moduleAccess = {
          moduleKey,
          companySlug,
          config: accessResult.moduleConfig,
          limits: accessResult.limits,
          usage: accessResult.usage
        };

        next();

      } catch (error) {
        logger.error('Module access middleware error', {
          moduleKey,
          error: error.message
        });

        res.status(500).json({
          success: false,
          message: 'Internal server error during module access check'
        });
      }
    };
  }

  /**
   * Middleware to check any of multiple modules
   * @param {Array} moduleKeys - Array of module keys (user needs access to at least one)
   * @returns {Function} Express middleware function
   */
  requireAnyModule(moduleKeys) {
    return async (req, res, next) => {
      try {
        const companySlug = this.extractCompanySlug(req);
        
        if (!companySlug) {
          return res.status(400).json({
            success: false,
            message: 'Company identification required'
          });
        }

        // Check access to all modules
        const results = await this.checkMultipleAccess(companySlug, moduleKeys);
        
        if (!results.success) {
          return res.status(500).json(results);
        }

        // Check if user has access to at least one module
        const hasAnyAccess = Object.values(results.modules).some(result => result.hasAccess);
        
        if (!hasAnyAccess) {
          return res.status(403).json({
            success: false,
            message: 'Access denied. No access to required modules',
            requiredModules: moduleKeys,
            moduleResults: results.modules
          });
        }

        // Add module info to request
        req.moduleAccess = {
          companySlug,
          moduleResults: results.modules,
          availableModules: moduleKeys.filter(key => results.modules[key].hasAccess)
        };

        next();

      } catch (error) {
        logger.error('Multiple module access middleware error', {
          moduleKeys,
          error: error.message
        });

        res.status(500).json({
          success: false,
          message: 'Internal server error during module access check'
        });
      }
    };
  }

  /**
   * Extract company slug from request
   * @param {Object} req - Express request object
   * @returns {string|null} Company slug or null
   */
  extractCompanySlug(req) {
    // Try different methods to get company slug
    
    // 1. From subdomain (e.g., company.hrms.com)
    if (req.subdomains && req.subdomains.length > 0) {
      return req.subdomains[0];
    }

    // 2. From custom header
    if (req.headers['x-company-slug']) {
      return req.headers['x-company-slug'];
    }

    // 3. From JWT token (if company info is in token)
    if (req.user && req.user.companySlug) {
      return req.user.companySlug;
    }

    // 4. From query parameter (for development/testing)
    if (req.query.company) {
      return req.query.company;
    }

    // 5. From route parameter
    if (req.params.companySlug) {
      return req.params.companySlug;
    }

    return null;
  }

  /**
   * Cache access result
   * @param {string} key - Cache key
   * @param {Object} result - Result to cache
   */
  cacheResult(key, result) {
    this.cache.set(key, {
      result,
      timestamp: Date.now()
    });

    // Clean up old cache entries periodically
    if (this.cache.size > 1000) {
      this.cleanupCache();
    }
  }

  /**
   * Clean up expired cache entries
   */
  cleanupCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear cache for a company
   * @param {string} companySlug - Company slug
   */
  clearCompanyCache(companySlug) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(companySlug + ':') || key.startsWith('modules:' + companySlug)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Update company usage (called by applications)
   * @param {string} companySlug - Company slug
   * @param {Object} usage - Usage data
   * @returns {Promise<Object>} Update result
   */
  async updateUsage(companySlug, usage) {
    try {
      // Find company by slug
      const company = await Company.findOne({ slug: companySlug });
      if (!company) {
        return { success: false, message: 'Company not found' };
      }

      // Update usage using ModuleManagementService
      const result = await ModuleManagementService.updateCompanyUsage(company._id, usage);
      
      // Clear cache for this company
      this.clearCompanyCache(companySlug);
      
      return result;

    } catch (error) {
      logger.error('Failed to update company usage', {
        companySlug,
        usage,
        error: error.message
      });

      return { success: false, message: 'Internal error' };
    }
  }
}

export default new ModuleAccessService();