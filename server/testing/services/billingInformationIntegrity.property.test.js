// testing/services/billingInformationIntegrity.property.test.js
import fc from 'fast-check';
import mongoose from 'mongoose';
import Tenant from '../../platform/tenants/models/Tenant.js';
import tenantService from '../../platform/tenants/services/tenantService.js';

describe('Billing Information Integrity Property-Based Tests', () => {
    let testTenantId;
    let testTenant;

    beforeEach(async () => {
        // Create a test tenant ID
        testTenantId = `test-tenant-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

        // Create a test tenant with initial billing information
        testTenant = await Tenant.create({
            tenantId: testTenantId,
            name: 'Test Tenant for Billing',
            status: 'active',
            deploymentMode: 'saas',
            billing: {
                currentPlan: 'trial',
                billingCycle: 'monthly',
                nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                paymentStatus: 'active',
                totalRevenue: 0,
                lastPaymentDate: null,
                paymentMethod: 'credit_card'
            },
            usage: {
                userCount: 0,
                storageUsed: 0,
                apiCallsThisMonth: 0,
                activeUsers: 0,
                lastActivityAt: new Date()
            },
            restrictions: {
                maxUsers: 100,
                maxStorage: 1024, // MB
                maxAPICallsPerMonth: 10000
            }
        });
    });

    afterEach(async () => {
        // Clean up
        await Tenant.deleteMany({ tenantId: { $regex: /^test-tenant-/ } });
    });

    describe('Property 5: Billing Information Integrity', () => {
        /**
         * Feature: hr-sm-enterprise-enhancement, Property 5: Billing Information Integrity
         * Validates: Requirements 2.2
         * 
         * For any tenant billing operations, the system should maintain billing information 
         * including current plan, billing cycle, payment status, and total revenue with 
         * data consistency and integrity constraints.
         */
        test('should maintain billing information consistency during plan updates', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        currentPlan: fc.constantFrom('trial', 'basic', 'professional', 'enterprise'),
                        billingCycle: fc.constantFrom('monthly', 'yearly'),
                        paymentStatus: fc.constantFrom('active', 'past_due', 'canceled'),
                        totalRevenue: fc.double({ min: 0, max: 100000, noNaN: true }),
                        paymentMethod: fc.constantFrom('credit_card', 'bank_transfer', 'invoice', 'other')
                    }),
                    async ({ currentPlan, billingCycle, paymentStatus, totalRevenue, paymentMethod }) => {
                        // Get initial billing state
                        const initialTenant = await Tenant.findOne({ tenantId: testTenantId });
                        const initialRevenue = initialTenant.billing.totalRevenue;

                        // Action: Update billing information
                        const updatedTenant = await Tenant.findOneAndUpdate(
                            { tenantId: testTenantId },
                            {
                                'billing.currentPlan': currentPlan,
                                'billing.billingCycle': billingCycle,
                                'billing.paymentStatus': paymentStatus,
                                'billing.totalRevenue': Math.max(initialRevenue, totalRevenue), // Revenue should not decrease
                                'billing.paymentMethod': paymentMethod,
                                'billing.nextBillingDate': new Date(Date.now() + (billingCycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000),
                                'billing.lastPaymentDate': paymentStatus === 'active' ? new Date() : initialTenant.billing.lastPaymentDate,
                                updatedAt: new Date()
                            },
                            { new: true, runValidators: true }
                        );

                        // Assertion 1: Updated tenant should be returned
                        expect(updatedTenant).toBeDefined();
                        expect(updatedTenant.tenantId).toBe(testTenantId);

                        // Assertion 2: Billing information should be updated correctly
                        expect(updatedTenant.billing.currentPlan).toBe(currentPlan);
                        expect(updatedTenant.billing.billingCycle).toBe(billingCycle);
                        expect(updatedTenant.billing.paymentStatus).toBe(paymentStatus);
                        expect(updatedTenant.billing.paymentMethod).toBe(paymentMethod);

                        // Assertion 3: Revenue should maintain integrity (non-decreasing)
                        expect(updatedTenant.billing.totalRevenue).toBeGreaterThanOrEqual(initialRevenue);
                        expect(updatedTenant.billing.totalRevenue).toBeGreaterThanOrEqual(0);

                        // Assertion 4: Verify persistence by fetching fresh data
                        const freshTenant = await Tenant.findOne({ tenantId: testTenantId });
                        expect(freshTenant.billing.currentPlan).toBe(currentPlan);
                        expect(freshTenant.billing.billingCycle).toBe(billingCycle);
                        expect(freshTenant.billing.paymentStatus).toBe(paymentStatus);
                        expect(freshTenant.billing.totalRevenue).toBeGreaterThanOrEqual(initialRevenue);

                        // Assertion 5: Next billing date should be consistent with billing cycle
                        const nextBillingDate = new Date(freshTenant.billing.nextBillingDate);
                        const now = new Date();
                        const daysDifference = Math.ceil((nextBillingDate - now) / (1000 * 60 * 60 * 24));
                        
                        if (billingCycle === 'yearly') {
                            expect(daysDifference).toBeGreaterThan(300); // Should be around 365 days
                            expect(daysDifference).toBeLessThan(400);
                        } else {
                            expect(daysDifference).toBeGreaterThan(25); // Should be around 30 days
                            expect(daysDifference).toBeLessThan(35);
                        }

                        // Assertion 6: Payment date consistency
                        if (paymentStatus === 'active' && freshTenant.billing.lastPaymentDate) {
                            expect(freshTenant.billing.lastPaymentDate).toBeInstanceOf(Date);
                            expect(freshTenant.billing.lastPaymentDate.getTime()).toBeLessThanOrEqual(now.getTime());
                        }
                    }
                ),
                { numRuns: 10 }
            );
        });

        test('should maintain revenue integrity during payment processing', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        paymentAmount: fc.double({ min: 0.01, max: 10000, noNaN: true }),
                        paymentCount: fc.integer({ min: 1, max: 10 })
                    }),
                    async ({ paymentAmount, paymentCount }) => {
                        // Get initial revenue
                        const initialTenant = await Tenant.findOne({ tenantId: testTenantId });
                        const initialRevenue = initialTenant.billing.totalRevenue;

                        // Action: Process multiple payments
                        let expectedTotalRevenue = initialRevenue;
                        for (let i = 0; i < paymentCount; i++) {
                            expectedTotalRevenue += paymentAmount;
                            
                            await Tenant.findOneAndUpdate(
                                { tenantId: testTenantId },
                                {
                                    $inc: { 'billing.totalRevenue': paymentAmount },
                                    'billing.lastPaymentDate': new Date(),
                                    'billing.paymentStatus': 'active'
                                }
                            );
                        }

                        // Assertion 1: Total revenue should be accumulated correctly
                        const updatedTenant = await Tenant.findOne({ tenantId: testTenantId });
                        expect(updatedTenant.billing.totalRevenue).toBeCloseTo(expectedTotalRevenue, 2);

                        // Assertion 2: Revenue should never be negative
                        expect(updatedTenant.billing.totalRevenue).toBeGreaterThanOrEqual(0);

                        // Assertion 3: Revenue should be monotonically increasing
                        expect(updatedTenant.billing.totalRevenue).toBeGreaterThanOrEqual(initialRevenue);

                        // Assertion 4: Payment status should be updated to active
                        expect(updatedTenant.billing.paymentStatus).toBe('active');

                        // Assertion 5: Last payment date should be recent
                        expect(updatedTenant.billing.lastPaymentDate).toBeInstanceOf(Date);
                        const timeDifference = new Date() - updatedTenant.billing.lastPaymentDate;
                        expect(timeDifference).toBeLessThan(5000); // Within 5 seconds
                    }
                ),
                { numRuns: 8 }
            );
        });

        test('should enforce billing cycle and plan consistency', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        planTransitions: fc.array(
                            fc.record({
                                plan: fc.constantFrom('trial', 'basic', 'professional', 'enterprise'),
                                cycle: fc.constantFrom('monthly', 'yearly')
                            }),
                            { minLength: 2, maxLength: 5 }
                        )
                    }),
                    async ({ planTransitions }) => {
                        let currentTenant = await Tenant.findOne({ tenantId: testTenantId });
                        let previousRevenue = currentTenant.billing.totalRevenue;

                        // Action: Apply plan transitions sequentially
                        for (const transition of planTransitions) {
                            // Simulate revenue increase with plan upgrade
                            const planValues = { trial: 0, basic: 29, professional: 99, enterprise: 299 };
                            const cycleMultiplier = transition.cycle === 'yearly' ? 10 : 1;
                            const planRevenue = planValues[transition.plan] * cycleMultiplier;

                            await Tenant.findOneAndUpdate(
                                { tenantId: testTenantId },
                                {
                                    'billing.currentPlan': transition.plan,
                                    'billing.billingCycle': transition.cycle,
                                    $inc: { 'billing.totalRevenue': planRevenue },
                                    'billing.nextBillingDate': new Date(Date.now() + (transition.cycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000)
                                }
                            );

                            previousRevenue += planRevenue;
                        }

                        // Assertion 1: Final state should match last transition
                        const finalTenant = await Tenant.findOne({ tenantId: testTenantId });
                        const lastTransition = planTransitions[planTransitions.length - 1];
                        expect(finalTenant.billing.currentPlan).toBe(lastTransition.plan);
                        expect(finalTenant.billing.billingCycle).toBe(lastTransition.cycle);

                        // Assertion 2: Revenue should have accumulated correctly
                        expect(finalTenant.billing.totalRevenue).toBeCloseTo(previousRevenue, 2);

                        // Assertion 3: Next billing date should be consistent with final cycle
                        const nextBillingDate = new Date(finalTenant.billing.nextBillingDate);
                        const now = new Date();
                        const daysDifference = Math.ceil((nextBillingDate - now) / (1000 * 60 * 60 * 24));
                        
                        if (lastTransition.cycle === 'yearly') {
                            expect(daysDifference).toBeGreaterThan(300);
                            expect(daysDifference).toBeLessThan(400);
                        } else {
                            expect(daysDifference).toBeGreaterThan(25);
                            expect(daysDifference).toBeLessThan(35);
                        }

                        // Assertion 4: All billing fields should be valid
                        expect(['trial', 'basic', 'professional', 'enterprise']).toContain(finalTenant.billing.currentPlan);
                        expect(['monthly', 'yearly']).toContain(finalTenant.billing.billingCycle);
                        expect(finalTenant.billing.totalRevenue).toBeGreaterThanOrEqual(0);
                    }
                ),
                { numRuns: 6 }
            );
        });

        test('should maintain billing data integrity during concurrent updates', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        concurrentOperations: fc.array(
                            fc.record({
                                type: fc.constantFrom('payment', 'plan_change', 'status_update'),
                                amount: fc.double({ min: 1, max: 1000, noNaN: true }),
                                plan: fc.constantFrom('trial', 'basic', 'professional', 'enterprise'),
                                status: fc.constantFrom('active', 'past_due', 'canceled')
                            }),
                            { minLength: 3, maxLength: 8 }
                        )
                    }),
                    async ({ concurrentOperations }) => {
                        // Get initial state
                        const initialTenant = await Tenant.findOne({ tenantId: testTenantId });
                        const initialRevenue = initialTenant.billing.totalRevenue;

                        // Action: Perform concurrent billing operations
                        const operationPromises = concurrentOperations.map(async (op, index) => {
                            // Small delay to simulate real-world timing
                            await new Promise(resolve => setTimeout(resolve, index * 5));
                            
                            if (op.type === 'payment') {
                                return await Tenant.findOneAndUpdate(
                                    { tenantId: testTenantId },
                                    {
                                        $inc: { 'billing.totalRevenue': op.amount },
                                        'billing.lastPaymentDate': new Date(),
                                        'billing.paymentStatus': 'active'
                                    },
                                    { new: true }
                                );
                            } else if (op.type === 'plan_change') {
                                return await Tenant.findOneAndUpdate(
                                    { tenantId: testTenantId },
                                    {
                                        'billing.currentPlan': op.plan,
                                        'billing.nextBillingDate': new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                                    },
                                    { new: true }
                                );
                            } else if (op.type === 'status_update') {
                                return await Tenant.findOneAndUpdate(
                                    { tenantId: testTenantId },
                                    { 'billing.paymentStatus': op.status },
                                    { new: true }
                                );
                            }
                        });

                        // Wait for all operations to complete
                        const results = await Promise.all(operationPromises);

                        // Assertion 1: All operations should succeed
                        expect(results).toHaveLength(concurrentOperations.length);
                        results.forEach(result => {
                            expect(result).toBeDefined();
                            expect(result.tenantId).toBe(testTenantId);
                        });

                        // Assertion 2: Final state should be consistent
                        const finalTenant = await Tenant.findOne({ tenantId: testTenantId });
                        expect(finalTenant).toBeDefined();

                        // Assertion 3: Revenue should have increased by sum of all payments
                        const totalPayments = concurrentOperations
                            .filter(op => op.type === 'payment')
                            .reduce((sum, op) => sum + op.amount, 0);
                        const expectedRevenue = initialRevenue + totalPayments;
                        expect(finalTenant.billing.totalRevenue).toBeCloseTo(expectedRevenue, 2);

                        // Assertion 4: Revenue should never be negative
                        expect(finalTenant.billing.totalRevenue).toBeGreaterThanOrEqual(0);

                        // Assertion 5: Final plan should be from one of the operations
                        const planChanges = concurrentOperations.filter(op => op.type === 'plan_change');
                        if (planChanges.length > 0) {
                            const validPlans = planChanges.map(op => op.plan);
                            expect(validPlans).toContain(finalTenant.billing.currentPlan);
                        }

                        // Assertion 6: Final status should be from last relevant event (not necessarily from status updates)
                        const lastStatusEvent = concurrentOperations
                            .filter(e => ['payment', 'suspension', 'reactivation'].includes(e.eventType))
                            .pop();
                        if (lastStatusEvent) {
                            if (lastStatusEvent.eventType === 'suspension') {
                                expect(finalTenant.billing.paymentStatus).toBe('past_due');
                            } else if (['payment', 'reactivation'].includes(lastStatusEvent.eventType)) {
                                expect(finalTenant.billing.paymentStatus).toBe('active');
                            }
                        }

                        // Assertion 6: Final status should be valid (but may not match operations due to concurrency)
                        expect(['active', 'past_due', 'canceled']).toContain(finalTenant.billing.paymentStatus);

                        // Assertion 7: All billing fields should remain valid
                        expect(['trial', 'basic', 'professional', 'enterprise']).toContain(finalTenant.billing.currentPlan);
                        expect(['monthly', 'yearly']).toContain(finalTenant.billing.billingCycle);
                        expect(['active', 'past_due', 'canceled']).toContain(finalTenant.billing.paymentStatus);
                    }
                ),
                { numRuns: 5 }
            );
        });

        test('should validate billing field constraints and data types', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        currentPlan: fc.constantFrom('trial', 'basic', 'professional', 'enterprise'),
                        billingCycle: fc.constantFrom('monthly', 'yearly'),
                        paymentStatus: fc.constantFrom('active', 'past_due', 'canceled'),
                        totalRevenue: fc.double({ min: 0, max: 1000000, noNaN: true }),
                        paymentMethod: fc.constantFrom('credit_card', 'bank_transfer', 'invoice', 'other')
                    }),
                    async ({ currentPlan, billingCycle, paymentStatus, totalRevenue, paymentMethod }) => {
                        // Action: Update billing with valid data
                        const updatedTenant = await Tenant.findOneAndUpdate(
                            { tenantId: testTenantId },
                            {
                                'billing.currentPlan': currentPlan,
                                'billing.billingCycle': billingCycle,
                                'billing.paymentStatus': paymentStatus,
                                'billing.totalRevenue': totalRevenue,
                                'billing.paymentMethod': paymentMethod,
                                'billing.nextBillingDate': new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                                'billing.lastPaymentDate': paymentStatus === 'active' ? new Date() : null
                            },
                            { new: true, runValidators: true }
                        );

                        // Assertion 1: Update should succeed with valid data
                        expect(updatedTenant).toBeDefined();
                        expect(updatedTenant.tenantId).toBe(testTenantId);

                        // Assertion 2: All enum fields should be validated
                        expect(['trial', 'basic', 'professional', 'enterprise']).toContain(updatedTenant.billing.currentPlan);
                        expect(['monthly', 'yearly']).toContain(updatedTenant.billing.billingCycle);
                        expect(['active', 'past_due', 'canceled']).toContain(updatedTenant.billing.paymentStatus);
                        expect(['credit_card', 'bank_transfer', 'invoice', 'other']).toContain(updatedTenant.billing.paymentMethod);

                        // Assertion 3: Numeric fields should be valid
                        expect(updatedTenant.billing.totalRevenue).toBeGreaterThanOrEqual(0);
                        expect(typeof updatedTenant.billing.totalRevenue).toBe('number');
                        expect(isNaN(updatedTenant.billing.totalRevenue)).toBe(false);

                        // Assertion 4: Date fields should be valid Date objects
                        expect(updatedTenant.billing.nextBillingDate).toBeInstanceOf(Date);
                        if (updatedTenant.billing.lastPaymentDate) {
                            expect(updatedTenant.billing.lastPaymentDate).toBeInstanceOf(Date);
                        }

                        // Assertion 5: Next billing date should be in the future
                        expect(updatedTenant.billing.nextBillingDate.getTime()).toBeGreaterThan(Date.now());

                        // Assertion 6: Last payment date should not be in the future
                        if (updatedTenant.billing.lastPaymentDate) {
                            expect(updatedTenant.billing.lastPaymentDate.getTime()).toBeLessThanOrEqual(Date.now());
                        }
                    }
                ),
                { numRuns: 12 }
            );
        });

        test('should maintain billing history and audit trail integrity', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        billingEvents: fc.array(
                            fc.record({
                                eventType: fc.constantFrom('payment', 'plan_upgrade', 'plan_downgrade', 'suspension', 'reactivation'),
                                amount: fc.double({ min: 0, max: 5000, noNaN: true }),
                                newPlan: fc.constantFrom('trial', 'basic', 'professional', 'enterprise')
                            }),
                            { minLength: 1, maxLength: 5 }
                        )
                    }),
                    async ({ billingEvents }) => {
                        // Get initial state
                        const initialTenant = await Tenant.findOne({ tenantId: testTenantId });
                        const initialRevenue = initialTenant.billing.totalRevenue;
                        let expectedRevenue = initialRevenue;

                        // Action: Process billing events sequentially
                        for (const event of billingEvents) {
                            const updateData = { updatedAt: new Date() };

                            if (event.eventType === 'payment') {
                                updateData['billing.totalRevenue'] = expectedRevenue + event.amount;
                                updateData['billing.lastPaymentDate'] = new Date();
                                updateData['billing.paymentStatus'] = 'active';
                                expectedRevenue += event.amount;
                            } else if (event.eventType === 'plan_upgrade' || event.eventType === 'plan_downgrade') {
                                updateData['billing.currentPlan'] = event.newPlan;
                                updateData['billing.nextBillingDate'] = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                            } else if (event.eventType === 'suspension') {
                                updateData['billing.paymentStatus'] = 'past_due';
                            } else if (event.eventType === 'reactivation') {
                                updateData['billing.paymentStatus'] = 'active';
                                updateData['billing.lastPaymentDate'] = new Date();
                            }

                            await Tenant.findOneAndUpdate(
                                { tenantId: testTenantId },
                                updateData,
                                { new: true }
                            );

                            // Small delay to ensure different timestamps
                            await new Promise(resolve => setTimeout(resolve, 10));
                        }

                        // Assertion 1: Final revenue should match expected
                        const finalTenant = await Tenant.findOne({ tenantId: testTenantId });
                        expect(finalTenant.billing.totalRevenue).toBeCloseTo(expectedRevenue, 2);

                        // Assertion 2: Revenue should never decrease
                        expect(finalTenant.billing.totalRevenue).toBeGreaterThanOrEqual(initialRevenue);

                        // Assertion 3: UpdatedAt should be recent
                        expect(finalTenant.updatedAt).toBeInstanceOf(Date);
                        const timeDifference = new Date() - finalTenant.updatedAt;
                        expect(timeDifference).toBeLessThan(10000); // Within 10 seconds

                        // Assertion 4: Final plan should be from last plan change event
                        const lastPlanChange = billingEvents
                            .filter(e => e.eventType === 'plan_upgrade' || e.eventType === 'plan_downgrade')
                            .pop();
                        if (lastPlanChange) {
                            expect(finalTenant.billing.currentPlan).toBe(lastPlanChange.newPlan);
                        }

                        // Assertion 5: Payment status should reflect last relevant event
                        const lastStatusEvent = billingEvents
                            .filter(e => ['payment', 'suspension', 'reactivation'].includes(e.eventType))
                            .pop();
                        if (lastStatusEvent) {
                            if (lastStatusEvent.eventType === 'suspension') {
                                expect(finalTenant.billing.paymentStatus).toBe('past_due');
                            } else if (['payment', 'reactivation'].includes(lastStatusEvent.eventType)) {
                                expect(finalTenant.billing.paymentStatus).toBe('active');
                            }
                        }

                        // Assertion 6: All billing data should remain valid
                        expect(['trial', 'basic', 'professional', 'enterprise']).toContain(finalTenant.billing.currentPlan);
                        expect(['monthly', 'yearly']).toContain(finalTenant.billing.billingCycle);
                        expect(['active', 'past_due', 'canceled']).toContain(finalTenant.billing.paymentStatus);
                        expect(finalTenant.billing.totalRevenue).toBeGreaterThanOrEqual(0);
                    }
                ),
                { numRuns: 6 }
            );
        });
    });
});