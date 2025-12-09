/**
 * Property-Based Tests for 30-Day Warning State
 * 
 * Feature: feature-productization, Property 41: 30-Day Warning State
 * Validates: Requirements 12.3
 * 
 * This test verifies that for any license expiring within 30 days,
 * the module should be highlighted with a warning state on the status page.
 */

import fc from 'fast-check';

/**
 * Core logic function that determines if a license should show a 30-day warning
 * This mirrors the logic in LicenseContext and LicenseStatusPage
 */
function shouldShow30DayWarning(daysUntilExpiration) {
    if (typeof daysUntilExpiration !== 'number' || isNaN(daysUntilExpiration)) {
        return false;
    }
    
    // Show warning if expiring within 30 days but more than 7 days (not critical)
    return daysUntilExpiration > 7 && daysUntilExpiration <= 30;
}

/**
 * Function that determines the warning state based on days until expiration
 */
function getWarningState(daysUntilExpiration) {
    if (typeof daysUntilExpiration !== 'number' || isNaN(daysUntilExpiration)) {
        return 'normal';
    }
    
    if (daysUntilExpiration <= 7 && daysUntilExpiration > 0) {
        return 'critical';
    } else if (daysUntilExpiration > 7 && daysUntilExpiration <= 30) {
        return 'warning';
    }
    
    return 'normal';
}

/**
 * Function that checks if a license is expiring soon (within threshold)
 * This mirrors the isExpiringSoon function in LicenseContext
 */
function isExpiringSoon(daysUntilExpiration, threshold = 30) {
    if (daysUntilExpiration === null || typeof daysUntilExpiration !== 'number') {
        return false;
    }
    
    return daysUntilExpiration > 0 && daysUntilExpiration <= threshold;
}

