/**
 * Company Service
 * 
 * Business logic layer for company operations
 * Updated to use License Server API for tenant metadata and Sequelize for local operations
 */

import Company from '../platform/models/Company.sequelize.js';
import { createLicenseDataService } from './licenseDataService.js';
import logger from '../utils/logger.js';
import { Op } from 'sequelize';

// Initialize License Data Service
const licenseDataService = createLicenseDataService({
  licenseServerUrl: process.env.LICENSE_SERVER_URL || 'http://localhost:4000',
  licenseServerApiKey: process.env.LICENSE_SERVER_API_KEY || 'default-api-key',
  clientOptions: {
    timeout: 5000,
    maxRetries: 3
  }
});

class CompanyService {
  /**
   * Get company by tenant ID (slug)
   * Now queries License Server API instead of local database
   * 
   * @param {string} tenantId - Company slug/tenant ID
   * @param {object} connection - MongoDB connection (optional, for cache)
   * @returns {Promise<Object|null>} Company document or null
   * 
   * Requirements: 4.1
   */
  async getCompanyByTenantId(tenantId, connection = null) {
    try {
      // Query License Server API with caching and fallback
      const tenantData = await licenseDataService.getTenant(tenantId, connection);
      
      if (!tenantData) {
        logger.warn('Tenant not found in License Server', { tenantId });
        return null;
      }

      // Transform License Server response to match Company model format
      return this._transformTenantToCompany(tenantData);
    } catch (error) {
      logger.error('Failed to get company from License Server', {
        tenantId,
        error: error.message,
        stack: error.stack
      });
      throw new Error(`Failed to get company: ${error.message}`);
    }
  }

  /**
   * Transform License Server tenant data to Company model format
   * 
   * @private
   * @param {object} tenantData - Tenant data from License Server
   * @returns {object} Company-formatted data
   */
  _transformTenantToCompany(tenantData) {
    return {
      slug: tenantData.tenantId,
      name: tenantData.name,
      status: tenantData.subscription?.status === 'active' ? 'active' : 'inactive',
      subscription: {
        status: tenantData.subscription?.status || 'unknown',
        plan: tenantData.subscription?.plan || 'basic',
        expiresAt: tenantData.subscription?.expiresAt
      },
      modules: tenantData.enabledModules || [],
      // Include cache metadata if present
      _cached: tenantData.cached || false,
      _lastSyncedAt: tenantData.lastSyncedAt || null
    };
  }

  /**
   * Get company email domain by tenant ID
   * @param {string} tenantId - Company slug/tenant ID
   * @param {object} connection - MongoDB connection (optional, for cache)
   * @returns {Promise<string|null>} Email domain or null
   */
  async getCompanyEmailDomain(tenantId, connection = null) {
    try {
      const company = await this.getCompanyByTenantId(tenantId, connection);
      return company?.emailDomain || null;
    } catch (error) {
      throw new Error(`Failed to get company email domain: ${error.message}`);
    }
  }

  /**
   * Get enabled modules for a tenant
   * Now queries License Server API instead of local database
   * 
   * @param {string} tenantId - Company slug/tenant ID
   * @param {object} connection - MongoDB connection (optional, for cache)
   * @returns {Promise<string[]>} Array of enabled module IDs
   * 
   * Requirements: 4.2
   */
  async getEnabledModules(tenantId, connection = null) {
    try {
      const modules = await licenseDataService.getEnabledModules(tenantId, connection);
      
      logger.debug('Retrieved enabled modules for tenant', {
        tenantId,
        moduleCount: modules.length
      });

      return modules;
    } catch (error) {
      logger.error('Failed to get enabled modules from License Server', {
        tenantId,
        error: error.message
      });
      throw new Error(`Failed to get enabled modules: ${error.message}`);
    }
  }

  /**
   * Check if a module is enabled for a tenant
   * Now queries License Server API instead of local database
   * 
   * @param {string} tenantId - Company slug/tenant ID
   * @param {string} moduleId - Module identifier
   * @param {object} connection - MongoDB connection (optional, for cache)
   * @returns {Promise<boolean>} True if module is enabled
   * 
   * Requirements: 4.2
   */
  async isModuleEnabled(tenantId, moduleId, connection = null) {
    try {
      const isEnabled = await licenseDataService.isModuleEnabled(
        tenantId,
        moduleId,
        connection
      );

      logger.debug('Module enablement check', {
        tenantId,
        moduleId,
        isEnabled
      });

      return isEnabled;
    } catch (error) {
      logger.error('Failed to check module enablement', {
        tenantId,
        moduleId,
        error: error.message
      });
      throw new Error(`Failed to check module enablement: ${error.message}`);
    }
  }

