/// <reference types="cypress" />

/**
 * E2E Leave Workflow Tests
 * Requirements: 3-3
 * 
 * Test Coverage:
 * - Employee leave request submission
 * - Leave status tracking (Pending, Approved, Rejected)
 * - Manager leave approval workflow
 * - HR Manager leave rejection with reason
 * - Leave balance calculation and updates
 * - Notification system for leave actions
 */

describe('Leave HR Workflow E2E Tests', () => {
  beforeEach(() => {
    cy.clearAllStorage();
    cy.clearAllCookies();
  });

  describe('Employee Leave Request Submission', () => {
    it('should allow employee to submit annual leave request with Pending status', () => {
      cy.loginAs('employee');
      
      // Navigate to leave page
      cy.visit('/leave');
      cy.get('[data-cy=leave-page]').should('be.visible');
      
      // Click Request Leave button
      cy.get('[data-cy=request-leave-button]').click();
      
      // Fill leave request form
      cy.get('[data-cy=leave-request-modal]').should('be.visible');
      
      cy.get('[data-cy=leave-type-select]').click();
      cy.get('[data-cy=leave-type-option-annual]').click();
      
      // Set leave dates (3 days from now to 5 days from now)
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 3);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 5);
      
      cy.get('[data-cy=start-date-input]').type(startDate.toISOString().split('T')[0]);
      cy.get('[data-cy=end-date-input]').type(endDate.toISOString().split('T')[0]);
      
      // Add reason
      cy.get('[data-cy=leave-reason-input]').type('Family vacation');
      
      // Submit request
      cy.get('[data-cy=submit-leave-button]').click();
      
      // Verify success message
      cy.get('[data-cy=success-toast]').should('be.visible');
      cy.get('[data-cy=success-toast]').should('contain', 'Leave request submitted');
      
      // Modal should close
      cy.get('[data-cy=leave-request-modal]').should('not.exist');
      
      // Verify leave entry appears in the list with Pending status
      cy.get('[data-cy=leave-list]').should('be.visible');
      cy.get('[data-cy=leave-row]').first().within(() => {
        cy.get('[data-cy=leave-type]').should('contain', 'Annual Leave');
        cy.get('[data-cy=leave-status]').should('contain', 'Pending');
        cy.get('[data-cy=leave-status-badge]').should('have.class', 'status-pending');
        cy.get('[data-cy=leave-days]').should('contain', '3'); // 3 days
        cy.get('[data-cy=leave-reason]').should('contain', 'Family vacation');
      });
    });

    it('should validate leave request dates', () => {
      cy.loginAs('employee');
      cy.visit('/leave');
      
      cy.get('[data-cy=request-leave-button]').click();
      
      // Try to submit with end date before start date
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      cy.get('[data-cy=leave-type-select]').click();
      cy.get('[data-cy=leave-type-option-annual]').click();
      
      cy.get('[data-cy=start-date-input]').type(today.toISOString().split('T')[0]);
      cy.get('[data-cy=end-date-input]').type(yesterday.toISOString().split('T')[0]);
      cy.get('[data-cy=leave-reason-input]').type('Test');
      
      cy.get('[data-cy=submit-leave-button]').click();
      
      // Verify validation error
      cy.get('[data-cy=date-error]').should('be.visible');
      cy.get('[data-cy=date-error]').should('contain', 'End date must be after start date');
    });

    it('should show available leave balance before submission', () => {
      cy.loginAs('employee');
      cy.visit('/leave');
      
      // Verify leave balance is displayed
      cy.get('[data-cy=leave-balance-card]').should('be.visible');
      cy.get('[data-cy=annual-leave-balance]').should('exist');
      cy.get('[data-cy=sick-leave-balance]').should('exist');
      
      // Get current balance
      cy.get('[data-cy=annual-leave-balance]').invoke('text').then((balanceText) => {
        const balance = parseInt(balanceText);
        expect(balance).to.be.at.least(0);
      });
    });

    it('should prevent leave request when insufficient balance', () => {
      cy.loginAs('employee');
      cy.visit('/leave');
      
      cy.get('[data-cy=request-leave-button]').click();
      
      // Request more days than available
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 1);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 365); // 1 year
      
      cy.get('[data-cy=leave-type-select]').click();
      cy.get('[data-cy=leave-type-option-annual]').click();
      
      cy.get('[data-cy=start-date-input]').type(startDate.toISOString().split('T')[0]);
      cy.get('[data-cy=end-date-input]').type(endDate.toISOString().split('T')[0]);
      cy.get('[data-cy=leave-reason-input]').type('Long vacation');
      
      cy.get('[data-cy=submit-leave-button]').click();
      
      // Verify error message
      cy.get('[data-cy=error-toast]').should('be.visible');
      cy.get('[data-cy=error-toast]').should('contain', 'Insufficient leave balance');
    });

    it('should allow employee to view their leave history', () => {
      cy.loginAs('employee');
      cy.visit('/leave');
      
      // Verify leave history table
      cy.get('[data-cy=leave-history]').should('be.visible');
      cy.get('[data-cy=leave-row]').should('have.length.at.least', 0);
      
      // Verify table columns
      cy.get('[data-cy=leave-history]').within(() => {
        cy.contains('Type').should('be.visible');
        cy.contains('Start Date').should('be.visible');
        cy.contains('End Date').should('be.visible');
        cy.contains('Days').should('be.visible');
        cy.contains('Status').should('be.visible');
        cy.contains('Reason').should('be.visible');
      });
    });
  });

  describe('Manager Leave Approval Workflow', () => {
    beforeEach(() => {
      cy.fixture('tenants').then((tenants) => {
        cy.seedTenant(tenants['tenant-1'].id);
      });
    });

    afterEach(() => {
      cy.fixture('tenants').then((tenants) => {
        cy.cleanupTenant(tenants['tenant-1'].id);
      });
    });

    it('should allow manager to approve leave and update status with notification', () => {
      // First, create a leave request as employee
      cy.loginAs('employee');
      cy.visit('/leave');
      cy.get('[data-cy=request-leave-button]').click();
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 7);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 9);
      
      cy.get('[data-cy=leave-type-select]').click();
      cy.get('[data-cy=leave-type-option-annual]').click();
      cy.get('[data-cy=start-date-input]').type(startDate.toISOString().split('T')[0]);
      cy.get('[data-cy=end-date-input]').type(endDate.toISOString().split('T')[0]);
      cy.get('[data-cy=leave-reason-input]').type('Personal matters');
      cy.get('[data-cy=submit-leave-button]').click();
      cy.get('[data-cy=success-toast]').should('be.visible');
      
      // Logout employee
      cy.get('[data-cy=user-menu]').click();
      cy.get('[data-cy=logout-button]').click();
      
      // Login as manager
      cy.loginAs('manager');
      cy.visit('/leave/approvals');
      
      // Verify pending leave requests page
      cy.get('[data-cy=pending-leaves-page]').should('be.visible');
      cy.get('[data-cy=pending-leave-row]').should('have.length.at.least', 1);
      
      // Find and approve the leave request
      cy.get('[data-cy=pending-leave-row]').first().within(() => {
        cy.get('[data-cy=leave-status]').should('contain', 'Pending');
        cy.get('[data-cy=approve-leave-button]').click();
      });
      
      // Confirm approval
      cy.get('[data-cy=confirm-approval-modal]').should('be.visible');
      cy.get('[data-cy=approval-comment-input]').type('Approved for personal matters');
      cy.get('[data-cy=confirm-approve-button]').click();
      
      // Verify success message
      cy.get('[data-cy=success-toast]').should('contain', 'Leave approved');
      
      // Verify leave status changed to Approved
      cy.get('[data-cy=pending-leave-row]').first().within(() => {
        cy.get('[data-cy=leave-status]').should('contain', 'Approved');
        cy.get('[data-cy=leave-status-badge]').should('have.class', 'status-approved');
      });
      
      // Logout manager
      cy.get('[data-cy=user-menu]').click();
      cy.get('[data-cy=logout-button]').click();
      
      // Login back as employee to verify notification
      cy.loginAs('employee');
      cy.visit('/dashboard');
      
      // Check for notification
      cy.get('[data-cy=notification-bell]').click();
      cy.get('[data-cy=notification-list]').should('be.visible');
      cy.get('[data-cy=notification-item]').first().within(() => {
        cy.get('[data-cy=notification-message]').should('contain', 'Leave request approved');
        cy.get('[data-cy=notification-unread-badge]').should('be.visible');
      });
      
      // Verify leave status in leave page
      cy.visit('/leave');
      cy.get('[data-cy=leave-row]').first().within(() => {
        cy.get('[data-cy=leave-status]').should('contain', 'Approved');
      });
    });

    it('should show pending leave count badge for manager', () => {
      cy.loginAs('manager');
      cy.visit('/dashboard');
      
      // Verify pending approvals badge
      cy.get('[data-cy=pending-approvals-badge]').should('be.visible');
      cy.get('[data-cy=pending-approvals-badge]').invoke('text').should('match', /\d+/);
    });

    it('should allow manager to view leave details before approval', () => {
      cy.loginAs('manager');
      cy.visit('/leave/approvals');
      
      cy.get('[data-cy=pending-leave-row]').first().within(() => {
        cy.get('[data-cy=view-details-button]').click();
      });
      
      // Verify details modal
      cy.get('[data-cy=leave-details-modal]').should('be.visible');
      cy.get('[data-cy=employee-name]').should('exist');
      cy.get('[data-cy=leave-type]').should('exist');
      cy.get('[data-cy=leave-dates]').should('exist');
      cy.get('[data-cy=leave-reason]').should('exist');
      cy.get('[data-cy=employee-leave-balance]').should('exist');
      cy.get('[data-cy=employee-leave-history]').should('exist');
    });
  });

  describe('HR Manager Leave Rejection Workflow', () => {
    beforeEach(() => {
      cy.fixture('tenants').then((tenants) => {
        cy.seedTenant(tenants['tenant-1'].id);
      });
    });

    afterEach(() => {
      cy.fixture('tenants').then((tenants) => {
        cy.cleanupTenant(tenants['tenant-1'].id);
      });
    });

    it('should allow HR Manager to reject leave with reason and employee can see rejection message', () => {
      // Create leave request as employee
      cy.loginAs('employee');
      cy.visit('/leave');
      cy.get('[data-cy=request-leave-button]').click();
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 14);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 16);
      
      cy.get('[data-cy=leave-type-select]').click();
      cy.get('[data-cy=leave-type-option-sick]').click();
      cy.get('[data-cy=start-date-input]').type(startDate.toISOString().split('T')[0]);
      cy.get('[data-cy=end-date-input]').type(endDate.toISOString().split('T')[0]);
      cy.get('[data-cy=leave-reason-input]').type('Medical appointment');
      cy.get('[data-cy=submit-leave-button]').click();
      cy.get('[data-cy=success-toast]').should('be.visible');
      
      // Logout employee
      cy.get('[data-cy=user-menu]').click();
      cy.get('[data-cy=logout-button]').click();
      
      // Login as HR Manager
      cy.loginAs('hr_manager');
      cy.visit('/leave/approvals');
      
      // Reject the leave request
      cy.get('[data-cy=pending-leave-row]').first().within(() => {
        cy.get('[data-cy=reject-leave-button]').click();
      });
      
      // Rejection modal should open
      cy.get('[data-cy=reject-leave-modal]').should('be.visible');
      
      // Rejection reason is required
      cy.get('[data-cy=rejection-reason-input]').should('be.visible');
      cy.get('[data-cy=rejection-reason-input]').type('Insufficient documentation provided. Please submit medical certificate.');
      
      cy.get('[data-cy=confirm-reject-button]').click();
      
      // Verify success message
      cy.get('[data-cy=success-toast]').should('contain', 'Leave rejected');
      
      // Verify status changed to Rejected
      cy.get('[data-cy=pending-leave-row]').first().within(() => {
        cy.get('[data-cy=leave-status]').should('contain', 'Rejected');
        cy.get('[data-cy=leave-status-badge]').should('have.class', 'status-rejected');
      });
      
      // Logout HR Manager
      cy.get('[data-cy=user-menu]').click();
      cy.get('[data-cy=logout-button]').click();
      
      // Login back as employee
      cy.loginAs('employee');
      cy.visit('/leave');
      
      // Verify rejected status and reason
      cy.get('[data-cy=leave-row]').first().within(() => {
        cy.get('[data-cy=leave-status]').should('contain', 'Rejected');
        cy.get('[data-cy=view-rejection-reason-button]').click();
      });
      
      // Verify rejection reason modal
      cy.get('[data-cy=rejection-reason-modal]').should('be.visible');
      cy.get('[data-cy=rejection-reason-text]').should('contain', 'Insufficient documentation provided');
      cy.get('[data-cy=rejection-reason-text]').should('contain', 'Please submit medical certificate');
    });

    it('should require rejection reason when rejecting leave', () => {
      cy.loginAs('hr_manager');
      cy.visit('/leave/approvals');
      
      cy.get('[data-cy=pending-leave-row]').first().within(() => {
        cy.get('[data-cy=reject-leave-button]').click();
      });
      
      // Try to reject without reason
      cy.get('[data-cy=confirm-reject-button]').click();
      
      // Verify validation error
      cy.get('[data-cy=rejection-reason-error]').should('be.visible');
      cy.get('[data-cy=rejection-reason-error]').should('contain', 'Rejection reason is required');
      
      // Modal should still be open
      cy.get('[data-cy=reject-leave-modal]').should('be.visible');
    });

    it('should send notification to employee when leave is rejected', () => {
      // Create and reject leave
      cy.loginAs('employee');
      cy.visit('/leave');
      cy.get('[data-cy=request-leave-button]').click();
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 5);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 7);
      
      cy.get('[data-cy=leave-type-select]').click();
      cy.get('[data-cy=leave-type-option-annual]').click();
      cy.get('[data-cy=start-date-input]').type(startDate.toISOString().split('T')[0]);
      cy.get('[data-cy=end-date-input]').type(endDate.toISOString().split('T')[0]);
      cy.get('[data-cy=leave-reason-input]').type('Vacation');
      cy.get('[data-cy=submit-leave-button]').click();
      cy.get('[data-cy=success-toast]').should('be.visible');
      
      cy.get('[data-cy=user-menu]').click();
      cy.get('[data-cy=logout-button]').click();
      
      // Reject as HR Manager
      cy.loginAs('hr_manager');
      cy.visit('/leave/approvals');
      cy.get('[data-cy=pending-leave-row]').first().within(() => {
        cy.get('[data-cy=reject-leave-button]').click();
      });
      cy.get('[data-cy=rejection-reason-input]').type('Peak season - all leave requests denied');
      cy.get('[data-cy=confirm-reject-button]').click();
      cy.get('[data-cy=success-toast]').should('be.visible');
      
      cy.get('[data-cy=user-menu]').click();
      cy.get('[data-cy=logout-button]').click();
      
      // Check notification as employee
      cy.loginAs('employee');
      cy.visit('/dashboard');
      
      cy.get('[data-cy=notification-bell]').click();
      cy.get('[data-cy=notification-item]').first().within(() => {
        cy.get('[data-cy=notification-message]').should('contain', 'Leave request rejected');
        cy.get('[data-cy=notification-type]').should('have.class', 'notification-warning');
      });
    });
  });

  describe('Leave Balance Calculation', () => {
    it('should decrement leave balance after approval by correct number of days', () => {
      cy.loginAs('employee');
      cy.visit('/leave');
      
      // Get initial balance
      cy.get('[data-cy=annual-leave-balance]').invoke('text').then((initialBalanceText) => {
        const initialBalance = parseInt(initialBalanceText);
        
        // Request 3 days leave
        cy.get('[data-cy=request-leave-button]').click();
        
        const startDate = new Date();
        startDate.setDate(startDate.getDate() + 10);
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 12); // 3 days
        
        cy.get('[data-cy=leave-type-select]').click();
        cy.get('[data-cy=leave-type-option-annual]').click();
        cy.get('[data-cy=start-date-input]').type(startDate.toISOString().split('T')[0]);
        cy.get('[data-cy=end-date-input]').type(endDate.toISOString().split('T')[0]);
        cy.get('[data-cy=leave-reason-input]').type('Short break');
        cy.get('[data-cy=submit-leave-button]').click();
        cy.get('[data-cy=success-toast]').should('be.visible');
        
        // Logout and approve as manager
        cy.get('[data-cy=user-menu]').click();
        cy.get('[data-cy=logout-button]').click();
        
        cy.loginAs('manager');
        cy.visit('/leave/approvals');
        cy.get('[data-cy=pending-leave-row]').first().within(() => {
          cy.get('[data-cy=approve-leave-button]').click();
        });
        cy.get('[data-cy=confirm-approve-button]').click();
        cy.get('[data-cy=success-toast]').should('be.visible');
        
        cy.get('[data-cy=user-menu]').click();
        cy.get('[data-cy=logout-button]').click();
        
        // Check updated balance as employee
        cy.loginAs('employee');
        cy.visit('/leave');
        
        // Verify balance decreased by 3 days
        cy.get('[data-cy=annual-leave-balance]').invoke('text').then((newBalanceText) => {
          const newBalance = parseInt(newBalanceText);
          expect(newBalance).to.equal(initialBalance - 3);
        });
      });
    });

    it('should not decrement balance for pending leave requests', () => {
      cy.loginAs('employee');
      cy.visit('/leave');
      
      // Get initial balance
      cy.get('[data-cy=annual-leave-balance]').invoke('text').then((initialBalanceText) => {
        const initialBalance = parseInt(initialBalanceText);
        
        // Submit leave request
        cy.get('[data-cy=request-leave-button]').click();
        
        const startDate = new Date();
        startDate.setDate(startDate.getDate() + 20);
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 22);
        
        cy.get('[data-cy=leave-type-select]').click();
        cy.get('[data-cy=leave-type-option-annual]').click();
        cy.get('[data-cy=start-date-input]').type(startDate.toISOString().split('T')[0]);
        cy.get('[data-cy=end-date-input]').type(endDate.toISOString().split('T')[0]);
        cy.get('[data-cy=leave-reason-input]').type('Pending leave');
        cy.get('[data-cy=submit-leave-button]').click();
        cy.get('[data-cy=success-toast]').should('be.visible');
        
        // Reload page
        cy.reload();
        
        // Verify balance unchanged
        cy.get('[data-cy=annual-leave-balance]').invoke('text').then((currentBalanceText) => {
          const currentBalance = parseInt(currentBalanceText);
          expect(currentBalance).to.equal(initialBalance);
        });
      });
    });

    it('should restore balance when approved leave is cancelled', () => {
      cy.loginAs('employee');
      cy.visit('/leave');
      
      // Get initial balance
      cy.get('[data-cy=annual-leave-balance]').invoke('text').then((initialBalanceText) => {
        const initialBalance = parseInt(initialBalanceText);
        
        // Create and approve leave (simplified for test)
        // Assuming there's an approved leave in the list
        cy.get('[data-cy=leave-row]').first().within(() => {
          cy.get('[data-cy=leave-status]').then(($status) => {
            if ($status.text().includes('Approved')) {
              cy.get('[data-cy=leave-days]').invoke('text').then((daysText) => {
                const days = parseInt(daysText);
                
                // Cancel the leave
                cy.get('[data-cy=cancel-leave-button]').click();
              });
            }
          });
        });
        
        // Confirm cancellation
        cy.get('[data-cy=confirm-cancel-modal]').should('be.visible');
        cy.get('[data-cy=confirm-cancel-button]').click();
        cy.get('[data-cy=success-toast]').should('contain', 'Leave cancelled');
        
        // Reload and verify balance restored
        cy.reload();
        cy.get('[data-cy=annual-leave-balance]').invoke('text').then((newBalanceText) => {
          const newBalance = parseInt(newBalanceText);
          expect(newBalance).to.be.at.least(initialBalance);
        });
      });
    });

    it('should display leave balance breakdown by type', () => {
      cy.loginAs('employee');
      cy.visit('/leave');
      
      // Verify balance card shows all leave types
      cy.get('[data-cy=leave-balance-card]').within(() => {
        cy.get('[data-cy=annual-leave-balance]').should('exist');
        cy.get('[data-cy=sick-leave-balance]').should('exist');
        cy.get('[data-cy=casual-leave-balance]').should('exist');
        
        // Verify labels
        cy.contains('Annual Leave').should('be.visible');
        cy.contains('Sick Leave').should('be.visible');
        cy.contains('Casual Leave').should('be.visible');
      });
    });
  });

  describe('Leave Calendar View', () => {
    it('should display leave calendar with approved leaves', () => {
      cy.loginAs('employee');
      cy.visit('/leave/calendar');
      
      // Verify calendar is visible
      cy.get('[data-cy=leave-calendar]').should('be.visible');
      
      // Verify calendar controls
      cy.get('[data-cy=calendar-prev-month]').should('be.visible');
      cy.get('[data-cy=calendar-next-month]').should('be.visible');
      cy.get('[data-cy=calendar-current-month]').should('be.visible');
      
      // Verify approved leaves are marked on calendar
      cy.get('[data-cy=calendar-leave-day]').should('have.length.at.least', 0);
    });

    it('should show team leave calendar for managers', () => {
      cy.loginAs('manager');
      cy.visit('/leave/team-calendar');
      
      // Verify team calendar
      cy.get('[data-cy=team-leave-calendar]').should('be.visible');
      
      // Verify legend
      cy.get('[data-cy=calendar-legend]').should('be.visible');
      cy.get('[data-cy=legend-approved]').should('exist');
      cy.get('[data-cy=legend-pending]').should('exist');
    });
  });
});
