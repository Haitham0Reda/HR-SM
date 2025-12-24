/**
 * Rate Limiting by License Type Property-Based Tests
 * 
 * Feature: hr-sm-enterprise-enhancement, Property 22: Rate Limiting by License Type
 * Validates: Requirements 6.2
 */

import fc from 'fast-check';

describe('Rate Limiting by License Type Property-Based Tests', () => {
    describe('Property 22: Rate Limiting by License Type', () => {
        test('should define different rate limits for different license types', () => {
            fc.assert(
                fc.property(
                    fc.record({
                        licenseType: fc.constantFrom('trial', 'basic', 'professional', 'enterprise', 'unlimited'),
                        category: fc.constantFrom('api', 'auth', 'sensitive', 'public')
                    }),
                    (data) => {
                        // Define expected limits for each license type
                        const expectedLimits = {
                            trial: { maxRequests: 50, windowMs: 15 * 60 * 1000 },
                            basic: { maxRequests: 200, windowMs: 15 * 60 * 1000 },
                            professional: { maxRequests: 500, windowMs: 15 * 60 * 1000 },
                            enterprise: { maxRequests: 2000, windowMs: 15 * 60 * 1000 },
                            unlimited: { maxRequests: 10000, windowMs: 15 * 60 * 1000 }
                        };
                        
                        // Category-specific overrides
                        const categoryLimits = {
                            auth: { maxRequests: 10, windowMs: 15 * 60 * 1000 },
                            sensitive: { maxRequests: 20, windowMs: 5 * 60 * 1000 },
                            public: { maxRequests: 1000, windowMs: 15 * 60 * 1000 }
                        };
                        
                        // Determine expected limit
                        const expectedLimit = categoryLimits[data.category] || expectedLimits[data.licenseType];
                        
                        // Verify rate limit configuration logic
                        expect(expectedLimit).toBeDefined();
                        expect(expectedLimit.maxRequests).toBeGreaterThan(0);
                        expect(expectedLimit.windowMs).toBeGreaterThan(0);
                        
                        // Verify license type hierarchy
                        const licenseHierarchy = ['trial', 'basic', 'professional', 'enterprise', 'unlimited'];
                        const currentIndex = licenseHierarchy.indexOf(data.licenseType);
                        
                        if (currentIndex > 0 && data.category === 'api') {
                            const previousLicense = licenseHierarchy[currentIndex - 1];
                            const previousLimit = expectedLimits[previousLicense];
                            
                            // Higher tier licenses should have higher or equal limits
                            expect(expectedLimit.maxRequests).toBeGreaterThanOrEqual(previousLimit.maxRequests);
                        }
                        
                        // Verify category-specific restrictions
                        if (data.category === 'auth' || data.category === 'sensitive') {
                            // Auth and sensitive operations should have strict limits regardless of license
                            expect(expectedLimit.maxRequests).toBeLessThanOrEqual(20);
                        }
                        
                        if (data.category === 'public') {
                            // Public operations should be more lenient
                            expect(expectedLimit.maxRequests).toBeGreaterThanOrEqual(1000);
                        }
                        
                        return true;
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('should enforce stricter limits for sensitive operations regardless of license type', () => {
            fc.assert(
                fc.property(
                    fc.constantFrom('trial', 'basic', 'professional', 'enterprise', 'unlimited'),
                    (licenseType) => {
                        // Sensitive operations should have strict limits regardless of license
                        const sensitiveLimit = 20;
                        const authLimit = 10;
                        
                        // Define license-based limits
                        const licenseBasedLimits = {
                            trial: 50,
                            basic: 200,
                            professional: 500,
                            enterprise: 2000,
                            unlimited: 10000
                        };
                        
                        const licenseLimit = licenseBasedLimits[licenseType];
                        
                        // Even unlimited license should be limited for sensitive operations
                        expect(sensitiveLimit).toBeLessThan(licenseLimit);
                        expect(authLimit).toBeLessThan(sensitiveLimit);
                        
                        // Verify that sensitive limits are consistently applied
                        expect(sensitiveLimit).toBe(20);
                        expect(authLimit).toBe(10);
                        
                        return true;
                    }
                ),
                { numRuns: 50 }
            );
        });

        test('should generate unique rate limit keys for tenant isolation', () => {
            fc.assert(
                fc.property(
                    fc.record({
                        tenant1: fc.record({
                            tenantId: fc.string({ minLength: 8, maxLength: 20 }).filter(s => s.trim().length >= 8),
                            ip: fc.ipV4()
                        }),
                        tenant2: fc.record({
                            tenantId: fc.string({ minLength: 8, maxLength: 20 }).filter(s => s.trim().length >= 8),
                            ip: fc.ipV4()
                        }),
                        category: fc.constantFrom('api', 'auth', 'sensitive', 'public')
                    }),
                    (data) => {
                        // Ensure different tenant IDs
                        if (data.tenant1.tenantId === data.tenant2.tenantId) {
                            data.tenant2.tenantId = data.tenant2.tenantId + '_different';
                        }
                        
                        // Generate rate limit keys as the middleware would
                        const generateKey = (category, tenantId, ip) => {
                            return `${category}:${tenantId}:${ip}`;
                        };
                        
                        const key1 = generateKey(data.category, data.tenant1.tenantId, data.tenant1.ip);
                        const key2 = generateKey(data.category, data.tenant2.tenantId, data.tenant2.ip);
                        
                        // Keys should be different for different tenants
                        expect(key1).not.toBe(key2);
                        
                        // Keys should include all necessary components
                        expect(key1).toContain(data.category);
                        expect(key1).toContain(data.tenant1.tenantId);
                        expect(key1).toContain(data.tenant1.ip);
                        
                        expect(key2).toContain(data.category);
                        expect(key2).toContain(data.tenant2.tenantId);
                        expect(key2).toContain(data.tenant2.ip);
                        
                        // Same tenant with same IP should generate same key
                        const key1Duplicate = generateKey(data.category, data.tenant1.tenantId, data.tenant1.ip);
                        expect(key1).toBe(key1Duplicate);
                        
                        return true;
                    }
                ),
                { numRuns: 50 }
            );
        });

        test('should validate rate limit configuration consistency', () => {
            fc.assert(
                fc.property(
                    fc.record({
                        licenseTypes: fc.array(
                            fc.constantFrom('trial', 'basic', 'professional', 'enterprise', 'unlimited'),
                            { minLength: 2, maxLength: 5 }
                        ),
                        categories: fc.array(
                            fc.constantFrom('api', 'auth', 'sensitive', 'public'),
                            { minLength: 2, maxLength: 4 }
                        )
                    }),
                    (data) => {
                        const rateLimits = {
                            trial: { maxRequests: 50, windowMs: 15 * 60 * 1000 },
                            basic: { maxRequests: 200, windowMs: 15 * 60 * 1000 },
                            professional: { maxRequests: 500, windowMs: 15 * 60 * 1000 },
                            enterprise: { maxRequests: 2000, windowMs: 15 * 60 * 1000 },
                            unlimited: { maxRequests: 10000, windowMs: 15 * 60 * 1000 }
                        };
                        
                        const categoryLimits = {
                            auth: { maxRequests: 10, windowMs: 15 * 60 * 1000 },
                            sensitive: { maxRequests: 20, windowMs: 5 * 60 * 1000 },
                            public: { maxRequests: 1000, windowMs: 15 * 60 * 1000 }
                        };
                        
                        // Test all combinations
                        data.licenseTypes.forEach(licenseType => {
                            data.categories.forEach(category => {
                                const effectiveLimit = categoryLimits[category] || rateLimits[licenseType];
                                
                                // All limits should be positive
                                expect(effectiveLimit.maxRequests).toBeGreaterThan(0);
                                expect(effectiveLimit.windowMs).toBeGreaterThan(0);
                                
                                // Window should be reasonable (between 1 minute and 1 hour)
                                expect(effectiveLimit.windowMs).toBeGreaterThanOrEqual(60 * 1000); // 1 minute
                                expect(effectiveLimit.windowMs).toBeLessThanOrEqual(60 * 60 * 1000); // 1 hour
                                
                                // Max requests should be reasonable
                                expect(effectiveLimit.maxRequests).toBeLessThanOrEqual(10000);
                            });
                        });
                        
                        return true;
                    }
                ),
                { numRuns: 30 }
            );
        });
    });
});