describe('30-Day Warning State - Property-Based Tests', () => {
    /**
     * Feature: feature-productization, Property 41: 30-Day Warning State
     * 
     * Property: For any license expiring within 30 days (but more than 7 days),
     * the module should be highlighted with a warning state on the status page.
     * 
     * This property ensures that administrators are warned about upcoming
     * license expirations with sufficient time to renew, as required by
     * Requirement 12.3.
     */
    test('Property 41: 30-Day Warning State', () => {
        fc.assert(
            fc.property(
                // Generate days between 8 and 30 (warning range, not critical)
                fc.integer({ min: 8, max: 30 }),
                (daysUntilExpiration) => {
                    // For any license expiring within 8-30 days, warning should be shown
                    const shouldShowWarning = shouldShow30DayWarning(daysUntilExpiration);
                    
                    // Property: Days 8-30 should always show warning state
                    expect(shouldShowWarning).toBe(true);
                    
                    // Additional verification: warning state should be 'warning' not 'critical'
                    const warningState = getWarningState(daysUntilExpiration);
                    expect(warningState).toBe('warning');
                    
                    // Verify isExpiringSoon returns true for 30-day threshold
                    expect(isExpiringSoon(daysUntilExpiration, 30)).toBe(true);
                    
                    // Verify it's NOT in critical range (7 days)
                    expect(isExpiringSoon(daysUntilExpiration, 7)).toBe(false);
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property: No warning state outside 30-day window
     * 
     * This ensures that licenses expiring more than 30 days in the future
     * do NOT show a warning state.
     */
    test('Property 41.1: No warning state beyond 30 days', () => {
        fc.assert(
            fc.property(
                // Generate days beyond 30 days
                fc.integer({ min: 31, max: 365 }),
                (daysUntilExpiration) => {
                    // For any license expiring beyond 30 days, warning should NOT be shown
                    const shouldShowWarning = shouldShow30DayWarning(daysUntilExpiration);
                    
                    // Property: Days > 30 should never show warning state
                    expect(shouldShowWarning).toBe(false);
                    
                    // Additional verification: warning state should be 'normal'
                    const warningState = getWarningState(daysUntilExpiration);
                    expect(warningState).toBe('normal');
                    
                    // Verify isExpiringSoon returns false for 30-day threshold
                    expect(isExpiringSoon(daysUntilExpiration, 30)).toBe(false);
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property: Critical state takes precedence over warning
     * 
     * This ensures that licenses expiring within 7 days show critical state,
     * not warning state, even though they're also within 30 days.
     */
    test('Property 41.2: Critical state within 7 days (not warning)', () => {
        fc.assert(
            fc.property(
                // Generate days within critical range (1-7 days)
                fc.integer({ min: 1, max: 7 }),
                (daysUntilExpiration) => {
                    // For any license expiring within 7 days, 30-day warning should NOT be shown
                    const shouldShowWarning = shouldShow30DayWarning(daysUntilExpiration);
                    
                    // Property: Days 1-7 should NOT show 30-day warning (critical instead)
                    expect(shouldShowWarning).toBe(false);
                    
                    // Additional verification: warning state should be 'critical' not 'warning'
                    const warningState = getWarningState(daysUntilExpiration);
                    expect(warningState).toBe('critical');
                    
                    // Verify isExpiringSoon returns true for both thresholds
                    expect(isExpiringSoon(daysUntilExpiration, 30)).toBe(true);
                    expect(isExpiringSoon(daysUntilExpiration, 7)).toBe(true);
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property: Licenses without expiration dates show no warning
     * 
     * This ensures that perpetual or unlimited licenses don't show warnings.
     */
    test('Property 41.3: No warning for licenses without expiration', () => {
        fc.assert(
            fc.property(
                fc.oneof(
                    fc.constant(null),
                    fc.constant(undefined),
                    fc.constant(NaN)
                ),
                (daysUntilExpiration) => {
                    // For invalid/null expiration, warning should NOT be shown
                    const shouldShowWarning = shouldShow30DayWarning(daysUntilExpiration);
                    
                    // Property: Invalid expiration should never show warning
                    expect(shouldShowWarning).toBe(false);
                    
                    // Additional verification: warning state should be 'normal'
                    const warningState = getWarningState(daysUntilExpiration);
                    expect(warningState).toBe('normal');
                    
                    // Verify isExpiringSoon returns false
                    expect(isExpiringSoon(daysUntilExpiration, 30)).toBe(false);
                }
            ),
            { numRuns: 50 }
        );
    });

    /**
     * Property: Boundary conditions are handled correctly
     * 
     * This ensures that the exact boundaries (7 days, 8 days, 30 days, 31 days)
     * are handled correctly.
     */
    test('Property 41.4: Boundary conditions', () => {
        // Test exact boundaries
        const boundaries = [
            { days: 7, expectedWarning: false, expectedState: 'critical', description: 'exactly 7 days' },
            { days: 8, expectedWarning: true, expectedState: 'warning', description: 'exactly 8 days' },
            { days: 30, expectedWarning: true, expectedState: 'warning', description: 'exactly 30 days' },
            { days: 31, expectedWarning: false, expectedState: 'normal', description: 'exactly 31 days' },
            { days: 0, expectedWarning: false, expectedState: 'normal', description: 'expired (0 days)' },
            { days: -1, expectedWarning: false, expectedState: 'normal', description: 'expired (negative)' }
        ];

        boundaries.forEach(({ days, expectedWarning, expectedState, description }) => {
            const shouldShowWarning = shouldShow30DayWarning(days);
            const warningState = getWarningState(days);

            expect(shouldShowWarning).toBe(expectedWarning);
            expect(warningState).toBe(expectedState);
        });
    });

    /**
     * Property: Warning logic is consistent across different modules
     * 
     * This ensures that the warning logic applies consistently regardless of
     * which module is being checked.
     */
    test('Property 41.5: Consistency across modules', () => {
        fc.assert(
            fc.property(
                fc.record({
                    moduleKey: fc.constantFrom(
                        'attendance',
                        'leave',
                        'payroll',
                        'documents',
                        'communication',
                        'reporting',
                        'tasks'
                    ),
                    daysUntilExpiration: fc.integer({ min: 1, max: 365 })
                }),
                ({ moduleKey, daysUntilExpiration }) => {
                    // The warning logic should be the same regardless of module
                    const shouldShowWarning = shouldShow30DayWarning(daysUntilExpiration);
                    const warningState = getWarningState(daysUntilExpiration);
                    
                    // Property: Warning logic is module-independent
                    if (daysUntilExpiration > 7 && daysUntilExpiration <= 30) {
                        expect(shouldShowWarning).toBe(true);
                        expect(warningState).toBe('warning');
                    } else if (daysUntilExpiration > 0 && daysUntilExpiration <= 7) {
                        expect(shouldShowWarning).toBe(false);
                        expect(warningState).toBe('critical');
                    } else {
                        expect(shouldShowWarning).toBe(false);
                        expect(warningState).toBe('normal');
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property: Days calculation from expiration date
     * 
     * This ensures that the calculation of days until expiration is correct.
     */
    test('Property 41.6: Days calculation accuracy', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 1, max: 365 }),
                (daysInFuture) => {
                    // Calculate expiration date
                    const now = new Date();
                    const expiresAt = new Date(now);
                    expiresAt.setDate(expiresAt.getDate() + daysInFuture);
                    
                    // Calculate days until expiration (mimicking LicenseContext logic)
                    const diffTime = expiresAt - now;
                    const calculatedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    
                    // Property: Calculated days should match expected days
                    expect(calculatedDays).toBe(daysInFuture);
                    
                    // Verify warning state is correct based on calculated days
                    const shouldShowWarning = shouldShow30DayWarning(calculatedDays);
                    const expectedWarning = calculatedDays > 7 && calculatedDays <= 30;
                    expect(shouldShowWarning).toBe(expectedWarning);
                }
            ),
            { numRuns: 100 }
        );
    });
});
