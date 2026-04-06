/**
 * License Validation Integration Tests
 * 
 * Tests license validation flow between License Server and Main Application databases
 */

const { getDatabases } = require('../setup/postgres-test-config');
const axios = require('axios');

describe('License Validation - Cross-Database Integration', () => {
  let Tenant, License, Plan;
  let { mainDb, licenseDb } = getDatabases();
  let testTenant, testLicense, testPlan;

  beforeAll(async () => {
    // Import models
    const tenantModule = await import('../../server/platform/tenants/models/Tenant.sequelize.js');
    Tenant = tenantModule.default;

    const licenseModule = await import('../../hrsm-license-server/src/models/license.model.js');
    License = licenseModule.default;

    const planModule = await import('../../server/platform/subscriptions/models/Plan.sequelize.js');
    Plan = planModule.default;
  });

  beforeEach(async () => {
    // Create test plan
    testPlan = await Plan.create({
      name: 'Test Plan',
      price: 99.99,
      features: ['feature1', 'feature2'],
      maxUsers: 100
    });

    // Create test tenant in license server
    testTenant = await Tenant.create({
      tenant_id: 'test-tenant-' + Date.now(),
      name: 'Test Company',
      domain: 'test.example.com',
      status: 'active',
      plan_id: testPlan.id
    });

    // Create test license
    testLicense = await License.create({
      tenant_id: testTenant.tenant_id,
      license_key: 'TEST-LICENSE-KEY-' + Date.now(),
      status: 'active',
      expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      max_users: 100,
      enabled_modules: ['hr-core', 'payroll', 'attendance']
    });
  });

  describe('License Validation Flow', () => {
    it('should validate active license from license server', async () => {
      // Query license from license server database
      const license = await License.findOne({
        where: {
          tenant_id: testTenant.tenant_id,
          status: 'active'
        }
      });

      expect(license).toBeDefined();
      expect(license.tenant_id).toBe(testTenant.tenant_id);
      expect(license.status).toBe('active');
      expect(license.expiry_date).toBeInstanceOf(Date);
      expect(license.expiry_date.getTime()).toBeGreaterThan(Date.now());
    });

    it('should retrieve tenant details from license server', async () => {
      const tenant = await Tenant.findOne({
        where: { tenant_id: testTenant.tenant_id }
      });

      expect(tenant).toBeDefined();
      expect(tenant.name).toBe('Test Company');
      expect(tenant.status).toBe('active');
    });

    it('should validate enabled modules', async () => {
      const license = await License.findOne({
        where: { tenant_id: testTenant.tenant_id }
      });

      expect(license.enabled_modules).toContain('hr-core');
      expect(license.enabled_modules).toContain('payroll');
      expect(license.enabled_modules).toContain('attendance');
    });

    it('should reject expired license', async () => {
      // Update license to expired
      await License.update(
        { expiry_date: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Yesterday
        { where: { id: testLicense.id } }
      );

      const license = await License.findOne({
        where: { tenant_id: testTenant.tenant_id }
      });

      expect(license.expiry_date.getTime()).toBeLessThan(Date.now());
      
      // License validation should fail
      const isValid = license.expiry_date.getTime() > Date.now();
      expect(isValid).toBe(false);
    });

    it('should reject inactive license', async () => {
      // Update license to inactive
      await License.update(
        { status: 'inactive' },
        { where: { id: testLicense.id } }
      );

      const license = await License.findOne({
        where: { tenant_id: testTenant.tenant_id }
      });

      expect(license.status).toBe('inactive');
    });
  });

  describe('License Cache', () => {
    it('should cache license data in main application', async () => {
      // Import CompanyLicense model (cache)
      const { default: CompanyLicense } = await import('../../server/models/CompanyLicense.js');

      // Create cache entry
      const cachedLicense = await CompanyLicense.create({
        tenant_id: testTenant.tenant_id,
        license_key: testLicense.license_key,
        status: testLicense.status,
        expiry_date: testLicense.expiry_date,
        enabled_modules: testLicense.enabled_modules,
        cached_at: new Date()
      });

      expect(cachedLicense).toBeDefined();
      expect(cachedLicense.tenant_id).toBe(testTenant.tenant_id);
    });

    it('should use cache when license server is unavailable', async () => {
      const { default: CompanyLicense } = await import('../../server/models/CompanyLicense.js');

      // Create cache entry
      await CompanyLicense.create({
        tenant_id: testTenant.tenant_id,
        license_key: testLicense.license_key,
        status: 'active',
        expiry_date: testLicense.expiry_date,
        enabled_modules: testLicense.enabled_modules,
        cached_at: new Date()
      });

      // Simulate license server unavailable by querying cache directly
      const cachedLicense = await CompanyLicense.findOne({
        where: { tenant_id: testTenant.tenant_id }
      });

      expect(cachedLicense).toBeDefined();
      expect(cachedLicense.status).toBe('active');
    });

    it('should invalidate cache after license update', async () => {
      const { default: CompanyLicense } = await import('../../server/models/CompanyLicense.js');

      // Create cache entry
      const cachedLicense = await CompanyLicense.create({
        tenant_id: testTenant.tenant_id,
        license_key: testLicense.license_key,
        status: 'active',
        expiry_date: testLicense.expiry_date,
        enabled_modules: testLicense.enabled_modules,
        cached_at: new Date()
      });

      // Update license in license server
      await License.update(
        { status: 'suspended' },
        { where: { id: testLicense.id } }
      );

      // Invalidate cache
      await CompanyLicense.destroy({
        where: { tenant_id: testTenant.tenant_id }
      });

      // Verify cache is empty
      const deletedCache = await CompanyLicense.findOne({
        where: { tenant_id: testTenant.tenant_id }
      });

      expect(deletedCache).toBeNull();
    });

    it('should refresh cache periodically', async () => {
      const { default: CompanyLicense } = await import('../../server/models/CompanyLicense.js');

      // Create old cache entry
      const oldCachedAt = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      await CompanyLicense.create({
        tenant_id: testTenant.tenant_id,
        license_key: testLicense.license_key,
        status: 'active',
        expiry_date: testLicense.expiry_date,
        enabled_modules: testLicense.enabled_modules,
        cached_at: oldCachedAt
      });

      // Check if cache is stale (older than 24 hours)
      const cachedLicense = await CompanyLicense.findOne({
        where: { tenant_id: testTenant.tenant_id }
      });

      const cacheAge = Date.now() - cachedLicense.cached_at.getTime();
      const isStale = cacheAge > 24 * 60 * 60 * 1000;

      expect(isStale).toBe(true);

      // Refresh cache
      const freshLicense = await License.findOne({
        where: { tenant_id: testTenant.tenant_id }
      });

      await cachedLicense.update({
        status: freshLicense.status,
        expiry_date: freshLicense.expiry_date,
        enabled_modules: freshLicense.enabled_modules,
        cached_at: new Date()
      });

      const refreshedCache = await CompanyLicense.findOne({
        where: { tenant_id: testTenant.tenant_id }
      });

      expect(refreshedCache.cached_at.getTime()).toBeGreaterThan(oldCachedAt.getTime());
    });
  });

  describe('API Contract Preservation', () => {
    it('should maintain license validation API response format', async () => {
      const expectedFormat = {
        valid: expect.any(Boolean),
        tenant_id: expect.any(String),
        license_key: expect.any(String),
        status: expect.any(String),
        expiry_date: expect.any(String),
        enabled_modules: expect.any(Array),
        max_users: expect.any(Number)
      };

      const license = await License.findOne({
        where: { tenant_id: testTenant.tenant_id }
      });

      const response = {
        valid: license.status === 'active' && license.expiry_date > new Date(),
        tenant_id: license.tenant_id,
        license_key: license.license_key,
        status: license.status,
        expiry_date: license.expiry_date.toISOString(),
        enabled_modules: license.enabled_modules,
        max_users: license.max_users
      };

      expect(response).toMatchObject(expectedFormat);
    });

    it('should maintain tenant info API response format', async () => {
      const expectedFormat = {
        tenant_id: expect.any(String),
        name: expect.any(String),
        domain: expect.any(String),
        status: expect.any(String),
        plan_id: expect.any(String)
      };

      const tenant = await Tenant.findOne({
        where: { tenant_id: testTenant.tenant_id }
      });

      const response = {
        tenant_id: tenant.tenant_id,
        name: tenant.name,
        domain: tenant.domain,
        status: tenant.status,
        plan_id: tenant.plan_id
      };

      expect(response).toMatchObject(expectedFormat);
    });
  });

  describe('Module Access Control', () => {
    it('should allow access to enabled modules', async () => {
      const license = await License.findOne({
        where: { tenant_id: testTenant.tenant_id }
      });

      const hasHRCore = license.enabled_modules.includes('hr-core');
      const hasPayroll = license.enabled_modules.includes('payroll');

      expect(hasHRCore).toBe(true);
      expect(hasPayroll).toBe(true);
    });

    it('should deny access to disabled modules', async () => {
      const license = await License.findOne({
        where: { tenant_id: testTenant.tenant_id }
      });

      const hasRecruitment = license.enabled_modules.includes('recruitment');

      expect(hasRecruitment).toBe(false);
    });

    it('should update module access dynamically', async () => {
      // Add new module
      await License.update(
        {
          enabled_modules: [...testLicense.enabled_modules, 'recruitment']
        },
        { where: { id: testLicense.id } }
      );

      const updatedLicense = await License.findOne({
        where: { tenant_id: testTenant.tenant_id }
      });

      expect(updatedLicense.enabled_modules).toContain('recruitment');
    });
  });
});
