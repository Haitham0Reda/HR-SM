import fc from 'fast-check';
import Tenant from '../../platform/tenants/models/Tenant.js';
import tenantService from '../../platform/tenants/services/tenantService.js';

describe('Bulk Operation Atomicity Property-Based Tests', () => {
    let testTenantIds = [];

    beforeEach(async () => {
        testTenantIds = [];
        
        for (let i = 0; i < 3; i++) {
            const tenantId = `test-tenant-bulk-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 9)}`;
            testTenantIds.push(tenantId);
            
            await Tenant.create({
                tenantId: tenantId,
                name: `Test Tenant ${i}`,
                status: 'active',
                deploymentMode: 'saas',
                subscription: {
                    status: 'active',
                    billingCycle: 'monthly'
                },
                enabledModules: [
                    { moduleId: 'hr-core', enabledBy: 'system' }
                ],
                restrictions: {
                    maxUsers: 100,
                    maxStorage: 1024,
                    maxAPICallsPerMonth: 10000
                },
                usage: {
                    userCount: 10,
                    activeUsers: 8,
                    storageUsed: 100,
                    apiCallsThisMonth: 500
                },
                billing: {
                    currentPlan: 'basic',
                    paymentStatus: 'active',
                    totalRevenue: 100
                }
            });
        }
    });

    afterEach(async () => {
        if (testTenantIds.length > 0) {
            await Tenant.deleteMany({ tenantId: { $in: testTenantIds } });
        }
        testTenantIds = [];
    });

    /**
     * Property 7: Bulk Operation Atomicity
     * For any set of tenants selected for bulk operations, either all operations should succeed or all should fail, maintaining data consistency
     * Validates: Requirements 2.4
     */
    test('Property 7: Bulk update operations maintain atomicity - all succeed or all fail', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.subarray(fc.constantFrom(...testTenantIds), { minLength: 1, maxLength: 3 }),
                fc.record({
                    status: fc.constantFrom('active', 'suspended', 'trial'),
                    deploymentMode: fc.constantFrom('saas', 'on-premise')
                }),
                async (selectedTenantIds, updateData) => {
                    const initialStates = await Tenant.find({ 
                        tenantId: { $in: testTenantIds } 
                    }).lean();
                    
                    const initialStateMap = new Map();
                    initialStates.forEach(tenant => {
                        initialStateMap.set(tenant.tenantId, {
                            status: tenant.status,
                            deploymentMode: tenant.deploymentMode
                        });
                    });

                    try {
                        const result = await tenantService.bulkUpdateTenants(selectedTenantIds, updateData);
                        
                        const updatedTenants = await Tenant.find({ 
                            tenantId: { $in: selectedTenantIds } 
                        }).lean();
                        
                        expect(result.modifiedCount).toBe(selectedTenantIds.length);
                        expect(result.matchedCount).toBe(selectedTenantIds.length);
                        
                        updatedTenants.forEach(tenant => {
                            if (updateData.status) {
                                expect(tenant.status).toBe(updateData.status);
                            }
                            if (updateData.deploymentMode) {
                                expect(tenant.deploymentMode).toBe(updateData.deploymentMode);
                            }
                        });
                        
                    } catch (error) {
                        const currentStates = await Tenant.find({ 
                            tenantId: { $in: testTenantIds } 
                        }).lean();
                        
                        currentStates.forEach(tenant => {
                            const initialState = initialStateMap.get(tenant.tenantId);
                            expect(tenant.status).toBe(initialState.status);
                            expect(tenant.deploymentMode).toBe(initialState.deploymentMode);
                        });
                    }
                }
            ),
            { numRuns: 50 }
        );
    });

    test('Bulk suspend operations maintain atomicity', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.subarray(fc.constantFrom(...testTenantIds), { minLength: 1, maxLength: 3 }),
                fc.string({ minLength: 5, maxLength: 50 }),
                async (selectedTenantIds, suspensionReason) => {
                    const initialStates = await Tenant.find({ 
                        tenantId: { $in: testTenantIds } 
                    }).lean();
                    
                    const initialStateMap = new Map();
                    initialStates.forEach(tenant => {
                        initialStateMap.set(tenant.tenantId, {
                            status: tenant.status,
                            suspensionReason: tenant.metadata?.suspensionReason,
                            suspendedAt: tenant.metadata?.suspendedAt
                        });
                    });

                    try {
                        const result = await tenantService.bulkSuspendTenants(selectedTenantIds, suspensionReason);
                        
                        const updatedTenants = await Tenant.find({ 
                            tenantId: { $in: selectedTenantIds } 
                        }).lean();
                        
                        expect(result.modifiedCount).toBe(selectedTenantIds.length);
                        expect(result.matchedCount).toBe(selectedTenantIds.length);
                        
                        updatedTenants.forEach(tenant => {
                            expect(tenant.status).toBe('suspended');
                            expect(tenant.metadata?.suspensionReason).toBe(suspensionReason);
                            expect(tenant.metadata?.suspendedAt).toBeDefined();
                        });
                        
                    } catch (error) {
                        const currentStates = await Tenant.find({ 
                            tenantId: { $in: testTenantIds } 
                        }).lean();
                        
                        currentStates.forEach(tenant => {
                            const initialState = initialStateMap.get(tenant.tenantId);
                            expect(tenant.status).toBe(initialState.status);
                            expect(tenant.metadata?.suspensionReason).toBe(initialState.suspensionReason);
                        });
                    }
                }
            ),
            { numRuns: 30 }
        );
    });

    test('Bulk reactivate operations maintain atomicity', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.subarray(fc.constantFrom(...testTenantIds), { minLength: 1, maxLength: 3 }),
                async (selectedTenantIds) => {
                    // First suspend the tenants
                    await tenantService.bulkSuspendTenants(selectedTenantIds, 'Test suspension');
                    
                    const initialStates = await Tenant.find({ 
                        tenantId: { $in: testTenantIds } 
                    }).lean();
                    
                    const initialStateMap = new Map();
                    initialStates.forEach(tenant => {
                        initialStateMap.set(tenant.tenantId, {
                            status: tenant.status,
                            suspensionReason: tenant.metadata?.suspensionReason,
                            suspendedAt: tenant.metadata?.suspendedAt
                        });
                    });

                    try {
                        const result = await tenantService.bulkReactivateTenants(selectedTenantIds);
                        
                        const updatedTenants = await Tenant.find({ 
                            tenantId: { $in: selectedTenantIds } 
                        }).lean();
                        
                        expect(result.modifiedCount).toBe(selectedTenantIds.length);
                        expect(result.matchedCount).toBe(selectedTenantIds.length);
                        
                        updatedTenants.forEach(tenant => {
                            expect(tenant.status).toBe('active');
                            expect(tenant.metadata?.suspensionReason).toBeUndefined();
                            expect(tenant.metadata?.suspendedAt).toBeUndefined();
                        });
                        
                    } catch (error) {
                        const currentStates = await Tenant.find({ 
                            tenantId: { $in: testTenantIds } 
                        }).lean();
                        
                        currentStates.forEach(tenant => {
                            const initialState = initialStateMap.get(tenant.tenantId);
                            expect(tenant.status).toBe(initialState.status);
                        });
                    }
                }
            ),
            { numRuns: 30 }
        );
    });

    test('Bulk module enable operations maintain atomicity', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.subarray(fc.constantFrom(...testTenantIds), { minLength: 1, maxLength: 3 }),
                fc.constantFrom('payroll', 'attendance', 'performance'),
                async (selectedTenantIds, moduleId) => {
                    const initialStates = await Tenant.find({ 
                        tenantId: { $in: testTenantIds } 
                    }).lean();
                    
                    const initialStateMap = new Map();
                    initialStates.forEach(tenant => {
                        initialStateMap.set(tenant.tenantId, {
                            enabledModules: [...tenant.enabledModules]
                        });
                    });

                    try {
                        await tenantService.bulkEnableModule(selectedTenantIds, moduleId, 'test-admin');
                        
                        const finalStates = await Tenant.find({ 
                            tenantId: { $in: selectedTenantIds } 
                        }).lean();
                        
                        finalStates.forEach(tenant => {
                            const hasModule = tenant.enabledModules.some(mod => mod.moduleId === moduleId);
                            expect(hasModule).toBe(true);
                        });
                        
                    } catch (error) {
                        const currentStates = await Tenant.find({ 
                            tenantId: { $in: testTenantIds } 
                        }).lean();
                        
                        currentStates.forEach(tenant => {
                            const initialState = initialStateMap.get(tenant.tenantId);
                            expect(tenant.enabledModules).toEqual(initialState.enabledModules);
                        });
                    }
                }
            ),
            { numRuns: 30 }
        );
    });
});