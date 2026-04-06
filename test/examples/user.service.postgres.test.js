/**
 * Example PostgreSQL Test for UserService
 * 
 * Demonstrates how to write tests with Sequelize and PostgreSQL
 */

const { getDatabases, createTestTenant, createTestUser } = require('../setup/postgres-test-config');

describe('UserService - PostgreSQL', () => {
  let UserService;
  let User;
  let testTenant;
  let { mainDb } = getDatabases();

  beforeAll(async () => {
    // Import service and model
    const userServiceModule = await import('../../server/modules/hr-core/users/services/user.service.js');
    UserService = userServiceModule.default;

    const userModelModule = await import('../../server/modules/hr-core/users/models/user.model.js');
    User = userModelModule.default;
  });

  beforeEach(async () => {
    // Create test tenant for each test
    testTenant = await createTestTenant({
      tenant_id: 'test-tenant-' + Date.now()
    });
  });

  describe('createUser', () => {
    it('should create a new user with tenant_id', async () => {
      const userData = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'password123',
        role: 'user',
        status: 'active'
      };

      const user = await UserService.createUser(testTenant.tenant_id, userData);

      expect(user).toBeDefined();
      expect(user.id).toBeDefined(); // UUID
      expect(user.tenant_id).toBe(testTenant.tenant_id);
      expect(user.email).toBe(userData.email);
      expect(user.password).not.toBe(userData.password); // Should be hashed
    });

    it('should enforce unique email per tenant', async () => {
      const userData = {
        username: 'user1',
        email: 'duplicate@example.com',
        password: 'password123'
      };

      // Create first user
      await UserService.createUser(testTenant.tenant_id, userData);

      // Try to create duplicate
      await expect(
        UserService.createUser(testTenant.tenant_id, userData)
      ).rejects.toThrow(); // Should throw UniqueConstraintError
    });

    it('should allow same email in different tenants', async () => {
      const userData = {
        username: 'user1',
        email: 'same@example.com',
        password: 'password123'
      };

      // Create user in first tenant
      const user1 = await UserService.createUser(testTenant.tenant_id, userData);

      // Create another tenant
      const tenant2 = await createTestTenant({
        tenant_id: 'test-tenant-2-' + Date.now()
      });

      // Create user with same email in second tenant
      const user2 = await UserService.createUser(tenant2.tenant_id, userData);

      expect(user1.email).toBe(user2.email);
      expect(user1.tenant_id).not.toBe(user2.tenant_id);
    });
  });

  describe('getUserById', () => {
    it('should retrieve user by id and tenant_id', async () => {
      const createdUser = await createTestUser(testTenant.tenant_id);

      const user = await UserService.getUserById(testTenant.tenant_id, createdUser.id);

      expect(user).toBeDefined();
      expect(user.id).toBe(createdUser.id);
      expect(user.tenant_id).toBe(testTenant.tenant_id);
    });

    it('should not retrieve user from different tenant', async () => {
      const createdUser = await createTestUser(testTenant.tenant_id);

      // Create another tenant
      const tenant2 = await createTestTenant({
        tenant_id: 'test-tenant-2-' + Date.now()
      });

      // Try to get user with wrong tenant_id
      const user = await UserService.getUserById(tenant2.tenant_id, createdUser.id);

      expect(user).toBeNull();
    });
  });

  describe('updateUser', () => {
    it('should update user fields', async () => {
      const createdUser = await createTestUser(testTenant.tenant_id);

      const updates = {
        username: 'updateduser',
        status: 'inactive'
      };

      const updatedUser = await UserService.updateUser(
        testTenant.tenant_id,
        createdUser.id,
        updates
      );

      expect(updatedUser.username).toBe(updates.username);
      expect(updatedUser.status).toBe(updates.status);
      expect(updatedUser.email).toBe(createdUser.email); // Unchanged
    });

    it('should not update user from different tenant', async () => {
      const createdUser = await createTestUser(testTenant.tenant_id);

      // Create another tenant
      const tenant2 = await createTestTenant({
        tenant_id: 'test-tenant-2-' + Date.now()
      });

      const updates = { username: 'hacker' };

      // Try to update with wrong tenant_id
      await expect(
        UserService.updateUser(tenant2.tenant_id, createdUser.id, updates)
      ).rejects.toThrow();
    });
  });

  describe('deleteUser', () => {
    it('should delete user', async () => {
      const createdUser = await createTestUser(testTenant.tenant_id);

      await UserService.deleteUser(testTenant.tenant_id, createdUser.id);

      const user = await UserService.getUserById(testTenant.tenant_id, createdUser.id);
      expect(user).toBeNull();
    });

    it('should not delete user from different tenant', async () => {
      const createdUser = await createTestUser(testTenant.tenant_id);

      // Create another tenant
      const tenant2 = await createTestTenant({
        tenant_id: 'test-tenant-2-' + Date.now()
      });

      // Try to delete with wrong tenant_id
      await expect(
        UserService.deleteUser(tenant2.tenant_id, createdUser.id)
      ).rejects.toThrow();

      // Verify user still exists
      const user = await UserService.getUserById(testTenant.tenant_id, createdUser.id);
      expect(user).toBeDefined();
    });
  });

  describe('searchUsers', () => {
    beforeEach(async () => {
      // Create multiple users for search tests
      await createTestUser(testTenant.tenant_id, {
        username: 'alice',
        email: 'alice@example.com'
      });
      await createTestUser(testTenant.tenant_id, {
        username: 'bob',
        email: 'bob@example.com'
      });
      await createTestUser(testTenant.tenant_id, {
        username: 'charlie',
        email: 'charlie@example.com'
      });
    });

    it('should search users by email', async () => {
      const results = await UserService.searchUsers(testTenant.tenant_id, {
        email: 'alice@example.com'
      });

      expect(results.length).toBe(1);
      expect(results[0].email).toBe('alice@example.com');
    });

    it('should search users with pagination', async () => {
      const results = await UserService.searchUsers(testTenant.tenant_id, {}, {
        limit: 2,
        offset: 0
      });

      expect(results.length).toBe(2);
    });

    it('should only return users from specified tenant', async () => {
      // Create another tenant with users
      const tenant2 = await createTestTenant({
        tenant_id: 'test-tenant-2-' + Date.now()
      });
      await createTestUser(tenant2.tenant_id, {
        username: 'dave',
        email: 'dave@example.com'
      });

      const results = await UserService.searchUsers(testTenant.tenant_id, {});

      expect(results.length).toBe(3); // Only from testTenant
      expect(results.every(u => u.tenant_id === testTenant.tenant_id)).toBe(true);
    });
  });
});
