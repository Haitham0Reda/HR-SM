import Tenant from '../../tenants/models/Tenant.js';
import moduleRegistry from '../../../core/registry/moduleRegistry.js';
import dependencyResolver from '../../../core/registry/dependencyResolver.js';
import AppError from '../../../core/errors/AppError.js';
import { ERROR_TYPES } from '../../../core/errors/errorTypes.js';

/**
 * Module Management Service
 * Handles runtime module enablement/disablement for tenants
 */
class ModuleManagementService {
  /**
   * Get all available modules from registry
   * 
   * @returns {Array<Object>} Array of module configurations
   */
  getAllModules() {
    return moduleRegistry.getAllModules();
  }

  /**
   * Get module by name
   * 
   * @param {string} moduleName - Module name
   * @returns {Object} Module configuration
   * @throws {AppError} If module not found
   */
  getModule(moduleName) {
    const module = moduleRegistry.getModule(moduleName);

    if (!module) {
      throw new AppError(
        `Module ${moduleName} not found in registry`,
        404,
        ERROR_TYPES.MODULE_NOT_FOUND
      );
    }

    return module;
  }

  /**
   * Get enabled modules for tenant
   * 
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array<Object>>} Array of enabled modules with details
   */
  async getEnabledModules(tenantId) {
    const tenant = await Tenant.findOne({ tenantId });

    if (!tenant) {
      throw new AppError(
        `Tenant with ID ${tenantId} not found`,
        404,
        ERROR_TYPES.TENANT_NOT_FOUND
      );
    }

    // Get full module details for enabled modules
    const enabledModules = tenant.enabledModules.map(em => {
      const moduleConfig = moduleRegistry.getModule(em.moduleId);
      return {
        ...em.toObject(),
        config: moduleConfig
      };
    });

    return enabledModules;
  }

  /**
   * Enable module for tenant
   * 
   * @param {string} tenantId - Tenant ID
   * @param {string} moduleId - Module ID to enable
   * @param {string} enabledBy - User who enabled the module
   * @returns {Promise<Object>} Updated tenant
   * @throws {AppError} If enablement fails
   */
  async enableModule(tenantId, moduleId, enabledBy = 'platform-admin') {
    // Check if module exists in registry
    if (!moduleRegistry.hasModule(moduleId)) {
      throw new AppError(
        `Module ${moduleId} not found in registry`,
        404,
        ERROR_TYPES.MODULE_NOT_FOUND
      );
    }

    // Get tenant
    const tenant = await Tenant.findOne({ tenantId });

    if (!tenant) {
      throw new AppError(
        `Tenant with ID ${tenantId} not found`,
        404,
        ERROR_TYPES.TENANT_NOT_FOUND
      );
    }

    // Check if module is already enabled
    if (tenant.isModuleEnabled(moduleId)) {
      return tenant; // Already enabled, return tenant
    }

    // Check dependencies
    const dependencies = moduleRegistry.getModuleDependencies(moduleId);
    const missingDependencies = [];

    for (const dep of dependencies.dependencies) {
      if (!tenant.isModuleEnabled(dep)) {
        missingDependencies.push(dep);
      }
    }

    if (missingDependencies.length > 0) {
      throw new AppError(
        `Cannot enable module ${moduleId}. Missing required dependencies: ${missingDependencies.join(', ')}`,
        400,
        ERROR_TYPES.MODULE_DEPENDENCY_MISSING,
        { missingDependencies }
      );
    }

    // Enable module
    tenant.enableModule(moduleId, enabledBy);
    await tenant.save();

    return tenant;
  }

  /**
   * Disable module for tenant
   * 
   * @param {string} tenantId - Tenant ID
   * @param {string} moduleId - Module ID to disable
   * @returns {Promise<Object>} Updated tenant
   * @throws {AppError} If disablement fails
   */
  async disableModule(tenantId, moduleId) {
    // Cannot disable hr-core
    if (moduleId === 'hr-core') {
      throw new AppError(
        'Cannot disable hr-core module. It is required for all tenants.',
        400,
        ERROR_TYPES.INVALID_OPERATION
      );
    }

    // Get tenant
    const tenant = await Tenant.findOne({ tenantId });

    if (!tenant) {
      throw new AppError(
        `Tenant with ID ${tenantId} not found`,
        404,
        ERROR_TYPES.TENANT_NOT_FOUND
      );
    }

    // Check if module is enabled
    if (!tenant.isModuleEnabled(moduleId)) {
      return tenant; // Already disabled, return tenant
    }

    // Check if other enabled modules depend on this module
    const dependentModules = [];

    for (const enabledModule of tenant.enabledModules) {
      if (enabledModule.moduleId === moduleId) continue;

      const deps = moduleRegistry.getModuleDependencies(enabledModule.moduleId);
      if (deps.dependencies.includes(moduleId)) {
        dependentModules.push(enabledModule.moduleId);
      }
    }

    if (dependentModules.length > 0) {
      throw new AppError(
        `Cannot disable module ${moduleId}. The following modules depend on it: ${dependentModules.join(', ')}`,
        400,
        ERROR_TYPES.MODULE_HAS_DEPENDENTS,
        { dependentModules }
      );
    }

    // Disable module
    tenant.disableModule(moduleId);
    await tenant.save();

    return tenant;
  }

