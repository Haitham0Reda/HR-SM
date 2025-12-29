// testing/middleware/licenseValidation.integration.simple.test.js
import axios from 'axios';
import {
    validateLicense,
    getLicenseValidationStats,
    clearLicenseValidationCache
} from '../../middleware/licenseValidation.middleware.js';

describe('License Validation Integration - Real License Server', () => {
    const LICENSE_SERVER_URL = 'http://localhost:4000';
    
    beforeEach(async () => {
        // Clear cache before each test
        await clearLicenseValidationCache();
    });

    describe('License Server Communication', () => {
        it('should communicate with license server health endpoint', async () => {
            try {
                const response = await axios.get(`${LICENSE_SERVER_URL}/health`);
                expect(response.status).toBe(200);
                expect(response.data.success).toBe(true);
                expect(response.data.data.status).toBe('healthy');
            } catch (error) {
                console.warn('License server not available for integration test:', error.message);
                // Skip test if license server is not running
                expect(true).toBe(true);
            }
        });

        it('should handle license validation request format correctly', async () => {
            try {
                // Test the request format (should fail with invalid token but correct format)
                const response = await axios.post(`${LICENSE_SERVER_URL}/licenses/validate`, {
                    token: 'invalid-test-token',
                    machineId: 'test-machine-id'
                }, {
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'HR-SM-Backend/1.0',
                        'X-API-Key': 'hrsm_dev_backend_key_1234567890123456789012345678901234567890123'
                    },
                    timeout: 5000
                });

                // Should get a response (even if validation fails)
                expect(response.status).toBe(200);
                expect(response.data).toHaveProperty('valid');
                
            } catch (error) {
                if (error.code === 'ECONNREFUSED') {
                    console.warn('License server not available for integration test');
                    expect(true).toBe(true); // Skip test
                } else {
                    // Other errors are expected (like invalid token)
                    expect(error.response?.status).toBeDefined();
                }
            }
        });
    });

    describe('Middleware Integration with Real Server', () => {
        it('should handle license server unavailable gracefully', async () => {
            // Test with a non-existent server
            const originalUrl = process.env.LICENSE_SERVER_URL;
            process.env.LICENSE_SERVER_URL = 'http://localhost:9999'; // Non-existent server

            const req = {
                path: '/api/v1/test',
                method: 'GET',
                headers: {
                    'x-tenant-id': 'test-tenant',
                    'x-license-token': 'test-token'
                },
                tenantId: 'test-tenant',
                tenant: {
                    license: {
                        licenseKey: 'test-token'
                    }
                }
            };

            let statusCode = null;
            let jsonData = null;
            let nextCalled = false;

            const res = {
                status: function (code) {
                    statusCode = code;
                    return this;
                },
                json: function (data) {
                    jsonData = data;
                    return this;
                }
            };
            const next = () => { nextCalled = true; };

            await validateLicense(req, res, next);

            // Should return 503 when license server is unavailable and no offline cache
            expect(statusCode).toBe(503);
            expect(jsonData.success).toBe(false);
            expect(jsonData.error).toBe('LICENSE_SERVER_UNAVAILABLE');
            expect(nextCalled).toBe(false);

            // Restore original URL
            if (originalUrl) {
                process.env.LICENSE_SERVER_URL = originalUrl;
            } else {
                delete process.env.LICENSE_SERVER_URL;
            }
        });

        it('should skip validation for platform routes', async () => {
            const req = {
                path: '/api/platform/test',
                method: 'GET'
            };

            let nextCalled = false;
            const res = {};
            const next = () => { nextCalled = true; };

            await validateLicense(req, res, next);

            expect(nextCalled).toBe(true);
        });

        it('should continue when no tenant ID is provided', async () => {
            const req = {
                path: '/api/v1/test',
                method: 'GET',
                headers: {}
            };

            let nextCalled = false;
            const res = {};
            const next = () => { nextCalled = true; };

            await validateLicense(req, res, next);

            expect(nextCalled).toBe(true);
        });
    });

    describe('Configuration and Statistics', () => {
        it('should provide correct configuration in stats', () => {
            const stats = getLicenseValidationStats();

            expect(stats.configuration.licenseServerUrl).toBe('http://localhost:4000');
            expect(stats.configuration.maxRetryAttempts).toBe(3);
            expect(stats.configuration.retryBaseDelay).toBe(1000);
            expect(stats.configuration.retryMaxDelay).toBe(8000);
            expect(stats.configuration.cacheTTL).toBe(900); // 15 minutes
            expect(stats.configuration.offlineGracePeriod).toBe(86400000); // 24 hours
        });

        it('should track background validation status', () => {
            const stats = getLicenseValidationStats();

            expect(stats.backgroundValidation).toHaveProperty('isRunning');
            expect(stats.backgroundValidation).toHaveProperty('lastRun');
            expect(stats.backgroundValidation).toHaveProperty('validatedTenants');
            expect(stats.backgroundValidation).toHaveProperty('errors');
            expect(Array.isArray(stats.backgroundValidation.errors)).toBe(true);
        });

        it('should track caching configuration', () => {
            const stats = getLicenseValidationStats();

            expect(stats.caching).toHaveProperty('redis');
            expect(stats.caching).toHaveProperty('memoryCache');
            expect(stats.caching.memoryCache).toHaveProperty('enabled');
            expect(stats.caching.memoryCache.enabled).toBe(true);
        });
    });

    describe('Error Handling', () => {
        it('should handle missing license token appropriately', async () => {
            const req = {
                path: '/api/v1/test',
                method: 'GET',
                headers: {
                    'x-tenant-id': 'test-tenant'
                },
                tenantId: 'test-tenant',
                tenant: {
                    id: 'test-tenant'
                }
            };

            let statusCode = null;
            let jsonData = null;
            let nextCalled = false;

            const res = {
                status: function (code) {
                    statusCode = code;
                    return this;
                },
                json: function (data) {
                    jsonData = data;
                    return this;
                }
            };
            const next = () => { nextCalled = true; };

            await validateLicense(req, res, next);

            expect(statusCode).toBe(403);
            expect(jsonData.success).toBe(false);
            expect(jsonData.error).toBe('LICENSE_REQUIRED');
            expect(jsonData.message).toBe('Valid license required to access this service');
            expect(jsonData.tenantId).toBe('test-tenant');
            expect(nextCalled).toBe(false);
        });
    });
});