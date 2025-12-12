/**
 * Module Dependency Resolver Service
 * 
 * Handles dependency graph resolution, circular dependency detection,
 * transitive dependency resolution, and module activation validation.
 */

import { getModuleConfig, getAllModuleConfigs } from '../config/commercialModuleRegistry.js';

/**
 * Error class for dependency-related errors
 */
export class DependencyError extends Error {
    constructor(message, details = {}) {
        super(message);
        this.name = 'DependencyError';
        this.details = details;
    }
}

/**
 * Dependency Resolver Service
 */
export class DependencyResolver {
    constructor() {
        this.moduleConfigs = getAllModuleConfigs();
    }

    /**
     * Build a dependency graph for all modules
     * @returns {Map<string, Set<string>>} Adjacency list representation
     */
    buildDependencyGraph() {
        const graph = new Map();

        for (const [moduleKey, config] of Object.entries(this.moduleConfigs)) {
            if (!graph.has(moduleKey)) {
                graph.set(moduleKey, new Set());
            }

            // Add required dependencies
            const requiredDeps = config.dependencies?.required || [];
            for (const dep of requiredDeps) {
                graph.get(moduleKey).add(dep);
            }
        }

        return graph;
    }

    /**
     * Detect circular dependencies in the module graph
     * @returns {Array<Array<string>>} Array of circular dependency chains
     */
    detectCircularDependencies() {
        const graph = this.buildDependencyGraph();
        const visited = new Set();
        const recursionStack = new Set();
        const cycles = [];

        const dfs = (node, path = []) => {
            visited.add(node);
            recursionStack.add(node);
            path.push(node);

            const neighbors = graph.get(node) || new Set();
            for (const neighbor of neighbors) {
                if (!visited.has(neighbor)) {
                    dfs(neighbor, [...path]);
                } else if (recursionStack.has(neighbor)) {
                    // Found a cycle
                    const cycleStart = path.indexOf(neighbor);
                    const cycle = path.slice(cycleStart);
                    cycle.push(neighbor); // Complete the cycle
                    cycles.push(cycle);
                }
            }

            recursionStack.delete(node);
        };

        for (const node of graph.keys()) {
            if (!visited.has(node)) {
                dfs(node);
            }
        }

        return cycles;
    }

    /**
     * Resolve all dependencies for a module (including transitive)
     * @param {string} moduleKey - Module to resolve dependencies for
     * @param {boolean} includeOptional - Whether to include optional dependencies
     * @returns {Array<string>} Array of all dependencies
     */
    resolveDependencies(moduleKey, includeOptional = false) {
        const config = getModuleConfig(moduleKey);
        if (!config) {
            throw new DependencyError(`Module not found: ${moduleKey}`, { moduleKey });
        }

        const resolved = new Set();
        const visited = new Set();

        const resolve = (key) => {
            if (visited.has(key)) {
                return; // Already processed
            }
            visited.add(key);

            const moduleConfig = getModuleConfig(key);
            if (!moduleConfig) {
                throw new DependencyError(`Dependency not found: ${key}`, {
                    moduleKey,
                    missingDependency: key
                });
            }

            // Add required dependencies
            const requiredDeps = moduleConfig.dependencies?.required || [];
            for (const dep of requiredDeps) {
                resolved.add(dep);
                resolve(dep); // Recursively resolve
            }

            // Add optional dependencies if requested
            if (includeOptional) {
                const optionalDeps = moduleConfig.dependencies?.optional || [];
                for (const dep of optionalDeps) {
                    // Only add if the module exists
                    if (getModuleConfig(dep)) {
                        resolved.add(dep);
                        resolve(dep);
                    }
                }
            }
        };

        resolve(moduleKey);
        return Array.from(resolved);
    }

