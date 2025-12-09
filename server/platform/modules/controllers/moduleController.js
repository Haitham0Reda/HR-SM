const moduleManagementService = require('../services/moduleManagementService');
const asyncHandler = require('../../../utils/asyncHandler');

/**
 * Module Controller
 * Handles HTTP requests for module management
 */

/**
 * List all available modules
 * GET /api/platform/modules
 */
exports.listModules = asyncHandler(async (req, res) => {
  const modules = moduleManagementService.getAllModules();

  res.status(200).json({
    success: true,
    data: {
      modules,
      count: modules.length
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

/**
 * Get module by name
 * GET /api/platform/modules/:moduleId
 */
exports.getModule = asyncHandler(async (req, res) => {
  const { moduleId } = req.params;

  const module = moduleManagementService.getModule(moduleId);

  res.status(200).json({
    success: true,
    data: {
      module
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

/**
 * Get module dependencies
 * GET /api/platform/modules/:moduleId/dependencies
 */
exports.getModuleDependencies = asyncHandler(async (req, res) => {
  const { moduleId } = req.params;

  const dependencies = moduleManagementService.getModuleDependencies(moduleId);

  res.status(200).json({
    success: true,
    data: dependencies,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

/**
 * Get enabled modules for tenant
 * GET /api/platform/modules/tenants/:tenantId/modules
 */
exports.getTenantModules = asyncHandler(async (req, res) => {
  const { tenantId } = req.params;

  const modules = await moduleManagementService.getEnabledModules(tenantId);

  res.status(200).json({
    success: true,
    data: {
      tenantId,
      modules,
      count: modules.length
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

/**
 * Enable module for tenant
 * POST /api/platform/modules/tenants/:tenantId/modules/:moduleId/enable
 */
exports.enableModule = asyncHandler(async (req, res) => {
  const { tenantId, moduleId } = req.params;
  const enabledBy = req.platformUser?.userId || 'platform-admin';

  const tenant = await moduleManagementService.enableModule(tenantId, moduleId, enabledBy);

  res.status(200).json({
    success: true,
    data: {
      tenant,
      message: `Module ${moduleId} enabled successfully`
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

/**
 * Disable module for tenant
 * DELETE /api/platform/modules/tenants/:tenantId/modules/:moduleId/disable
 */
exports.disableModule = asyncHandler(async (req, res) => {
  const { tenantId, moduleId } = req.params;

  const tenant = await moduleManagementService.disableModule(tenantId, moduleId);

  res.status(200).json({
    success: true,
    data: {
      tenant,
      message: `Module ${moduleId} disabled successfully`
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

/**
 * Enable multiple modules for tenant
 * POST /api/platform/modules/tenants/:tenantId/modules/enable-batch
 * 
 * Body:
 * - moduleIds: Array of module IDs to enable
 */
exports.enableModules = asyncHandler(async (req, res) => {
  const { tenantId } = req.params;
  const { moduleIds } = req.body;
  const enabledBy = req.platformUser?.userId || 'platform-admin';

  if (!Array.isArray(moduleIds) || moduleIds.length === 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'moduleIds must be a non-empty array'
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    });
  }

  const tenant = await moduleManagementService.enableModules(tenantId, moduleIds, enabledBy);

  res.status(200).json({
    success: true,
    data: {
      tenant,
      message: `${moduleIds.length} modules enabled successfully`
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

/**
 * Check if module can be enabled for tenant
 * GET /api/platform/modules/tenants/:tenantId/modules/:moduleId/can-enable
 */
exports.canEnableModule = asyncHandler(async (req, res) => {
  const { tenantId, moduleId } = req.params;

  const result = await moduleManagementService.canEnableModule(tenantId, moduleId);

  res.status(200).json({
    success: true,
    data: result,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

/**
 * Get module registry statistics
 * GET /api/platform/modules/stats
 */
exports.getModuleStats = asyncHandler(async (req, res) => {
  const stats = moduleManagementService.getRegistryStats();

  res.status(200).json({
    success: true,
    data: {
      statistics: stats
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});
