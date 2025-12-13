import Company from '../models/Company.js';
import { generateLicenseFile, saveLicenseFile } from '../../utils/licenseFileGenerator.js';
import logger from '../../utils/logger.js';
import path from 'path';

/**
 * Module Management Service
 * Handles module licensing, permissions, and usage tracking for companies
 */
class ModuleManagementService {
  constructor() {
    this.availableModules = {
      'hr-core': {
        name: 'HR Core',
        description: 'Essential HR functionality including employee management',
        category: 'core',
        required: true,
        tiers: ['starter', 'business', 'enterprise']
      },
      'attendance': {
        name: 'Attendance Management',
        description: 'Time tracking, clock in/out, and attendance reports',
        category: 'time',
        required: false,
        tiers: ['starter', 'business', 'enterprise']
      },
      'leave': {
        name: 'Leave Management',
        description: 'Leave requests, approvals, and balance tracking',
        category: 'time',
        required: false,
        tiers: ['starter', 'business', 'enterprise']
      },
      'payroll': {
        name: 'Payroll Management',
        description: 'Salary processing, tax calculations, and payslips',
        category: 'finance',
        required: false,
        tiers: ['business', 'enterprise']
      },
      'documents': {
        name: 'Document Management',
        description: 'Employee documents, contracts, and file storage',
        category: 'documents',
        required: false,
        tiers: ['starter', 'business', 'enterprise']
      },
      'reports': {
        name: 'Advanced Reports',
        description: 'Custom reports, analytics, and data insights',
        category: 'analytics',
        required: false,
        tiers: ['business', 'enterprise']
      },
      'tasks': {
        name: 'Task Management',
        description: 'Task assignment, tracking, and project management',
        category: 'productivity',
        required: false,
        tiers: ['starter', 'business', 'enterprise']
      },
      'surveys': {
        name: 'Employee Surveys',
        description: 'Employee feedback, satisfaction surveys, and polls',
        category: 'engagement',
        required: false,
        tiers: ['business', 'enterprise']
      },
      'announcements': {
        name: 'Announcements',
        description: 'Company-wide announcements and notifications',
        category: 'communication',
        required: false,
        tiers: ['starter', 'business', 'enterprise']
      },
      'events': {
        name: 'Event Management',
        description: 'Company events, meetings, and calendar management',
        category: 'productivity',
        required: false,
        tiers: ['starter', 'business', 'enterprise']
      }
    };

    this.tierLimits = {
      starter: {
        employees: 50,
        storage: 1073741824, // 1GB
        apiCalls: 10000
      },
      business: {
        employees: 200,
        storage: 10737418240, // 10GB
        apiCalls: 50000
      },
      enterprise: {
        employees: null, // unlimited
        storage: null, // unlimited
        apiCalls: null // unlimited
      }
    };
  }

  /**
   * Get all available modules
   * @returns {Object} Available modules
   */
  getAvailableModules() {
    return this.availableModules;
  }

  /**
   * Get modules available for a specific tier
   * @param {string} tier - Pricing tier
   * @returns {Object} Available modules for tier
   */
  getModulesForTier(tier) {
    const modules = {};
    for (const [key, module] of Object.entries(this.availableModules)) {
      if (module.tiers.includes(tier)) {
        modules[key] = module;
      }
    }
    return modules;
  }

  /**
   * Get default limits for a tier
   * @param {string} tier - Pricing tier
   * @returns {Object} Default limits
   */
  getTierLimits(tier) {
    return this.tierLimits[tier] || this.tierLimits.starter;
  }

