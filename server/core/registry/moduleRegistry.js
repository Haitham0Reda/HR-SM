/**
 * Module Registry
 * 
 * Central registry for all available modules in the system
 * Handles module registration, metadata validation, and module discovery
 * 
 * Requirements: 7.1, 7.2, 12.1, 20.1
 */

import { pathToFileURL } from 'url';
import path from 'path';
import fs from 'fs/promises';
import AppError from '../errors/AppError.js';
import { ERROR_TYPES } from '../errors/errorTypes.js';
import logger from '../../utils/logger.js';

class ModuleRegistry {
    constructor() {
        this.modules = new Map();
        this.initialized = false;
        this.modulesPath = path.join(process.cwd(), 'server', 'modules');
    }

    /**
     * Register a module in the registry
     * 
     * @param {Object} moduleConfig - Module configuration object
     * @param {string} moduleConfig.name - Module name (unique identifier)
     * @param {string} moduleConfig.displayName - Human-readable module name
     * @param {string} moduleConfig.version - Module version
     * @param {string} moduleConfig.description - Module description
     * @param {Array<string>} moduleConfig.dependencies - Required module dependencies
     * @param {Array<string>} moduleConfig.optionalDependencies - Optional module dependencies
     * @param {Array<string>} moduleConfig.providesTo - Modules that can use this module
     * @param {Object} moduleConfig.routes - Route configuration
     * @param {Array<string>} moduleConfig.models - Model names
     * @throws {AppError} If module configuration is invalid
     */
    register(moduleConfig) {
        // Validate module configuration
        this.validateModuleConfig(moduleConfig);

        const { name } = moduleConfig;

        // Check if module already registered
        if (this.modules.has(name)) {
            logger.warn(`Module ${name} is already registered, overwriting`);
        }

        // Store module configuration
        this.modules.set(name, {
            ...moduleConfig,
            registeredAt: new Date().toISOString()
        });

        logger.info(`Module registered: ${name} v${moduleConfig.version}`);
    }

    /**
     * Validate module configuration
     * 
     * @param {Object} moduleConfig - Module configuration to validate
     * @throws {AppError} If configuration is invalid
     */
    validateModuleConfig(moduleConfig) {
        const requiredFields = ['name', 'displayName', 'version', 'description'];
        
        for (const field of requiredFields) {
            if (!moduleConfig[field]) {
                throw new AppError(
                    `Module configuration missing required field: ${field}`,
                    400,
                    ERROR_TYPES.VALIDATION_ERROR,
                    { field }
                );
            }
        }

        // Validate name format (lowercase, hyphens only)
        if (!/^[a-z0-9-]+$/.test(moduleConfig.name)) {
            throw new AppError(
                'Module name must be lowercase with hyphens only',
                400,
                ERROR_TYPES.VALIDATION_ERROR,
                { name: moduleConfig.name }
            );
        }

        // Validate dependencies are arrays
        if (moduleConfig.dependencies && !Array.isArray(moduleConfig.dependencies)) {
            throw new AppError(
                'Module dependencies must be an array',
                400,
                ERROR_TYPES.VALIDATION_ERROR
            );
        }

        if (moduleConfig.optionalDependencies && !Array.isArray(moduleConfig.optionalDependencies)) {
            throw new AppError(
                'Module optionalDependencies must be an array',
                400,
                ERROR_TYPES.VALIDATION_ERROR
            );
        }
    }

    /**
     * Get module configuration by name
     * 
     * @param {string} name - Module name
     * @returns {Object|null} Module configuration or null if not found
     */
    getModule(name) {
        return this.modules.get(name) || null;
    }

    /**
     * Check if module exists in registry
     * 
     * @param {string} name - Module name
     * @returns {boolean} True if module exists
     */
    hasModule(name) {
        return this.modules.has(name);
    }

    /**
     * Get all registered modules
     * 
     * @returns {Array<Object>} Array of all module configurations
     */
    getAllModules() {
        return Array.from(this.modules.values());
    }

