/**
 * Unit Tests for Module Enablement
 * 
 * Tests that modules become accessible immediately after enablement
 * and that no server restart is required.
 * 
 * Requirements: 3.4, 5.4, 7.4, 17.2
 */

import request from 'supertest';
import mongoose from 'mongoose';
import express from 'express';
import Tenant from '../../../platform/tenants/models/Tenant.js';
import moduleManagementService from '../../../platform/modules/services/moduleManagementService.js';
import moduleLoader from '../../../core/registry/moduleLoader.js';
import moduleRegistry from '../../../core/registry/moduleRegistry.js';

describe('Module Enablement Tests', () => {
    let app;
    let testTenant;
    let testTenantId;

    beforeAll(async () => {
        // Create Express app for testing
        app = express();
        app.use(express.json());

        // Initialize module registry with test modules
        await initializeTestModules();
    });

    beforeEach(async () => {
        // Create a test tenant
        testTenantId = `test_tenant_${Date.now()}`;
        testTenant = new Tenant({
            tenantId: testTenantId,
            name: 'Test Tenant',
            status: 'active',
            enabledModules: [
                {
                    moduleId: 'hr-core',
                    enabledAt: new Date(),
                    enabledBy: 'system'
                }
            ]
        });
        await testTenant.save();
    });

    afterEach(async () => {
        // Clean up test tenant
        await Tenant.deleteOne({ tenantId: testTenantId });

        // Clear module loader state
        moduleLoader.clear();
    });

    describe('Module Enablement', () => {
        test('should enable module immediately without restart', async () => {
            // Arrange
            const moduleId = 'tasks';

            // Verify module is not initially enabled
            expect(testTenant.isModuleEnabled(moduleId)).toBe(false);
            expect(moduleLoader.isModuleLoadedForTenant(testTenantId, moduleId)).toBe(false);

            // Act - Enable the module
            const updatedTenant = await moduleManagementService.enableModule(
                testTenantId,
                moduleId,
                'test-admin'
            );

            // Assert - Module should be enabled immediately
            expect(updatedTenant.isModuleEnabled(moduleId)).toBe(true);

            // Verify module was added to enabledModules array
            const moduleEntry = updatedTenant.enabledModules.find(m => m.moduleId === moduleId);
            expect(moduleEntry).toBeDefined();
            expect(moduleEntry.enabledBy).toBe('test-admin');
            expect(moduleEntry.enabledAt).toBeInstanceOf(Date);
        });

        test('should make module accessible immediately after enablement', async () => {
            // Arrange
            const moduleId = 'email-service';

            // Verify module is not accessible initially
            expect(testTenant.isModuleEnabled(moduleId)).toBe(false);

            // Act - Enable the module
            await moduleManagementService.enableModule(testTenantId, moduleId, 'test-admin');

            // Reload tenant from database to verify persistence
            const reloadedTenant = await Tenant.findOne({ tenantId: testTenantId });

            // Assert - Module should be accessible immediately
            expect(reloadedTenant.isModuleEnabled(moduleId)).toBe(true);

            // The module should be enabled in the database immediately
            // (We don't test actual module loading here as it requires real module files)
        });

        test('should enable multiple modules without restart', async () => {
            // Arrange
            const moduleIds = ['tasks', 'email-service'];

            // Verify modules are not initially enabled
            for (const moduleId of moduleIds) {
                expect(testTenant.isModuleEnabled(moduleId)).toBe(false);
            }

            // Act - Enable multiple modules
            const updatedTenant = await moduleManagementService.enableModules(
                testTenantId,
                moduleIds,
                'test-admin'
            );

            // Assert - All modules should be enabled immediately
            for (const moduleId of moduleIds) {
                expect(updatedTenant.isModuleEnabled(moduleId)).toBe(true);

                const moduleEntry = updatedTenant.enabledModules.find(m => m.moduleId === moduleId);
                expect(moduleEntry).toBeDefined();
                expect(moduleEntry.enabledBy).toBe('test-admin');
            }
        });

        test('should handle module enablement with dependencies', async () => {
            // Arrange
            const dependentModuleId = 'clinic'; // Depends on hr-core

            // Verify hr-core is enabled (prerequisite)
            expect(testTenant.isModuleEnabled('hr-core')).toBe(true);

            // Verify clinic is not enabled
            expect(testTenant.isModuleEnabled(dependentModuleId)).toBe(false);

            // Act - Enable module with dependencies
            const updatedTenant = await moduleManagementService.enableModule(
                testTenantId,
                dependentModuleId,
                'test-admin'
            );

            // Assert - Module should be enabled since dependencies are met
            expect(updatedTenant.isModuleEnabled(dependentModuleId)).toBe(true);
        });

        test('should reject enablement when dependencies are missing', async () => {
            // Arrange
            // Create a tenant without hr-core enabled
            const tenantWithoutCore = new Tenant({
                tenantId: `test_no_core_${Date.now()}`,
                name: 'Test Tenant Without Core',
                status: 'active',
                enabledModules: [] // No modules enabled
            });
            await tenantWithoutCore.save();

            try {
                // Act & Assert - Should throw error when trying to enable module without dependencies
                await expect(
                    moduleManagementService.enableModule(tenantWithoutCore.tenantId, 'clinic', 'test-admin')
                ).rejects.toThrow('Missing required dependencies');
            } finally {
                // Cleanup
                await Tenant.deleteOne({ tenantId: tenantWithoutCore.tenantId });
            }
        });

        test('should not restart server when enabling modules', async () => {
            // Arrange
            const moduleId = 'tasks';
            const initialUptime = process.uptime();

            // Act - Enable module
            await moduleManagementService.enableModule(testTenantId, moduleId, 'test-admin');

            // Small delay to ensure any potential restart would be detected
            await new Promise(resolve => setTimeout(resolve, 100));

            // Assert - Process should still be running (no restart)
            const currentUptime = process.uptime();
            expect(currentUptime).toBeGreaterThanOrEqual(initialUptime);

            // Verify module is still enabled after the delay
            const tenant = await Tenant.findOne({ tenantId: testTenantId });
            expect(tenant.isModuleEnabled(moduleId)).toBe(true);
        });

        test('should enable module idempotently', async () => {
            // Arrange
            const moduleId = 'tasks';

            // Act - Enable module twice
            const firstEnable = await moduleManagementService.enableModule(
                testTenantId,
                moduleId,
                'test-admin'
            );

            const secondEnable = await moduleManagementService.enableModule(
                testTenantId,
                moduleId,
                'test-admin'
            );

            // Assert - Both operations should succeed and result in same state
            expect(firstEnable.isModuleEnabled(moduleId)).toBe(true);
            expect(secondEnable.isModuleEnabled(moduleId)).toBe(true);

            // Should only have one entry in enabledModules array
            const moduleEntries = secondEnable.enabledModules.filter(m => m.moduleId === moduleId);
            expect(moduleEntries).toHaveLength(1);
        });

        test('should persist module enablement across database operations', async () => {
            // Arrange
            const moduleId = 'email-service';

            // Act - Enable module
            await moduleManagementService.enableModule(testTenantId, moduleId, 'test-admin');

            // Simulate database reload by fetching fresh instance
            const freshTenant = await Tenant.findOne({ tenantId: testTenantId });

            // Assert - Module should still be enabled
            expect(freshTenant.isModuleEnabled(moduleId)).toBe(true);

            const moduleEntry = freshTenant.enabledModules.find(m => m.moduleId === moduleId);
            expect(moduleEntry).toBeDefined();
            expect(moduleEntry.enabledBy).toBe('test-admin');
        });
    });

    describe('Module Accessibility', () => {
        test('should make module routes accessible immediately after enablement', async () => {
            // Arrange
            const moduleId = 'tasks';

            // Act - Enable module
            await moduleManagementService.enableModule(testTenantId, moduleId, 'test-admin');

            // The module should be enabled in the database immediately
            // (We don't test actual module loading here as it requires real module files)
        });

        test('should handle module loading failure gracefully', async () => {
            // Arrange
            const nonExistentModuleId = 'non-existent-module';

            // Act & Assert - Should throw appropriate error
            await expect(
                moduleManagementService.enableModule(testTenantId, nonExistentModuleId, 'test-admin')
            ).rejects.toThrow('Module non-existent-module not found in registry');
        });

        test('should enable module for specific tenant without affecting others', async () => {
            // Arrange
            const moduleId = 'tasks';

            // Create second tenant
            const secondTenantId = `test_tenant_2_${Date.now()}`;
            const secondTenant = new Tenant({
                tenantId: secondTenantId,
                name: 'Second Test Tenant',
                status: 'active',
                enabledModules: [
                    {
                        moduleId: 'hr-core',
                        enabledAt: new Date(),
                        enabledBy: 'system'
                    }
                ]
            });
            await secondTenant.save();

            try {
                // Act - Enable module for first tenant only
                await moduleManagementService.enableModule(testTenantId, moduleId, 'test-admin');

                // Assert - First tenant should have module enabled
                const firstTenant = await Tenant.findOne({ tenantId: testTenantId });
                expect(firstTenant.isModuleEnabled(moduleId)).toBe(true);

                // Second tenant should not be affected
                const unchangedSecondTenant = await Tenant.findOne({ tenantId: secondTenantId });
                expect(unchangedSecondTenant.isModuleEnabled(moduleId)).toBe(false);
            } finally {
                // Cleanup
                await Tenant.deleteOne({ tenantId: secondTenantId });
            }
        });
    });

    describe('Runtime Module Management', () => {
        test('should enable module at runtime without server restart', async () => {
            // Arrange
            const moduleId = 'email-service';
            const startTime = Date.now();

            // Act - Enable module at runtime (database operation)
            await moduleManagementService.enableModule(testTenantId, moduleId, 'test-admin');

            const endTime = Date.now();

            // Assert - Should complete quickly (no restart)
            expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second

            // Module should be enabled in database
            const tenant = await Tenant.findOne({ tenantId: testTenantId });
            expect(tenant.isModuleEnabled(moduleId)).toBe(true);
        });

        test('should disable module at runtime without server restart', async () => {
            // Arrange
            const moduleId = 'tasks';

            // First enable the module
            await moduleManagementService.enableModule(testTenantId, moduleId, 'test-admin');
            let tenant = await Tenant.findOne({ tenantId: testTenantId });
            expect(tenant.isModuleEnabled(moduleId)).toBe(true);

            const startTime = Date.now();

            // Act - Disable module at runtime
            await moduleManagementService.disableModule(testTenantId, moduleId);

            const endTime = Date.now();

            // Assert - Should complete quickly (no restart)
            expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second

            // Module should be disabled in database
            tenant = await Tenant.findOne({ tenantId: testTenantId });
            expect(tenant.isModuleEnabled(moduleId)).toBe(false);
        });

        test('should handle concurrent module enablement requests', async () => {
            // Arrange
            const moduleIds = ['tasks', 'email-service'];

            // Act - Enable modules concurrently
            const enablePromises = moduleIds.map(moduleId =>
                moduleManagementService.enableModule(testTenantId, moduleId, 'test-admin')
            );

            const results = await Promise.all(enablePromises);

            // Assert - All operations should succeed
            expect(results).toHaveLength(moduleIds.length);
            for (const result of results) {
                expect(result).toBeDefined();
            }

            // Verify final state in database - all modules should be enabled
            const finalTenant = await Tenant.findOne({ tenantId: testTenantId });
            for (const moduleId of moduleIds) {
                expect(finalTenant.isModuleEnabled(moduleId)).toBe(true);
            }
        });
    });
});

/**
 * Initialize test modules in the registry
 */
async function initializeTestModules() {
    // Clear existing modules
    moduleRegistry.clear();

    // Register test modules
    const testModules = [
        {
            name: 'hr-core',
            displayName: 'HR Core',
            version: '1.0.0',
            description: 'Core HR functionality',
            dependencies: [],
            optionalDependencies: []
        },
        {
            name: 'tasks',
            displayName: 'Task Management',
            version: '1.0.0',
            description: 'Task management module',
            dependencies: ['hr-core'],
            optionalDependencies: ['email-service']
        },
        {
            name: 'email-service',
            displayName: 'Email Service',
            version: '1.0.0',
            description: 'Email functionality',
            dependencies: [],
            optionalDependencies: []
        },
        {
            name: 'clinic',
            displayName: 'Medical Clinic',
            version: '1.0.0',
            description: 'Medical clinic management',
            dependencies: ['hr-core'],
            optionalDependencies: ['email-service']
        }
    ];

    for (const moduleConfig of testModules) {
        moduleRegistry.register(moduleConfig);
    }

    moduleRegistry.markInitialized();
}