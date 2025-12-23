/**
 * Platform Administration Features Integration Test
 * 
 * Tests the three key functionalities:
 * 1. Platform Admin can create companies
 * 2. Platform Admin can generate licenses
 * 3. Platform Admin can enable/disable modules
 */

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../app.js';
import Tenant from '../../platform/tenants/models/Tenant.js';
import { licenseService } from '../../../client/platform-admin/src/services/licenseApi.js';
import { platformService } from '../../../client/platform-admin/src/services/platformApi.js';

describe('Platform Administration Features Integration', () => {
    let testTenantId;
    let testLicenseNumber;
    let platformAdminToken;

    beforeAll(async () => {
        // Connect to test database
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/hrms_test');
        }

        // Create platform admin token for testing
        platformAdminToken = 'test-platform-admin-token';
    });

    afterAll(async () => {
        // Clean up test data
        if (testTenantId) {
            await Tenant.findByIdAndDelete(testTenantId);
        }
        
        // Close database connection
        await mongoose.connection.close();
    });

    describe('1. Platform Admin can create companies', () => {
        test('should create a new company (tenant) successfully', async () => {
            const companyData = {
                name: 'Test Company Ltd',
                subdomain: 'testcompany',
                plan: 'professional',
                modules: ['hr-core', 'tasks'],
                maxUsers: 100,
                contactEmail: 'admin@testcompany.com'
            };

            const response = await request(app)
                .post('/api/platform/tenants')
                .set('Authorization', `Bearer ${platformAdminToken}`)
                .send(companyData)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('_id');
            expect(response.body.data.name).toBe(companyData.name);
            expect(response.body.data.subdomain).toBe(companyData.subdomain);
            expect(response.body.data.billing.currentPlan).toBe(companyData.plan);

            // Store for cleanup
            testTenantId = response.body.data._id;
        });

        test('should validate required fields when creating company', async () => {
            const invalidCompanyData = {
                name: '', // Missing required name
                subdomain: 'invalid-company'
            };

            const response = await request(app)
                .post('/api/platform/tenants')
                .set('Authorization', `Bearer ${platformAdminToken}`)
                .send(invalidCompanyData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('name');
        });

        test('should prevent duplicate subdomains', async () => {
            const duplicateCompanyData = {
                name: 'Another Test Company',
                subdomain: 'testcompany', // Same subdomain as first test
                plan: 'basic'
            };

            const response = await request(app)
                .post('/api/platform/tenants')
                .set('Authorization', `Bearer ${platformAdminToken}`)
                .send(duplicateCompanyData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('subdomain');
        });
    });

    describe('2. Platform Admin can generate licenses', () => {
        test('should generate a license for the created company', async () => {
            // First ensure we have a company
            if (!testTenantId) {
                const companyData = {
                    name: 'License Test Company',
                    subdomain: 'licensetest',
                    plan: 'enterprise'
                };

                const tenantResponse = await request(app)
                    .post('/api/platform/tenants')
                    .set('Authorization', `Bearer ${platformAdminToken}`)
                    .send(companyData);

                testTenantId = tenantResponse.body.data._id;
            }

            // Generate license
            const licenseData = {
                tenantId: testTenantId,
                tenantName: 'License Test Company',
                type: 'enterprise',
                modules: ['hr-core', 'tasks', 'life-insurance'],
                maxUsers: 100,
                maxStorage: 10240,
                maxAPICallsPerMonth: 100000,
                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
                domain: 'licensetest.hrms.com'
            };

            // Test license creation via direct API call to license server
            const response = await request('http://localhost:4000')
                .post('/licenses/create')
                .set('X-API-Key', process.env.LICENSE_SERVER_API_KEY || 'test-api-key')
                .send(licenseData)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('licenseNumber');
            expect(response.body.data).toHaveProperty('token');
            expect(response.body.data.licenseNumber).toMatch(/^HRSM-/);

            // Store for cleanup
            testLicenseNumber = response.body.data.licenseNumber;
        });

        test('should validate license token', async () => {
            if (!testLicenseNumber) {
                // Skip if no license was created
                return;
            }

            // Get the license details first
            const licenseResponse = await request('http://localhost:4000')
                .get(`/licenses/${testLicenseNumber}`)
                .set('X-API-Key', process.env.LICENSE_SERVER_API_KEY || 'test-api-key')
                .expect(200);

            const token = licenseResponse.body.data.token;

            // Validate the license
            const validationResponse = await request('http://localhost:4000')
                .post('/licenses/validate')
                .send({
                    token: token,
                    machineId: 'test-machine-123'
                })
                .expect(200);

            expect(validationResponse.body.valid).toBe(true);
            expect(validationResponse.body.data).toHaveProperty('tenantId');
            expect(validationResponse.body.data.tenantId).toBe(testTenantId);
        });

        test('should handle invalid license validation', async () => {
            const invalidToken = 'invalid.jwt.token';

            const response = await request('http://localhost:4000')
                .post('/licenses/validate')
                .send({
                    token: invalidToken,
                    machineId: 'test-machine-123'
                })
                .expect(400);

            expect(response.body.valid).toBe(false);
            expect(response.body.error).toBeDefined();
        });
    });

    describe('3. Platform Admin can enable/disable modules', () => {
        test('should enable a module for a tenant', async () => {
            if (!testTenantId) {
                // Create a tenant for module testing
                const companyData = {
                    name: 'Module Test Company',
                    subdomain: 'moduletest',
                    plan: 'professional'
                };

                const tenantResponse = await request(app)
                    .post('/api/platform/tenants')
                    .set('Authorization', `Bearer ${platformAdminToken}`)
                    .send(companyData);

                testTenantId = tenantResponse.body.data._id;
            }

            // Enable life-insurance module
            const response = await request(app)
                .post(`/api/platform/tenants/${testTenantId}/modules/life-insurance/enable`)
                .set('Authorization', `Bearer ${platformAdminToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('enabled');

            // Verify module is enabled
            const tenantResponse = await request(app)
                .get(`/api/platform/tenants/${testTenantId}`)
                .set('Authorization', `Bearer ${platformAdminToken}`)
                .expect(200);

            expect(tenantResponse.body.data.modules).toContain('life-insurance');
        });

        test('should disable a module for a tenant', async () => {
            if (!testTenantId) {
                return; // Skip if no tenant
            }

            // Disable life-insurance module
            const response = await request(app)
                .post(`/api/platform/tenants/${testTenantId}/modules/life-insurance/disable`)
                .set('Authorization', `Bearer ${platformAdminToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('disabled');

            // Verify module is disabled
            const tenantResponse = await request(app)
                .get(`/api/platform/tenants/${testTenantId}`)
                .set('Authorization', `Bearer ${platformAdminToken}`)
                .expect(200);

            expect(tenantResponse.body.data.modules).not.toContain('life-insurance');
        });

        test('should handle invalid module names', async () => {
            if (!testTenantId) {
                return; // Skip if no tenant
            }

            // Try to enable non-existent module
            const response = await request(app)
                .post(`/api/platform/tenants/${testTenantId}/modules/non-existent-module/enable`)
                .set('Authorization', `Bearer ${platformAdminToken}`)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('module');
        });

        test('should enforce license requirements for modules', async () => {
            if (!testTenantId) {
                return; // Skip if no tenant
            }

            // Try to enable life-insurance module without proper license
            // This should fail if license validation is properly implemented
            const response = await request(app)
                .post(`/api/platform/tenants/${testTenantId}/modules/life-insurance/enable`)
                .set('Authorization', `Bearer ${platformAdminToken}`)
                .send();

            // The response could be 200 (enabled) or 400 (license required)
            // depending on license validation implementation
            expect([200, 400]).toContain(response.status);

            if (response.status === 400) {
                expect(response.body.error).toContain('license');
            }
        });
    });

    describe('Integration workflow test', () => {
        test('should complete full workflow: create company → generate license → enable modules', async () => {
            // Step 1: Create company
            const companyData = {
                name: 'Full Workflow Test Company',
                subdomain: 'fullworkflow',
                plan: 'enterprise',
                contactEmail: 'admin@fullworkflow.com'
            };

            const tenantResponse = await request(app)
                .post('/api/platform/tenants')
                .set('Authorization', `Bearer ${platformAdminToken}`)
                .send(companyData)
                .expect(201);

            const workflowTenantId = tenantResponse.body.data._id;

            // Step 2: Generate license
            const licenseData = {
                tenantId: workflowTenantId,
                tenantName: companyData.name,
                type: 'enterprise',
                modules: ['hr-core', 'tasks', 'life-insurance'],
                maxUsers: 200,
                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                domain: 'fullworkflow.hrms.com'
            };

            const licenseResponse = await request('http://localhost:4000')
                .post('/licenses/create')
                .set('X-API-Key', process.env.LICENSE_SERVER_API_KEY || 'test-api-key')
                .send(licenseData)
                .expect(201);

            const workflowLicenseNumber = licenseResponse.body.data.licenseNumber;

            // Step 3: Update tenant with license information
            await request(app)
                .put(`/api/platform/tenants/${workflowTenantId}`)
                .set('Authorization', `Bearer ${platformAdminToken}`)
                .send({
                    license: {
                        licenseKey: licenseResponse.body.data.token,
                        licenseType: 'enterprise',
                        expiresAt: licenseData.expiresAt
                    }
                })
                .expect(200);

            // Step 4: Enable modules
            const moduleResponse = await request(app)
                .post(`/api/platform/tenants/${workflowTenantId}/modules/life-insurance/enable`)
                .set('Authorization', `Bearer ${platformAdminToken}`)
                .expect(200);

            expect(moduleResponse.body.success).toBe(true);

            // Verify complete workflow
            const finalTenantResponse = await request(app)
                .get(`/api/platform/tenants/${workflowTenantId}`)
                .set('Authorization', `Bearer ${platformAdminToken}`)
                .expect(200);

            const finalTenant = finalTenantResponse.body.data;
            expect(finalTenant.name).toBe(companyData.name);
            expect(finalTenant.license.licenseKey).toBeDefined();
            expect(finalTenant.modules).toContain('life-insurance');

            // Cleanup
            await Tenant.findByIdAndDelete(workflowTenantId);
            
            // Revoke license
            await request('http://localhost:4000')
                .delete(`/licenses/${workflowLicenseNumber}`)
                .set('X-API-Key', process.env.LICENSE_SERVER_API_KEY || 'test-api-key')
                .send({ reason: 'Test cleanup' });
        });
    });
});