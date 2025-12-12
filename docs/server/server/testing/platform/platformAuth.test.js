/**
 * Platform Authentication Unit Tests
 * 
 * Tests platform authentication functionality:
 * - Platform login uses platform_users collection
 * - Platform JWT is issued correctly with separate secret
 * 
 * Requirements: 16.1
 */

import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import PlatformUser from '../../platform/models/PlatformUser.js';
import platformAuthService from '../../platform/auth/services/platformAuthService.js';
import { generatePlatformToken, verifyPlatformToken } from '../../core/auth/platformAuth.js';
import AppError from '../../core/errors/AppError.js';

describe('Platform Authentication', () => {
  let testUser;
  const testPassword = 'TestPassword123!';
  
  // Set up test environment variables
  beforeAll(() => {
    // Ensure we have separate JWT secrets for testing
    process.env.PLATFORM_JWT_SECRET = 'test-platform-secret-key-12345';
    process.env.TENANT_JWT_SECRET = 'test-tenant-secret-key-67890';
  });

  beforeEach(async () => {
    // Clear platform_users collection
    await PlatformUser.deleteMany({});

    // Create a test platform user
    testUser = new PlatformUser({
      email: 'admin@platform.test',
      password: testPassword,
      firstName: 'Platform',
      lastName: 'Admin',
      role: 'super-admin',
      permissions: ['manage_tenants', 'manage_subscriptions'],
      status: 'active'
    });
    await testUser.save();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('Platform Login - Uses platform_users collection', () => {
    test('should authenticate user from platform_users collection', async () => {
      // Act
      const result = await platformAuthService.login('admin@platform.test', testPassword);

      // Assert
      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.user.email).toBe('admin@platform.test');
      expect(result.user.role).toBe('super-admin');
      expect(result.user.password).toBeUndefined(); // Password should not be in response
    });

    test('should fail authentication with invalid credentials', async () => {
      // Act & Assert
      await expect(
        platformAuthService.login('admin@platform.test', 'wrongpassword')
      ).rejects.toThrow(AppError);
    });

    test('should fail authentication for non-existent user', async () => {
      // Act & Assert
      await expect(
        platformAuthService.login('nonexistent@platform.test', testPassword)
      ).rejects.toThrow(AppError);
    });

    test('should fail authentication for inactive user', async () => {
      // Arrange - Create inactive user
      const inactiveUser = new PlatformUser({
        email: 'inactive@platform.test',
        password: testPassword,
        firstName: 'Inactive',
        lastName: 'User',
        role: 'support',
        status: 'inactive'
      });
      await inactiveUser.save();

      // Act & Assert
      await expect(
        platformAuthService.login('inactive@platform.test', testPassword)
      ).rejects.toThrow(AppError);
    });

    test('should update lastLogin timestamp on successful login', async () => {
      // Arrange
      const beforeLogin = new Date();

      // Act
      await platformAuthService.login('admin@platform.test', testPassword);

      // Assert
      const updatedUser = await PlatformUser.findOne({ email: 'admin@platform.test' });
      expect(updatedUser.lastLogin).toBeDefined();
      expect(updatedUser.lastLogin.getTime()).toBeGreaterThanOrEqual(beforeLogin.getTime());
    });
  });

  describe('Platform JWT - Issued correctly with separate secret', () => {
    test('should generate JWT with PLATFORM_JWT_SECRET', () => {
      // Act
      const token = generatePlatformToken(testUser._id.toString(), testUser.role);

      // Assert
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      // Verify token was signed with platform secret
      const decoded = jwt.verify(token, process.env.PLATFORM_JWT_SECRET);
      expect(decoded.userId).toBe(testUser._id.toString());
      expect(decoded.role).toBe('super-admin');
      expect(decoded.type).toBe('platform');
    });

    test('should NOT verify platform JWT with tenant secret', () => {
      // Arrange
      const token = generatePlatformToken(testUser._id.toString(), testUser.role);

      // Act & Assert - Should fail when using wrong secret
      expect(() => {
        jwt.verify(token, process.env.TENANT_JWT_SECRET);
      }).toThrow();
    });

    test('should include correct token type in JWT payload', () => {
      // Act
      const token = generatePlatformToken(testUser._id.toString(), testUser.role);
      const decoded = jwt.verify(token, process.env.PLATFORM_JWT_SECRET);

      // Assert
      expect(decoded.type).toBe('platform');
    });

    test('should set token expiration to 4 hours', () => {
      // Act
      const token = generatePlatformToken(testUser._id.toString(), testUser.role);
      const decoded = jwt.verify(token, process.env.PLATFORM_JWT_SECRET);

      // Assert
      const now = Math.floor(Date.now() / 1000);
      const fourHours = 4 * 60 * 60; // 4 hours in seconds
      const expectedExpiry = now + fourHours;

      // Allow 5 second tolerance for test execution time
      expect(decoded.exp).toBeGreaterThanOrEqual(expectedExpiry - 5);
      expect(decoded.exp).toBeLessThanOrEqual(expectedExpiry + 5);
    });

    test('should verify platform JWT correctly', () => {
      // Arrange
      const token = generatePlatformToken(testUser._id.toString(), testUser.role);

      // Act
      const decoded = verifyPlatformToken(token);

      // Assert
      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe(testUser._id.toString());
      expect(decoded.role).toBe('super-admin');
      expect(decoded.type).toBe('platform');
    });

    test('should reject JWT with wrong type', () => {
      // Arrange - Create a token with wrong type
      const wrongTypeToken = jwt.sign(
        {
          userId: testUser._id.toString(),
          role: testUser.role,
          type: 'tenant' // Wrong type
        },
        process.env.PLATFORM_JWT_SECRET,
        { expiresIn: '4h' }
      );

      // Act & Assert
      expect(() => {
        verifyPlatformToken(wrongTypeToken);
      }).toThrow(AppError);
    });

    test('should reject expired platform JWT', () => {
      // Arrange - Create an expired token
      const expiredToken = jwt.sign(
        {
          userId: testUser._id.toString(),
          role: testUser.role,
          type: 'platform'
        },
        process.env.PLATFORM_JWT_SECRET,
        { expiresIn: '-1h' } // Expired 1 hour ago
      );

      // Act & Assert
      expect(() => {
        verifyPlatformToken(expiredToken);
      }).toThrow(AppError);
    });

    test('should reject invalid platform JWT', () => {
      // Arrange
      const invalidToken = 'invalid.jwt.token';

      // Act & Assert
      expect(() => {
        verifyPlatformToken(invalidToken);
      }).toThrow(AppError);
    });

    test('login should return JWT that can be verified', async () => {
      // Act
      const { token } = await platformAuthService.login('admin@platform.test', testPassword);

      // Assert
      const decoded = verifyPlatformToken(token);
      expect(decoded.userId).toBe(testUser._id.toString());
      expect(decoded.role).toBe('super-admin');
      expect(decoded.type).toBe('platform');
    });
  });

  describe('Platform JWT - Separate from Tenant JWT', () => {
    test('should use different secret than tenant JWT', () => {
      // Assert
      expect(process.env.PLATFORM_JWT_SECRET).toBeDefined();
      expect(process.env.TENANT_JWT_SECRET).toBeDefined();
      expect(process.env.PLATFORM_JWT_SECRET).not.toBe(process.env.TENANT_JWT_SECRET);
    });

    test('platform token should not be verifiable with tenant secret', () => {
      // Arrange
      const platformToken = generatePlatformToken(testUser._id.toString(), testUser.role);

      // Act & Assert
      expect(() => {
        jwt.verify(platformToken, process.env.TENANT_JWT_SECRET);
      }).toThrow();
    });

    test('should throw error if PLATFORM_JWT_SECRET is not configured', () => {
      // Arrange
      const originalSecret = process.env.PLATFORM_JWT_SECRET;
      delete process.env.PLATFORM_JWT_SECRET;

      // Act & Assert
      expect(() => {
        generatePlatformToken(testUser._id.toString(), testUser.role);
      }).toThrow(AppError);

      // Cleanup
      process.env.PLATFORM_JWT_SECRET = originalSecret;
    });
  });

  describe('Platform User Roles', () => {
    test('should support super-admin role', async () => {
      // Act
      const { user } = await platformAuthService.login('admin@platform.test', testPassword);

      // Assert
      expect(user.role).toBe('super-admin');
    });

    test('should support support role', async () => {
      // Arrange
      const supportUser = new PlatformUser({
        email: 'support@platform.test',
        password: testPassword,
        firstName: 'Support',
        lastName: 'User',
        role: 'support',
        status: 'active'
      });
      await supportUser.save();

      // Act
      const { user } = await platformAuthService.login('support@platform.test', testPassword);

      // Assert
      expect(user.role).toBe('support');
    });

    test('should support operations role', async () => {
      // Arrange
      const opsUser = new PlatformUser({
        email: 'ops@platform.test',
        password: testPassword,
        firstName: 'Operations',
        lastName: 'User',
        role: 'operations',
        status: 'active'
      });
      await opsUser.save();

      // Act
      const { user } = await platformAuthService.login('ops@platform.test', testPassword);

      // Assert
      expect(user.role).toBe('operations');
    });
  });
});
