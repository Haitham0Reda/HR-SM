/**
 * Company Service
 * 
 * Business logic layer for company operations
 */

import Company from '../platform/models/Company.js';

class CompanyService {
  /**
   * Get company by tenant ID (slug)
   * @param {string} tenantId - Company slug/tenant ID
   * @returns {Promise<Object|null>} Company document or null
   */
  async getCompanyByTenantId(tenantId) {
    try {
      const company = await Company.findOne({ slug: tenantId });
      return company;
    } catch (error) {
      throw new Error(`Failed to get company: ${error.message}`);
    }
  }

  /**
   * Get company email domain by tenant ID
   * @param {string} tenantId - Company slug/tenant ID
   * @returns {Promise<string|null>} Email domain or null
   */
  async getCompanyEmailDomain(tenantId) {
    try {
      const company = await this.getCompanyByTenantId(tenantId);
      return company?.emailDomain || null;
    } catch (error) {
      throw new Error(`Failed to get company email domain: ${error.message}`);
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
      const company = await Company.findOneAndUpdate(
        { slug: tenantId },
        { emailDomain },
        { new: true, runValidators: true }
      );
      
      if (!company) {
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
      const company = new Company(companyData);
      await company.save();
      return company;
    } catch (error) {
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
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
      
      const filter = {};
      
      if (status) filter.status = status;
      if (plan) filter['subscription.plan'] = plan;
      
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { slug: { $regex: search, $options: 'i' } },
          { adminEmail: { $regex: search, $options: 'i' } },
          { emailDomain: { $regex: search, $options: 'i' } }
        ];
      }

      const queryOptions = {
        sort: { createdAt: -1 },
        limit: parseInt(limit),
        skip: (parseInt(page) - 1) * parseInt(limit)
      };

      const companies = await Company.find(filter, null, queryOptions);
      const count = await Company.countDocuments(filter);

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
      const company = await Company.findOneAndUpdate(
        { slug: tenantId },
        updateData,
        { new: true, runValidators: true }
      );
      
      if (!company) {
        throw new Error('Company not found');
      }
      
      return company;
    } catch (error) {
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
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
      const company = await Company.findOneAndUpdate(
        { slug: tenantId },
        { status: 'inactive' },
        { new: true }
      );
      
      if (!company) {
        throw new Error('Company not found');
      }
      
      return company;
    } catch (error) {
      throw new Error(`Failed to delete company: ${error.message}`);
    }
  }
}

export default CompanyService;