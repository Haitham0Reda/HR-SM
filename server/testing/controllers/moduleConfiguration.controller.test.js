/**
 * Module Configuration Controller Tests
 * 
 * Tests for the module configuration REST API endpoints
 * Requirements: 13.1, 13.4
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// Mock loggingModuleService before importing
const mockLoggingModuleService = {
    getConfig: jest.fn(),
    updateConfig: jest.fn(),
    isEssentialFeature: jest.fn(),
    validateConfig: jest.fn(),
    getPlatformRequiredLogs: jest.fn()
};

const mockConfigurationAuditService = {
    logConfigChange: jest.fn()
};

jest.unstable_mockModule('../../services/loggingModule.service.js', () => ({
    default: mockLoggingModuleService
}));

jest.unstable_mockModule('../../services/configurationAudit.service.js', () => ({
    default: mockConfigurationAuditService
}));

const { default: moduleConfigurationController } = await import('../../controllers/moduleConfiguration.controller.js');

// Use the mock references
const loggingModuleService = mockLoggingModuleService;
const configurationAuditService = mockConfigurationAuditService;

describe('ModuleConfigurationController', () => {
    let app;

    beforeEach(() => {
        app = express();
        app.use(express.json());

        // Mock authentication middleware
        app.use((req, res, next) => {
            req.user = {
                id: 'test-user-123',
                companyId: 'test-company-123',
                isPlatformAdmin: false
            };
            next();
        });

        // Add routes
        app.get('/module/:companyId', moduleConfigurationController.getModuleConfig);
        app.put('/module/:companyId', moduleConfigurationController.updateModuleConfig);
        app.put('/module/:companyId/status', moduleConfigurationController.updateModuleStatus);
        app.get('/module/:companyId/features', moduleConfigurationController.getEnabledFeatures);
        app.put('/module/:companyId/features/:featureName/toggle', moduleConfigurationController.toggleFeature);
        app.put('/module/:companyId/features/batch', moduleConfigurationController.batchUpdateFeatures);
        app.post('/module/:companyId/preview', moduleConfigurationController.previewConfigChanges);

        // Clear all mocks
        jest.clearAllMocks();
    });

    describe('GET /module/:companyId', () => {
        it('should return module configuration for authorized company', async () => {
            const mockConfig = {
                companyId: 'test-company-123',
                enabled: true,
                features: {
                    auditLogging: true,
                    securityLogging: true,
                    performanceLogging: false
                },
                lastModified: '2023-12-01T10:00:00Z'
            };

            loggingModuleService.getConfig.mockResolvedValue(mockConfig);
            loggingModuleService.getPlatformRequiredLogs.mockReturnValue(['authentication_attempt', 'security_breach']);

            const response = await request(app)
                .get('/module/test-company-123')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.companyId).toBe('test-company-123');
            expect(response.body.data.moduleConfig).toEqual(mockConfig);
            expect(response.body.data.essentialEvents).toEqual(['authentication_attempt', 'security_breach']);
        });

        it('should deny access to unauthorized company', async () => {
            const response = await request(app)
                .get('/module/other-company-456')
                .expect(403);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('Access denied');
        });
    });

    describe('PUT /module/:companyId', () => {
        it('should update module configuration successfully', async () => {
            const configUpdates = {
                features: {
                    performanceLogging: true
                }
            };

            const updatedConfig = {
                companyId: 'test-company-123',
                enabled: true,
                features: {
                    auditLogging: true,
                    securityLogging: true,
                    performanceLogging: true
                },
                lastModified: '2023-12-01T11:00:00Z'
            };

            loggingModuleService.updateConfig.mockResolvedValue(updatedConfig);

            const response = await request(app)
                .put('/module/test-company-123')
                .send(configUpdates)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.moduleConfig).toEqual(updatedConfig);
            expect(loggingModuleService.updateConfig).toHaveBeenCalledWith(
                'test-company-123',
                configUpdates,
                'company:test-user-123'
            );
        });

        it('should handle validation errors', async () => {
            const configUpdates = {
                features: {
                    invalidFeature: true
                }
            };

            loggingModuleService.updateConfig.mockRejectedValue(
                new Error('Configuration validation failed: Invalid feature: invalidFeature')
            );

            const response = await request(app)
                .put('/module/test-company-123')
                .send(configUpdates)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('Configuration validation failed');
        });
    });

    describe('PUT /module/:companyId/features/:featureName/toggle', () => {
        it('should toggle feature successfully', async () => {
            const updatedConfig = {
                companyId: 'test-company-123',
                features: {
                    performanceLogging: true
                },
                lastModified: '2023-12-01T11:00:00Z'
            };

            loggingModuleService.isEssentialFeature.mockReturnValue(false);
            loggingModuleService.updateConfig.mockResolvedValue(updatedConfig);

            const response = await request(app)
                .put('/module/test-company-123/features/performanceLogging/toggle')
                .send({ enabled: true })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.featureName).toBe('performanceLogging');
            expect(response.body.data.enabled).toBe(true);
        });

        it('should prevent disabling essential features', async () => {
            loggingModuleService.isEssentialFeature.mockReturnValue(true);

            const response = await request(app)
                .put('/module/test-company-123/features/securityLogging/toggle')
                .send({ enabled: false })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('Cannot disable essential feature');
        });
    });

    describe('PUT /module/:companyId/features/batch', () => {
        it('should batch update features successfully', async () => {
            const featureUpdates = {
                performanceLogging: true,
                userActionLogging: false
            };

            const updatedConfig = {
                companyId: 'test-company-123',
                features: {
                    auditLogging: true,
                    securityLogging: true,
                    performanceLogging: true,
                    userActionLogging: false
                },
                lastModified: '2023-12-01T11:00:00Z'
            };

            loggingModuleService.isEssentialFeature.mockReturnValue(false);
            loggingModuleService.updateConfig.mockResolvedValue(updatedConfig);

            const response = await request(app)
                .put('/module/test-company-123/features/batch')
                .send({ features: featureUpdates })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.updatedFeatures).toEqual(['performanceLogging', 'userActionLogging']);
        });

        it('should validate feature values', async () => {
            const featureUpdates = {
                performanceLogging: 'invalid'
            };

            const response = await request(app)
                .put('/module/test-company-123/features/batch')
                .send({ features: featureUpdates })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('Validation failed');
        });
    });

    describe('POST /module/:companyId/preview', () => {
        it('should preview configuration changes', async () => {
            const currentConfig = {
                companyId: 'test-company-123',
                enabled: true,
                features: {
                    auditLogging: true,
                    securityLogging: true,
                    performanceLogging: false
                },
                retentionPolicies: {
                    auditLogs: 365,
                    securityLogs: 180
                },
                alerting: {
                    enabled: true,
                    criticalErrors: true
                }
            };

            const configChanges = {
                features: {
                    performanceLogging: true
                }
            };

            loggingModuleService.getConfig.mockResolvedValue(currentConfig);
            loggingModuleService.validateConfig.mockReturnValue([]);
            loggingModuleService.isEssentialFeature.mockReturnValue(false);

            const response = await request(app)
                .post('/module/test-company-123/preview')
                .send(configChanges)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.currentConfig).toEqual(currentConfig);
            expect(response.body.data.changes).toEqual(configChanges);
            expect(response.body.data.validation.valid).toBe(true);
            expect(response.body.data.impact).toBeDefined();
        });

        it('should detect validation errors in preview', async () => {
            const currentConfig = {
                companyId: 'test-company-123',
                enabled: true,
                features: {
                    securityLogging: true
                }
            };

            const configChanges = {
                features: {
                    securityLogging: false
                }
            };

            loggingModuleService.getConfig.mockResolvedValue(currentConfig);
            loggingModuleService.validateConfig.mockReturnValue([]);
            loggingModuleService.isEssentialFeature.mockReturnValue(true);

            const response = await request(app)
                .post('/module/test-company-123/preview')
                .send(configChanges)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.validation.valid).toBe(false);
            expect(response.body.data.validation.essentialViolations).toContain('securityLogging');
        });
    });

    describe('Authorization', () => {
        it('should allow platform admin to access any company', async () => {
            // Mock platform admin user
            app.use((req, res, next) => {
                req.user = {
                    id: 'platform-admin-123',
                    companyId: 'platform',
                    isPlatformAdmin: true
                };
                next();
            });

            const mockConfig = {
                companyId: 'other-company-456',
                enabled: true,
                features: {}
            };

            loggingModuleService.getConfig.mockResolvedValue(mockConfig);
            loggingModuleService.getPlatformRequiredLogs.mockReturnValue([]);

            const response = await request(app)
                .get('/module/other-company-456')
                .expect(200);

            expect(response.body.success).toBe(true);
        });
    });
});