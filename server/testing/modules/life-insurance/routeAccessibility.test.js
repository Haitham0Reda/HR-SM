/**
 * Route Accessibility Test for Life Insurance Module
 * 
 * This test verifies that the life insurance module routes are properly mounted
 * and accessible through the application.
 */

import request from 'supertest';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

describe('Life Insurance Module - Route Accessibility', () => {
    let app;

    beforeAll(async () => {
        // Import app after database connection is established
        const appModule = await import('../../../app.js');
        app = appModule.default;
    });

    describe('Basic Route Mounting', () => {
        test('should have life insurance routes mounted at /api/v1/life-insurance', async () => {
            const response = await request(app)
                .get('/api/v1/life-insurance/');

            // Should not return 404 (route not found)
            // Should return 401 (authentication required) or other auth-related status
            expect(response.status).not.toBe(404);
            expect([401, 403, 500]).toContain(response.status);
        });

        test('should return proper error structure for unauthenticated requests', async () => {
            const response = await request(app)
                .get('/api/v1/life-insurance/');

            expect(response.body).toHaveProperty('success');
            expect(response.body.success).toBe(false);
            expect(response.body).toHaveProperty('message');
            expect(typeof response.body.message).toBe('string');
        });

        test('should handle invalid JWT tokens properly', async () => {
            const response = await request(app)
                .get('/api/v1/life-insurance/')
                .set('Authorization', 'Bearer invalid-token');

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });

        test('should process valid JWT structure but fail at middleware level', async () => {
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

            // Should pass authentication but fail at license/tenant validation
            expect([403, 500]).toContain(response.status);
            expect(response.body.success).toBe(false);
        });
    });

    describe('Endpoint Availability', () => {
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
            { method: 'get', path: '/api/v1/life-insurance/' },
            { method: 'get', path: '/api/v1/life-insurance/policies' },
            { method: 'get', path: '/api/v1/life-insurance/claims' },
            { method: 'get', path: '/api/v1/life-insurance/family-members' },
            { method: 'get', path: '/api/v1/life-insurance/config' }
        ];

        test.each(endpoints)('should have $method $path endpoint available', async ({ method, path }) => {
            const response = await request(app)[method](path)
                .set('Authorization', `Bearer ${testToken}`);

            // Should not return 404 (route not found)
            expect(response.status).not.toBe(404);
            
            // Should return structured response
            expect(response.body).toHaveProperty('success');
            expect(typeof response.body.success).toBe('boolean');
        });
    });

    describe('Route Structure Validation', () => {
        test('should return consistent error format across all endpoints', async () => {
            const endpoints = [
                '/api/v1/life-insurance/',
                '/api/v1/life-insurance/policies',
                '/api/v1/life-insurance/claims'
            ];

            for (const endpoint of endpoints) {
                const response = await request(app).get(endpoint);
                
                expect(response.body).toHaveProperty('success');
                expect(response.body).toHaveProperty('message');
                expect(typeof response.body.success).toBe('boolean');
                expect(typeof response.body.message).toBe('string');
            }
        });
    });
});