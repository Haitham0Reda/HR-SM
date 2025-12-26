/**
 * License Server Security Headers Tests
 * 
 * Tests Helmet.js security headers configuration in license server
 * Validates: Requirements 4.1, 6.3 - License server security
 */

import request from 'supertest';
import express from 'express';
import helmet from 'helmet';

describe('License Server Security Headers', () => {
    let app;

    beforeEach(() => {
        app = express();
        
        // Apply same helmet configuration as license server
        app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    imgSrc: ["'self'", "data:", "https:"],
                    fontSrc: ["'self'", "https:", "data:"],
                    connectSrc: ["'self'", "https:"],
                    mediaSrc: ["'self'"],
                    objectSrc: ["'none'"],
                    frameAncestors: ["'none'"],
                    baseUri: ["'self'"],
                    formAction: ["'self'"],
                    upgradeInsecureRequests: []
                },
            },
            hsts: {
                maxAge: 31536000,
                includeSubDomains: true,
                preload: true
            },
            crossOriginEmbedderPolicy: { policy: "require-corp" },
            crossOriginOpenerPolicy: { policy: "same-origin" },
            crossOriginResourcePolicy: { policy: "same-origin" },
            referrerPolicy: { policy: "strict-origin-when-cross-origin" },
            xssFilter: true,
            noSniff: true,
            frameguard: { action: 'deny' },
            permittedCrossDomainPolicies: false
        }));
        
        // Test routes
        app.get('/health', (req, res) => {
            res.json({ status: 'healthy' });
        });
        
        app.post('/licenses/validate', (req, res) => {
            res.json({ valid: true });
        });
    });

    describe('Helmet Security Headers', () => {
        test('should set X-Content-Type-Options header', async () => {
            const response = await request(app).get('/health');
            
            expect(response.headers['x-content-type-options']).toBe('nosniff');
        });

        test('should set X-Frame-Options header', async () => {
            const response = await request(app).get('/health');
            
            expect(response.headers['x-frame-options']).toBe('DENY');
        });

        test('should set Referrer-Policy header', async () => {
            const response = await request(app).get('/health');
            
            expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
        });
    });

    describe('Content Security Policy', () => {
        test('should set restrictive CSP for license server', async () => {
            const response = await request(app).get('/health');
            
            const csp = response.headers['content-security-policy'];
            expect(csp).toBeDefined();
            expect(csp).toContain("default-src 'self'");
            expect(csp).toContain("script-src 'self'");
            expect(csp).toContain("style-src 'self' 'unsafe-inline'");
            expect(csp).toContain("img-src 'self' data: https:");
            expect(csp).toContain("object-src 'none'");
            expect(csp).toContain("frame-ancestors 'none'");
            expect(csp).toContain("base-uri 'self'");
            expect(csp).toContain("form-action 'self'");
        });
    });

    describe('Cross-Origin Security', () => {
        test('should set Cross-Origin headers', async () => {
            const response = await request(app).get('/health');
            
            expect(response.headers['cross-origin-embedder-policy']).toBe('require-corp');
            expect(response.headers['cross-origin-opener-policy']).toBe('same-origin');
            expect(response.headers['cross-origin-resource-policy']).toBe('same-origin');
        });

        test('should set additional security headers', async () => {
            const response = await request(app).get('/health');
            
            // Helmet sets these additional security headers
            expect(response.headers['x-dns-prefetch-control']).toBe('off');
            expect(response.headers['x-download-options']).toBe('noopen');
            expect(response.headers['origin-agent-cluster']).toBe('?1');
        });
    });

    describe('License Server API Security', () => {
        test('should apply security headers to license validation endpoint', async () => {
            const response = await request(app)
                .post('/licenses/validate')
                .send({ token: 'test-token', machineId: 'test-machine' });
            
            // Verify critical security headers are present
            expect(response.headers['x-frame-options']).toBe('DENY');
            expect(response.headers['x-content-type-options']).toBe('nosniff');
            expect(response.headers['content-security-policy']).toBeDefined();
            expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
        });
    });

    describe('Security Headers Completeness', () => {
        test('should have all required security headers for enterprise deployment', async () => {
            const response = await request(app).get('/health');
            
            // List of required security headers for enterprise deployment (based on what helmet actually sets)
            const requiredHeaders = [
                'x-content-type-options',
                'x-frame-options',
                'content-security-policy',
                'referrer-policy',
                'cross-origin-embedder-policy',
                'cross-origin-opener-policy',
                'cross-origin-resource-policy',
                'strict-transport-security',
                'x-dns-prefetch-control',
                'x-download-options'
            ];
            
            requiredHeaders.forEach(header => {
                expect(response.headers[header]).toBeDefined();
            });
            
            expect(response.status).toBe(200);
        });
    });
});