  /**
   * Enable a module for a company
   * @param {string} companyId - Company ID
   * @param {string} moduleKey - Module key
   * @param {string} tier - Pricing tier
   * @param {Object} customLimits - Custom limits (optional)
   * @returns {Promise<Object>} Result object
   */
  async enableModuleForCompany(companyId, moduleKey, tier = 'starter', customLimits = {}) {
    try {
      // Validate module exists
      if (!this.availableModules[moduleKey]) {
        throw new Error(`Module '${moduleKey}' does not exist`);
      }

      // Validate tier
      const module = this.availableModules[moduleKey];
      if (!module.tiers.includes(tier)) {
        throw new Error(`Module '${moduleKey}' is not available for tier '${tier}'. Available tiers: ${module.tiers.join(', ')}`);
      }

      // Find company
      const company = await Company.findById(companyId);
      if (!company) {
        throw new Error('Company not found');
      }

      // Get default limits for tier
      const defaultLimits = this.getTierLimits(tier);
      const limits = { ...defaultLimits, ...customLimits };

      // Enable module
      company.enableModule(moduleKey, tier, limits);
      await company.save();

      logger.info('Module enabled for company', {
        companyId,
        companyName: company.name,
        moduleKey,
        tier,
        limits
      });

      return {
        success: true,
        message: `Module '${module.name}' enabled successfully`,
        moduleConfig: company.getModuleConfig(moduleKey)
      };

    } catch (error) {
      logger.error('Failed to enable module for company', {
        companyId,
        moduleKey,
        tier,
        error: error.message
      });

      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Disable a module for a company
   * @param {string} companyId - Company ID
   * @param {string} moduleKey - Module key
   * @returns {Promise<Object>} Result object
   */
  async disableModuleForCompany(companyId, moduleKey) {
    try {
      // Check if module is required
      const module = this.availableModules[moduleKey];
      if (module && module.required) {
        throw new Error(`Cannot disable required module '${moduleKey}'`);
      }

      // Find company
      const company = await Company.findById(companyId);
      if (!company) {
        throw new Error('Company not found');
      }

      // Disable module
      company.disableModule(moduleKey);
      await company.save();

      logger.info('Module disabled for company', {
        companyId,
        companyName: company.name,
        moduleKey
      });

      return {
        success: true,
        message: `Module '${module?.name || moduleKey}' disabled successfully`
      };

    } catch (error) {
      logger.error('Failed to disable module for company', {
        companyId,
        moduleKey,
        error: error.message
      });

      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Update module limits for a company
   * @param {string} companyId - Company ID
   * @param {string} moduleKey - Module key
   * @param {Object} limits - New limits
   * @returns {Promise<Object>} Result object
   */
  async updateModuleLimits(companyId, moduleKey, limits) {
    try {
      // Find company
      const company = await Company.findById(companyId);
      if (!company) {
        throw new Error('Company not found');
      }

      // Check if module is enabled
      if (!company.isModuleEnabled(moduleKey)) {
        throw new Error(`Module '${moduleKey}' is not enabled for this company`);
      }

      // Update limits
      company.updateModuleLimits(moduleKey, limits);
      await company.save();

      logger.info('Module limits updated for company', {
        companyId,
        companyName: company.name,
        moduleKey,
        limits
      });

      return {
        success: true,
        message: 'Module limits updated successfully',
        moduleConfig: company.getModuleConfig(moduleKey)
      };

    } catch (error) {
      logger.error('Failed to update module limits for company', {
        companyId,
        moduleKey,
        limits,
        error: error.message
      });

      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Get company modules and their status
   * @param {string} companyId - Company ID
   * @returns {Promise<Object>} Company modules information
   */
  async getCompanyModules(companyId) {
    try {
      const company = await Company.findById(companyId);
      if (!company) {
        throw new Error('Company not found');
      }

      const modules = {};
      
      // Add all available modules with their status
      for (const [key, moduleInfo] of Object.entries(this.availableModules)) {
        const moduleConfig = company.getModuleConfig(key);
        modules[key] = {
          ...moduleInfo,
          enabled: moduleConfig ? moduleConfig.enabled : false,
          tier: moduleConfig ? moduleConfig.tier : null,
          limits: moduleConfig ? moduleConfig.limits : null,
          enabledAt: moduleConfig ? moduleConfig.enabledAt : null,
          disabledAt: moduleConfig ? moduleConfig.disabledAt : null
        };
      }

      return {
        success: true,
        company: {
          id: company._id,
          name: company.name,
          slug: company.slug,
          status: company.status,
          subscription: company.subscription
        },
        modules,
        usage: company.usage
      };

    } catch (error) {
      logger.error('Failed to get company modules', {
        companyId,
        error: error.message
      });

      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Check if company can access a module
   * @param {string} companyId - Company ID
   * @param {string} moduleKey - Module key
   * @returns {Promise<Object>} Access check result
   */
  async checkModuleAccess(companyId, moduleKey) {
    try {
      const company = await Company.findById(companyId);
      if (!company) {
        return { hasAccess: false, reason: 'Company not found' };
      }

      // Check if subscription is active
      if (!company.isSubscriptionActive()) {
        return { hasAccess: false, reason: 'Subscription expired' };
      }

      // Check if module is enabled
      if (!company.isModuleEnabled(moduleKey)) {
        return { hasAccess: false, reason: 'Module not enabled' };
      }

      // Check limits
      const limitCheck = company.checkModuleLimits(moduleKey);
      if (!limitCheck.withinLimits) {
        return { 
          hasAccess: false, 
          reason: 'Usage limits exceeded',
          violations: limitCheck.violations
        };
      }

      return { 
        hasAccess: true,
        moduleConfig: company.getModuleConfig(moduleKey),
        limits: limitCheck.limits,
        usage: limitCheck.usage
      };

    } catch (error) {
      logger.error('Failed to check module access', {
        companyId,
        moduleKey,
        error: error.message
      });

      return { hasAccess: false, reason: 'Internal error' };
    }
  }

  /**
   * Generate license file for a company
   * @param {string} companyId - Company ID
   * @param {string} secretKey - Secret key for signing
   * @returns {Promise<Object>} License generation result
   */
  async generateCompanyLicense(companyId, secretKey) {
    try {
      const company = await Company.findById(companyId);
      if (!company) {
        throw new Error('Company not found');
      }

      // Build modules configuration for license
      const modules = {};
      for (const [key, config] of company.modules) {
        if (config.enabled) {
          modules[key] = {
            enabled: true,
            tier: config.tier,
            limits: config.limits
          };
        }
      }

      // Calculate validity days based on subscription
      const now = new Date();
      const validityDays = Math.ceil((company.subscription.endDate - now) / (1000 * 60 * 60 * 24));

      // Generate license
      const licenseData = generateLicenseFile({
        companyId: company._id.toString(),
        companyName: company.name,
        validityDays: Math.max(validityDays, 1), // At least 1 day
        modules,
        metadata: {
          contactEmail: company.adminEmail,
          supportLevel: company.subscription.plan === 'enterprise' ? 'premium' : 'standard',
          notes: `${company.subscription.plan} license`
        }
      }, secretKey);

      // Save license data to company
      company.licenseKey = licenseData.licenseKey;
      company.licenseData = licenseData;
      await company.save();

      // Save license file to disk
      const licensePath = path.join(process.cwd(), 'uploads', company.slug, 'license.json');
      saveLicenseFile(licenseData, licensePath);

      logger.info('License generated for company', {
        companyId,
        companyName: company.name,
        licenseKey: licenseData.licenseKey,
        validityDays
      });

      return {
        success: true,
        licenseData,
        licensePath
      };

    } catch (error) {
      logger.error('Failed to generate company license', {
        companyId,
        error: error.message
      });

      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Update company usage statistics
   * @param {string} companyId - Company ID
   * @param {Object} usage - Usage data
   * @returns {Promise<Object>} Update result
   */
  async updateCompanyUsage(companyId, usage) {
    try {
      const company = await Company.findById(companyId);
      if (!company) {
        throw new Error('Company not found');
      }

      // Update usage
      if (usage.employees !== undefined) company.usage.employees = usage.employees;
      if (usage.storage !== undefined) company.usage.storage = usage.storage;
      if (usage.apiCalls !== undefined) company.usage.apiCalls = usage.apiCalls;
      
      company.usage.lastUpdated = new Date();
      await company.save();

      return { success: true };

    } catch (error) {
      logger.error('Failed to update company usage', {
        companyId,
        usage,
        error: error.message
      });

      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Get companies with expired subscriptions
   * @returns {Promise<Array>} Companies with expired subscriptions
   */
  async getExpiredSubscriptions() {
    try {
      return await Company.findExpiredSubscriptions();
    } catch (error) {
      logger.error('Failed to get expired subscriptions', {
        error: error.message
      });
      return [];
    }
  }

  /**
   * Bulk enable modules for multiple companies
   * @param {Array} companyIds - Array of company IDs
   * @param {string} moduleKey - Module key
   * @param {string} tier - Pricing tier
   * @returns {Promise<Object>} Bulk operation result
   */
  async bulkEnableModule(companyIds, moduleKey, tier = 'starter') {
    const results = {
      success: [],
      failed: []
    };

    for (const companyId of companyIds) {
      const result = await this.enableModuleForCompany(companyId, moduleKey, tier);
      if (result.success) {
        results.success.push(companyId);
      } else {
        results.failed.push({ companyId, error: result.message });
      }
    }

    logger.info('Bulk module enable completed', {
      moduleKey,
      tier,
      successCount: results.success.length,
      failedCount: results.failed.length
    });

    return results;
  }
}

export default new ModuleManagementService();