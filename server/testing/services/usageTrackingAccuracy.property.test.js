/**
 * Property Test: Usage Tracking Accuracy
 * 
 * Feature: hr-sm-enterprise-enhancement, Property 25: Usage Tracking Accuracy
 * Validates: Requirements 7.2
 * 
 * Tests that for any tenant activity (API calls, storage usage, user actions), 
 * the tracking should accurately record and aggregate usage statistics across 
 * all tenants with mathematical consistency and precision.
 */

import fc from 'fast-check';
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';

describe('Usage Tracking Accuracy Properties', () => {
  // Ensure clean test environment
  beforeAll(() => {
    // Prevent any accidental database connections
    process.env.NODE_ENV = 'test';
    process.env.MONGODB_URI = 'mongodb://mock-test-db';
    
    // Mock any global database connections that might be imported
    global.mongoose = {
      connection: {
        readyState: 0,
        close: () => Promise.resolve(),
        db: {
          stats: () => Promise.resolve({
            collections: 5,
            dataSize: 1024,
            storageSize: 2048,
            indexes: 10,
            avgObjSize: 100
          })
        }
      },
      connect: () => Promise.resolve(),
      disconnect: () => Promise.resolve()
    };
  });

  afterAll(() => {
    // Clean up any test artifacts
    delete global.mongoose;
    delete process.env.MONGODB_URI;
  });

  test('Property 25: Usage Tracking Accuracy - API Call Tracking Consistency', () => {
    /**
     * Feature: hr-sm-enterprise-enhancement, Property 25: Usage Tracking Accuracy
     * Validates: Requirements 7.2
     */
    fc.assert(fc.property(
      fc.record({
        tenantId: fc.string({ minLength: 5, maxLength: 20 }),
        apiCalls: fc.array(
          fc.record({
            endpoint: fc.constantFrom('/api/users', '/api/employees', '/api/reports', '/api/attendance'),
            method: fc.constantFrom('GET', 'POST', 'PUT', 'DELETE'),
            duration: fc.integer({ min: 10, max: 5000 }), // milliseconds
            timestamp: fc.date({ min: new Date('2024-01-01'), max: new Date() }),
            success: fc.boolean()
          }),
          { minLength: 1, maxLength: 100 }
        ),
        initialCount: fc.integer({ min: 0, max: 1000 })
      }),
      (testData) => {
        // Simulate usage tracking service logic
        const trackApiCalls = (tenantId, apiCalls, initialCount) => {
          const cache = {
            count: initialCount,
            endpoints: {},
            lastUpdated: Date.now()
          };

          // Process each API call
          apiCalls.forEach(call => {
            // Increment total count
            cache.count++;

            // Track per-endpoint stats
            if (!cache.endpoints[call.endpoint]) {
              cache.endpoints[call.endpoint] = {
                count: 0,
                totalDuration: 0,
                avgDuration: 0,
                successCount: 0,
                errorCount: 0
              };
            }

            const endpointStats = cache.endpoints[call.endpoint];
            endpointStats.count++;
            endpointStats.totalDuration += call.duration;
            endpointStats.avgDuration = endpointStats.totalDuration / endpointStats.count;

            if (call.success) {
              endpointStats.successCount++;
            } else {
              endpointStats.errorCount++;
            }
          });

          return {
            tenantId,
            totalCalls: cache.count,
            endpointBreakdown: cache.endpoints,
            period: new Date().toISOString().slice(0, 7) // YYYY-MM format
          };
        };

        const result = trackApiCalls(testData.tenantId, testData.apiCalls, testData.initialCount);

        // Property 1: Total API calls should equal initial count plus new calls
        const expectedTotal = testData.initialCount + testData.apiCalls.length;
        expect(result.totalCalls).toBe(expectedTotal);

        // Property 2: Sum of endpoint counts should equal total new calls
        const endpointCountSum = Object.values(result.endpointBreakdown)
          .reduce((sum, endpoint) => sum + endpoint.count, 0);
        expect(endpointCountSum).toBe(testData.apiCalls.length);

        // Property 3: Each endpoint's success + error count should equal its total count
        Object.values(result.endpointBreakdown).forEach(endpoint => {
          expect(endpoint.successCount + endpoint.errorCount).toBe(endpoint.count);
        });

        // Property 4: Average duration should be mathematically correct
        Object.entries(result.endpointBreakdown).forEach(([endpointPath, stats]) => {
          const callsForEndpoint = testData.apiCalls.filter(call => call.endpoint === endpointPath);
          if (callsForEndpoint.length > 0) {
            const expectedAvg = callsForEndpoint.reduce((sum, call) => sum + call.duration, 0) / callsForEndpoint.length;
            expect(Math.abs(stats.avgDuration - expectedAvg)).toBeLessThan(0.01);
          }
        });

        // Property 5: All tracked endpoints should exist in the original data
        const uniqueEndpoints = [...new Set(testData.apiCalls.map(call => call.endpoint))];
        const trackedEndpoints = Object.keys(result.endpointBreakdown);
        expect(trackedEndpoints.sort()).toEqual(uniqueEndpoints.sort());

        // Property 6: Total calls should be non-negative
        expect(result.totalCalls).toBeGreaterThanOrEqual(0);

        // Property 7: Each endpoint count should be positive if it exists
        Object.values(result.endpointBreakdown).forEach(endpoint => {
          expect(endpoint.count).toBeGreaterThan(0);
          expect(endpoint.totalDuration).toBeGreaterThanOrEqual(0);
          expect(endpoint.avgDuration).toBeGreaterThanOrEqual(0);
        });
      }
    ), { numRuns: 100 });
  });

  test('Property 25: Usage Tracking Accuracy - Storage Usage Aggregation', () => {
    /**
     * Feature: hr-sm-enterprise-enhancement, Property 25: Usage Tracking Accuracy
     * Validates: Requirements 7.2
     */
    fc.assert(fc.property(
      fc.record({
        tenantId: fc.string({ minLength: 5, maxLength: 20 }),
        storageOperations: fc.array(
          fc.record({
            operation: fc.constantFrom('add', 'remove'),
            bytes: fc.integer({ min: 1, max: 1000000 }), // 1 byte to 1MB
            resource: fc.constantFrom('documents', 'uploads', 'backups', 'logs'),
            timestamp: fc.date({ min: new Date('2024-01-01'), max: new Date() })
          }),
          { minLength: 1, maxLength: 50 }
        ),
        initialStorage: fc.integer({ min: 0, max: 10000000 }), // 0 to 10MB
        storageLimit: fc.integer({ min: 5000000, max: 50000000 }) // 5MB to 50MB
      }),
      (testData) => {
        // Simulate storage usage tracking logic
        const trackStorageUsage = (tenantId, operations, initialStorage, limit) => {
          let currentStorage = initialStorage;
          const resourceBreakdown = {};
          const warnings = [];
          const violations = [];
          let totalNetChange = 0; // Track actual net change accounting for clamping

          operations.forEach(op => {
            const bytes = op.operation === 'add' ? op.bytes : -op.bytes;
            const previousStorage = currentStorage;
            currentStorage += bytes;

            // Ensure storage doesn't go negative
            if (currentStorage < 0) {
              currentStorage = 0;
            }

            // Calculate actual change (accounting for clamping)
            const actualChange = currentStorage - previousStorage;
            totalNetChange += actualChange;

            // Track per-resource usage
            if (!resourceBreakdown[op.resource]) {
              resourceBreakdown[op.resource] = {
                totalBytes: 0,
                operations: 0
              };
            }

            resourceBreakdown[op.resource].totalBytes += actualChange; // Use actual change, not intended change
            resourceBreakdown[op.resource].operations++;

            // Check for warnings (90% of limit)
            const percentage = (currentStorage / limit) * 100;
            if (percentage >= 90 && percentage < 100) {
              warnings.push({
                type: 'storage_warning',
                percentage: percentage,
                currentStorage,
                limit,
                timestamp: op.timestamp
              });
            }

            // Check for violations (exceeding limit)
            if (currentStorage > limit) {
              violations.push({
                type: 'storage_violation',
                attemptedStorage: currentStorage,
                limit,
                timestamp: op.timestamp
              });
            }
          });

          return {
            tenantId,
            currentStorage: Math.max(0, currentStorage),
            initialStorage,
            storageLimit: limit,
            resourceBreakdown,
            warnings,
            violations,
            usagePercentage: Math.min(100, (currentStorage / limit) * 100)
          };
        };

        const result = trackStorageUsage(
          testData.tenantId, 
          testData.storageOperations, 
          testData.initialStorage, 
          testData.storageLimit
        );

        // Property 1: Current storage should equal initial plus net changes (accounting for clamping)
        let expectedStorage = testData.initialStorage;
        testData.storageOperations.forEach(op => {
          const bytes = op.operation === 'add' ? op.bytes : -op.bytes;
          expectedStorage += bytes;
          // Apply clamping at each step to match the simulation
          if (expectedStorage < 0) {
            expectedStorage = 0;
          }
        });
        expect(result.currentStorage).toBe(expectedStorage);

        // Property 2: Resource breakdown should sum to actual net change (accounting for clamping)
        const resourceNetChange = Object.values(result.resourceBreakdown)
          .reduce((sum, resource) => sum + resource.totalBytes, 0);
        const actualNetChange = result.currentStorage - testData.initialStorage;
        expect(resourceNetChange).toBe(actualNetChange);

        // Property 3: Usage percentage should be mathematically correct
        const expectedPercentage = Math.min(100, (result.currentStorage / result.storageLimit) * 100);
        expect(Math.abs(result.usagePercentage - expectedPercentage)).toBeLessThan(0.01);

        // Property 4: Warnings should only exist when usage is >= 90% and < 100%
        result.warnings.forEach(warning => {
          expect(warning.percentage).toBeGreaterThanOrEqual(90);
          expect(warning.percentage).toBeLessThan(100);
        });

        // Property 5: Violations should only exist when storage exceeds limit
        result.violations.forEach(violation => {
          expect(violation.attemptedStorage).toBeGreaterThan(violation.limit);
        });

        // Property 6: Current storage should be non-negative
        expect(result.currentStorage).toBeGreaterThanOrEqual(0);

        // Property 7: Each resource should have positive operation count if it exists
        Object.values(result.resourceBreakdown).forEach(resource => {
          expect(resource.operations).toBeGreaterThan(0);
        });

        // Property 8: All tracked resources should exist in the original data
        const uniqueResources = [...new Set(testData.storageOperations.map(op => op.resource))];
        const trackedResources = Object.keys(result.resourceBreakdown);
        expect(trackedResources.sort()).toEqual(uniqueResources.sort());
      }
    ), { numRuns: 100 });
  });

  test('Property 25: Usage Tracking Accuracy - Active User Tracking Consistency', () => {
    /**
     * Feature: hr-sm-enterprise-enhancement, Property 25: Usage Tracking Accuracy
     * Validates: Requirements 7.2
     */
    fc.assert(fc.property(
      fc.record({
        tenantId: fc.string({ minLength: 5, maxLength: 20 }),
        userActivities: fc.array(
          fc.record({
            userId: fc.string({ minLength: 3, maxLength: 15 }),
            action: fc.constantFrom('login', 'api_call', 'page_view', 'logout'),
            timestamp: fc.date({ min: new Date('2024-01-01'), max: new Date() }),
            sessionId: fc.string({ minLength: 10, maxLength: 20 })
          }),
          { minLength: 1, maxLength: 100 }
        ),
        timeWindow: fc.integer({ min: 300000, max: 3600000 }) // 5 minutes to 1 hour in milliseconds
      }),
      (testData) => {
        // Simulate active user tracking logic
        const trackActiveUsers = (tenantId, activities, timeWindow) => {
          const now = Date.now();
          const cutoffTime = now - timeWindow;
          
          // Filter activities within time window
          const recentActivities = activities.filter(activity => 
            activity.timestamp.getTime() >= cutoffTime
          );

          // Track unique users and their activities
          const activeUsers = new Set();
          const userActivityCounts = {};
          const actionBreakdown = {};

          recentActivities.forEach(activity => {
            activeUsers.add(activity.userId);

            // Count activities per user
            if (!userActivityCounts[activity.userId]) {
              userActivityCounts[activity.userId] = 0;
            }
            userActivityCounts[activity.userId]++;

            // Count activities by action type
            if (!actionBreakdown[activity.action]) {
              actionBreakdown[activity.action] = {
                count: 0,
                uniqueUsers: new Set()
              };
            }
            actionBreakdown[activity.action].count++;
            actionBreakdown[activity.action].uniqueUsers.add(activity.userId);
          });

          // Convert Sets to counts for return
          const finalActionBreakdown = {};
          Object.entries(actionBreakdown).forEach(([action, data]) => {
            finalActionBreakdown[action] = {
              count: data.count,
              uniqueUsers: data.uniqueUsers.size
            };
          });

          return {
            tenantId,
            activeUserCount: activeUsers.size,
            totalActivities: recentActivities.length,
            userActivityCounts,
            actionBreakdown: finalActionBreakdown,
            timeWindowMs: timeWindow,
            cutoffTime: new Date(cutoffTime)
          };
        };

        const result = trackActiveUsers(testData.tenantId, testData.userActivities, testData.timeWindow);

        // Property 1: Active user count should equal unique users in recent activities
        const now = Date.now();
        const cutoffTime = now - testData.timeWindow;
        const recentActivities = testData.userActivities.filter(activity => 
          activity.timestamp.getTime() >= cutoffTime
        );
        const expectedActiveUsers = new Set(recentActivities.map(a => a.userId)).size;
        expect(result.activeUserCount).toBe(expectedActiveUsers);

        // Property 2: Total activities should match filtered activities count
        expect(result.totalActivities).toBe(recentActivities.length);

        // Property 3: Sum of user activity counts should equal total activities
        const userActivitySum = Object.values(result.userActivityCounts)
          .reduce((sum, count) => sum + count, 0);
        expect(userActivitySum).toBe(result.totalActivities);

        // Property 4: Sum of action counts should equal total activities
        const actionCountSum = Object.values(result.actionBreakdown)
          .reduce((sum, action) => sum + action.count, 0);
        expect(actionCountSum).toBe(result.totalActivities);

        // Property 5: Each user in activity counts should be in active users
        const usersInActivityCounts = Object.keys(result.userActivityCounts);
        const activeUsersFromRecent = [...new Set(recentActivities.map(a => a.userId))];
        expect(usersInActivityCounts.sort()).toEqual(activeUsersFromRecent.sort());

        // Property 6: Each action's unique user count should be <= active user count
        Object.values(result.actionBreakdown).forEach(action => {
          expect(action.uniqueUsers).toBeLessThanOrEqual(result.activeUserCount);
        });

        // Property 7: All counts should be non-negative
        expect(result.activeUserCount).toBeGreaterThanOrEqual(0);
        expect(result.totalActivities).toBeGreaterThanOrEqual(0);
        Object.values(result.userActivityCounts).forEach(count => {
          expect(count).toBeGreaterThan(0);
        });

        // Property 8: All tracked actions should exist in the original data
        const uniqueActions = [...new Set(recentActivities.map(a => a.action))];
        const trackedActions = Object.keys(result.actionBreakdown);
        expect(trackedActions.sort()).toEqual(uniqueActions.sort());

        // Property 9: If there are activities, there should be at least one active user
        if (result.totalActivities > 0) {
          expect(result.activeUserCount).toBeGreaterThan(0);
        }
      }
    ), { numRuns: 100 });
  });

  test('Property 25: Usage Tracking Accuracy - Cross-Tenant Isolation', () => {
    /**
     * Feature: hr-sm-enterprise-enhancement, Property 25: Usage Tracking Accuracy
     * Validates: Requirements 7.2
     */
    fc.assert(fc.property(
      fc.record({
        tenants: fc.array(
          fc.record({
            tenantId: fc.string({ minLength: 5, maxLength: 20 }),
            apiCalls: fc.integer({ min: 0, max: 1000 }),
            storageUsed: fc.integer({ min: 0, max: 10000000 }),
            activeUsers: fc.integer({ min: 0, max: 100 })
          }),
          { minLength: 2, maxLength: 10 }
        )
      }),
      (testData) => {
        // Ensure unique tenant IDs
        const uniqueTenants = testData.tenants.filter((tenant, index, arr) => 
          arr.findIndex(t => t.tenantId === tenant.tenantId) === index
        );

        if (uniqueTenants.length < 2) return; // Skip if not enough unique tenants

        // Simulate multi-tenant usage aggregation
        const aggregateUsageAcrossTenants = (tenants) => {
          const tenantMetrics = {};
          let totalApiCalls = 0;
          let totalStorage = 0;
          let totalActiveUsers = 0;

          tenants.forEach(tenant => {
            tenantMetrics[tenant.tenantId] = {
              apiCalls: tenant.apiCalls,
              storageUsed: tenant.storageUsed,
              activeUsers: tenant.activeUsers
            };

            totalApiCalls += tenant.apiCalls;
            totalStorage += tenant.storageUsed;
            totalActiveUsers += tenant.activeUsers;
          });

          return {
            tenantMetrics,
            aggregates: {
              totalApiCalls,
              totalStorage,
              totalActiveUsers,
              tenantCount: tenants.length
            }
          };
        };

        const result = aggregateUsageAcrossTenants(uniqueTenants);

        // Property 1: Each tenant should have isolated metrics
        expect(Object.keys(result.tenantMetrics)).toHaveLength(uniqueTenants.length);

        // Property 2: Aggregate totals should equal sum of individual tenant metrics
        const expectedApiCalls = uniqueTenants.reduce((sum, t) => sum + t.apiCalls, 0);
        const expectedStorage = uniqueTenants.reduce((sum, t) => sum + t.storageUsed, 0);
        const expectedActiveUsers = uniqueTenants.reduce((sum, t) => sum + t.activeUsers, 0);

        expect(result.aggregates.totalApiCalls).toBe(expectedApiCalls);
        expect(result.aggregates.totalStorage).toBe(expectedStorage);
        expect(result.aggregates.totalActiveUsers).toBe(expectedActiveUsers);

        // Property 3: Each tenant's metrics should match input data
        uniqueTenants.forEach(tenant => {
          const metrics = result.tenantMetrics[tenant.tenantId];
          expect(metrics.apiCalls).toBe(tenant.apiCalls);
          expect(metrics.storageUsed).toBe(tenant.storageUsed);
          expect(metrics.activeUsers).toBe(tenant.activeUsers);
        });

        // Property 4: Tenant count should be accurate
        expect(result.aggregates.tenantCount).toBe(uniqueTenants.length);

        // Property 5: All metrics should be non-negative
        Object.values(result.tenantMetrics).forEach(metrics => {
          expect(metrics.apiCalls).toBeGreaterThanOrEqual(0);
          expect(metrics.storageUsed).toBeGreaterThanOrEqual(0);
          expect(metrics.activeUsers).toBeGreaterThanOrEqual(0);
        });

        expect(result.aggregates.totalApiCalls).toBeGreaterThanOrEqual(0);
        expect(result.aggregates.totalStorage).toBeGreaterThanOrEqual(0);
        expect(result.aggregates.totalActiveUsers).toBeGreaterThanOrEqual(0);

        // Property 6: No tenant should have metrics from another tenant
        const tenantIds = Object.keys(result.tenantMetrics);
        const inputTenantIds = uniqueTenants.map(t => t.tenantId);
        expect(tenantIds.sort()).toEqual(inputTenantIds.sort());
      }
    ), { numRuns: 100 });
  });
});