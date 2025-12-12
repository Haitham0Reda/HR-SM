/**
 * Module Loader
 * 
 * Dynamically loads modules based on tenant configuration
 * Handles module initialization, route registration, and cleanup
 * 
 * Requirements: 17.1, 17.2, 17.4
 */

import { pathToFileURL } from 'url';
import path from 'path';
import moduleRegistry from './moduleRegistry.js';
import { resolveDependencies, getLoadOrder } from './dependencyResolver.js';
import AppError from '../errors/AppError.js';
import { ERROR_TYPES } from '../errors/errorTypes.js';
import logger from '../../utils/logger.js';

class ModuleLoader {
    constructor() {
        this.loadedModules = new Map(); // moduleName -> module instance
        this.moduleRoutes = new Map(); // moduleName -> router
        this.tenantModules = new Map(); // tenantId -> Set of loaded module names
    }

    /**
     * Load a module and its dependencies
     * 
     * @param {string} moduleName - Module name to load
     * @param {Object} app - Express app instance
     * @param {string} tenantId - Tenant ID (optional, for tenant-specific loading)
     * @returns {Promise<Object>} Loaded module instance
     */
    async loadModule(moduleName, app, tenantId = null) {
        try {
            // Check if module is already loaded
            if (this.loadedModules.has(moduleName)) {
                logger.debug(`Module ${moduleName} already loaded`);
                return this.loadedModules.get(moduleName);
            }

            // Get module configuration from registry
            const moduleConfig = moduleRegistry.getModule(moduleName);
            
            if (!moduleConfig) {
                throw new AppError(
                    `Module not found in registry: ${moduleName}`,
                    404,
                    ERROR_TYPES.MODULE_NOT_FOUND,
                    { moduleName }
                );
            }

            // Load module file
            const modulePath = path.join(process.cwd(), 'server', 'modules', moduleName, 'module.config.js');
            const moduleUrl = pathToFileURL(modulePath).href;
            
            let moduleInstance;
            try {
                const moduleExport = await import(moduleUrl);
                moduleInstance = moduleExport.default || moduleExport;
            } catch (error) {
                logger.error(`Failed to load module ${moduleName}:`, error);
                throw new AppError(
                    `Failed to load module: ${moduleName}`,
                    500,
                    ERROR_TYPES.MODULE_LOAD_FAILED,
                    { moduleName, error: error.message }
                );
            }

            // Initialize module if it has an initialize function
            if (typeof moduleInstance.initialize === 'function') {
                try {
                    await moduleInstance.initialize(app, tenantId);
                    logger.info(`Module ${moduleName} initialized successfully`);
                } catch (error) {
                    logger.error(`Failed to initialize module ${moduleName}:`, error);
                    throw new AppError(
                        `Failed to initialize module: ${moduleName}`,
                        500,
                        ERROR_TYPES.MODULE_INITIALIZATION_ERROR,
                        { moduleName, error: error.message }
                    );
                }
            }

            // Store loaded module
            this.loadedModules.set(moduleName, moduleInstance);

            logger.info(`Module loaded: ${moduleName}`);
            return moduleInstance;
        } catch (error) {
            logger.error(`Error loading module ${moduleName}:`, error);
            throw error;
        }
    }

    /**
     * Load multiple modules in dependency order
     * 
     * @param {Array<string>} moduleNames - Array of module names to load
     * @param {Object} app - Express app instance
     * @param {string} tenantId - Tenant ID (optional)
     * @returns {Promise<Array<Object>>} Array of loaded module instances
     */
    async loadModules(moduleNames, app, tenantId = null) {
        // Get load order based on dependencies
        const orderedModules = getLoadOrder(moduleNames);
        
        logger.info(`Loading modules in order: ${orderedModules.join(', ')}`);

        const loadedInstances = [];

        for (const moduleName of orderedModules) {
            try {
                const instance = await this.loadModule(moduleName, app, tenantId);
                loadedInstances.push(instance);
            } catch (error) {
                logger.error(`Failed to load module ${moduleName}, continuing with others:`, error);
                // Continue loading other modules even if one fails
            }
        }

        return loadedInstances;
    }

