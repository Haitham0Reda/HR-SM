/**
 * Property-Based Tests for Optional Integration Graceful Degradation
 * 
 * Feature: feature-productization, Property 26: Optional Integration Graceful Degradation
 * Validates: Requirements 8.5
 * 
 * This test verifies that for any Product Module with optional integrations,
 * the module should function correctly even when those optional integrations
 * are disabled.
 */

import fc from 'fast-check';
import { dependencyResolver } from '../../services/dependencyResolver.service.js';
import { getAllModuleConfigs } from '../../config/commercialModuleRegistry.js';
import { MODULES } from '../../shared/constants/modules.js';

describe('Optional Integration Graceful Degradation - Property-Based Tests', () => {
    /**
     * Feature: feature-productization, Property 26: Optional Integration Graceful Degradation
     * 
     * Property: For any Product Module with optional integrations, the module should
     * function correctly even when those optional integrations are disabled.
     * 
     * This property ensures that modules can operate independently of their optional
     * dependencies, as required by Requirement 8.5.
     */
    test('Property 26: Optional Integration Graceful Degradation', async () => {
        // Get all module configurations
        const allModules = getAllModuleConfigs();
        
        // Filter modules that have optional dependencies
        const modulesWithOptionalDeps = Object.entries(allModules)
            .filter(([key, config]) => {
                return config.dependencies?.optional?.length > 0;
            })
            .map(([key]) => key);

        // If no modules with optional dependencies exist, skip the test
        if (modulesWithOptionalDeps.length === 0) {
            console.warn('No modules with optional dependencies found for testing');
            return;
        }

        await fc.assert(
            fc.property(
                fc.record({
                    // Pick a module that has optional dependencies
                    moduleKey: fc.constantFrom(...modulesWithOptionalDeps),
                    // Generate a random subset of optional dependencies to disable
                    disableOptionalDeps: fc.boolean()
                }),
                ({ moduleKey, disableOptionalDeps }) => {
                    const moduleConfig = allModules[moduleKey];
                    const requiredDeps = moduleConfig.dependencies?.required || [];
                    const optionalDeps = moduleConfig.dependencies?.optional || [];

                    // Build enabled modules list
                    // Always include required dependencies (module must have these)
                    const enabledModules = [...requiredDeps];

                    // Conditionally include optional dependencies
                    if (!disableOptionalDeps) {
                        enabledModules.push(...optionalDeps);
                    }

                    // Validate module activation
                    const result = dependencyResolver.validateModuleActivation(
                        moduleKey,
                        enabledModules
                    );

                    // The module should be valid regardless of optional dependencies
                    // As long as required dependencies are present, it should work
                    expect(result.valid).toBe(true);
                    expect(result.errors.length).toBe(0);
                    expect(result.missingDependencies.length).toBe(0);

                    // Verify that only required dependencies are reported as required
                    expect(result.requiredDependencies).toEqual(requiredDeps);

                    // Optional dependencies should not be in missing dependencies
                    // even when they're not enabled
                    for (const optionalDep of optionalDeps) {
                        expect(result.missingDependencies).not.toContain(optionalDep);
                    }
                }
            ),
            { numRuns: 100 } // Run 100 iterations as specified in design
        );
    });

    /**
     * Additional property: Module validation with no optional dependencies enabled
     * 
     * This ensures that when ALL optional dependencies are disabled,
     * the module still validates successfully.
     */
    test('Property 26.1: All Optional Dependencies Disabled Still Valid', async () => {
        const allModules = getAllModuleConfigs();
        
        const modulesWithOptionalDeps = Object.keys(allModules).filter(
            key => allModules[key].dependencies?.optional?.length > 0
        );

        if (modulesWithOptionalDeps.length === 0) {
            return;
        }

        await fc.assert(
            fc.property(
                fc.constantFrom(...modulesWithOptionalDeps),
                (moduleKey) => {
                    const moduleConfig = allModules[moduleKey];
                    const requiredDeps = moduleConfig.dependencies?.required || [];

                    // Enable only required dependencies (no optional ones)
                    const enabledModules = [...requiredDeps];

                    // Validate
                    const result = dependencyResolver.validateModuleActivation(
                        moduleKey,
                        enabledModules
                    );

                    // Should succeed with only required dependencies
                    expect(result.valid).toBe(true);
                    expect(result.errors.length).toBe(0);
                    expect(result.missingDependencies.length).toBe(0);
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Additional property: Module validation with some optional dependencies enabled
     * 
     * This ensures that when SOME (but not all) optional dependencies are enabled,
     * the module still validates successfully.
     */
    test('Property 26.2: Partial Optional Dependencies Enabled Still Valid', async () => {
        const allModules = getAllModuleConfigs();
        
        // Find modules with multiple optional dependencies
        const modulesWithMultipleOptionalDeps = Object.entries(allModules)
            .filter(([key, config]) => {
                return config.dependencies?.optional?.length >= 2;
            })
            .map(([key]) => key);

        if (modulesWithMultipleOptionalDeps.length === 0) {
            console.warn('No modules with multiple optional dependencies found for testing');
            return;
        }

        await fc.assert(
            fc.property(
                fc.record({
                    moduleKey: fc.constantFrom(...modulesWithMultipleOptionalDeps),
                    // Randomly decide which optional deps to enable
                    enableFirstOptional: fc.boolean(),
                    enableSecondOptional: fc.boolean()
                }),
                ({ moduleKey, enableFirstOptional, enableSecondOptional }) => {
                    const moduleConfig = allModules[moduleKey];
                    const requiredDeps = moduleConfig.dependencies?.required || [];
                    const optionalDeps = moduleConfig.dependencies?.optional || [];

                    // Build enabled modules with required deps
                    const enabledModules = [...requiredDeps];

                    // Add some optional dependencies based on flags
                    if (enableFirstOptional && optionalDeps.length > 0) {
                        enabledModules.push(optionalDeps[0]);
                    }
                    if (enableSecondOptional && optionalDeps.length > 1) {
                        enabledModules.push(optionalDeps[1]);
                    }

                    // Validate
                    const result = dependencyResolver.validateModuleActivation(
                        moduleKey,
                        enabledModules
                    );

                    // Should succeed regardless of which optional deps are enabled
                    expect(result.valid).toBe(true);
                    expect(result.errors.length).toBe(0);
                    expect(result.missingDependencies.length).toBe(0);
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Additional property: Optional dependencies don't affect required dependency validation
     * 
     * This ensures that the presence or absence of optional dependencies
     * doesn't change the validation of required dependencies.
     */
    test('Property 26.3: Optional Dependencies Independent of Required Validation', async () => {
        const allModules = getAllModuleConfigs();
        
        const modulesWithBothDeps = Object.entries(allModules)
            .filter(([key, config]) => {
                return config.dependencies?.required?.length > 0 &&
                       config.dependencies?.optional?.length > 0;
            })
            .map(([key]) => key);

        if (modulesWithBothDeps.length === 0) {
            console.warn('No modules with both required and optional dependencies found');
            return;
        }

        await fc.assert(
            fc.property(
                fc.record({
                    moduleKey: fc.constantFrom(...modulesWithBothDeps),
                    includeOptional: fc.boolean(),
                    // Randomly omit one required dependency to test failure
                    omitRequiredDep: fc.boolean()
                }),
                ({ moduleKey, includeOptional, omitRequiredDep }) => {
                    const moduleConfig = allModules[moduleKey];
                    const requiredDeps = moduleConfig.dependencies?.required || [];
                    const optionalDeps = moduleConfig.dependencies?.optional || [];

                    // Build enabled modules
                    let enabledModules = [];

                    if (omitRequiredDep && requiredDeps.length > 0) {
                        // Omit the first required dependency
                        enabledModules = requiredDeps.slice(1);
                    } else {
                        // Include all required dependencies
                        enabledModules = [...requiredDeps];
                    }

                    // Add optional dependencies based on flag
                    if (includeOptional) {
                        enabledModules.push(...optionalDeps);
                    }

                    // Validate
                    const result = dependencyResolver.validateModuleActivation(
                        moduleKey,
                        enabledModules
                    );

                    if (omitRequiredDep && requiredDeps.length > 0) {
                        // Should fail due to missing required dependency
                        // regardless of optional dependencies
                        expect(result.valid).toBe(false);
                        expect(result.missingDependencies.length).toBeGreaterThan(0);
                        
                        // The missing required dependency should be reported
                        expect(result.missingDependencies).toContain(requiredDeps[0]);
                    } else {
                        // Should succeed with all required dependencies
                        // regardless of optional dependencies
                        expect(result.valid).toBe(true);
                        expect(result.errors.length).toBe(0);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Additional property: Consistency across optional dependency states
     * 
     * This ensures that validating the same module with the same required
     * dependencies but different optional dependencies always succeeds.
     */
    test('Property 26.4: Validation Consistency Across Optional States', async () => {
        const allModules = getAllModuleConfigs();
        
        const modulesWithOptionalDeps = Object.keys(allModules).filter(
            key => allModules[key].dependencies?.optional?.length > 0
        );

        if (modulesWithOptionalDeps.length === 0) {
            return;
        }

        await fc.assert(
            fc.property(
                fc.constantFrom(...modulesWithOptionalDeps),
                (moduleKey) => {
                    const moduleConfig = allModules[moduleKey];
                    const requiredDeps = moduleConfig.dependencies?.required || [];
                    const optionalDeps = moduleConfig.dependencies?.optional || [];

                    // Validate with no optional dependencies
                    const result1 = dependencyResolver.validateModuleActivation(
                        moduleKey,
                        [...requiredDeps]
                    );

                    // Validate with all optional dependencies
                    const result2 = dependencyResolver.validateModuleActivation(
                        moduleKey,
                        [...requiredDeps, ...optionalDeps]
                    );

                    // Both should succeed
                    expect(result1.valid).toBe(true);
                    expect(result2.valid).toBe(true);

                    // Both should have the same required dependencies
                    expect(result1.requiredDependencies).toEqual(result2.requiredDependencies);

                    // Neither should report missing dependencies
                    expect(result1.missingDependencies.length).toBe(0);
                    expect(result2.missingDependencies.length).toBe(0);
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Additional property: Optional dependencies are truly optional
     * 
     * This verifies that optional dependencies are never reported as missing
     * when they're not enabled.
     */
    test('Property 26.5: Optional Dependencies Never Reported as Missing', async () => {
        const allModules = getAllModuleConfigs();
        
        const modulesWithOptionalDeps = Object.keys(allModules).filter(
            key => allModules[key].dependencies?.optional?.length > 0
        );

        if (modulesWithOptionalDeps.length === 0) {
            return;
        }

        await fc.assert(
            fc.property(
                fc.record({
                    moduleKey: fc.constantFrom(...modulesWithOptionalDeps),
                    // Generate random enabled modules (might not include optional deps)
                    enabledModules: fc.array(
                        fc.constantFrom(...Object.keys(allModules)),
                        { minLength: 0, maxLength: 5 }
                    ).map(modules => [...new Set(modules)])
                }),
                ({ moduleKey, enabledModules }) => {
                    const moduleConfig = allModules[moduleKey];
                    const requiredDeps = moduleConfig.dependencies?.required || [];
                    const optionalDeps = moduleConfig.dependencies?.optional || [];

                    // Ensure all required dependencies are in enabled modules
                    const completeEnabledModules = [
                        ...new Set([...enabledModules, ...requiredDeps])
                    ];

                    // Validate
                    const result = dependencyResolver.validateModuleActivation(
                        moduleKey,
                        completeEnabledModules
                    );

                    // Should succeed
                    expect(result.valid).toBe(true);

                    // Optional dependencies should NEVER be in missing dependencies
                    for (const optionalDep of optionalDeps) {
                        expect(result.missingDependencies).not.toContain(optionalDep);
                    }

                    // Only required dependencies should be in requiredDependencies
                    expect(result.requiredDependencies).toEqual(requiredDeps);
                }
            ),
            { numRuns: 100 }
        );
    });
});
