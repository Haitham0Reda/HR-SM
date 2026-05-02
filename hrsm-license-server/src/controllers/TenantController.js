import Tenant from '../models/Tenant.js';
import logger from '../utils/logger.js';
import { Op } from 'sequelize';

/**
 * Tenant Controller - License Server (PostgreSQL/Sequelize)
 * Handles all tenant management operations
 * 
 * Requirements: 3.1-3.10 - Tenant management API endpoints
 */
class TenantController {
  
  /**
   * Get all tenants with pagination, filtering, and sorting
   * Requirement 3.1
   */
  async getAllTenants(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        subscriptionStatus,
        plan,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      // Build filter query
      const where = { status: { [Op.ne]: 'deleted' } };
      
      if (status) {
        where.status = status;
      }
      
      if (subscriptionStatus) {
        where.subscriptionStatus = subscriptionStatus;
      }
      
      if (plan) {
        where.subscriptionPlan = plan;
      }

      // Calculate pagination
      const offset = (parseInt(page) - 1) * parseInt(limit);
      const order = [[sortBy, sortOrder.toUpperCase()]];

      // Execute query
      const { count, rows: tenants } = await Tenant.findAndCountAll({
        where,
        order,
        offset,
        limit: parseInt(limit)
      });

      logger.info('Tenants retrieved successfully', {
        count: tenants.length,
        total: count,
        page,
        limit
      });

      res.json({
        success: true,
        data: {
          tenants: tenants.map(tenant => ({
            tenantId: tenant.tenantId,
            name: tenant.name,
            domain: tenant.domain,
            contactEmail: tenant.contactEmail,
            subscription: {
              status: tenant.subscriptionStatus,
              plan: tenant.subscriptionPlan,
              expiresAt: tenant.subscriptionExpiresAt
            },
            enabledModules: tenant.enabledModules,
            status: tenant.status,
            createdAt: tenant.createdAt,
            updatedAt: tenant.updatedAt
          })),
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: count,
            pages: Math.ceil(count / parseInt(limit))
          }
        }
      });

    } catch (error) {
      logger.error('Failed to get tenants', {
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve tenants',
          details: error.message
        }
      });
    }
  }

  /**
   * Get specific tenant by tenantId
   * Requirement 3.2
   */
  async getTenantById(req, res) {
    try {
      const { tenantId } = req.params;

      const tenant = await Tenant.findByTenantId(tenantId);

      if (!tenant) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'TENANT_NOT_FOUND',
            message: `Tenant with ID '${tenantId}' not found`,
            details: {}
          }
        });
      }

      logger.info('Tenant retrieved successfully', {
        tenantId: tenant.tenantId
      });

      res.json({
        success: true,
        data: {
          tenantId: tenant.tenantId,
          name: tenant.name,
          domain: tenant.domain,
          contactEmail: tenant.contactEmail,
          contactPhone: tenant.contactPhone,
          subscription: {
            status: tenant.subscriptionStatus,
            plan: tenant.subscriptionPlan,
            startDate: tenant.subscriptionStartDate,
            expiresAt: tenant.subscriptionExpiresAt,
            billingCycle: tenant.billingCycle,
            autoRenew: tenant.autoRenew
          },
          enabledModules: tenant.enabledModules,
          usageLimits: tenant.usageLimits,
          billing: tenant.billing,
          metadata: tenant.metadata,
          status: tenant.status,
          createdAt: tenant.createdAt,
          updatedAt: tenant.updatedAt
        }
      });

    } catch (error) {
      logger.error('Failed to get tenant', {
        error: error.message,
        tenantId: req.params.tenantId,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve tenant',
          details: error.message
        }
      });
    }
  }

  /**
   * Create new tenant
   * Requirement 3.3
   */
  async createTenant(req, res) {
    try {
      const {
        tenantId,
        name,
        domain,
        contactEmail,
        contactPhone,
        subscription,
        enabledModules,
        usageLimits,
        billing,
        metadata
      } = req.body;

      // Validate required fields
      if (!tenantId || !name || !domain || !contactEmail) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing required fields',
            details: {
              tenantId: !tenantId ? 'Required field missing' : undefined,
              name: !name ? 'Required field missing' : undefined,
              domain: !domain ? 'Required field missing' : undefined,
              contactEmail: !contactEmail ? 'Required field missing' : undefined
            }
          }
        });
      }

      // Check if tenant already exists
      const existingTenant = await Tenant.findOne({ where: { tenantId } });
      if (existingTenant) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'TENANT_EXISTS',
            message: `Tenant with ID '${tenantId}' already exists`,
            details: {}
          }
        });
      }

      // Create tenant
      const tenant = await Tenant.create({
        tenantId,
        name,
        domain,
        contactEmail,
        contactPhone,
        subscriptionStatus: subscription?.status || 'trial',
        subscriptionPlan: subscription?.plan || 'basic',
        subscriptionExpiresAt: subscription?.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        billingCycle: subscription?.billingCycle || 'monthly',
        autoRenew: subscription?.autoRenew || false,
        enabledModules: enabledModules || [],
        usageLimits: usageLimits || {},
        billing: billing || {},
        metadata: metadata || {}
      });

      logger.info('Tenant created successfully', {
        tenantId: tenant.tenantId,
        name: tenant.name
      });

      res.status(201).json({
        success: true,
        data: {
          tenantId: tenant.tenantId,
          name: tenant.name,
          domain: tenant.domain,
          contactEmail: tenant.contactEmail,
          subscription: {
            status: tenant.subscriptionStatus,
            plan: tenant.subscriptionPlan,
            expiresAt: tenant.subscriptionExpiresAt
          },
          enabledModules: tenant.enabledModules,
          status: tenant.status,
          createdAt: tenant.createdAt,
          updatedAt: tenant.updatedAt
        }
      });

    } catch (error) {
      logger.error('Failed to create tenant', {
        error: error.message,
        tenantId: req.body.tenantId,
        stack: error.stack
      });

      // Handle unique constraint error
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({
          success: false,
          error: {
            code: 'DUPLICATE_TENANT',
            message: 'Tenant with this ID or domain already exists',
            details: error.errors.map(e => e.message)
          }
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create tenant',
          details: error.message
        }
      });
    }
  }

  /**
   * Update tenant information
   * Requirement 3.4
   */
  async updateTenant(req, res) {
    try {
      const { tenantId } = req.params;
      const updates = req.body;

      // Prevent updating tenantId
      if (updates.tenantId && updates.tenantId !== tenantId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Cannot change tenantId',
            details: {}
          }
        });
      }

      const tenant = await Tenant.findByTenantId(tenantId);

      if (!tenant) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'TENANT_NOT_FOUND',
            message: `Tenant with ID '${tenantId}' not found`,
            details: {}
          }
        });
      }

      // Update fields
      const allowedUpdates = [
        'name', 'domain', 'contactEmail', 'contactPhone',
        'subscriptionStatus', 'subscriptionPlan', 'subscriptionExpiresAt',
        'billingCycle', 'autoRenew', 'enabledModules', 'usageLimits',
        'billing', 'metadata', 'status'
      ];

      allowedUpdates.forEach(field => {
        if (updates[field] !== undefined) {
          if (['usageLimits', 'billing', 'metadata'].includes(field)) {
            // Merge nested objects
            tenant[field] = { ...tenant[field], ...updates[field] };
          } else {
            tenant[field] = updates[field];
          }
        }
      });

      // Handle subscription object updates
      if (updates.subscription) {
        if (updates.subscription.status) tenant.subscriptionStatus = updates.subscription.status;
        if (updates.subscription.plan) tenant.subscriptionPlan = updates.subscription.plan;
        if (updates.subscription.expiresAt) tenant.subscriptionExpiresAt = updates.subscription.expiresAt;
        if (updates.subscription.billingCycle) tenant.billingCycle = updates.subscription.billingCycle;
        if (updates.subscription.autoRenew !== undefined) tenant.autoRenew = updates.subscription.autoRenew;
      }

      await tenant.save();

      logger.info('Tenant updated successfully', {
        tenantId: tenant.tenantId,
        updatedFields: Object.keys(updates)
      });

      res.json({
        success: true,
        data: {
          tenantId: tenant.tenantId,
          name: tenant.name,
          domain: tenant.domain,
          contactEmail: tenant.contactEmail,
          contactPhone: tenant.contactPhone,
          subscription: {
            status: tenant.subscriptionStatus,
            plan: tenant.subscriptionPlan,
            startDate: tenant.subscriptionStartDate,
            expiresAt: tenant.subscriptionExpiresAt,
            billingCycle: tenant.billingCycle,
            autoRenew: tenant.autoRenew
          },
          enabledModules: tenant.enabledModules,
          usageLimits: tenant.usageLimits,
          billing: tenant.billing,
          metadata: tenant.metadata,
          status: tenant.status,
          createdAt: tenant.createdAt,
          updatedAt: tenant.updatedAt
        }
      });

    } catch (error) {
      logger.error('Failed to update tenant', {
        error: error.message,
        tenantId: req.params.tenantId,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update tenant',
          details: error.message
        }
      });
    }
  }

  /**
   * Delete tenant (soft delete)
   * Requirement 3.5
   */
  async deleteTenant(req, res) {
    try {
      const { tenantId } = req.params;

      const tenant = await Tenant.findByTenantId(tenantId);

      if (!tenant) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'TENANT_NOT_FOUND',
            message: `Tenant with ID '${tenantId}' not found`,
            details: {}
          }
        });
      }

      // Soft delete
      await tenant.softDelete();

      logger.info('Tenant deleted successfully', {
        tenantId: tenant.tenantId
      });

      res.json({
        success: true,
        message: 'Tenant deleted successfully',
        data: {
          tenantId: tenant.tenantId,
          status: tenant.status,
          deletedAt: tenant.deletedAt
        }
      });

    } catch (error) {
      logger.error('Failed to delete tenant', {
        error: error.message,
        tenantId: req.params.tenantId,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete tenant',
          details: error.message
        }
      });
    }
  }

  /**
   * Get enabled modules for tenant
   * Requirement 3.6
   */
  async getTenantModules(req, res) {
    try {
      const { tenantId } = req.params;

      const tenant = await Tenant.findByTenantId(tenantId);

      if (!tenant) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'TENANT_NOT_FOUND',
            message: `Tenant with ID '${tenantId}' not found`,
            details: {}
          }
        });
      }

      logger.info('Tenant modules retrieved successfully', {
        tenantId: tenant.tenantId,
        moduleCount: tenant.enabledModules.length
      });

      res.json({
        success: true,
        data: {
          tenantId: tenant.tenantId,
          modules: tenant.enabledModules
        }
      });

    } catch (error) {
      logger.error('Failed to get tenant modules', {
        error: error.message,
        tenantId: req.params.tenantId,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve tenant modules',
          details: error.message
        }
      });
    }
  }

  /**
   * Enable module for tenant
   * Requirement 3.7
   */
  async enableModule(req, res) {
    try {
      const { tenantId, moduleId } = req.params;

      const tenant = await Tenant.findByTenantId(tenantId);

      if (!tenant) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'TENANT_NOT_FOUND',
            message: `Tenant with ID '${tenantId}' not found`,
            details: {}
          }
        });
      }

      // Enable module (idempotent)
      await tenant.enableModule(moduleId);

      logger.info('Module enabled for tenant', {
        tenantId: tenant.tenantId,
        moduleId
      });

      res.json({
        success: true,
        message: 'Module enabled successfully',
        data: {
          tenantId: tenant.tenantId,
          moduleId,
          enabledModules: tenant.enabledModules
        }
      });

    } catch (error) {
      logger.error('Failed to enable module', {
        error: error.message,
        tenantId: req.params.tenantId,
        moduleId: req.params.moduleId,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to enable module',
          details: error.message
        }
      });
    }
  }

  /**
   * Disable module for tenant
   * Requirement 3.8
   */
  async disableModule(req, res) {
    try {
      const { tenantId, moduleId } = req.params;

      const tenant = await Tenant.findByTenantId(tenantId);

      if (!tenant) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'TENANT_NOT_FOUND',
            message: `Tenant with ID '${tenantId}' not found`,
            details: {}
          }
        });
      }

      // Disable module (idempotent)
      await tenant.disableModule(moduleId);

      logger.info('Module disabled for tenant', {
        tenantId: tenant.tenantId,
        moduleId
      });

      res.json({
        success: true,
        message: 'Module disabled successfully',
        data: {
          tenantId: tenant.tenantId,
          moduleId,
          enabledModules: tenant.enabledModules
        }
      });

    } catch (error) {
      logger.error('Failed to disable module', {
        error: error.message,
        tenantId: req.params.tenantId,
        moduleId: req.params.moduleId,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to disable module',
          details: error.message
        }
      });
    }
  }
}

export default new TenantController();
