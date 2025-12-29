/**
 * E2E Tests for Leave Request Submission and Approval Workflow
 * Tests the complete leave request lifecycle: employee → manager → HR
 */

describe('Leave Request Workflow', () => {
    beforeEach(() => {
        // Clean up and seed test data
        cy.cleanupTestData();

        // Seed employee, manager, and HR users
        cy.seedTestData('users', [
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

        // Seed leave types and policies
        cy.seedTestData('leaveTypes', [
            { name: 'Annual Leave', maxDays: 25, requiresApproval: true },
            { name: 'Sick Leave', maxDays: 10, requiresApproval: false },
            { name: 'Personal Leave', maxDays: 5, requiresApproval: true }
        ]);
    });

    afterEach(() => {
        cy.cleanupAfterTest();
    });

    describe('Leave Request Submission', () => {
        it('should allow employee to submit leave request', () => {
            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('leave');

            // Click new leave request button
            cy.get('[data-cy="new-leave-request-button"]').click();
            cy.get('[data-cy="leave-request-form"]').should('be.visible');

            // Fill leave request form
            const startDate = new Date();
            startDate.setDate(startDate.getDate() + 7); // 7 days from now
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 2); // 3 days leave

            cy.fillForm({
                'leave-type': 'Annual Leave',
                'start-date': startDate.toISOString().split('T')[0],
                'end-date': endDate.toISOString().split('T')[0],
                'reason': 'Family vacation',
                'emergency-contact': '+1234567890'
            });

            // Submit request
            cy.submitForm('[data-cy="leave-request-form"]');

            cy.expectSuccessMessage('Leave request submitted successfully');

            // Verify request appears in employee's leave history
            cy.get('[data-cy="leave-requests-table"]').should('be.visible');
            cy.get('[data-cy="table-row"]').should('have.length', 1);
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="leave-type"]').should('contain.text', 'Annual Leave');
                cy.get('[data-cy="leave-status"]').should('contain.text', 'Pending Manager Approval');
                cy.get('[data-cy="leave-days"]').should('contain.text', '3');
            });
        });

        it('should validate leave request form fields', () => {
            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('leave');

            cy.get('[data-cy="new-leave-request-button"]').click();

            // Try to submit empty form
            cy.submitForm('[data-cy="leave-request-form"]');

            // Verify validation errors
            cy.get('[data-cy="leave-type-error"]').should('be.visible');
            cy.get('[data-cy="start-date-error"]').should('be.visible');
            cy.get('[data-cy="end-date-error"]').should('be.visible');
            cy.get('[data-cy="reason-error"]').should('be.visible');
        });

        it('should validate date ranges for leave requests', () => {
            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('leave');

            cy.get('[data-cy="new-leave-request-button"]').click();

            // Set end date before start date
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            cy.fillForm({
                'leave-type': 'Annual Leave',
                'start-date': today.toISOString().split('T')[0],
                'end-date': yesterday.toISOString().split('T')[0],
                'reason': 'Test leave'
            });

            cy.submitForm('[data-cy="leave-request-form"]');

            cy.expectErrorMessage('End date must be after start date');
        });

        it('should check available leave balance before submission', () => {
            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('leave');

            // Verify leave balance is displayed
            cy.get('[data-cy="leave-balance-card"]').should('be.visible');
            cy.get('[data-cy="annual-leave-balance"]').should('contain.text', '25');
            cy.get('[data-cy="sick-leave-balance"]').should('contain.text', '10');

            cy.get('[data-cy="new-leave-request-button"]').click();

            // Try to request more days than available
            const startDate = new Date();
            startDate.setDate(startDate.getDate() + 7);
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 30); // 31 days (more than 25 available)

            cy.fillForm({
                'leave-type': 'Annual Leave',
                'start-date': startDate.toISOString().split('T')[0],
                'end-date': endDate.toISOString().split('T')[0],
                'reason': 'Extended vacation'
            });

            cy.submitForm('[data-cy="leave-request-form"]');

            cy.expectErrorMessage('Insufficient leave balance. Available: 25 days, Requested: 31 days');
        });
    });

    describe('Manager Approval Workflow', () => {
        beforeEach(() => {
            // Create a pending leave request
            cy.seedTestData('leaveRequest', {
                employeeId: 'employee-id-123',
                employeeName: 'Test Employee',
                leaveType: 'Annual Leave',
                startDate: '2024-02-15',
                endDate: '2024-02-17',
                days: 3,
                reason: 'Family vacation',
                status: 'pending_manager_approval',
                managerId: 'manager-id-123'
            });
        });

        it('should allow manager to view pending leave requests', () => {
            cy.loginAsTenantUser('manager', 'testcompany');
            cy.navigateToModule('approvals');

            // Navigate to leave approvals
            cy.get('[data-cy="leave-approvals-tab"]').click();

            // Verify pending request is visible
            cy.get('[data-cy="pending-requests-table"]').should('be.visible');
            cy.get('[data-cy="table-row"]').should('have.length', 1);
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="employee-name"]').should('contain.text', 'Test Employee');
                cy.get('[data-cy="leave-type"]').should('contain.text', 'Annual Leave');
                cy.get('[data-cy="leave-days"]').should('contain.text', '3');
                cy.get('[data-cy="leave-dates"]').should('contain.text', '2024-02-15 to 2024-02-17');
            });
        });

        it('should allow manager to approve leave request', () => {
            cy.loginAsTenantUser('manager', 'testcompany');
            cy.navigateToModule('approvals');

            cy.get('[data-cy="leave-approvals-tab"]').click();

            // Click approve button
            cy.clickTableAction(0, 'approve');

            // Add approval comments
            cy.get('[data-cy="approval-modal"]').should('be.visible');
            cy.fillForm({
                'approval-comments': 'Approved - enjoy your vacation!'
            });

            cy.get('[data-cy="confirm-approval-button"]').click();

            cy.expectSuccessMessage('Leave request approved successfully');

            // Verify request moves to approved section
            cy.get('[data-cy="approved-requests-tab"]').click();
            cy.get('[data-cy="table-row"]').should('have.length', 1);
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="leave-status"]').should('contain.text', 'Approved');
                cy.get('[data-cy="approval-comments"]').should('contain.text', 'Approved - enjoy your vacation!');
            });
        });

        it('should allow manager to reject leave request', () => {
            cy.loginAsTenantUser('manager', 'testcompany');
            cy.navigateToModule('approvals');

            cy.get('[data-cy="leave-approvals-tab"]').click();

            // Click reject button
            cy.clickTableAction(0, 'reject');

            // Add rejection reason
            cy.get('[data-cy="rejection-modal"]').should('be.visible');
            cy.fillForm({
                'rejection-reason': 'Project deadline conflicts with requested dates'
            });

            cy.get('[data-cy="confirm-rejection-button"]').click();

            cy.expectSuccessMessage('Leave request rejected');

            // Verify request moves to rejected section
            cy.get('[data-cy="rejected-requests-tab"]').click();
            cy.get('[data-cy="table-row"]').should('have.length', 1);
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="leave-status"]').should('contain.text', 'Rejected');
                cy.get('[data-cy="rejection-reason"]').should('contain.text', 'Project deadline conflicts');
            });
        });

        it('should send notification to employee after manager decision', () => {
            cy.loginAsTenantUser('manager', 'testcompany');
            cy.navigateToModule('approvals');

            cy.get('[data-cy="leave-approvals-tab"]').click();
            cy.clickTableAction(0, 'approve');

            cy.get('[data-cy="approval-modal"]').should('be.visible');
            cy.fillForm({ 'approval-comments': 'Approved' });
            cy.get('[data-cy="confirm-approval-button"]').click();

            // Switch to employee account to verify notification
            cy.logout();
            cy.loginAsTenantUser('employee', 'testcompany');

            // Check notifications
            cy.get('[data-cy="notifications-bell"]').click();
            cy.get('[data-cy="notification-item"]').should('contain.text', 'Leave request approved');
            cy.get('[data-cy="notification-item"]').should('contain.text', 'Test Manager');
        });
    });

    describe('HR Final Approval Workflow', () => {
        beforeEach(() => {
            // Create a manager-approved leave request pending HR approval
            cy.seedTestData('leaveRequest', {
                employeeId: 'employee-id-123',
                employeeName: 'Test Employee',
                leaveType: 'Annual Leave',
                startDate: '2024-02-15',
                endDate: '2024-02-17',
                days: 3,
                reason: 'Family vacation',
                status: 'pending_hr_approval',
                managerApproval: {
                    approvedBy: 'Test Manager',
                    approvedAt: '2024-01-15T10:00:00Z',
                    comments: 'Approved by manager'
                }
            });
        });

        it('should allow HR to view manager-approved requests', () => {
            cy.loginAsTenantUser('hrManager', 'testcompany');
            cy.navigateToModule('hr-approvals');

            cy.get('[data-cy="leave-approvals-tab"]').click();

            // Verify manager-approved request is visible
            cy.get('[data-cy="pending-hr-approval-table"]').should('be.visible');
            cy.get('[data-cy="table-row"]').should('have.length', 1);
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="employee-name"]').should('contain.text', 'Test Employee');
                cy.get('[data-cy="manager-approval"]').should('contain.text', 'Approved by Test Manager');
                cy.get('[data-cy="leave-status"]').should('contain.text', 'Pending HR Approval');
            });
        });

        it('should allow HR to give final approval', () => {
            cy.loginAsTenantUser('hrManager', 'testcompany');
            cy.navigateToModule('hr-approvals');

            cy.get('[data-cy="leave-approvals-tab"]').click();

            // Click final approve button
            cy.clickTableAction(0, 'final-approve');

            cy.get('[data-cy="final-approval-modal"]').should('be.visible');
            cy.fillForm({
                'hr-comments': 'Final approval granted - leave balance updated'
            });

            cy.get('[data-cy="confirm-final-approval-button"]').click();

            cy.expectSuccessMessage('Leave request finally approved');

            // Verify request moves to approved section
            cy.get('[data-cy="approved-requests-tab"]').click();
            cy.get('[data-cy="table-row"]').should('have.length', 1);
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="leave-status"]').should('contain.text', 'Approved');
                cy.get('[data-cy="hr-approval"]').should('contain.text', 'Final approval by HR Manager');
            });
        });

        it('should update employee leave balance after final approval', () => {
            cy.loginAsTenantUser('hrManager', 'testcompany');
            cy.navigateToModule('hr-approvals');

            cy.get('[data-cy="leave-approvals-tab"]').click();
            cy.clickTableAction(0, 'final-approve');

            cy.get('[data-cy="final-approval-modal"]').should('be.visible');
            cy.get('[data-cy="confirm-final-approval-button"]').click();

            // Switch to employee account to verify balance update
            cy.logout();
            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('leave');

            // Verify leave balance is reduced
            cy.get('[data-cy="annual-leave-balance"]').should('contain.text', '22'); // 25 - 3 = 22

            // Verify approved leave appears in history
            cy.get('[data-cy="leave-requests-table"]').should('be.visible');
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="leave-status"]').should('contain.text', 'Approved');
            });
        });
    });

    describe('Leave Request Cancellation', () => {
        beforeEach(() => {
            cy.seedTestData('leaveRequest', {
                employeeId: 'employee-id-123',
                employeeName: 'Test Employee',
                leaveType: 'Annual Leave',
                startDate: '2024-02-15',
                endDate: '2024-02-17',
                days: 3,
                reason: 'Family vacation',
                status: 'pending_manager_approval'
            });
        });

        it('should allow employee to cancel pending leave request', () => {
            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('leave');

            // Find pending request and cancel it
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="cancel-request-button"]').click();
            });

            // Confirm cancellation
            cy.confirmDialog();

            cy.expectSuccessMessage('Leave request cancelled successfully');

            // Verify request is removed or marked as cancelled
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="leave-status"]').should('contain.text', 'Cancelled');
            });
        });

        it('should not allow cancelling approved leave requests close to start date', () => {
            // Seed an approved request starting tomorrow
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);

            cy.seedTestData('leaveRequest', {
                employeeId: 'employee-id-123',
                startDate: tomorrow.toISOString().split('T')[0],
                status: 'approved'
            });

            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('leave');

            // Cancel button should be disabled for approved requests close to start date
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="cancel-request-button"]').should('be.disabled');
            });
        });
    });

    describe('Leave Request History and Reporting', () => {
        it('should display comprehensive leave history for employee', () => {
            // Seed multiple leave requests with different statuses
            cy.seedTestData('leaveRequests', [
                {
                    employeeId: 'employee-id-123',
                    leaveType: 'Annual Leave',
                    status: 'approved',
                    startDate: '2024-01-15',
                    endDate: '2024-01-17',
                    days: 3
                },
                {
                    employeeId: 'employee-id-123',
                    leaveType: 'Sick Leave',
                    status: 'rejected',
                    startDate: '2024-01-20',
                    endDate: '2024-01-21',
                    days: 2
                }
            ]);

            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('leave');

            // Verify all requests are displayed
            cy.get('[data-cy="leave-requests-table"]').should('be.visible');
            cy.get('[data-cy="table-row"]').should('have.length', 2);

            // Filter by status
            cy.get('[data-cy="status-filter"]').select('approved');
            cy.get('[data-cy="table-row"]').should('have.length', 1);

            // Filter by leave type
            cy.get('[data-cy="status-filter"]').select('all');
            cy.get('[data-cy="leave-type-filter"]').select('Annual Leave');
            cy.get('[data-cy="table-row"]').should('have.length', 1);
        });
    });
});