  /**
   * Get subscription status for a tenant
   * Now queries License Server API instead of local database
   * 
   * @param {string} tenantId - Company slug/tenant ID
   * @param {object} connection - MongoDB connection (optional, for cache)
   * @returns {Promise<object>} Subscription details
   * 
   * Requirements: 4.3
   */
  async getSubscriptionStatus(tenantId, connection = null) {
    try {
      const subscription = await licenseDataService.getSubscription(tenantId, connection);
      
      logger.debug('Retrieved subscription status', {
        tenantId,
        status: subscription?.status,
        plan: subscription?.plan
      });

      return subscription;
    } catch (error) {
      logger.error('Failed to get subscription status from License Server', {
        tenantId,
        error: error.message
      });
      throw new Error(`Failed to get subscription status: ${error.message}`);
    }
  }

  /**
   * Update company email domain
   * @param {string} tenantId - Company slug/tenant ID
   * @param {string} emailDomain - New email domain
   * @returns {Promise<Object>} Updated company document
   */
  async updateCompanyEmailDomain(tenantId, emailDomain) {
    try {
      const [updatedCount, [company]] = await Company.update(
        { emailDomain },
        {
          where: { slug: tenantId },
          returning: true
        }
      );
      
      if (updatedCount === 0) {
        throw new Error('Company not found');
      }
      
      return company;
    } catch (error) {
      throw new Error(`Failed to update company email domain: ${error.message}`);
    }
  }

  /**
   * Create new company with email domain
   * @param {Object} companyData - Company data including emailDomain
   * @returns {Promise<Object>} Created company document
   */
  async createCompany(companyData) {
    try {
      const company = await Company.create(companyData);
      return company;
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        const field = error.errors[0]?.path || 'field';
        throw new Error(`${field.charAt(0).toUpperCase() + field.slice(1)} already exists`);
      }
      throw new Error(`Failed to create company: ${error.message}`);
    }
  }

  /**
   * Get all companies
   * @param {Object} filters - Filter options
   * @param {Object} options - Query options (pagination, sorting)
   * @returns {Promise<Object>} Companies with pagination info
   */
  async getCompanies(filters = {}, options = {}) {
    try {
      const { status, plan, page = 1, limit = 20, search } = filters;
      
      const where = {};
      
      if (status) where.status = status;
      if (plan) where['subscription.plan'] = plan;
      
      if (search) {
        where[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { slug: { [Op.iLike]: `%${search}%` } },
          { adminEmail: { [Op.iLike]: `%${search}%` } },
          { emailDomain: { [Op.iLike]: `%${search}%` } }
        ];
      }

      const queryOptions = {
        where,
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit)
      };

      const { rows: companies, count } = await Company.findAndCountAll(queryOptions);

      return {
        companies,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / parseInt(limit))
        }
      };
    } catch (error) {
      throw new Error(`Failed to get companies: ${error.message}`);
    }
  }

  /**
   * Update company
   * @param {string} tenantId - Company slug/tenant ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated company document
   */
  async updateCompany(tenantId, updateData) {
    try {
      const [updatedCount, [company]] = await Company.update(
        updateData,
        {
          where: { slug: tenantId },
          returning: true
        }
      );
      
      if (updatedCount === 0) {
        throw new Error('Company not found');
      }
      
      return company;
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        const field = error.errors[0]?.path || 'field';
        throw new Error(`${field.charAt(0).toUpperCase() + field.slice(1)} already exists`);
      }
      throw new Error(`Failed to update company: ${error.message}`);
    }
  }

  /**
   * Delete company (soft delete by setting status to inactive)
   * @param {string} tenantId - Company slug/tenant ID
   * @returns {Promise<Object>} Updated company document
   */
  async deleteCompany(tenantId) {
    try {
      const [updatedCount, [company]] = await Company.update(
        { status: 'inactive' },
        {
          where: { slug: tenantId },
          returning: true
        }
      );
      
      if (updatedCount === 0) {
        throw new Error('Company not found');
      }
      
      return company;
    } catch (error) {
      throw new Error(`Failed to delete company: ${error.message}`);
    }
  }
}

export default CompanyService;