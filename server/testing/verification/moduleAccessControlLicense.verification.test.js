/**
 * Module Access Control Based on License Verification Test
 * 
 * This test verifies that module access control based on license features is working correctly.
 * It tests the integration between license validation middleware and module guard middleware.
 * 
 * Requirements: 4.2, 4.5, 5.1
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { validateLicense } from '../../middleware/licenseServerValidation.middleware.js';
import { requireModule } from '../../middleware/licenseFeatureGuard.middleware.js';
import { tenantContext } from '../../core/middleware/tenantContext.js';
import moduleRegistry from '../../core/registry/moduleRegistry.js';

// Mock license server responses
const mockLicenseServerResponses = {
    validWithLifeInsurance: {
        valid: true,
        licenseType: 'professional',
        features: ['hr-core', 'life-insurance', 'reports'],
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        maxUsers: 100,
        maxStorage: 10240,
        maxAPI: 100000
    },
    validWithoutLifeInsurance: {
        valid: true,
        licenseType: 'basic',
        features: ['hr-core', 'reports'],
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        maxUsers: 50,
        maxStorage: 5120,
        maxAPI: 50000
    },
    expired: {
        valid: false,
        error: 'LICENSE_EXPIRED',
        reason: 'License has expired'
    },
    invalid: {
        valid: false,
        error: 'INVALID_TOKEN',
        reason: 'License token is invalid or malformed'
    }
};

describe('Module Access Control Based on License Verification', () => {
    let app;
    let testTenantId;
    let mockTenant;

    beforeAll(async () => {
        testTenantId = 'test-tenant-' + Date.now();
        
        // Create test tenant
        mockTenant = {
            id: testTenantId,
            _id: testTenantId,
            name: 'Test Company',
            enabledModules: ['hr-core', 'life-insurance'], // Module is enabled at tenant level
            license: {
                licenseKey: 'test-license-token',
                licenseStatus: 'active',
                licenseExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            }
        };
    });

    beforeEach(async () => {
        // Create fresh Express app for each test
        app = express();
        app.use(express.json());
        
        // Clear and register required modules
        moduleRegistry.clear();
        
        // Register hr-core module
        moduleRegistry.register({
            name: 'hr-core',
            displayName: 'HR Core',
            version: '1.0.0',
            description: 'Core HR functionality'
        });
        
        // Register life-insurance module
        moduleRegistry.register({
            name: 'life-insurance',
            displayName: 'Life Insurance',
            version: '1.0.0',
            description: 'Life insurance management',
            dependencies: ['hr-core']
        });
        
        // Mock tenant context middleware
        app.use((req, res, next) => {
            req.tenant = mockTenant;
            req.tenantId = testTenantId;
            next();
        });
    });

    describe('Life Insurance Module Access Control', () => {
        it('should allow access when license includes life-insurance feature', async () => {
            // Mock license validation middleware to return valid license with life-insurance
            app.use((req, res, next) => {
                req.licenseInfo = mockLicenseServerResponses.validWithLifeInsurance;
                next();
            });

            // Apply module guard for life-insurance
            app.use('/api/v1/life-insurance', requireModule('life-insurance'));
            
            // Test route
            app.get('/api/v1/life-insurance/policies', (req, res) => {
                res.json({ 
                    success: true, 
                    message: 'Access granted to life insurance module',
                    licenseInfo: req.licenseInfo,
                    moduleAvailable: req.moduleAvailable
                });
            });

            const response = await request(app)
                .get('/api/v1/life-insurance/policies')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Access granted to life insurance module');
        });

        it('should deny access when license does not include life-insurance feature', async () => {
            // Mock license validation middleware to return valid license without life-insurance
            app.use((req, res, next) => {
                req.licenseInfo = mockLicenseServerResponses.validWithoutLifeInsurance;
                next();
            });

            // Apply module guard for life-insurance
            app.use('/api/v1/life-insurance', requireModule('life-insurance'));
            
            // Test route
            app.get('/api/v1/life-insurance/policies', (req, res) => {
                res.json({ 
                    success: true, 
                    message: 'This should not be reached'
                });
            });

            const response = await request(app)
                .get('/api/v1/life-insurance/policies')
                .expect(403);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('FEATURE_NOT_LICENSED');
            expect(response.body.message).toContain('life-insurance');
            expect(response.body.requiredFeature).toBe('life-insurance');
        });

        it('should deny access when license is expired', async () => {
            // Mock license validation middleware to return expired license
            app.use((req, res, next) => {
                req.licenseInfo = mockLicenseServerResponses.expired;
                next();
            });

            // Apply module guard for life-insurance
            app.use('/api/v1/life-insurance', requireModule('life-insurance'));
            
            // Test route
            app.get('/api/v1/life-insurance/policies', (req, res) => {
                res.json({ 
                    success: true, 
                    message: 'This should not be reached'
                });
            });

            const response = await request(app)
                .get('/api/v1/life-insurance/policies')
                .expect(403);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('LICENSE_REQUIRED');
            expect(response.body.message).toContain('valid license');
        });

        it('should deny access when no license info is available', async () => {
            // No license validation middleware - req.licenseInfo will be undefined
            
            // Apply module guard for life-insurance
            app.use('/api/v1/life-insurance', requireModule('life-insurance'));
            
            // Test route
            app.get('/api/v1/life-insurance/policies', (req, res) => {
                res.json({ 
                    success: true, 
                    message: 'This should not be reached'
                });
            });

            const response = await request(app)
                .get('/api/v1/life-insurance/policies')
                .expect(403);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('LICENSE_REQUIRED');
        });
    });

    describe('HR Core Module Access Control', () => {
        it('should always allow access to hr-core module regardless of license', async () => {
            // Mock license validation middleware to return basic license without life-insurance
            app.use((req, res, next) => {
                req.licenseInfo = mockLicenseServerResponses.validWithoutLifeInsurance;
                next();
            });

            // Apply module guard for hr-core
            app.use('/api/v1/employees', requireModule('hr-core'));
            
            // Test route
            app.get('/api/v1/employees', (req, res) => {
                res.json({ 
                    success: true, 
                    message: 'Access granted to hr-core module'
                });
            });

            const response = await request(app)
                .get('/api/v1/employees')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Access granted to hr-core module');
        });

        it('should allow access to hr-core even with expired license', async () => {
            // Mock license validation middleware to return expired license
            app.use((req, res, next) => {
                req.licenseInfo = mockLicenseServerResponses.expired;
                next();
            });

            // Apply module guard for hr-core
            app.use('/api/v1/employees', requireModule('hr-core'));
            
            // Test route
            app.get('/api/v1/employees', (req, res) => {
                res.json({ 
                    success: true, 
                    message: 'Access granted to hr-core module'
                });
            });

            const response = await request(app)
                .get('/api/v1/employees')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Access granted to hr-core module');
        });
    });

    describe('Module Disabled at Tenant Level', () => {
        it('should deny access when module is disabled at tenant level even with valid license', async () => {
            // Create tenant with life-insurance module disabled
            const tenantWithDisabledModule = {
                ...mockTenant,
                enabledModules: ['hr-core'] // life-insurance not enabled
            };

            // Create fresh app with disabled module tenant
            app = express();
            app.use(express.json());
            
            // Mock tenant context with disabled module
            app.use((req, res, next) => {
                req.tenant = tenantWithDisabledModule;
                req.tenantId = testTenantId;
                next();
            });

            // Mock license validation middleware to return valid license with life-insurance
            app.use((req, res, next) => {
                req.licenseInfo = mockLicenseServerResponses.validWithLifeInsurance;
                next();
            });

            // Apply module guard for life-insurance
            app.use('/api/v1/life-insurance', requireModule('life-insurance'));
            
            // Test route
            app.get('/api/v1/life-insurance/policies', (req, res) => {
                res.json({ 
                    success: true, 
                    message: 'This should not be reached'
                });
            });

            const response = await request(app)
                .get('/api/v1/life-insurance/policies')
                .expect(403);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('MODULE_DISABLED');
            expect(response.body.message).toContain('not enabled');
        });
    });

    describe('Integration Test Summary', () => {
        it('should demonstrate complete module access control workflow', async () => {
            console.log('\n🔍 Module Access Control Based on License Verification Summary:');
            
            // Test 1: Valid license with feature - should allow access
            app = express();
            app.use(express.json());
            app.use((req, res, next) => {
                req.tenant = mockTenant;
                req.tenantId = testTenantId;
                req.licenseInfo = mockLicenseServerResponses.validWithLifeInsurance;
                next();
            });
            app.use('/test1', requireModule('life-insurance'));
            app.get('/test1', (req, res) => res.json({ success: true }));

            const test1Response = await request(app).get('/test1');
            expect(test1Response.status).toBe(200);
            console.log('✅ Valid license with feature allows access');

            // Test 2: Valid license without feature - should deny access
            app = express();
            app.use(express.json());
            app.use((req, res, next) => {
                req.tenant = mockTenant;
                req.tenantId = testTenantId;
                req.licenseInfo = mockLicenseServerResponses.validWithoutLifeInsurance;
                next();
            });
            app.use('/test2', requireModule('life-insurance'));
            app.get('/test2', (req, res) => res.json({ success: true }));

            const test2Response = await request(app).get('/test2');
            expect(test2Response.status).toBe(403);
            console.log('✅ Valid license without feature denies access');

            // Test 3: Expired license - should deny access
            app = express();
            app.use(express.json());
            app.use((req, res, next) => {
                req.tenant = mockTenant;
                req.tenantId = testTenantId;
                req.licenseInfo = mockLicenseServerResponses.expired;
                next();
            });
            app.use('/test3', requireModule('life-insurance'));
            app.get('/test3', (req, res) => res.json({ success: true }));

            const test3Response = await request(app).get('/test3');
            expect(test3Response.status).toBe(403);
            console.log('✅ Expired license denies access');

            // Test 4: HR-Core always accessible
            app = express();
            app.use(express.json());
            app.use((req, res, next) => {
                req.tenant = mockTenant;
                req.tenantId = testTenantId;
                req.licenseInfo = mockLicenseServerResponses.expired;
                next();
            });
            app.use('/test4', requireModule('hr-core'));
            app.get('/test4', (req, res) => res.json({ success: true }));

            const test4Response = await request(app).get('/test4');
            expect(test4Response.status).toBe(200);
            console.log('✅ HR-Core module always accessible');

            console.log('✅ Module access control based on license is working correctly\n');
        });
    });
});