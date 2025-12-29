// testing/middleware/licenseValidation.integration.test.js
import request from 'supertest';
import express from 'express';
import {
    validateLicense,
    requireFeature,
    getLicenseValidationStats,
    clearLicenseValidationCache,
    triggerBackgroundValidation
} from '../../middleware/licenseValidation.middleware.js';

// Simple mock for axios
const mockAxios = {
    post: jest.fn()
};

// Simple mock for Redis service
const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    delPattern: jest.fn(),
    getStats: jest.fn(() => ({
        enabled: true,
        connected: true,
        url: 'redis://localhost:6379'
    }))
};

// Mock the modules at the top level
jest.doMock('axios', () => mockAxios);
jest.doMock('../../core/services/redis.service.js', () => ({ default: mockRedisService }));

describe('Enhanced License Validation Middleware Integration Tests', () => {
    let app;
    let mockLicenseServerResponse;

    beforeEach(() => {
        // Create Express app for testing
        app = express();
        app.use(express.json());

        // Clear all mocks
        jest.clearAllMocks();
        clearLicenseValidationCache();

        // Default successful license server response
        mockLicenseServerResponse = {
            data: {
                valid: true,
                features: ['attendance', 'payroll', 'reports'],
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                licenseType: 'business',
                maxUsers: 500,
                maxStorage: 10737418240,
                maxAPI: 100000
            }
        };

        // Mock successful axios response by default
        mockAxios.post.mockResolvedValue(mockLicenseServerResponse);

        // Mock Redis as available by default
        mockRedisService.get.mockResolvedValue(null);
        mockRedisService.set.mockResolvedValue(true);
    });

    describe('License Validation Flow', () => {
        it('should validate license successfully with valid token', async () => {
            // Setup test route
            app.use('/api/v1/test', validateLicense, (req, res) => {
                res.json({
                    success: true,
                    licenseInfo: req.licenseInfo
                });
            });

            const response = await request(app)
                .get('/api/v1/test')
                .set('x-tenant-id', 'tenant123')
                .set('x-license-token', 'valid-jwt-token')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.licenseInfo).toBeDefined();
            expect(response.body.licenseInfo.valid).toBe(true);
            expect(response.body.licenseInfo.features).toEqual(['attendance', 'payroll', 'reports']);

            // Verify license server was called
            expect(mockAxios.post).toHaveBeenCalledWith(
                'http://localhost:4000/licenses/validate',
                expect.objectContaining({
                    token: 'valid-jwt-token',
                    machineId: expect.any(String)
                }),
                expect.objectContaining({
                    timeout: 5000,
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                        'User-Agent': 'HR-SM-Backend/1.0'
                    })
                })
            );
        });

        it('should skip validation for platform routes', async () => {
            // Setup platform route
            app.use('/api/platform/test', validateLicense, (req, res) => {
                res.json({ success: true, skipped: true });
            });

            const response = await request(app)
                .get('/api/platform/test')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.skipped).toBe(true);

            // Verify license server was NOT called
            expect(mockedAxios.post).not.toHaveBeenCalled();
        });

        it('should return 403 when no license token provided', async () => {
            app.use('/api/v1/test', validateLicense, (req, res) => {
                res.json({ success: true });
            });

            const response = await request(app)
                .get('/api/v1/test')
                .set('x-tenant-id', 'tenant123')
                .expect(403);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('LICENSE_REQUIRED');
            expect(response.body.message).toBe('Valid license required to access this service');
            expect(response.body.tenantId).toBe('tenant123');
        });

        it('should return 403 when license validation fails', async () => {
            // Mock license server returning invalid license
            mockedAxios.post.mockResolvedValue({
                data: {
                    valid: false,
                    error: 'LICENSE_EXPIRED',
                    reason: 'License has expired'
                }
            });

            app.use('/api/v1/test', validateLicense, (req, res) => {
                res.json({ success: true });
            });

            const response = await request(app)
                .get('/api/v1/test')
                .set('x-tenant-id', 'tenant123')
                .set('x-license-token', 'expired-jwt-token')
                .expect(403);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('LICENSE_EXPIRED');
            expect(response.body.message).toBe('License has expired');
            expect(response.body.tenantId).toBe('tenant123');
        });
    });

    describe('Retry Logic with Exponential Backoff', () => {
        it('should retry on network errors with exponential backoff', async () => {
            // Mock network error on first two calls, success on third
            mockedAxios.post
                .mockRejectedValueOnce(new Error('ECONNREFUSED'))
                .mockRejectedValueOnce(new Error('ETIMEDOUT'))
                .mockResolvedValueOnce(mockLicenseServerResponse);

            app.use('/api/v1/test', validateLicense, (req, res) => {
                res.json({
                    success: true,
                    licenseInfo: req.licenseInfo
                });
            });

            const startTime = Date.now();
            const response = await request(app)
                .get('/api/v1/test')
                .set('x-tenant-id', 'tenant123')
                .set('x-license-token', 'valid-jwt-token')
                .expect(200);

            const endTime = Date.now();
            const duration = endTime - startTime;

            expect(response.body.success).toBe(true);
            expect(response.body.licenseInfo.valid).toBe(true);

            // Verify retry attempts (3 calls total)
            expect(mockedAxios.post).toHaveBeenCalledTimes(3);

            // Verify exponential backoff delay (should be at least 1s + 2s = 3s)
            expect(duration).toBeGreaterThan(3000);
        });

        it('should return 503 when all retry attempts fail', async () => {
            // Mock all attempts failing
            mockedAxios.post.mockRejectedValue(new Error('ECONNREFUSED'));

            app.use('/api/v1/test', validateLicense, (req, res) => {
                res.json({ success: true });
            });

            const response = await request(app)
                .get('/api/v1/test')
                .set('x-tenant-id', 'tenant123')
                .set('x-license-token', 'valid-jwt-token')
                .expect(503);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('LICENSE_SERVER_UNAVAILABLE');
            expect(response.body.message).toBe('License validation service is temporarily unavailable');

            // Verify all retry attempts were made
            expect(mockedAxios.post).toHaveBeenCalledTimes(3);
        });

        it('should not retry on 4xx client errors', async () => {
            // Mock 400 Bad Request error
            const error = new Error('Bad Request');
            error.response = { status: 400 };
            mockedAxios.post.mockRejectedValue(error);

            app.use('/api/v1/test', validateLicense, (req, res) => {
                res.json({ success: true });
            });

            await request(app)
                .get('/api/v1/test')
                .set('x-tenant-id', 'tenant123')
                .set('x-license-token', 'invalid-token')
                .expect(503);

            // Verify only one attempt was made (no retries for 4xx errors)
            expect(mockedAxios.post).toHaveBeenCalledTimes(1);
        });
    });

    describe('Redis Caching Integration', () => {
        it('should use cached validation result when available', async () => {
            // Mock Redis returning cached result
            const cachedResult = {
                success: true,
                data: mockLicenseServerResponse.data,
                timestamp: Date.now()
            };
            redisService.get.mockResolvedValue(cachedResult);

            app.use('/api/v1/test', validateLicense, (req, res) => {
                res.json({
                    success: true,
                    licenseInfo: req.licenseInfo
                });
            });

            const response = await request(app)
                .get('/api/v1/test')
                .set('x-tenant-id', 'tenant123')
                .set('x-license-token', 'valid-jwt-token')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.licenseInfo.valid).toBe(true);
            expect(response.body.licenseInfo.cached).toBe(true);

            // Verify license server was NOT called (used cache)
            expect(mockedAxios.post).not.toHaveBeenCalled();

            // Verify Redis was queried
            expect(redisService.get).toHaveBeenCalled();
        });

        it('should cache validation result after successful validation', async () => {
            app.use('/api/v1/test', validateLicense, (req, res) => {
                res.json({
                    success: true,
                    licenseInfo: req.licenseInfo
                });
            });

            await request(app)
                .get('/api/v1/test')
                .set('x-tenant-id', 'tenant123')
                .set('x-license-token', 'valid-jwt-token')
                .expect(200);

            // Verify result was cached in Redis
            expect(redisService.set).toHaveBeenCalledWith(
                expect.stringContaining('license:validation:tenant123:'),
                expect.objectContaining({
                    success: true,
                    data: mockLicenseServerResponse.data
                }),
                900 // 15 minutes TTL
            );
        });

        it('should fallback to memory cache when Redis fails', async () => {
            // Mock Redis failure
            redisService.get.mockRejectedValue(new Error('Redis connection failed'));
            redisService.set.mockRejectedValue(new Error('Redis connection failed'));

            app.use('/api/v1/test', validateLicense, (req, res) => {
                res.json({
                    success: true,
                    licenseInfo: req.licenseInfo
                });
            });

            const response = await request(app)
                .get('/api/v1/test')
                .set('x-tenant-id', 'tenant123')
                .set('x-license-token', 'valid-jwt-token')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.licenseInfo.valid).toBe(true);

            // Verify license server was called (no cache available)
            expect(mockedAxios.post).toHaveBeenCalled();
        });
    });

    describe('Offline Operation and Graceful Degradation', () => {
        it('should allow offline operation when license server is unavailable but cached validation exists', async () => {
            // Mock cached offline validation
            const offlineCachedResult = {
                success: true,
                data: mockLicenseServerResponse.data,
                timestamp: Date.now() - (30 * 60 * 1000) // 30 minutes ago
            };

            redisService.get
                .mockResolvedValueOnce(null) // No regular cache
                .mockResolvedValueOnce(offlineCachedResult); // Offline cache available

            // Mock license server failure
            mockedAxios.post.mockRejectedValue(new Error('ECONNREFUSED'));

            app.use('/api/v1/test', validateLicense, (req, res) => {
                res.json({ success: true, offline: true });
            });

            const response = await request(app)
                .get('/api/v1/test')
                .set('x-tenant-id', 'tenant123')
                .set('x-license-token', 'valid-jwt-token')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.offline).toBe(true);
        });

        it('should reject requests when no offline cache available and license server fails', async () => {
            // Mock no cached results
            redisService.get.mockResolvedValue(null);

            // Mock license server failure
            mockedAxios.post.mockRejectedValue(new Error('ECONNREFUSED'));

            app.use('/api/v1/test', validateLicense, (req, res) => {
                res.json({ success: true });
            });

            const response = await request(app)
                .get('/api/v1/test')
                .set('x-tenant-id', 'tenant123')
                .set('x-license-token', 'valid-jwt-token')
                .expect(503);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('LICENSE_SERVER_UNAVAILABLE');
        });
    });

    describe('Feature-based Access Control', () => {
        it('should allow access when feature is licensed', async () => {
            app.use('/api/v1/test', validateLicense, requireFeature('attendance'), (req, res) => {
                res.json({ success: true, feature: 'attendance' });
            });

            const response = await request(app)
                .get('/api/v1/test')
                .set('x-tenant-id', 'tenant123')
                .set('x-license-token', 'valid-jwt-token')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.feature).toBe('attendance');
        });

        it('should deny access when feature is not licensed', async () => {
            app.use('/api/v1/test', validateLicense, requireFeature('advanced-analytics'), (req, res) => {
                res.json({ success: true });
            });

            const response = await request(app)
                .get('/api/v1/test')
                .set('x-tenant-id', 'tenant123')
                .set('x-license-token', 'valid-jwt-token')
                .expect(403);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('FEATURE_NOT_LICENSED');
            expect(response.body.message).toContain('advanced-analytics');
            expect(response.body.feature).toBe('advanced-analytics');
            expect(response.body.licensedFeatures).toEqual(['attendance', 'payroll', 'reports']);
        });

        it('should deny access when no license info available', async () => {
            // Skip license validation middleware
            app.use('/api/v1/test', requireFeature('attendance'), (req, res) => {
                res.json({ success: true });
            });

            const response = await request(app)
                .get('/api/v1/test')
                .expect(403);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('LICENSE_REQUIRED');
            expect(response.body.message).toBe('Valid license required for this feature');
            expect(response.body.feature).toBe('attendance');
        });
    });

    describe('API Key Authentication', () => {
        it('should include API key in license server requests when configured', async () => {
            // Mock environment variable
            const originalApiKey = process.env.LICENSE_SERVER_API_KEY;
            process.env.LICENSE_SERVER_API_KEY = 'test-api-key-123';

            app.use('/api/v1/test', validateLicense, (req, res) => {
                res.json({ success: true });
            });

            await request(app)
                .get('/api/v1/test')
                .set('x-tenant-id', 'tenant123')
                .set('x-license-token', 'valid-jwt-token')
                .expect(200);

            // Verify API key was included in headers
            expect(mockedAxios.post).toHaveBeenCalledWith(
                expect.any(String),
                expect.any(Object),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'X-API-Key': 'test-api-key-123'
                    })
                })
            );

            // Restore original environment
            if (originalApiKey) {
                process.env.LICENSE_SERVER_API_KEY = originalApiKey;
            } else {
                delete process.env.LICENSE_SERVER_API_KEY;
            }
        });
    });

    describe('Statistics and Monitoring', () => {
        it('should provide comprehensive validation statistics', () => {
            const stats = getLicenseValidationStats();

            expect(stats).toHaveProperty('caching');
            expect(stats.caching).toHaveProperty('redis');
            expect(stats.caching).toHaveProperty('memoryCache');

            expect(stats).toHaveProperty('backgroundValidation');
            expect(stats.backgroundValidation).toHaveProperty('isRunning');
            expect(stats.backgroundValidation).toHaveProperty('lastRun');
            expect(stats.backgroundValidation).toHaveProperty('validatedTenants');

            expect(stats).toHaveProperty('configuration');
            expect(stats.configuration).toHaveProperty('licenseServerUrl');
            expect(stats.configuration).toHaveProperty('cacheTTL');
            expect(stats.configuration).toHaveProperty('offlineGracePeriod');
            expect(stats.configuration).toHaveProperty('maxRetryAttempts');
        });

        it('should clear validation cache', async () => {
            await clearLicenseValidationCache();

            // Verify Redis pattern deletion was called
            expect(redisService.delPattern).toHaveBeenCalledWith('license:*');
        });
    });

    describe('Background Validation Service', () => {
        it('should trigger background validation manually', async () => {
            const result = await triggerBackgroundValidation();

            expect(result).toHaveProperty('isRunning');
            expect(result).toHaveProperty('lastRun');
            expect(result).toHaveProperty('validatedTenants');
            expect(result).toHaveProperty('errors');
        });
    });

    describe('Error Handling and Edge Cases', () => {
        it('should handle malformed license server responses gracefully', async () => {
            // Mock malformed response
            mockedAxios.post.mockResolvedValue({
                data: null // Invalid response structure
            });

            app.use('/api/v1/test', validateLicense, (req, res) => {
                res.json({ success: true });
            });

            const response = await request(app)
                .get('/api/v1/test')
                .set('x-tenant-id', 'tenant123')
                .set('x-license-token', 'valid-jwt-token')
                .expect(403);

            expect(response.body.success).toBe(false);
            // Should handle gracefully without crashing
        });

        it('should handle missing tenant ID gracefully', async () => {
            app.use('/api/v1/test', validateLicense, (req, res) => {
                res.json({ success: true });
            });

            const response = await request(app)
                .get('/api/v1/test')
                .set('x-license-token', 'valid-jwt-token')
                .expect(200); // Should continue without tenant ID

            expect(response.body.success).toBe(true);

            // Verify license server was NOT called
            expect(mockedAxios.post).not.toHaveBeenCalled();
        });

        it('should handle unexpected middleware errors gracefully', async () => {
            // Mock Redis throwing unexpected error
            redisService.get.mockRejectedValue(new Error('Unexpected Redis error'));

            // Mock license server also failing
            mockedAxios.post.mockRejectedValue(new Error('License server error'));

            app.use('/api/v1/test', validateLicense, (req, res) => {
                res.json({ success: true });
            });

            const response = await request(app)
                .get('/api/v1/test')
                .set('x-tenant-id', 'tenant123')
                .set('x-license-token', 'valid-jwt-token')
                .expect(500);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('LICENSE_VALIDATION_ERROR');
            expect(response.body.message).toBe('An error occurred during license validation');
        });
    });

    describe('Performance and Load Testing', () => {
        it('should handle concurrent license validation requests efficiently', async () => {
            app.use('/api/v1/test', validateLicense, (req, res) => {
                res.json({
                    success: true,
                    licenseInfo: req.licenseInfo
                });
            });

            // Create 10 concurrent requests
            const requests = Array.from({ length: 10 }, (_, i) =>
                request(app)
                    .get('/api/v1/test')
                    .set('x-tenant-id', `tenant${i}`)
                    .set('x-license-token', `token${i}`)
            );

            const responses = await Promise.all(requests);

            // All requests should succeed
            responses.forEach(response => {
                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
            });

            // Verify license server was called for each unique request
            expect(mockedAxios.post).toHaveBeenCalledTimes(10);
        });

        it('should efficiently use cache for repeated requests', async () => {
            // Mock Redis returning cached result after first request
            redisService.get
                .mockResolvedValueOnce(null) // First request - no cache
                .mockResolvedValue({ // Subsequent requests - cached
                    success: true,
                    data: mockLicenseServerResponse.data,
                    timestamp: Date.now()
                });

            app.use('/api/v1/test', validateLicense, (req, res) => {
                res.json({
                    success: true,
                    cached: req.licenseInfo?.cached
                });
            });

            // Make first request
            const response1 = await request(app)
                .get('/api/v1/test')
                .set('x-tenant-id', 'tenant123')
                .set('x-license-token', 'valid-jwt-token')
                .expect(200);

            // Make second request (should use cache)
            const response2 = await request(app)
                .get('/api/v1/test')
                .set('x-tenant-id', 'tenant123')
                .set('x-license-token', 'valid-jwt-token')
                .expect(200);

            expect(response1.body.success).toBe(true);
            expect(response1.body.cached).toBe(false);

            expect(response2.body.success).toBe(true);
            expect(response2.body.cached).toBe(true);

            // Verify license server was only called once
            expect(mockedAxios.post).toHaveBeenCalledTimes(1);
        });
    });
});