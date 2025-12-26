/**
 * Security Headers Middleware Tests
 * 
 * Tests comprehensive security headers implementation
 * Validates: Requirements 6.3 - Enhanced security features
 */

import request from 'supertest';
import express from 'express';
import { addSecurityHeaders } from '../../middleware/globalValidation.middleware.js';

describe('Security Headers Middleware', () => {
    let app;

    beforeEach(() => {
        app = express();
        app.use(express.json());
        app.use(addSecurityHeaders);
        
        // Test routes
        app.get('/api/test', (req, res) => {
            res.json({ message: 'API endpoint' });
        });
        
        app.get('/public/test', (req, res) => {
            res.json({ message: 'Public endpoint' });
        });
    });

    describe('Basic Security Headers', () => {
        test('should set X-XSS-Protection header', async () => {
            const response = await request(app).get('/api/test');
            
            expect(response.headers['x-xss-protection']).toBe('1; mode=block');
        });

        test('should set X-Content-Type-Options header', async () => {
            const response = await request(app).get('/api/test');
            
            expect(response.headers['x-content-type-options']).toBe('nosniff');
        });

        test('should set X-Frame-Options header', async () => {
            const response = await request(app).get('/api/test');
            
            expect(response.headers['x-frame-options']).toBe('DENY');
        });

        test('should set Referrer-Policy header', async () => {
            const response = await request(app).get('/api/test');
            
            expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
        });
        
        test('debug - check if middleware is working at all', async () => {
            const response = await request(app).get('/api/test');
            
            // Just check if any of our headers are present
            expect(response.headers['x-content-type-options']).toBeDefined();
        });
    });

    describe('Content Security Policy', () => {
        test('should set comprehensive CSP header', async () => {
            const response = await request(app).get('/api/test');
            
            const csp = response.headers['content-security-policy'];
            expect(csp).toBeDefined();
            expect(csp).toContain("default-src 'self'");
            expect(csp).toContain("script-src 'self' 'unsafe-inline' 'unsafe-eval'");
            expect(csp).toContain("style-src 'self' 'unsafe-inline'");
            expect(csp).toContain("img-src 'self' data: https: blob:");
            expect(csp).toContain("font-src 'self' https: data:");
            expect(csp).toContain("connect-src 'self' wss: https:");
            expect(csp).toContain("object-src 'none'");
            expect(csp).toContain("frame-ancestors 'none'");
            expect(csp).toContain("base-uri 'self'");
            expect(csp).toContain("form-action 'self'");
            expect(csp).toContain("upgrade-insecure-requests");
        });
    });

    describe('HTTPS Security Headers', () => {
        test('should set HSTS header for X-Forwarded-Proto HTTPS', async () => {
            const response = await request(app)
                .get('/api/test')
                .set('X-Forwarded-Proto', 'https');
            
            expect(response.headers['strict-transport-security']).toBe('max-age=31536000; includeSubDomains; preload');
        });

        test('should not set HSTS header for HTTP requests', async () => {
            const response = await request(app).get('/api/test');
            
            expect(response.headers['strict-transport-security']).toBeUndefined();
        });
    });

    describe('Enhanced Security Headers', () => {
        test('should set Cross-Origin headers', async () => {
            const response = await request(app).get('/api/test');
            
            expect(response.headers['x-permitted-cross-domain-policies']).toBe('none');
            expect(response.headers['cross-origin-embedder-policy']).toBe('require-corp');
            expect(response.headers['cross-origin-opener-policy']).toBe('same-origin');
            expect(response.headers['cross-origin-resource-policy']).toBe('same-origin');
        });
    });

    describe('Cache Control for API Endpoints', () => {
        test('should set no-cache headers for API endpoints', async () => {
            const response = await request(app).get('/api/test');
            
            expect(response.headers['cache-control']).toBe('no-store, no-cache, must-revalidate, proxy-revalidate');
            expect(response.headers['pragma']).toBe('no-cache');
            expect(response.headers['expires']).toBe('0');
        });

        test('should not set no-cache headers for non-API endpoints', async () => {
            const response = await request(app).get('/public/test');
            
            expect(response.headers['cache-control']).not.toBe('no-store, no-cache, must-revalidate, proxy-revalidate');
            expect(response.headers['pragma']).not.toBe('no-cache');
            expect(response.headers['expires']).not.toBe('0');
        });
    });

    describe('Security Headers Integration', () => {
        test('should apply all security headers together', async () => {
            const response = await request(app)
                .get('/api/test')
                .set('X-Forwarded-Proto', 'https');
            
            // Verify all critical security headers are present
            const securityHeaders = [
                'x-xss-protection',
                'x-content-type-options',
                'x-frame-options',
                'content-security-policy',
                'referrer-policy',
                'strict-transport-security',
                'x-permitted-cross-domain-policies',
                'cross-origin-embedder-policy',
                'cross-origin-opener-policy',
                'cross-origin-resource-policy'
            ];
            
            securityHeaders.forEach(header => {
                expect(response.headers[header]).toBeDefined();
            });
            
            expect(response.status).toBe(200);
        });
    });
});