    /**
     * Unload a module
     * 
     * @param {string} moduleName - Module name to unload
     * @param {string} tenantId - Tenant ID (optional)
     */
    async unloadModule(moduleName, tenantId = null) {
        const moduleInstance = this.loadedModules.get(moduleName);
        
        if (!moduleInstance) {
            logger.warn(`Module ${moduleName} is not loaded`);
            return;
        }

        // Call cleanup function if it exists
        if (typeof moduleInstance.cleanup === 'function') {
            try {
                await moduleInstance.cleanup(tenantId);
                logger.info(`Module ${moduleName} cleanup completed`);
            } catch (error) {
                logger.error(`Error during module ${moduleName} cleanup:`, error);
            }
        }

        // Remove from loaded modules
        this.loadedModules.delete(moduleName);
        this.moduleRoutes.delete(moduleName);

        logger.info(`Module unloaded: ${moduleName}`);
    }

    /**
     * Check if module is loaded
     * 
     * @param {string} moduleName - Module name
     * @returns {boolean} True if module is loaded
     */
    isModuleLoaded(moduleName) {
        return this.loadedModules.has(moduleName);
    }

    /**
     * Get loaded module instance
     * 
     * @param {string} moduleName - Module name
     * @returns {Object|null} Module instance or null
     */
    getLoadedModule(moduleName) {
        return this.loadedModules.get(moduleName) || null;
    }

    /**
     * Get all loaded modules
     * 
     * @returns {Array<string>} Array of loaded module names
     */
    getLoadedModules() {
        return Array.from(this.loadedModules.keys());
    }

    /**
     * Register module routes
     * 
     * @param {string} moduleName - Module name
     * @param {Object} router - Express router
     */
    registerModuleRoutes(moduleName, router) {
        this.moduleRoutes.set(moduleName, router);
        logger.info(`Routes registered for module: ${moduleName}`);
    }

    /**
     * Get module routes
     * 
     * @param {string} moduleName - Module name
     * @returns {Object|null} Express router or null
     */
    getModuleRoutes(moduleName) {
        return this.moduleRoutes.get(moduleName) || null;
    }

    /**
     * Clear all loaded modules
     * Useful for testing
     */
    clear() {
        this.loadedModules.clear();
        this.moduleRoutes.clear();
        logger.info('Module loader cleared');
    }

    /**
     * Get loader statistics
     * 
     * @returns {Object} Loader statistics
     */
    getStats() {
        return {
            loadedModules: this.loadedModules.size,
            registeredRoutes: this.moduleRoutes.size,
            modules: this.getLoadedModules(),
            tenantCount: this.tenantModules.size
        };
    }

    /**
     * Load modules for a specific tenant based on their configuration
     * 
     * @param {Object} tenant - Tenant object with enabledModules
     * @param {Object} app - Express app instance
     * @returns {Promise<Array<string>>} Array of successfully loaded module names
     */
    async loadModulesForTenant(tenant, app) {
        const tenantId = tenant.tenantId;
        const enabledModuleIds = tenant.enabledModules.map(m => m.moduleId);

        logger.info(`Loading modules for tenant ${tenantId}: ${enabledModuleIds.join(', ')}`);

        // Always include hr-core (it's required)
        if (!enabledModuleIds.includes('hr-core')) {
            enabledModuleIds.unshift('hr-core');
        }

        // Resolve dependencies and get load order
        const loadOrder = getLoadOrder(enabledModuleIds);
        const loadedForTenant = [];

        for (const moduleName of loadOrder) {
            try {
                // Check dependencies
                const depCheck = resolveDependencies(moduleName, enabledModuleIds);
                
                if (!depCheck.canEnable) {
                    logger.warn(`Cannot load module ${moduleName} for tenant ${tenantId}: ${depCheck.message}`);
                    continue;
                }

                // Load the module
                await this.loadModule(moduleName, app, tenantId);
                loadedForTenant.push(moduleName);

                // Log optional dependencies if missing
                if (depCheck.missingOptionalDependencies && depCheck.missingOptionalDependencies.length > 0) {
                    logger.info(`Module ${moduleName} loaded with degraded functionality: ${depCheck.message}`);
                }
            } catch (error) {
                logger.error(`Failed to load module ${moduleName} for tenant ${tenantId}:`, error);
                // Continue with other modules
            }
        }

        // Store loaded modules for this tenant
        this.tenantModules.set(tenantId, new Set(loadedForTenant));

        logger.info(`Loaded ${loadedForTenant.length} modules for tenant ${tenantId}`);
        return loadedForTenant;
    }

