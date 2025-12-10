/**
 * Tenant Provisioning Unit Tests
 * 
 * Tests tenant provisioning functionality:
 * - Test tenant creation generates unique tenantId
 * - Test default admin user is created
 * - Test HR-Core is enabled by default
 * 
 * Requirements: 5.3, 18.1
 */

import mongoose from 'mongoose';
import Tenant from '../../platform/tenants/models/Tenant.js';
import User from '../../models/user.model.js';
import tenantProvisioningService from '../../platform/tenants/services/tenantProvisioningService.js';
import AppError from '../../core/errors/AppError.js';

describe('Tenant Provisioning', () => {
  beforeEach(async () => {
    // Clear tenants and users collections
    await Tenant.deleteMany({});
    await User.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('Tenant Creation - Generates unique tenantId', () => {
    test('should generate unique tenantId from tenant name', async () => {
      // Arrange
      const tenantData = {
        name: 'Acme Corporation',
        adminUser: {
          email: 'admin@acme.com',
          password: 'SecurePass123!',
          firstName: 'John',
          lastName: 'Doe'
        }
      };

      // Act
      const result = await tenantProvisioningService.createTenant(tenantData);

      // Assert
      expect(result.tenant).toBeDefined();
      expect(result.tenant.tenantId).toBeDefined();
      expect(result.tenant.tenantId).toMatch(/^acme-corporation-[a-f0-9]{8}$/);
      expect(result.tenant.name).toBe('Acme Corporation');
    });

    test('should generate different tenantIds for tenants with same name', async () => {
      // Arrange
      const tenantData1 = {
        name: 'Test Company',
        adminUser: {
          email: 'admin1@test.com',
          password: 'SecurePass123!',
          firstName: 'Admin',
          lastName: 'One'
        }
      };

      const tenantData2 = {
        name: 'Test Company',
        adminUser: {
          email: 'admin2@test.com',
          password: 'SecurePass123!',
          firstName: 'Admin',
          lastName: 'Two'
        }
      };

      // Act
      const result1 = await tenantProvisioningService.createTenant(tenantData1);
      const result2 = await tenantProvisioningService.createTenant(tenantData2);

      // Assert
      expect(result1.tenant.tenantId).toBeDefined();
      expect(result2.tenant.tenantId).toBeDefined();
      expect(result1.tenant.tenantId).not.toBe(result2.tenant.tenantId);
    });

    test('should handle special characters in tenant name', async () => {
      // Arrange
      const tenantData = {
        name: 'Test & Company, Inc.',
        adminUser: {
          email: 'admin@testcompany.com',
          password: 'SecurePass123!',
          firstName: 'Admin',
          lastName: 'User'
        }
      };

      // Act
      const result = await tenantProvisioningService.createTenant(tenantData);

      // Assert
      expect(result.tenant.tenantId).toBeDefined();
      expect(result.tenant.tenantId).toMatch(/^test-company-inc-[a-f0-9]{8}$/);
    });

    test('should truncate long tenant names in tenantId', async () => {
      // Arrange
      const tenantData = {
        name: 'Very Long Company Name That Should Be Truncated For TenantId Generation',
        adminUser: {
          email: 'admin@longname.com',
          password: 'SecurePass123!',
          firstName: 'Admin',
          lastName: 'User'
        }
      };

      // Act
      const result = await tenantProvisioningService.createTenant(tenantData);

      // Assert
      expect(result.tenant.tenantId).toBeDefined();
      const baseLength = result.tenant.tenantId.split('-').slice(0, -1).join('-').length;
      expect(baseLength).toBeLessThanOrEqual(20);
    });

    test('should ensure tenantId is unique in database', async () => {
      // Arrange
      const tenantData = {
        name: 'Unique Test',
        adminUser: {
          email: 'admin@unique.com',
          password: 'SecurePass123!',
          firstName: 'Admin',
          lastName: 'User'
        }
      };

      // Act
      const result = await tenantProvisioningService.createTenant(tenantData);

      // Assert - Verify tenantId is unique by checking database
      const tenantCount = await Tenant.countDocuments({ tenantId: result.tenant.tenantId });
      expect(tenantCount).toBe(1);
    });

    test('should fail if tenant name is missing', async () => {
      // Arrange
      const tenantData = {
        adminUser: {
          email: 'admin@test.com',
          password: 'SecurePass123!',
          firstName: 'Admin',
          lastName: 'User'
        }
      };

      // Act & Assert
      await expect(
        tenantProvisioningService.createTenant(tenantData)
      ).rejects.toThrow(AppError);
    });
  });

  describe('Admin User Creation - Default admin user is created', () => {
    test('should create admin user with provided credentials', async () => {
      // Arrange
      const tenantData = {
        name: 'Test Company',
        adminUser: {
          email: 'admin@testcompany.com',
          password: 'SecurePass123!',
          firstName: 'John',
          lastName: 'Smith'
        }
      };

      // Act
      const result = await tenantProvisioningService.createTenant(tenantData);

      // Assert
      expect(result.adminUser).toBeDefined();
      expect(result.adminUser.email).toBe('admin@testcompany.com');
      expect(result.adminUser.firstName).toBe('John');
      expect(result.adminUser.lastName).toBe('Smith');
      expect(result.adminUser.role).toBe('Admin');
      expect(result.adminUser.password).toBeUndefined(); // Password should not be in response
    });

    test('should create admin user with correct tenantId', async () => {
      // Arrange
      const tenantData = {
        name: 'Test Company',
        adminUser: {
          email: 'admin@testcompany.com',
          password: 'SecurePass123!',
          firstName: 'Admin',
          lastName: 'User'
        }
      };

      // Act
      const result = await tenantProvisioningService.createTenant(tenantData);

      // Assert - Verify admin user in database
      const adminUser = await User.findOne({ 
        tenantId: result.tenant.tenantId,
        email: 'admin@testcompany.com'
      });

      expect(adminUser).toBeDefined();
      expect(adminUser.tenantId).toBe(result.tenant.tenantId);
      expect(adminUser.role).toBe('Admin');
      expect(adminUser.status).toBe('active');
    });

    test('should set admin user status to active', async () => {
      // Arrange
      const tenantData = {
        name: 'Test Company',
        adminUser: {
          email: 'admin@testcompany.com',
          password: 'SecurePass123!',
          firstName: 'Admin',
          lastName: 'User'
        }
      };

      // Act
      const result = await tenantProvisioningService.createTenant(tenantData);

      // Assert
      const adminUser = await User.findOne({ 
        tenantId: result.tenant.tenantId,
        email: 'admin@testcompany.com'
      });

      expect(adminUser.status).toBe('active');
    });

    test('should update tenant user count after admin creation', async () => {
      // Arrange
      const tenantData = {
        name: 'Test Company',
        adminUser: {
          email: 'admin@testcompany.com',
          password: 'SecurePass123!',
          firstName: 'Admin',
          lastName: 'User'
        }
      };

      // Act
      const result = await tenantProvisioningService.createTenant(tenantData);

      // Assert
      expect(result.tenant.usage.userCount).toBe(1);
    });

    test('should fail if admin user email is missing', async () => {
      // Arrange
      const tenantData = {
        name: 'Test Company',
        adminUser: {
          password: 'SecurePass123!',
          firstName: 'Admin',
          lastName: 'User'
        }
      };

      // Act & Assert
      await expect(
        tenantProvisioningService.createTenant(tenantData)
      ).rejects.toThrow(AppError);
    });

    test('should fail if admin user password is missing', async () => {
      // Arrange
      const tenantData = {
        name: 'Test Company',
        adminUser: {
          email: 'admin@testcompany.com',
          firstName: 'Admin',
          lastName: 'User'
        }
      };

      // Act & Assert
      await expect(
        tenantProvisioningService.createTenant(tenantData)
      ).rejects.toThrow(AppError);
    });

    test('should rollback tenant creation if admin user creation fails', async () => {
      // Arrange - Create a tenant first
      const tenantData1 = {
        name: 'First Company',
        adminUser: {
          email: 'admin@first.com',
          password: 'SecurePass123!',
          firstName: 'Admin',
          lastName: 'User'
        }
      };

      const result1 = await tenantProvisioningService.createTenant(tenantData1);

      // Try to create another user with the same email in the SAME tenant
      // This should fail and trigger rollback
      const tenantData2 = {
        name: 'Second Company',
        adminUser: {
          email: 'admin@first.com', // Same email
          password: 'SecurePass123!',
          firstName: 'Admin',
          lastName: 'User'
        }
      };

      // Manually create a user with the same email in the second tenant to force failure
      // First, we need to simulate a scenario where admin user creation fails
      // We'll test this by checking that if user creation fails, tenant is rolled back
      
      // Act & Assert
      const initialTenantCount = await Tenant.countDocuments({});
      
      // Different tenants can have same admin email, so this won't fail
      // Instead, let's test with invalid user data that will cause validation error
      const invalidTenantData = {
        name: 'Invalid Company',
        adminUser: {
          email: '', // Invalid email - will cause validation error
          password: 'SecurePass123!',
          firstName: 'Admin',
          lastName: 'User'
        }
      };
      
      try {
        await tenantProvisioningService.createTenant(invalidTenantData);
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        // Expected to fail
        expect(error).toBeDefined();
      }

      // Verify tenant was not created (rollback occurred)
      const finalTenantCount = await Tenant.countDocuments({});
      expect(finalTenantCount).toBe(initialTenantCount);
    });
  });

  describe('HR-Core Module - Enabled by default', () => {
    test('should enable HR-Core module by default', async () => {
      // Arrange
      const tenantData = {
        name: 'Test Company',
        adminUser: {
          email: 'admin@testcompany.com',
          password: 'SecurePass123!',
          firstName: 'Admin',
          lastName: 'User'
        }
      };

      // Act
      const result = await tenantProvisioningService.createTenant(tenantData);

      // Assert
      expect(result.tenant.enabledModules).toBeDefined();
      expect(result.tenant.enabledModules.length).toBeGreaterThan(0);
      
      const hrCoreModule = result.tenant.enabledModules.find(
        module => module.moduleId === 'hr-core'
      );
      
      expect(hrCoreModule).toBeDefined();
      expect(hrCoreModule.moduleId).toBe('hr-core');
    });

    test('should set HR-Core enabledAt timestamp', async () => {
      // Arrange
      const tenantData = {
        name: 'Test Company',
        adminUser: {
          email: 'admin@testcompany.com',
          password: 'SecurePass123!',
          firstName: 'Admin',
          lastName: 'User'
        }
      };

      const beforeCreation = new Date();

      // Act
      const result = await tenantProvisioningService.createTenant(tenantData);

      // Assert
      const hrCoreModule = result.tenant.enabledModules.find(
        module => module.moduleId === 'hr-core'
      );

      expect(hrCoreModule.enabledAt).toBeDefined();
      expect(hrCoreModule.enabledAt).toBeInstanceOf(Date);
      expect(hrCoreModule.enabledAt.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
    });

    test('should set HR-Core enabledBy to system', async () => {
      // Arrange
      const tenantData = {
        name: 'Test Company',
        adminUser: {
          email: 'admin@testcompany.com',
          password: 'SecurePass123!',
          firstName: 'Admin',
          lastName: 'User'
        }
      };

      // Act
      const result = await tenantProvisioningService.createTenant(tenantData);

      // Assert
      const hrCoreModule = result.tenant.enabledModules.find(
        module => module.moduleId === 'hr-core'
      );

      expect(hrCoreModule.enabledBy).toBe('system');
    });

    test('should verify HR-Core is enabled using isModuleEnabled method', async () => {
      // Arrange
      const tenantData = {
        name: 'Test Company',
        adminUser: {
          email: 'admin@testcompany.com',
          password: 'SecurePass123!',
          firstName: 'Admin',
          lastName: 'User'
        }
      };

      // Act
      const result = await tenantProvisioningService.createTenant(tenantData);

      // Assert
      expect(result.tenant.isModuleEnabled('hr-core')).toBe(true);
    });

    test('should only enable HR-Core module by default (no other modules)', async () => {
      // Arrange
      const tenantData = {
        name: 'Test Company',
        adminUser: {
          email: 'admin@testcompany.com',
          password: 'SecurePass123!',
          firstName: 'Admin',
          lastName: 'User'
        }
      };

      // Act
      const result = await tenantProvisioningService.createTenant(tenantData);

      // Assert
      expect(result.tenant.enabledModules.length).toBe(1);
      expect(result.tenant.enabledModules[0].moduleId).toBe('hr-core');
    });
  });

  describe('Tenant Initialization - Complete setup', () => {
    test('should set tenant status to trial by default', async () => {
      // Arrange
      const tenantData = {
        name: 'Test Company',
        adminUser: {
          email: 'admin@testcompany.com',
          password: 'SecurePass123!',
          firstName: 'Admin',
          lastName: 'User'
        }
      };

      // Act
      const result = await tenantProvisioningService.createTenant(tenantData);

      // Assert
      expect(result.tenant.status).toBe('trial');
    });

    test('should set default configuration values', async () => {
      // Arrange
      const tenantData = {
        name: 'Test Company',
        adminUser: {
          email: 'admin@testcompany.com',
          password: 'SecurePass123!',
          firstName: 'Admin',
          lastName: 'User'
        }
      };

      // Act
      const result = await tenantProvisioningService.createTenant(tenantData);

      // Assert
      expect(result.tenant.config).toBeDefined();
      expect(result.tenant.config.timezone).toBe('UTC');
      expect(result.tenant.config.locale).toBe('en-US');
      expect(result.tenant.config.currency).toBe('USD');
    });

    test('should set default limits', async () => {
      // Arrange
      const tenantData = {
        name: 'Test Company',
        adminUser: {
          email: 'admin@testcompany.com',
          password: 'SecurePass123!',
          firstName: 'Admin',
          lastName: 'User'
        }
      };

      // Act
      const result = await tenantProvisioningService.createTenant(tenantData);

      // Assert
      expect(result.tenant.limits).toBeDefined();
      expect(result.tenant.limits.maxUsers).toBe(100);
      expect(result.tenant.limits.maxStorage).toBe(10737418240); // 10GB
      expect(result.tenant.limits.apiCallsPerMonth).toBe(100000);
    });

    test('should initialize usage counters to zero', async () => {
      // Arrange
      const tenantData = {
        name: 'Test Company',
        adminUser: {
          email: 'admin@testcompany.com',
          password: 'SecurePass123!',
          firstName: 'Admin',
          lastName: 'User'
        }
      };

      // Act
      const result = await tenantProvisioningService.createTenant(tenantData);

      // Assert
      expect(result.tenant.usage).toBeDefined();
      expect(result.tenant.usage.userCount).toBe(1); // Admin user created
      expect(result.tenant.usage.storageUsed).toBe(0);
      expect(result.tenant.usage.apiCallsThisMonth).toBe(0);
    });

    test('should set contact info from admin user', async () => {
      // Arrange
      const tenantData = {
        name: 'Test Company',
        adminUser: {
          email: 'admin@testcompany.com',
          password: 'SecurePass123!',
          firstName: 'John',
          lastName: 'Doe'
        }
      };

      // Act
      const result = await tenantProvisioningService.createTenant(tenantData);

      // Assert
      expect(result.tenant.contactInfo).toBeDefined();
      expect(result.tenant.contactInfo.adminEmail).toBe('admin@testcompany.com');
      expect(result.tenant.contactInfo.adminName).toBe('John Doe');
    });

    test('should set deployment mode to saas by default', async () => {
      // Arrange
      const tenantData = {
        name: 'Test Company',
        adminUser: {
          email: 'admin@testcompany.com',
          password: 'SecurePass123!',
          firstName: 'Admin',
          lastName: 'User'
        }
      };

      // Act
      const result = await tenantProvisioningService.createTenant(tenantData);

      // Assert
      expect(result.tenant.deploymentMode).toBe('saas');
    });

    test('should support on-premise deployment mode', async () => {
      // Arrange
      const tenantData = {
        name: 'Test Company',
        deploymentMode: 'on-premise',
        adminUser: {
          email: 'admin@testcompany.com',
          password: 'SecurePass123!',
          firstName: 'Admin',
          lastName: 'User'
        }
      };

      // Act
      const result = await tenantProvisioningService.createTenant(tenantData);

      // Assert
      expect(result.tenant.deploymentMode).toBe('on-premise');
    });

    test('should return both tenant and admin user in result', async () => {
      // Arrange
      const tenantData = {
        name: 'Test Company',
        adminUser: {
          email: 'admin@testcompany.com',
          password: 'SecurePass123!',
          firstName: 'Admin',
          lastName: 'User'
        }
      };

      // Act
      const result = await tenantProvisioningService.createTenant(tenantData);

      // Assert
      expect(result).toBeDefined();
      expect(result.tenant).toBeDefined();
      expect(result.adminUser).toBeDefined();
      expect(result.tenant.tenantId).toBeDefined();
      expect(result.adminUser.email).toBe('admin@testcompany.com');
    });
  });
});
