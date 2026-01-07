/**
 * Module Configuration Integration Tests
 * 
 * Tests the integration between the life insurance module and the module registry system,
 * tenant-specific configuration handling, and feature availability checks.
 * 
 * Requirements: 9.3, 9.4, 9.5
 */

import moduleConfigService from '../services/moduleConfigService.js';
import moduleRegistry from '../../../core/registry/moduleRegistry.js';
import TenantConfig from '../../hr-core/models/TenantConfig.js';
import { MODULES } from '../../../shared/constants/modules.js';

// Mock dependencies
jest.mock('../../../core/registry/moduleRegistry.js');
jest.mock('../../hr-core/models/TenantConfig.js');
jest.mock('../../../utils/logger.js', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
}));

describe('Module Configuration Integration', () => {
    const mockTenantId = 'test-tenant-123';
    
    beforeEach(() => {
        jest.clearAllMocks();
        moduleConfigService.clearCache();
    });

    describe('Module Registry Integration', () => {
        it('should integrate with module registry to get module configuration', async () => {
            // Mock module registry response
            const mockModuleConfig = {
                name: MODULES.LIFE_INSURANCE,
                displayName: 'Life Insurance Management',
                version: '1.0.0',
                features: {
                    policyManagement: true,
                    familyMembers: true,
                    claimsProcessing: true
                },
                configSchema: {
                    emailNotifications: { type: 'boolean', default: true },
                    maxFamilyMembers: { type: 'number', default: 10 }
                }
            };

            moduleRegistry.getModule.mockReturnValue(mockModuleConfig);

            // Mock tenant config
            const mockTenantConfig = {
                tenantId: mockTenantId,
                isModuleEnabled: jest.fn().mockReturnValue(true),
                validateLicense: jest.fn().mockReturnValue(true),
                modules: new Map(),
                subscription: { plan: 'professional', status: 'active', maxEmployees: 100 },
                license: { enabledModules: ['life-insurance'] }
            };

            TenantConfig.findOne.mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockTenantConfig)
            });

            // Test integration
            const config = await moduleConfigService.getTenantModuleConfig(mockTenantId);

            expect(moduleRegistry.getModule).toHaveBeenCalledWith(MODULES.LIFE_INSURANCE);
            expect(config.moduleConfig).toEqual(mockModuleConfig);
            expect(config.moduleEnabled).toBe(true);
        });

        it('should handle module not found in registry', async () => {
            moduleRegistry.getModule.mockReturnValue(null);

            await expect(
                moduleConfigService.getTenantModuleConfig(mockTenantId)
            ).rejects.toThrow('Module not found in registry');
        });
    });

    describe('Tenant-Specific Configuration', () => {
        it('should handle tenant-specific module settings', async () => {
            // Mock module registry
            moduleRegistry.getModule.mockReturnValue({
                name: MODULES.LIFE_INSURANCE,
                features: {},
                configSchema: {}
            });

            // Mock tenant config with custom settings
            const mockTenantConfig = {
                tenantId: mockTenantId,
                isModuleEnabled: jest.fn().mockReturnValue(true),
                validateLicense: jest.fn().mockReturnValue(true),
                modules: new Map([
                    [MODULES.LIFE_INSURANCE, {
                        settings: {
                            emailNotifications: false,
                            maxFamilyMembers: 5,
                            autoApproveSmallClaims: true
                        }
                    }]
                ]),
                subscription: { plan: 'basic', status: 'active', maxEmployees: 50 },
                license: { enabledModules: ['life-insurance'] }
            };

            TenantConfig.findOne.mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockTenantConfig)
            });

            const config = await moduleConfigService.getTenantModuleConfig(mockTenantId);

            expect(config.tenantSettings.emailNotifications).toBe(false);
            expect(config.tenantSettings.maxFamilyMembers).toBe(5);
            expect(config.tenantSettings.autoApproveSmallClaims).toBe(true);
        });

        it('should use default settings when no custom settings exist', async () => {
            // Mock module registry
            moduleRegistry.getModule.mockReturnValue({
                name: MODULES.LIFE_INSURANCE,
                features: {},
                configSchema: {}
            });

            // Mock tenant config without custom settings
            const mockTenantConfig = {
                tenantId: mockTenantId,
                isModuleEnabled: jest.fn().mockReturnValue(true),
                validateLicense: jest.fn().mockReturnValue(true),
                modules: new Map(),
                subscription: { plan: 'free', status: 'active', maxEmployees: 10 },
                license: { enabledModules: ['life-insurance'] }
            };

            TenantConfig.findOne.mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockTenantConfig)
            });

            const config = await moduleConfigService.getTenantModuleConfig(mockTenantId);

            // Should use default settings
            expect(config.tenantSettings.emailNotifications).toBe(true);
            expect(config.tenantSettings.maxFamilyMembers).toBe(10);
            expect(config.tenantSettings.autoApproveSmallClaims).toBe(false);
        });
    });

    describe('Feature Availability Based on Configuration', () => {
        it('should determine feature availability based on subscription plan', async () => {
            // Mock module registry
            moduleRegistry.getModule.mockReturnValue({
                name: MODULES.LIFE_INSURANCE,
                features: {},
                configSchema: {}
            });

            // Test different subscription plans
            const testCases = [
                {
                    plan: 'free',
                    expectedFeatures: {
                        policyManagement: true,
                        familyMembers: false,
                        claimsProcessing: false,
                        insuranceReports: false
                    }
                },
                {
                    plan: 'basic',
                    expectedFeatures: {
                        policyManagement: true,
                        familyMembers: true,
                        claimsProcessing: true,
                        insuranceReports: false
                    }
                },
                {
                    plan: 'enterprise',
                    expectedFeatures: {
                        policyManagement: true,
                        familyMembers: true,
                        claimsProcessing: true,
                        insuranceReports: true,
                        policyAnalytics: true
                    }
                }
            ];

            for (const testCase of testCases) {
                const mockTenantConfig = {
                    tenantId: mockTenantId,
                    isModuleEnabled: jest.fn().mockReturnValue(true),
                    validateLicense: jest.fn().mockReturnValue(true),
                    modules: new Map(),
                    subscription: { plan: testCase.plan, status: 'active', maxEmployees: 100 },
                    license: { enabledModules: ['life-insurance'] }
                };

                TenantConfig.findOne.mockReturnValue({
                    lean: jest.fn().mockResolvedValue(mockTenantConfig)
                });

                const config = await moduleConfigService.getTenantModuleConfig(mockTenantId);

                for (const [feature, expected] of Object.entries(testCase.expectedFeatures)) {
                    expect(config.features[feature]).toBe(expected);
                }

                // Clear cache between test cases
                moduleConfigService.clearCache();
            }
        });

        it('should disable all features when module is not licensed', async () => {
            // Mock module registry
            moduleRegistry.getModule.mockReturnValue({
                name: MODULES.LIFE_INSURANCE,
                features: {},
                configSchema: {}
            });

            // Mock tenant config without life insurance license
            const mockTenantConfig = {
                tenantId: mockTenantId,
                isModuleEnabled: jest.fn().mockReturnValue(true),
                validateLicense: jest.fn().mockReturnValue(true),
                modules: new Map(),
                subscription: { plan: 'enterprise', status: 'active', maxEmployees: 100 },
                license: { enabledModules: [] } // No life-insurance license
            };

            TenantConfig.findOne.mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockTenantConfig)
            });

            const config = await moduleConfigService.getTenantModuleConfig(mockTenantId);

            // All features should be disabled
            Object.values(config.features).forEach(featureEnabled => {
                expect(featureEnabled).toBe(false);
            });
        });
    });

    describe('Module Availability Checks', () => {
        it('should check module availability correctly', async () => {
            // Mock module registry
            moduleRegistry.getModule.mockReturnValue({
                name: MODULES.LIFE_INSURANCE,
                features: {},
                configSchema: {}
            });

            // Mock available module
            const mockTenantConfig = {
                tenantId: mockTenantId,
                isModuleEnabled: jest.fn().mockReturnValue(true),
                validateLicense: jest.fn().mockReturnValue(true),
                modules: new Map(),
                subscription: { plan: 'professional', status: 'active', maxEmployees: 100 },
                license: { enabledModules: ['life-insurance'] }
            };

            TenantConfig.findOne.mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockTenantConfig)
            });

            const availability = await moduleConfigService.checkModuleAvailability(mockTenantId);

            expect(availability.available).toBe(true);
            expect(availability.moduleEnabled).toBe(true);
            expect(availability.licensed).toBe(true);
            expect(availability.reason).toBe('available');
        });

        it('should return correct reason when module is disabled', async () => {
            // Mock module registry
            moduleRegistry.getModule.mockReturnValue({
                name: MODULES.LIFE_INSURANCE,
                features: {},
                configSchema: {}
            });

            // Mock disabled module
            const mockTenantConfig = {
                tenantId: mockTenantId,
                isModuleEnabled: jest.fn().mockReturnValue(false), // Module disabled
                validateLicense: jest.fn().mockReturnValue(true),
                modules: new Map(),
                subscription: { plan: 'professional', status: 'active', maxEmployees: 100 },
                license: { enabledModules: ['life-insurance'] }
            };

            TenantConfig.findOne.mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockTenantConfig)
            });

            const availability = await moduleConfigService.checkModuleAvailability(mockTenantId);

            expect(availability.available).toBe(false);
            expect(availability.moduleEnabled).toBe(false);
            expect(availability.reason).toBe('module_disabled');
        });
    });

    describe('Configuration Caching', () => {
        it('should cache configuration to improve performance', async () => {
            // Mock module registry
            moduleRegistry.getModule.mockReturnValue({
                name: MODULES.LIFE_INSURANCE,
                features: {},
                configSchema: {}
            });

            const mockTenantConfig = {
                tenantId: mockTenantId,
                isModuleEnabled: jest.fn().mockReturnValue(true),
                validateLicense: jest.fn().mockReturnValue(true),
                modules: new Map(),
                subscription: { plan: 'professional', status: 'active', maxEmployees: 100 },
                license: { enabledModules: ['life-insurance'] }
            };

            TenantConfig.findOne.mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockTenantConfig)
            });

            // First call should hit the database
            await moduleConfigService.getTenantModuleConfig(mockTenantId);
            expect(TenantConfig.findOne).toHaveBeenCalledTimes(1);

            // Second call should use cache
            await moduleConfigService.getTenantModuleConfig(mockTenantId);
            expect(TenantConfig.findOne).toHaveBeenCalledTimes(1); // Still only 1 call

            // Verify cache stats
            const stats = moduleConfigService.getCacheStats();
            expect(stats.size).toBe(1);
        });

        it('should clear cache when requested', async () => {
            // Add something to cache first
            moduleConfigService.configCache = new Map();
            moduleConfigService.configCache.set('test-key', { config: {}, timestamp: Date.now() });

            expect(moduleConfigService.getCacheStats().size).toBe(1);

            // Clear cache
            moduleConfigService.clearCache();

            expect(moduleConfigService.getCacheStats().size).toBe(0);
        });
    });
});