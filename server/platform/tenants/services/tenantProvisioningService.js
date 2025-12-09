const Tenant = require('../models/Tenant');
const User = require('../../../models/user.model');
const AppError = require('../../../core/errors/AppError');
const { ERROR_TYPES } = require('../../../core/errors/errorTypes');
const crypto = require('crypto');

/**
 * Tenant Provisioning Service
 * Handles tenant creation and initialization
 */
class TenantProvisioningService {
  /**
   * Generate unique tenant ID
   * 
   * @param {string} name - Tenant name
   * @returns {string} Generated tenant ID
   */
  generateTenantId(name) {
    // Create base from name (lowercase, replace spaces with hyphens)
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 20);

    // Add random suffix for uniqueness
    const suffix = crypto.randomBytes(4).toString('hex');

    return `${base}-${suffix}`;
  }

  /**
   * Create new tenant with initialization
   * 
   * @param {Object} tenantData - Tenant data
   * @param {string} tenantData.name - Tenant name
   * @param {string} tenantData.domain - Tenant domain (optional)
   * @param {string} tenantData.deploymentMode - Deployment mode (saas/on-premise)
   * @param {Object} tenantData.contactInfo - Contact information
   * @param {Object} tenantData.adminUser - Admin user data
   * @param {string} tenantData.adminUser.email - Admin email
   * @param {string} tenantData.adminUser.password - Admin password
   * @param {string} tenantData.adminUser.firstName - Admin first name
   * @param {string} tenantData.adminUser.lastName - Admin last name
   * @returns {Promise<Object>} Created tenant and admin user
   * @throws {AppError} If creation fails
   */
  async createTenant(tenantData) {
    const {
      name,
      domain,
      deploymentMode = 'saas',
      contactInfo = {},
      adminUser,
      metadata = {}
    } = tenantData;

    // Validate required fields
    if (!name) {
      throw new AppError(
        'Tenant name is required',
        400,
        ERROR_TYPES.INVALID_INPUT
      );
    }

    if (!adminUser || !adminUser.email || !adminUser.password) {
      throw new AppError(
        'Admin user email and password are required',
        400,
        ERROR_TYPES.INVALID_INPUT
      );
    }

    // Generate unique tenant ID
    let tenantId = this.generateTenantId(name);
    let attempts = 0;
    const maxAttempts = 5;

    // Ensure tenant ID is unique
    while (attempts < maxAttempts) {
      const existing = await Tenant.findOne({ tenantId });
      if (!existing) {
        break;
      }
      tenantId = this.generateTenantId(name);
      attempts++;
    }

    if (attempts === maxAttempts) {
      throw new AppError(
        'Failed to generate unique tenant ID',
        500,
        ERROR_TYPES.SYSTEM_ERROR
      );
    }

    // Check if domain is already taken (if provided)
    if (domain) {
      const existingDomain = await Tenant.findOne({ domain });
      if (existingDomain) {
        throw new AppError(
          'Domain is already in use',
          400,
          ERROR_TYPES.DUPLICATE_DOMAIN
        );
      }
    }

    // Create tenant
    const tenant = new Tenant({
      tenantId,
      name,
      domain,
      deploymentMode,
      status: 'trial',
      contactInfo: {
        adminEmail: adminUser.email,
        adminName: `${adminUser.firstName} ${adminUser.lastName}`,
        ...contactInfo
      },
      metadata,
      enabledModules: [
        {
          moduleId: 'hr-core',
          enabledAt: new Date(),
          enabledBy: 'system'
        }
      ],
      config: {
        timezone: 'UTC',
        locale: 'en-US',
        dateFormat: 'YYYY-MM-DD',
        timeFormat: '24h',
        currency: 'USD',
        features: {}
      },
      limits: {
        maxUsers: 100,
        maxStorage: 10737418240, // 10GB
        apiCallsPerMonth: 100000
      },
      usage: {
        userCount: 0,
        storageUsed: 0,
        apiCallsThisMonth: 0,
        lastResetDate: new Date()
      }
    });

    await tenant.save();

    // Create admin user for tenant
    let createdUser = null;
    try {
      createdUser = await this.createAdminUser(tenantId, adminUser);
    } catch (error) {
      // Rollback tenant creation if admin user creation fails
      await Tenant.deleteOne({ tenantId });
      throw error;
    }

    // Update tenant user count
    tenant.usage.userCount = 1;
    await tenant.save();

    return {
      tenant,
      adminUser: createdUser
    };
  }

  /**
   * Create admin user for tenant
   * 
   * @param {string} tenantId - Tenant ID
   * @param {Object} userData - User data
   * @returns {Promise<Object>} Created user
   * @throws {AppError} If creation fails
   */
  async createAdminUser(tenantId, userData) {
    const {
      email,
      password,
      firstName,
      lastName
    } = userData;

    // Check if user already exists for this tenant
    const existingUser = await User.findOne({ tenantId, email });
    if (existingUser) {
      throw new AppError(
        'User with this email already exists for this tenant',
        400,
        ERROR_TYPES.DUPLICATE_EMAIL
      );
    }

    // Create admin user
    const user = new User({
      tenantId,
      email,
      password,
      firstName,
      lastName,
      role: 'Admin',
      status: 'active',
      permissions: []
    });

    await user.save();

    // Return user without password
    const userObj = user.toObject();
    delete userObj.password;

    return userObj;
  }

  /**
   * Initialize tenant with default data
   * 
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<void>}
   */
  async initializeTenantData(tenantId) {
    // This method can be extended to create default departments,
    // positions, or other initial data for the tenant
    
    // For now, it's a placeholder for future initialization logic
    const tenant = await Tenant.findOne({ tenantId });
    
    if (!tenant) {
      throw new AppError(
        `Tenant with ID ${tenantId} not found`,
        404,
        ERROR_TYPES.TENANT_NOT_FOUND
      );
    }

    // Add any default initialization logic here
    // Example: Create default departments, positions, etc.

    return tenant;
  }

  /**
   * Provision tenant from template
   * 
   * @param {string} templateId - Template ID
   * @param {Object} tenantData - Tenant data
   * @returns {Promise<Object>} Created tenant
   */
  async provisionFromTemplate(templateId, tenantData) {
    // This is a placeholder for future template-based provisioning
    // Templates could include pre-configured modules, settings, etc.
    
    throw new AppError(
      'Template-based provisioning not yet implemented',
      501,
      ERROR_TYPES.NOT_IMPLEMENTED
    );
  }

  /**
   * Clone tenant configuration
   * 
   * @param {string} sourceTenantId - Source tenant ID
   * @param {Object} newTenantData - New tenant data
   * @returns {Promise<Object>} Created tenant
   */
  async cloneTenant(sourceTenantId, newTenantData) {
    const sourceTenant = await Tenant.findOne({ tenantId: sourceTenantId });

    if (!sourceTenant) {
      throw new AppError(
        `Source tenant with ID ${sourceTenantId} not found`,
        404,
        ERROR_TYPES.TENANT_NOT_FOUND
      );
    }

    // Create new tenant with cloned configuration
    const clonedData = {
      ...newTenantData,
      config: sourceTenant.config,
      limits: sourceTenant.limits,
      enabledModules: sourceTenant.enabledModules.map(m => ({
        moduleId: m.moduleId,
        enabledAt: new Date(),
        enabledBy: 'system'
      }))
    };

    return await this.createTenant(clonedData);
  }
}

module.exports = new TenantProvisioningService();
