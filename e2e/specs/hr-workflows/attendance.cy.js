/// <reference types="cypress" />

/**
 * E2E Attendance Workflow Tests
 * Requirements: 3-3
 * 
 * Test Coverage:
 * - Employee check-in/check-out flow
 * - Attendance record creation and display
 * - HR Manager attendance report viewing
 * - Department and date range filtering
 * - Manual attendance record editing
 * - Audit log verification
 */

describe('Attendance HR Workflow E2E Tests', () => {
  beforeEach(() => {
    cy.clearAllStorage();
    cy.clearAllCookies();
  });

  describe('Employee Check-In Flow', () => {
    it('should allow employee to check in and see attendance record with Present status', () => {
      // Login as employee
      cy.loginAs('employee');
      
      // Navigate to attendance page
      cy.visit('/attendance');
      cy.get('[data-cy=attendance-page]').should('be.visible');
      
      // Click Check In button
      cy.get('[data-cy=check-in-button]').should('be.visible');
      cy.get('[data-cy=check-in-button]').should('not.be.disabled');
      cy.get('[data-cy=check-in-button]').click();
      
      // Verify success message
      cy.get('[data-cy=success-toast]').should('be.visible');
      cy.get('[data-cy=success-toast]').should('contain', 'Checked in successfully');
      
      // Verify attendance row appears with Present status
      cy.get('[data-cy=attendance-list]').should('be.visible');
      cy.get('[data-cy=attendance-row]').first().within(() => {
        cy.get('[data-cy=attendance-status]').should('contain', 'Present');
        cy.get('[data-cy=check-in-time]').should('exist');
        
        // Verify today's date
        const today = new Date().toLocaleDateString();
        cy.get('[data-cy=attendance-date]').should('contain', today.split('/')[1]); // Day
      });
      
      // Check In button should be disabled after check-in
      cy.get('[data-cy=check-in-button]').should('be.disabled');
      
      // Check Out button should now be enabled
      cy.get('[data-cy=check-out-button]').should('be.visible');
      cy.get('[data-cy=check-out-button]').should('not.be.disabled');
    });

    it('should allow employee to check out after checking in', () => {
      cy.loginAs('employee');
      cy.visit('/attendance');
      
      // Check in first
      cy.get('[data-cy=check-in-button]').click();
      cy.get('[data-cy=success-toast]').should('be.visible');
      
      // Wait a moment to simulate work time
      cy.wait(1000);
      
      // Check out
      cy.get('[data-cy=check-out-button]').click();
      
      // Verify success message
      cy.get('[data-cy=success-toast]').should('contain', 'Checked out successfully');
      
      // Verify attendance row shows both check-in and check-out times
      cy.get('[data-cy=attendance-row]').first().within(() => {
        cy.get('[data-cy=check-in-time]').should('exist');
        cy.get('[data-cy=check-out-time]').should('exist');
        cy.get('[data-cy=attendance-status]').should('contain', 'Present');
      });
      
      // Both buttons should be disabled after check-out
      cy.get('[data-cy=check-in-button]').should('be.disabled');
      cy.get('[data-cy=check-out-button]').should('be.disabled');
    });

    it('should prevent duplicate check-in on the same day', () => {
      cy.loginAs('employee');
      cy.visit('/attendance');
      
      // First check-in
      cy.get('[data-cy=check-in-button]').click();
      cy.get('[data-cy=success-toast]').should('be.visible');
      
      // Reload page
      cy.reload();
      
      // Check In button should be disabled
      cy.get('[data-cy=check-in-button]').should('be.disabled');
    });

    it('should display employee attendance history', () => {
      cy.loginAs('employee');
      cy.visit('/attendance');
      
      // View attendance history
      cy.get('[data-cy=view-history-button]').click();
      
      // Verify history table is visible
      cy.get('[data-cy=attendance-history-table]').should('be.visible');
      cy.get('[data-cy=attendance-row]').should('have.length.at.least', 1);
      
      // Verify columns
      cy.get('[data-cy=attendance-history-table]').within(() => {
        cy.contains('Date').should('be.visible');
        cy.contains('Check In').should('be.visible');
        cy.contains('Check Out').should('be.visible');
        cy.contains('Status').should('be.visible');
        cy.contains('Hours Worked').should('be.visible');
      });
    });
  });

  describe('HR Manager Attendance Report', () => {
    beforeEach(() => {
      // Seed test data for attendance reports
      cy.fixture('tenants').then((tenants) => {
        cy.seedTenant(tenants['tenant-1'].id);
      });
    });

    afterEach(() => {
      // Cleanup test data
      cy.fixture('tenants').then((tenants) => {
        cy.cleanupTenant(tenants['tenant-1'].id);
      });
    });

    it('should allow HR Manager to view attendance report with all employees', () => {
      cy.loginAs('hr_manager');
      
      // Navigate to attendance reports
      cy.visit('/attendance/reports');
      cy.get('[data-cy=attendance-reports-page]').should('be.visible');
      
      // Verify report table is visible
      cy.get('[data-cy=attendance-report-table]').should('be.visible');
      cy.get('[data-cy=attendance-row]').should('have.length.at.least', 1);
      
      // Verify table columns
      cy.get('[data-cy=attendance-report-table]').within(() => {
        cy.contains('Employee').should('be.visible');
        cy.contains('Department').should('be.visible');
        cy.contains('Date').should('be.visible');
        cy.contains('Check In').should('be.visible');
        cy.contains('Check Out').should('be.visible');
        cy.contains('Status').should('be.visible');
      });
    });

    it('should filter attendance report by department and update table correctly', () => {
      cy.loginAs('hr_manager');
      cy.visit('/attendance/reports');
      
      // Get initial row count
      cy.get('[data-cy=attendance-row]').then(($rows) => {
        const initialCount = $rows.length;
        
        // Apply department filter
        cy.get('[data-cy=department-filter]').click();
        cy.get('[data-cy=department-option-engineering]').click();
        
        // Wait for table to update
        cy.get('[data-cy=table-loading]').should('not.exist');
        
        // Verify filtered results
        cy.get('[data-cy=attendance-row]').should('have.length.at.most', initialCount);
        
        // Verify all rows show Engineering department
        cy.get('[data-cy=attendance-row]').each(($row) => {
          cy.wrap($row).find('[data-cy=employee-department]').should('contain', 'Engineering');
        });
      });
    });

    it('should filter attendance report by date range and update table correctly', () => {
      cy.loginAs('hr_manager');
      cy.visit('/attendance/reports');
      
      // Set date range filter
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7); // Last 7 days
      const endDate = new Date();
      
      cy.get('[data-cy=date-range-filter]').click();
      cy.get('[data-cy=start-date-input]').type(startDate.toISOString().split('T')[0]);
      cy.get('[data-cy=end-date-input]').type(endDate.toISOString().split('T')[0]);
      cy.get('[data-cy=apply-date-filter]').click();
      
      // Wait for table to update
      cy.get('[data-cy=table-loading]').should('not.exist');
      
      // Verify filtered results
      cy.get('[data-cy=attendance-row]').should('exist');
      
      // Verify all dates are within range
      cy.get('[data-cy=attendance-row]').each(($row) => {
        cy.wrap($row).find('[data-cy=attendance-date]').invoke('text').then((dateText) => {
          const recordDate = new Date(dateText);
          expect(recordDate.getTime()).to.be.at.least(startDate.getTime());
          expect(recordDate.getTime()).to.be.at.most(endDate.getTime());
        });
      });
    });

    it('should apply both department and date range filters simultaneously', () => {
      cy.loginAs('hr_manager');
      cy.visit('/attendance/reports');
      
      // Apply department filter
      cy.get('[data-cy=department-filter]').click();
      cy.get('[data-cy=department-option-hr]').click();
      
      // Apply date range filter
      const today = new Date().toISOString().split('T')[0];
      cy.get('[data-cy=date-range-filter]').click();
      cy.get('[data-cy=start-date-input]').type(today);
      cy.get('[data-cy=end-date-input]').type(today);
      cy.get('[data-cy=apply-date-filter]').click();
      
      // Wait for table to update
      cy.get('[data-cy=table-loading]').should('not.exist');
      
      // Verify both filters are applied
      cy.get('[data-cy=attendance-row]').each(($row) => {
        cy.wrap($row).find('[data-cy=employee-department]').should('contain', 'HR');
        cy.wrap($row).find('[data-cy=attendance-date]').should('contain', new Date().getDate());
      });
    });

    it('should clear filters and show all records', () => {
      cy.loginAs('hr_manager');
      cy.visit('/attendance/reports');
      
      // Apply filters
      cy.get('[data-cy=department-filter]').click();
      cy.get('[data-cy=department-option-engineering]').click();
      
      cy.get('[data-cy=attendance-row]').then(($filteredRows) => {
        const filteredCount = $filteredRows.length;
        
        // Clear filters
        cy.get('[data-cy=clear-filters-button]').click();
        
        // Wait for table to update
        cy.get('[data-cy=table-loading]').should('not.exist');
        
        // Verify more records are shown
        cy.get('[data-cy=attendance-row]').should('have.length.at.least', filteredCount);
      });
    });

    it('should export attendance report to CSV', () => {
      cy.loginAs('hr_manager');
      cy.visit('/attendance/reports');
      
      // Click export button
      cy.get('[data-cy=export-report-button]').click();
      
      // Verify download initiated
      cy.get('[data-cy=success-toast]').should('contain', 'Report exported');
      
      // Verify file download (check downloads folder)
      const downloadsFolder = Cypress.config('downloadsFolder');
      cy.readFile(`${downloadsFolder}/attendance-report.csv`).should('exist');
    });
  });

  describe('HR Manager Manual Attendance Editing', () => {
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

    it('should allow HR Manager to manually edit attendance record and create audit log', () => {
      cy.fixture('users').then((users) => {
        const hrManager = users.hr_manager;
        
        cy.loginAs('hr_manager');
        cy.visit('/attendance/reports');
        
        // Select first attendance record to edit
        cy.get('[data-cy=attendance-row]').first().within(() => {
          cy.get('[data-cy=edit-attendance-button]').click();
        });
        
        // Edit modal should open
        cy.get('[data-cy=edit-attendance-modal]').should('be.visible');
        
        // Modify check-in time
        cy.get('[data-cy=check-in-time-input]').clear().type('09:00');
        
        // Modify check-out time
        cy.get('[data-cy=check-out-time-input]').clear().type('17:00');
        
        // Add edit reason
        cy.get('[data-cy=edit-reason-input]').type('Correcting missed punch');
        
        // Save changes
        cy.get('[data-cy=save-attendance-button]').click();
        
        // Verify success message
        cy.get('[data-cy=success-toast]').should('contain', 'Attendance updated');
        
        // Modal should close
        cy.get('[data-cy=edit-attendance-modal]').should('not.exist');
        
        // Verify updated times in the table
        cy.get('[data-cy=attendance-row]').first().within(() => {
          cy.get('[data-cy=check-in-time]').should('contain', '09:00');
          cy.get('[data-cy=check-out-time]').should('contain', '17:00');
        });
        
        // Navigate to audit log
        cy.get('[data-cy=attendance-row]').first().within(() => {
          cy.get('[data-cy=view-audit-log-button]').click();
        });
        
        // Verify audit log modal
        cy.get('[data-cy=audit-log-modal]').should('be.visible');
        
        // Verify audit log entry with manager's name
        cy.get('[data-cy=audit-log-entry]').first().within(() => {
          cy.get('[data-cy=audit-user-name]').should('contain', hrManager.name);
          cy.get('[data-cy=audit-action]').should('contain', 'Updated attendance');
          cy.get('[data-cy=audit-reason]').should('contain', 'Correcting missed punch');
          cy.get('[data-cy=audit-timestamp]').should('exist');
        });
      });
    });

    it('should show audit log with multiple entries for multiple edits', () => {
      cy.loginAs('hr_manager');
      cy.visit('/attendance/reports');
      
      // Edit attendance record twice
      cy.get('[data-cy=attendance-row]').first().within(() => {
        cy.get('[data-cy=edit-attendance-button]').click();
      });
      
      // First edit
      cy.get('[data-cy=check-in-time-input]').clear().type('08:30');
      cy.get('[data-cy=edit-reason-input]').type('First correction');
      cy.get('[data-cy=save-attendance-button]').click();
      cy.get('[data-cy=success-toast]').should('be.visible');
      
      // Second edit
      cy.get('[data-cy=attendance-row]').first().within(() => {
        cy.get('[data-cy=edit-attendance-button]').click();
      });
      cy.get('[data-cy=check-in-time-input]').clear().type('09:00');
      cy.get('[data-cy=edit-reason-input]').type('Second correction');
      cy.get('[data-cy=save-attendance-button]').click();
      cy.get('[data-cy=success-toast]').should('be.visible');
      
      // View audit log
      cy.get('[data-cy=attendance-row]').first().within(() => {
        cy.get('[data-cy=view-audit-log-button]').click();
      });
      
      // Verify multiple audit entries
      cy.get('[data-cy=audit-log-entry]').should('have.length', 2);
      cy.get('[data-cy=audit-log-entry]').first().should('contain', 'Second correction');
      cy.get('[data-cy=audit-log-entry]').last().should('contain', 'First correction');
    });

    it('should require reason when editing attendance', () => {
      cy.loginAs('hr_manager');
      cy.visit('/attendance/reports');
      
      cy.get('[data-cy=attendance-row]').first().within(() => {
        cy.get('[data-cy=edit-attendance-button]').click();
      });
      
      // Try to save without reason
      cy.get('[data-cy=check-in-time-input]').clear().type('09:00');
      cy.get('[data-cy=save-attendance-button]').click();
      
      // Verify validation error
      cy.get('[data-cy=edit-reason-error]').should('be.visible');
      cy.get('[data-cy=edit-reason-error]').should('contain', 'Reason is required');
      
      // Modal should still be open
      cy.get('[data-cy=edit-attendance-modal]').should('be.visible');
    });

    it('should prevent employee from editing their own attendance', () => {
      cy.loginAs('employee');
      cy.visit('/attendance');
      
      // Edit button should not be visible for employees
      cy.get('[data-cy=attendance-row]').first().within(() => {
        cy.get('[data-cy=edit-attendance-button]').should('not.exist');
      });
    });
  });

  describe('Attendance Statistics', () => {
    it('should display attendance statistics for HR Manager', () => {
      cy.loginAs('hr_manager');
      cy.visit('/attendance/reports');
      
      // Verify statistics cards
      cy.get('[data-cy=stats-present-today]').should('be.visible');
      cy.get('[data-cy=stats-absent-today]').should('be.visible');
      cy.get('[data-cy=stats-late-today]').should('be.visible');
      cy.get('[data-cy=stats-on-leave-today]').should('be.visible');
      
      // Verify statistics have numeric values
      cy.get('[data-cy=stats-present-today]').invoke('text').should('match', /\d+/);
    });

    it('should display employee personal attendance statistics', () => {
      cy.loginAs('employee');
      cy.visit('/attendance');
      
      // Verify personal stats
      cy.get('[data-cy=my-attendance-stats]').should('be.visible');
      cy.get('[data-cy=stat-days-present]').should('exist');
      cy.get('[data-cy=stat-days-absent]').should('exist');
      cy.get('[data-cy=stat-total-hours]').should('exist');
      cy.get('[data-cy=stat-average-hours]').should('exist');
    });
  });

  describe('Attendance Status Types', () => {
    it('should mark employee as Late when checking in after work start time', () => {
      cy.loginAs('employee');
      cy.visit('/attendance');
      
      // Mock late check-in (after 9:00 AM)
      cy.clock(new Date(2026, 4, 3, 9, 30, 0)); // 9:30 AM
      
      cy.get('[data-cy=check-in-button]').click();
      cy.get('[data-cy=success-toast]').should('be.visible');
      
      // Verify Late status
      cy.get('[data-cy=attendance-row]').first().within(() => {
        cy.get('[data-cy=attendance-status]').should('contain', 'Late');
      });
    });

    it('should mark employee as Absent when no check-in by end of day', () => {
      cy.loginAs('hr_manager');
      cy.visit('/attendance/reports');
      
      // Filter for yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      cy.get('[data-cy=date-range-filter]').click();
      cy.get('[data-cy=start-date-input]').type(yesterdayStr);
      cy.get('[data-cy=end-date-input]').type(yesterdayStr);
      cy.get('[data-cy=apply-date-filter]').click();
      
      // Verify some records show Absent status
      cy.get('[data-cy=attendance-row]').then(($rows) => {
        const hasAbsent = Array.from($rows).some(row => 
          row.querySelector('[data-cy=attendance-status]')?.textContent.includes('Absent')
        );
        expect(hasAbsent).to.be.true;
      });
    });
  });
});
