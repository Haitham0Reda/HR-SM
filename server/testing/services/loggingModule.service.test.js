/**
 * Tests for Logging Module Service
 */

import { jest } from '@jest/globals';
import { LoggingModuleService, DEFAULT_MODULE_CONFIG, ESSENTIAL_LOG_EVENTS } from '../../services/loggingModule.service.js';

describe('LoggingModuleService', () => {
    let service;
    const testCompanyId = 'test-company-123';
    const testAdminUser = 'admin@test.com';

    beforeEach(() => {
        service = new LoggingModuleService();
        service.initialized = true; // Skip file system initialization for tests
        
        // Mock the file operations to avoid actual file system calls
        service.setConfig = jest.fn().mockImplementation(async (companyId, config) => {
            service.moduleConfigs.set(companyId, config);
            return config;
        });
        
        service.loadModuleConfigs = jest.fn().mockResolvedValue();
    });

    afterEach(() => {
        if (service && service.removeAllListeners) {
            service.removeAllListeners();
        }
        jest.clearAllMocks();
    });

    describe('Configuration Management', () => {
        test('should create default configuration for new company', async () => {
            const config = await service.getConfig(testCompanyId);
            
            expect(config).toMatchObject({
                enabled: true,
                features: expect.objectContaining({
                    auditLogging: true,
                    securityLogging: true,
                    performanceLogging: true,
                    userActionLogging: false,
                    frontendLogging: true,
                    detailedErrorLogging: true
                }),
                retentionPolicies: expect.objectContaining({
                    auditLogs: 2555,
                    securityLogs: 365,
                    performanceLogs: 90,
                    errorLogs: 180
                }),
                alerting: expect.objectContaining({
                    enabled: true,
                    criticalErrors: true,
                    securityEvents: true,
                    performanceThresholds: false
                })
            });
            
            expect(config.companyId).toBe(testCompanyId);
            expect(config.lastModified).toBeDefined();
            expect(config.modifiedBy).toBe('system');
        });

        test('should update configuration and emit change event', async () => {
            const changeListener = jest.fn();
            service.on('configurationChanged', changeListener);

            const configUpdates = {
                features: {
                    userActionLogging: true,
                    performanceLogging: false
                },
                alerting: {
                    performanceThresholds: true
                }
            };

            const updatedConfig = await service.updateConfig(testCompanyId, configUpdates, testAdminUser);

            expect(updatedConfig.features.userActionLogging).toBe(true);
            expect(updatedConfig.features.performanceLogging).toBe(false);
            expect(updatedConfig.alerting.performanceThresholds).toBe(true);
            expect(updatedConfig.modifiedBy).toBe(testAdminUser);

            expect(changeListener).toHaveBeenCalledWith(expect.objectContaining({
                companyId: testCompanyId,
                adminUser: testAdminUser,
                newConfig: updatedConfig
            }));
        });

        test('should validate configuration and reject invalid updates', async () => {
            const invalidConfig = {
                enabled: 'not-a-boolean',
                features: {
                    invalidFeature: true
                },
                retentionPolicies: {
                    auditLogs: -1 // Invalid retention days
                }
            };

            await expect(service.updateConfig(testCompanyId, invalidConfig, testAdminUser))
                .rejects.toThrow('Configuration validation failed');
        });
    });

    describe('Feature Management', () => {
        test('should check if feature is enabled', async () => {
            // Test with default configuration
            expect(await service.isFeatureEnabled(testCompanyId, 'auditLogging')).toBe(true);
            expect(await service.isFeatureEnabled(testCompanyId, 'userActionLogging')).toBe(false);

            // Update configuration and test again
            await service.updateConfig(testCompanyId, {
                features: { userActionLogging: true }
            }, testAdminUser);

            expect(await service.isFeatureEnabled(testCompanyId, 'userActionLogging')).toBe(true);
        });

        test('should return only essential features when module is disabled', async () => {
            // Disable the module
            await service.updateConfig(testCompanyId, { enabled: false }, testAdminUser);

            // Essential features should still be available
            expect(await service.isFeatureEnabled(testCompanyId, 'securityLogging')).toBe(true);
            expect(await service.isFeatureEnabled(testCompanyId, 'auditLogging')).toBe(true);

            // Non-essential features should be disabled
            expect(await service.isFeatureEnabled(testCompanyId, 'userActionLogging')).toBe(false);
            expect(await service.isFeatureEnabled(testCompanyId, 'performanceLogging')).toBe(false);
        });

        test('should get enabled features list', async () => {
            const enabledFeatures = await service.getEnabledFeatures(testCompanyId);
            
            expect(enabledFeatures).toContain('auditLogging');
            expect(enabledFeatures).toContain('securityLogging');
            expect(enabledFeatures).toContain('performanceLogging');
            expect(enabledFeatures).toContain('frontendLogging');
            expect(enabledFeatures).toContain('detailedErrorLogging');
            expect(enabledFeatures).not.toContain('userActionLogging');
        });
    });

    describe('Essential Logging', () => {
        test('should force essential logging and emit event', () => {
            const forceListener = jest.fn();
            service.on('essentialLoggingForced', forceListener);

            const reason = 'Security compliance requirement';
            service.forceEssentialLogging(testCompanyId, reason);

            expect(forceListener).toHaveBeenCalledWith(expect.objectContaining({
                companyId: testCompanyId,
                reason,
                essentialEvents: ESSENTIAL_LOG_EVENTS
            }));
        });

        test('should return platform required logs', () => {
            const requiredLogs = service.getPlatformRequiredLogs(testCompanyId);
            expect(requiredLogs).toEqual(ESSENTIAL_LOG_EVENTS);
        });

        test('should determine if event should be logged based on module settings', async () => {
            // Test with module enabled
            expect(await service.shouldLogEvent(testCompanyId, 'user_action')).toBe(false); // userActionLogging is disabled by default
            expect(await service.shouldLogEvent(testCompanyId, 'performance_metric')).toBe(true); // performanceLogging is enabled by default
            expect(await service.shouldLogEvent(testCompanyId, 'authentication_attempt')).toBe(true); // Essential event

            // Test with module disabled
            await service.updateConfig(testCompanyId, { enabled: false }, testAdminUser);
            expect(await service.shouldLogEvent(testCompanyId, 'user_action')).toBe(false);
            expect(await service.shouldLogEvent(testCompanyId, 'performance_metric')).toBe(false);
            expect(await service.shouldLogEvent(testCompanyId, 'authentication_attempt')).toBe(true); // Essential event still logged
        });
    });

    describe('Configuration Import/Export', () => {
        test('should export configuration', async () => {
            const exportData = await service.exportConfig(testCompanyId);
            
            expect(exportData).toMatchObject({
                companyId: testCompanyId,
                exportedAt: expect.any(String),
                moduleConfig: expect.objectContaining({
                    enabled: true,
                    features: expect.any(Object),
                    retentionPolicies: expect.any(Object),
                    alerting: expect.any(Object)
                }),
                essentialEvents: ESSENTIAL_LOG_EVENTS
            });
        });

        test('should import configuration', async () => {
            const importData = {
                moduleConfig: {
                    enabled: true,
                    features: {
                        auditLogging: true,
                        securityLogging: true,
                        performanceLogging: false,
                        userActionLogging: true,
                        frontendLogging: true,
                        detailedErrorLogging: false
                    },
                    retentionPolicies: {
                        auditLogs: 3650,
                        securityLogs: 730,
                        performanceLogs: 180,
                        errorLogs: 365
                    },
                    alerting: {
                        enabled: true,
                        criticalErrors: true,
                        securityEvents: true,
                        performanceThresholds: true
                    }
                }
            };

            const importListener = jest.fn();
            service.on('configurationImported', importListener);

            const importedConfig = await service.importConfig(testCompanyId, importData, testAdminUser);

            expect(importedConfig.features.userActionLogging).toBe(true);
            expect(importedConfig.features.performanceLogging).toBe(false);
            expect(importedConfig.retentionPolicies.auditLogs).toBe(3650);
            expect(importedConfig.alerting.performanceThresholds).toBe(true);

            expect(importListener).toHaveBeenCalledWith(expect.objectContaining({
                companyId: testCompanyId,
                adminUser: testAdminUser
            }));
        });

        test('should reset configuration to defaults', async () => {
            const resetListener = jest.fn();
            service.on('configurationReset', resetListener);

            // Reset to defaults
            const resetConfig = await service.resetConfig(testCompanyId, testAdminUser);

            expect(resetConfig.features.userActionLogging).toBe(false); // Back to default
            expect(resetConfig.modifiedBy).toBe(testAdminUser);

            expect(resetListener).toHaveBeenCalledWith(expect.objectContaining({
                companyId: testCompanyId,
                adminUser: testAdminUser
            }));
        });
    });

    describe('Configuration Summary', () => {
        test('should get configuration summary', async () => {
            // Set up some test data
            await service.getConfig('company1');
            await service.updateConfig('company2', { enabled: false }, testAdminUser);
            await service.getConfig('company3');

            const summary = service.getConfigSummary();

            expect(summary).toMatchObject({
                totalCompanies: expect.any(Number),
                enabledCompanies: expect.any(Number),
                disabledCompanies: expect.any(Number),
                featureUsage: expect.any(Object),
                essentialEvents: ESSENTIAL_LOG_EVENTS.length
            });

            expect(summary.totalCompanies).toBeGreaterThan(0);
            expect(summary.featureUsage).toHaveProperty('auditLogging');
            expect(summary.featureUsage).toHaveProperty('securityLogging');
        });
    });
});