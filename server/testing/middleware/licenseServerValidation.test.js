/**
 * License Server Validation Middleware Tests
 * Tests for the license validation middleware with Redis caching and circuit breaker
 */

import { jest } from '@jest/globals';

// Mock dependencies
const mockRedisService = {
  get: jest.fn(),
  set: jest.fn()
};

const mockAxios = {
  get: jest.fn()
};

const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

const mockPlatformDb = {
  query: jest.fn()
};

// Mock modules before importing middleware
jest.unstable_mockModule('../core/services/redis.service.js', () => ({
  default: mockRedisService
}));

jest.unstable_mockModule('axios', () => ({
  default: mockAxios
}));

jest.unstable_mockModule('../utils/logger.js', () => ({
  default: mockLogger
}));

jest.unstable_mockModule('../config/database.js', () => ({
  platformDb: mockPlatformDb
}));

// Import middleware after mocking
const { validateLicense, requireFeature, getCircuitBreakerStatus, resetCircuitBreaker } = 
  await import('../middleware/licenseServerValidation.middleware.js');

describe('License Server Validation Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Reset circuit breaker
    resetCircuitBreaker();
    
    // Setup request/response/next
    req = {
      path: '/api/v1/employees',
      user: { tenantId: 'tenant-123' },
      headers: {},
      query: {}
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    next = jest.fn();
  });

  describe('validateLicense', () => {
    test('should skip validation for health check paths', async () => {
      req.path = '/health';
      
      await validateLicense(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(mockRedisService.get).not.toHaveBeenCalled();
    });

    test('should skip validation when no tenant ID', async () => {
      req.user = null;
      
      await validateLicense(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(mockRedisService.get).not.toHaveBeenCalled();
    });

    test('should use cached validation result when available', async () => {
      const cachedValidation = {
        valid: true,
        features: ['payroll', 'attendance'],
        tenantId: 'tenant-123',
        expiresAt: '2026-12-31T23:59:59Z'
      };
      
      mockRedisService.get.mockResolvedValue(cachedValidation);
      
      await validateLicense(req, res, next);
      
      expect(mockRedisService.get).toHaveBeenCalledWith('license:tenant-123');
      expect(req.licenseFeatures).toEqual(['payroll', 'attendance']);
      expect(req.licenseValidation.cached).toBe(true);
      expect(next).toHaveBeenCalled();
      expect(mockAxios.get).not.toHaveBeenCalled();
    });

    test('should return 402 when cached license is invalid', async () => {
      const cachedValidation = {
        valid: false,
        reason: 'License has expired',
        expiresAt: '2025-01-01T00:00:00Z'
      };
      
      mockRedisService.get.mockResolvedValue(cachedValidation);
      
      await validateLicense(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(402);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'LICENSE_INVALID',
          error: 'License invalid or expired'
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('should call license server on cache miss', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPlatformDb.query.mockResolvedValue([[{ license_key: 'test-license-key' }]]);
      
      const serverResponse = {
        data: {
          success: true,
          valid: true,
          features: ['payroll', 'attendance', 'leave'],
          tenantId: 'tenant-123',
          expiresAt: '2026-12-31T23:59:59Z'
        }
      };
      
      mockAxios.get.mockResolvedValue(serverResponse);
      
      await validateLicense(req, res, next);
      
      expect(mockPlatformDb.query).toHaveBeenCalled();
      expect(mockAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/licenses/test-license-key/validate'),
        expect.any(Object)
      );
      expect(mockRedisService.set).toHaveBeenCalledWith(
        'license:tenant-123',
        serverResponse.data,
        300
      );
      expect(req.licenseFeatures).toEqual(['payroll', 'attendance', 'leave']);
      expect(next).toHaveBeenCalled();
    });

    test('should return 402 when license server returns invalid', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPlatformDb.query.mockResolvedValue([[{ license_key: 'test-license-key' }]]);
      
      const serverResponse = {
        data: {
          success: true,
          valid: false,
          reason: 'License has expired'
        }
      };
      
      mockAxios.get.mockResolvedValue(serverResponse);
      
      await validateLicense(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(402);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'LICENSE_INVALID'
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('should fail-open when license server is unreachable', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPlatformDb.query.mockResolvedValue([[{ license_key: 'test-license-key' }]]);
      
      const error = new Error('connect ECONNREFUSED');
      error.code = 'ECONNREFUSED';
      mockAxios.get.mockRejectedValue(error);
      
      await validateLicense(req, res, next);
      
      expect(req.licenseFeatures).toEqual([]);
      expect(req.licenseValidation.failedOpen).toBe(true);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should return 402 when no license key found for tenant', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPlatformDb.query.mockResolvedValue([[]]);
      
      await validateLicense(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(402);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'LICENSE_INVALID',
          reason: 'No license key configured for tenant'
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Circuit Breaker', () => {
    test('should open circuit breaker after 5 consecutive failures', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPlatformDb.query.mockResolvedValue([[{ license_key: 'test-license-key' }]]);
      
      const error = new Error('connect ECONNREFUSED');
      error.code = 'ECONNREFUSED';
      mockAxios.get.mockRejectedValue(error);
      
      // Trigger 5 failures
      for (let i = 0; i < 5; i++) {
        await validateLicense(req, res, next);
      }
      
      const status = getCircuitBreakerStatus();
      expect(status.isOpen).toBe(true);
      expect(status.failures).toBe(5);
    });

    test('should skip license server calls when circuit breaker is open', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPlatformDb.query.mockResolvedValue([[{ license_key: 'test-license-key' }]]);
      
      const error = new Error('connect ECONNREFUSED');
      error.code = 'ECONNREFUSED';
      mockAxios.get.mockRejectedValue(error);
      
      // Open circuit breaker
      for (let i = 0; i < 5; i++) {
        await validateLicense(req, res, next);
      }
      
      jest.clearAllMocks();
      
      // Next call should skip license server
      await validateLicense(req, res, next);
      
      expect(mockAxios.get).not.toHaveBeenCalled();
      expect(req.licenseValidation.failedOpen).toBe(true);
      expect(next).toHaveBeenCalled();
    });

    test('should reset circuit breaker on successful call', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPlatformDb.query.mockResolvedValue([[{ license_key: 'test-license-key' }]]);
      
      // First fail to increment counter
      const error = new Error('connect ECONNREFUSED');
      error.code = 'ECONNREFUSED';
      mockAxios.get.mockRejectedValueOnce(error);
      
      await validateLicense(req, res, next);
      
      let status = getCircuitBreakerStatus();
      expect(status.failures).toBe(1);
      
      // Then succeed
      const serverResponse = {
        data: {
          success: true,
          valid: true,
          features: ['payroll'],
          tenantId: 'tenant-123'
        }
      };
      mockAxios.get.mockResolvedValue(serverResponse);
      
      await validateLicense(req, res, next);
      
      status = getCircuitBreakerStatus();
      expect(status.failures).toBe(0);
      expect(status.isOpen).toBe(false);
    });
  });

  describe('requireFeature', () => {
    test('should allow access when feature is licensed', () => {
      req.licenseFeatures = ['payroll', 'attendance'];
      req.licenseValidation = { valid: true };
      
      const middleware = requireFeature('payroll');
      middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should deny access when feature is not licensed', () => {
      req.licenseFeatures = ['attendance'];
      req.licenseValidation = { valid: true };
      
      const middleware = requireFeature('payroll');
      middleware(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'FEATURE_NOT_LICENSED',
          feature: 'payroll'
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('should allow access when license validation failed open', () => {
      req.licenseFeatures = [];
      req.licenseValidation = { failedOpen: true };
      
      const middleware = requireFeature('payroll');
      middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
