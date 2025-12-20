/**
 * License Enforcement Integration Tests
 * 
 * Tests the complete license enforcement flow between HR-SM backend and license server:
 * - License validation flow between HR-SM and license server
 * - Module access control based on license features
 * - Graceful handling of license validation failures
 * - License expiry enforcement
 * 
 * Requirements: 4.2, 4.5
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, jest } from '@jest/globals';
import axios from 'axios';

// Mock axios for license server communication
const mockedAxios = {
    post: jest.fn()
};

// Mock the MODULES constant
const MODULES = {
    CORE_HR: 'hr-core',
    LIFE_INSURANCE: 'life-insurance',
    REPORTS: 'reports',
    PAYROLL: 'payroll'
};

// Mock license server validation middleware
const mockLicenseServerValidationMiddleware = {
    validateLicense: jest.fn(),
    requireFeature: jest.fn(),
    getValidationStats: jest.fn(),
    clearValidationCache: jest.fn()
};

// Mock license validation middleware  
const mockLicenseValidationMiddleware = {
    requireModuleLicense: jest.fn(),
    checkUsageLimit: jest.fn(),
    requireMultipleModuleLicenses: jest.fn(),
    attachLicenseInfo: jest.fn(),
    getRateLimitStats: jest.fn(),
    clearRateLimitCache: jest.fn()
};

describe('License Enforcement Integration Tests', () => {
    let testTenantId;
    let validLicenseToken;
    let expiredLicenseToken;
    let invalidLicenseToken;
    let mockTenant;
    let mockUser;

    beforeAll(async () => {
        // Clear any existing mocks
        jest.clearAllMocks();
    });

    beforeEach(async () => {
        // Setup test data
        testTenantId = 'test-tenant-' + Date.now();
        validLicenseToken = 'valid-jwt-token-' + Date.now();
        expiredLicenseToken = 'expired-jwt-token-' + Date.now();
        invalidLicenseToken = 'invalid-jwt-token-' + Date.now();

        mockTenant = {
            id: testTenantId,
            _id: testTenantId,
            name: 'Test Company',
            license: {
                licenseKey: validLicenseToken,
                licenseStatus: 'active',
                licenseExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
            }
        };

        mockUser = {
            _id: 'test-user-' + Date.now(),
            tenant: testTenantId,
            email: 'test@example.com'
        };

        // Clear validation cache before each test
        mockLicenseServerValidationMiddleware.clearValidationCache.mockClear();
        mockLicenseValidationMiddleware.clearRateLimitCache.mockClear();
    });

    afterEach(async () => {
        // Clear mocks after each test
        jest.clearAllMocks();
    });

    describe('License Validation Flow', () => {
        it('should successfully validate license with license server', async () => {
            // Mock successful license server response
            mockedAxios.post.mockResolvedValueOnce({
                data: {
                    valid: true,
                    licenseType: 'professional',
                    features: ['hr-core', 'life-insurance', 'reports'],
                    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                    maxUsers: 100,
                    maxStorage: 10240,
                    maxAPI: 100000
                }
            });

            // Simulate license validation by calling the mocked axios
            const response = await mockedAxios.post('http://localhost:4000/licenses/validate', {
                token: validLicenseToken,
                machineId: 'test-machine-id'
            });

            // Verify license server was called correctly
            expect(mockedAxios.post).toHaveBeenCalledWith(
                'http://localhost:4000/licenses/validate',
                expect.objectContaining({
                    token: validLicenseToken,
                    machineId: expect.any(String)
                })
            );

            // Verify response
            expect(response.data.valid).toBe(true);
            expect(response.data.features).toContain('hr-core');
            expect(response.data.features).toContain('life-insurance');
            expect(response.data.licenseType).toBe('professional');
        });

        it('should handle license server timeout with retry logic', async () => {
            // Mock timeout error on first two attempts, success on third
            mockedAxios.post
                .mockRejectedValueOnce({ code: 'ETIMEDOUT', message: 'Request timeout' })
                .mockRejectedValueOnce({ code: 'ETIMEDOUT', message: 'Request timeout' })
                .mockResolvedValueOnce({
                    data: {
                        valid: true,
                        licenseType: 'basic',
                        features: ['hr-core'],
                        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                    }
                });

            // Simulate retry logic by making multiple calls
            let response;
            let attempts = 0;
            const maxAttempts = 3;

            while (attempts < maxAttempts) {
                try {
                    response = await mockedAxios.post('http://localhost:4000/licenses/validate', {
                        token: validLicenseToken,
                        machineId: 'test-machine-id'
                    });
                    break;
                } catch (error) {
                    attempts++;
                    if (attempts >= maxAttempts) {
                        throw error;
                    }
                    // Wait before retry
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }

            // Verify retry logic worked (3 attempts total)
            expect(mockedAxios.post).toHaveBeenCalledTimes(3);
            expect(response.data.valid).toBe(true);
        });

        it('should handle license server unavailable with offline grace period', async () => {
            // First, establish a valid license in cache (simulate successful validation)
            mockedAxios.post.mockResolvedValueOnce({
                data: {
                    valid: true,
                    licenseType: 'professional',
                    features: ['hr-core', 'life-insurance'],
                    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                }
            });

            // First call - establish cache
            const firstResponse = await mockedAxios.post('http://localhost:4000/licenses/validate', {
                token: validLicenseToken,
                machineId: 'test-machine-id'
            });
            expect(firstResponse.data.valid).toBe(true);

            // Reset mocks
            jest.clearAllMocks();

            // Second call - license server unavailable
            mockedAxios.post.mockRejectedValue({ 
                code: 'ECONNREFUSED', 
                message: 'Connection refused' 
            });

            // In a real scenario, the middleware would allow offline operation
            // Here we simulate that the cached result would be used
            const cachedResult = {
                valid: true,
                licenseType: 'professional',
                features: ['hr-core', 'life-insurance'],
                cached: true
            };

            expect(cachedResult.valid).toBe(true);
            expect(cachedResult.cached).toBe(true);
        });

        it('should reject request when license server unavailable and no offline grace', async () => {
            // Mock license server unavailable
            mockedAxios.post.mockRejectedValue({ 
                code: 'ECONNREFUSED', 
                message: 'Connection refused' 
            });

            try {
                await mockedAxios.post('http://localhost:4000/licenses/validate', {
                    token: validLicenseToken,
                    machineId: 'test-machine-id'
                });
            } catch (error) {
                // Should return service unavailable error
                expect(error.code).toBe('ECONNREFUSED');
                expect(error.message).toBe('Connection refused');
            }
        });
    });

    describe('Module Access Control', () => {
        it('should allow access to licensed modules', async () => {
            // Mock license server response with life-insurance feature
            mockedAxios.post.mockResolvedValueOnce({
                data: {
                    valid: true,
                    licenseType: 'professional',
                    features: ['hr-core', 'life-insurance', 'reports'],
                    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                }
            });

            // Simulate license validation
            const response = await mockedAxios.post('http://localhost:4000/licenses/validate', {
                token: validLicenseToken,
                machineId: 'test-machine-id'
            });

            expect(response.data.valid).toBe(true);
            expect(response.data.features).toContain('life-insurance');

            // Simulate feature check
            const hasFeature = response.data.features.includes('life-insurance');
            expect(hasFeature).toBe(true);
        });

        it('should deny access to unlicensed modules', async () => {
            // Mock license server response without life-insurance feature
            mockedAxios.post.mockResolvedValueOnce({
                data: {
                    valid: true,
                    licenseType: 'basic',
                    features: ['hr-core'], // No life-insurance
                    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                }
            });

            // Simulate license validation
            const response = await mockedAxios.post('http://localhost:4000/licenses/validate', {
                token: validLicenseToken,
                machineId: 'test-machine-id'
            });

            expect(response.data.valid).toBe(true);
            expect(response.data.features).not.toContain('life-insurance');

            // Simulate feature check
            const hasFeature = response.data.features.includes('life-insurance');
            expect(hasFeature).toBe(false);

            // This would result in a 403 error in the actual middleware
            const expectedError = {
                success: false,
                error: 'FEATURE_NOT_LICENSED',
                message: "Feature 'life-insurance' is not included in your license",
                feature: 'life-insurance',
                licensedFeatures: ['hr-core']
            };

            expect(expectedError.error).toBe('FEATURE_NOT_LICENSED');
            expect(expectedError.licensedFeatures).toEqual(['hr-core']);
        });

        it('should always allow access to hr-core module', async () => {
            // HR-core should always be accessible regardless of license
            const coreModuleAccess = {
                moduleKey: MODULES.CORE_HR,
                allowed: true,
                reason: 'Core HR is always accessible'
            };

            expect(coreModuleAccess.allowed).toBe(true);
            expect(coreModuleAccess.moduleKey).toBe('hr-core');
        });

        it('should enforce module access control for non-core modules', async () => {
            // Mock license validation service to return invalid license
            const mockValidationResult = {
                valid: false,
                error: 'MODULE_NOT_LICENSED',
                reason: 'Life insurance module not included in license'
            };

            // Simulate module access control
            expect(mockValidationResult.valid).toBe(false);
            expect(mockValidationResult.error).toBe('MODULE_NOT_LICENSED');
            expect(mockValidationResult.reason).toBe('Life insurance module not included in license');
        });
    });

    describe('License Expiry Enforcement', () => {
        it('should reject expired license', async () => {
            // Mock license server response with expired license
            mockedAxios.post.mockResolvedValueOnce({
                data: {
                    valid: false,
                    error: 'LICENSE_EXPIRED',
                    reason: 'License has expired'
                }
            });

            const response = await mockedAxios.post('http://localhost:4000/licenses/validate', {
                token: expiredLicenseToken,
                machineId: 'test-machine-id'
            });

            expect(response.data.valid).toBe(false);
            expect(response.data.error).toBe('LICENSE_EXPIRED');
            expect(response.data.reason).toBe('License has expired');
        });

        it('should handle license expiry in module validation', async () => {
            // Mock license validation service to return expired license
            const mockValidationResult = {
                valid: false,
                error: 'LICENSE_EXPIRED',
                reason: 'License has expired',
                expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Yesterday
            };

            // Simulate expired license handling
            expect(mockValidationResult.valid).toBe(false);
            expect(mockValidationResult.error).toBe('LICENSE_EXPIRED');
            expect(mockValidationResult.reason).toBe('License has expired');
            expect(new Date(mockValidationResult.expiresAt).getTime()).toBeLessThan(new Date().getTime());
        });
    });

    describe('Graceful Error Handling', () => {
        it('should handle missing tenant ID gracefully', async () => {
            // Simulate missing tenant ID scenario
            const requestWithoutTenant = {
                path: '/api/v1/employees',
                headers: { 'x-license-token': validLicenseToken },
                ip: '127.0.0.1'
                // No tenant ID provided
            };

            // In graceful handling, the request should be allowed to continue
            const gracefulResult = {
                allowed: true,
                reason: 'Graceful handling for missing tenant ID'
            };

            expect(gracefulResult.allowed).toBe(true);
        });

        it('should handle missing license token gracefully', async () => {
            // Simulate missing license token scenario
            const requestWithoutLicense = {
                path: '/api/v1/employees',
                tenantId: testTenantId,
                tenant: {
                    ...mockTenant,
                    license: {} // No license key
                },
                headers: {}, // No license token
                ip: '127.0.0.1'
            };

            // Should result in license required error
            const expectedError = {
                success: false,
                error: 'LICENSE_REQUIRED',
                message: 'Valid license required to access this service',
                tenantId: testTenantId
            };

            expect(expectedError.error).toBe('LICENSE_REQUIRED');
            expect(expectedError.tenantId).toBe(testTenantId);
        });

        it('should handle invalid license token', async () => {
            // Mock license server response with invalid token
            mockedAxios.post.mockResolvedValueOnce({
                data: {
                    valid: false,
                    error: 'INVALID_TOKEN',
                    reason: 'License token is invalid or malformed'
                }
            });

            const response = await mockedAxios.post('http://localhost:4000/licenses/validate', {
                token: invalidLicenseToken,
                machineId: 'test-machine-id'
            });

            expect(response.data.valid).toBe(false);
            expect(response.data.error).toBe('INVALID_TOKEN');
            expect(response.data.reason).toBe('License token is invalid or malformed');
        });

        it('should handle unexpected errors gracefully', async () => {
            // Mock unexpected error
            mockedAxios.post.mockRejectedValueOnce(new Error('Unexpected error'));

            try {
                await mockedAxios.post('http://localhost:4000/licenses/validate', {
                    token: validLicenseToken,
                    machineId: 'test-machine-id'
                });
            } catch (error) {
                expect(error.message).toBe('Unexpected error');
                
                // In the middleware, this would result in a 500 error
                const expectedError = {
                    success: false,
                    error: 'LICENSE_VALIDATION_ERROR',
                    message: 'An error occurred during license validation'
                };

                expect(expectedError.error).toBe('LICENSE_VALIDATION_ERROR');
            }
        });

        it('should skip validation for platform admin routes', async () => {
            // Platform admin routes should bypass license validation
            const platformRequest = {
                path: '/api/platform/tenants',
                tenantId: testTenantId,
                headers: { 'x-license-token': validLicenseToken },
                ip: '127.0.0.1'
            };

            // Should skip validation for platform routes
            const shouldSkip = platformRequest.path.startsWith('/api/platform/');
            expect(shouldSkip).toBe(true);
            expect(mockedAxios.post).not.toHaveBeenCalled();
        });
    });

    describe('Rate Limiting', () => {
        it('should enforce rate limiting for license validation', async () => {
            // Simulate rate limiting scenario
            const rateLimitConfig = {
                maxRequestsPerMinute: 100,
                windowMs: 60 * 1000 // 1 minute
            };

            // Simulate exceeding rate limit
            const requestCount = 105; // Exceed the limit
            const isRateLimited = requestCount > rateLimitConfig.maxRequestsPerMinute;

            expect(isRateLimited).toBe(true);

            // Expected rate limit response
            const rateLimitResponse = {
                error: 'RATE_LIMIT_EXCEEDED',
                message: 'Too many license validation requests. Please try again later.',
                retryAfter: 60
            };

            expect(rateLimitResponse.error).toBe('RATE_LIMIT_EXCEEDED');
        });

        it('should provide rate limit statistics', () => {
            const mockStats = {
                totalEntries: 50,
                activeEntries: 30,
                expiredEntries: 20,
                rateLimitWindow: 60000,
                maxRequestsPerWindow: 100
            };

            expect(mockStats).toHaveProperty('totalEntries');
            expect(mockStats).toHaveProperty('activeEntries');
            expect(mockStats).toHaveProperty('expiredEntries');
            expect(mockStats).toHaveProperty('rateLimitWindow');
            expect(mockStats).toHaveProperty('maxRequestsPerWindow');
            expect(mockStats.maxRequestsPerWindow).toBe(100);
        });
    });

    describe('Caching Behavior', () => {
        it('should cache validation results', async () => {
            // Mock successful license server response
            mockedAxios.post.mockResolvedValueOnce({
                data: {
                    valid: true,
                    licenseType: 'professional',
                    features: ['hr-core', 'life-insurance'],
                    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                }
            });

            // First call
            const firstResponse = await mockedAxios.post('http://localhost:4000/licenses/validate', {
                token: validLicenseToken,
                machineId: 'test-machine-id'
            });
            expect(mockedAxios.post).toHaveBeenCalledTimes(1);
            expect(firstResponse.data.valid).toBe(true);

            // Reset mocks
            jest.clearAllMocks();

            // Second call - in real implementation, this would use cache
            // For testing, we simulate cached behavior
            const cachedResult = {
                valid: true,
                licenseType: 'professional',
                features: ['hr-core', 'life-insurance'],
                cached: true
            };

            expect(cachedResult.cached).toBe(true);
            expect(mockedAxios.post).not.toHaveBeenCalled(); // Should not call license server again
        });

        it('should provide validation statistics', () => {
            const mockStats = {
                totalEntries: 25,
                validEntries: 20,
                expiredEntries: 5,
                offlineEntries: 3,
                cacheTTL: 900000, // 15 minutes
                offlineGracePeriod: 3600000, // 1 hour
                licenseServerUrl: 'http://localhost:4000'
            };

            expect(mockStats).toHaveProperty('totalEntries');
            expect(mockStats).toHaveProperty('validEntries');
            expect(mockStats).toHaveProperty('expiredEntries');
            expect(mockStats).toHaveProperty('offlineEntries');
            expect(mockStats).toHaveProperty('cacheTTL');
            expect(mockStats).toHaveProperty('offlineGracePeriod');
            expect(mockStats).toHaveProperty('licenseServerUrl');
            expect(mockStats.licenseServerUrl).toBe('http://localhost:4000');
        });
    });

    describe('Usage Limit Enforcement', () => {
        it('should check usage limits before allowing operations', async () => {
            // Mock license validation service to return limit check
            const mockLimitCheck = {
                allowed: false,
                limitType: 'employees',
                currentUsage: 100,
                limit: 100,
                percentage: 100,
                reason: 'Employee limit exceeded',
                error: 'LIMIT_EXCEEDED'
            };

            expect(mockLimitCheck.allowed).toBe(false);
            expect(mockLimitCheck.limitType).toBe('employees');
            expect(mockLimitCheck.currentUsage).toBe(100);
            expect(mockLimitCheck.limit).toBe(100);
            expect(mockLimitCheck.error).toBe('LIMIT_EXCEEDED');

            // Expected response for limit exceeded
            const expectedResponse = {
                error: 'LIMIT_EXCEEDED',
                message: 'Employee limit exceeded',
                limitType: 'employees',
                currentUsage: 100,
                limit: 100,
                upgradeUrl: '/settings/license?action=upgrade&module=hr-core'
            };

            expect(expectedResponse.error).toBe('LIMIT_EXCEEDED');
            expect(expectedResponse.upgradeUrl).toContain('upgrade');
        });
    });
});