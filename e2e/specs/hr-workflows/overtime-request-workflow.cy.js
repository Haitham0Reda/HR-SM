/**
 * E2E Tests for Overtime Request and Approval Workflow
 * Tests overtime request submission and approval process
 */

describe('Overtime Request Workflow', () => {
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

        // Seed overtime policies
        cy.seedTestData('tenant', {
            domain: 'testcompany',
            settings: {
                overtimePolicy: {
                    maxOvertimePerDay: 4,
                    maxOvertimePerWeek: 20,
                    requiresApproval: true,
                    overtimeRate: 1.5,
                    autoApproveUnder: 2 // Auto-approve requests under 2 hours
                }
            }
        });
    });

    afterEach(() => {
        cy.cleanupAfterTest();
    });

    describe('Overtime Request Submission', () => {
        it('should allow employee to submit overtime request', () => {
            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('overtime');

            // Click new overtime request button
            cy.get('[data-cy="new-overtime-request-button"]').click();
            cy.get('[data-cy="overtime-request-form"]').should('be.visible');

            // Fill overtime request form
            const requestDate = new Date();
            requestDate.setDate(requestDate.getDate() + 1); // Tomorrow

            cy.fillForm({
                'request-date': requestDate.toISOString().split('T')[0],
                'start-time': '18:00',
                'end-time': '20:00',
                'reason': 'Project deadline requires additional work',
                'project-code': 'PROJ-001',
                'estimated-hours': '2'
            });

            // Submit request
            cy.submitForm('[data-cy="overtime-request-form"]');

            cy.expectSuccessMessage('Overtime request submitted successfully');

            // Verify request appears in employee's overtime history
            cy.get('[data-cy="overtime-requests-table"]').should('be.visible');
            cy.get('[data-cy="table-row"]').should('have.length', 1);
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="overtime-hours"]').should('contain.text', '2.0');
                cy.get('[data-cy="overtime-status"]').should('contain.text', 'Pending Approval');
                cy.get('[data-cy="project-code"]').should('contain.text', 'PROJ-001');
            });
        });

        it('should validate overtime request form fields', () => {
            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('overtime');

            cy.get('[data-cy="new-overtime-request-button"]').click();

            // Try to submit empty form
            cy.submitForm('[data-cy="overtime-request-form"]');

            // Verify validation errors
            cy.get('[data-cy="request-date-error"]').should('be.visible');
            cy.get('[data-cy="start-time-error"]').should('be.visible');
            cy.get('[data-cy="end-time-error"]').should('be.visible');
            cy.get('[data-cy="reason-error"]').should('be.visible');
        });

        it('should validate overtime time ranges', () => {
            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('overtime');

            cy.get('[data-cy="new-overtime-request-button"]').click();

            // Set end time before start time
            cy.fillForm({
                'request-date': new Date().toISOString().split('T')[0],
                'start-time': '20:00',
                'end-time': '18:00',
                'reason': 'Test overtime'
            });

            cy.submitForm('[data-cy="overtime-request-form"]');

            cy.expectErrorMessage('End time must be after start time');
        });

        it('should enforce daily overtime limits', () => {
            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('overtime');

            cy.get('[data-cy="new-overtime-request-button"]').click();

            // Request more than maximum allowed (4 hours)
            cy.fillForm({
                'request-date': new Date().toISOString().split('T')[0],
                'start-time': '18:00',
                'end-time': '23:00', // 5 hours
                'reason': 'Extended work session'
            });

            cy.submitForm('[data-cy="overtime-request-form"]');

            cy.expectErrorMessage('Overtime request exceeds daily limit of 4 hours');
        });

        it('should auto-approve overtime requests under threshold', () => {
            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('overtime');

            cy.get('[data-cy="new-overtime-request-button"]').click();

            // Request 1.5 hours (under 2-hour auto-approve threshold)
            cy.fillForm({
                'request-date': new Date().toISOString().split('T')[0],
                'start-time': '18:00',
                'end-time': '19:30',
                'reason': 'Quick task completion'
            });

            cy.submitForm('[data-cy="overtime-request-form"]');

            cy.expectSuccessMessage('Overtime request auto-approved');

            // Verify request is automatically approved
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="overtime-status"]').should('contain.text', 'Auto-Approved');
            });
        });
    });

    describe('Manager Approval Workflow', () => {
        beforeEach(() => {
            // Create a pending overtime request
            cy.seedTestData('overtime', {
                employeeId: 'employee-id-123',
                employeeName: 'Test Employee',
                requestDate: '2024-02-15',
                startTime: '18:00',
                endTime: '21:00',
                hours: 3,
                reason: 'Project deadline work',
                projectCode: 'PROJ-001',
                status: 'pending_manager_approval',
                managerId: 'manager-id-123'
            });
        });

        it('should allow manager to view pending overtime requests', () => {
            cy.loginAsTenantUser('manager', 'testcompany');
            cy.navigateToModule('approvals');

            // Navigate to overtime approvals
            cy.get('[data-cy="overtime-approvals-tab"]').click();

            // Verify pending request is visible
            cy.get('[data-cy="pending-requests-table"]').should('be.visible');
            cy.get('[data-cy="table-row"]').should('have.length', 1);
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="employee-name"]').should('contain.text', 'Test Employee');
                cy.get('[data-cy="overtime-hours"]').should('contain.text', '3.0');
                cy.get('[data-cy="overtime-date"]').should('contain.text', '2024-02-15');
                cy.get('[data-cy="project-code"]').should('contain.text', 'PROJ-001');
            });
        });

        it('should allow manager to approve overtime request', () => {
            cy.loginAsTenantUser('manager', 'testcompany');
            cy.navigateToModule('approvals');

            cy.get('[data-cy="overtime-approvals-tab"]').click();

            // Click approve button
            cy.clickTableAction(0, 'approve');

            // Add approval comments
            cy.get('[data-cy="approval-modal"]').should('be.visible');
            cy.fillForm({
                'approval-comments': 'Approved - project deadline justified',
                'approved-hours': '3.0'
            });

            cy.get('[data-cy="confirm-approval-button"]').click();

            cy.expectSuccessMessage('Overtime request approved successfully');

            // Verify request moves to approved section
            cy.get('[data-cy="approved-requests-tab"]').click();
            cy.get('[data-cy="table-row"]').should('have.length', 1);
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="overtime-status"]').should('contain.text', 'Approved');
                cy.get('[data-cy="approval-comments"]').should('contain.text', 'project deadline justified');
            });
        });

        it('should allow manager to approve with modified hours', () => {
            cy.loginAsTenantUser('manager', 'testcompany');
            cy.navigateToModule('approvals');

            cy.get('[data-cy="overtime-approvals-tab"]').click();

            cy.clickTableAction(0, 'approve');

            // Approve with reduced hours
            cy.get('[data-cy="approval-modal"]').should('be.visible');
            cy.fillForm({
                'approval-comments': 'Approved with reduced hours',
                'approved-hours': '2.5'
            });

            cy.get('[data-cy="confirm-approval-button"]').click();

            cy.expectSuccessMessage('Overtime request approved with modifications');

            // Verify modified hours
            cy.get('[data-cy="approved-requests-tab"]').click();
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="approved-hours"]').should('contain.text', '2.5');
                cy.get('[data-cy="modification-notice"]').should('be.visible');
            });
        });

        it('should allow manager to reject overtime request', () => {
            cy.loginAsTenantUser('manager', 'testcompany');
            cy.navigateToModule('approvals');

            cy.get('[data-cy="overtime-approvals-tab"]').click();

            // Click reject button
            cy.clickTableAction(0, 'reject');

            // Add rejection reason
            cy.get('[data-cy="rejection-modal"]').should('be.visible');
            cy.fillForm({
                'rejection-reason': 'Project can be completed during regular hours'
            });

            cy.get('[data-cy="confirm-rejection-button"]').click();

            cy.expectSuccessMessage('Overtime request rejected');

            // Verify request moves to rejected section
            cy.get('[data-cy="rejected-requests-tab"]').click();
            cy.get('[data-cy="table-row"]').should('have.length', 1);
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="overtime-status"]').should('contain.text', 'Rejected');
                cy.get('[data-cy="rejection-reason"]').should('contain.text', 'regular hours');
            });
        });

        it('should send notification to employee after manager decision', () => {
            cy.loginAsTenantUser('manager', 'testcompany');
            cy.navigateToModule('approvals');

            cy.get('[data-cy="overtime-approvals-tab"]').click();
            cy.clickTableAction(0, 'approve');

            cy.get('[data-cy="approval-modal"]').should('be.visible');
            cy.fillForm({ 'approval-comments': 'Approved' });
            cy.get('[data-cy="confirm-approval-button"]').click();

            // Switch to employee account to verify notification
            cy.logout();
            cy.loginAsTenantUser('employee', 'testcompany');

            // Check notifications
            cy.get('[data-cy="notifications-bell"]').click();
            cy.get('[data-cy="notification-item"]').should('contain.text', 'Overtime request approved');
            cy.get('[data-cy="notification-item"]').should('contain.text', 'Test Manager');
        });
    });

    describe('Overtime Tracking and Payroll Integration', () => {
        beforeEach(() => {
            // Create approved overtime request
            cy.seedTestData('overtime', {
                employeeId: 'employee-id-123',
                employeeName: 'Test Employee',
                requestDate: '2024-02-15',
                startTime: '18:00',
                endTime: '21:00',
                hours: 3,
                approvedHours: 3,
                status: 'approved',
                overtimeRate: 1.5
            });
        });

        it('should track actual overtime hours worked', () => {
            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('overtime');

            // Navigate to overtime tracking
            cy.get('[data-cy="overtime-tracking-tab"]').click();

            // Find approved overtime request
            cy.get('[data-cy="approved-overtime-table"]').should('be.visible');
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="start-overtime-button"]').click();
            });

            cy.expectSuccessMessage('Overtime tracking started');

            // Verify overtime is being tracked
            cy.get('[data-cy="active-overtime-banner"]').should('be.visible');
            cy.get('[data-cy="overtime-timer"]').should('be.visible');

            // End overtime tracking
            cy.get('[data-cy="end-overtime-button"]').click();

            cy.get('[data-cy="overtime-completion-modal"]').should('be.visible');
            cy.fillForm({
                'actual-end-time': '20:30',
                'work-description': 'Completed project milestone tasks'
            });

            cy.get('[data-cy="confirm-completion-button"]').click();

            cy.expectSuccessMessage('Overtime completed successfully');

            // Verify actual hours are recorded
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="actual-hours"]').should('contain.text', '2.5');
                cy.get('[data-cy="overtime-status"]').should('contain.text', 'Completed');
            });
        });

        it('should calculate overtime pay correctly', () => {
            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('overtime');

            // View overtime summary
            cy.get('[data-cy="overtime-summary-tab"]').click();

            // Verify pay calculations
            cy.get('[data-cy="overtime-summary"]').should('be.visible');
            cy.get('[data-cy="total-overtime-hours"]').should('contain.text', '3.0');
            cy.get('[data-cy="overtime-rate"]').should('contain.text', '1.5x');

            // Assuming base hourly rate of $20
            cy.get('[data-cy="overtime-pay"]').should('contain.text', '$90.00'); // 3 hours * $20 * 1.5
        });

        it('should integrate with payroll system', () => {
            cy.loginAsTenantUser('hrManager', 'testcompany');
            cy.navigateToModule('payroll');

            // Navigate to overtime payroll section
            cy.get('[data-cy="overtime-payroll-tab"]').click();

            // Verify overtime hours are included in payroll
            cy.get('[data-cy="payroll-overtime-table"]').should('be.visible');
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="employee-name"]').should('contain.text', 'Test Employee');
                cy.get('[data-cy="overtime-hours"]').should('contain.text', '3.0');
                cy.get('[data-cy="overtime-pay"]').should('contain.text', '$90.00');
            });

            // Process overtime payroll
            cy.get('[data-cy="process-overtime-payroll-button"]').click();

            cy.confirmDialog();

            cy.expectSuccessMessage('Overtime payroll processed successfully');
        });
    });

    describe('Overtime Reports and Analytics', () => {
        beforeEach(() => {
            // Seed multiple overtime records for reporting
            cy.seedTestData('overtime', [
                {
                    employeeId: 'employee-id-123',
                    employeeName: 'Test Employee',
                    requestDate: '2024-01-15',
                    hours: 2,
                    status: 'completed',
                    department: 'Engineering'
                },
                {
                    employeeId: 'employee-id-123',
                    employeeName: 'Test Employee',
                    requestDate: '2024-01-20',
                    hours: 3,
                    status: 'completed',
                    department: 'Engineering'
                },
                {
                    employeeId: 'employee-id-456',
                    employeeName: 'Another Employee',
                    requestDate: '2024-01-18',
                    hours: 1.5,
                    status: 'completed',
                    department: 'Marketing'
                }
            ]);
        });

        it('should display overtime reports for managers', () => {
            cy.loginAsTenantUser('manager', 'testcompany');
            cy.navigateToModule('reports');

            // Navigate to overtime reports
            cy.get('[data-cy="overtime-reports-tab"]').click();

            // Verify team overtime summary
            cy.get('[data-cy="team-overtime-summary"]').should('be.visible');
            cy.get('[data-cy="total-team-overtime"]').should('contain.text', '5.0'); // 2 + 3 hours for Engineering team

            // Verify individual employee overtime
            cy.get('[data-cy="employee-overtime-table"]').should('be.visible');
            cy.get('[data-cy="table-row"]').should('have.length.at.least', 1);
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="employee-name"]').should('contain.text', 'Test Employee');
                cy.get('[data-cy="total-overtime"]').should('contain.text', '5.0');
            });
        });

        it('should allow filtering overtime reports by date range', () => {
            cy.loginAsTenantUser('manager', 'testcompany');
            cy.navigateToModule('reports');

            cy.get('[data-cy="overtime-reports-tab"]').click();

            // Apply date filter
            cy.get('[data-cy="date-filter-from"]').type('2024-01-15');
            cy.get('[data-cy="date-filter-to"]').type('2024-01-15');
            cy.get('[data-cy="apply-filter-button"]').click();

            // Verify filtered results
            cy.get('[data-cy="employee-overtime-table"]').within(() => {
                cy.get('[data-cy="table-row"]').should('have.length', 1);
                cy.get('[data-cy="table-row"]').first().within(() => {
                    cy.get('[data-cy="total-overtime"]').should('contain.text', '2.0');
                });
            });
        });

        it('should display overtime trends and analytics', () => {
            cy.loginAsTenantUser('hrManager', 'testcompany');
            cy.navigateToModule('analytics');

            // Navigate to overtime analytics
            cy.get('[data-cy="overtime-analytics-tab"]').click();

            // Verify analytics charts and metrics
            cy.get('[data-cy="overtime-trends-chart"]').should('be.visible');
            cy.get('[data-cy="department-overtime-breakdown"]').should('be.visible');
            cy.get('[data-cy="overtime-cost-analysis"]').should('be.visible');

            // Verify key metrics
            cy.get('[data-cy="average-overtime-per-employee"]').should('be.visible');
            cy.get('[data-cy="overtime-approval-rate"]').should('be.visible');
            cy.get('[data-cy="peak-overtime-periods"]').should('be.visible');
        });
    });

    describe('Overtime Policy Compliance', () => {
        it('should enforce weekly overtime limits', () => {
            // Seed existing overtime for the week (18 hours)
            cy.seedTestData('overtime', [
                { employeeId: 'employee-id-123', requestDate: '2024-02-12', hours: 8, status: 'approved' },
                { employeeId: 'employee-id-123', requestDate: '2024-02-13', hours: 6, status: 'approved' },
                { employeeId: 'employee-id-123', requestDate: '2024-02-14', hours: 4, status: 'approved' }
            ]);

            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('overtime');

            cy.get('[data-cy="new-overtime-request-button"]').click();

            // Try to request 3 more hours (would exceed 20-hour weekly limit)
            cy.fillForm({
                'request-date': '2024-02-15',
                'start-time': '18:00',
                'end-time': '21:00',
                'reason': 'Additional project work'
            });

            cy.submitForm('[data-cy="overtime-request-form"]');

            cy.expectErrorMessage('Overtime request would exceed weekly limit of 20 hours (current: 18 hours)');
        });

        it('should warn about consecutive overtime days', () => {
            // Seed overtime for previous 3 days
            cy.seedTestData('overtime', [
                { employeeId: 'employee-id-123', requestDate: '2024-02-12', hours: 2, status: 'approved' },
                { employeeId: 'employee-id-123', requestDate: '2024-02-13', hours: 2, status: 'approved' },
                { employeeId: 'employee-id-123', requestDate: '2024-02-14', hours: 2, status: 'approved' }
            ]);

            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('overtime');

            cy.get('[data-cy="new-overtime-request-button"]').click();

            cy.fillForm({
                'request-date': '2024-02-15',
                'start-time': '18:00',
                'end-time': '20:00',
                'reason': 'Fourth consecutive day'
            });

            cy.submitForm('[data-cy="overtime-request-form"]');

            // Should show warning but allow submission
            cy.get('[data-cy="consecutive-overtime-warning"]').should('be.visible');
            cy.get('[data-cy="acknowledge-warning"]').check();

            cy.get('[data-cy="submit-with-warning-button"]').click();

            cy.expectSuccessMessage('Overtime request submitted with warning');
        });
    });
});