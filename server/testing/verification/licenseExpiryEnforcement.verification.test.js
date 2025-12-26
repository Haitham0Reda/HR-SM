/**
 * License Expiry Enforcement Verification Test
 * 
 * This test verifies that license expiry enforcement is working correctly
 * by testing the complete workflow from license creation to expiry enforcement.
 * 
 * Requirements: 4.2, 4.5
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import licenseValidator from '../../platform/system/services/licenseValidator.service.js';
import License from '../../platform/system/models/license.model.js';
import LicenseAudit from '../../platform/system/models/licenseAudit.model.js';
import { MODULES } from '../../platform/system/models/license.model.js';
import mongoose from 'mongoose';

describe('License Expiry Enforcement Verification', () => {
    let testTenantId;
    let validTenantId;
    let expiredLicense;
    let validLicense;

    beforeAll(async () => {
        // Generate unique tenant IDs for this test (as ObjectIds)
        testTenantId = new mongoose.Types.ObjectId();
        validTenantId = new mongoose.Types.ObjectId();
    });

    afterAll(async () => {
        // Clean up test data
        if (expiredLicense) {
            await License.findByIdAndDelete(expiredLicense._id);
        }
        if (validLicense) {
            await License.findByIdAndDelete(validLicense._id);
        }
        await LicenseAudit.deleteMany({ 
            tenantId: { $in: [testTenantId, validTenantId] }
        });
    });

    describe('Expired License Enforcement', () => {
        it('should create expired license and reject access due to expiry', async () => {
            // Create a license that expired yesterday
            const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
            
            try {
                expiredLicense = new License({
                    tenantId: testTenantId.toString(), // Convert ObjectId to string for License model
                    subscriptionId: 'test-expired-subscription-' + Date.now(),
                    status: 'expired', // Explicitly set as expired
                    modules: [{
                        key: MODULES.PAYROLL, // Use a module that exists in the enum
                        enabled: true,
                        tier: 'business',
                        expiresAt: expiredDate,
                        limits: {
                            employees: 100,
                            storage: 10240,
                            apiCalls: 100000
                        }
                    }],
                    billingCycle: 'monthly',
                    trialEndsAt: expiredDate
                });

                await expiredLicense.save();
                expect(expiredLicense._id).toBeDefined();
                expect(expiredLicense.status).toBe('expired');

                // Now test validation immediately in the same test
                const result = await licenseValidator.validateModuleAccess(
                    testTenantId.toString(), // Convert ObjectId to string for validation
                    MODULES.PAYROLL,
                    {
                        requestInfo: {
                            userId: new mongoose.Types.ObjectId().toString(),
                            ipAddress: '127.0.0.1',
                            userAgent: 'test-agent',
                            path: '/api/v1/payroll',
                            method: 'GET'
                        }
                    }
                );

                // Verify license validation fails due to expiry
                expect(result.valid).toBe(false);
                expect(result.error).toBe('LICENSE_EXPIRED');
                expect(result.reason).toMatch(/expired/i);
                expect(result.moduleKey).toBe(MODULES.PAYROLL);
                
            } catch (error) {
                console.error('Error in test:', error);
                throw error;
            }
        });

        it('should log license expiry in audit trail', async () => {
            // First, trigger a license validation that should create an audit log
            const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const auditTestTenantId = new mongoose.Types.ObjectId();
            
            const auditTestLicense = new License({
                tenantId: auditTestTenantId.toString(),
                subscriptionId: 'audit-test-subscription-' + Date.now(),
                status: 'expired',
                modules: [{
                    key: MODULES.PAYROLL,
                    enabled: true,
                    tier: 'business',
                    expiresAt: expiredDate,
                    limits: { employees: 100, storage: 10240, apiCalls: 100000 }
                }],
                billingCycle: 'monthly',
                trialEndsAt: expiredDate
            });

            await auditTestLicense.save();

            // Trigger validation to create audit log
            await licenseValidator.validateModuleAccess(
                auditTestTenantId.toString(),
                MODULES.PAYROLL,
                {
                    requestInfo: {
                        userId: new mongoose.Types.ObjectId().toString(),
                        ipAddress: '127.0.0.1',
                        userAgent: 'test-agent',
                        path: '/api/v1/payroll',
                        method: 'GET'
                    }
                }
            );

            // Wait a bit for async audit logging
            await new Promise(resolve => setTimeout(resolve, 100));

            // Check that audit log was created for license expiry
            const auditLogs = await LicenseAudit.find({
                tenantId: auditTestTenantId, // Use ObjectId for audit query
                moduleKey: MODULES.PAYROLL,
                eventType: 'LICENSE_EXPIRED'
            }).sort({ timestamp: -1 });

            expect(auditLogs.length).toBeGreaterThan(0);
            
            const latestLog = auditLogs[0];
            expect(latestLog.eventType).toBe('LICENSE_EXPIRED');
            expect(latestLog.severity).toBe('critical');
            expect(latestLog.tenantId.toString()).toBe(auditTestTenantId.toString());
            expect(latestLog.moduleKey).toBe(MODULES.PAYROLL);

            // Clean up
            await License.findByIdAndDelete(auditTestLicense._id);
            await LicenseAudit.deleteMany({ tenantId: auditTestTenantId });
        });
    });

    describe('Valid License Enforcement', () => {
        it('should create valid license and allow access', async () => {
            // Create a license that expires in 30 days
            const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            
            validLicense = new License({
                tenantId: validTenantId.toString(), // Convert ObjectId to string for License model
                subscriptionId: 'test-valid-subscription-' + Date.now(),
                status: 'active',
                modules: [{
                    key: MODULES.PAYROLL,
                    enabled: true,
                    tier: 'business',
                    expiresAt: futureDate,
                    limits: {
                        employees: 100,
                        storage: 10240,
                        apiCalls: 100000
                    }
                }],
                billingCycle: 'monthly',
                trialEndsAt: futureDate
            });

            await validLicense.save();
            expect(validLicense._id).toBeDefined();
            expect(validLicense.status).toBe('active');

            // Test validation immediately in the same test
            const result = await licenseValidator.validateModuleAccess(
                validTenantId.toString(), // Convert ObjectId to string for validation
                MODULES.PAYROLL,
                {
                    requestInfo: {
                        userId: new mongoose.Types.ObjectId().toString(),
                        ipAddress: '127.0.0.1',
                        userAgent: 'test-agent',
                        path: '/api/v1/payroll',
                        method: 'GET'
                    }
                }
            );

            // Verify license validation succeeds
            expect(result.valid).toBe(true);
            expect(result.moduleKey).toBe(MODULES.PAYROLL);
            expect(result.license).toBeDefined();
            expect(result.license.tier).toBe('business');
        });
    });

    describe('License Expiry Enforcement Summary', () => {
        it('should demonstrate complete license expiry enforcement workflow', async () => {
            console.log('\n🔍 License Expiry Enforcement Verification Summary:');
            console.log('✅ Expired licenses are properly rejected');
            console.log('✅ LICENSE_EXPIRED error is returned for expired licenses');
            console.log('✅ Audit logs are created for license expiry events');
            console.log('✅ Valid licenses continue to work normally');
            console.log('✅ License expiry enforcement is working correctly\n');

            // Final verification - test with fresh licenses to ensure the system behaves correctly
            const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            
            // Create fresh test licenses for final verification
            const testExpiredLicense = new License({
                tenantId: new mongoose.Types.ObjectId().toString(),
                subscriptionId: 'final-test-expired-' + Date.now(),
                status: 'expired',
                modules: [{
                    key: MODULES.PAYROLL,
                    enabled: true,
                    tier: 'business',
                    expiresAt: expiredDate,
                    limits: { employees: 100, storage: 10240, apiCalls: 100000 }
                }],
                billingCycle: 'monthly',
                trialEndsAt: expiredDate
            });
            
            const testValidLicense = new License({
                tenantId: new mongoose.Types.ObjectId().toString(),
                subscriptionId: 'final-test-valid-' + Date.now(),
                status: 'active',
                modules: [{
                    key: MODULES.PAYROLL,
                    enabled: true,
                    tier: 'business',
                    expiresAt: futureDate,
                    limits: { employees: 100, storage: 10240, apiCalls: 100000 }
                }],
                billingCycle: 'monthly',
                trialEndsAt: futureDate
            });

            await testExpiredLicense.save();
            await testValidLicense.save();

            try {
                const expiredResult = await licenseValidator.validateModuleAccess(
                    testExpiredLicense.tenantId,
                    MODULES.PAYROLL
                );
                
                const validResult = await licenseValidator.validateModuleAccess(
                    testValidLicense.tenantId,
                    MODULES.PAYROLL
                );

                expect(expiredResult.valid).toBe(false);
                expect(expiredResult.error).toBe('LICENSE_EXPIRED');
                expect(validResult.valid).toBe(true);

                // Mark this verification as complete
                expect(true).toBe(true); // License expiry enforcement works!
            } finally {
                // Clean up test licenses
                await License.findByIdAndDelete(testExpiredLicense._id);
                await License.findByIdAndDelete(testValidLicense._id);
            }
        });
    });
});