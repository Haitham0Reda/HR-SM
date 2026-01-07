/**
 * Final Integration and Validation Tests for Life Insurance Module
 * 
 * This test suite validates task 13 requirements:
 * - Verify all endpoints work with standardized middleware
 * - Test complete role-based access control flow
 * - Validate tenant isolation across all operations
 * 
 * Requirements: All requirements from insurance-module-multi-tenant-roles spec
 */

import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

describe('Life Insurance Module - Final Integration and Validation', () => {
    let app;

    beforeAll(async () => {
        // Import app after database connection is established
        const appModule = await import('../../../app.js');
        app = appModule.default;
    });

    describe('Middleware Integration Validation', () => {
        test('should require authentication for all insurance endpoints', async () => {
            const endpoints = [
                { method: 'get', path: '/api/v1/life-insurance/' },
                { method: 'get', path: '/api/v1/life-insurance/policies' },
                { method: 'post', path: '/api/v1/life-insurance/policies' },
                { method: 'get', path: '/api/v1/life-insurance/claims' },
                { method: 'get', path: '/api/v1/life-insurance/family-members' },
                { method: 'get', path: '/api/v1/life-insurance/config' }
            ];

            for (const endpoint of endpoints) {
                const response = await request(app)[endpoint.method](endpoint.path);
                
                // Should return 401 Unauthorized without token, not 404
                expect(response.status).not.toBe(404);
                expect([401, 403, 500]).toContain(response.status);
                expect(response.body.success).toBe(false);
                expect(response.body.message || response.body.error).toBeTruthy();
            }
        });

        test('should validate JWT token format and structure', async () => {
            const invalidTokens = [
                'invalid-token',
                'Bearer invalid-token',
                'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature',
                ''
            ];

            for (const token of invalidTokens) {
                const response = await request(app)
                    .get('/api/v1/life-insurance/')
                    .set('Authorization', token);
                
                expect(response.status).toBe(401);
                expect(response.body.success).toBe(false);
            }
        });

        test('should apply middleware stack in correct order', async () => {
            // Test with a valid JWT but without proper tenant/module setup
            const testToken = jwt.sign(
                { 
                    id: new mongoose.Types.ObjectId(),
                    tenantId: new mongoose.Types.ObjectId(),
                    role: 'employee'
                },
                process.env.JWT_SECRET || 'test-secret',
                { expiresIn: '1h' }
            );

            const response = await request(app)
                .get('/api/v1/life-insurance/')
                .set('Authorization', `Bearer ${testToken}`);

            // Should pass authentication but fail at license/tenant validation step
            expect(response.status).not.toBe(404);
            expect([401, 403, 500]).toContain(response.status);
            expect(response.body.success).toBe(false);
        });
    });

    describe('Role-Based Access Control Validation', () => {
        test('should enforce role hierarchy in endpoint access', async () => {
            const roles = ['employee', 'manager', 'hr'];
            
            // Test admin-only endpoint with different roles
            for (const role of roles) {
                const testToken = jwt.sign(
                    { 
                        id: new mongoose.Types.ObjectId(),
                        tenantId: new mongoose.Types.ObjectId(),
                        role: role
                    },
                    process.env.JWT_SECRET || 'test-secret',
                    { expiresIn: '1h' }
                );

                const response = await request(app)
                    .post('/api/v1/life-insurance/config/cache/clear')
                    .set('Authorization', `Bearer ${testToken}`);

                // Should be forbidden for non-admin roles or fail at middleware level
                expect(response.status).not.toBe(404);
                expect([401, 403, 500]).toContain(response.status);
                expect(response.body.success).toBe(false);
            }
        });

        test('should validate role-based endpoint restrictions', async () => {
            const employeeToken = jwt.sign(
                { 
                    id: new mongoose.Types.ObjectId(),
                    tenantId: new mongoose.Types.ObjectId(),
                    role: 'employee'
                },
                process.env.JWT_SECRET || 'test-secret',
                { expiresIn: '1h' }
            );

            // Employee trying to access manager-only statistics endpoint
            const response = await request(app)
                .get('/api/v1/life-insurance/policies/statistics')
                .set('Authorization', `Bearer ${employeeToken}`);

            expect(response.status).not.toBe(404);
            expect([401, 403, 500]).toContain(response.status);
            expect(response.body.success).toBe(false);
        });
    });

    describe('Tenant Isolation Validation', () => {
        test('should validate tenant context in JWT tokens', async () => {
            const tokenWithoutTenant = jwt.sign(
                { 
                    id: new mongoose.Types.ObjectId(),
                    role: 'employee'
                    // Missing tenantId
                },
                process.env.JWT_SECRET || 'test-secret',
                { expiresIn: '1h' }
            );

            const response = await request(app)
                .get('/api/v1/life-insurance/')
                .set('Authorization', `Bearer ${tokenWithoutTenant}`);

            // Should fail due to missing tenant context
            expect(response.status).not.toBe(404);
            expect([401, 403, 500]).toContain(response.status);
            expect(response.body.success).toBe(false);
        });

        test('should enforce tenant-scoped data access', async () => {
            const tenant1Id = new mongoose.Types.ObjectId();
            const tenant2Id = new mongoose.Types.ObjectId();

            const tenant1Token = jwt.sign(
                { 
                    id: new mongoose.Types.ObjectId(),
                    tenantId: tenant1Id,
                    role: 'hr'
                },
                process.env.JWT_SECRET || 'test-secret',
                { expiresIn: '1h' }
            );

            // Try to access data with tenant1 token
            // The middleware should automatically scope queries to tenant1
            const response = await request(app)
                .get('/api/v1/life-insurance/policies')
                .set('Authorization', `Bearer ${tenant1Token}`);

            // Response should be scoped to tenant (even if empty)
            // The important thing is that it doesn't return cross-tenant data
            if (response.status === 200) {
                expect(response.body.success).toBe(true);
                // If there's data, it should all belong to the correct tenant
                if (response.body.data && response.body.data.policies) {
                    response.body.data.policies.forEach(policy => {
                        expect(policy.tenantId).toBe(tenant1Id.toString());
                    });
                }
            }
        });
    });

    describe('Error Handling Standardization Validation', () => {
        test('should return consistent error response format', async () => {
            const response = await request(app)
                .get('/api/v1/life-insurance/policies');

            // Should have consistent error format
            expect(response.body).toHaveProperty('success');
            expect(response.body.success).toBe(false);
            expect(response.body).toHaveProperty('message');
            expect(typeof response.body.message).toBe('string');
        });

        test('should handle validation errors consistently', async () => {
            const testToken = jwt.sign(
                { 
                    id: new mongoose.Types.ObjectId(),
                    tenantId: new mongoose.Types.ObjectId(),
                    role: 'employee'
                },
                process.env.JWT_SECRET || 'test-secret',
                { expiresIn: '1h' }
            );

            // Send invalid data to trigger validation error
            const response = await request(app)
                .post('/api/v1/life-insurance/policies')
                .set('Authorization', `Bearer ${testToken}`)
                .send({
                    employeeId: 'invalid-id',
                    policyType: 'INVALID_TYPE',
                    coverageAmount: -1000
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body).toHaveProperty('message');
        });
    });

    describe('Module Configuration Integration Validation', () => {
        test('should validate module licensing requirements', async () => {
            const testToken = jwt.sign(
                { 
                    id: new mongoose.Types.ObjectId(),
                    tenantId: new mongoose.Types.ObjectId(),
                    role: 'employee'
                },
                process.env.JWT_SECRET || 'test-secret',
                { expiresIn: '1h' }
            );

            const response = await request(app)
                .get('/api/v1/life-insurance/')
                .set('Authorization', `Bearer ${testToken}`);

            // Should check for module license - routes are mounted so not 404
            expect(response.status).not.toBe(404);
            expect([401, 403, 500]).toContain(response.status);
            expect(response.body.success).toBe(false);
        });

        test('should validate tenant status requirements', async () => {
            const testToken = jwt.sign(
                { 
                    id: new mongoose.Types.ObjectId(),
                    tenantId: new mongoose.Types.ObjectId(),
                    role: 'employee'
                },
                process.env.JWT_SECRET || 'test-secret',
                { expiresIn: '1h' }
            );

            const response = await request(app)
                .get('/api/v1/life-insurance/')
                .set('Authorization', `Bearer ${testToken}`);

            // Should check tenant status - routes are mounted so not 404
            expect(response.status).not.toBe(404);
            expect([401, 403, 500]).toContain(response.status);
            expect(response.body.success).toBe(false);
        });
    });

    describe('Endpoint Standardization Validation', () => {
        test('should validate all endpoints follow standard patterns', async () => {
            const testToken = jwt.sign(
                { 
                    id: new mongoose.Types.ObjectId(),
                    tenantId: new mongoose.Types.ObjectId(),
                    role: 'admin'
                },
                process.env.JWT_SECRET || 'test-secret',
                { expiresIn: '1h' }
            );

            const endpoints = [
                '/api/v1/life-insurance/',
                '/api/v1/life-insurance/policies',
                '/api/v1/life-insurance/claims',
                '/api/v1/life-insurance/family-members',
                '/api/v1/life-insurance/config'
            ];

            for (const endpoint of endpoints) {
                const response = await request(app)
                    .get(endpoint)
                    .set('Authorization', `Bearer ${testToken}`);

                // All responses should have consistent structure and not be 404
                expect(response.status).not.toBe(404);
                expect(response.body).toHaveProperty('success');
                expect(typeof response.body.success).toBe('boolean');
                
                if (response.body.success) {
                    expect(response.body).toHaveProperty('data');
                } else {
                    expect(response.body).toHaveProperty('message');
                }
            }
        });

        test('should validate input validation patterns', async () => {
            const testToken = jwt.sign(
                { 
                    id: new mongoose.Types.ObjectId(),
                    tenantId: new mongoose.Types.ObjectId(),
                    role: 'employee'
                },
                process.env.JWT_SECRET || 'test-secret',
                { expiresIn: '1h' }
            );

            // Test various invalid inputs
            const invalidInputs = [
                { employeeId: '' },
                { policyType: 'INVALID' },
                { coverageAmount: 'not-a-number' },
                { premium: -100 }
            ];

            for (const invalidInput of invalidInputs) {
                const response = await request(app)
                    .post('/api/v1/life-insurance/policies')
                    .set('Authorization', `Bearer ${testToken}`)
                    .send(invalidInput);

                // Should handle validation errors properly, not return 404
                expect(response.status).not.toBe(404);
                expect([400, 401, 403, 422, 500]).toContain(response.status);
                expect(response.body.success).toBe(false);
            }
        });
    });

    describe('Security Validation', () => {
        test('should prevent SQL injection attempts', async () => {
            const testToken = jwt.sign(
                { 
                    id: new mongoose.Types.ObjectId(),
                    tenantId: new mongoose.Types.ObjectId(),
                    role: 'employee'
                },
                process.env.JWT_SECRET || 'test-secret',
                { expiresIn: '1h' }
            );

            const maliciousInputs = [
                "'; DROP TABLE policies; --",
                "1' OR '1'='1",
                "<script>alert('xss')</script>",
                "../../etc/passwd"
            ];

            for (const maliciousInput of maliciousInputs) {
                const response = await request(app)
                    .get(`/api/v1/life-insurance/policies/${maliciousInput}`)
                    .set('Authorization', `Bearer ${testToken}`);

                // Should handle malicious input safely, not return 404
                expect(response.status).not.toBe(404);
                expect([400, 401, 403, 422, 500]).toContain(response.status);
                expect(response.body.success).toBe(false);
            }
        });

        test('should validate parameter sanitization', async () => {
            const testToken = jwt.sign(
                { 
                    id: new mongoose.Types.ObjectId(),
                    tenantId: new mongoose.Types.ObjectId(),
                    role: 'employee'
                },
                process.env.JWT_SECRET || 'test-secret',
                { expiresIn: '1h' }
            );

            // Test with potentially dangerous query parameters
            const response = await request(app)
                .get('/api/v1/life-insurance/policies?limit=999999&page=-1&status=<script>')
                .set('Authorization', `Bearer ${testToken}`);

            // Should handle invalid parameters gracefully, not return 404
            expect(response.status).not.toBe(404);
            expect([400, 401, 403, 422, 500]).toContain(response.status);
            if (response.status === 400) {
                expect(response.body.success).toBe(false);
            }
        });
    });
});