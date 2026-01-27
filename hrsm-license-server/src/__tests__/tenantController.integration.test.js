import request from 'supertest';
import mongoose from 'mongoose';
import app from '../server.js';
import Tenant from '../models/Tenant.js';
import { generateApiKey } from '../middleware/apiKeyAuth.middleware.js';

/**
 * Tenant Controller Integration Tests
 * 
 * Tests Requirements: 3.1-3.8 - Tenant management API endpoints
 */

describe('Tenant Controller Integration Tests', () => {
  let apiKey;
  let testTenantId;

  beforeAll(async () => {
    // Connect to test database
    const mongoUri = process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/hrsm-licenses-test';
    await mongoose.connect(mongoUri);

    // Generate API key for testing
    const keyData = generateApiKey('test-client', ['read', 'write', 'admin']);
    apiKey = keyData.key;
  });

  afterAll(async () => {
    // Clean up test data
    await Tenant.deleteMany({ tenantId: /^test_/ });
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clean up before each test
    await Tenant.deleteMany({ tenantId: /^test_/ });
    testTenantId = `test_tenant_${Date.now()}`;
  });

  describe('POST /api/tenants - Create Tenant (Requirement 3.3)', () => {
    it('should create a new tenant with valid data', async () => {
      const tenantData = {
        tenantId: testTenantId,
        name: 'Test Company',
        domain: 'test.com',
        contactEmail: 'admin@test.com',
        contactPhone: '+1234567890',
        subscription: {
          status: 'active',
          plan: 'professional',
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        },
        enabledModules: ['surveys', 'payroll']
      };

      const response = await request(app)
        .post('/api/tenants')
        .set('X-API-Key', apiKey)
        .send(tenantData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tenantId).toBe(testTenantId);
      expect(response.body.data.name).toBe('Test Company');
      expect(response.body.data.enabledModules).toEqual(['surveys', 'payroll']);
    });

    it('should return 400 for missing required fields', async () => {
      const invalidData = {
        name: 'Test Company'
        // Missing tenantId, domain, contactEmail
      };

      const response = await request(app)
        .post('/api/tenants')
        .set('X-API-Key', apiKey)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 409 for duplicate tenantId', async () => {
      const tenantData = {
        tenantId: testTenantId,
        name: 'Test Company',
        domain: 'test.com',
        contactEmail: 'admin@test.com'
      };

      // Create first tenant
      await request(app)
        .post('/api/tenants')
        .set('X-API-Key', apiKey)
        .send(tenantData)
        .expect(201);

      // Try to create duplicate
      const response = await request(app)
        .post('/api/tenants')
        .set('X-API-Key', apiKey)
        .send(tenantData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('TENANT_EXISTS');
    });

    it('should return 401 without API key', async () => {
      const tenantData = {
        tenantId: testTenantId,
        name: 'Test Company',
        domain: 'test.com',
        contactEmail: 'admin@test.com'
      };

      await request(app)
        .post('/api/tenants')
        .send(tenantData)
        .expect(401);
    });
  });

  describe('GET /api/tenants - List Tenants (Requirement 3.1)', () => {
    beforeEach(async () => {
      // Create test tenants
      await Tenant.create([
        {
          tenantId: `${testTenantId}_1`,
          name: 'Test Company 1',
          domain: 'test1.com',
          contactEmail: 'admin1@test.com',
          subscription: { status: 'active', plan: 'basic', expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) }
        },
        {
          tenantId: `${testTenantId}_2`,
          name: 'Test Company 2',
          domain: 'test2.com',
          contactEmail: 'admin2@test.com',
          subscription: { status: 'active', plan: 'professional', expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) }
        }
      ]);
    });

    it('should list all tenants with pagination', async () => {
      const response = await request(app)
        .get('/api/tenants')
        .set('X-API-Key', apiKey)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tenants).toBeInstanceOf(Array);
      expect(response.body.data.tenants.length).toBeGreaterThanOrEqual(2);
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.page).toBe(1);
    });

    it('should filter tenants by status', async () => {
      const response = await request(app)
        .get('/api/tenants')
        .set('X-API-Key', apiKey)
        .query({ status: 'active' })
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.tenants.forEach(tenant => {
        expect(tenant.status).toBe('active');
      });
    });

    it('should sort tenants', async () => {
      const response = await request(app)
        .get('/api/tenants')
        .set('X-API-Key', apiKey)
        .query({ sortBy: 'name', sortOrder: 'asc' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tenants).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/tenants/:tenantId - Get Tenant (Requirement 3.2)', () => {
    beforeEach(async () => {
      await Tenant.create({
        tenantId: testTenantId,
        name: 'Test Company',
        domain: 'test.com',
        contactEmail: 'admin@test.com',
        subscription: { status: 'active', plan: 'enterprise', expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) },
        enabledModules: ['surveys', 'payroll', 'attendance']
      });
    });

    it('should retrieve specific tenant details', async () => {
      const response = await request(app)
        .get(`/api/tenants/${testTenantId}`)
        .set('X-API-Key', apiKey)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tenantId).toBe(testTenantId);
      expect(response.body.data.name).toBe('Test Company');
      expect(response.body.data.subscription).toBeDefined();
      expect(response.body.data.enabledModules).toEqual(['surveys', 'payroll', 'attendance']);
    });

    it('should return 404 for non-existent tenant', async () => {
      const response = await request(app)
        .get('/api/tenants/non_existent_tenant')
        .set('X-API-Key', apiKey)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('TENANT_NOT_FOUND');
    });
  });

  describe('PUT /api/tenants/:tenantId - Update Tenant (Requirement 3.4)', () => {
    beforeEach(async () => {
      await Tenant.create({
        tenantId: testTenantId,
        name: 'Test Company',
        domain: 'test.com',
        contactEmail: 'admin@test.com',
        subscription: { status: 'active', plan: 'basic', expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) }
      });
    });

    it('should update tenant information', async () => {
      const updates = {
        name: 'Updated Company Name',
        contactEmail: 'newemail@test.com',
        subscription: {
          plan: 'enterprise'
        }
      };

      const response = await request(app)
        .put(`/api/tenants/${testTenantId}`)
        .set('X-API-Key', apiKey)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Company Name');
      expect(response.body.data.contactEmail).toBe('newemail@test.com');
      expect(response.body.data.subscription.plan).toBe('enterprise');
    });

    it('should return 404 for non-existent tenant', async () => {
      const response = await request(app)
        .put('/api/tenants/non_existent_tenant')
        .set('X-API-Key', apiKey)
        .send({ name: 'Updated Name' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('TENANT_NOT_FOUND');
    });

    it('should prevent changing tenantId', async () => {
      const response = await request(app)
        .put(`/api/tenants/${testTenantId}`)
        .set('X-API-Key', apiKey)
        .send({ tenantId: 'different_id' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('DELETE /api/tenants/:tenantId - Delete Tenant (Requirement 3.5)', () => {
    beforeEach(async () => {
      await Tenant.create({
        tenantId: testTenantId,
        name: 'Test Company',
        domain: 'test.com',
        contactEmail: 'admin@test.com',
        subscription: { status: 'active', plan: 'basic', expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) }
      });
    });

    it('should soft delete tenant', async () => {
      const response = await request(app)
        .delete(`/api/tenants/${testTenantId}`)
        .set('X-API-Key', apiKey)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('deleted');
      expect(response.body.data.deletedAt).toBeDefined();

      // Verify tenant is soft deleted
      const tenant = await Tenant.findOne({ tenantId: testTenantId });
      expect(tenant.status).toBe('deleted');
      expect(tenant.deletedAt).toBeDefined();
    });

    it('should return 404 for non-existent tenant', async () => {
      const response = await request(app)
        .delete('/api/tenants/non_existent_tenant')
        .set('X-API-Key', apiKey)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('TENANT_NOT_FOUND');
    });
  });

  describe('GET /api/tenants/:tenantId/modules - Get Modules (Requirement 3.6)', () => {
    beforeEach(async () => {
      await Tenant.create({
        tenantId: testTenantId,
        name: 'Test Company',
        domain: 'test.com',
        contactEmail: 'admin@test.com',
        subscription: { status: 'active', plan: 'enterprise', expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) },
        enabledModules: ['surveys', 'payroll', 'attendance']
      });
    });

    it('should retrieve enabled modules', async () => {
      const response = await request(app)
        .get(`/api/tenants/${testTenantId}/modules`)
        .set('X-API-Key', apiKey)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.modules).toEqual(['surveys', 'payroll', 'attendance']);
    });

    it('should return 404 for non-existent tenant', async () => {
      const response = await request(app)
        .get('/api/tenants/non_existent_tenant/modules')
        .set('X-API-Key', apiKey)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('TENANT_NOT_FOUND');
    });
  });

  describe('POST /api/tenants/:tenantId/modules/:moduleId - Enable Module (Requirement 3.7)', () => {
    beforeEach(async () => {
      await Tenant.create({
        tenantId: testTenantId,
        name: 'Test Company',
        domain: 'test.com',
        contactEmail: 'admin@test.com',
        subscription: { status: 'active', plan: 'enterprise', expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) },
        enabledModules: ['surveys']
      });
    });

    it('should enable module for tenant', async () => {
      const response = await request(app)
        .post(`/api/tenants/${testTenantId}/modules/payroll`)
        .set('X-API-Key', apiKey)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.enabledModules).toContain('payroll');
      expect(response.body.data.enabledModules).toContain('surveys');
    });

    it('should be idempotent (enabling already enabled module)', async () => {
      const response = await request(app)
        .post(`/api/tenants/${testTenantId}/modules/surveys`)
        .set('X-API-Key', apiKey)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.enabledModules).toEqual(['surveys']);
    });

    it('should return 404 for non-existent tenant', async () => {
      const response = await request(app)
        .post('/api/tenants/non_existent_tenant/modules/payroll')
        .set('X-API-Key', apiKey)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('TENANT_NOT_FOUND');
    });
  });

  describe('DELETE /api/tenants/:tenantId/modules/:moduleId - Disable Module (Requirement 3.8)', () => {
    beforeEach(async () => {
      await Tenant.create({
        tenantId: testTenantId,
        name: 'Test Company',
        domain: 'test.com',
        contactEmail: 'admin@test.com',
        subscription: { status: 'active', plan: 'enterprise', expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) },
        enabledModules: ['surveys', 'payroll', 'attendance']
      });
    });

    it('should disable module for tenant', async () => {
      const response = await request(app)
        .delete(`/api/tenants/${testTenantId}/modules/payroll`)
        .set('X-API-Key', apiKey)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.enabledModules).not.toContain('payroll');
      expect(response.body.data.enabledModules).toContain('surveys');
      expect(response.body.data.enabledModules).toContain('attendance');
    });

    it('should be idempotent (disabling already disabled module)', async () => {
      const response = await request(app)
        .delete(`/api/tenants/${testTenantId}/modules/recruitment`)
        .set('X-API-Key', apiKey)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.enabledModules).toEqual(['surveys', 'payroll', 'attendance']);
    });

    it('should return 404 for non-existent tenant', async () => {
      const response = await request(app)
        .delete('/api/tenants/non_existent_tenant/modules/payroll')
        .set('X-API-Key', apiKey)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('TENANT_NOT_FOUND');
    });
  });

  describe('Authentication and Authorization (Requirements 3.9, 3.10)', () => {
    it('should return 401 for missing API key', async () => {
      await request(app)
        .get('/api/tenants')
        .expect(401);
    });

    it('should return 401 for invalid API key', async () => {
      await request(app)
        .get('/api/tenants')
        .set('X-API-Key', 'invalid_key')
        .expect(401);
    });
  });
});