    /**
     * Resolve transitive dependencies (dependencies of dependencies)
     * @param {string} moduleKey - Module to resolve
     * @returns {Object} Object with direct and transitive dependencies
     */
    resolveTransitiveDependencies(moduleKey) {
        const config = getModuleConfig(moduleKey);
        if (!config) {
            throw new DependencyError(`Module not found: ${moduleKey}`, { moduleKey });
        }

        const directRequired = config.dependencies?.required || [];
        const directOptional = config.dependencies?.optional || [];
        const allTransitive = new Set();

        // Resolve transitive for each direct dependency
        for (const dep of directRequired) {
            const transitive = this.resolveDependencies(dep, false);
            transitive.forEach(t => allTransitive.add(t));
        }

        return {
            direct: {
                required: directRequired,
                optional: directOptional
            },
            transitive: Array.from(allTransitive).filter(
                dep => !directRequired.includes(dep)
            )
        };
    }

    /**
     * Validate that a module can be activated
     * @param {string} moduleKey - Module to validate
     * @param {Array<string>} enabledModules - Currently enabled modules
     * @returns {Object} Validation result
     */
    validateModuleActivation(moduleKey, enabledModules = []) {
        const config = getModuleConfig(moduleKey);
        if (!config) {
            return {
                valid: false,
                errors: [`Module not found: ${moduleKey}`],
                missingDependencies: []
            };
        }

        const errors = [];
        const missingDependencies = [];

        // Check required dependencies
        const requiredDeps = config.dependencies?.required || [];
        for (const dep of requiredDeps) {
            if (!enabledModules.includes(dep)) {
                missingDependencies.push(dep);
                errors.push(`Required dependency not enabled: ${dep}`);
            }
        }

        // Check for circular dependencies
        const cycles = this.detectCircularDependencies();
        const moduleCycles = cycles.filter(cycle => cycle.includes(moduleKey));
        if (moduleCycles.length > 0) {
            errors.push(`Circular dependency detected: ${moduleCycles[0].join(' -> ')}`);
        }

        return {
            valid: errors.length === 0,
            errors,
            missingDependencies,
            requiredDependencies: requiredDeps
        };
    }

    /**
     * Get activation order for a set of modules
     * @param {Array<string>} moduleKeys - Modules to activate
     * @returns {Array<string>} Modules in dependency order
     */
    getActivationOrder(moduleKeys) {
        const graph = this.buildDependencyGraph();
        const inDegree = new Map();
        const result = [];

        // Initialize in-certification for requested modules and their dependencies
        const allModules = new Set(moduleKeys);
        for (const moduleKey of moduleKeys) {
            const deps = this.resolveDependencies(moduleKey, false);
            deps.forEach(dep => allModules.add(dep));
        }

        // Calculate in-degrees
        for (const module of allModules) {
            inDegree.set(module, 0);
        }

        for (const module of allModules) {
            const deps = graph.get(module) || new Set();
            for (const dep of deps) {
                if (allModules.has(dep)) {
                    inDegree.set(dep, (inDegree.get(dep) || 0) + 1);
                }
            }
        }

        // Topological sort using Kahn's algorithm
        const queue = [];
        for (const [module, certification] of inDegree.entries()) {
            if (certification === 0) {
                queue.push(module);
            }
        }

        while (queue.length > 0) {
            const current = queue.shift();
            result.push(current);

            const deps = graph.get(current) || new Set();
            for (const dep of deps) {
                if (allModules.has(dep)) {
                    inDegree.set(dep, inDegree.get(dep) - 1);
                    if (inDegree.get(dep) === 0) {
                        queue.push(dep);
                    }
                }
            }
        }

        // Check if all modules were processed (no cycles)
        if (result.length !== allModules.size) {
            throw new DependencyError('Circular dependency detected in module set', {
                requested: moduleKeys,
                processed: result
            });
        }

        // Return in reverse order (dependencies first)
        return result.reverse();
    }

    /**
     * Check if module A depends on module B (directly or transitively)
     * @param {string} moduleA - Module to check
     * @param {string} moduleB - Potential dependency
     * @returns {boolean} True if A depends on B
     */
    dependsOn(moduleA, moduleB) {
        const dependencies = this.resolveDependencies(moduleA, false);
        return dependencies.includes(moduleB);
    }

