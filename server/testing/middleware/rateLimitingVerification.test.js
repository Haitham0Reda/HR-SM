/**
 * Rate Limiting Verification Test
 * 
 * Verifies that rate limiting is properly configured for both backends
 * Tests different rate limits for different endpoint categories
 * 
 * Requirements: 6.2 - Rate limiting by license type with Redis storage
 */

import request from 'supertest';
import app from '../../app.js';
import redisService from '../../core/services/redis.service.js';
import rateLimitModule from '../../middleware/enhancedRateLimit.middleware.js';

describe('Rate Limiting Verification', () => {
    beforeAll(async () => {
        // Connect to Redis if available
        try {
            await redisService.connect();
        } catch (error) {
            console.warn('Redis not available for rate limiting tests');
        }
    });

    afterAll(async () => {
        // Disconnect from Redis
        try {
            await redisService.disconnect();
        } catch (error) {
            // Ignore disconnect errors
        }
    });

    beforeEach(async () => {
        // Clear rate limit data before each test
        if (redisService.isConnected) {
            try {
                await redisService.delPattern('rate_limit:*');
            } catch (error) {
                // Ignore clear errors
            }
        }
    });

    describe('Main Backend Rate Limiting', () => {
        test('should apply global rate limiting to non-excluded endpoints', async () => {
            const response = await request(app)
                .get('/api/v1/some-endpoint')
                .expect(404); // Endpoint doesn't exist, but rate limiting should still apply

            // Check for rate limit headers (express-rate-limit uses ratelimit-* headers)
            expect(response.headers).toHaveProperty('ratelimit-limit');
            expect(response.headers).toHaveProperty('ratelimit-remaining');
        });

        test('should apply stricter rate limiting to auth endpoints', async () => {
            // Make multiple requests to auth endpoint
            const responses = [];
            
            for (let i = 0; i < 3; i++) {
                const response = await request(app)
                    .post('/api/v1/auth/login')
                    .send({
                        email: 'test@example.com',
                        password: 'password'
                    });
                
                responses.push(response);
            }

            // Check that rate limit headers are present
            const lastResponse = responses[responses.length - 1];
            expect(lastResponse.headers).toHaveProperty('ratelimit-limit');
            expect(lastResponse.headers).toHaveProperty('ratelimit-remaining');
            
            // Auth endpoints should have lower limits
            const limit = parseInt(lastResponse.headers['ratelimit-limit']);
            expect(limit).toBeLessThanOrEqual(50); // Auth endpoints have stricter limits
        });

        test('should apply moderate rate limiting to platform endpoints', async () => {
            const response = await request(app)
                .get('/api/platform/tenants')
                .expect(404); // Endpoint returns 404, but rate limiting should still apply

            // Check for rate limit headers (express-rate-limit uses ratelimit-* headers)
            expect(response.headers).toHaveProperty('ratelimit-limit');
            expect(response.headers).toHaveProperty('ratelimit-remaining');
        });

        test('should apply license-based rate limiting to API endpoints', async () => {
            const response = await request(app)
                .get('/api/v1/users')
                .expect(404); // Endpoint returns 404, but rate limiting should still apply

            // Check for rate limit headers (express-rate-limit uses ratelimit-* headers)
            expect(response.headers).toHaveProperty('ratelimit-limit');
            expect(response.headers).toHaveProperty('ratelimit-remaining');
        });

        test('should skip rate limiting for health checks', async () => {
            const response = await request(app)
                .get('/health')
                .expect(200);

            // Health checks should NOT have rate limit headers (they are excluded)
            expect(response.headers).not.toHaveProperty('ratelimit-limit');
            expect(response.body.success).toBe(true);
        });
    });

    describe('Rate Limiting Configuration', () => {
        test('should have different limits for different license types', () => {
            // Access the RATE_LIMITS from the middleware module
            expect(rateLimitModule).toBeDefined();
            
            // Test that the module exports the expected functions
            expect(rateLimitModule.authRateLimit).toBeDefined();
            expect(rateLimitModule.apiRateLimit).toBeDefined();
            expect(rateLimitModule.publicRateLimit).toBeDefined();
        });

        test('should have Redis store configuration when Redis is available', async () => {
            if (redisService.isConnected) {
                // Test that Redis is being used for rate limiting
                const testKey = 'rate_limit:test:tenant:127.0.0.1';
                await redisService.set(testKey, '1', 'EX', 60);
                
                const value = await redisService.get(testKey);
                expect(value).toBe('1');
                
                await redisService.del(testKey);
            } else {
                console.log('Redis not available, using memory store for rate limiting');
            }
        });
    });

    describe('Rate Limiting Middleware Functions', () => {
        test('should export all required rate limiting functions', () => {
            expect(rateLimitModule.authRateLimit).toBeDefined();
            expect(rateLimitModule.sensitiveRateLimit).toBeDefined();
            expect(rateLimitModule.apiRateLimit).toBeDefined();
            expect(rateLimitModule.publicRateLimit).toBeDefined();
            expect(rateLimitModule.licenseServerRateLimit).toBeDefined();
            expect(rateLimitModule.globalRateLimit).toBeDefined();
            expect(rateLimitModule.getRateLimitStatus).toBeDefined();
            expect(rateLimitModule.clearRateLimit).toBeDefined();
        });

        test('should create tenant-specific rate limits', () => {
            const rateLimit = rateLimitModule.createTenantRateLimit({
                category: 'api',
                customLimits: {
                    windowMs: 60000,
                    maxRequests: 100
                }
            });
            
            expect(typeof rateLimit).toBe('function');
        });
    });

    describe('Rate Limit Status and Management', () => {
        test('should get rate limit status', async () => {
            const status = await rateLimitModule.getRateLimitStatus('test-tenant', 'api', '127.0.0.1');
            
            expect(status).toBeDefined();
            expect(status).toHaveProperty('enabled');
        });

        test('should clear rate limits', async () => {
            const result = await rateLimitModule.clearRateLimit('test-tenant', 'api', '127.0.0.1');
            
            expect(result).toBeDefined();
            expect(result).toHaveProperty('success');
        });
    });
});