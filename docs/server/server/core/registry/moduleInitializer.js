/**
 * Module Initializer
 * 
 * Initializes the module system by discovering modules, registering them,
 * and setting up dynamic route loading
 * 
 * Requirements: 1.1, 14.2, 14.3, 17.1, 17.2
 */

import moduleRegistry from './moduleRegistry.js';
import moduleLoader from './moduleLoader.js';
import featureFlagService from './featureFlagService.js';
import logger from '../../utils/logger.js';
import AppError from '../errors/AppError.js';
import { ERROR_TYPES } from '../errors/errorTypes.js';

class ModuleInitializer {
    constructor() {
        this.initialized = false;
        this.app = null;
    }

    /**
     * Initialize the module system
     * 
     * @param {Object} app - Express app instance
     * @param {Object} options - Initialization options
     * @param {Object} options.redisClient - Redis client for caching (optional)
     * @param {number} options.cacheTTL - Cache TTL in seconds (default: 300)
     * @returns {Promise<void>}
     */
    async initialize(app, options = {}) {
        if (this.initialized) {
            logger.warn('Module system already initialized');
            return;
        }

        try {
            logger.info('Initializing module system...');

            this.app = app;

            // Step 1: Initialize feature flag service
            featureFlagService.initialize(options.redisClient, options.cacheTTL);

            // Step 2: Discover and register all modules
            await moduleRegistry.initialize();

            // Step 3: Log registered modules
            const modules = moduleRegistry.getAllModules();
            logger.info(`Registered modules: ${modules.map(m => m.name).join(', ')}`);

            // Step 4: Validate all module dependencies
            for (const module of modules) {
                const validation = this.validateModuleDependencies(module.name);
                if (!validation.valid) {
                    logger.error(`Module ${module.name} has invalid dependencies: ${validation.message}`);
                }
            }

            this.initialized = true;
            logger.info('Module system initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize module system:', error);
            throw new AppError(
                'Module system initialization failed',
                500,
                ERROR_TYPES.MODULE_INITIALIZATION_ERROR,
                { error: error.message }
            );
        }
    }

    /**
     * Validate module dependencies
     * 
     * @param {string} moduleName - Module name to validate
     * @returns {Object} Validation result
     */
    validateModuleDependencies(moduleName) {
        const module = moduleRegistry.getModule(moduleName);
        
        if (!module) {
            return {
                valid: false,
                message: `Module ${moduleName} not found`
            };
        }

        const dependencies = module.dependencies || [];
        const missingDeps = dependencies.filter(dep => !moduleRegistry.hasModule(dep));

        if (missingDeps.length > 0) {
            return {
                valid: false,
                message: `Missing dependencies: ${missingDeps.join(', ')}`
            };
        }

        return {
            valid: true,
            message: 'All dependencies satisfied'
        };
    }

    /**
     * Load modules for a tenant
     * 
     * @param {Object} tenant - Tenant object
     * @returns {Promise<Array<string>>} Array of loaded module names
     */
    async loadModulesForTenant(tenant) {
        if (!this.initialized) {
            throw new AppError(
                'Module system not initialized',
                500,
                ERROR_TYPES.MODULE_INITIALIZATION_ERROR
            );
        }

        return await moduleLoader.loadModulesForTenant(tenant, this.app);
    }

    /**
     * Enable a module for a tenant at runtime
     * 
     * @param {string} tenantId - Tenant ID
     * @param {string} moduleName - Module name
     * @returns {Promise<boolean>} True if successfully enabled
     */
    async enableModuleForTenant(tenantId, moduleName) {
        if (!this.initialized) {
            throw new AppError(
                'Module system not initialized',
                500,
                ERROR_TYPES.MODULE_INITIALIZATION_ERROR
            );
        }

        return await moduleLoader.enableModuleForTenant(tenantId, moduleName, this.app);
    }

    /**
     * Disable a module for a tenant at runtime
     * 
     * @param {string} tenantId - Tenant ID
     * @param {string} moduleName - Module name
     * @returns {Promise<boolean>} True if successfully disabled
     */
    async disableModuleForTenant(tenantId, moduleName) {
        if (!this.initialized) {
            throw new AppError(
                'Module system not initialized',
                500,
                ERROR_TYPES.MODULE_INITIALIZATION_ERROR
            );
        }

        return await moduleLoader.disableModuleForTenant(tenantId, moduleName);
    }

    /**
     * Get system statistics
     * 
     * @returns {Object} System statistics
     */
    getStats() {
        return {
            initialized: this.initialized,
            registry: moduleRegistry.getStats(),
            loader: moduleLoader.getStats(),
            featureFlags: featureFlagService.getStats()
        };
    }

    /**
     * Check if module system is initialized
     * 
     * @returns {boolean} True if initialized
     */
    isInitialized() {
        return this.initialized;
    }
}

// Export singleton instance
const moduleInitializer = new ModuleInitializer();
export default moduleInitializer;
