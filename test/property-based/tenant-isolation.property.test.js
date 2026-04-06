/**
 * Property-Based Tests for Tenant Isolation
 * 
 * Uses fast-check for property-based testing
 * Verifies that tenant isolation is maintained across all operations
 */

const fc = require('fast-check');
const { getDatabases, createTestTenant, createTestUser } = require('../setup/postgres-test-config');

describe('Tenant Isolation - Property-Based Tests', () => {
  let User;
  let { mainDb } = getDatabases();

  beforeAll(async () => {
    const userModelModule = await import('../../server/modules/hr-core/users/models/user.model.js');
    User = userModelModule.default;
  });

  /**
   * Property: Users can only be accessed by their own tenant
   */
  test('Property: Tenant isolation for user queries', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.record({
          tenantId: fc.uuid(),
          username: fc.string({ minLength: 3, maxLength: 20 }),
          email: fc.emailAddress()
        }), { minLength: 2, maxLength: 10 }),
        async (usersData) => {
          // Skip if not enough unique tenants
          const uniqueTenants = [...new Set(usersData.map(u => u.tenantId))];
          if (uniqueTenants.length < 2) return true;

          // Create tenants
          const tenants = await Promise.all(
            uniqueTenants.map(tenantId =>
              createTestTenant({ tenant_id: tenantId })
            )
          );

          // Create users
          const users = await Promise.all(
            usersData.map(userData =>
              User.create({
                tenant_id: userData.tenantId,
                username: userData.username,
                email: userData.email,
                password: 'password123',
                role: 'user',
                status: 'active'
              })
            )
          );

          // Property: Each tenant can only see their own users
          for (const tenantId of uniqueTenants) {
            const tenantUsers = await User.findAll({
              where: { tenant_id: tenantId }
            });

            // All returned users must belong to the queried tenant
            const allBelongToTenant = tenantUsers.every(
              user => user.tenant_id === tenantId
            );

            if (!allBelongToTenant) {
              return false;
            }

            // Count should match expected
            const expectedCount = usersData.filter(
              u => u.tenantId === tenantId
            ).length;

            if (tenantUsers.length !== expectedCount) {
              return false;
            }
          }

          return true;
        }
      ),
      { numRuns: 10 } // Run 10 times with different random data
    );
  });

  /**
   * Property: Updates only affect the specified tenant
   */
  test('Property: Tenant isolation for updates', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          tenant1Id: fc.uuid(),
          tenant2Id: fc.uuid(),
          username: fc.string({ minLength: 3, maxLength: 20 }),
          newUsername: fc.string({ minLength: 3, maxLength: 20 })
        }),
        async ({ tenant1Id, tenant2Id, username, newUsername }) => {
          // Skip if tenants are the same
          if (tenant1Id === tenant2Id) return true;

          // Create tenants
          await createTestTenant({ tenant_id: tenant1Id });
          await createTestTenant({ tenant_id: tenant2Id });

          // Create users with same username in different tenants
          const user1 = await User.create({
            tenant_id: tenant1Id,
            username,
            email: `${username}@tenant1.com`,
            password: 'password123',
            role: 'user',
            status: 'active'
          });

          const user2 = await User.create({
            tenant_id: tenant2Id,
            username,
            email: `${username}@tenant2.com`,
            password: 'password123',
            role: 'user',
            status: 'active'
          });

          // Update user in tenant1
          await User.update(
            { username: newUsername },
            { where: { id: user1.id, tenant_id: tenant1Id } }
          );

          // Verify user1 was updated
          const updatedUser1 = await User.findOne({
            where: { id: user1.id, tenant_id: tenant1Id }
          });

          if (updatedUser1.username !== newUsername) {
            return false;
          }

          // Verify user2 was NOT updated
          const unchangedUser2 = await User.findOne({
            where: { id: user2.id, tenant_id: tenant2Id }
          });

          if (unchangedUser2.username !== username) {
            return false;
          }

          return true;
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property: Deletes only affect the specified tenant
   */
  test('Property: Tenant isolation for deletes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          tenant1Id: fc.uuid(),
          tenant2Id: fc.uuid(),
          username: fc.string({ minLength: 3, maxLength: 20 })
        }),
        async ({ tenant1Id, tenant2Id, username }) => {
          // Skip if tenants are the same
          if (tenant1Id === tenant2Id) return true;

          // Create tenants
          await createTestTenant({ tenant_id: tenant1Id });
          await createTestTenant({ tenant_id: tenant2Id });

          // Create users in both tenants
          const user1 = await User.create({
            tenant_id: tenant1Id,
            username,
            email: `${username}@tenant1.com`,
            password: 'password123',
            role: 'user',
            status: 'active'
          });

          const user2 = await User.create({
            tenant_id: tenant2Id,
            username,
            email: `${username}@tenant2.com`,
            password: 'password123',
            role: 'user',
            status: 'active'
          });

          // Delete user from tenant1
          await User.destroy({
            where: { id: user1.id, tenant_id: tenant1Id }
          });

          // Verify user1 was deleted
          const deletedUser1 = await User.findOne({
            where: { id: user1.id, tenant_id: tenant1Id }
          });

          if (deletedUser1 !== null) {
            return false;
          }

          // Verify user2 still exists
          const existingUser2 = await User.findOne({
            where: { id: user2.id, tenant_id: tenant2Id }
          });

          if (existingUser2 === null) {
            return false;
          }

          return true;
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property: Cross-tenant queries return empty results
   */
  test('Property: Cross-tenant queries return no data', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          ownerTenantId: fc.uuid(),
          queryTenantId: fc.uuid(),
          username: fc.string({ minLength: 3, maxLength: 20 })
        }),
        async ({ ownerTenantId, queryTenantId, username }) => {
          // Skip if tenants are the same
          if (ownerTenantId === queryTenantId) return true;

          // Create tenants
          await createTestTenant({ tenant_id: ownerTenantId });
          await createTestTenant({ tenant_id: queryTenantId });

          // Create user in owner tenant
          const user = await User.create({
            tenant_id: ownerTenantId,
            username,
            email: `${username}@owner.com`,
            password: 'password123',
            role: 'user',
            status: 'active'
          });

          // Try to query with different tenant_id
          const result = await User.findOne({
            where: { id: user.id, tenant_id: queryTenantId }
          });

          // Should return null (no access to other tenant's data)
          return result === null;
        }
      ),
      { numRuns: 10 }
    );
  });
});
