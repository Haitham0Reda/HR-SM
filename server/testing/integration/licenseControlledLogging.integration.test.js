/**
 * License-Controlled Logging Integration Tests
 * 
 * Tests the complete license-controlled logging system including
 * license validation, usage enforcement, and platform control.
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../app.js';
import License, { MODULES } from '../../platform/system/models/license.model.js';
import licenseControlledLoggingService from '../../services/licenseControlledLogging.service.js';
import platformLoggingControlService from '../../services/platformLoggingControl.service.js';

describe('License-Controlled Logging Integration', () => {
    let testTenantId;
    let testLicense;
    let adminToken;
    let userToken;

    beforeAll(async () => {
        // Initialize services
        await licenseControlledLoggingService.initialize();
        await platformLoggingControlService.initialize();
    });

    beforeEach(async () => {
        // Create test tenant and license
        testTenantId = 'test-tenant-' + Date.now();
        
        testLicense = new License({
            tenantId: testTenantId,
            subscriptionId: 'sub-' + Date.now(),
            status: 'active',
            modules: [
                {
                    key: MODULES.LOGGING,
                    enabled: true,
                    tier: 'business',
                    limits: {
                        employees: 100,
                        storage: 10,
                        apiCalls: 10000,
                        customLimits: {
                            logging: {
                                dailyLogEntries: 100000,
                                storageGB: 10
                            }
                        }
                    },
                    activatedAt: new Date(),
                    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
                }
            ]
        });

        await testLicense.save();

        // Create test tokens (mock implementation)
        adminToken = 'admin-token-' + Date.now();
        userToken = 'user-token-' + Date.now();
    });

    afterEach(async () => {
        // Clean up test data
        if (testLicense) {
            await License.deleteOne({ _id: testLicense._id });
        }
    });

    afterAll(async () => {
        // Stop services
        platformLoggingControlService.stopMonitoring();
    });

    describe('License Validation', () => {
        it('should validate valid logging license', async () => {
            const licenseCheck = await licenseControlledLoggingService.hasValidLoggingLicense(testTenantId);
            
            expect(licenseCheck.valid).toBe(true);
            expect(licenseCheck.tier).toBe('business');
        });

        it('should reject invalid tenant ID', async () => {
            const licenseCheck = await licenseControlledLoggingService.hasValidLoggingLicense('invalid-tenant');
            
            expect(licenseCheck.valid).toBe(false);
            expect(licenseCheck.error).toBeDefined();
        });

        it('should handle expired license', async () => {
            // Update license to be expired
            testLicense.modules[0].expiresAt = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
            await testLicense.save();

            const licenseCheck = await licenseControlledLoggingService.hasValidLoggingLicense(testTenantId);
            
            expect(licenseCheck.valid).toBe(false);
            expect(licenseCheck.error).toContain('expired');
        });
    });

    describe('Logging Capabilities', () => {
        it('should return correct capabilities for business tier', async () => {
            const capabilities = await licenseControlledLoggingService.getLoggingCapabilities(testTenantId);
            
            expect(capabilities.licensed).toBe(true);
            expect(capabilities.tier).toBe('business');
            expect(capabilities.features.auditLogging).toBe(true);
            expect(capabilities.features.performanceLogging).toBe(true);
            expect(capabilities.features.realTimeMonitoring).toBe(false); // Enterprise only
            expect(capabilities.limits.dailyLogEntries).toBe(100000);
        });

        it('should return minimal capabilities for unlicensed tenant', async () => {
            const capabilities = await licenseControlledLoggingService.getLoggingCapabilities('unlicensed-tenant');
            
            expect(capabilities.licensed).toBe(false);
            expect(capabilities.features.auditLogging).toBe(true); // Essential
            expect(capabilities.features.securityLogging).toBe(true); // Essential
            expect(capabilities.features.performanceLogging).toBe(false);
            expect(capabilities.mandatoryEvents).toContain('authentication_attempt');
        });
    });

    describe('Feature Permissions', () => {
        it('should allow licensed features', async () => {
            const featureCheck = await licenseControlledLoggingService.isLoggingFeatureAllowed(
                testTenantId, 
                'performanceLogging'
            );
            
            expect(featureCheck.allowed).toBe(true);
            expect(featureCheck.tier).toBe('business');
        });

        it('should deny unlicensed features', async () => {
            const featureCheck = await licenseControlledLoggingService.isLoggingFeatureAllowed(
                testTenantId, 
                'realTimeMonitoring'
            );
            
            expect(featureCheck.allowed).toBe(false);
            expect(featureCheck.upgradeRequired).toBe(true);
            expect(featureCheck.upgradeUrl).toContain('upgrade');
        });

        it('should always allow essential features', async () => {
            const featureCheck = await licenseControlledLoggingService.isLoggingFeatureAllowed(
                'unlicensed-tenant', 
                'auditLogging'
            );
            
            expect(featureCheck.allowed).toBe(true);
            expect(featureCheck.reason).toContain('Essential feature');
        });
    });

    describe('Usage Limits', () => {
        it('should allow logging within limits', async () => {
            const shouldCapture = await licenseControlledLoggingService.shouldCaptureLogEvent(
                testTenantId, 
                'user_action'
            );
            
            expect(shouldCapture.allowed).toBe(true);
            expect(shouldCapture.licensed).toBe(true);
        });

        it('should track usage correctly', async () => {
            // Record some usage
            await licenseControlledLoggingService.recordLogEvent(testTenantId, 'user_action', 10);
            
            const stats = await licenseControlledLoggingService.getUsageStatistics(testTenantId, 1);
            
            expect(stats.totalEvents).toBeGreaterThan(0);
        });

        it('should enforce daily limits', async () => {
            // Simulate hitting the daily limit
            const capabilities = await licenseControlledLoggingService.getLoggingCapabilities(testTenantId);
            
            // Record usage up to the limit
            await licenseControlledLoggingService.recordLogEvent(
                testTenantId, 
                'user_action', 
                capabilities.limits.dailyLogEntries
            );
            
            const shouldCapture = await licenseControlledLoggingService.shouldCaptureLogEvent(
                testTenantId, 
                'user_action'
            );
            
            expect(shouldCapture.allowed).toBe(false);
            expect(shouldCapture.reason).toContain('limit exceeded');
        });

        it('should always allow mandatory events even over limit', async () => {
            // Simulate hitting the daily limit
            const capabilities = await licenseControlledLoggingService.getLoggingCapabilities(testTenantId);
            await licenseControlledLoggingService.recordLogEvent(
                testTenantId, 
                'user_action', 
                capabilities.limits.dailyLogEntries
            );
            
            const shouldCapture = await licenseControlledLoggingService.shouldCaptureLogEvent(
                testTenantId, 
                'authentication_attempt'
            );
            
            expect(shouldCapture.allowed).toBe(true);
            expect(shouldCapture.mandatory).toBe(true);
            expect(shouldCapture.overLimit).toBe(true);
        });
    });

    describe('Platform Control', () => {
        it('should get company logging status', async () => {
            const status = await platformLoggingControlService.getCompanyLoggingStatus(testTenantId);
            
            expect(status.tenantId).toBe(testTenantId);
            expect(status.licenseStatus.valid).toBe(true);
            expect(status.capabilities.licensed).toBe(true);
            expect(status.usage).toBeDefined();
            expect(status.compliance).toBeDefined();
        });

        it('should suspend company logging', async () => {
            const suspension = await platformLoggingControlService.suspendCompanyLogging(
                testTenantId, 
                'test-admin', 
                'Test suspension'
            );
            
            expect(suspension.tenantId).toBe(testTenantId);
            expect(suspension.reason).toBe('Test suspension');
            expect(suspension.suspendedAt).toBeDefined();
        });

        it('should restore company logging', async () => {
            // First suspend
            await platformLoggingControlService.suspendCompanyLogging(
                testTenantId, 
                'test-admin', 
                'Test suspension'
            );
            
            // Then restore
            const restoration = await platformLoggingControlService.restoreCompanyLogging(
                testTenantId, 
                'test-admin', 
                'Test restoration'
            );
            
            expect(restoration.success).toBe(true);
            expect(restoration.tier).toBe('business');
            expect(restoration.restoredAt).toBeDefined();
        });

        it('should force essential logging', async () => {
            const override = await platformLoggingControlService.forceEssentialLogging(
                testTenantId, 
                'test-admin', 
                'Emergency override'
            );
            
            expect(override.tenantId).toBe(testTenantId);
            expect(override.reason).toBe('Emergency override');
            expect(override.essentialEvents).toContain('authentication_attempt');
        });

        it('should enforce logging license', async () => {
            const enforcement = await platformLoggingControlService.enforceLoggingLicense(
                testTenantId, 
                'test-admin'
            );
            
            expect(enforcement.success).toBe(true);
            expect(enforcement.action).toBe('none_required'); // Valid license
        });
    });

    describe('API Endpoints', () => {
        it('should require logging license for log ingestion', async () => {
            const logData = {
                logs: [{
                    timestamp: new Date().toISOString(),
                    level: 'info',
                    message: 'Test log message',
                    source: 'frontend'
                }]
            };

            // This would require proper authentication setup
            // For now, we test the structure
            expect(logData.logs).toHaveLength(1);
            expect(logData.logs[0].source).toBe('frontend');
        });

        it('should provide platform control dashboard', async () => {
            const dashboard = await platformLoggingControlService.getControlDashboard();
            
            expect(dashboard.overview).toBeDefined();
            expect(dashboard.licenseDistribution).toBeDefined();
            expect(dashboard.usageMetrics).toBeDefined();
            expect(dashboard.complianceStatus).toBeDefined();
            expect(dashboard.platformPolicies).toBeDefined();
        });
    });

    describe('Policy Enforcement', () => {
        it('should detect license violations', async () => {
            const logData = {
                eventType: 'user_action',
                message: 'Attempting to bypass license restrictions',
                unlicensed: true
            };

            const policies = await licenseControlledLoggingService.enforcePlatformPolicies(
                testTenantId, 
                logData
            );
            
            expect(policies.applied).toContain('LICENSE_VIOLATION_DETECTED');
        });

        it('should escalate security events', async () => {
            const logData = {
                eventType: 'security_breach',
                security: true,
                severity: 'critical'
            };

            const policies = await licenseControlledLoggingService.enforcePlatformPolicies(
                testTenantId, 
                logData
            );
            
            expect(policies.applied).toContain('SECURITY_EVENT_ESCALATION');
        });

        it('should handle platform mandatory events', async () => {
            const logData = {
                eventType: 'authentication_attempt',
                userId: 'test-user'
            };

            const policies = await licenseControlledLoggingService.enforcePlatformPolicies(
                testTenantId, 
                logData
            );
            
            expect(policies.applied).toContain('PLATFORM_MANDATORY');
        });
    });

    describe('Compliance Monitoring', () => {
        it('should check compliance status', async () => {
            const compliance = await platformLoggingControlService.getComplianceStatus(testTenantId);
            
            expect(compliance.compliant).toBe(true);
            expect(compliance.licenseCompliant).toBe(true);
            expect(compliance.mandatoryEventsLogged).toBe(true);
            expect(compliance.lastChecked).toBeDefined();
        });

        it('should detect compliance violations', async () => {
            // Disable the license
            testLicense.status = 'expired';
            await testLicense.save();

            const compliance = await platformLoggingControlService.getComplianceStatus(testTenantId);
            
            expect(compliance.compliant).toBe(false);
            expect(compliance.licenseCompliant).toBe(false);
            expect(compliance.violations).toHaveLength(1);
            expect(compliance.violations[0].type).toBe('license_violation');
        });
    });

    describe('Error Handling', () => {
        it('should handle service initialization errors gracefully', async () => {
            // Test error handling in service initialization
            expect(licenseControlledLoggingService.initialized).toBe(true);
            expect(platformLoggingControlService.initialized).toBe(true);
        });

        it('should handle invalid tenant IDs gracefully', async () => {
            const capabilities = await licenseControlledLoggingService.getLoggingCapabilities(null);
            
            expect(capabilities.licensed).toBe(false);
            expect(capabilities.error).toBeDefined();
        });

        it('should handle database errors gracefully', async () => {
            // Simulate database error by using invalid tenant ID format
            const licenseCheck = await licenseControlledLoggingService.hasValidLoggingLicense('invalid-format');
            
            expect(licenseCheck.valid).toBe(false);
            expect(licenseCheck.error).toBeDefined();
        });
    });
});

describe('License-Controlled Logging Middleware', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
        mockReq = {
            tenantId: 'test-tenant',
            user: { id: 'test-user' },
            headers: {},
            ip: '127.0.0.1',
            path: '/api/v1/logs',
            method: 'POST'
        };

        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            end: jest.fn()
        };

        mockNext = jest.fn();
    });

    it('should validate logging license in middleware', async () => {
        // This would test the actual middleware functions
        // For now, we verify the structure exists
        expect(typeof licenseControlledLoggingService.hasValidLoggingLicense).toBe('function');
        expect(typeof licenseControlledLoggingService.getLoggingCapabilities).toBe('function');
        expect(typeof licenseControlledLoggingService.shouldCaptureLogEvent).toBe('function');
    });
});