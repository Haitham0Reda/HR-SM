/**
 * Property-Based Tests for Dependency Enforcement
 * 
 * Feature: feature-productization, Property 4: Dependency Enforcement
 * Validates: Requirements 1.4
 * 
 * This test verifies that for any Product Module with required dependencies,
 * attempting to enable it without enabling its dependencies first should fail
 * with a clear error message.
 */

import fc from 'fast-check';
import { dependencyResolver } from '../../services/dependencyResolver.service.js';
import { getAllModuleConfigs } from '../../config/commercialModuleRegistry.js';
import { MODULES } from '../../shared/constants/modules.js';

describe('Dependency Enforcement - Property-Based Tests', () => {
    /**
     * Feature: feature-productization, Property 4: Dependency Enforcement
     * 
     * Property: For any Product Module with required dependencies, attempting to
     * enable it without enabling its dependencies first should fail with a clear
     * error message.
     * 
     * This property ensures that module dependencies are properly enforced,
     * as required by Requirement 1.4.
     */
    test('Property 4: Dependency Enforcement', async () => {
        // Get all module configurations
        const allModules = getAllModuleConfigs();
        
        // Filter modules that have required dependencies (excluding hr-core)
        const modulesWithDependencies = Object.entries(allModules)
            .filter(([key, config]) => {
                return key !== MODULES.CORE_HR && 
                       config.dependencies?.required?.length > 0;
            })
            .map(([key]) => key);

        // If no modules with dependencies exist, skip the test
        if (modulesWithDependencies.length === 0) {
            console.warn('No modules with dependencies found for testing');
            return;
        }

        await fc.assert(
            fc.property(
                // Generate arbitrary module and enabled module combinations
                fc.record({
                    // Pick a module that has dependencies
                    moduleKey: fc.constantFrom(...modulesWithDependencies),
                    // Generate a random subset of all available modules
                    enabledModules: fc.array(
                        fc.constantFrom(...Object.keys(allModules)),
                        { minLength: 0, maxLength: Object.keys(allModules).length }
                    ).map(modules => [...new Set(modules)]) // Remove duplicates
                }),
                ({ moduleKey, enabledModules }) => {
                    // Get the module's required dependencies
                    const moduleConfig = allModules[moduleKey];
                    const requiredDeps = moduleConfig.dependencies?.required || [];

                    // Check if all required dependencies are in the enabled list
                    const missingDeps = requiredDeps.filter(dep => !enabledModules.includes(dep));

                    // Validate module activation
                    const result = dependencyResolver.validateModuleActivation(
                        moduleKey,
                        enabledModules
                    );

                    if (missingDeps.length > 0) {
                        // If dependencies are missing, validation should fail
                        expect(result.valid).toBe(false);
                        expect(result.errors.length).toBeGreaterThan(0);
                        expect(result.missingDependencies.length).toBeGreaterThan(0);

                        // Verify all missing dependencies are reported
                        for (const missingDep of missingDeps) {
                            expect(result.missingDependencies).toContain(missingDep);
                        }

                        // Verify error messages are clear and mention the missing dependencies
                        const errorMessages = result.errors.join(' ');
                        for (const missingDep of missingDeps) {
                            expect(errorMessages).toContain(missingDep);
                        }

                        // Verify the error message mentions "dependency" or "required"
                        expect(errorMessages.toLowerCase()).toMatch(/dependency|required/);
                    } else {
                        // If all dependencies are present, validation should succeed
                        // (unless there are circular dependencies, which we check separately)
                        if (result.valid) {
                            expect(result.errors.length).toBe(0);
                            expect(result.missingDependencies.length).toBe(0);
                        }
                    }

                    // Verify required dependencies are always included in the result
                    expect(result.requiredDependencies).toBeDefined();
                    expect(Array.isArray(result.requiredDependencies)).toBe(true);
                    expect(result.requiredDependencies).toEqual(requiredDeps);
                }
            ),
            { numRuns: 100 } // Run 100 iterations as specified in design
        );
    });

    /**
     * Additional property: Transitive dependency enforcement
     * 
     * This ensures that not only direct dependencies are enforced, but also
     * transitive dependencies (dependencies of dependencies).
     */
    test('Property 4.1: Transitive Dependency Enforcement', async () => {
        const allModules = getAllModuleConfigs();
        
        // Find modules with transitive dependencies
        // For example, if A requires B and B requires C, then A transitively requires C
        const modulesWithTransitiveDeps = Object.entries(allModules)
            .filter(([key, config]) => {
                if (key === MODULES.CORE_HR) return false;
                
                const requiredDeps = config.dependencies?.required || [];
                // Check if any dependency has its own dependencies
                return requiredDeps.some(dep => {
                    const depConfig = allModules[dep];
                    return depConfig?.dependencies?.required?.length > 0;
                });
            })
            .map(([key]) => key);

        if (modulesWithTransitiveDeps.length === 0) {
            console.warn('No modules with transitive dependencies found for testing');
            return;
        }

        await fc.assert(
            fc.property(
                fc.record({
                    moduleKey: fc.constantFrom(...modulesWithTransitiveDeps),
                    // Generate enabled modules that might be missing transitive deps
                    includeDirectDeps: fc.boolean(),
                    includeTransitiveDeps: fc.boolean()
                }),
                ({ moduleKey, includeDirectDeps, includeTransitiveDeps }) => {
                    const moduleConfig = allModules[moduleKey];
                    const directDeps = moduleConfig.dependencies?.required || [];
                    
                    // Build enabled modules list based on flags
                    const enabledModules = [];
                    
                    if (includeDirectDeps) {
                        enabledModules.push(...directDeps);
                        
                        if (includeTransitiveDeps) {
                            // Add transitive dependencies
                            for (const dep of directDeps) {
                                const transitiveDeps = dependencyResolver.resolveDependencies(dep, false);
                                enabledModules.push(...transitiveDeps);
                            }
                        }
                    }

                    // Remove duplicates
                    const uniqueEnabled = [...new Set(enabledModules)];

                    // Validate
                    const result = dependencyResolver.validateModuleActivation(
                        moduleKey,
                        uniqueEnabled
                    );

                    // Get all required dependencies (including transitive)
                    const allRequiredDeps = dependencyResolver.resolveDependencies(moduleKey, false);

                    // Check if all required dependencies are present
                    const allDepsPresent = allRequiredDeps.every(dep => uniqueEnabled.includes(dep));

                    if (!allDepsPresent) {
                        // Should fail if any dependency (direct or transitive) is missing
                        expect(result.valid).toBe(false);
                        expect(result.errors.length).toBeGreaterThan(0);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Additional property: Dependency enforcement is consistent
     * 
     * This ensures that validating the same module with the same enabled modules
     * always produces the same result.
     */
    test('Property 4.2: Dependency Enforcement Consistency', async () => {
        const allModules = getAllModuleConfigs();
        const modulesWithDependencies = Object.keys(allModules).filter(
            key => key !== MODULES.CORE_HR && allModules[key].dependencies?.required?.length > 0
        );

        if (modulesWithDependencies.length === 0) {
            return;
        }

        await fc.assert(
            fc.property(
                fc.record({
                    moduleKey: fc.constantFrom(...modulesWithDependencies),
                    enabledModules: fc.array(
                        fc.constantFrom(...Object.keys(allModules)),
                        { minLength: 0, maxLength: 5 }
                    ).map(modules => [...new Set(modules)])
                }),
                ({ moduleKey, enabledModules }) => {
                    // Validate twice with the same inputs
                    const result1 = dependencyResolver.validateModuleActivation(
                        moduleKey,
                        enabledModules
                    );
                    
                    const result2 = dependencyResolver.validateModuleActivation(
                        moduleKey,
                        enabledModules
                    );

                    // Results should be identical
                    expect(result1.valid).toBe(result2.valid);
                    expect(result1.errors).toEqual(result2.errors);
                    expect(result1.missingDependencies).toEqual(result2.missingDependencies);
                    expect(result1.requiredDependencies).toEqual(result2.requiredDependencies);
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Additional property: Empty enabled modules list should fail for modules with dependencies
     * 
     * This is a specific edge case that should always fail for modules with dependencies.
     */
    test('Property 4.3: Empty Enabled Modules Fails for Dependent Modules', async () => {
        const allModules = getAllModuleConfigs();
        const modulesWithDependencies = Object.keys(allModules).filter(
            key => key !== MODULES.CORE_HR && allModules[key].dependencies?.required?.length > 0
        );

        if (modulesWithDependencies.length === 0) {
            return;
        }

        await fc.assert(
            fc.property(
                fc.constantFrom(...modulesWithDependencies),
                (moduleKey) => {
                    // Validate with empty enabled modules list
                    const result = dependencyResolver.validateModuleActivation(
                        moduleKey,
                        []
                    );

                    // Should always fail
                    expect(result.valid).toBe(false);
                    expect(result.errors.length).toBeGreaterThan(0);
                    expect(result.missingDependencies.length).toBeGreaterThan(0);

                    // All required dependencies should be reported as missing
                    const moduleConfig = allModules[moduleKey];
                    const requiredDeps = moduleConfig.dependencies?.required || [];
                    
                    for (const dep of requiredDeps) {
                        expect(result.missingDependencies).toContain(dep);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Additional property: Enabling all dependencies should succeed
     * 
     * This ensures that when all required dependencies are enabled,
     * the validation succeeds (assuming no circular dependencies).
     */
    test('Property 4.4: All Dependencies Enabled Succeeds', async () => {
        const allModules = getAllModuleConfigs();
        const modulesWithDependencies = Object.keys(allModules).filter(
            key => key !== MODULES.CORE_HR && allModules[key].dependencies?.required?.length > 0
        );

        if (modulesWithDependencies.length === 0) {
            return;
        }

        await fc.assert(
            fc.property(
                fc.constantFrom(...modulesWithDependencies),
                (moduleKey) => {
                    // Get all required dependencies (including transitive)
                    const allDeps = dependencyResolver.resolveDependencies(moduleKey, false);

                    // Validate with all dependencies enabled
                    const result = dependencyResolver.validateModuleActivation(
                        moduleKey,
                        allDeps
                    );

                    // Should succeed (unless there are circular dependencies)
                    if (result.valid) {
                        expect(result.errors.length).toBe(0);
                        expect(result.missingDependencies.length).toBe(0);
                    } else {
                        // If it fails, it should be due to circular dependencies
                        const errorMessages = result.errors.join(' ');
                        expect(errorMessages.toLowerCase()).toContain('circular');
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Additional property: Partial dependency enablement should fail
     * 
     * This ensures that enabling only some (but not all) required dependencies
     * results in validation failure.
     */
    test('Property 4.5: Partial Dependencies Fail', async () => {
        const allModules = getAllModuleConfigs();
        
        // Find modules with multiple dependencies
        const modulesWithMultipleDeps = Object.entries(allModules)
            .filter(([key, config]) => {
                return key !== MODULES.CORE_HR && 
                       config.dependencies?.required?.length >= 2;
            })
            .map(([key]) => key);

        if (modulesWithMultipleDeps.length === 0) {
            console.warn('No modules with multiple dependencies found for testing');
            return;
        }

        await fc.assert(
            fc.property(
                fc.record({
                    moduleKey: fc.constantFrom(...modulesWithMultipleDeps),
                    // Pick a random subset of dependencies (but not all)
                    skipSomeDeps: fc.boolean()
                }),
                ({ moduleKey, skipSomeDeps }) => {
                    const moduleConfig = allModules[moduleKey];
                    const requiredDeps = moduleConfig.dependencies?.required || [];

                    if (!skipSomeDeps || requiredDeps.length < 2) {
                        // Skip this iteration if we're not testing partial deps
                        return;
                    }

                    // Enable only the first dependency (skip the rest)
                    const partialDeps = [requiredDeps[0]];

                    // Validate
                    const result = dependencyResolver.validateModuleActivation(
                        moduleKey,
                        partialDeps
                    );

                    // Should fail because not all dependencies are enabled
                    expect(result.valid).toBe(false);
                    expect(result.missingDependencies.length).toBeGreaterThan(0);

                    // The missing dependencies should include the ones we skipped
                    const skippedDeps = requiredDeps.slice(1);
                    for (const skippedDep of skippedDeps) {
                        expect(result.missingDependencies).toContain(skippedDep);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });
});
