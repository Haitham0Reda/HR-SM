/**
 * License Controller Integration Tests
 * 
 * Tests all license API endpoints with authentication, validation, and error handling
 * Validates complete request-response flows for license management operations
 * 
 * Requirements: 4.3 - License server API endpoints fully functional
 */

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../server.js';
import License from '../models/License.js';
import { initializeDefaultApiKeys } from '../middleware/apiKeyAuth.middleware.js';

describe('License Controller Integration Tests', () => {
  let platformAdminApiKey;
  let hrsmBackendApiKey;
  let testLicense;
  let testLicenseToken;

  beforeAll(async () => {
    // Initialize API keys
    const apiKeys = initializeDefaultApiKeys();
    platformAdminApiKey = apiKeys.platformAdmin;
    hrsmBackendApiKey = apiKeys.hrsmBackend;

    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hrsm-licenses-test');
    }
  });

  beforeEach(async () => {
    // Clean up test data
    await License.deleteMany({});
  });

  afterAll(async () => {
    // Clean up and close connection
    await License.deleteMany({});
    await mongoose.connection.close();
  });

  describe('POST /licenses/create', () => {
    it('should create a new license with valid data', async () => {
      const licenseData = {
        tenantId: 'test-tenant-001',
        tenantName: 'Test Company',
        type: 'professional',
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        modules: ['hr-core', 'payroll'],
        maxUsers: 100,
        maxStorage: 5000,
        maxAPICallsPerMonth: 50000
      };

      const response = await request(app)
        .post('/licenses/create')
        .set('X-API-Key', platformAdminApiKey)
        .send(licenseData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.licenseNumber).toMatch(/^HRSM-\d{4}-\d+$/);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.type).toBe('professional');
      expect(response.body.data.status).toBe('active');

      // Store for other tests
      testLicense = response.body.data;
      testLicenseToken = response.body.data.token;
    });

    it('should reject license creation without authentication', async () => {
      const licenseData = {
        tenantId: 'test-tenant-001',
        tenantName: 'Test Company',
        type: 'professional',
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      };

      await request(app)
        .post('/licenses/create')
        .send(licenseData)
        .expect(401);
    });

    it('should reject license creation with invalid data', async () => {
      const invalidData = {
        tenantId: '', // Invalid: empty
        tenantName: 'Test Company',
        type: 'invalid-type', // Invalid: not in enum
        expiresAt: 'invalid-date' // Invalid: not ISO date
      };

      const response = await request(app)
        .post('/licenses/create')
        .set('X-API-Key', platformAdminApiKey)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should reject license creation with past expiry date', async () => {
      const licenseData = {
        tenantId: 'test-tenant-001',
        tenantName: 'Test Company',
        type: 'professional',
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Yesterday
      };

      const response = await request(app)
        .post('/licenses/create')
        .set('X-API-Key', platformAdminApiKey)
        .send(licenseData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /licenses/validate', () => {
    beforeEach(async () => {
      // Create a test license first
      const licenseData = {
        tenantId: 'test-tenant-001',
        tenantName: 'Test Company',
        type: 'professional',
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        modules: ['hr-core', 'payroll'],
        maxUsers: 100
      };

      const createResponse = await request(app)
        .post('/licenses/create')
        .set('X-API-Key', platformAdminApiKey)
        .send(licenseData);

      testLicense = createResponse.body.data;
      testLicenseToken = createResponse.body.data.token;
    });

    it('should validate a valid license token', async () => {
      const validationData = {
        token: testLicenseToken,
        machineId: 'test-machine-001',
        ipAddress: '192.168.1.100'
      };

      const response = await request(app)
        .post('/licenses/validate')
        .set('X-API-Key', hrsmBackendApiKey)
        .send(validationData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.valid).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.licenseNumber).toBe(testLicense.licenseNumber);
    });

    it('should reject validation without authentication', async () => {
      const validationData = {
        token: testLicenseToken,
        machineId: 'test-machine-001'
      };

      await request(app)
        .post('/licenses/validate')
        .send(validationData)
        .expect(401);
    });

    it('should reject invalid token format', async () => {
      const validationData = {
        token: 'invalid-token-format',
        machineId: 'test-machine-001'
      };

      const response = await request(app)
        .post('/licenses/validate')
        .set('X-API-Key', hrsmBackendApiKey)
        .send(validationData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle expired license token', async () => {
      // Create an expired license
      const expiredLicenseData = {
        tenantId: 'expired-tenant',
        tenantName: 'Expired Company',
        type: 'trial',
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Yesterday
      };

      const createResponse = await request(app)
        .post('/licenses/create')
        .set('X-API-Key', platformAdminApiKey)
        .send(expiredLicenseData);

      const expiredToken = createResponse.body.data.token;

      const validationData = {
        token: expiredToken,
        machineId: 'test-machine-001'
      };

      const response = await request(app)
        .post('/licenses/validate')
        .set('X-API-Key', hrsmBackendApiKey)
        .send(validationData)
        .expect(200);

      expect(response.body.success).toBe(false);
      expect(response.body.valid).toBe(false);
      expect(response.body.error).toContain('expired');
    });
  });

  describe('GET /licenses/:licenseNumber', () => {
    beforeEach(async () => {
      // Create a test license first
      const licenseData = {
        tenantId: 'test-tenant-001',
        tenantName: 'Test Company',
        type: 'professional',
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      };

      const createResponse = await request(app)
        .post('/licenses/create')
        .set('X-API-Key', platformAdminApiKey)
        .send(licenseData);

      testLicense = createResponse.body.data;
    });

    it('should get license details with valid license number', async () => {
      const response = await request(app)
        .get(`/licenses/${testLicense.licenseNumber}`)
        .set('X-API-Key', platformAdminApiKey)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.licenseNumber).toBe(testLicense.licenseNumber);
      expect(response.body.data.tenantId).toBe('test-tenant-001');
      expect(response.body.data.type).toBe('professional');
    });

    it('should return 404 for non-existent license', async () => {
      const response = await request(app)
        .get('/licenses/HRSM-2024-NONEXISTENT')
        .set('X-API-Key', platformAdminApiKey)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('License not found');
    });

    it('should reject request without authentication', async () => {
      await request(app)
        .get(`/licenses/${testLicense.licenseNumber}`)
        .expect(401);
    });

    it('should reject invalid license number format', async () => {
      const response = await request(app)
        .get('/licenses/invalid-format')
        .set('X-API-Key', platformAdminApiKey)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PATCH /licenses/:licenseNumber/renew', () => {
    beforeEach(async () => {
      // Create a test license first
      const licenseData = {
        tenantId: 'test-tenant-001',
        tenantName: 'Test Company',
        type: 'professional',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
      };

      const createResponse = await request(app)
        .post('/licenses/create')
        .set('X-API-Key', platformAdminApiKey)
        .send(licenseData);

      testLicense = createResponse.body.data;
    });

    it('should renew license with valid data', async () => {
      const renewalData = {
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        notes: 'Renewed for another year'
      };

      const response = await request(app)
        .patch(`/licenses/${testLicense.licenseNumber}/renew`)
        .set('X-API-Key', platformAdminApiKey)
        .send(renewalData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.licenseNumber).toBe(testLicense.licenseNumber);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.status).toBe('active');
      expect(new Date(response.body.data.expiresAt)).toBeInstanceOf(Date);
    });

    it('should reject renewal without authentication', async () => {
      const renewalData = {
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      };

      await request(app)
        .patch(`/licenses/${testLicense.licenseNumber}/renew`)
        .send(renewalData)
        .expect(401);
    });

    it('should reject renewal with past expiry date', async () => {
      const renewalData = {
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Yesterday
      };

      const response = await request(app)
        .patch(`/licenses/${testLicense.licenseNumber}/renew`)
        .set('X-API-Key', platformAdminApiKey)
        .send(renewalData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent license', async () => {
      const renewalData = {
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      };

      const response = await request(app)
        .patch('/licenses/HRSM-2024-NONEXISTENT/renew')
        .set('X-API-Key', platformAdminApiKey)
        .send(renewalData)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /licenses/:licenseNumber', () => {
    beforeEach(async () => {
      // Create a test license first
      const licenseData = {
        tenantId: 'test-tenant-001',
        tenantName: 'Test Company',
        type: 'professional',
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      };

      const createResponse = await request(app)
        .post('/licenses/create')
        .set('X-API-Key', platformAdminApiKey)
        .send(licenseData);

      testLicense = createResponse.body.data;
    });

    it('should revoke license with valid reason', async () => {
      const revocationData = {
        reason: 'License violation - unauthorized usage detected'
      };

      const response = await request(app)
        .delete(`/licenses/${testLicense.licenseNumber}`)
        .set('X-API-Key', platformAdminApiKey)
        .send(revocationData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.licenseNumber).toBe(testLicense.licenseNumber);
      expect(response.body.data.status).toBe('revoked');
    });

    it('should reject revocation without authentication', async () => {
      const revocationData = {
        reason: 'Test revocation'
      };

      await request(app)
        .delete(`/licenses/${testLicense.licenseNumber}`)
        .send(revocationData)
        .expect(401);
    });

    it('should reject revocation without reason', async () => {
      const response = await request(app)
        .delete(`/licenses/${testLicense.licenseNumber}`)
        .set('X-API-Key', platformAdminApiKey)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject revocation with short reason', async () => {
      const revocationData = {
        reason: 'Bad' // Too short
      };

      const response = await request(app)
        .delete(`/licenses/${testLicense.licenseNumber}`)
        .set('X-API-Key', platformAdminApiKey)
        .send(revocationData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /licenses/tenant/:tenantId', () => {
    beforeEach(async () => {
      // Create multiple licenses for the same tenant
      const licenseData1 = {
        tenantId: 'multi-license-tenant',
        tenantName: 'Multi License Company',
        type: 'trial',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      };

      const licenseData2 = {
        tenantId: 'multi-license-tenant',
        tenantName: 'Multi License Company',
        type: 'professional',
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      };

      await request(app)
        .post('/licenses/create')
        .set('X-API-Key', platformAdminApiKey)
        .send(licenseData1);

      await request(app)
        .post('/licenses/create')
        .set('X-API-Key', platformAdminApiKey)
        .send(licenseData2);
    });

    it('should get all licenses for a tenant', async () => {
      const response = await request(app)
        .get('/licenses/tenant/multi-license-tenant')
        .set('X-API-Key', platformAdminApiKey)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tenantId).toBe('multi-license-tenant');
      expect(response.body.data.licenses).toHaveLength(2);
      expect(response.body.data.count).toBe(2);
      expect(response.body.data.activeLicense).toBeDefined();
    });

    it('should return empty array for tenant with no licenses', async () => {
      const response = await request(app)
        .get('/licenses/tenant/no-licenses-tenant')
        .set('X-API-Key', platformAdminApiKey)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.licenses).toHaveLength(0);
      expect(response.body.data.count).toBe(0);
      expect(response.body.data.activeLicense).toBeNull();
    });

    it('should reject request without authentication', async () => {
      await request(app)
        .get('/licenses/tenant/multi-license-tenant')
        .expect(401);
    });
  });

  describe('GET /licenses', () => {
    beforeEach(async () => {
      // Create multiple licenses with different types and statuses
      const licenses = [
        {
          tenantId: 'tenant-001',
          tenantName: 'Company A',
          type: 'trial',
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          tenantId: 'tenant-002',
          tenantName: 'Company B',
          type: 'professional',
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          tenantId: 'tenant-003',
          tenantName: 'Company C',
          type: 'enterprise',
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];

      for (const licenseData of licenses) {
        await request(app)
          .post('/licenses/create')
          .set('X-API-Key', platformAdminApiKey)
          .send(licenseData);
      }
    });

    it('should list all licenses with pagination', async () => {
      const response = await request(app)
        .get('/licenses?page=1&limit=2')
        .set('X-API-Key', platformAdminApiKey)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.licenses).toHaveLength(2);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(2);
      expect(response.body.data.pagination.total).toBe(3);
      expect(response.body.data.pagination.pages).toBe(2);
    });

    it('should filter licenses by type', async () => {
      const response = await request(app)
        .get('/licenses?type=professional')
        .set('X-API-Key', platformAdminApiKey)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.licenses).toHaveLength(1);
      expect(response.body.data.licenses[0].type).toBe('professional');
    });

    it('should filter licenses by status', async () => {
      const response = await request(app)
        .get('/licenses?status=active')
        .set('X-API-Key', platformAdminApiKey)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.licenses.length).toBeGreaterThan(0);
      response.body.data.licenses.forEach(license => {
        expect(license.status).toBe('active');
      });
    });

    it('should search licenses by tenant name', async () => {
      const response = await request(app)
        .get('/licenses?search=Company A')
        .set('X-API-Key', platformAdminApiKey)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.licenses).toHaveLength(1);
      expect(response.body.data.licenses[0].tenantName).toBe('Company A');
    });

    it('should reject request without authentication', async () => {
      await request(app)
        .get('/licenses')
        .expect(401);
    });
  });

  describe('GET /licenses/stats', () => {
    beforeEach(async () => {
      // Create licenses with different types and statuses for statistics
      const licenses = [
        {
          tenantId: 'stats-tenant-001',
          tenantName: 'Stats Company A',
          type: 'trial',
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          tenantId: 'stats-tenant-002',
          tenantName: 'Stats Company B',
          type: 'professional',
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          tenantId: 'stats-tenant-003',
          tenantName: 'Stats Company C',
          type: 'enterprise',
          expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Expired
        }
      ];

      for (const licenseData of licenses) {
        await request(app)
          .post('/licenses/create')
          .set('X-API-Key', platformAdminApiKey)
          .send(licenseData);
      }
    });

    it('should return comprehensive license statistics', async () => {
      const response = await request(app)
        .get('/licenses/stats')
        .set('X-API-Key', platformAdminApiKey)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.overview).toBeDefined();
      expect(response.body.data.overview.total).toBe(3);
      expect(response.body.data.overview.active).toBeGreaterThanOrEqual(2);
      expect(response.body.data.byType).toBeDefined();
      expect(response.body.data.usage).toBeDefined();
      expect(response.body.data.recentActivations).toBeDefined();
      expect(response.body.data.expiringLicenses).toBeDefined();
      expect(response.body.data.timestamp).toBeDefined();
    });

    it('should include license type breakdown', async () => {
      const response = await request(app)
        .get('/licenses/stats')
        .set('X-API-Key', platformAdminApiKey)
        .expect(200);

      expect(response.body.data.byType.trial).toBe(1);
      expect(response.body.data.byType.professional).toBe(1);
      expect(response.body.data.byType.enterprise).toBe(1);
    });

    it('should include usage statistics', async () => {
      const response = await request(app)
        .get('/licenses/stats')
        .set('X-API-Key', platformAdminApiKey)
        .expect(200);

      expect(response.body.data.usage.totalUsers).toBeDefined();
      expect(response.body.data.usage.totalStorage).toBeDefined();
      expect(response.body.data.usage.totalValidations).toBeDefined();
      expect(response.body.data.usage.averageUsers).toBeDefined();
      expect(response.body.data.usage.averageStorage).toBeDefined();
    });

    it('should reject request without authentication', async () => {
      await request(app)
        .get('/licenses/stats')
        .expect(401);
    });
  });

  describe('PATCH /licenses/:licenseNumber/usage', () => {
    beforeEach(async () => {
      // Create a test license first
      const licenseData = {
        tenantId: 'usage-tenant-001',
        tenantName: 'Usage Test Company',
        type: 'professional',
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      };

      const createResponse = await request(app)
        .post('/licenses/create')
        .set('X-API-Key', platformAdminApiKey)
        .send(licenseData);

      testLicense = createResponse.body.data;
    });

    it('should update license usage with valid data', async () => {
      const usageData = {
        currentUsers: 25,
        currentStorage: 1500
      };

      const response = await request(app)
        .patch(`/licenses/${testLicense.licenseNumber}/usage`)
        .set('X-API-Key', hrsmBackendApiKey)
        .send(usageData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.licenseNumber).toBe(testLicense.licenseNumber);
      expect(response.body.data.usage.currentUsers).toBe(25);
      expect(response.body.data.usage.currentStorage).toBe(1500);
    });

    it('should update only specified usage fields', async () => {
      const usageData = {
        currentUsers: 50
        // currentStorage not specified
      };

      const response = await request(app)
        .patch(`/licenses/${testLicense.licenseNumber}/usage`)
        .set('X-API-Key', hrsmBackendApiKey)
        .send(usageData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.usage.currentUsers).toBe(50);
      // currentStorage should remain unchanged (0 by default)
    });

    it('should reject usage update without authentication', async () => {
      const usageData = {
        currentUsers: 25
      };

      await request(app)
        .patch(`/licenses/${testLicense.licenseNumber}/usage`)
        .send(usageData)
        .expect(401);
    });

    it('should reject negative usage values', async () => {
      const usageData = {
        currentUsers: -5,
        currentStorage: -100
      };

      const response = await request(app)
        .patch(`/licenses/${testLicense.licenseNumber}/usage`)
        .set('X-API-Key', hrsmBackendApiKey)
        .send(usageData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent license', async () => {
      const usageData = {
        currentUsers: 25
      };

      const response = await request(app)
        .patch('/licenses/HRSM-2024-NONEXISTENT/usage')
        .set('X-API-Key', hrsmBackendApiKey)
        .send(usageData)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Temporarily close the database connection
      await mongoose.connection.close();

      const response = await request(app)
        .get('/licenses/stats')
        .set('X-API-Key', platformAdminApiKey)
        .expect(500);

      expect(response.body.success).toBe(false);

      // Reconnect for other tests
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hrsm-licenses-test');
    });

    it('should handle malformed JSON requests', async () => {
      const response = await request(app)
        .post('/licenses/create')
        .set('X-API-Key', platformAdminApiKey)
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle injection attempts', async () => {
      const maliciousData = {
        tenantId: '{ "$ne": null }',
        tenantName: '<script>alert("xss")</script>',
        type: 'professional',
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      };

      const response = await request(app)
        .post('/licenses/create')
        .set('X-API-Key', platformAdminApiKey)
        .send(maliciousData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});