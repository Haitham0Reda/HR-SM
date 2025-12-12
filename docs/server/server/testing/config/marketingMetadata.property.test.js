/**
 * Property-Based Tests for Marketing Metadata Quality
 * 
 * Feature: feature-productization, Property 7: Marketing Metadata Quality
 * Validates: Requirements 2.5
 * 
 * This test verifies that for any registered Product Module, when module metadata
 * is requested, the system returns non-empty, properly formatted marketing descriptions
 * suitable for customer-facing pricing pages.
 */

import fc from 'fast-check';
import {
    commercialModuleConfigs,
    getModuleConfig,
    getMarketingSummary
} from '../../config/commercialModuleRegistry.js';

describe('Marketing Metadata Quality - Property-Based Tests', () => {
    /**
     * Feature: feature-productization, Property 7: Marketing Metadata Quality
     * 
     * Property: For any registered Product Module, the returned metadata should contain
     * non-empty, properly formatted marketing descriptions suitable for customer-facing pages.
     * 
     * This property ensures that when module metadata is requested, the system returns
     * marketing-friendly descriptions as required by Requirement 2.5.
     */
    test('Property 7: Marketing Metadata Quality', () => {
        fc.assert(
            fc.property(
                // Generate arbitrary module keys from the registered modules
                fc.constantFrom(...Object.keys(commercialModuleConfigs)),
                (moduleKey) => {
                    // Request module metadata
                    const config = getModuleConfig(moduleKey);

                    // Verify the returned metadata is suitable for pricing pages
                    expect(config).not.toBeNull();
                    expect(config).toBeDefined();

                    // Marketing description should be substantial and properly formatted
                    expect(config.commercial.description).toBeDefined();
                    expect(typeof config.commercial.description).toBe('string');
                    expect(config.commercial.description.length).toBeGreaterThanOrEqual(20);
                    expect(config.commercial.description.length).toBeLessThanOrEqual(500);
                    expect(config.commercial.description.trim()).toBe(config.commercial.description);
                    expect(config.commercial.description.trim().length).toBeGreaterThan(0);

                    // Target segment should be clear and customer-friendly
                    expect(config.commercial.targetSegment).toBeDefined();
                    expect(typeof config.commercial.targetSegment).toBe('string');
                    expect(config.commercial.targetSegment.length).toBeGreaterThanOrEqual(10);
                    expect(config.commercial.targetSegment.length).toBeLessThanOrEqual(200);
                    expect(config.commercial.targetSegment.trim()).toBe(config.commercial.targetSegment);
                    expect(config.commercial.targetSegment.trim().length).toBeGreaterThan(0);

                    // Value proposition should be compelling and properly formatted
                    expect(config.commercial.valueProposition).toBeDefined();
                    expect(typeof config.commercial.valueProposition).toBe('string');
                    expect(config.commercial.valueProposition.length).toBeGreaterThanOrEqual(20);
                    expect(config.commercial.valueProposition.length).toBeLessThanOrEqual(500);
                    expect(config.commercial.valueProposition.trim()).toBe(config.commercial.valueProposition);
                    expect(config.commercial.valueProposition.trim().length).toBeGreaterThan(0);

                    // Display name should be customer-friendly
                    expect(config.displayName).toBeDefined();
                    expect(typeof config.displayName).toBe('string');
                    expect(config.displayName.length).toBeGreaterThanOrEqual(3);
                    expect(config.displayName.length).toBeLessThanOrEqual(100);
                    expect(config.displayName.trim()).toBe(config.displayName);

                    // Verify no placeholder text or development artifacts
                    const lowerDescription = config.commercial.description.toLowerCase();
                    const lowerTarget = config.commercial.targetSegment.toLowerCase();
                    const lowerValue = config.commercial.valueProposition.toLowerCase();

                    expect(lowerDescription).not.toContain('todo');
                    expect(lowerDescription).not.toContain('tbd');
                    expect(lowerDescription).not.toContain('placeholder');
                    expect(lowerDescription).not.toContain('lorem ipsum');

                    expect(lowerTarget).not.toContain('todo');
                    expect(lowerTarget).not.toContain('tbd');
                    expect(lowerTarget).not.toContain('placeholder');

                    expect(lowerValue).not.toContain('todo');
                    expect(lowerValue).not.toContain('tbd');
                    expect(lowerValue).not.toContain('placeholder');
                    expect(lowerValue).not.toContain('lorem ipsum');

                    // Verify proper sentence structure (starts with capital letter)
                    expect(config.commercial.description[0]).toMatch(/[A-Z]/);
                    expect(config.commercial.targetSegment[0]).toMatch(/[A-Z]/);
                    expect(config.commercial.valueProposition[0]).toMatch(/[A-Z]/);
                }
            ),
            { numRuns: 100 } // Run 100 iterations as specified in design
        );
    });

    /**
     * Additional property: Verify marketing summary returns complete data
     * 
     * This ensures that the getMarketingSummary() function returns properly
     * formatted data suitable for pricing pages and marketing materials.
     */
    test('Property 7.1: Marketing summary returns complete and formatted data', () => {
        // Get the marketing summary for all modules
        const summary = getMarketingSummary();

        // Should return an array
        expect(Array.isArray(summary)).toBe(true);
        expect(summary.length).toBeGreaterThan(0);

        fc.assert(
            fc.property(
                fc.constantFrom(...summary),
                (moduleSummary) => {
                    // Each summary should have all required fields
                    expect(moduleSummary.key).toBeDefined();
                    expect(typeof moduleSummary.key).toBe('string');

                    expect(moduleSummary.displayName).toBeDefined();
                    expect(typeof moduleSummary.displayName).toBe('string');
                    expect(moduleSummary.displayName.length).toBeGreaterThan(0);

                    expect(moduleSummary.description).toBeDefined();
                    expect(typeof moduleSummary.description).toBe('string');
                    expect(moduleSummary.description.length).toBeGreaterThanOrEqual(20);

                    expect(moduleSummary.targetSegment).toBeDefined();
                    expect(typeof moduleSummary.targetSegment).toBe('string');
                    expect(moduleSummary.targetSegment.length).toBeGreaterThanOrEqual(10);

                    expect(moduleSummary.valueProposition).toBeDefined();
                    expect(typeof moduleSummary.valueProposition).toBe('string');
                    expect(moduleSummary.valueProposition.length).toBeGreaterThanOrEqual(20);

                    expect(moduleSummary.startingPrice).toBeDefined();
                    expect(typeof moduleSummary.startingPrice === 'number' ||
                        moduleSummary.startingPrice === 'custom').toBe(true);

                    expect(moduleSummary.features).toBeDefined();
                    expect(Array.isArray(moduleSummary.features)).toBe(true);

                    // Verify no placeholder text in summary
                    const lowerDesc = moduleSummary.description.toLowerCase();
                    expect(lowerDesc).not.toContain('todo');
                    expect(lowerDesc).not.toContain('tbd');
                    expect(lowerDesc).not.toContain('placeholder');
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Additional property: Verify metadata consistency between config and summary
     * 
     * This ensures that the marketing summary accurately reflects the module config
     * and doesn't introduce inconsistencies.
     */
    test('Property 7.2: Marketing summary matches module config data', () => {
        const summary = getMarketingSummary();

        fc.assert(
            fc.property(
                fc.constantFrom(...summary),
                (moduleSummary) => {
                    // Get the full config for comparison
                    const config = getModuleConfig(moduleSummary.key);

                    // Verify consistency
                    expect(moduleSummary.displayName).toBe(config.displayName);
                    expect(moduleSummary.description).toBe(config.commercial.description);
                    expect(moduleSummary.targetSegment).toBe(config.commercial.targetSegment);
                    expect(moduleSummary.valueProposition).toBe(config.commercial.valueProposition);
                    expect(moduleSummary.startingPrice).toBe(config.commercial.pricing.starter.monthly);

                    // Features should match
                    const configFeatures = Object.keys(config.features || {});
                    expect(moduleSummary.features).toEqual(configFeatures);
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Additional property: Verify all text fields are properly trimmed
     * 
     * This ensures that marketing metadata doesn't have leading/trailing whitespace
     * which could cause display issues on pricing pages.
     */
    test('Property 7.3: All marketing text fields are properly trimmed', () => {
        fc.assert(
            fc.property(
                fc.constantFrom(...Object.keys(commercialModuleConfigs)),
                (moduleKey) => {
                    const config = getModuleConfig(moduleKey);

                    // All text fields should be trimmed (no leading/trailing whitespace)
                    expect(config.displayName).toBe(config.displayName.trim());
                    expect(config.commercial.description).toBe(config.commercial.description.trim());
                    expect(config.commercial.targetSegment).toBe(config.commercial.targetSegment.trim());
                    expect(config.commercial.valueProposition).toBe(config.commercial.valueProposition.trim());

                    // Should not have multiple consecutive spaces
                    expect(config.commercial.description).not.toMatch(/\s{2,}/);
                    expect(config.commercial.targetSegment).not.toMatch(/\s{2,}/);
                    expect(config.commercial.valueProposition).not.toMatch(/\s{2,}/);
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Additional property: Verify pricing information is suitable for display
     * 
     * This ensures that pricing data returned with marketing metadata is
     * properly formatted for customer-facing pages.
     */
    test('Property 7.4: Pricing information is display-ready', () => {
        fc.assert(
            fc.property(
                fc.constantFrom(...Object.keys(commercialModuleConfigs)),
                (moduleKey) => {
                    const config = getModuleConfig(moduleKey);

                    // Verify all pricing tiers are present
                    expect(config.commercial.pricing.starter).toBeDefined();
                    expect(config.commercial.pricing.business).toBeDefined();
                    expect(config.commercial.pricing.enterprise).toBeDefined();

                    // Verify pricing values are valid for display
                    const tiers = ['starter', 'business', 'enterprise'];
                    for (const tier of tiers) {
                        const pricing = config.commercial.pricing[tier];

                        // Monthly pricing should be number or 'custom'
                        expect(
                            typeof pricing.monthly === 'number' || pricing.monthly === 'custom'
                        ).toBe(true);

                        if (typeof pricing.monthly === 'number') {
                            expect(pricing.monthly).toBeGreaterThanOrEqual(0);
                        }

                        // On-premise pricing should be number or 'custom'
                        expect(
                            typeof pricing.onPremise === 'number' || pricing.onPremise === 'custom'
                        ).toBe(true);

                        if (typeof pricing.onPremise === 'number') {
                            expect(pricing.onPremise).toBeGreaterThanOrEqual(0);
                        }

                        // Limits should be defined
                        expect(pricing.limits).toBeDefined();
                        expect(typeof pricing.limits).toBe('object');
                        expect(Object.keys(pricing.limits).length).toBeGreaterThan(0);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });
});
