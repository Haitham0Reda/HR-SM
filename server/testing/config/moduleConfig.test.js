/**
 * Module Configuration System Tests
 * 
 * Tests for module configuration schema, validation, and registry
 */

import {
    validateModuleConfig,
    ModuleConfigValidationError,
    PRICING_TIERS,
    LIMIT_TYPES
} from '../../config/moduleConfigSchema.js';

import {
    commercialModuleConfigs,
    validateAllModuleConfigs,
    getModuleConfig,
    getAllModuleConfigs,
    getModulePricing,
    getModuleDependencies,
    hasFeatureInTier,
    getMarketingSummary
} from '../../config/commercialModuleRegistry.js';

import {
    createModuleConfigTemplate,
    formatStorageSize,
    parseStorageSize,
    calculateMonthlyCost,
    calculateOnPremiseCost,
    suggestTier
} from '../../config/createModuleConfig.js';

import { MODULES } from '../../shared/constants/modules.js';

describe('Module Configuration Schema', () => {
    describe('validateModuleConfig', () => {
        test('should validate a correct module configuration', () => {
            const validConfig = {
                key: 'test-module',
                displayName: 'Test Module',
                version: '1.0.0',
                commercial: {
                    description: 'This is a test module for validation',
                    targetSegment: 'Test customers',
                    valueProposition: 'Provides testing capabilities',
                    pricing: {
                        starter: {
                            monthly: 5,
                            onPremise: 500,
                            limits: { employees: 50, storage: 1073741824 }
                        },
                        business: {
                            monthly: 10,
                            onPremise: 1000,
                            limits: { employees: 200, storage: 10737418240 }
                        },
                        enterprise: {
                            monthly: 'custom',
                            onPremise: 'custom',
                            limits: { employees: 'unlimited', storage: 'unlimited' }
                        }
                    }
                },
                dependencies: {
                    required: ['hr-core'],
                    optional: []
                }
            };

            expect(() => validateModuleConfig(validConfig)).not.toThrow();
        });

        test('should reject config with missing required fields', () => {
            const invalidConfig = {
                key: 'test-module',
                displayName: 'Test Module'
                // Missing version and commercial
            };

            expect(() => validateModuleConfig(invalidConfig)).toThrow(ModuleConfigValidationError);
        });

        test('should reject config with invalid key format', () => {
            const invalidConfig = {
                key: 'Test Module', // Should be kebab-case
                displayName: 'Test Module',
                version: '1.0.0',
                commercial: {
                    description: 'This is a test module for validation',
                    targetSegment: 'Test customers',
                    valueProposition: 'Provides testing capabilities',
                    pricing: {
                        starter: { monthly: 5, onPremise: 500, limits: {} },
                        business: { monthly: 10, onPremise: 1000, limits: {} },
                        enterprise: { monthly: 'custom', onPremise: 'custom', limits: {} }
                    }
                },
                dependencies: { required: [], optional: [] }
            };

            expect(() => validateModuleConfig(invalidConfig)).toThrow(ModuleConfigValidationError);
        });

        test('should reject config with self-dependency', () => {
            const invalidConfig = {
                key: 'test-module',
                displayName: 'Test Module',
                version: '1.0.0',
                commercial: {
                    description: 'This is a test module for validation',
                    targetSegment: 'Test customers',
                    valueProposition: 'Provides testing capabilities',
                    pricing: {
                        starter: { monthly: 5, onPremise: 500, limits: {} },
                        business: { monthly: 10, onPremise: 1000, limits: {} },
                        enterprise: { monthly: 'custom', onPremise: 'custom', limits: {} }
                    }
                },
                dependencies: {
                    required: ['test-module'], // Self-dependency
                    optional: []
                }
            };

            expect(() => validateModuleConfig(invalidConfig)).toThrow(ModuleConfigValidationError);
        });

        test('should reject config with inconsistent limit types across tiers', () => {
            const invalidConfig = {
                key: 'test-module',
                displayName: 'Test Module',
                version: '1.0.0',
                commercial: {
                    description: 'This is a test module for validation',
                    targetSegment: 'Test customers',
                    valueProposition: 'Provides testing capabilities',
                    pricing: {
                        starter: {
                            monthly: 5,
                            onPremise: 500,
                            limits: { employees: 50, storage: 1073741824 }
                        },
                        business: {
                            monthly: 10,
                            onPremise: 1000,
                            limits: { employees: 200 } // Missing storage
                        },
                        enterprise: {
                            monthly: 'custom',
                            onPremise: 'custom',
                            limits: { employees: 'unlimited', storage: 'unlimited' }
                        }
                    }
                },
                dependencies: { required: [], optional: [] }
            };

            expect(() => validateModuleConfig(invalidConfig)).toThrow(ModuleConfigValidationError);
        });
    });
});

