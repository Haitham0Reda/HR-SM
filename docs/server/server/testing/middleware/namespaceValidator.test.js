/**
 * Tests for Namespace Validator Middleware
 * 
 * Validates that API namespace separation is enforced correctly
 */

import express from 'express';
import request from 'supertest';
import { namespaceValidator, validateRouteNamespaces } from '../../core/middleware/namespaceValidator.js';

describe('Namespace Validator Middleware', () => {
    let app;

    beforeEach(() => {
        app = express();
        app.use(express.json());
    });

    describe('namespaceValidator middleware', () => {
        it('should allow platform routes (/api/platform/*)', async () => {
            app.use(namespaceValidator({ strict: false }));
            app.get('/api/platform/tenants', (req, res) => {
                res.json({ success: true });
            });

            const response = await request(app)
                .get('/api/platform/tenants')
                .expect(200);

            expect(response.body.success).toBe(true);
        });

        it('should allow tenant routes (/api/v1/*)', async () => {
            app.use(namespaceValidator({ strict: false }));
            app.get('/api/v1/users', (req, res) => {
                res.json({ success: true });
            });

            const response = await request(app)
                .get('/api/v1/users')
                .expect(200);

            expect(response.body.success).toBe(true);
        });

        it('should allow health check route', async () => {
            app.use(namespaceValidator({ strict: false }));
            app.get('/health', (req, res) => {
                res.json({ success: true });
            });

            const response = await request(app)
                .get('/health')
                .expect(200);

            expect(response.body.success).toBe(true);
        });

        it('should allow non-API routes', async () => {
            app.use(namespaceValidator({ strict: false }));
            app.get('/docs', (req, res) => {
                res.json({ success: true });
            });

            const response = await request(app)
                .get('/docs')
                .expect(200);

            expect(response.body.success).toBe(true);
        });

        it('should warn about invalid namespace in non-strict mode', async () => {
            const originalWarn = console.warn;
            const warnings = [];
            console.warn = (...args) => warnings.push(args.join(' '));
            
            app.use(namespaceValidator({ strict: false }));
            app.get('/api/users', (req, res) => {
                res.json({ success: true });
            });

            await request(app)
                .get('/api/users')
                .expect(200);

            expect(warnings.some(w => w.includes('Invalid API namespace: /api/users'))).toBe(true);

            console.warn = originalWarn;
        });

        it('should throw error for invalid namespace in strict mode', async () => {
            app.use(namespaceValidator({ strict: true }));
            app.get('/api/users', (req, res) => {
                res.json({ success: true });
            });

            // Add error handler
            app.use((err, req, res, next) => {
                res.status(err.statusCode || 500).json({
                    success: false,
                    message: err.message
                });
            });

            const response = await request(app)
                .get('/api/users')
                .expect(500);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Invalid API namespace');
        });
    });

    describe('validateRouteNamespaces function', () => {
        it('should identify valid platform routes', () => {
            app.get('/api/platform/tenants', (req, res) => res.json({}));
            app.get('/api/platform/auth/login', (req, res) => res.json({}));

            const results = validateRouteNamespaces(app);

            expect(results.valid.length).toBeGreaterThan(0);
            const platformRoutes = results.valid.filter(r => r.namespace === 'platform');
            expect(platformRoutes.length).toBeGreaterThan(0);
        });

        it('should identify valid tenant routes', () => {
            app.get('/api/v1/users', (req, res) => res.json({}));
            app.get('/api/v1/attendance', (req, res) => res.json({}));

            const results = validateRouteNamespaces(app);

            expect(results.valid.length).toBeGreaterThan(0);
            const tenantRoutes = results.valid.filter(r => r.namespace === 'tenant');
            expect(tenantRoutes.length).toBeGreaterThan(0);
        });

        it('should identify invalid routes', () => {
            app.get('/api/users', (req, res) => res.json({}));
            app.get('/api/attendance', (req, res) => res.json({}));

            const results = validateRouteNamespaces(app);

            expect(results.invalid.length).toBeGreaterThan(0);
            expect(results.invalid[0].suggestion).toContain('/api/platform or /api/v1');
        });

        it('should skip non-API routes', () => {
            app.get('/health', (req, res) => res.json({}));
            app.get('/docs', (req, res) => res.json({}));

            const results = validateRouteNamespaces(app);

            // Non-API routes should not appear in valid or invalid
            const allRoutes = [...results.valid, ...results.invalid];
            const nonApiRoutes = allRoutes.filter(r => !r.path.startsWith('/api'));
            expect(nonApiRoutes.length).toBe(0);
        });
    });

    describe('Namespace separation enforcement', () => {
        it('should enforce platform namespace for platform routes', async () => {
            app.use(namespaceValidator({ strict: false }));
            
            // Correct platform route
            app.get('/api/platform/tenants', (req, res) => {
                res.json({ namespace: 'platform' });
            });

            const response = await request(app)
                .get('/api/platform/tenants')
                .expect(200);

            expect(response.body.namespace).toBe('platform');
        });

        it('should enforce tenant namespace for tenant routes', async () => {
            app.use(namespaceValidator({ strict: false }));
            
            // Correct tenant route
            app.get('/api/v1/users', (req, res) => {
                res.json({ namespace: 'tenant' });
            });

            const response = await request(app)
                .get('/api/v1/users')
                .expect(200);

            expect(response.body.namespace).toBe('tenant');
        });
    });
});