  /**
   * Enable multiple modules for tenant
   * 
   * @param {string} tenantId - Tenant ID
   * @param {Array<string>} moduleIds - Array of module IDs to enable
   * @param {string} enabledBy - User who enabled the modules
   * @returns {Promise<Object>} Updated tenant
   * @throws {AppError} If enablement fails
   */
  async enableModules(tenantId, moduleIds, enabledBy = 'platform-admin') {
    // Validate all modules exist
    for (const moduleId of moduleIds) {
      if (!moduleRegistry.hasModule(moduleId)) {
        throw new AppError(
          `Module ${moduleId} not found in registry`,
          404,
          ERROR_TYPES.MODULE_NOT_FOUND
        );
      }
    }

    // Get tenant
    const tenant = await Tenant.findOne({ tenantId });

    if (!tenant) {
      throw new AppError(
        `Tenant with ID ${tenantId} not found`,
        404,
        ERROR_TYPES.TENANT_NOT_FOUND
      );
    }

    // Resolve dependencies and get correct order
    const currentlyEnabled = tenant.enabledModules.map(m => m.moduleId);
    const toEnable = moduleIds.filter(id => !currentlyEnabled.includes(id));

    if (toEnable.length === 0) {
      return tenant; // All already enabled
    }

    // Use dependency resolver to get correct order
    const orderedModules = dependencyResolver.getLoadOrder(
      [...currentlyEnabled, ...toEnable]
    );

    // Enable modules in dependency order
    for (const moduleId of orderedModules) {
      if (!tenant.isModuleEnabled(moduleId)) {
        tenant.enableModule(moduleId, enabledBy);
      }
    }

    await tenant.save();

    return tenant;
  }

  /**
   * Get module dependencies
   * 
   * @param {string} moduleId - Module ID
   * @returns {Object} Dependencies information
   */
  getModuleDependencies(moduleId) {
    if (!moduleRegistry.hasModule(moduleId)) {
      throw new AppError(
        `Module ${moduleId} not found in registry`,
        404,
        ERROR_TYPES.MODULE_NOT_FOUND
      );
    }

    const dependencies = moduleRegistry.getModuleDependencies(moduleId);
    const dependents = moduleRegistry.getDependentModules(moduleId);

    return {
      moduleId,
      dependencies: dependencies.dependencies,
      optionalDependencies: dependencies.optionalDependencies,
      dependents
    };
  }

  /**
   * Check if module can be enabled for tenant
   * 
   * @param {string} tenantId - Tenant ID
   * @param {string} moduleId - Module ID
   * @returns {Promise<Object>} Check result
   */
  async canEnableModule(tenantId, moduleId) {
    if (!moduleRegistry.hasModule(moduleId)) {
      return {
        canEnable: false,
        reason: 'Module not found in registry'
      };
    }

    const tenant = await Tenant.findOne({ tenantId });

    if (!tenant) {
      return {
        canEnable: false,
        reason: 'Tenant not found'
      };
    }

    if (tenant.isModuleEnabled(moduleId)) {
      return {
        canEnable: true,
        reason: 'Module already enabled'
      };
    }

    // Check dependencies
    const dependencies = moduleRegistry.getModuleDependencies(moduleId);
    const missingDependencies = [];

    for (const dep of dependencies.dependencies) {
      if (!tenant.isModuleEnabled(dep)) {
        missingDependencies.push(dep);
      }
    }

    if (missingDependencies.length > 0) {
      return {
        canEnable: false,
        reason: 'Missing required dependencies',
        missingDependencies
      };
    }

    return {
      canEnable: true,
      reason: 'All requirements met'
    };
  }

  /**
   * Get module registry statistics
   * 
   * @returns {Object} Registry statistics
   */
  getRegistryStats() {
    return moduleRegistry.getStats();
  }
}

export default new ModuleManagementService();