describe('Commercial Module Registry', () => {
    describe('validateAllModuleConfigs', () => {
        test('should validate all registered module configurations', () => {
            expect(() => validateAllModuleConfigs()).not.toThrow();
        });
    });

    describe('getModuleConfig', () => {
        test('should return config for existing module', () => {
            const config = getModuleConfig(MODULES.HR_CORE);
            expect(config).toBeDefined();
            expect(config.key).toBe(MODULES.HR_CORE);
            expect(config.displayName).toBe('HR Core');
        });

        test('should return null for non-existent module', () => {
            const config = getModuleConfig('non-existent-module');
            expect(config).toBeNull();
        });
    });

    describe('getAllModuleConfigs', () => {
        test('should return all module configurations', () => {
            const configs = getAllModuleConfigs();
            expect(Object.keys(configs).length).toBeGreaterThan(0);
            expect(configs[MODULES.HR_CORE]).toBeDefined();
        });
    });

    describe('getModulePricing', () => {
        test('should return pricing for valid module and tier', () => {
            const pricing = getModulePricing(MODULES.ATTENDANCE, PRICING_TIERS.STARTER);
            expect(pricing).toBeDefined();
            expect(pricing.monthly).toBeDefined();
            expect(pricing.onPremise).toBeDefined();
            expect(pricing.limits).toBeDefined();
        });

        test('should return null for invalid module', () => {
            const pricing = getModulePricing('invalid-module', PRICING_TIERS.STARTER);
            expect(pricing).toBeNull();
        });
    });

    describe('getModuleDependencies', () => {
        test('should return direct dependencies', () => {
            const deps = getModuleDependencies(MODULES.ATTENDANCE, false);
            expect(deps).toContain(MODULES.HR_CORE);
        });

        test('should return transitive dependencies', () => {
            const deps = getModuleDependencies(MODULES.PAYROLL, false);
            expect(deps).toContain(MODULES.HR_CORE);
            expect(deps).toContain(MODULES.ATTENDANCE);
        });

        test('should include optional dependencies when requested', () => {
            const deps = getModuleDependencies(MODULES.ATTENDANCE, true);
            expect(deps.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('hasFeatureInTier', () => {
        test('should return true for feature available in tier', () => {
            const hasFeature = hasFeatureInTier(
                MODULES.ATTENDANCE,
                'biometricDevices',
                PRICING_TIERS.BUSINESS
            );
            expect(hasFeature).toBe(true);
        });

        test('should return true for feature in higher tier', () => {
            const hasFeature = hasFeatureInTier(
                MODULES.ATTENDANCE,
                'biometricDevices',
                PRICING_TIERS.ENTERPRISE
            );
            expect(hasFeature).toBe(true);
        });

        test('should return false for feature not in tier', () => {
            const hasFeature = hasFeatureInTier(
                MODULES.ATTENDANCE,
                'biometricDevices',
                PRICING_TIERS.STARTER
            );
            expect(hasFeature).toBe(false);
        });
    });

    describe('getMarketingSummary', () => {
        test('should return marketing summary for all modules', () => {
            const summary = getMarketingSummary();
            expect(Array.isArray(summary)).toBe(true);
            expect(summary.length).toBeGreaterThan(0);

            const hrCore = summary.find(s => s.key === MODULES.HR_CORE);
            expect(hrCore).toBeDefined();
            expect(hrCore.displayName).toBeDefined();
            expect(hrCore.description).toBeDefined();
            expect(hrCore.targetSegment).toBeDefined();
        });
    });
});

describe('Module Configuration Helpers', () => {
    describe('createModuleConfigTemplate', () => {
        test('should create valid template', () => {
            const template = createModuleConfigTemplate('new-module', 'New Module');
            expect(template.key).toBe('new-module');
            expect(template.displayName).toBe('New Module');
            expect(template.commercial).toBeDefined();
            expect(template.dependencies).toBeDefined();
        });
    });

    describe('formatStorageSize', () => {
        test('should format bytes correctly', () => {
            expect(formatStorageSize(1024)).toBe('1KB');
            expect(formatStorageSize(1048576)).toBe('1MB');
            expect(formatStorageSize(1073741824)).toBe('1GB');
            expect(formatStorageSize('unlimited')).toBe('unlimited');
        });
    });

    describe('parseStorageSize', () => {
        test('should parse storage strings correctly', () => {
            expect(parseStorageSize('1KB')).toBe(1024);
            expect(parseStorageSize('1MB')).toBe(1048576);
            expect(parseStorageSize('1GB')).toBe(1073741824);
            expect(parseStorageSize('unlimited')).toBe('unlimited');
        });

        test('should throw error for invalid format', () => {
            expect(() => parseStorageSize('invalid')).toThrow();
        });
    });

    describe('calculateMonthlyCost', () => {
        test('should calculate total monthly cost', () => {
            const configs = [
                getModuleConfig(MODULES.ATTENDANCE),
                getModuleConfig(MODULES.LEAVE)
            ];

            const cost = calculateMonthlyCost(configs, PRICING_TIERS.STARTER, 50);
            expect(cost).toBeGreaterThan(0);
            expect(typeof cost).toBe('number');
        });
    });

    describe('calculateOnPremiseCost', () => {
        test('should calculate total on-premise cost', () => {
            const configs = [
                getModuleConfig(MODULES.ATTENDANCE),
                getModuleConfig(MODULES.LEAVE)
            ];

            const cost = calculateOnPremiseCost(configs, PRICING_TIERS.STARTER);
            expect(cost).toBeGreaterThan(0);
            expect(typeof cost).toBe('number');
        });
    });

    describe('suggestTier', () => {
        test('should suggest starter tier for low usage', () => {
            const config = getModuleConfig(MODULES.ATTENDANCE);
            const usage = {
                employees: 30,
                storage: 500000000,
                apiCalls: 5000
            };

            const tier = suggestTier(config, usage);
            expect(tier).toBe(PRICING_TIERS.STARTER);
        });

        test('should suggest business tier for medium usage', () => {
            const config = getModuleConfig(MODULES.ATTENDANCE);
            const usage = {
                employees: 100,
                storage: 5000000000,
                apiCalls: 30000
            };

            const tier = suggestTier(config, usage);
            expect(tier).toBe(PRICING_TIERS.BUSINESS);
        });

        test('should suggest enterprise tier for high usage', () => {
            const config = getModuleConfig(MODULES.ATTENDANCE);
            const usage = {
                employees: 500,
                storage: 50000000000,
                apiCalls: 100000
            };

            const tier = suggestTier(config, usage);
            expect(tier).toBe(PRICING_TIERS.ENTERPRISE);
        });
    });
});

describe('Module Configuration Integration', () => {
    test('all modules should have valid configurations', () => {
        const allConfigs = getAllModuleConfigs();

        for (const [key, config] of Object.entries(allConfigs)) {
            // Should not throw
            expect(() => validateModuleConfig(config)).not.toThrow();

            // Should have all required fields
            expect(config.key).toBe(key);
            expect(config.displayName).toBeDefined();
            expect(config.version).toBeDefined();
            expect(config.commercial).toBeDefined();
            expect(config.dependencies).toBeDefined();

            // Should have all three pricing tiers
            expect(config.commercial.pricing.starter).toBeDefined();
            expect(config.commercial.pricing.business).toBeDefined();
            expect(config.commercial.pricing.enterprise).toBeDefined();
        }
    });

    test('all modules should have hr-core as dependency except hr-core itself', () => {
        const allConfigs = getAllModuleConfigs();

        for (const [key, config] of Object.entries(allConfigs)) {
            if (key === MODULES.HR_CORE) {
                expect(config.dependencies.required).toEqual([]);
            } else {
                const deps = getModuleDependencies(key, false);
                expect(deps).toContain(MODULES.HR_CORE);
            }
        }
    });

    test('no circular dependencies should exist', () => {
        const allConfigs = getAllModuleConfigs();

        for (const [key, config] of Object.entries(allConfigs)) {
            const deps = getModuleDependencies(key, false);
            expect(deps).not.toContain(key);
        }
    });
});
