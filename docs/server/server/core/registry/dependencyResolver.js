/**
 * Module Dependency Resolver
 * 
 * Resolves module dependencies and validates dependency chains
 * Detects circular dependencies and missing dependencies
 * 
 * Requirements: 7.2, 12.2, 12.3, 12.4
 */

import moduleRegistry from './moduleRegistry.js';
import AppError from '../errors/AppError.js';
import { ERROR_TYPES } from '../errors/errorTypes.js';
import logger from '../../utils/logger.js';

/**
 * Resolve dependencies for a module
 * 
 * @param {string} moduleName - Module name to resolve dependencies for
 * @param {Array<string>} enabledModules - List of currently enabled modules
 * @returns {Object} Resolution result with status and details
 */
export const resolveDependencies = (moduleName, enabledModules = []) => {
    const module = moduleRegistry.getModule(moduleName);
    
    if (!module) {
        throw new AppError(
            `Module not found: ${moduleName}`,
            404,
            ERROR_TYPES.MODULE_NOT_FOUND,
            { moduleName }
        );
    }

    const dependencies = module.dependencies || [];
    const optionalDependencies = module.optionalDependencies || [];
    
    // Check required dependencies
    const missingDependencies = dependencies.filter(dep => !enabledModules.includes(dep));
    
    if (missingDependencies.length > 0) {
        return {
            canEnable: false,
            missingDependencies,
            optionalDependencies: optionalDependencies.filter(dep => !enabledModules.includes(dep)),
            message: `Cannot enable ${moduleName}: missing required dependencies: ${missingDependencies.join(', ')}`
        };
    }

    // Check optional dependencies (informational only)
    const missingOptionalDependencies = optionalDependencies.filter(dep => !enabledModules.includes(dep));

    return {
        canEnable: true,
        missingDependencies: [],
        missingOptionalDependencies,
        message: missingOptionalDependencies.length > 0
            ? `Module ${moduleName} can be enabled, but some optional features may be unavailable: ${missingOptionalDependencies.join(', ')}`
            : `Module ${moduleName} can be enabled`
    };
};

/**
 * Check if a module can be disabled
 * Verifies no other enabled modules depend on it
 * 
 * @param {string} moduleName - Module name to check
 * @param {Array<string>} enabledModules - List of currently enabled modules
 * @returns {Object} Result with canDisable flag and dependent modules
 */
export const canDisableModule = (moduleName, enabledModules = []) => {
    const dependentModules = moduleRegistry.getDependentModules(moduleName);
    
    // Filter to only enabled dependent modules
    const enabledDependents = dependentModules.filter(dep => enabledModules.includes(dep));
    
    if (enabledDependents.length > 0) {
        return {
            canDisable: false,
            dependentModules: enabledDependents,
            message: `Cannot disable ${moduleName}: required by ${enabledDependents.join(', ')}`
        };
    }

    return {
        canDisable: true,
        dependentModules: [],
        message: `Module ${moduleName} can be disabled`
    };
};

/**
 * Detect circular dependencies in module dependency chain
 * 
 * @param {string} moduleName - Module name to check
 * @param {Set<string>} visited - Set of visited modules (for recursion)
 * @param {Array<string>} path - Current dependency path (for error reporting)
 * @returns {Object} Result with hasCircular flag and circular path if found
 */
export const detectCircularDependencies = (moduleName, visited = new Set(), path = []) => {
    // Check if we've seen this module in current path
    if (path.includes(moduleName)) {
        const circularPath = [...path, moduleName];
        return {
            hasCircular: true,
            circularPath,
            message: `Circular dependency detected: ${circularPath.join(' -> ')}`
        };
    }

    // Check if already fully explored
    if (visited.has(moduleName)) {
        return { hasCircular: false };
    }

    const module = moduleRegistry.getModule(moduleName);
    if (!module) {
        return { hasCircular: false };
    }

    const dependencies = module.dependencies || [];
    const newPath = [...path, moduleName];

    // Check each dependency recursively
    for (const dep of dependencies) {
        const result = detectCircularDependencies(dep, visited, newPath);
        if (result.hasCircular) {
            return result;
        }
    }

    // Mark as fully explored
    visited.add(moduleName);
    return { hasCircular: false };
};

/**
 * Get full dependency tree for a module
 * Returns all direct and transitive dependencies
 * 
 * @param {string} moduleName - Module name
 * @param {Set<string>} collected - Set of collected dependencies (for recursion)
 * @returns {Array<string>} Array of all dependency names
 */
export const getDependencyTree = (moduleName, collected = new Set()) => {
    const module = moduleRegistry.getModule(moduleName);
    
    if (!module) {
        return Array.from(collected);
    }

    const dependencies = module.dependencies || [];

    for (const dep of dependencies) {
        if (!collected.has(dep)) {
            collected.add(dep);
            // Recursively get dependencies of this dependency
            getDependencyTree(dep, collected);
        }
    }

    return Array.from(collected);
};

/**
 * Validate all dependencies exist in registry
 * 
 * @param {string} moduleName - Module name to validate
 * @returns {Object} Validation result
 */
export const validateDependencies = (moduleName) => {
    const module = moduleRegistry.getModule(moduleName);
    
    if (!module) {
        throw new AppError(
            `Module not found: ${moduleName}`,
            404,
            ERROR_TYPES.MODULE_NOT_FOUND,
            { moduleName }
        );
    }

    const dependencies = module.dependencies || [];
    const optionalDependencies = module.optionalDependencies || [];
    const allDeps = [...dependencies, ...optionalDependencies];
    
    const missingFromRegistry = allDeps.filter(dep => !moduleRegistry.hasModule(dep));

    if (missingFromRegistry.length > 0) {
        return {
            valid: false,
            missingFromRegistry,
            message: `Module ${moduleName} declares dependencies that don't exist: ${missingFromRegistry.join(', ')}`
        };
    }

    // Check for circular dependencies
    const circularCheck = detectCircularDependencies(moduleName);
    if (circularCheck.hasCircular) {
        return {
            valid: false,
            circularDependency: circularCheck.circularPath,
            message: circularCheck.message
        };
    }

    return {
        valid: true,
        message: `Module ${moduleName} dependencies are valid`
    };
};

/**
 * Get load order for modules based on dependencies
 * Returns modules in order such that dependencies are loaded first
 * 
 * @param {Array<string>} moduleNames - Array of module names to order
 * @returns {Array<string>} Ordered array of module names
 */
export const getLoadOrder = (moduleNames) => {
    const ordered = [];
    const visited = new Set();
    const visiting = new Set();

    const visit = (moduleName) => {
        // Skip if already processed
        if (visited.has(moduleName)) {
            return;
        }

        // Detect circular dependency
        if (visiting.has(moduleName)) {
            logger.warn(`Circular dependency detected involving ${moduleName}`);
            return;
        }

        visiting.add(moduleName);

        const module = moduleRegistry.getModule(moduleName);
        if (module) {
            const dependencies = module.dependencies || [];
            
            // Visit dependencies first
            for (const dep of dependencies) {
                if (moduleNames.includes(dep)) {
                    visit(dep);
                }
            }
        }

        visiting.delete(moduleName);
        visited.add(moduleName);
        ordered.push(moduleName);
    };

    // Visit each module
    for (const moduleName of moduleNames) {
        visit(moduleName);
    }

    return ordered;
};

export default {
    resolveDependencies,
    canDisableModule,
    detectCircularDependencies,
    getDependencyTree,
    validateDependencies,
    getLoadOrder
};