    /**
     * Get modules by category
     * 
     * @param {string} category - Module category
     * @returns {Array<Object>} Array of modules in category
     */
    getModulesByCategory(category) {
        return this.getAllModules().filter(module => module.category === category);
    }

    /**
     * Get module dependencies
     * 
     * @param {string} name - Module name
     * @returns {Object} Object with dependencies and optionalDependencies arrays
     */
    getModuleDependencies(name) {
        const module = this.getModule(name);
        
        if (!module) {
            throw new AppError(
                `Module not found: ${name}`,
                404,
                ERROR_TYPES.MODULE_NOT_FOUND,
                { moduleName: name }
            );
        }

        return {
            dependencies: module.dependencies || [],
            optionalDependencies: module.optionalDependencies || []
        };
    }

    /**
     * Get modules that depend on a specific module
     * 
     * @param {string} name - Module name
     * @returns {Array<string>} Array of module names that depend on this module
     */
    getDependentModules(name) {
        const dependents = [];
        
        for (const [moduleName, moduleConfig] of this.modules) {
            const deps = moduleConfig.dependencies || [];
            if (deps.includes(name)) {
                dependents.push(moduleName);
            }
        }

        return dependents;
    }

    /**
     * Clear all registered modules
     * Useful for testing
     */
    clear() {
        this.modules.clear();
        this.initialized = false;
        logger.info('Module registry cleared');
    }

    /**
     * Get registry statistics
     * 
     * @returns {Object} Registry statistics
     */
    getStats() {
        return {
            totalModules: this.modules.size,
            initialized: this.initialized,
            modules: Array.from(this.modules.keys())
        };
    }

    /**
     * Mark registry as initialized
     */
    markInitialized() {
        this.initialized = true;
        logger.info(`Module registry initialized with ${this.modules.size} modules`);
    }

    /**
     * Discover and load all module.config.js files from the modules directory
     * 
     * @returns {Promise<void>}
     */
    async discoverModules() {
        try {
            logger.info('Discovering modules...');
            
            // Check if modules directory exists
            try {
                await fs.access(this.modulesPath);
            } catch (error) {
                logger.warn(`Modules directory not found: ${this.modulesPath}`);
                return;
            }

            // Read all directories in modules folder
            const entries = await fs.readdir(this.modulesPath, { withFileTypes: true });
            const moduleDirs = entries.filter(entry => entry.isDirectory());

            logger.info(`Found ${moduleDirs.length} potential module directories`);

            // Load each module's config
            for (const dir of moduleDirs) {
                const moduleName = dir.name;
                const configPath = path.join(this.modulesPath, moduleName, 'module.config.js');

                try {
                    // Check if module.config.js exists
                    await fs.access(configPath);

                    // Load the module config
                    const configUrl = pathToFileURL(configPath).href;
                    const moduleExport = await import(configUrl);
                    const moduleConfig = moduleExport.default || moduleExport;

                    // Register the module
                    this.register(moduleConfig);
                } catch (error) {
                    if (error.code === 'ENOENT') {
                        logger.warn(`Module ${moduleName} does not have a module.config.js file, skipping`);
                    } else {
                        logger.error(`Failed to load module ${moduleName}:`, error);
                    }
                }
            }

            this.markInitialized();
            logger.info(`Module discovery complete. Registered ${this.modules.size} modules`);
        } catch (error) {
            logger.error('Error during module discovery:', error);
            throw new AppError(
                'Failed to discover modules',
                500,
                ERROR_TYPES.MODULE_INITIALIZATION_ERROR,
                { error: error.message }
            );
        }
    }

    /**
     * Initialize the registry by discovering all modules
     * 
     * @returns {Promise<void>}
     */
    async initialize() {
        if (this.initialized) {
            logger.warn('Module registry already initialized');
            return;
        }

        await this.discoverModules();
    }
}

// Export singleton instance
const moduleRegistry = new ModuleRegistry();
export default moduleRegistry;
