/**
 * Property-Based Tests for Module Registration Completeness
 * 
 * Feature: feature-productization, Property 6: Module Registration Completeness
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4
 * 
 * This test verifies that for any Product Module registration, the system stores
 * and allows retrieval of display name, business description, target customer segment,
 * pricing tiers, feature limits, and dependencies.
 */

import fc from 'fast-check';
import {
    commercialModuleConfigs,
    getModuleConfig,
    getAllModuleConfigs,
    getModulePricing,
    getModuleDependencies
} from '../../config/commercialModuleRegistry.js';
import { PRICING_TIERS } from '../../config/moduleConfigSchema.js';
import { MODULES } from '../../shared/constants/modules.js';

describe('Module Registration Completeness - Property-Based Tests', () => {
    /**
     * Feature: feature-productization, Property 6: Module Registration Completeness
     * 
     * Property: For any Product Module registration, the system should store and allow
     * retrieval of display name, business description, target customer segment, pricing
     * tiers, feature limits, and dependencies.
     * 
     * This property ensures that all registered modules have complete commercial metadata
     * as required by Requirements 2.1, 2.2, 2.3, 2.4.
     */
    test('Property 6: Module Registration Completeness', () => {
        fc.assert(
            fc.property(
                // Generate arbitrary module keys from the registered modules
                fc.constantFrom(...Object.keys(commercialModuleConfigs)),
                (moduleKey) => {
                    // Retrieve the module configuration
                    const config = getModuleConfig(moduleKey);

                    // The module should be retrievable
                    expect(config).not.toBeNull();
                    expect(config).toBeDefined();

                    // Requirement 2.1: Display name and business description
                    expect(config.displayName).toBeDefined();
                    expect(typeof config.displayName).toBe('string');
                    expect(config.displayName.length).toBeGreaterThan(0);

                    expect(config.commercial).toBeDefined();
                    expect(config.commercial.description).toBeDefined();
                    expect(typeof config.commercial.description).toBe('string');
                    expect(config.commercial.description.length).toBeGreaterThanOrEqual(20);

                    // Requirement 2.1: Target customer segment
                    expect(config.commercial.targetSegment).toBeDefined();
                    expect(typeof config.commercial.targetSegment).toBe('string');
                    expect(config.commercial.targetSegment.length).toBeGreaterThanOrEqual(10);

                    // Requirement 2.2: Pricing tier mapping
                    expect(config.commercial.pricing).toBeDefined();
                    expect(config.commercial.pricing.starter).toBeDefined();
                    expect(config.commercial.pricing.business).toBeDefined();
                    expect(config.commercial.pricing.enterprise).toBeDefined();

                    // Verify each pricing tier has required fields
                    const tiers = [PRICING_TIERS.STARTER, PRICING_TIERS.BUSINESS, PRICING_TIERS.ENTERPRISE];
                    for (const tier of tiers) {
                        const pricing = getModulePricing(moduleKey, tier);
                        expect(pricing).not.toBeNull();
                        expect(pricing.monthly).toBeDefined();
                        expect(pricing.onPremise).toBeDefined();
                        expect(pricing.limits).toBeDefined();
                        expect(typeof pricing.limits).toBe('object');
                    }

                    // Requirement 2.3: Feature limits and usage quotas
                    // Each tier should have limits defined
                    expect(config.commercial.pricing.starter.limits).toBeDefined();
                    expect(Object.keys(config.commercial.pricing.starter.limits).length).toBeGreaterThan(0);

                    expect(config.commercial.pricing.business.limits).toBeDefined();
                    expect(Object.keys(config.commercial.pricing.business.limits).length).toBeGreaterThan(0);

                    expect(config.commercial.pricing.enterprise.limits).toBeDefined();
                    expect(Object.keys(config.commercial.pricing.enterprise.limits).length).toBeGreaterThan(0);

                    // Requirement 2.4: Required and optional dependencies
                    expect(config.dependencies).toBeDefined();
                    expect(config.dependencies.required).toBeDefined();
                    expect(Array.isArray(config.dependencies.required)).toBe(true);

                    // Optional dependencies may not be present, but if they are, should be an array
                    if (config.dependencies.optional !== undefined) {
                        expect(Array.isArray(config.dependencies.optional)).toBe(true);
                    }

                    // Verify dependencies can be retrieved
                    const deps = getModuleDependencies(moduleKey, false);
                    expect(Array.isArray(deps)).toBe(true);

                    // All modules except HR_CORE should have HR_CORE as a dependency
                    if (moduleKey !== MODULES.HR_CORE) {
                        expect(deps).toContain(MODULES.HR_CORE);
                    }
                }
            ),
            { numRuns: 100 } // Run 100 iterations as specified in design
        );
    });

    /**
     * Additional property: Verify that all limit types are consistent across tiers
     * 
     * This ensures that if a limit type exists in one tier, it exists in all tiers,
     * which is important for proper tier comparison and upgrade paths.
     */
    test('Property 6.1: Limit types are consistent across all pricing tiers', () => {
        fc.assert(
            fc.property(
                fc.constantFrom(...Object.keys(commercialModuleConfigs)),
                (moduleKey) => {
                    const config = getModuleConfig(moduleKey);

                    const starterLimits = Object.keys(config.commercial.pricing.starter.limits);
                    const businessLimits = Object.keys(config.commercial.pricing.business.limits);
                    const enterpriseLimits = Object.keys(config.commercial.pricing.enterprise.limits);

                    // All tiers should have the same limit types
                    const allLimitTypes = new Set([...starterLimits, ...businessLimits, ...enterpriseLimits]);

                    for (const limitType of allLimitTypes) {
                        expect(starterLimits).toContain(limitType);
                        expect(businessLimits).toContain(limitType);
                        expect(enterpriseLimits).toContain(limitType);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Additional property: Verify marketing metadata quality
     * 
     * This ensures that all marketing-friendly descriptions are suitable for
     * customer-facing pages (non-empty, proper length, etc.)
     */
    test('Property 6.2: Marketing metadata meets quality standards', () => {
        fc.assert(
            fc.property(
                fc.constantFrom(...Object.keys(commercialModuleConfigs)),
                (moduleKey) => {
                    const config = getModuleConfig(moduleKey);

                    // Description should be substantial
                    expect(config.commercial.description.length).toBeGreaterThanOrEqual(20);
                    expect(config.commercial.description.length).toBeLessThanOrEqual(500);

                    // Target segment should be clear
                    expect(config.commercial.targetSegment.length).toBeGreaterThanOrEqual(10);
                    expect(config.commercial.targetSegment.length).toBeLessThanOrEqual(200);

                    // Value proposition should be defined
                    expect(config.commercial.valueProposition).toBeDefined();
                    expect(typeof config.commercial.valueProposition).toBe('string');
                    expect(config.commercial.valueProposition.length).toBeGreaterThanOrEqual(20);
                    expect(config.commercial.valueProposition.length).toBeLessThanOrEqual(500);

                    // All text should not be just whitespace
                    expect(config.commercial.description.trim().length).toBeGreaterThan(0);
                    expect(config.commercial.targetSegment.trim().length).toBeGreaterThan(0);
                    expect(config.commercial.valueProposition.trim().length).toBeGreaterThan(0);
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Additional property: Verify pricing progression
     * 
     * This ensures that pricing increases (or stays the same) from starter to business
     * to enterprise, which is a business logic requirement.
     */
    test('Property 6.3: Pricing follows logical progression across tiers', () => {
        fc.assert(
            fc.property(
                fc.constantFrom(...Object.keys(commercialModuleConfigs)),
                (moduleKey) => {
                    const config = getModuleConfig(moduleKey);

                    const starterMonthly = config.commercial.pricing.starter.monthly;
                    const businessMonthly = config.commercial.pricing.business.monthly;

                    // If both are numbers, starter should be <= business
                    if (typeof starterMonthly === 'number' && typeof businessMonthly === 'number') {
                        expect(starterMonthly).toBeLessThanOrEqual(businessMonthly);
                    }

                    const starterOnPremise = config.commercial.pricing.starter.onPremise;
                    const businessOnPremise = config.commercial.pricing.business.onPremise;

                    // If both are numbers, starter should be <= business
                    if (typeof starterOnPremise === 'number' && typeof businessOnPremise === 'number') {
                        expect(starterOnPremise).toBeLessThanOrEqual(businessOnPremise);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Additional property: Verify dependency integrity
     * 
     * This ensures that all declared dependencies actually exist in the registry
     * and that there are no circular dependencies.
     */
    test('Property 6.4: Dependencies reference valid modules', () => {
        fc.assert(
            fc.property(
                fc.constantFrom(...Object.keys(commercialModuleConfigs)),
                (moduleKey) => {
                    const config = getModuleConfig(moduleKey);
                    const allModuleKeys = Object.keys(commercialModuleConfigs);

                    // All required dependencies should exist
                    for (const dep of config.dependencies.required) {
                        expect(allModuleKeys).toContain(dep);
                    }

                    // All optional dependencies should exist
                    if (config.dependencies.optional) {
                        for (const dep of config.dependencies.optional) {
                            expect(allModuleKeys).toContain(dep);
                        }
                    }

                    // Module should not depend on itself
                    expect(config.dependencies.required).not.toContain(moduleKey);
                    if (config.dependencies.optional) {
                        expect(config.dependencies.optional).not.toContain(moduleKey);
                    }

                    // Transitive dependencies should not create circular references
                    const allDeps = getModuleDependencies(moduleKey, true);
                    expect(allDeps).not.toContain(moduleKey);
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Additional property: Verify integration points are defined
     * 
     * This ensures that modules properly declare what they provide and consume,
     * which is important for understanding module interactions.
     */
    test('Property 6.5: Integration points are properly defined', () => {
        fc.assert(
            fc.property(
                fc.constantFrom(...Object.keys(commercialModuleConfigs)),
                (moduleKey) => {
                    const config = getModuleConfig(moduleKey);

                    // Integrations should be defined (even if empty)
                    if (config.integrations) {
                        // If provides exists, should be an array
                        if (config.integrations.provides !== undefined) {
                            expect(Array.isArray(config.integrations.provides)).toBe(true);
                        }

                        // If consumes exists, should be an array
                        if (config.integrations.consumes !== undefined) {
                            expect(Array.isArray(config.integrations.consumes)).toBe(true);
                        }
                    }
                }
            ),
            { numRuns: 100 }
        );
    });
});
