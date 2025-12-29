// testing/middleware/licenseValidation.simple.test.js
import {
    validateLicense,
    requireFeature,
    getLicenseValidationStats,
    clearLicenseValidationCache,
    triggerBackgroundValidation
} from '../../middleware/licenseValidation.middleware.js';

describe('Enhanced License Validation Middleware - Simple Tests', () => {
    beforeEach(() => {
        // Clear cache before each test
        clearLicenseValidationCache();
    });

    describe('Middleware Functions', () => {
        it('should export validateLicense function', () => {
            expect(typeof validateLicense).toBe('function');
        });

        it('should export requireFeature function', () => {
            expect(typeof requireFeature).toBe('function');
        });

        it('should export getLicenseValidationStats function', () => {
            expect(typeof getLicenseValidationStats).toBe('function');
        });

        it('should export clearLicenseValidationCache function', () => {
            expect(typeof clearLicenseValidationCache).toBe('function');
        });

        it('should export triggerBackgroundValidation function', () => {
            expect(typeof triggerBackgroundValidation).toBe('function');
        });
    });

    describe('Statistics Function', () => {
        it('should return comprehensive validation statistics', () => {
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
            expect(stats.configuration).toHaveProperty('retryBaseDelay');
            expect(stats.configuration).toHaveProperty('retryMaxDelay');
        });

        it('should have correct configuration values', () => {
            const stats = getLicenseValidationStats();

            expect(stats.configuration.licenseServerUrl).toBe('http://localhost:4000');
            expect(stats.configuration.cacheTTL).toBe(900); // 15 minutes
            expect(stats.configuration.offlineGracePeriod).toBe(86400000); // 24 hours
            expect(stats.configuration.maxRetryAttempts).toBe(3);
            expect(stats.configuration.retryBaseDelay).toBe(1000); // 1 second
            expect(stats.configuration.retryMaxDelay).toBe(8000); // 8 seconds
        });
    });

    describe('Cache Management', () => {
        it('should clear validation cache without errors', async () => {
            await expect(clearLicenseValidationCache()).resolves.not.toThrow();
        });
    });

    describe('Background Validation', () => {
        it('should trigger background validation and return status', async () => {
            const result = await triggerBackgroundValidation();

            expect(result).toHaveProperty('isRunning');
            expect(result).toHaveProperty('lastRun');
            expect(result).toHaveProperty('validatedTenants');
            expect(result).toHaveProperty('errors');
            expect(Array.isArray(result.errors)).toBe(true);
            expect(typeof result.validatedTenants).toBe('number');
        });
    });

    describe('Feature Middleware Factory', () => {
        it('should create feature middleware function', () => {
            const middleware = requireFeature('test-feature');
            expect(typeof middleware).toBe('function');
        });

        it('should return 403 when no license info available', () => {
            const middleware = requireFeature('test-feature');
            const req = {};
            let statusCode = null;
            let jsonData = null;

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

            let nextCalled = false;
            const next = () => { nextCalled = true; };

            middleware(req, res, next);

            expect(nextCalled).toBe(false);
            expect(statusCode).toBe(403);
            expect(jsonData.success).toBe(false);
            expect(jsonData.error).toBe('LICENSE_REQUIRED');
            expect(jsonData.message).toBe('Valid license required for this feature');
            expect(jsonData.feature).toBe('test-feature');
        });

        it('should return 403 when feature is not licensed', () => {
            const middleware = requireFeature('unlicensed-feature');
            const req = {
                licenseInfo: {
                    valid: true,
                    features: ['feature1', 'feature2']
                }
            };
            let statusCode = null;
            let jsonData = null;

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

            let nextCalled = false;
            const next = () => { nextCalled = true; };

            middleware(req, res, next);

            expect(nextCalled).toBe(false);
            expect(statusCode).toBe(403);
            expect(jsonData.success).toBe(false);
            expect(jsonData.error).toBe('FEATURE_NOT_LICENSED');
            expect(jsonData.message).toContain('unlicensed-feature');
            expect(jsonData.feature).toBe('unlicensed-feature');
            expect(jsonData.licensedFeatures).toEqual(['feature1', 'feature2']);
        });

        it('should call next when feature is licensed', () => {
            const middleware = requireFeature('licensed-feature');
            const req = {
                licenseInfo: {
                    valid: true,
                    features: ['licensed-feature', 'other-feature']
                }
            };

            let nextCalled = false;
            const res = {};
            const next = () => { nextCalled = true; };

            middleware(req, res, next);

            expect(nextCalled).toBe(true);
        });
    });

    describe('Validation Middleware - Platform Routes', () => {
        it('should skip validation for platform routes', () => {
            const req = {
                path: '/api/platform/test'
            };

            let nextCalled = false;
            const res = {};
            const next = () => { nextCalled = true; };

            // This should call next immediately for platform routes
            validateLicense(req, res, next);

            expect(nextCalled).toBe(true);
        });
    });

    describe('Validation Middleware - Missing Tenant', () => {
        it('should continue when no tenant ID is found', () => {
            const req = {
                path: '/api/v1/test',
                method: 'GET',
                headers: {}
            };

            let nextCalled = false;
            let statusCode = null;
            let jsonData = null;

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

            validateLicense(req, res, next);

            // Should continue without tenant ID (as per middleware logic)
            expect(nextCalled).toBe(true);
        });
    });

    describe('Error Response Formats', () => {
        it('should have consistent error structure for feature not licensed', () => {
            const middleware = requireFeature('test-feature');
            const req = {
                licenseInfo: {
                    valid: true,
                    features: ['other-feature']
                }
            };
            let jsonData = null;

            const res = {
                status: () => res,
                json: (data) => { jsonData = data; return res; }
            };

            middleware(req, res, () => {});

            // Verify required fields
            expect(jsonData).toHaveProperty('success');
            expect(jsonData).toHaveProperty('error');
            expect(jsonData).toHaveProperty('message');
            expect(jsonData).toHaveProperty('feature');
            expect(jsonData).toHaveProperty('licensedFeatures');

            // Verify field types
            expect(typeof jsonData.success).toBe('boolean');
            expect(typeof jsonData.error).toBe('string');
            expect(typeof jsonData.message).toBe('string');
            expect(typeof jsonData.feature).toBe('string');
            expect(Array.isArray(jsonData.licensedFeatures)).toBe(true);

            // Verify values
            expect(jsonData.success).toBe(false);
            expect(jsonData.error).toBe('FEATURE_NOT_LICENSED');
            expect(jsonData.feature).toBe('test-feature');
        });

        it('should have consistent error structure for license required', () => {
            const middleware = requireFeature('test-feature');
            const req = {};
            let jsonData = null;

            const res = {
                status: () => res,
                json: (data) => { jsonData = data; return res; }
            };

            middleware(req, res, () => {});

            // Verify required fields
            expect(jsonData).toHaveProperty('success');
            expect(jsonData).toHaveProperty('error');
            expect(jsonData).toHaveProperty('message');
            expect(jsonData).toHaveProperty('feature');

            // Verify field types
            expect(typeof jsonData.success).toBe('boolean');
            expect(typeof jsonData.error).toBe('string');
            expect(typeof jsonData.message).toBe('string');
            expect(typeof jsonData.feature).toBe('string');

            // Verify values
            expect(jsonData.success).toBe(false);
            expect(jsonData.error).toBe('LICENSE_REQUIRED');
            expect(jsonData.feature).toBe('test-feature');
        });
    });
});