    /**
     * Get modules loaded for a specific tenant
     * 
     * @param {string} tenantId - Tenant ID
     * @returns {Array<string>} Array of module names loaded for tenant
     */
    getModulesForTenant(tenantId) {
        const modules = this.tenantModules.get(tenantId);
        return modules ? Array.from(modules) : [];
    }

    /**
     * Check if a module is loaded for a specific tenant
     * 
     * @param {string} tenantId - Tenant ID
     * @param {string} moduleName - Module name
     * @returns {boolean} True if module is loaded for tenant
     */
    isModuleLoadedForTenant(tenantId, moduleName) {
        const modules = this.tenantModules.get(tenantId);
        return modules ? modules.has(moduleName) : false;
    }

    /**
     * Enable a module for a tenant at runtime (without restart)
     * 
     * @param {string} tenantId - Tenant ID
     * @param {string} moduleName - Module name to enable
     * @param {Object} app - Express app instance
     * @returns {Promise<boolean>} True if successfully enabled
     */
    async enableModuleForTenant(tenantId, moduleName, app) {
        try {
            logger.info(`Enabling module ${moduleName} for tenant ${tenantId}`);

            // Check if already enabled
            if (this.isModuleLoadedForTenant(tenantId, moduleName)) {
                logger.warn(`Module ${moduleName} already enabled for tenant ${tenantId}`);
                return true;
            }

            // Get tenant's currently enabled modules
            const currentModules = this.getModulesForTenant(tenantId);
            
            // Check dependencies
            const depCheck = resolveDependencies(moduleName, currentModules);
            
            if (!depCheck.canEnable) {
                throw new AppError(
                    depCheck.message,
                    400,
                    ERROR_TYPES.MODULE_DEPENDENCY_MISSING,
                    { moduleName, missingDependencies: depCheck.missingDependencies }
                );
            }

            // Load the module
            await this.loadModule(moduleName, app, tenantId);

            // Add to tenant's loaded modules
            let tenantModules = this.tenantModules.get(tenantId);
            if (!tenantModules) {
                tenantModules = new Set();
                this.tenantModules.set(tenantId, tenantModules);
            }
            tenantModules.add(moduleName);

            logger.info(`Module ${moduleName} enabled for tenant ${tenantId}`);
            return true;
        } catch (error) {
            logger.error(`Failed to enable module ${moduleName} for tenant ${tenantId}:`, error);
            throw error;
        }
    }

    /**
     * Disable a module for a tenant at runtime (without restart)
     * 
     * @param {string} tenantId - Tenant ID
     * @param {string} moduleName - Module name to disable
     * @returns {Promise<boolean>} True if successfully disabled
     */
    async disableModuleForTenant(tenantId, moduleName) {
        try {
            logger.info(`Disabling module ${moduleName} for tenant ${tenantId}`);

            // Check if module is loaded
            if (!this.isModuleLoadedForTenant(tenantId, moduleName)) {
                logger.warn(`Module ${moduleName} not loaded for tenant ${tenantId}`);
                return true;
            }

            // Remove from tenant's loaded modules
            const tenantModules = this.tenantModules.get(tenantId);
            if (tenantModules) {
                tenantModules.delete(moduleName);
            }

            logger.info(`Module ${moduleName} disabled for tenant ${tenantId}`);
            return true;
        } catch (error) {
            logger.error(`Failed to disable module ${moduleName} for tenant ${tenantId}:`, error);
            throw error;
        }
    }

    /**
     * Reload modules for a tenant (useful after configuration changes)
     * 
     * @param {Object} tenant - Tenant object with updated configuration
     * @param {Object} app - Express app instance
     * @returns {Promise<Array<string>>} Array of loaded module names
     */
    async reloadModulesForTenant(tenant, app) {
        const tenantId = tenant.tenantId;
        
        logger.info(`Reloading modules for tenant ${tenantId}`);

        // Clear current tenant modules
        this.tenantModules.delete(tenantId);

        // Load modules based on new configuration
        return await this.loadModulesForTenant(tenant, app);
    }
}

// Export singleton instance
const moduleLoader = new ModuleLoader();
export default moduleLoader;
