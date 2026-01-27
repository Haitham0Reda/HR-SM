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
} from '../licenseCache.js';

// Mock dependencies
const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: mockLogger
}));

// Mock CompanyLicense model
const mockCompanyLicense = {
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  updateOne: jest.fn(),
  countDocuments: jest.fn()
};

jest.unstable_mockModule('../../modules/licensing/models/companyLicense.model.js', () => ({
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
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Retrieved cached license',
        expect.objectContaining({
          tenantId: 'test_tenant'
        })
      );
    });

    it('should return null when no cache exists', async () => {
      mockCompanyLicense.findOne.mockResolvedValue(null);

      const result = await getCachedLicense('nonexistent_tenant');

      expect(result).toBeNull();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'No cached license found',
        { tenantId: 'nonexistent_tenant' }
      );
    });

    it('should throw error when tenantId is missing', async () => {
      await expect(getCachedLicense(null)).rejects.toThrow('Tenant ID is required');
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database connection failed');
      mockCompanyLicense.findOne.mockRejectedValue(dbError);

      await expect(getCachedLicense('test_tenant')).rejects.toThrow(dbError);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to get cached license',
        expect.objectContaining({
          tenantId: 'test_tenant',
          error: 'Database connection failed'
        })
      );
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
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Cache staleness check',
        expect.objectContaining({
          companyId: 'test_tenant',
          isStale: false
        })
      );
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
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Cache staleness check',
        expect.objectContaining({
          companyId: 'test_tenant',
          isStale: true
        })
      );
    });

    it('should return true when cache is exactly at TTL boundary', () => {
      const boundaryCache = {
        companyId: 'test_tenant',
        quickAccess: {
          lastSyncedAt: new Date(Date.now() - CACHE_TTL - 1000) // Just over 6 hours
        }
      };

      const result = isCacheStale(boundaryCache);

      expect(result).toBe(true);
    });

    it('should return true when no cached license provided', () => {
      const result = isCacheStale(null);

      expect(result).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Cache is stale: no cached license provided'
      );
    });

    it('should return true when lastSyncedAt is missing', () => {
      const cacheWithoutTimestamp = {
        companyId: 'test_tenant',
        quickAccess: {}
      };

      const result = isCacheStale(cacheWithoutTimestamp);

      expect(result).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Cache is stale: no lastSyncedAt timestamp found',
        { companyId: 'test_tenant' }
      );
    });

    it('should check cacheInfo.lastSyncedFromServer as fallback', () => {
      const cacheWithOldFormat = {
        companyId: 'test_tenant',
        cacheInfo: {
          lastSyncedFromServer: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
        }
      };

      const result = isCacheStale(cacheWithOldFormat);

      expect(result).toBe(false);
    });

    it('should handle errors gracefully and return true', () => {
      const invalidCache = {
        companyId: 'test_tenant',
        quickAccess: {
          lastSyncedAt: 'invalid-date'
        }
      };

      const result = isCacheStale(invalidCache);

      expect(result).toBe(true);
      expect(mockLogger.error).toHaveBeenCalled();
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
      expect(mockCompanyLicense.findOneAndUpdate).toHaveBeenCalledWith(
        { companyId: 'test_tenant' },
        expect.objectContaining({
          $set: expect.objectContaining({
            'quickAccess.enabledModules': licenseData.enabledModules,
            'quickAccess.subscriptionStatus': 'active',
            'quickAccess.licenseValid': true
          })
        }),
        expect.objectContaining({
          upsert: true,
          new: true,
          runValidators: false
        })
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'License cache updated successfully',
        expect.objectContaining({
          tenantId: 'test_tenant',
          enabledModules: 3,
          subscriptionStatus: 'active'
        })
      );
    });

    it('should create new cache entry if none exists (upsert)', async () => {
      const licenseData = {
        enabledModules: ['surveys'],
        subscription: { status: 'active' }
      };

      mockCompanyLicense.findOneAndUpdate.mockResolvedValue({
        companyId: 'new_tenant',
        quickAccess: { enabledModules: ['surveys'] }
      });

      await updateLicenseCache('new_tenant', licenseData);

      expect(mockCompanyLicense.findOneAndUpdate).toHaveBeenCalledWith(
        { companyId: 'new_tenant' },
        expect.objectContaining({
          $setOnInsert: expect.objectContaining({
            companyId: 'new_tenant'
          })
        }),
        expect.objectContaining({ upsert: true })
      );
    });

    it('should throw error when tenantId is missing', async () => {
      await expect(updateLicenseCache(null, {})).rejects.toThrow('Tenant ID is required');
    });

    it('should throw error when licenseData is missing', async () => {
      await expect(updateLicenseCache('test_tenant', null)).rejects.toThrow(
        'License data is required'
      );
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Update failed');
      mockCompanyLicense.findOneAndUpdate.mockRejectedValue(dbError);

      await expect(
        updateLicenseCache('test_tenant', { enabledModules: [] })
      ).rejects.toThrow(dbError);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to update license cache',
        expect.objectContaining({
          tenantId: 'test_tenant',
          error: 'Update failed'
        })
      );
    });

    it('should handle missing subscription data gracefully', async () => {
      const licenseData = {
        enabledModules: ['surveys']
        // No subscription field
      };

      mockCompanyLicense.findOneAndUpdate.mockResolvedValue({});

      await updateLicenseCache('test_tenant', licenseData);

      expect(mockCompanyLicense.findOneAndUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          $set: expect.objectContaining({
            'quickAccess.subscriptionStatus': 'unknown'
          })
        }),
        expect.anything()
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
      expect(mockCompanyLicense.updateOne).toHaveBeenCalledWith(
        { companyId: 'test_tenant' },
        {
          $set: {
            'quickAccess.lastSyncedAt': new Date(0),
            'cacheInfo.lastSyncedFromServer': new Date(0)
          }
        }
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'License cache invalidated',
        expect.objectContaining({
          tenantId: 'test_tenant',
          modifiedCount: 1
        })
      );
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
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'No cache entry found to invalidate',
        { tenantId: 'nonexistent_tenant' }
      );
    });

    it('should throw error when tenantId is missing', async () => {
      await expect(invalidateCache(null)).rejects.toThrow('Tenant ID is required');
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Invalidation failed');
      mockCompanyLicense.updateOne.mockRejectedValue(dbError);

      await expect(invalidateCache('test_tenant')).rejects.toThrow(dbError);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to invalidate license cache',
        expect.objectContaining({
          tenantId: 'test_tenant',
          error: 'Invalidation failed'
        })
      );
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
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Cache statistics retrieved',
        expect.objectContaining({
          total: 10,
          fresh: 7,
          stale: 3
        })
      );
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

    it('should handle database errors', async () => {
      const dbError = new Error('Query failed');
      mockCompanyLicense.countDocuments.mockRejectedValue(dbError);

      await expect(getCacheStats()).rejects.toThrow(dbError);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to get cache statistics',
        expect.objectContaining({
          error: 'Query failed'
        })
      );
    });
  });

  describe('CACHE_TTL constant', () => {
    it('should be 6 hours in milliseconds', () => {
      const expectedTTL = 6 * 60 * 60 * 1000;
      expect(CACHE_TTL).toBe(expectedTTL);
    });
  });
});