    /**
     * Get all modules that depend on a given module
     * @param {string} moduleKey - Module to check
     * @returns {Array<string>} Modules that depend on this module
     */
    getDependents(moduleKey) {
        const dependents = [];

        for (const [key, config] of Object.entries(this.moduleConfigs)) {
            if (key === moduleKey) continue;

            const requiredDeps = config.dependencies?.required || [];
            const optionalDeps = config.dependencies?.optional || [];

            if (requiredDeps.includes(moduleKey) || optionalDeps.includes(moduleKey)) {
                dependents.push(key);
            }
        }

        return dependents;
    }

    /**
     * Validate entire dependency graph for consistency
     * @returns {Object} Validation result with any errors
     */
    validateDependencyGraph() {
        const errors = [];
        const warnings = [];

        // Check for circular dependencies
        const cycles = this.detectCircularDependencies();
        if (cycles.length > 0) {
            cycles.forEach(cycle => {
                errors.push({
                    type: 'CIRCULAR_DEPENDENCY',
                    message: `Circular dependency detected: ${cycle.join(' -> ')}`,
                    cycle
                });
            });
        }

        // Check for missing dependencies
        for (const [moduleKey, config] of Object.entries(this.moduleConfigs)) {
            const allDeps = [
                ...(config.dependencies?.required || []),
                ...(config.dependencies?.optional || [])
            ];

            for (const dep of allDeps) {
                if (!this.moduleConfigs[dep]) {
                    errors.push({
                        type: 'MISSING_DEPENDENCY',
                        message: `Module ${moduleKey} depends on non-existent module: ${dep}`,
                        module: moduleKey,
                        dependency: dep
                    });
                }
            }
        }

        // Check for self-dependencies
        for (const [moduleKey, config] of Object.entries(this.moduleConfigs)) {
            const allDeps = [
                ...(config.dependencies?.required || []),
                ...(config.dependencies?.optional || [])
            ];

            if (allDeps.includes(moduleKey)) {
                errors.push({
                    type: 'SELF_DEPENDENCY',
                    message: `Module ${moduleKey} depends on itself`,
                    module: moduleKey
                });
            }
        }

        // Check for orphaned modules (no dependents and not hr-core)
        for (const moduleKey of Object.keys(this.moduleConfigs)) {
            if (moduleKey === 'hr-core') continue;

            const dependents = this.getDependents(moduleKey);
            if (dependents.length === 0) {
                warnings.push({
                    type: 'ORPHANED_MODULE',
                    message: `Module ${moduleKey} has no dependents`,
                    module: moduleKey
                });
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Get dependency tree for visualization
     * @param {string} moduleKey - Root module
     * @param {number} maxDepth - Maximum depth to traverse
     * @returns {Object} Tree structure
     */
    getDependencyTree(moduleKey, maxDepth = 10) {
        const config = getModuleConfig(moduleKey);
        if (!config) {
            return null;
        }

        const buildTree = (key, depth = 0, visited = new Set()) => {
            if (depth >= maxDepth || visited.has(key)) {
                return {
                    key,
                    displayName: getModuleConfig(key)?.displayName || key,
                    circular: visited.has(key)
                };
            }

            visited.add(key);
            const moduleConfig = getModuleConfig(key);

            return {
                key,
                displayName: moduleConfig?.displayName || key,
                required: (moduleConfig?.dependencies?.required || []).map(dep =>
                    buildTree(dep, depth + 1, new Set(visited))
                ),
                optional: (moduleConfig?.dependencies?.optional || []).map(dep =>
                    buildTree(dep, depth + 1, new Set(visited))
                )
            };
        };

        return buildTree(moduleKey);
    }
}

// Export singleton instance
export const dependencyResolver = new DependencyResolver();

export default {
    DependencyResolver,
    DependencyError,
    dependencyResolver
};
