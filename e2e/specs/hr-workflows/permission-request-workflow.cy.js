/**
 * E2E Tests for Permission Request Workflow
 * Tests permission request submission and approval process
 */

describe('Permission Request Workflow', () => {
    beforeEach(() => {
        // Clean up and seed test data
        cy.cleanupTestData();

        // Seed employee, manager, and HR users
        cy.seedTestData('user', [
            {
                email: 'employee@testcompany.com',
                name: 'Test Employee',
                role: 'employee',
                managerId: 'manager-id-123',
                department: 'Engineering'
            },
            {
                email: 'manager@testcompany.com',
                name: 'Test Manager',
                role: 'manager',
                department: 'Engineering'
            },
            {
                email: 'hr@testcompany.com',
                name: 'HR Manager',
                role: 'hr',
                department: 'Human Resources'
            }
        ]);

        // Seed permission types and policies
        cy.seedTestData('tenant', {
            domain: 'testcompany',
            settings: {
                permissionPolicy: {
                    maxPermissionHours: 4,
                    requiresApproval: true,
                    autoApproveUnder: 1, // Auto-approve requests under 1 hour
                    advanceNoticeRequired: 24 // 24 hours advance notice
                }
            }
        });

        cy.seedTestData('permissionTypes', [
            { name: 'Medical Appointment', requiresDocumentation: true, maxDuration: 4 },
            { name: 'Personal Errand', requiresDocumentation: false, maxDuration: 2 },
            { name: 'Family Emergency', requiresDocumentation: false, maxDuration: 8 },
            { name: 'Bank Visit', requiresDocumentation: false, maxDuration: 1 }
        ]);
    });

    afterEach(() => {
        cy.cleanupAfterTest();
    });

    describe('Permission Request Submission', () => {
        it('should allow employee to submit permission request', () => {
            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('permissions');

            // Click new permission request button
            cy.get('[data-cy="new-permission-request-button"]').click();
            cy.get('[data-cy="permission-request-form"]').should('be.visible');

            // Fill permission request form
            const requestDate = new Date();
            requestDate.setDate(requestDate.getDate() + 2); // Day after tomorrow

            cy.fillForm({
                'request-date': requestDate.toISOString().split('T')[0],
                'permission-type': 'Medical Appointment',
                'start-time': '14:00',
                'end-time': '16:00',
                'reason': 'Routine medical checkup',
                'contact-during-absence': '+1234567890'
            });

            // Submit request
            cy.submitForm('[data-cy="permission-request-form"]');

            cy.expectSuccessMessage('Permission request submitted successfully');

            // Verify request appears in employee's permission history
            cy.get('[data-cy="permission-requests-table"]').should('be.visible');
            cy.get('[data-cy="table-row"]').should('have.length', 1);
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="permission-type"]').should('contain.text', 'Medical Appointment');
                cy.get('[data-cy="permission-status"]').should('contain.text', 'Pending Approval');
                cy.get('[data-cy="permission-duration"]').should('contain.text', '2.0 hours');
            });
        });

        it('should validate permission request form fields', () => {
            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('permissions');

            cy.get('[data-cy="new-permission-request-button"]').click();

            // Try to submit empty form
            cy.submitForm('[data-cy="permission-request-form"]');

            // Verify validation errors
            cy.get('[data-cy="request-date-error"]').should('be.visible');
            cy.get('[data-cy="permission-type-error"]').should('be.visible');
            cy.get('[data-cy="start-time-error"]').should('be.visible');
            cy.get('[data-cy="end-time-error"]').should('be.visible');
            cy.get('[data-cy="reason-error"]').should('be.visible');
        });

        it('should validate permission time ranges', () => {
            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('permissions');

            cy.get('[data-cy="new-permission-request-button"]').click();

            // Set end time before start time
            cy.fillForm({
                'request-date': new Date().toISOString().split('T')[0],
                'permission-type': 'Personal Errand',
                'start-time': '16:00',
                'end-time': '14:00',
                'reason': 'Test permission'
            });

            cy.submitForm('[data-cy="permission-request-form"]');

            cy.expectErrorMessage('End time must be after start time');
        });

        it('should enforce advance notice requirements', () => {
            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('permissions');

            cy.get('[data-cy="new-permission-request-button"]').click();

            // Try to request permission for today (less than 24 hours notice)
            const today = new Date();

            cy.fillForm({
                'request-date': today.toISOString().split('T')[0],
                'permission-type': 'Medical Appointment',
                'start-time': '14:00',
                'end-time': '15:00',
                'reason': 'Urgent appointment'
            });

            cy.submitForm('[data-cy="permission-request-form"]');

            cy.expectErrorMessage('Permission requests require at least 24 hours advance notice');
        });

        it('should enforce maximum duration limits by permission type', () => {
            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('permissions');

            cy.get('[data-cy="new-permission-request-button"]').click();

            // Try to request more than maximum allowed for Personal Errand (2 hours)
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);

            cy.fillForm({
                'request-date': tomorrow.toISOString().split('T')[0],
                'permission-type': 'Personal Errand',
                'start-time': '14:00',
                'end-time': '17:30', // 3.5 hours
                'reason': 'Extended personal task'
            });

            cy.submitForm('[data-cy="permission-request-form"]');

            cy.expectErrorMessage('Personal Errand permissions cannot exceed 2 hours');
        });

        it('should auto-approve short permission requests', () => {
            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('permissions');

            cy.get('[data-cy="new-permission-request-button"]').click();

            // Request 45 minutes (under 1-hour auto-approve threshold)
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);

            cy.fillForm({
                'request-date': tomorrow.toISOString().split('T')[0],
                'permission-type': 'Bank Visit',
                'start-time': '14:00',
                'end-time': '14:45',
                'reason': 'Quick bank transaction'
            });

            cy.submitForm('[data-cy="permission-request-form"]');

            cy.expectSuccessMessage('Permission request auto-approved');

            // Verify request is automatically approved
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="permission-status"]').should('contain.text', 'Auto-Approved');
            });
        });

        it('should require documentation for certain permission types', () => {
            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('permissions');

            cy.get('[data-cy="new-permission-request-button"]').click();

            // Select permission type that requires documentation
            cy.fillForm({
                'permission-type': 'Medical Appointment'
            });

            // Verify documentation upload field appears
            cy.get('[data-cy="documentation-upload"]').should('be.visible');
            cy.get('[data-cy="documentation-required-notice"]').should('be.visible');

            // Try to submit without documentation
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);

            cy.fillForm({
                'request-date': tomorrow.toISOString().split('T')[0],
                'start-time': '14:00',
                'end-time': '16:00',
                'reason': 'Medical checkup'
            });

            cy.submitForm('[data-cy="permission-request-form"]');

            cy.expectErrorMessage('Documentation is required for Medical Appointment requests');
        });
    });

    describe('Manager Approval Workflow', () => {
        beforeEach(() => {
            // Create a pending permission request
            cy.seedTestData('permission', {
                employeeId: 'employee-id-123',
                employeeName: 'Test Employee',
                requestDate: '2024-02-15',
                permissionType: 'Medical Appointment',
                startTime: '14:00',
                endTime: '16:00',
                duration: 2,
                reason: 'Routine medical checkup',
                status: 'pending_manager_approval',
                managerId: 'manager-id-123'
            });
        });

        it('should allow manager to view pending permission requests', () => {
            cy.loginAsTenantUser('manager', 'testcompany');
            cy.navigateToModule('approvals');

            // Navigate to permission approvals
            cy.get('[data-cy="permission-approvals-tab"]').click();

            // Verify pending request is visible
            cy.get('[data-cy="pending-requests-table"]').should('be.visible');
            cy.get('[data-cy="table-row"]').should('have.length', 1);
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="employee-name"]').should('contain.text', 'Test Employee');
                cy.get('[data-cy="permission-type"]').should('contain.text', 'Medical Appointment');
                cy.get('[data-cy="permission-duration"]').should('contain.text', '2.0 hours');
                cy.get('[data-cy="permission-date"]').should('contain.text', '2024-02-15');
            });
        });

        it('should allow manager to approve permission request', () => {
            cy.loginAsTenantUser('manager', 'testcompany');
            cy.navigateToModule('approvals');

            cy.get('[data-cy="permission-approvals-tab"]').click();

            // Click approve button
            cy.clickTableAction(0, 'approve');

            // Add approval comments
            cy.get('[data-cy="approval-modal"]').should('be.visible');
            cy.fillForm({
                'approval-comments': 'Approved - medical appointment justified'
            });

            cy.get('[data-cy="confirm-approval-button"]').click();

            cy.expectSuccessMessage('Permission request approved successfully');

            // Verify request moves to approved section
            cy.get('[data-cy="approved-requests-tab"]').click();
            cy.get('[data-cy="table-row"]').should('have.length', 1);
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="permission-status"]').should('contain.text', 'Approved');
                cy.get('[data-cy="approval-comments"]').should('contain.text', 'medical appointment justified');
            });
        });

        it('should allow manager to approve with modified duration', () => {
            cy.loginAsTenantUser('manager', 'testcompany');
            cy.navigateToModule('approvals');

            cy.get('[data-cy="permission-approvals-tab"]').click();

            cy.clickTableAction(0, 'approve');

            // Approve with reduced duration
            cy.get('[data-cy="approval-modal"]').should('be.visible');
            cy.fillForm({
                'approval-comments': 'Approved with reduced time',
                'approved-start-time': '14:00',
                'approved-end-time': '15:30'
            });

            cy.get('[data-cy="confirm-approval-button"]').click();

            cy.expectSuccessMessage('Permission request approved with modifications');

            // Verify modified duration
            cy.get('[data-cy="approved-requests-tab"]').click();
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="approved-duration"]').should('contain.text', '1.5 hours');
                cy.get('[data-cy="modification-notice"]').should('be.visible');
            });
        });

        it('should allow manager to reject permission request', () => {
            cy.loginAsTenantUser('manager', 'testcompany');
            cy.navigateToModule('approvals');

            cy.get('[data-cy="permission-approvals-tab"]').click();

            // Click reject button
            cy.clickTableAction(0, 'reject');

            // Add rejection reason
            cy.get('[data-cy="rejection-modal"]').should('be.visible');
            cy.fillForm({
                'rejection-reason': 'Critical project deadline conflicts with requested time'
            });

            cy.get('[data-cy="confirm-rejection-button"]').click();

            cy.expectSuccessMessage('Permission request rejected');

            // Verify request moves to rejected section
            cy.get('[data-cy="rejected-requests-tab"]').click();
            cy.get('[data-cy="table-row"]').should('have.length', 1);
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="permission-status"]').should('contain.text', 'Rejected');
                cy.get('[data-cy="rejection-reason"]').should('contain.text', 'Critical project deadline');
            });
        });

        it('should send notification to employee after manager decision', () => {
            cy.loginAsTenantUser('manager', 'testcompany');
            cy.navigateToModule('approvals');

            cy.get('[data-cy="permission-approvals-tab"]').click();
            cy.clickTableAction(0, 'approve');

            cy.get('[data-cy="approval-modal"]').should('be.visible');
            cy.fillForm({ 'approval-comments': 'Approved' });
            cy.get('[data-cy="confirm-approval-button"]').click();

            // Switch to employee account to verify notification
            cy.logout();
            cy.loginAsTenantUser('employee', 'testcompany');

            // Check notifications
            cy.get('[data-cy="notifications-bell"]').click();
            cy.get('[data-cy="notification-item"]').should('contain.text', 'Permission request approved');
            cy.get('[data-cy="notification-item"]').should('contain.text', 'Test Manager');
        });
    });

    describe('Permission Tracking and Attendance Integration', () => {
        beforeEach(() => {
            // Create approved permission request
            cy.seedTestData('permission', {
                employeeId: 'employee-id-123',
                employeeName: 'Test Employee',
                requestDate: new Date().toISOString().split('T')[0],
                permissionType: 'Medical Appointment',
                startTime: '14:00',
                endTime: '16:00',
                duration: 2,
                status: 'approved'
            });
        });

        it('should integrate with attendance tracking', () => {
            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('attendance');

            // Verify approved permission shows in today's attendance
            cy.get('[data-cy="todays-permissions"]').should('be.visible');
            cy.get('[data-cy="permission-item"]').should('contain.text', 'Medical Appointment');
            cy.get('[data-cy="permission-item"]').should('contain.text', '14:00 - 16:00');

            // Clock in normally
            cy.get('[data-cy="clock-in-button"]').click();

            // During permission time, attendance should show permission status
            cy.clock(new Date().setHours(14, 30, 0, 0)); // 2:30 PM

            cy.get('[data-cy="current-status"]').should('contain.text', 'On Approved Permission');
            cy.get('[data-cy="permission-details"]').should('contain.text', 'Medical Appointment');
        });

        it('should not deduct permission time from working hours', () => {
            // Seed attendance record with permission
            cy.seedTestData('attendance', {
                employeeId: 'employee-id-123',
                date: new Date().toISOString().split('T')[0],
                clockIn: '09:00',
                clockOut: '17:00',
                totalHours: 8,
                permissionHours: 2,
                workingHours: 6, // 8 - 2 permission hours
                status: 'completed'
            });

            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('attendance');

            // Verify hours calculation includes permission time
            cy.get('[data-cy="attendance-summary"]').should('be.visible');
            cy.get('[data-cy="total-hours"]').should('contain.text', '8.0');
            cy.get('[data-cy="working-hours"]').should('contain.text', '6.0');
            cy.get('[data-cy="permission-hours"]').should('contain.text', '2.0');
            cy.get('[data-cy="effective-hours"]').should('contain.text', '8.0'); // Working + Permission
        });
    });

    describe('Permission Reports and Analytics', () => {
        beforeEach(() => {
            // Seed multiple permission records for reporting
            cy.seedTestData('permission', [
                {
                    employeeId: 'employee-id-123',
                    employeeName: 'Test Employee',
                    requestDate: '2024-01-15',
                    permissionType: 'Medical Appointment',
                    duration: 2,
                    status: 'approved',
                    department: 'Engineering'
                },
                {
                    employeeId: 'employee-id-123',
                    employeeName: 'Test Employee',
                    requestDate: '2024-01-20',
                    permissionType: 'Personal Errand',
                    duration: 1,
                    status: 'approved',
                    department: 'Engineering'
                },
                {
                    employeeId: 'employee-id-456',
                    employeeName: 'Another Employee',
                    requestDate: '2024-01-18',
                    permissionType: 'Bank Visit',
                    duration: 0.5,
                    status: 'approved',
                    department: 'Marketing'
                }
            ]);
        });

        it('should display permission reports for managers', () => {
            cy.loginAsTenantUser('manager', 'testcompany');
            cy.navigateToModule('reports');

            // Navigate to permission reports
            cy.get('[data-cy="permission-reports-tab"]').click();

            // Verify team permission summary
            cy.get('[data-cy="team-permission-summary"]').should('be.visible');
            cy.get('[data-cy="total-team-permissions"]').should('contain.text', '3.0 hours'); // 2 + 1 hours for Engineering team

            // Verify individual employee permissions
            cy.get('[data-cy="employee-permission-table"]').should('be.visible');
            cy.get('[data-cy="table-row"]').should('have.length.at.least', 1);
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="employee-name"]').should('contain.text', 'Test Employee');
                cy.get('[data-cy="total-permissions"]').should('contain.text', '3.0 hours');
            });
        });

        it('should allow filtering permission reports by type', () => {
            cy.loginAsTenantUser('manager', 'testcompany');
            cy.navigateToModule('reports');

            cy.get('[data-cy="permission-reports-tab"]').click();

            // Apply permission type filter
            cy.get('[data-cy="permission-type-filter"]').select('Medical Appointment');
            cy.get('[data-cy="apply-filter-button"]').click();

            // Verify filtered results
            cy.get('[data-cy="employee-permission-table"]').within(() => {
                cy.get('[data-cy="table-row"]').should('have.length', 1);
                cy.get('[data-cy="table-row"]').first().within(() => {
                    cy.get('[data-cy="permission-type"]').should('contain.text', 'Medical Appointment');
                });
            });
        });

        it('should display permission analytics for HR', () => {
            cy.loginAsTenantUser('hrManager', 'testcompany');
            cy.navigateToModule('analytics');

            // Navigate to permission analytics
            cy.get('[data-cy="permission-analytics-tab"]').click();

            // Verify analytics charts and metrics
            cy.get('[data-cy="permission-trends-chart"]').should('be.visible');
            cy.get('[data-cy="permission-type-breakdown"]').should('be.visible');
            cy.get('[data-cy="department-permission-comparison"]').should('be.visible');

            // Verify key metrics
            cy.get('[data-cy="average-permissions-per-employee"]').should('be.visible');
            cy.get('[data-cy="permission-approval-rate"]').should('be.visible');
            cy.get('[data-cy="most-common-permission-types"]').should('be.visible');
        });
    });

    describe('Permission Policy Compliance', () => {
        it('should enforce daily permission limits', () => {
            // Seed existing permission for the day (3 hours)
            cy.seedTestData('permission', {
                employeeId: 'employee-id-123',
                requestDate: new Date().toISOString().split('T')[0],
                duration: 3,
                status: 'approved'
            });

            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('permissions');

            cy.get('[data-cy="new-permission-request-button"]').click();

            // Try to request 2 more hours (would exceed 4-hour daily limit)
            const today = new Date();
            today.setDate(today.getDate() + 1);

            cy.fillForm({
                'request-date': today.toISOString().split('T')[0],
                'permission-type': 'Personal Errand',
                'start-time': '14:00',
                'end-time': '16:00',
                'reason': 'Additional personal task'
            });

            cy.submitForm('[data-cy="permission-request-form"]');

            cy.expectErrorMessage('Permission request would exceed daily limit of 4 hours (current: 3 hours)');
        });

        it('should track permission usage against monthly allowances', () => {
            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('permissions');

            // Verify permission balance display
            cy.get('[data-cy="permission-balance-card"]').should('be.visible');
            cy.get('[data-cy="monthly-allowance"]').should('contain.text', '8 hours'); // Example monthly allowance
            cy.get('[data-cy="used-this-month"]').should('be.visible');
            cy.get('[data-cy="remaining-balance"]').should('be.visible');
        });

        it('should handle emergency permissions differently', () => {
            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('permissions');

            cy.get('[data-cy="emergency-permission-button"]').click();
            cy.get('[data-cy="emergency-permission-form"]').should('be.visible');

            // Emergency permissions should bypass normal restrictions
            cy.fillForm({
                'permission-type': 'Family Emergency',
                'start-time': '10:00',
                'end-time': '18:00', // 8 hours - exceeds normal limit
                'emergency-reason': 'Family member hospitalized',
                'emergency-contact': '+1234567890'
            });

            cy.submitForm('[data-cy="emergency-permission-form"]');

            cy.expectSuccessMessage('Emergency permission request submitted');

            // Should be marked as emergency and require immediate attention
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="emergency-badge"]').should('be.visible');
                cy.get('[data-cy="permission-status"]').should('contain.text', 'Emergency - Pending');
            });
        });
    });
});