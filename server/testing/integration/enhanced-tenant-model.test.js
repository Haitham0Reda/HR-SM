import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Tenant from '../../platform/tenants/models/Tenant.js';

describe('Enhanced Tenant Model Integration Tests', () => {
  let mongoServer;

  beforeAll(async () => {
    // Disconnect if already connected
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Tenant.deleteMany({});
  });

  describe('Enhanced Enterprise Fields', () => {
    it('should create tenant with enhanced enterprise fields', async () => {
      const tenantData = {
        tenantId: 'test-enterprise-tenant',
        name: 'Test Enterprise Company',
        billing: {
          currentPlan: 'enterprise',
          billingCycle: 'yearly',
          paymentStatus: 'active',
          totalRevenue: 50000
        },
        restrictions: {
          maxUsers: 500,
          maxStorage: 10240, // 10GB in MB
          maxAPICallsPerMonth: 1000000
        },
        license: {
          licenseNumber: 'HRSM-TEST-001',
          licenseType: 'enterprise',
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
        },
        compliance: {
          dataResidency: 'EU',
          gdprCompliant: true,
          soc2Certified: true
        }
      };

      const tenant = new Tenant(tenantData);
      await tenant.save();

      expect(tenant.billing.currentPlan).toBe('enterprise');
      expect(tenant.restrictions.maxUsers).toBe(500);
      expect(tenant.license.licenseType).toBe('enterprise');
      expect(tenant.compliance.gdprCompliant).toBe(true);
    });

    it('should calculate virtual fields correctly', async () => {
      const tenant = new Tenant({
        tenantId: 'test-virtual-fields',
        name: 'Test Virtual Fields',
        usage: {
          storageUsed: 5368709120, // 5GB in bytes
          activeUsers: 45,
          apiCallsThisMonth: 8000
        },
        restrictions: {
          maxUsers: 50,
          maxStorage: 10240, // 10GB in MB
          maxAPICallsPerMonth: 10000
        },
        license: {
          expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) // 15 days from now
        }
      });

      await tenant.save();

      // Test virtual fields
      expect(tenant.storageUsagePercentage).toBeCloseTo(50, 1); // ~50% of 10GB
      expect(tenant.userUsagePercentage).toBe(90); // 45/50 = 90%
      expect(tenant.apiUsagePercentage).toBe(80); // 8000/10000 = 80%
      expect(tenant.licenseStatus).toBe('expiring'); // Expires in 15 days
    });

    it('should update lastActivityAt when usage metrics change', async () => {
      const tenant = new Tenant({
        tenantId: 'test-activity-tracking',
        name: 'Test Activity Tracking'
      });

      await tenant.save();
      const originalActivityTime = tenant.usage.lastActivityAt;

      // Wait a moment to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      // Update usage metrics
      tenant.usage.storageUsed = 1000000;
      await tenant.save();

      expect(tenant.usage.lastActivityAt.getTime()).toBeGreaterThan(originalActivityTime.getTime());
    });
  });

  describe('Enhanced Static Methods', () => {
    beforeEach(async () => {
      // Create test tenants
      const tenants = [
        {
          tenantId: 'tenant-1',
          name: 'Active Enterprise',
          status: 'active',
          billing: { currentPlan: 'enterprise', totalRevenue: 100000 },
          usage: { activeUsers: 100, storageUsed: 5000000000 }
        },
        {
          tenantId: 'tenant-2',
          name: 'Trial Company',
          status: 'active',
          billing: { currentPlan: 'trial', totalRevenue: 0 },
          usage: { activeUsers: 10, storageUsed: 1000000000 }
        },
        {
          tenantId: 'tenant-3',
          name: 'Suspended Company',
          status: 'suspended',
          billing: { currentPlan: 'basic', totalRevenue: 5000 },
          usage: { activeUsers: 25, storageUsed: 2000000000 }
        }
      ];

      await Tenant.insertMany(tenants);
    });

    it('should get analytics correctly', async () => {
      const analytics = await Tenant.getAnalytics();

      expect(analytics).toHaveLength(1);
      expect(analytics[0].totalTenants).toBe(3);
      expect(analytics[0].activeTenants).toBe(2);
      expect(analytics[0].trialTenants).toBe(1);
      expect(analytics[0].paidTenants).toBe(2);
      expect(analytics[0].totalRevenue).toBe(105000);
    });

    it('should find tenants needing attention', async () => {
      // Create a tenant with high storage usage
      const highUsageTenant = new Tenant({
        tenantId: 'high-usage-tenant',
        name: 'High Usage Company',
        usage: {
          storageUsed: 9000000000, // 9GB in bytes
          activeUsers: 48
        },
        restrictions: {
          maxUsers: 50,
          maxStorage: 10240, // 10GB in MB
          maxAPICallsPerMonth: 10000
        },
        billing: {
          paymentStatus: 'past_due'
        }
      });

      await highUsageTenant.save();

      const tenantsNeedingAttention = await Tenant.findTenantsNeedingAttention();

      expect(tenantsNeedingAttention.length).toBeGreaterThan(0);

      // Should include the high usage tenant
      const foundTenant = tenantsNeedingAttention.find(t => t.tenantId === 'high-usage-tenant');
      expect(foundTenant).toBeDefined();
    });
  });

  describe('Enhanced Indexes', () => {
    it('should have proper indexes for enterprise features', async () => {
      const indexes = await Tenant.collection.getIndexes();

      // Check for license-related indexes
      const licenseNumberIndex = Object.keys(indexes).find(key =>
        key.includes('license.licenseNumber')
      );
      expect(licenseNumberIndex).toBeDefined();

      // Check for billing indexes
      const billingPlanIndex = Object.keys(indexes).find(key =>
        key.includes('billing.currentPlan')
      );
      expect(billingPlanIndex).toBeDefined();

      // Check for compound indexes
      const compoundIndex = Object.keys(indexes).find(key =>
        key.includes('status') && key.includes('billing.currentPlan')
      );
      expect(compoundIndex).toBeDefined();
    });
  });
});