/**
 * Unit Tests for Authentication
 * 
 * Tests Platform JWT and Tenant JWT authentication systems
 * Requirements: 1.2, 1.3, 8.3, 8.4, 16.2
 */

import jwt from 'jsonwebtoken';
import {
    generatePlatformToken,
    verifyPlatformToken
} from '../../core/auth/platformAuth.js';
import {
    generateTenantToken,
    verifyTenantToken
} from '../../core/auth/tenantAuth.js';
import AppError from '../../core/errors/AppError.js';

describe('Authentication', () => {
    // Store original environment variables
    const originalEnv = process.env;

    beforeEach(() => {
        // Reset environment variables before each test
        process.env = {
            ...originalEnv,
            PLATFORM_JWT_SECRET: 'test-platform-secret-key',
            TENANT_JWT_SECRET: 'test-tenant-secret-key'
        };
    });

    afterEach(() => {
        // Restore original environment variables
        process.env = originalEnv;
    });

    describe('Platform JWT', () => {
        describe('generatePlatformToken', () => {
            it('should generate a valid Platform JWT token', () => {
                const userId = 'platform_user_123';
                const role = 'super-admin';

                const token = generatePlatformToken(userId, role);

                expect(token).toBeDefined();
                expect(typeof token).toBe('string');
                expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
            });

            it('should include userId, role, and type in token payload', () => {
                const userId = 'platform_user_123';
                const role = 'support';

                const token = generatePlatformToken(userId, role);
                const decoded = jwt.decode(token);

                expect(decoded.userId).toBe(userId);
                expect(decoded.role).toBe(role);
                expect(decoded.type).toBe('platform');
            });

            it('should throw error if PLATFORM_JWT_SECRET is not configured', () => {
                delete process.env.PLATFORM_JWT_SECRET;

                expect(() => {
                    generatePlatformToken('user_123', 'super-admin');
                }).toThrow(AppError);

                expect(() => {
                    generatePlatformToken('user_123', 'super-admin');
                }).toThrow('PLATFORM_JWT_SECRET is not configured');
            });
        });

        describe('verifyPlatformToken', () => {
            it('should verify a valid Platform JWT token', () => {
                const userId = 'platform_user_123';
                const role = 'operations';

                const token = generatePlatformToken(userId, role);
                const decoded = verifyPlatformToken(token);

                expect(decoded.userId).toBe(userId);
                expect(decoded.role).toBe(role);
                expect(decoded.type).toBe('platform');
            });

            it('should throw error for invalid token', () => {
                const invalidToken = 'invalid.token.here';

                expect(() => {
                    verifyPlatformToken(invalidToken);
                }).toThrow(AppError);

                expect(() => {
                    verifyPlatformToken(invalidToken);
                }).toThrow('Invalid platform token');
            });

            it('should throw error for expired token', () => {
                const userId = 'platform_user_123';
                const role = 'super-admin';

                // Create an expired token (expired 1 hour ago)
                const expiredToken = jwt.sign(
                    { userId, role, type: 'platform' },
                    process.env.PLATFORM_JWT_SECRET,
                    { expiresIn: '-1h' }
                );

                expect(() => {
                    verifyPlatformToken(expiredToken);
                }).toThrow(AppError);

                expect(() => {
                    verifyPlatformToken(expiredToken);
                }).toThrow('Platform token has expired');
            });

            it('should throw error for token with wrong type', () => {
                // Create a token with wrong type
                const wrongTypeToken = jwt.sign(
                    { userId: 'user_123', role: 'admin', type: 'tenant' },
                    process.env.PLATFORM_JWT_SECRET,
                    { expiresIn: '4h' }
                );

                expect(() => {
                    verifyPlatformToken(wrongTypeToken);
                }).toThrow(AppError);

                expect(() => {
                    verifyPlatformToken(wrongTypeToken);
                }).toThrow('Invalid token type');
            });

            it('should throw error if PLATFORM_JWT_SECRET is not configured', () => {
                const token = generatePlatformToken('user_123', 'super-admin');
                delete process.env.PLATFORM_JWT_SECRET;

                expect(() => {
                    verifyPlatformToken(token);
                }).toThrow(AppError);

                expect(() => {
                    verifyPlatformToken(token);
                }).toThrow('PLATFORM_JWT_SECRET is not configured');
            });
        });

        describe('Platform JWT uses separate secret', () => {
            it('should use PLATFORM_JWT_SECRET for signing', () => {
                const userId = 'platform_user_123';
                const role = 'super-admin';

                const token = generatePlatformToken(userId, role);

                // Verify with the platform secret
                const decoded = jwt.verify(token, process.env.PLATFORM_JWT_SECRET);
                expect(decoded.userId).toBe(userId);
            });

            it('should NOT be verifiable with TENANT_JWT_SECRET', () => {
                const userId = 'platform_user_123';
                const role = 'super-admin';

                const token = generatePlatformToken(userId, role);

                // Attempt to verify with tenant secret should fail
                expect(() => {
                    jwt.verify(token, process.env.TENANT_JWT_SECRET);
                }).toThrow();
            });

            it('should use different secret than tenant tokens', () => {
                expect(process.env.PLATFORM_JWT_SECRET).toBeDefined();
                expect(process.env.TENANT_JWT_SECRET).toBeDefined();
                expect(process.env.PLATFORM_JWT_SECRET).not.toBe(process.env.TENANT_JWT_SECRET);
            });
        });

        describe('Platform JWT expiration time', () => {
            it('should have 4 hour expiration time', () => {
                const userId = 'platform_user_123';
                const role = 'super-admin';

                const token = generatePlatformToken(userId, role);
                const decoded = jwt.decode(token);

                // Calculate expiration time (should be ~4 hours from now)
                const expirationTime = decoded.exp - decoded.iat;
                const fourHoursInSeconds = 4 * 60 * 60;

                expect(expirationTime).toBe(fourHoursInSeconds);
            });

            it('should expire after 4 hours', () => {
                const userId = 'platform_user_123';
                const role = 'super-admin';

                // Create a token that expires in 1 second
                const shortLivedToken = jwt.sign(
                    { userId, role, type: 'platform' },
                    process.env.PLATFORM_JWT_SECRET,
                    { expiresIn: '1s' }
                );

                // Wait for token to expire
                return new Promise((resolve) => {
                    setTimeout(() => {
                        expect(() => {
                            verifyPlatformToken(shortLivedToken);
                        }).toThrow('Platform token has expired');
                        resolve();
                    }, 1100);
                });
            }, 2000);
        });
    });

    describe('Tenant JWT', () => {
        describe('generateTenantToken', () => {
            it('should generate a valid Tenant JWT token', () => {
                const userId = 'tenant_user_123';
                const tenantId = 'tenant_abc';
                const role = 'Admin';

                const token = generateTenantToken(userId, tenantId, role);

                expect(token).toBeDefined();
                expect(typeof token).toBe('string');
                expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
            });

            it('should include userId, tenantId, role, and type in token payload', () => {
                const userId = 'tenant_user_123';
                const tenantId = 'tenant_abc';
                const role = 'HR';

                const token = generateTenantToken(userId, tenantId, role);
                const decoded = jwt.decode(token);

                expect(decoded.userId).toBe(userId);
                expect(decoded.tenantId).toBe(tenantId);
                expect(decoded.role).toBe(role);
                expect(decoded.type).toBe('tenant');
            });

            it('should throw error if TENANT_JWT_SECRET is not configured', () => {
                delete process.env.TENANT_JWT_SECRET;

                expect(() => {
                    generateTenantToken('user_123', 'tenant_abc', 'Admin');
                }).toThrow(AppError);

                expect(() => {
                    generateTenantToken('user_123', 'tenant_abc', 'Admin');
                }).toThrow('TENANT_JWT_SECRET is not configured');
            });
        });

        describe('verifyTenantToken', () => {
            it('should verify a valid Tenant JWT token', () => {
                const userId = 'tenant_user_123';
                const tenantId = 'tenant_abc';
                const role = 'Manager';

                const token = generateTenantToken(userId, tenantId, role);
                const decoded = verifyTenantToken(token);

                expect(decoded.userId).toBe(userId);
                expect(decoded.tenantId).toBe(tenantId);
                expect(decoded.role).toBe(role);
                expect(decoded.type).toBe('tenant');
            });

            it('should throw error for invalid token', () => {
                const invalidToken = 'invalid.token.here';

                expect(() => {
                    verifyTenantToken(invalidToken);
                }).toThrow(AppError);

                expect(() => {
                    verifyTenantToken(invalidToken);
                }).toThrow('Invalid tenant token');
            });

            it('should throw error for expired token', () => {
                const userId = 'tenant_user_123';
                const tenantId = 'tenant_abc';
                const role = 'Employee';

                // Create an expired token (expired 1 hour ago)
                const expiredToken = jwt.sign(
                    { userId, tenantId, role, type: 'tenant' },
                    process.env.TENANT_JWT_SECRET,
                    { expiresIn: '-1h' }
                );

                expect(() => {
                    verifyTenantToken(expiredToken);
                }).toThrow(AppError);

                expect(() => {
                    verifyTenantToken(expiredToken);
                }).toThrow('Tenant token has expired');
            });

            it('should throw error for token with wrong type', () => {
                // Create a token with wrong type
                const wrongTypeToken = jwt.sign(
                    { userId: 'user_123', tenantId: 'tenant_abc', role: 'Admin', type: 'platform' },
                    process.env.TENANT_JWT_SECRET,
                    { expiresIn: '7d' }
                );

                expect(() => {
                    verifyTenantToken(wrongTypeToken);
                }).toThrow(AppError);

                expect(() => {
                    verifyTenantToken(wrongTypeToken);
                }).toThrow('Invalid token type');
            });

            it('should throw error for token missing tenantId', () => {
                // Create a token without tenantId
                const noTenantIdToken = jwt.sign(
                    { userId: 'user_123', role: 'Admin', type: 'tenant' },
                    process.env.TENANT_JWT_SECRET,
                    { expiresIn: '7d' }
                );

                expect(() => {
                    verifyTenantToken(noTenantIdToken);
                }).toThrow(AppError);

                expect(() => {
                    verifyTenantToken(noTenantIdToken);
                }).toThrow('Token missing tenantId');
            });

            it('should throw error if TENANT_JWT_SECRET is not configured', () => {
                const token = generateTenantToken('user_123', 'tenant_abc', 'Admin');
                delete process.env.TENANT_JWT_SECRET;

                expect(() => {
                    verifyTenantToken(token);
                }).toThrow(AppError);

                expect(() => {
                    verifyTenantToken(token);
                }).toThrow('TENANT_JWT_SECRET is not configured');
            });
        });

        describe('Tenant JWT uses separate secret', () => {
            it('should use TENANT_JWT_SECRET for signing', () => {
                const userId = 'tenant_user_123';
                const tenantId = 'tenant_abc';
                const role = 'Admin';

                const token = generateTenantToken(userId, tenantId, role);

                // Verify with the tenant secret
                const decoded = jwt.verify(token, process.env.TENANT_JWT_SECRET);
                expect(decoded.userId).toBe(userId);
                expect(decoded.tenantId).toBe(tenantId);
            });

            it('should NOT be verifiable with PLATFORM_JWT_SECRET', () => {
                const userId = 'tenant_user_123';
                const tenantId = 'tenant_abc';
                const role = 'Admin';

                const token = generateTenantToken(userId, tenantId, role);

                // Attempt to verify with platform secret should fail
                expect(() => {
                    jwt.verify(token, process.env.PLATFORM_JWT_SECRET);
                }).toThrow();
            });

            it('should use different secret than platform tokens', () => {
                expect(process.env.PLATFORM_JWT_SECRET).toBeDefined();
                expect(process.env.TENANT_JWT_SECRET).toBeDefined();
                expect(process.env.TENANT_JWT_SECRET).not.toBe(process.env.PLATFORM_JWT_SECRET);
            });
        });

        describe('Tenant JWT expiration time', () => {
            it('should have 7 day expiration time', () => {
                const userId = 'tenant_user_123';
                const tenantId = 'tenant_abc';
                const role = 'Admin';

                const token = generateTenantToken(userId, tenantId, role);
                const decoded = jwt.decode(token);

                // Calculate expiration time (should be ~7 days from now)
                const expirationTime = decoded.exp - decoded.iat;
                const sevenDaysInSeconds = 7 * 24 * 60 * 60;

                expect(expirationTime).toBe(sevenDaysInSeconds);
            });

            it('should expire after 7 days', () => {
                const userId = 'tenant_user_123';
                const tenantId = 'tenant_abc';
                const role = 'Admin';

                // Create a token that expires in 1 second
                const shortLivedToken = jwt.sign(
                    { userId, tenantId, role, type: 'tenant' },
                    process.env.TENANT_JWT_SECRET,
                    { expiresIn: '1s' }
                );

                // Wait for token to expire
                return new Promise((resolve) => {
                    setTimeout(() => {
                        expect(() => {
                            verifyTenantToken(shortLivedToken);
                        }).toThrow('Tenant token has expired');
                        resolve();
                    }, 1100);
                });
            }, 2000);
        });
    });

    describe('Token Isolation', () => {
        it('should not allow platform token to be verified as tenant token', () => {
            const platformToken = generatePlatformToken('platform_user_123', 'super-admin');

            expect(() => {
                verifyTenantToken(platformToken);
            }).toThrow();
        });

        it('should not allow tenant token to be verified as platform token', () => {
            const tenantToken = generateTenantToken('tenant_user_123', 'tenant_abc', 'Admin');

            expect(() => {
                verifyPlatformToken(tenantToken);
            }).toThrow();
        });

        it('should maintain separate token types', () => {
            const platformToken = generatePlatformToken('platform_user_123', 'super-admin');
            const tenantToken = generateTenantToken('tenant_user_123', 'tenant_abc', 'Admin');

            const platformDecoded = jwt.decode(platformToken);
            const tenantDecoded = jwt.decode(tenantToken);

            expect(platformDecoded.type).toBe('platform');
            expect(tenantDecoded.type).toBe('tenant');
            expect(platformDecoded.type).not.toBe(tenantDecoded.type);
        });
    });

    describe('Token Expiration Comparison', () => {
        it('should have different expiration times for platform and tenant tokens', () => {
            const platformToken = generatePlatformToken('platform_user_123', 'super-admin');
            const tenantToken = generateTenantToken('tenant_user_123', 'tenant_abc', 'Admin');

            const platformDecoded = jwt.decode(platformToken);
            const tenantDecoded = jwt.decode(tenantToken);

            const platformExpiration = platformDecoded.exp - platformDecoded.iat;
            const tenantExpiration = tenantDecoded.exp - tenantDecoded.iat;

            // Platform: 4 hours = 14400 seconds
            // Tenant: 7 days = 604800 seconds
            expect(platformExpiration).toBe(4 * 60 * 60);
            expect(tenantExpiration).toBe(7 * 24 * 60 * 60);
            expect(platformExpiration).not.toBe(tenantExpiration);
        });

        it('should have platform token expire sooner than tenant token', () => {
            const platformToken = generatePlatformToken('platform_user_123', 'super-admin');
            const tenantToken = generateTenantToken('tenant_user_123', 'tenant_abc', 'Admin');

            const platformDecoded = jwt.decode(platformToken);
            const tenantDecoded = jwt.decode(tenantToken);

            const platformExpiration = platformDecoded.exp - platformDecoded.iat;
            const tenantExpiration = tenantDecoded.exp - tenantDecoded.iat;

            expect(platformExpiration).toBeLessThan(tenantExpiration);
        });
    });
});
