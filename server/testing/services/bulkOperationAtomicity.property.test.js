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

    test('Property 7: Bulk operations maintain atomicity - all succeed or all fail', async () => {
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
});
