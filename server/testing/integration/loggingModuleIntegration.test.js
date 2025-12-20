/**
 * Integration Tests for Logging Module System
 */

import { jest } from '@jest/globals';
import loggingModuleInitializer from '../../services/loggingModuleInitializer.service.js';

describe('Logging Module Integration', () => {
    beforeAll(async () => {
        // Mock file system operations to avoid actual file creation
        jest.unstable_mockModule('fs/promises', () => ({
            mkdir: jest.fn().mockResolvedValue(),
            readdir: jest.fn().mockResolvedValue([]),
            readFile: jest.fn().mockResolvedValue('{}'),
            writeFile: jest.fn().mockResolvedValue(),
            appendFile: jest.fn().mockResolvedValue()
        }));
    });

    afterAll(async () => {
        await loggingModuleInitializer.shutdown();
    });

    describe('System Initialization', () => {
        test('should initialize all services successfully', async () => {
            await loggingModuleInitializer.initialize();
            
            const status = loggingModuleInitializer.getStatus();
            expect(status.initialized).toBe(true);
            expect(status.services).toHaveProperty('loggingModule');
            expect(status.services).toHaveProperty('configurationChangeHandler');
            expect(status.services).toHaveProperty('configurationAudit');
        });

        test('should perform health check on all services', async () => {
            const health = await loggingModuleInitializer.healthCheck();
            
            expect(health.overall).toBeDefined();
            expect(health.services).toHaveProperty('loggingModule');
            expect(health.services).toHaveProperty('configurationChangeHandler');
            expect(health.services).toHaveProperty('configurationAudit');
            expect(health.timestamp).toBeDefined();
        });
    });

    describe('Service Integration', () => {
        test('should get individual services', () => {
            const loggingModuleService = loggingModuleInitializer.getService('loggingModule');
            const configChangeHandler = loggingModuleInitializer.getService('configurationChangeHandler');
            const configAudit = loggingModuleInitializer.getService('configurationAudit');

            expect(loggingModuleService).toBeDefined();
            expect(configChangeHandler).toBeDefined();
            expect(configAudit).toBeDefined();
        });

        test('should get all services', () => {
            const allServices = loggingModuleInitializer.getAllServices();
            
            expect(allServices).toHaveProperty('loggingModule');
            expect(allServices).toHaveProperty('configurationChangeHandler');
            expect(allServices).toHaveProperty('configurationAudit');
        });
    });

    describe('Configuration Change Flow', () => {
        test('should handle configuration changes end-to-end', async () => {
            const loggingModuleService = loggingModuleInitializer.getService('loggingModule');
            const configChangeHandler = loggingModuleInitializer.getService('configurationChangeHandler');
            
            // Mock the setConfig method to avoid file operations
            loggingModuleService.setConfig = jest.fn().mockImplementation(async (companyId, config) => {
                loggingModuleService.moduleConfigs.set(companyId, config);
                return config;
            });

            const testCompanyId = 'integration-test-company';
            const testAdminUser = 'admin@integration.test';

            // Listen for configuration change events
            const changePromise = new Promise((resolve) => {
                configChangeHandler.once('configurationApplied', resolve);
            });

            // Update configuration
            const configUpdates = {
                features: {
                    userActionLogging: true,
                    performanceLogging: false
                }
            };

            await loggingModuleService.updateConfig(testCompanyId, configUpdates, testAdminUser);

            // Wait for change event to be processed
            const changeEvent = await changePromise;

            expect(changeEvent.companyId).toBe(testCompanyId);
            expect(changeEvent.changes).toBeDefined();
        });
    });
});