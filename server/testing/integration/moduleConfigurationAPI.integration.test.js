/**
 * Module Configuration API Integration Tests
 * 
 * Tests the complete module configuration API endpoints
 * Requirements: 13.1, 13.4
 */

import { jest } from '@jest/globals';
import loggingModuleService from '../../services/loggingModule.service.js';
import configurationAuditService from '../../services/configurationAudit.service.js';
import configurationChangeHandler from '../../services/configurationChangeHandler.service.js';

describe('Module Configuration API Integration', () => {
    
    beforeEach(async () => {
        // Initialize services
        if (!loggingModuleService.initialized) {
            await loggingModuleService.initialize();
        }
        
        if (!configurationChangeHandler.initialized) {
            await configurationChangeHandler.initialize();
        }
        
        if (!configurationAuditService.initialized) {
            await configurationAuditService.initialize();
        }
    });
    
    describe('Module Configuration Service Integration', () => {
        const testCompanyId = 'test-integration-company';
        
        afterEach(async () => {
            // Clean up test configuration
            try {
                await loggingModuleService.resetConfig(testCompanyId, 'test-cleanup');
            } catch (error) {
                // Ignore cleanup errors
            }
        });
        
        it('should create and manage module configuration', async () => {
            // Get initial configuration
            const initialConfig = await loggingModuleService.getConfig(testCompanyId);
            expect(initialConfig).toBeDefined();
            expect(initialConfig.companyId).toBe(testCompanyId);
            expect(initialConfig.enabled).toBe(true); // Default enabled
            
            // Update configuration
            const updates = {
                features: {
                    performanceLogging: false,
                    userActionLogging: true
                },
                retentionPolicies: {
                    performanceLogs: 60
                }
            };
            
            const updatedConfig = await loggingModuleService.updateConfig(
                testCompanyId,
                updates,
                'test-admin'
            );
            
            expect(updatedConfig.features.performanceLogging).toBe(false);
            expect(updatedConfig.features.userActionLogging).toBe(true);
            expect(updatedConfig.retentionPolicies.performanceLogs).toBe(60);
            expect(updatedConfig.modifiedBy).toBe('test-admin');
            
            // Verify feature checking
            const isPerformanceEnabled = await loggingModuleService.isFeatureEnabled(
                testCompanyId,
                'performanceLogging'
            );
            expect(isPerformanceEnabled).toBe(false);
            
            const isUserActionEnabled = await loggingModuleService.isFeatureEnabled(
                testCompanyId,
                'userActionLogging'
            );
            expect(isUserActionEnabled).toBe(true);
            
            // Test essential feature protection
            const isSecurityEnabled = await loggingModuleService.isFeatureEnabled(
                testCompanyId,
                'securityLogging'
            );
            expect(isSecurityEnabled).toBe(true); // Essential feature always enabled
        });
        
        it('should handle module disable/enable correctly', async () => {
            // Disable module
            const disabledConfig = await loggingModuleService.updateConfig(
                testCompanyId,
                { enabled: false },
                'test-admin'
            );
            
            expect(disabledConfig.enabled).toBe(false);
            
            // Check that only essential features work when disabled
            const isSecurityEnabled = await loggingModuleService.isFeatureEnabled(
                testCompanyId,
                'securityLogging'
            );
            expect(isSecurityEnabled).toBe(true); // Essential feature
            
            const isPerformanceEnabled = await loggingModuleService.isFeatureEnabled(
                testCompanyId,
                'performanceLogging'
            );
            expect(isPerformanceEnabled).toBe(false); // Non-essential when module disabled
            
            // Re-enable module
            const enabledConfig = await loggingModuleService.updateConfig(
                testCompanyId,
                { enabled: true },
                'test-admin'
            );
            
            expect(enabledConfig.enabled).toBe(true);
        });
        
        it('should validate configuration correctly', async () => {
            // Test invalid configuration
            const invalidConfig = {
                enabled: 'not-boolean',
                features: {
                    invalidFeature: true
                },
                retentionPolicies: {
                    auditLogs: -1 // Invalid retention
                }
            };
            
            const validationErrors = loggingModuleService.validateConfig(invalidConfig);
            expect(validationErrors.length).toBeGreaterThan(0);
            expect(validationErrors.some(error => error.includes('enabled must be a boolean'))).toBe(true);
            expect(validationErrors.some(error => error.includes('Invalid feature'))).toBe(true);
            expect(validationErrors.some(error => error.includes('Invalid retention days'))).toBe(true);
        });
        
        it('should export and import configuration', async () => {
            // Set up a specific configuration
            const testConfig = {
                features: {
                    performanceLogging: true,
                    userActionLogging: false
                },
                retentionPolicies: {
                    performanceLogs: 120
                }
            };
            
            await loggingModuleService.updateConfig(testCompanyId, testConfig, 'test-admin');
            
            // Export configuration
            const exportData = await loggingModuleService.exportConfig(testCompanyId);
            expect(exportData.companyId).toBe(testCompanyId);
            expect(exportData.moduleConfig).toBeDefined();
            expect(exportData.essentialEvents).toBeDefined();
            
            // Reset configuration
            await loggingModuleService.resetConfig(testCompanyId, 'test-admin');
            
            // Import configuration
            const importedConfig = await loggingModuleService.importConfig(
                testCompanyId,
                exportData,
                'test-admin'
            );
            
            expect(importedConfig.features.performanceLogging).toBe(true);
            expect(importedConfig.features.userActionLogging).toBe(false);
            expect(importedConfig.retentionPolicies.performanceLogs).toBe(120);
        });
        
        it('should track configuration changes in audit log', async () => {
            // Make a configuration change
            await loggingModuleService.updateConfig(
                testCompanyId,
                { features: { performanceLogging: true } },
                'test-admin'
            );
            
            // Wait a bit for audit log to be written
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Check audit log
            const auditEntries = await configurationAuditService.getAuditLog(testCompanyId, 10);
            expect(auditEntries.length).toBeGreaterThan(0);
            
            const configChangeEntry = auditEntries.find(entry => 
                entry.eventType === 'configuration_changed' && entry.companyId === testCompanyId
            );
            expect(configChangeEntry).toBeDefined();
            expect(configChangeEntry.hash).toBeDefined(); // Tamper-proof hash
        });
        
        it('should handle event logging decisions correctly', async () => {
            // Test with module enabled
            await loggingModuleService.updateConfig(
                testCompanyId,
                { 
                    enabled: true,
                    features: { performanceLogging: true, userActionLogging: false }
                },
                'test-admin'
            );
            
            // Test different event types
            const shouldLogPerformance = await loggingModuleService.shouldLogEvent(
                testCompanyId,
                'performance_metric'
            );
            expect(shouldLogPerformance).toBe(true);
            
            const shouldLogUserAction = await loggingModuleService.shouldLogEvent(
                testCompanyId,
                'user_action'
            );
            expect(shouldLogUserAction).toBe(false);
            
            // Essential events should always be logged
            const shouldLogSecurity = await loggingModuleService.shouldLogEvent(
                testCompanyId,
                'security_breach'
            );
            expect(shouldLogSecurity).toBe(true);
            
            // Test with module disabled
            await loggingModuleService.updateConfig(
                testCompanyId,
                { enabled: false },
                'test-admin'
            );
            
            const shouldLogPerformanceDisabled = await loggingModuleService.shouldLogEvent(
                testCompanyId,
                'performance_metric'
            );
            expect(shouldLogPerformanceDisabled).toBe(false);
            
            // Essential events should still be logged when module is disabled
            const shouldLogSecurityDisabled = await loggingModuleService.shouldLogEvent(
                testCompanyId,
                'security_breach'
            );
            expect(shouldLogSecurityDisabled).toBe(true);
        });
    });
    
    describe('Configuration Summary and Statistics', () => {
        it('should provide configuration summary', async () => {
            const summary = loggingModuleService.getConfigSummary();
            
            expect(summary).toBeDefined();
            expect(typeof summary.totalCompanies).toBe('number');
            expect(typeof summary.enabledCompanies).toBe('number');
            expect(typeof summary.disabledCompanies).toBe('number');
            expect(summary.featureUsage).toBeDefined();
            expect(summary.essentialEvents).toBeGreaterThan(0);
        });
        
        it('should provide audit statistics', async () => {
            const testCompanyId = 'test-stats-company';
            
            // Generate some audit events
            await loggingModuleService.updateConfig(testCompanyId, { enabled: false }, 'test-admin');
            await loggingModuleService.updateConfig(testCompanyId, { enabled: true }, 'test-admin');
            
            // Wait for audit logs
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const stats = await configurationAuditService.getAuditStatistics(testCompanyId);
            
            expect(stats).toBeDefined();
            expect(typeof stats.totalEntries).toBe('number');
            expect(stats.entriesByType).toBeDefined();
            expect(stats.entriesByCompany).toBeDefined();
            expect(typeof stats.totalChanges).toBe('number');
        });
    });
});