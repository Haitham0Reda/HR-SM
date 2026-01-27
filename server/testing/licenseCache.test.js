/**
 * License Cache Service Tests
 * 
 * Unit tests for license cache management functions
 * Tests cache operations, staleness checks, and error handling
 */

import { jest } from '@jest/globals';
import {
  getCachedLicense,
  isCacheStale,
  updateLicenseCache,
  invalidateCache,
  getCacheStats,
  CACHE_TTL
} from '../services/licenseCache.js';

// Mock dependencies
const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

jest.unstable_mockModule('../utils/logger.js', () => ({
  default: mockLogger
}));

// Mock CompanyLicense model
const mockCompanyLicense = {
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  updateOne: jest.fn(),
  countDocuments: jest.fn()
};

jest.unstable_mockModule('../modules/licensing/models/companyLicense.model.js', () => ({
  default: mockCompanyLicense
}));

describe('License Cache Service', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('getCachedLicense', () => {
    it('should retrieve cached license data', async () => {
      const mockCachedData = {
        companyId: 'test_tenant',
        quickAccess: {
          enabledModules: ['surveys', 'payroll'],
          lastSyncedAt: new Date(),
          subscriptionStatus: 'active'
        }
      };

      mockCompanyLicense.findOne.mockResolvedValue(mockCachedData);

      const result = await getCachedLicense('test_tenant');

      expect(result).toEqual(mockCachedData);
      expect(mockCompanyLicense.findOne).toHaveBeenCalledWith({
        companyId: 'test_tenant'
      });
    });

    it('should return null when no cache exists', async () => {
      mockCompanyLicense.findOne.mockResolvedValue(null);

      const result = await getCachedLicense('nonexistent_tenant');

      expect(result).toBeNull();
    });

    it('should throw error when tenantId is missing', async () => {
      await expect(getCachedLicense(null)).rejects.toThrow('Tenant ID is required');
    });
  });

  describe('isCacheStale', () => {
    it('should return false for fresh cache (less than 6 hours old)', () => {
      const freshCache = {
        companyId: 'test_tenant',
        quickAccess: {
          lastSyncedAt: new Date(Date.now() - 3 * 60 * 60 * 1000) // 3 hours ago
        }
      };

      const result = isCacheStale(freshCache);

      expect(result).toBe(false);
    });

    it('should return true for stale cache (more than 6 hours old)', () => {
      const staleCache = {
        companyId: 'test_tenant',
        quickAccess: {
          lastSyncedAt: new Date(Date.now() - 7 * 60 * 60 * 1000) // 7 hours ago
        }
      };

      const result = isCacheStale(staleCache);

      expect(result).toBe(true);
    });

    it('should return true when no cached license provided', () => {
      const result = isCacheStale(null);

      expect(result).toBe(true);
    });

    it('should return true when lastSyncedAt is missing', () => {
      const cacheWithoutTimestamp = {
        companyId: 'test_tenant',
        quickAccess: {}
      };

      const result = isCacheStale(cacheWithoutTimestamp);

      expect(result).toBe(true);
    });
  });

  describe('updateLicenseCache', () => {
    it('should update cache with fresh license data', async () => {
      const licenseData = {
        enabledModules: ['surveys', 'payroll', 'attendance'],
        subscription: {
          status: 'active',
          expiresAt: new Date('2026-12-31')
        },
        licenseId: 'lic_123',
        licenseNumber: 'LIC-TEST-001'
      };

      const mockUpdatedDoc = {
        companyId: 'test_tenant',
        quickAccess: {
          enabledModules: licenseData.enabledModules,
          subscriptionStatus: 'active',
          licenseValid: true
        }
      };

      mockCompanyLicense.findOneAndUpdate.mockResolvedValue(mockUpdatedDoc);

      const result = await updateLicenseCache('test_tenant', licenseData);

      expect(result).toEqual(mockUpdatedDoc);
      expect(mockCompanyLicense.findOneAndUpdate).toHaveBeenCalled();
    });

    it('should throw error when tenantId is missing', async () => {
      await expect(updateLicenseCache(null, {})).rejects.toThrow('Tenant ID is required');
    });

    it('should throw error when licenseData is missing', async () => {
      await expect(updateLicenseCache('test_tenant', null)).rejects.toThrow(
        'License data is required'
      );
    });
  });

  describe('invalidateCache', () => {
    it('should invalidate cache by setting lastSyncedAt to epoch', async () => {
      mockCompanyLicense.updateOne.mockResolvedValue({
        matchedCount: 1,
        modifiedCount: 1
      });

      const result = await invalidateCache('test_tenant');

      expect(result).toEqual({
        invalidated: true,
        modifiedCount: 1
      });
      expect(mockCompanyLicense.updateOne).toHaveBeenCalled();
    });

    it('should return not_found when no cache entry exists', async () => {
      mockCompanyLicense.updateOne.mockResolvedValue({
        matchedCount: 0,
        modifiedCount: 0
      });

      const result = await invalidateCache('nonexistent_tenant');

      expect(result).toEqual({
        invalidated: false,
        reason: 'not_found'
      });
    });

    it('should throw error when tenantId is missing', async () => {
      await expect(invalidateCache(null)).rejects.toThrow('Tenant ID is required');
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', async () => {
      mockCompanyLicense.countDocuments
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(7)  // fresh
        .mockResolvedValueOnce(3); // stale

      const stats = await getCacheStats();

      expect(stats).toEqual({
        total: 10,
        fresh: 7,
        stale: 3,
        cacheTtlHours: 6,
        timestamp: expect.any(String)
      });
    });

    it('should handle empty cache', async () => {
      mockCompanyLicense.countDocuments
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const stats = await getCacheStats();

      expect(stats.total).toBe(0);
      expect(stats.fresh).toBe(0);
      expect(stats.stale).toBe(0);
    });
  });

  describe('CACHE_TTL constant', () => {
    it('should be 6 hours in milliseconds', () => {
      const expectedTTL = 6 * 60 * 60 * 1000;
      expect(CACHE_TTL).toBe(expectedTTL);
    });
  });
});
