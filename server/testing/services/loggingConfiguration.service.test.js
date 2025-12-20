/**
 * Logging Configuration Service Tests
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import loggingConfigurationService from '../../services/loggingConfiguration.service.js';
import fs from 'fs/promises';
import path from 'path';

describe('LoggingConfigurationService', () => {
    const testCompanyId = 'test-company-123';
    const testConfigPath = path.join(process.cwd(), 'config', 'logging', 'companies', `${testCompanyId}.json`);
    
    beforeEach(async () => {
        // Initialize the service
        await loggingConfigurationService.initialize();
    });
    
    afterEach(async () => {
        // Clean up test configuration files
        try {
            await fs.unlink(testConfigPath);
        } catch (error) {
            // File might not exist, which is fine
        }
    });
    
    test('should initialize successfully', async () => {
        const result = await loggingConfigurationService.initialize();
        expect(result).toBeUndefined(); // No return value expected
    });
    
    test('should get default company configuration', async () => {
        const result = await loggingConfigurationService.getCompanyLoggingConfig(testCompanyId);
        
        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.data.companyId).toBe(testCompanyId);
        expect(result.data.config).toBeDefined();
        expect(result.data.features).toBeDefined();
        expect(result.data.retentionPolicies).toBeDefined();
    });
    
    test('should update company configuration', async () => {
        const configUpdates = {
            level: 'debug',
            enableConsole: true,
            maxFiles: 10
        };
        
        const result = await loggingConfigurationService.updateCompanyLoggingConfig(testCompanyId, configUpdates);
        
        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.data.level).toBe('debug');
        expect(result.data.maxFiles).toBe(10);
    });
    
    test('should validate configuration updates', async () => {
        const invalidConfig = {
            level: 'invalid-level',
            retentionDays: -1
        };
        
        const result = await loggingConfigurationService.updateCompanyLoggingConfig(testCompanyId, invalidConfig);
        
        expect(result.success).toBe(false);
        expect(result.error).toBe('Configuration validation failed');
        expect(result.details).toBeDefined();
        expect(result.details.length).toBeGreaterThan(0);
    });
    
    test('should update feature toggles', async () => {
        const result = await loggingConfigurationService.updateFeatureToggle(
            testCompanyId,
            'userInteractionTracking',
            true,
            { samplingRate: 0.05 }
        );
        
        expect(result.success).toBe(true);
        expect(result.data.enabled).toBe(true);
        expect(result.data.config.samplingRate).toBe(0.05);
    });
    
    test('should get company features', () => {
        const features = loggingConfigurationService.getCompanyFeatures(testCompanyId);
        
        expect(features).toBeDefined();
        expect(typeof features).toBe('object');
        expect(features.userInteractionTracking).toBeDefined();
        expect(features.performanceMonitoring).toBeDefined();
        expect(features.securityDetection).toBeDefined();
    });
    
    test('should update retention policies', async () => {
        const result = await loggingConfigurationService.updateRetentionPolicy(
            testCompanyId,
            'audit',
            90
        );
        
        expect(result.success).toBe(true);
        expect(result.data.retentionDays).toBe(90);
    });
    
    test('should validate retention policy values', async () => {
        const result = await loggingConfigurationService.updateRetentionPolicy(
            testCompanyId,
            'audit',
            -1
        );
        
        expect(result.success).toBe(false);
        expect(result.error).toContain('Retention days must be between 1 and 3650');
    });
    
    test('should configure alerts', async () => {
        const alertConfig = {
            channels: {
                email: {
                    enabled: true,
                    recipients: ['admin@test.com']
                }
            }
        };
        
        const result = await loggingConfigurationService.configureAlerts(testCompanyId, alertConfig);
        
        expect(result.success).toBe(true);
        expect(result.data.channels.email.enabled).toBe(true);
        expect(result.data.channels.email.recipients).toContain('admin@test.com');
    });
    
    test('should get global configuration', () => {
        const result = loggingConfigurationService.getGlobalConfig();
        
        expect(result.success).toBe(true);
        expect(result.data.environment).toBeDefined();
        expect(result.data.config).toBeDefined();
        expect(result.data.summary).toBeDefined();
    });
    
    test('should get log type configuration', () => {
        const result = loggingConfigurationService.getLogTypeConfig('audit', testCompanyId);
        
        expect(result.success).toBe(true);
        expect(result.data.logType).toBe('audit');
        expect(result.data.retentionDays).toBeDefined();
        expect(result.data.enabled).toBeDefined();
    });
    
    test('should export company configuration', async () => {
        // First set some configuration
        await loggingConfigurationService.updateCompanyLoggingConfig(testCompanyId, { level: 'info' });
        
        const result = await loggingConfigurationService.exportCompanyConfig(testCompanyId);
        
        expect(result.success).toBe(true);
        expect(result.data.companyId).toBe(testCompanyId);
        expect(result.data.exportedAt).toBeDefined();
        expect(result.data.config).toBeDefined();
        expect(result.data.features).toBeDefined();
    });
    
    test('should import company configuration', async () => {
        const configData = {
            config: {
                level: 'warn',
                maxFiles: 15
            },
            features: {
                performanceMonitoring: {
                    enabled: true,
                    config: { detailedMetrics: true }
                }
            }
        };
        
        const result = await loggingConfigurationService.importCompanyConfig(testCompanyId, configData);
        
        expect(result.success).toBe(true);
        expect(result.data.companyId).toBe(testCompanyId);
        
        // Verify the configuration was imported
        const getResult = await loggingConfigurationService.getCompanyLoggingConfig(testCompanyId);
        expect(getResult.data.config.level).toBe('warn');
        expect(getResult.data.config.maxFiles).toBe(15);
    });
    
    test('should reset company configuration', async () => {
        // First set some configuration
        await loggingConfigurationService.updateCompanyLoggingConfig(testCompanyId, { level: 'debug' });
        
        const result = await loggingConfigurationService.resetCompanyConfig(testCompanyId);
        
        expect(result.success).toBe(true);
        expect(result.data.companyId).toBe(testCompanyId);
        
        // Verify configuration was reset to defaults
        const getResult = await loggingConfigurationService.getCompanyLoggingConfig(testCompanyId);
        expect(getResult.data.config.level).not.toBe('debug');
    });
    
    test('should get configuration health', () => {
        const result = loggingConfigurationService.getConfigHealth();
        
        expect(result.success).toBe(true);
        expect(result.data.status).toBeDefined();
        expect(result.data.checks).toBeDefined();
        expect(result.data.summary).toBeDefined();
        expect(['healthy', 'warning', 'unhealthy']).toContain(result.data.status);
    });
});