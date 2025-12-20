/**
 * License Server Validation Middleware Tests
 * Tests the integration with the separate license server
 */

import { validateLicense, requireFeature, getValidationStats, clearValidationCache } from '../../middleware/licenseServerValidation.middleware.js';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

describe('License Server Validation Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      path: '/api/v1/test',
      tenantId: 'test-tenant-123',
      tenant: {
        id: 'test-tenant-123',
        license: {
          licenseKey: 'test-license-token'
        }
      },
      headers: {}
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    next = jest.fn();

    // Clear cache before each test
    clearValidationCache();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateLicense middleware', () => {
    it('should skip validation for platform routes', async () => {
      req.path = '/api/platform/test';

      await validateLicense(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('should allow request to continue when no tenant ID is found', async () => {
      req.tenantId = null;
      req.tenant = null;

      await validateLicense(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('should return 403 when no license token is found', async () => {
      req.tenant.license.licenseKey = null;

      await validateLicense(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'LICENSE_REQUIRED',
        message: 'Valid license required to access this service',
        tenantId: 'test-tenant-123'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should validate license with license server successfully', async () => {
      const mockResponse = {
        data: {
          valid: true,
          features: ['hr-core', 'tasks'],
          expiresAt: '2024-12-31T23:59:59Z',
          licenseType: 'professional',
          maxUsers: 100,
          maxStorage: 10240,
          maxAPI: 100000
        }
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      await validateLicense(req, res, next);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:4000/licenses/validate',
        expect.objectContaining({
          token: 'test-license-token',
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

      expect(req.licenseInfo).toEqual({
        valid: true,
        features: ['hr-core', 'tasks'],
        expiresAt: '2024-12-31T23:59:59Z',
        licenseType: 'professional',
        maxUsers: 100,
        maxStorage: 10240,
        maxAPI: 100000,
        cached: false
      });

      expect(next).toHaveBeenCalled();
    });

    it('should return 403 when license is invalid', async () => {
      const mockResponse = {
        data: {
          valid: false,
          error: 'LICENSE_EXPIRED',
          reason: 'License has expired'
        }
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      await validateLicense(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'LICENSE_EXPIRED',
        message: 'License has expired',
        tenantId: 'test-tenant-123'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 503 when license server is unavailable', async () => {
      mockedAxios.post.mockRejectedValue(new Error('ECONNREFUSED'));

      await validateLicense(req, res, next);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'LICENSE_SERVER_UNAVAILABLE',
        message: 'License validation service is temporarily unavailable',
        details: 'ECONNREFUSED'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should use cached validation result', async () => {
      const mockResponse = {
        data: {
          valid: true,
          features: ['hr-core'],
          expiresAt: '2024-12-31T23:59:59Z',
          licenseType: 'basic'
        }
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      // First call
      await validateLicense(req, res, next);
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);

      // Reset mocks
      jest.clearAllMocks();

      // Second call should use cache
      await validateLicense(req, res, next);
      expect(mockedAxios.post).not.toHaveBeenCalled();
      expect(req.licenseInfo.cached).toBe(true);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('requireFeature middleware', () => {
    beforeEach(() => {
      req.licenseInfo = {
        valid: true,
        features: ['hr-core', 'tasks', 'reports']
      };
    });

    it('should allow access when feature is licensed', () => {
      const middleware = requireFeature('tasks');
      
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.featureAvailable).toBe(true);
      expect(req.licenseRestricted).toBe(false);
    });

    it('should deny access when feature is not licensed', () => {
      const middleware = requireFeature('life-insurance');
      
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'FEATURE_NOT_LICENSED',
        message: "Feature 'life-insurance' is not included in your license",
        feature: 'life-insurance',
        availableFeatures: ['hr-core', 'tasks', 'reports'],
        upgradeUrl: '/pricing?feature=life-insurance'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow degraded access for optional features', () => {
      const middleware = requireFeature('life-insurance', { optional: true });
      
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.featureAvailable).toBe(false);
      expect(req.licenseRestricted).toBe(true);
    });

    it('should deny access when no valid license', () => {
      req.licenseInfo = null;
      const middleware = requireFeature('tasks');
      
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'LICENSE_REQUIRED',
        message: 'Valid license required for this feature',
        feature: 'tasks'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('getValidationStats', () => {
    it('should return validation statistics', () => {
      const stats = getValidationStats();

      expect(stats).toEqual({
        totalEntries: 0,
        validEntries: 0,
        expiredEntries: 0,
        offlineEntries: 0,
        cacheTTL: 15 * 60 * 1000,
        offlineGracePeriod: 60 * 60 * 1000,
        licenseServerUrl: 'http://localhost:4000'
      });
    });
  });

  describe('machine ID generation', () => {
    it('should generate consistent machine ID', async () => {
      const mockResponse = {
        data: {
          valid: true,
          features: ['hr-core']
        }
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      // Call twice
      await validateLicense(req, res, next);
      const firstCall = mockedAxios.post.mock.calls[0];
      
      jest.clearAllMocks();
      clearValidationCache();
      
      await validateLicense(req, res, next);
      const secondCall = mockedAxios.post.mock.calls[0];

      // Machine ID should be the same
      expect(firstCall[1].machineId).toBe(secondCall[1].machineId);
      expect(firstCall[1].machineId).toMatch(/^[a-f0-9]{32}$/);
    });
  });
});