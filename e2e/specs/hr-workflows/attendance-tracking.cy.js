/**
 * E2E Tests for Attendance Tracking
 * Tests clock in/out functionality and forget-check requests
 */

describe('Attendance Tracking', () => {
    beforeEach(() => {
        // Clean up and seed test data
        cy.cleanupTestData();

        // Seed employee and manager users
        cy.seedTestData('user', [
            {
                email: 'employee@testcompany.com',
                name: 'Test Employee',
                role: 'employee',
                department: 'Engineering',
                managerId: 'manager-id-123'
            },
            {
                email: 'manager@testcompany.com',
                name: 'Test Manager',
                role: 'manager',
                department: 'Engineering'
            }
        ]);

        // Seed tenant configuration
        cy.seedTestData('tenant', {
            domain: 'testcompany',
            name: 'Test Company',
            settings: {
                workingHours: { start: '09:00', end: '17:00' },
                timezone: 'UTC',
                attendancePolicy: {
                    allowEarlyClockIn: 30, // 30 minutes before start
                    allowLateClockOut: 60, // 60 minutes after end
                    requiresApprovalForForgetCheck: true
                }
            }
        });
    });

    afterEach(() => {
        cy.cleanupAfterTest();
    });

    describe('Clock In/Out Functionality', () => {
        it('should allow employee to clock in at start of workday', () => {
            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('attendance');

            // Verify attendance dashboard is visible
            cy.get('[data-cy="attendance-dashboard"]').should('be.visible');
            cy.get('[data-cy="clock-status"]').should('contain.text', 'Not Clocked In');

            // Clock in
            cy.get('[data-cy="clock-in-button"]').click();

            // Verify clock in confirmation
            cy.expectSuccessMessage('Clocked in successfully');

            // Verify status update
            cy.get('[data-cy="clock-status"]').should('contain.text', 'Clocked In');
            cy.get('[data-cy="clock-in-time"]').should('be.visible');
            cy.get('[data-cy="clock-out-button"]').should('be.visible');
            cy.get('[data-cy="clock-in-button"]').should('not.exist');
        });

        it('should allow employee to clock out at end of workday', () => {
            // Seed existing clock-in record
            cy.seedTestData('attendance', {
                employeeId: 'employee-id-123',
                date: new Date().toISOString().split('T')[0],
                clockIn: '09:00',
                status: 'clocked_in'
            });

            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('attendance');

            // Verify already clocked in status
            cy.get('[data-cy="clock-status"]').should('contain.text', 'Clocked In');
            cy.get('[data-cy="clock-in-time"]').should('contain.text', '09:00');

            // Clock out
            cy.get('[data-cy="clock-out-button"]').click();

            cy.expectSuccessMessage('Clocked out successfully');

            // Verify status update
            cy.get('[data-cy="clock-status"]').should('contain.text', 'Clocked Out');
            cy.get('[data-cy="clock-out-time"]').should('be.visible');
            cy.get('[data-cy="total-hours"]').should('be.visible');
        });

        it('should calculate working hours correctly', () => {
            cy.seedTestData('attendance', {
                employeeId: 'employee-id-123',
                date: new Date().toISOString().split('T')[0],
                clockIn: '09:00',
                clockOut: '17:30',
                status: 'completed'
            });

            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('attendance');

            // Verify hours calculation
            cy.get('[data-cy="total-hours"]').should('contain.text', '8.5');
            cy.get('[data-cy="regular-hours"]').should('contain.text', '8.0');
            cy.get('[data-cy="overtime-hours"]').should('contain.text', '0.5');
        });

        it('should prevent double clock-in', () => {
            cy.seedTestData('attendance', {
                employeeId: 'employee-id-123',
                date: new Date().toISOString().split('T')[0],
                clockIn: '09:00',
                status: 'clocked_in'
            });

            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('attendance');

            // Verify clock-in button is not available
            cy.get('[data-cy="clock-in-button"]').should('not.exist');
            cy.get('[data-cy="clock-status"]').should('contain.text', 'Clocked In');
        });

        it('should handle early clock-in within policy limits', () => {
            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('attendance');

            // Mock current time to be 8:30 AM (30 minutes before start)
            cy.clock(new Date().setHours(8, 30, 0, 0));

            cy.get('[data-cy="clock-in-button"]').click();

            cy.expectSuccessMessage('Clocked in successfully');
            cy.get('[data-cy="early-clock-in-notice"]').should('be.visible');
        });

        it('should warn about late clock-in', () => {
            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('attendance');

            // Mock current time to be 9:30 AM (30 minutes after start)
            cy.clock(new Date().setHours(9, 30, 0, 0));

            cy.get('[data-cy="clock-in-button"]').click();

            cy.expectSuccessMessage('Clocked in successfully');
            cy.get('[data-cy="late-clock-in-warning"]').should('be.visible');
        });
    });

    describe('Forget Check Requests', () => {
        it('should allow employee to submit forget check request', () => {
            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('attendance');

            // Navigate to forget check section
            cy.get('[data-cy="forget-check-tab"]').click();

            // Click new forget check request
            cy.get('[data-cy="new-forget-check-button"]').click();
            cy.get('[data-cy="forget-check-form"]').should('be.visible');

            // Fill forget check form
            const requestDate = new Date();
            requestDate.setDate(requestDate.getDate() - 1); // Yesterday

            cy.fillForm({
                'request-date': requestDate.toISOString().split('T')[0],
                'request-type': 'forgot_clock_out',
                'clock-in-time': '09:00',
                'clock-out-time': '17:00',
                'reason': 'Forgot to clock out due to urgent meeting'
            });

            cy.submitForm('[data-cy="forget-check-form"]');

            cy.expectSuccessMessage('Forget check request submitted successfully');

            // Verify request appears in history
            cy.get('[data-cy="forget-check-requests-table"]').should('be.visible');
            cy.get('[data-cy="table-row"]').should('have.length', 1);
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="request-type"]').should('contain.text', 'Forgot Clock Out');
                cy.get('[data-cy="request-status"]').should('contain.text', 'Pending Approval');
            });
        });

        it('should validate forget check request form', () => {
            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('attendance');

            cy.get('[data-cy="forget-check-tab"]').click();
            cy.get('[data-cy="new-forget-check-button"]').click();

            // Try to submit empty form
            cy.submitForm('[data-cy="forget-check-form"]');

            // Verify validation errors
            cy.get('[data-cy="request-date-error"]').should('be.visible');
            cy.get('[data-cy="request-type-error"]').should('be.visible');
            cy.get('[data-cy="reason-error"]').should('be.visible');
        });

        it('should not allow forget check requests for future dates', () => {
            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('attendance');

            cy.get('[data-cy="forget-check-tab"]').click();
            cy.get('[data-cy="new-forget-check-button"]').click();

            // Try to submit request for tomorrow
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 1);

            cy.fillForm({
                'request-date': futureDate.toISOString().split('T')[0],
                'request-type': 'forgot_clock_in',
                'reason': 'Future request test'
            });

            cy.submitForm('[data-cy="forget-check-form"]');

            cy.expectErrorMessage('Cannot submit forget check requests for future dates');
        });

        it('should allow manager to approve forget check requests', () => {
            // Seed pending forget check request
            cy.seedTestData('attendance', {
                employeeId: 'employee-id-123',
                employeeName: 'Test Employee',
                date: '2024-01-15',
                type: 'forget_check_request',
                requestType: 'forgot_clock_out',
                clockIn: '09:00',
                requestedClockOut: '17:00',
                reason: 'Forgot to clock out',
                status: 'pending_approval',
                managerId: 'manager-id-123'
            });

            cy.loginAsTenantUser('manager', 'testcompany');
            cy.navigateToModule('approvals');

            // Navigate to attendance approvals
            cy.get('[data-cy="attendance-approvals-tab"]').click();

            // Verify pending request is visible
            cy.get('[data-cy="pending-requests-table"]').should('be.visible');
            cy.get('[data-cy="table-row"]').should('have.length', 1);
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="employee-name"]').should('contain.text', 'Test Employee');
                cy.get('[data-cy="request-type"]').should('contain.text', 'Forgot Clock Out');
            });

            // Approve request
            cy.clickTableAction(0, 'approve');

            cy.get('[data-cy="approval-modal"]').should('be.visible');
            cy.fillForm({
                'approval-comments': 'Approved - valid reason provided'
            });

            cy.get('[data-cy="confirm-approval-button"]').click();

            cy.expectSuccessMessage('Forget check request approved');

            // Verify request moves to approved section
            cy.get('[data-cy="approved-requests-tab"]').click();
            cy.get('[data-cy="table-row"]').should('have.length', 1);
        });

        it('should allow manager to reject forget check requests', () => {
            cy.seedTestData('attendance', {
                employeeId: 'employee-id-123',
                employeeName: 'Test Employee',
                date: '2024-01-15',
                type: 'forget_check_request',
                requestType: 'forgot_clock_in',
                reason: 'Insufficient reason',
                status: 'pending_approval',
                managerId: 'manager-id-123'
            });

            cy.loginAsTenantUser('manager', 'testcompany');
            cy.navigateToModule('approvals');

            cy.get('[data-cy="attendance-approvals-tab"]').click();

            // Reject request
            cy.clickTableAction(0, 'reject');

            cy.get('[data-cy="rejection-modal"]').should('be.visible');
            cy.fillForm({
                'rejection-reason': 'Insufficient justification provided'
            });

            cy.get('[data-cy="confirm-rejection-button"]').click();

            cy.expectSuccessMessage('Forget check request rejected');

            // Verify request moves to rejected section
            cy.get('[data-cy="rejected-requests-tab"]').click();
            cy.get('[data-cy="table-row"]').should('have.length', 1);
        });
    });

    describe('Attendance History and Reports', () => {
        beforeEach(() => {
            // Seed attendance history
            cy.seedTestData('attendance', [
                {
                    employeeId: 'employee-id-123',
                    date: '2024-01-15',
                    clockIn: '09:00',
                    clockOut: '17:00',
                    totalHours: 8,
                    status: 'completed'
                },
                {
                    employeeId: 'employee-id-123',
                    date: '2024-01-16',
                    clockIn: '09:15',
                    clockOut: '17:30',
                    totalHours: 8.25,
                    status: 'completed',
                    isLate: true
                },
                {
                    employeeId: 'employee-id-123',
                    date: '2024-01-17',
                    clockIn: '09:00',
                    clockOut: '18:00',
                    totalHours: 9,
                    overtimeHours: 1,
                    status: 'completed'
                }
            ]);
        });

        it('should display attendance history for employee', () => {
            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('attendance');

            // Navigate to history tab
            cy.get('[data-cy="attendance-history-tab"]').click();

            // Verify attendance records are displayed
            cy.get('[data-cy="attendance-history-table"]').should('be.visible');
            cy.get('[data-cy="table-row"]').should('have.length', 3);

            // Verify record details
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="date"]').should('contain.text', '2024-01-17');
                cy.get('[data-cy="clock-in"]').should('contain.text', '09:00');
                cy.get('[data-cy="clock-out"]').should('contain.text', '18:00');
                cy.get('[data-cy="total-hours"]').should('contain.text', '9.0');
                cy.get('[data-cy="overtime-hours"]').should('contain.text', '1.0');
            });
        });

        it('should allow filtering attendance history by date range', () => {
            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('attendance');

            cy.get('[data-cy="attendance-history-tab"]').click();

            // Apply date filter
            cy.get('[data-cy="date-filter-from"]').type('2024-01-16');
            cy.get('[data-cy="date-filter-to"]').type('2024-01-17');
            cy.get('[data-cy="apply-filter-button"]').click();

            // Verify filtered results
            cy.get('[data-cy="table-row"]').should('have.length', 2);
        });

        it('should display attendance summary statistics', () => {
            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('attendance');

            // Verify summary cards
            cy.get('[data-cy="attendance-summary"]').should('be.visible');
            cy.get('[data-cy="total-days-worked"]').should('contain.text', '3');
            cy.get('[data-cy="total-hours-worked"]').should('contain.text', '25.25');
            cy.get('[data-cy="average-hours-per-day"]').should('contain.text', '8.42');
            cy.get('[data-cy="total-overtime-hours"]').should('contain.text', '1.0');
            cy.get('[data-cy="late-arrivals"]').should('contain.text', '1');
        });

        it('should allow manager to view team attendance reports', () => {
            cy.loginAsTenantUser('manager', 'testcompany');
            cy.navigateToModule('reports');

            // Navigate to attendance reports
            cy.get('[data-cy="attendance-reports-tab"]').click();

            // Verify team attendance overview
            cy.get('[data-cy="team-attendance-table"]').should('be.visible');
            cy.get('[data-cy="table-row"]').should('have.length.at.least', 1);

            // Verify employee attendance details
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="employee-name"]').should('contain.text', 'Test Employee');
                cy.get('[data-cy="days-present"]').should('be.visible');
                cy.get('[data-cy="total-hours"]').should('be.visible');
                cy.get('[data-cy="late-count"]').should('be.visible');
            });
        });
    });

    describe('Attendance Policy Enforcement', () => {
        it('should enforce maximum daily working hours', () => {
            cy.seedTestData('attendance', {
                employeeId: 'employee-id-123',
                date: new Date().toISOString().split('T')[0],
                clockIn: '09:00',
                status: 'clocked_in'
            });

            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('attendance');

            // Mock current time to be after maximum allowed hours (e.g., 11 PM)
            cy.clock(new Date().setHours(23, 0, 0, 0));

            cy.get('[data-cy="clock-out-button"]').click();

            // Should show warning about excessive hours
            cy.get('[data-cy="excessive-hours-warning"]').should('be.visible');
            cy.get('[data-cy="confirm-long-hours"]').should('be.visible');

            // Confirm clock out despite long hours
            cy.get('[data-cy="confirm-long-hours"]').click();

            cy.expectSuccessMessage('Clocked out successfully');
        });

        it('should track break times if enabled', () => {
            cy.seedTestData('tenant', {
                domain: 'testcompany',
                settings: {
                    attendancePolicy: {
                        trackBreaks: true,
                        maxBreakDuration: 60 // 60 minutes
                    }
                }
            });

            cy.seedTestData('attendance', {
                employeeId: 'employee-id-123',
                date: new Date().toISOString().split('T')[0],
                clockIn: '09:00',
                status: 'clocked_in'
            });

            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('attendance');

            // Verify break tracking controls are available
            cy.get('[data-cy="break-controls"]').should('be.visible');
            cy.get('[data-cy="start-break-button"]').should('be.visible');

            // Start break
            cy.get('[data-cy="start-break-button"]').click();

            cy.expectSuccessMessage('Break started');

            // Verify break status
            cy.get('[data-cy="break-status"]').should('contain.text', 'On Break');
            cy.get('[data-cy="end-break-button"]').should('be.visible');
            cy.get('[data-cy="break-timer"]').should('be.visible');
        });
    });

    describe('Mobile and Offline Support', () => {
        it('should work on mobile devices', () => {
            cy.viewport('iphone-x');

            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('attendance');

            // Verify mobile-friendly layout
            cy.get('[data-cy="mobile-attendance-view"]').should('be.visible');
            cy.get('[data-cy="clock-in-button"]').should('be.visible');

            // Test mobile clock-in
            cy.get('[data-cy="clock-in-button"]').click();

            cy.expectSuccessMessage('Clocked in successfully');
        });

        it('should handle offline clock-in attempts', () => {
            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('attendance');

            // Simulate offline condition
            cy.intercept('POST', '**/attendance/clock-in', { forceNetworkError: true }).as('offlineClockIn');

            cy.get('[data-cy="clock-in-button"]').click();

            // Should show offline message and queue action
            cy.get('[data-cy="offline-notice"]').should('be.visible');
            cy.get('[data-cy="queued-action"]').should('contain.text', 'Clock-in queued for when online');

            // Simulate coming back online
            cy.intercept('POST', '**/attendance/clock-in', { statusCode: 200, body: { success: true } }).as('onlineClockIn');

            // Should automatically sync when online
            cy.get('[data-cy="sync-button"]').click();
            cy.wait('@onlineClockIn');

            cy.expectSuccessMessage('Clocked in successfully');
        });
    });
});