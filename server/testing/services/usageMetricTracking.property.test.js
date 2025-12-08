/**
 * Property-Based Tests for Usage Metric Tracking
 * 
 * Feature: feature-productization, Property 20: Usage Metric Tracking
 * Validates: Requirements 7.1
 * 
 * This test verifies that for any Product Module usage event, the system
 * should record the usage metric and compare it against the defined limit.
 */

import fc from 'fast-check';
import mongoose from 'mongoose';
import usageTracker from '../../services/usageTracker.service.js';
import UsageTracking from '../../models/usageTracking.model.js';
import License, { MODULES } from '../../models/license.model.js';
import LicenseAudit from '../../models/licenseAudit.model.js';

describe('Usage Metric Tracking - Property-Based Tests', () => {
    let testTenantIds = [];

    beforeEach(async () => {
        // Clear any existing test data
        await License.deleteMany({});
        await UsageTracking.deleteMany({});
        await LicenseAudit.deleteMany({});
        testTenantIds = [];
        
        // Clear batch queue
        usageTracker.batchQueue.clear();
    });

    afterEach(async () => {
        // Clean up test data
        await License.deleteMany({});
        await UsageTracking.deleteMany({});
        await LicenseAudit.deleteMany({});
        
        // Clear batch queue
        usageTracker.batchQueue.clear();
    });

    /**
     * Feature: feature-productization, Property 20: Usage Metric Tracking
     * 
     * Property: For any Product Module usage event, the system should record
     * the usage metric and compare it against the defined limit.
     * 
     * This property ensures that all usage events are properly tracked and
     * compared against limits, as required by Requirement 7.1.
     */
    test('Property 20: Usage Metric Tracking', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate arbitrary usage scenarios
                fc.record({
                    moduleKey: fc.constantFrom(
                        MODULES.ATTENDANCE,
                        MODULES.LEAVE,
                        MODULES.PAYROLL,
                        MODULES.DOCUMENTS,
                        MODULES.COMMUNICATION,
                        MODULES.REPORTING,
                        MODULES.TASKS
                    ),
                    usageType: fc.constantFrom('employees', 'storage', 'apiCalls'),
                    amount: fc.integer({ min: 1, max: 100 }),
                    limit: fc.option(fc.integer({ min: 50, max: 1000 }), { nil: null }),
                    tier: fc.constantFrom('starter', 'business', 'enterprise')
                }),
                async ({ moduleKey, usageType, amount, limit, tier }) => {
                    // Setup: Create a tenant with a license
                    const tenantObjectId = new mongoose.Types.ObjectId();
                    testTenantIds.push(tenantObjectId);

                    // Create limits object
                    const limits = {};
                    if (limit !== null) {
                        limits[usageType] = limit;
                    }

                    // Create license with the module enabled
                    await License.create({
                        tenantId: tenantObjectId,
                        subscriptionId: `sub-${tenantObjectId.toString()}`,
                        status: 'active',
                        modules: [
                            {
                                key: moduleKey,
                                enabled: true,
                                tier: tier,
                                limits: limits,
                                activatedAt: new Date(),
                                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                            }
                        ]
                    });

                    // Track usage with immediate processing
                    const trackResult = await usageTracker.trackUsage(
                        tenantObjectId.toString(),
                        moduleKey,
                        usageType,
                        amount,
                        { immediate: true }
                    );

                    // Verify tracking result based on whether limit would be exceeded
                    const wouldExceedLimit = limit !== null && amount > limit;
                    
                    if (wouldExceedLimit) {
                        // Should be blocked
                        expect(trackResult.success).toBe(false);
                        expect(trackResult.tracked).toBe(false);
                        expect(trackResult.blocked).toBe(true);
                        expect(trackResult.error).toBe('LIMIT_EXCEEDED');
                    } else {
                        // Should succeed
                        expect(trackResult.success).toBe(true);
                        expect(trackResult.tracked).toBe(true);
                    }

                    // Only verify usage if tracking was not blocked
                    if (!wouldExceedLimit) {
                        // Get usage to verify it was recorded
                        const usageReport = await usageTracker.getUsage(
                            tenantObjectId.toString(),
                            moduleKey
                        );

                        expect(usageReport.success).toBe(true);
                        expect(usageReport.usage[usageType]).toBeDefined();

                        // Verify the usage was recorded correctly
                        expect(usageReport.usage[usageType].current).toBe(amount);

                        // Verify limit comparison
                        if (limit !== null) {
                            expect(usageReport.usage[usageType].limit).toBe(limit);
                            
                            // Verify percentage calculation
                            const expectedPercentage = Math.round((amount / limit) * 100);
                            expect(usageReport.usage[usageType].percentage).toBe(expectedPercentage);

                            // Verify limit checking
                            if (amount === limit) {
                                // At limit - should not be blocked but is considered exceeded
                                expect(usageReport.usage[usageType].hasExceeded).toBe(true);
                            } else {
                                // Below limit - should not be exceeded
                                expect(usageReport.usage[usageType].hasExceeded).toBe(false);
                            }

                            // Verify warning detection (80% threshold)
                            if (amount >= limit * 0.8) {
                                expect(usageReport.usage[usageType].isApproachingLimit).toBe(true);
                                
                                // Should have a warning
                                if (usageReport.warnings.length > 0) {
                                    const warning = usageReport.warnings.find(w => w.limitType === usageType);
                                    if (warning) {
                                        expect(warning.percentage).toBeGreaterThanOrEqual(80);
                                    }
                                }
                            }
                        } else {
                            // No limit
                            expect(usageReport.usage[usageType].limit).toBeNull();
                            expect(usageReport.usage[usageType].percentage).toBeNull();
                        }

                        // Verify usage tracking document exists
                        const period = UsageTracking.getCurrentPeriod();
                        const usageDoc = await UsageTracking.findOne({
                            tenantId: tenantObjectId,
                            moduleKey: moduleKey,
                            period: period
                        });

                        expect(usageDoc).not.toBeNull();
                        expect(usageDoc.usage[usageType]).toBeDefined();
                        
                        // Verify limits are stored in the tracking document
                        if (limit !== null) {
                            expect(usageDoc.limits[usageType]).toBe(limit);
                        }
                    } else {
                        // When blocked, usage should not be recorded
                        // The system prevents the usage from happening, so no tracking document is created
                        // or the usage remains at 0
                        const usageReport = await usageTracker.getUsage(
                            tenantObjectId.toString(),
                            moduleKey
                        );
                        
                        expect(usageReport.success).toBe(true);
                        
                        // Usage should be 0 or not recorded since it was blocked
                        expect(usageReport.usage[usageType].current).toBe(0);
                    }
                }
            ),
            { numRuns: 100 } // Run 100 iterations as specified in design
        );
    });

    /**
     * Additional property: Usage tracking should accumulate correctly
     * 
     * This ensures that multiple usage events accumulate properly.
     */
    test('Property 20.1: Usage tracking accumulates correctly', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    moduleKey: fc.constantFrom(
                        MODULES.ATTENDANCE,
                        MODULES.LEAVE,
                        MODULES.PAYROLL
                    ),
                    usageType: fc.constantFrom('employees', 'storage', 'apiCalls'),
                    amounts: fc.array(fc.integer({ min: 1, max: 10 }), { minLength: 2, maxLength: 5 }),
                    limit: fc.integer({ min: 100, max: 1000 })
                }),
                async ({ moduleKey, usageType, amounts, limit }) => {
                    const tenantObjectId = new mongoose.Types.ObjectId();
                    testTenantIds.push(tenantObjectId);

                    // Create license
                    const limits = { [usageType]: limit };
                    await License.create({
                        tenantId: tenantObjectId,
                        subscriptionId: `sub-${tenantObjectId.toString()}`,
                        status: 'active',
                        modules: [
                            {
                                key: moduleKey,
                                enabled: true,
                                tier: 'business',
                                limits: limits,
                                activatedAt: new Date(),
                                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                            }
                        ]
                    });

                    // Track multiple usage events
                    let expectedTotal = 0;
                    for (const amount of amounts) {
                        const result = await usageTracker.trackUsage(
                            tenantObjectId.toString(),
                            moduleKey,
                            usageType,
                            amount,
                            { immediate: true }
                        );

                        if (!result.blocked) {
                            expectedTotal += amount;
                        }

                        // If we exceed the limit, stop tracking
                        if (result.blocked) {
                            break;
                        }
                    }

                    // Get final usage
                    const usageReport = await usageTracker.getUsage(
                        tenantObjectId.toString(),
                        moduleKey
                    );

                    // Verify accumulated usage
                    expect(usageReport.usage[usageType].current).toBe(expectedTotal);
                    expect(usageReport.usage[usageType].current).toBeLessThanOrEqual(limit);
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Additional property: Core HR should not track usage
     * 
     * This ensures that Core HR module doesn't have usage tracking.
     */
    test('Property 20.2: Core HR does not track usage', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    usageType: fc.constantFrom('employees', 'storage', 'apiCalls'),
                    amount: fc.integer({ min: 1, max: 100 })
                }),
                async ({ usageType, amount }) => {
                    const tenantObjectId = new mongoose.Types.ObjectId();
                    testTenantIds.push(tenantObjectId);

                    // Track usage for Core HR
                    const result = await usageTracker.trackUsage(
                        tenantObjectId.toString(),
                        MODULES.CORE_HR,
                        usageType,
                        amount,
                        { immediate: true }
                    );

                    // Should succeed but not track
                    expect(result.success).toBe(true);
                    expect(result.tracked).toBe(false);
                    expect(result.reason).toContain('Core HR');

                    // Verify no usage tracking document was created
                    const period = UsageTracking.getCurrentPeriod();
                    const usageDoc = await UsageTracking.findOne({
                        tenantId: tenantObjectId,
                        moduleKey: MODULES.CORE_HR,
                        period: period
                    });

                    expect(usageDoc).toBeNull();
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Additional property: Usage tracking should work across different periods
     * 
     * This ensures that usage is tracked per period correctly.
     */
    test('Property 20.3: Usage tracking is period-specific', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    moduleKey: fc.constantFrom(
                        MODULES.ATTENDANCE,
                        MODULES.LEAVE
                    ),
                    usageType: fc.constantFrom('employees', 'storage', 'apiCalls'),
                    amount: fc.integer({ min: 1, max: 50 }),
                    limit: fc.integer({ min: 100, max: 500 })
                }),
                async ({ moduleKey, usageType, amount, limit }) => {
                    const tenantObjectId = new mongoose.Types.ObjectId();
                    testTenantIds.push(tenantObjectId);

                    // Create license
                    const limits = { [usageType]: limit };
                    await License.create({
                        tenantId: tenantObjectId,
                        subscriptionId: `sub-${tenantObjectId.toString()}`,
                        status: 'active',
                        modules: [
                            {
                                key: moduleKey,
                                enabled: true,
                                tier: 'business',
                                limits: limits,
                                activatedAt: new Date(),
                                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                            }
                        ]
                    });

                    // Track usage
                    await usageTracker.trackUsage(
                        tenantObjectId.toString(),
                        moduleKey,
                        usageType,
                        amount,
                        { immediate: true }
                    );

                    // Get current period
                    const currentPeriod = UsageTracking.getCurrentPeriod();

                    // Verify usage is tracked for current period
                    const currentUsageDoc = await UsageTracking.findOne({
                        tenantId: tenantObjectId,
                        moduleKey: moduleKey,
                        period: currentPeriod
                    });

                    expect(currentUsageDoc).not.toBeNull();
                    expect(currentUsageDoc.usage[usageType]).toBe(amount);

                    // Verify no usage for other periods
                    const otherPeriodDocs = await UsageTracking.find({
                        tenantId: tenantObjectId,
                        moduleKey: moduleKey,
                        period: { $ne: currentPeriod }
                    });

                    expect(otherPeriodDocs.length).toBe(0);
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Additional property: Invalid usage types should be rejected
     * 
     * This ensures that only valid usage types are accepted.
     */
    test('Property 20.4: Invalid usage types are rejected', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    moduleKey: fc.constantFrom(
                        MODULES.ATTENDANCE,
                        MODULES.LEAVE
                    ),
                    invalidUsageType: fc.string({ minLength: 1, maxLength: 20 })
                        .filter(s => !['employees', 'storage', 'apiCalls'].includes(s)),
                    amount: fc.integer({ min: 1, max: 100 })
                }),
                async ({ moduleKey, invalidUsageType, amount }) => {
                    const tenantObjectId = new mongoose.Types.ObjectId();
                    testTenantIds.push(tenantObjectId);

                    // Create license
                    await License.create({
                        tenantId: tenantObjectId,
                        subscriptionId: `sub-${tenantObjectId.toString()}`,
                        status: 'active',
                        modules: [
                            {
                                key: moduleKey,
                                enabled: true,
                                tier: 'business',
                                limits: { employees: 100 },
                                activatedAt: new Date(),
                                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                            }
                        ]
                    });

                    // Try to track with invalid usage type
                    const result = await usageTracker.trackUsage(
                        tenantObjectId.toString(),
                        moduleKey,
                        invalidUsageType,
                        amount,
                        { immediate: true }
                    );

                    // Should fail
                    expect(result.success).toBe(false);
                    expect(result.tracked).toBe(false);
                    expect(result.error).toBeDefined();
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Feature: feature-productization, Property 21: Warning Threshold Triggering
     * 
     * Property: For any usage metric that reaches 80% of its limit, a warning
     * notification should be sent to administrators.
     * 
     * This property ensures that warning notifications are triggered when usage
     * approaches the limit threshold, as required by Requirement 7.2.
     * 
     * Validates: Requirements 7.2
     */
    test('Property 21: Warning Threshold Triggering', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    moduleKey: fc.constantFrom(
                        MODULES.ATTENDANCE,
                        MODULES.LEAVE,
                        MODULES.PAYROLL,
                        MODULES.DOCUMENTS,
                        MODULES.COMMUNICATION,
                        MODULES.REPORTING,
                        MODULES.TASKS
                    ),
                    usageType: fc.constantFrom('employees', 'storage', 'apiCalls'),
                    limit: fc.integer({ min: 100, max: 1000 }),
                    tier: fc.constantFrom('starter', 'business', 'enterprise')
                }),
                async ({ moduleKey, usageType, limit, tier }) => {
                    const tenantObjectId = new mongoose.Types.ObjectId();
                    testTenantIds.push(tenantObjectId);

                    // Create limits object
                    const limits = { [usageType]: limit };

                    // Create license with the module enabled
                    await License.create({
                        tenantId: tenantObjectId,
                        subscriptionId: `sub-${tenantObjectId.toString()}`,
                        status: 'active',
                        modules: [
                            {
                                key: moduleKey,
                                enabled: true,
                                tier: tier,
                                limits: limits,
                                activatedAt: new Date(),
                                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                            }
                        ]
                    });

                    // Calculate amount that will reach exactly 80% of limit
                    const warningThresholdAmount = Math.ceil(limit * 0.8);

                    // Set up event listener to capture warning event
                    let warningEmitted = false;
                    let warningData = null;
                    
                    const warningListener = (data) => {
                        if (data.tenantId === tenantObjectId.toString() && 
                            data.moduleKey === moduleKey && 
                            data.limitType === usageType) {
                            warningEmitted = true;
                            warningData = data;
                        }
                    };
                    
                    usageTracker.on('limitWarning', warningListener);

                    try {
                        // Track usage that reaches 80% threshold
                        const trackResult = await usageTracker.trackUsage(
                            tenantObjectId.toString(),
                            moduleKey,
                            usageType,
                            warningThresholdAmount,
                            { immediate: true }
                        );

                        // Verify tracking succeeded
                        expect(trackResult.success).toBe(true);
                        expect(trackResult.tracked).toBe(true);
                        expect(trackResult.isApproachingLimit).toBe(true);

                        // Verify warning event was emitted
                        expect(warningEmitted).toBe(true);
                        expect(warningData).not.toBeNull();
                        expect(warningData.tenantId).toBe(tenantObjectId.toString());
                        expect(warningData.moduleKey).toBe(moduleKey);
                        expect(warningData.limitType).toBe(usageType);
                        expect(warningData.currentUsage).toBe(warningThresholdAmount);
                        expect(warningData.limit).toBe(limit);
                        expect(warningData.percentage).toBeGreaterThanOrEqual(80);

                        // Verify audit log was created for the warning
                        const auditLogs = await LicenseAudit.find({
                            tenantId: tenantObjectId,
                            moduleKey: moduleKey,
                            eventType: 'LIMIT_WARNING'
                        });

                        expect(auditLogs.length).toBeGreaterThan(0);
                        
                        const warningLog = auditLogs.find(log => 
                            log.details.limitType === usageType
                        );
                        
                        expect(warningLog).toBeDefined();
                        expect(warningLog.details.currentValue).toBe(warningThresholdAmount);
                        expect(warningLog.details.limitValue).toBe(limit);
                        
                        // Percentage should be in details if provided
                        if (warningLog.details.percentage !== undefined) {
                            expect(warningLog.details.percentage).toBeGreaterThanOrEqual(80);
                        }

                        // Verify usage tracking document has warning recorded
                        const period = UsageTracking.getCurrentPeriod();
                        const usageDoc = await UsageTracking.findOne({
                            tenantId: tenantObjectId,
                            moduleKey: moduleKey,
                            period: period
                        });

                        expect(usageDoc).not.toBeNull();
                        
                        // Check if warning was recorded in the document
                        const warning = usageDoc.warnings.find(w => w.limitType === usageType);
                        expect(warning).toBeDefined();
                        expect(warning.percentage).toBeGreaterThanOrEqual(80);

                    } finally {
                        // Clean up event listener
                        usageTracker.off('limitWarning', warningListener);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Additional property: Warning should not be triggered below 80% threshold
     * 
     * This ensures that warnings are only triggered at or above the 80% threshold.
     */
    test('Property 21.1: Warning not triggered below 80% threshold', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    moduleKey: fc.constantFrom(
                        MODULES.ATTENDANCE,
                        MODULES.LEAVE,
                        MODULES.PAYROLL
                    ),
                    usageType: fc.constantFrom('employees', 'storage', 'apiCalls'),
                    limit: fc.integer({ min: 100, max: 1000 }),
                    // Generate usage percentage below 80%
                    usagePercentage: fc.integer({ min: 10, max: 79 })
                }),
                async ({ moduleKey, usageType, limit, usagePercentage }) => {
                    const tenantObjectId = new mongoose.Types.ObjectId();
                    testTenantIds.push(tenantObjectId);

                    // Create limits object
                    const limits = { [usageType]: limit };

                    // Create license
                    await License.create({
                        tenantId: tenantObjectId,
                        subscriptionId: `sub-${tenantObjectId.toString()}`,
                        status: 'active',
                        modules: [
                            {
                                key: moduleKey,
                                enabled: true,
                                tier: 'business',
                                limits: limits,
                                activatedAt: new Date(),
                                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                            }
                        ]
                    });

                    // Calculate amount below 80% threshold
                    const amount = Math.floor(limit * (usagePercentage / 100));

                    // Set up event listener
                    let warningEmitted = false;
                    const warningListener = (data) => {
                        if (data.tenantId === tenantObjectId.toString() && 
                            data.moduleKey === moduleKey && 
                            data.limitType === usageType) {
                            warningEmitted = true;
                        }
                    };
                    
                    usageTracker.on('limitWarning', warningListener);

                    try {
                        // Track usage below threshold
                        const trackResult = await usageTracker.trackUsage(
                            tenantObjectId.toString(),
                            moduleKey,
                            usageType,
                            amount,
                            { immediate: true }
                        );

                        // Verify tracking succeeded
                        expect(trackResult.success).toBe(true);
                        expect(trackResult.tracked).toBe(true);
                        expect(trackResult.isApproachingLimit).toBe(false);

                        // Verify warning event was NOT emitted
                        expect(warningEmitted).toBe(false);

                        // Verify no warning audit log was created
                        const auditLogs = await LicenseAudit.find({
                            tenantId: tenantObjectId,
                            moduleKey: moduleKey,
                            eventType: 'LIMIT_WARNING',
                            'details.limitType': usageType
                        });

                        expect(auditLogs.length).toBe(0);

                    } finally {
                        // Clean up event listener
                        usageTracker.off('limitWarning', warningListener);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Additional property: Warning should only be emitted once per 24 hours
     * 
     * This ensures that administrators are not spammed with repeated warnings.
     */
    test('Property 21.2: Warning not repeated within 24 hours', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    moduleKey: fc.constantFrom(
                        MODULES.ATTENDANCE,
                        MODULES.LEAVE
                    ),
                    usageType: fc.constantFrom('employees', 'storage', 'apiCalls'),
                    limit: fc.integer({ min: 100, max: 500 })
                }),
                async ({ moduleKey, usageType, limit }) => {
                    const tenantObjectId = new mongoose.Types.ObjectId();
                    testTenantIds.push(tenantObjectId);

                    // Create limits object
                    const limits = { [usageType]: limit };

                    // Create license
                    await License.create({
                        tenantId: tenantObjectId,
                        subscriptionId: `sub-${tenantObjectId.toString()}`,
                        status: 'active',
                        modules: [
                            {
                                key: moduleKey,
                                enabled: true,
                                tier: 'business',
                                limits: limits,
                                activatedAt: new Date(),
                                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                            }
                        ]
                    });

                    // Calculate amount that reaches 80% threshold
                    const warningAmount = Math.ceil(limit * 0.8);

                    // Track warning events
                    let warningCount = 0;
                    const warningListener = (data) => {
                        if (data.tenantId === tenantObjectId.toString() && 
                            data.moduleKey === moduleKey && 
                            data.limitType === usageType) {
                            warningCount++;
                        }
                    };
                    
                    usageTracker.on('limitWarning', warningListener);

                    try {
                        // First usage - should trigger warning
                        await usageTracker.trackUsage(
                            tenantObjectId.toString(),
                            moduleKey,
                            usageType,
                            warningAmount,
                            { immediate: true }
                        );

                        expect(warningCount).toBe(1);

                        // Second usage immediately after - should NOT trigger another warning
                        await usageTracker.trackUsage(
                            tenantObjectId.toString(),
                            moduleKey,
                            usageType,
                            1,
                            { immediate: true }
                        );

                        // Warning count should still be 1 (not incremented)
                        expect(warningCount).toBe(1);

                    } finally {
                        // Clean up event listener
                        usageTracker.off('limitWarning', warningListener);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Feature: feature-productization, Property 22: Usage Blocking on Limit Exceeded
     * 
     * Property: For any usage metric that exceeds its limit, further usage should
     * be blocked and an audit event should be logged.
     * 
     * This property ensures that when usage limits are exceeded, the system blocks
     * the usage attempt and properly logs the violation, as required by Requirement 7.3.
     * 
     * Validates: Requirements 7.3
     */
    test('Property 22: Usage Blocking on Limit Exceeded', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    moduleKey: fc.constantFrom(
                        MODULES.ATTENDANCE,
                        MODULES.LEAVE,
                        MODULES.PAYROLL,
                        MODULES.DOCUMENTS,
                        MODULES.COMMUNICATION,
                        MODULES.REPORTING,
                        MODULES.TASKS
                    ),
                    usageType: fc.constantFrom('employees', 'storage', 'apiCalls'),
                    limit: fc.integer({ min: 50, max: 500 }),
                    // Generate amount that will exceed the limit
                    excessAmount: fc.integer({ min: 1, max: 100 }),
                    tier: fc.constantFrom('starter', 'business', 'enterprise')
                }),
                async ({ moduleKey, usageType, limit, excessAmount, tier }) => {
                    const tenantObjectId = new mongoose.Types.ObjectId();
                    testTenantIds.push(tenantObjectId);

                    // Create limits object
                    const limits = { [usageType]: limit };

                    // Create license with the module enabled
                    await License.create({
                        tenantId: tenantObjectId,
                        subscriptionId: `sub-${tenantObjectId.toString()}`,
                        status: 'active',
                        modules: [
                            {
                                key: moduleKey,
                                enabled: true,
                                tier: tier,
                                limits: limits,
                                activatedAt: new Date(),
                                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                            }
                        ]
                    });

                    // Set up event listener to capture limit exceeded event
                    let limitExceededEmitted = false;
                    let limitExceededData = null;
                    
                    const limitExceededListener = (data) => {
                        if (data.tenantId === tenantObjectId.toString() && 
                            data.moduleKey === moduleKey && 
                            data.limitType === usageType) {
                            limitExceededEmitted = true;
                            limitExceededData = data;
                        }
                    };
                    
                    usageTracker.on('limitExceeded', limitExceededListener);

                    try {
                        // Calculate amount that will exceed the limit
                        const exceedingAmount = limit + excessAmount;

                        // Attempt to track usage that exceeds the limit
                        const trackResult = await usageTracker.trackUsage(
                            tenantObjectId.toString(),
                            moduleKey,
                            usageType,
                            exceedingAmount,
                            { immediate: true }
                        );

                        // Assertion 1: Usage should be blocked
                        expect(trackResult.success).toBe(false);
                        expect(trackResult.tracked).toBe(false);
                        expect(trackResult.blocked).toBe(true);
                        expect(trackResult.error).toBe('LIMIT_EXCEEDED');
                        expect(trackResult.reason).toContain('exceeded');

                        // Assertion 2: Current usage and limit should be reported
                        expect(trackResult.currentUsage).toBe(0); // No prior usage
                        expect(trackResult.limit).toBe(limit);

                        // Assertion 3: Limit exceeded event should be emitted
                        expect(limitExceededEmitted).toBe(true);
                        expect(limitExceededData).not.toBeNull();
                        expect(limitExceededData.tenantId).toBe(tenantObjectId.toString());
                        expect(limitExceededData.moduleKey).toBe(moduleKey);
                        expect(limitExceededData.limitType).toBe(usageType);
                        expect(limitExceededData.currentUsage).toBe(0);
                        expect(limitExceededData.limit).toBe(limit);
                        expect(limitExceededData.attemptedAmount).toBe(exceedingAmount);

                        // Assertion 4: Audit log should be created for the violation
                        const auditLogs = await LicenseAudit.find({
                            tenantId: tenantObjectId,
                            moduleKey: moduleKey,
                            eventType: 'LIMIT_EXCEEDED'
                        });

                        expect(auditLogs.length).toBeGreaterThan(0);
                        
                        const violationLog = auditLogs.find(log => 
                            log.details.limitType === usageType
                        );
                        
                        expect(violationLog).toBeDefined();
                        expect(violationLog.details.currentValue).toBe(exceedingAmount);
                        expect(violationLog.details.limitValue).toBe(limit);
                        expect(violationLog.severity).toBe('critical');

                        // Assertion 5: Usage should NOT be recorded (remains at 0)
                        const usageReport = await usageTracker.getUsage(
                            tenantObjectId.toString(),
                            moduleKey
                        );

                        expect(usageReport.success).toBe(true);
                        expect(usageReport.usage[usageType].current).toBe(0);
                        expect(usageReport.usage[usageType].limit).toBe(limit);

                        // Assertion 6: Subsequent valid usage should still be blocked if it would exceed
                        const secondAttempt = await usageTracker.trackUsage(
                            tenantObjectId.toString(),
                            moduleKey,
                            usageType,
                            limit + 1,
                            { immediate: true }
                        );

                        expect(secondAttempt.success).toBe(false);
                        expect(secondAttempt.blocked).toBe(true);
                        expect(secondAttempt.error).toBe('LIMIT_EXCEEDED');

                    } finally {
                        // Clean up event listener
                        usageTracker.off('limitExceeded', limitExceededListener);
                    }
                }
            ),
            { numRuns: 100 } // Run 100 iterations as specified in design
        );
    });

    /**
     * Additional property: Usage at exactly the limit should be blocked
     * 
     * This ensures that usage at the limit boundary is properly handled.
     */
    test('Property 22.1: Usage at exactly the limit is blocked', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    moduleKey: fc.constantFrom(
                        MODULES.ATTENDANCE,
                        MODULES.LEAVE,
                        MODULES.PAYROLL
                    ),
                    usageType: fc.constantFrom('employees', 'storage', 'apiCalls'),
                    limit: fc.integer({ min: 50, max: 500 })
                }),
                async ({ moduleKey, usageType, limit }) => {
                    const tenantObjectId = new mongoose.Types.ObjectId();
                    testTenantIds.push(tenantObjectId);

                    // Create limits object
                    const limits = { [usageType]: limit };

                    // Create license
                    await License.create({
                        tenantId: tenantObjectId,
                        subscriptionId: `sub-${tenantObjectId.toString()}`,
                        status: 'active',
                        modules: [
                            {
                                key: moduleKey,
                                enabled: true,
                                tier: 'business',
                                limits: limits,
                                activatedAt: new Date(),
                                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                            }
                        ]
                    });

                    // First, use up to the limit
                    const firstResult = await usageTracker.trackUsage(
                        tenantObjectId.toString(),
                        moduleKey,
                        usageType,
                        limit,
                        { immediate: true }
                    );

                    // Should succeed - we're at the limit
                    expect(firstResult.success).toBe(true);
                    expect(firstResult.tracked).toBe(true);

                    // Now try to add even 1 more - should be blocked
                    const secondResult = await usageTracker.trackUsage(
                        tenantObjectId.toString(),
                        moduleKey,
                        usageType,
                        1,
                        { immediate: true }
                    );

                    // Should be blocked
                    expect(secondResult.success).toBe(false);
                    expect(secondResult.blocked).toBe(true);
                    expect(secondResult.error).toBe('LIMIT_EXCEEDED');
                    expect(secondResult.currentUsage).toBe(limit);

                    // Verify audit log was created
                    const auditLogs = await LicenseAudit.find({
                        tenantId: tenantObjectId,
                        moduleKey: moduleKey,
                        eventType: 'LIMIT_EXCEEDED',
                        'details.limitType': usageType
                    });

                    expect(auditLogs.length).toBeGreaterThan(0);
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Additional property: Multiple blocked attempts should each be logged
     * 
     * This ensures that all violation attempts are properly audited.
     */
    test('Property 22.2: Multiple blocked attempts are all logged', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    moduleKey: fc.constantFrom(
                        MODULES.ATTENDANCE,
                        MODULES.LEAVE
                    ),
                    usageType: fc.constantFrom('employees', 'storage', 'apiCalls'),
                    limit: fc.integer({ min: 50, max: 200 }),
                    // Generate multiple attempts
                    attempts: fc.array(fc.integer({ min: 1, max: 50 }), { minLength: 2, maxLength: 5 })
                }),
                async ({ moduleKey, usageType, limit, attempts }) => {
                    const tenantObjectId = new mongoose.Types.ObjectId();
                    testTenantIds.push(tenantObjectId);

                    // Create limits object
                    const limits = { [usageType]: limit };

                    // Create license
                    await License.create({
                        tenantId: tenantObjectId,
                        subscriptionId: `sub-${tenantObjectId.toString()}`,
                        status: 'active',
                        modules: [
                            {
                                key: moduleKey,
                                enabled: true,
                                tier: 'business',
                                limits: limits,
                                activatedAt: new Date(),
                                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                            }
                        ]
                    });

                    // Track multiple attempts that exceed the limit
                    let blockedCount = 0;
                    for (const amount of attempts) {
                        const exceedingAmount = limit + amount;
                        
                        const result = await usageTracker.trackUsage(
                            tenantObjectId.toString(),
                            moduleKey,
                            usageType,
                            exceedingAmount,
                            { immediate: true }
                        );

                        if (result.blocked) {
                            blockedCount++;
                        }
                    }

                    // All attempts should have been blocked
                    expect(blockedCount).toBe(attempts.length);

                    // Verify all attempts were logged
                    const auditLogs = await LicenseAudit.find({
                        tenantId: tenantObjectId,
                        moduleKey: moduleKey,
                        eventType: 'LIMIT_EXCEEDED',
                        'details.limitType': usageType
                    });

                    // Should have at least as many logs as blocked attempts
                    expect(auditLogs.length).toBeGreaterThanOrEqual(blockedCount);

                    // Verify usage remained at 0
                    const usageReport = await usageTracker.getUsage(
                        tenantObjectId.toString(),
                        moduleKey
                    );

                    expect(usageReport.usage[usageType].current).toBe(0);
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Feature: feature-productization, Property 23: Usage Report Completeness
     * 
     * Property: For any usage report request, the system should return detailed
     * metrics for all modules and tenants with proper aggregation.
     * 
     * This property ensures that usage reports contain complete information about
     * all tracked modules, including usage metrics, limits, warnings, and violations,
     * as required by Requirement 7.4.
     * 
     * Validates: Requirements 7.4
     */
    test('Property 23: Usage Report Completeness', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    // Generate multiple modules to track
                    // Usage must be within limits to avoid blocking
                    // Ensure unique module keys
                    modules: fc.uniqueArray(
                        fc.record({
                            moduleKey: fc.constantFrom(
                                MODULES.ATTENDANCE,
                                MODULES.LEAVE,
                                MODULES.PAYROLL,
                                MODULES.DOCUMENTS,
                                MODULES.COMMUNICATION,
                                MODULES.REPORTING,
                                MODULES.TASKS
                            ),
                            tier: fc.constantFrom('starter', 'business', 'enterprise')
                        }).chain(base => 
                            fc.record({
                                employees: fc.integer({ min: 50, max: 500 }),
                                storage: fc.integer({ min: 1000, max: 10000 }),
                                apiCalls: fc.integer({ min: 1000, max: 50000 })
                            }).chain(limits =>
                                fc.record({
                                    employees: fc.integer({ min: 0, max: Math.min(100, limits.employees) }),
                                    storage: fc.integer({ min: 0, max: Math.min(2000, limits.storage) }),
                                    apiCalls: fc.integer({ min: 0, max: Math.min(10000, limits.apiCalls) })
                                }).map(usage => ({
                                    ...base,
                                    limits,
                                    usage
                                }))
                            )
                        ),
                        { minLength: 1, maxLength: 5, selector: (m) => m.moduleKey }
                    )
                }),
                async ({ modules }) => {
                    const tenantObjectId = new mongoose.Types.ObjectId();
                    testTenantIds.push(tenantObjectId);

                    // Create license with all modules
                    const licenseModules = modules.map(m => ({
                        key: m.moduleKey,
                        enabled: true,
                        tier: m.tier,
                        limits: m.limits,
                        activatedAt: new Date(),
                        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                    }));

                    await License.create({
                        tenantId: tenantObjectId,
                        subscriptionId: `sub-${tenantObjectId.toString()}`,
                        status: 'active',
                        modules: licenseModules
                    });

                    // Track usage for each module
                    const trackedModules = new Set();
                    for (const module of modules) {
                        let hasTrackedUsage = false;
                        // Track each usage type
                        for (const [usageType, amount] of Object.entries(module.usage)) {
                            if (amount > 0) {
                                await usageTracker.trackUsage(
                                    tenantObjectId.toString(),
                                    module.moduleKey,
                                    usageType,
                                    amount,
                                    { immediate: true }
                                );
                                hasTrackedUsage = true;
                            }
                        }
                        // Only add to tracked modules if we actually tracked some usage
                        if (hasTrackedUsage) {
                            trackedModules.add(module.moduleKey);
                        }
                    }

                    // Get tenant usage report
                    const report = await usageTracker.getTenantUsage(
                        tenantObjectId.toString()
                    );

                    // Assertion 1: Report should be successful
                    expect(report.success).toBe(true);

                    // Assertion 2: Report should contain tenant ID
                    expect(report.tenantId).toBe(tenantObjectId.toString());

                    // Assertion 3: Report should contain period
                    expect(report.period).toBeDefined();
                    expect(typeof report.period).toBe('string');
                    expect(report.period).toMatch(/^\d{4}-\d{2}$/); // YYYY-MM format

                    // Assertion 4: Report should contain modules object
                    expect(report.modules).toBeDefined();
                    expect(typeof report.modules).toBe('object');

                    // Assertion 5: All tracked modules should be in the report
                    for (const moduleKey of trackedModules) {
                        expect(report.modules[moduleKey]).toBeDefined();
                        
                        const moduleReport = report.modules[moduleKey];

                        // Assertion 6: Each module report should have usage summary
                        expect(moduleReport.usage).toBeDefined();
                        expect(typeof moduleReport.usage).toBe('object');

                        // Assertion 7: Usage summary should contain all usage types
                        expect(moduleReport.usage.employees).toBeDefined();
                        expect(moduleReport.usage.storage).toBeDefined();
                        expect(moduleReport.usage.apiCalls).toBeDefined();

                        // Assertion 8: Each usage type should have current and limit
                        for (const usageType of ['employees', 'storage', 'apiCalls']) {
                            const usageData = moduleReport.usage[usageType];
                            expect(usageData).toBeDefined();
                            expect(typeof usageData.current).toBe('number');
                            expect(usageData.current).toBeGreaterThanOrEqual(0);
                            
                            // Limit should be defined (number or null)
                            expect(usageData.limit === null || typeof usageData.limit === 'number').toBe(true);
                        }

                        // Assertion 9: Module report should have warnings count
                        expect(moduleReport.warnings).toBeDefined();
                        expect(typeof moduleReport.warnings).toBe('number');
                        expect(moduleReport.warnings).toBeGreaterThanOrEqual(0);

                        // Assertion 10: Module report should have violations count
                        expect(moduleReport.violations).toBeDefined();
                        expect(typeof moduleReport.violations).toBe('number');
                        expect(moduleReport.violations).toBeGreaterThanOrEqual(0);
                    }

                    // Assertion 11: Get individual module reports and verify consistency
                    for (const moduleKey of trackedModules) {
                        const individualReport = await usageTracker.getUsage(
                            tenantObjectId.toString(),
                            moduleKey
                        );

                        expect(individualReport.success).toBe(true);
                        expect(individualReport.tenantId).toBe(tenantObjectId.toString());
                        expect(individualReport.moduleKey).toBe(moduleKey);
                        expect(individualReport.period).toBe(report.period);

                        // Assertion 12: Individual report should have detailed usage
                        expect(individualReport.usage).toBeDefined();
                        
                        for (const usageType of ['employees', 'storage', 'apiCalls']) {
                            expect(individualReport.usage[usageType]).toBeDefined();
                            expect(individualReport.usage[usageType].current).toBeDefined();
                            expect(individualReport.usage[usageType].limit !== undefined).toBe(true);
                            expect(individualReport.usage[usageType].percentage !== undefined).toBe(true);
                            expect(individualReport.usage[usageType].isApproachingLimit).toBeDefined();
                            expect(individualReport.usage[usageType].hasExceeded).toBeDefined();
                        }

                        // Assertion 13: Individual report should have warnings array
                        expect(Array.isArray(individualReport.warnings)).toBe(true);
                        
                        // Assertion 14: Individual report should have violations array
                        expect(Array.isArray(individualReport.violations)).toBe(true);

                        // Assertion 15: Verify usage values match what was tracked
                        const originalModule = modules.find(m => m.moduleKey === moduleKey);
                        if (originalModule) {
                            for (const [usageType, expectedAmount] of Object.entries(originalModule.usage)) {
                                const actualAmount = individualReport.usage[usageType].current;
                                expect(actualAmount).toBe(expectedAmount);
                            }
                        }
                    }
                }
            ),
            { numRuns: 100 } // Run 100 iterations as specified in design
        );
    });

    /**
     * Additional property: Usage report should handle empty usage correctly
     * 
     * This ensures that reports work even when no usage has been tracked.
     */
    test('Property 23.1: Usage report handles zero usage correctly', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    moduleKey: fc.constantFrom(
                        MODULES.ATTENDANCE,
                        MODULES.LEAVE,
                        MODULES.PAYROLL
                    ),
                    tier: fc.constantFrom('starter', 'business', 'enterprise'),
                    limits: fc.record({
                        employees: fc.integer({ min: 50, max: 500 }),
                        storage: fc.integer({ min: 1000, max: 10000 }),
                        apiCalls: fc.integer({ min: 1000, max: 50000 })
                    })
                }),
                async ({ moduleKey, tier, limits }) => {
                    const tenantObjectId = new mongoose.Types.ObjectId();
                    testTenantIds.push(tenantObjectId);

                    // Create license but don't track any usage
                    await License.create({
                        tenantId: tenantObjectId,
                        subscriptionId: `sub-${tenantObjectId.toString()}`,
                        status: 'active',
                        modules: [
                            {
                                key: moduleKey,
                                enabled: true,
                                tier: tier,
                                limits: limits,
                                activatedAt: new Date(),
                                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                            }
                        ]
                    });

                    // Get usage report without tracking any usage
                    const report = await usageTracker.getUsage(
                        tenantObjectId.toString(),
                        moduleKey
                    );

                    // Should succeed
                    expect(report.success).toBe(true);

                    // All usage should be 0
                    expect(report.usage.employees.current).toBe(0);
                    expect(report.usage.storage.current).toBe(0);
                    expect(report.usage.apiCalls.current).toBe(0);

                    // Limits should be set
                    expect(report.usage.employees.limit).toBe(limits.employees);
                    expect(report.usage.storage.limit).toBe(limits.storage);
                    expect(report.usage.apiCalls.limit).toBe(limits.apiCalls);

                    // No warnings or violations
                    expect(report.warnings.length).toBe(0);
                    expect(report.violations.length).toBe(0);
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Additional property: Usage report should aggregate across multiple periods
     * 
     * This ensures that reports can be queried for specific periods.
     */
    test('Property 23.2: Usage report is period-specific', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    moduleKey: fc.constantFrom(
                        MODULES.ATTENDANCE,
                        MODULES.LEAVE
                    ),
                    usageType: fc.constantFrom('employees', 'storage', 'apiCalls'),
                    amount: fc.integer({ min: 10, max: 100 }),
                    limit: fc.integer({ min: 200, max: 1000 })
                }),
                async ({ moduleKey, usageType, amount, limit }) => {
                    const tenantObjectId = new mongoose.Types.ObjectId();
                    testTenantIds.push(tenantObjectId);

                    // Create license
                    const limits = { [usageType]: limit };
                    await License.create({
                        tenantId: tenantObjectId,
                        subscriptionId: `sub-${tenantObjectId.toString()}`,
                        status: 'active',
                        modules: [
                            {
                                key: moduleKey,
                                enabled: true,
                                tier: 'business',
                                limits: limits,
                                activatedAt: new Date(),
                                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                            }
                        ]
                    });

                    // Track usage
                    await usageTracker.trackUsage(
                        tenantObjectId.toString(),
                        moduleKey,
                        usageType,
                        amount,
                        { immediate: true }
                    );

                    // Get current period
                    const currentPeriod = UsageTracking.getCurrentPeriod();

                    // Get report for current period
                    const currentReport = await usageTracker.getUsage(
                        tenantObjectId.toString(),
                        moduleKey,
                        { period: currentPeriod }
                    );

                    expect(currentReport.success).toBe(true);
                    expect(currentReport.period).toBe(currentPeriod);
                    expect(currentReport.usage[usageType].current).toBe(amount);

                    // Get report for a different period (should have no usage)
                    const differentPeriod = '2024-01';
                    const differentReport = await usageTracker.getUsage(
                        tenantObjectId.toString(),
                        moduleKey,
                        { period: differentPeriod }
                    );

                    expect(differentReport.success).toBe(true);
                    expect(differentReport.period).toBe(differentPeriod);
                    expect(differentReport.usage[usageType].current).toBe(0);
                }
            ),
            { numRuns: 100 }
        );
    });
});
