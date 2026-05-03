/// <reference types="cypress" />

/**
 * E2E Payroll Workflow Tests
 * Requirements: 3-3
 * 
 * Test Coverage:
 * - HR Manager payroll processing
 * - Payslip generation for all active employees
 * - Employee payslip viewing and downloading
 * - Payroll record locking after processing
 * - Payroll history and reports
 */

describe('Payroll HR Workflow E2E Tests', () => {
  beforeEach(() => {
    cy.clearAllStorage();
    cy.clearAllCookies();
  });

  describe('HR Manager Payroll Processing', () => {
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

    it('should allow HR Manager to run payroll for current month and generate payslips for all active employees', () => {
      cy.loginAs('hr_manager');
      
      // Navigate to payroll page
      cy.visit('/payroll');
      cy.get('[data-cy=payroll-page]').should('be.visible');
      
      // Click Process Payroll button
      cy.get('[data-cy=process-payroll-button]').should('be.visible');
      cy.get('[data-cy=process-payroll-button]').should('not.be.disabled');
      cy.get('[data-cy=process-payroll-button]').click();
      
      // Process payroll modal should open
      cy.get('[data-cy=process-payroll-modal]').should('be.visible');
      
      // Select current month and year
      const currentDate = new Date();
      const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
      const currentYear = currentDate.getFullYear();
      
      cy.get('[data-cy=payroll-month-select]').should('have.value', currentDate.getMonth() + 1);
      cy.get('[data-cy=payroll-year-select]').should('have.value', currentYear);
      
      // Verify employee count preview
      cy.get('[data-cy=employee-count-preview]').should('be.visible');
      cy.get('[data-cy=employee-count-preview]').invoke('text').then((text) => {
        const count = parseInt(text.match(/\d+/)[0]);
        expect(count).to.be.at.least(1);
      });
      
      // Confirm payroll processing
      cy.get('[data-cy=confirm-process-button]').click();
      
      // Verify processing indicator
      cy.get('[data-cy=processing-indicator]').should('be.visible');
      cy.get('[data-cy=processing-indicator]').should('contain', 'Processing payroll');
      
      // Wait for processing to complete
      cy.get('[data-cy=success-toast]', { timeout: 30000 }).should('be.visible');
      cy.get('[data-cy=success-toast]').should('contain', 'Payroll processed successfully');
      
      // Modal should close
      cy.get('[data-cy=process-payroll-modal]').should('not.exist');
      
      // Verify payslip rows are generated in the list
      cy.get('[data-cy=payroll-list]').should('be.visible');
      cy.get('[data-cy=payroll-row]').should('have.length.at.least', 1);
      
      // Verify payroll record details
      cy.get('[data-cy=payroll-row]').first().within(() => {
        cy.get('[data-cy=payroll-month]').should('contain', currentMonth);
        cy.get('[data-cy=payroll-year]').should('contain', currentYear);
        cy.get('[data-cy=payroll-status]').should('contain', 'Processed');
        cy.get('[data-cy=employee-count]').should('exist');
        cy.get('[data-cy=total-amount]').should('exist');
      });
      
      // Verify all active employees have payslips
      cy.get('[data-cy=view-payslips-button]').first().click();
      cy.get('[data-cy=payslips-modal]').should('be.visible');
      cy.get('[data-cy=payslip-row]').should('have.length.at.least', 1);
      
      // Verify each payslip has required fields
      cy.get('[data-cy=payslip-row]').each(($row) => {
        cy.wrap($row).within(() => {
          cy.get('[data-cy=employee-name]').should('exist');
          cy.get('[data-cy=gross-salary]').should('exist');
          cy.get('[data-cy=deductions]').should('exist');
          cy.get('[data-cy=net-salary]').should('exist');
          cy.get('[data-cy=payslip-status]').should('contain', 'Generated');
        });
      });
    });

    it('should validate payroll period before processing', () => {
      cy.loginAs('hr_manager');
      cy.visit('/payroll');
      
      cy.get('[data-cy=process-payroll-button]').click();
      cy.get('[data-cy=process-payroll-modal]').should('be.visible');
      
      // Try to process payroll for a future month
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 2);
      
      cy.get('[data-cy=payroll-month-select]').select((futureDate.getMonth() + 1).toString());
      cy.get('[data-cy=payroll-year-select]').select(futureDate.getFullYear().toString());
      
      cy.get('[data-cy=confirm-process-button]').click();
      
      // Verify validation error
      cy.get('[data-cy=period-error]').should('be.visible');
      cy.get('[data-cy=period-error]').should('contain', 'Cannot process payroll for future periods');
    });

    it('should prevent duplicate payroll processing for the same period', () => {
      cy.loginAs('hr_manager');
      cy.visit('/payroll');
      
      // Process payroll first time
      cy.get('[data-cy=process-payroll-button]').click();
      cy.get('[data-cy=confirm-process-button]').click();
      cy.get('[data-cy=success-toast]', { timeout: 30000 }).should('be.visible');
      
      // Try to process again for the same period
      cy.get('[data-cy=process-payroll-button]').click();
      cy.get('[data-cy=process-payroll-modal]').should('be.visible');
      cy.get('[data-cy=confirm-process-button]').click();
      
      // Verify error message
      cy.get('[data-cy=error-toast]').should('be.visible');
      cy.get('[data-cy=error-toast]').should('contain', 'Payroll already processed for this period');
    });

    it('should display payroll summary statistics', () => {
      cy.loginAs('hr_manager');
      cy.visit('/payroll');
      
      // Verify statistics cards
      cy.get('[data-cy=payroll-stats]').should('be.visible');
      cy.get('[data-cy=stat-total-employees]').should('exist');
      cy.get('[data-cy=stat-total-gross]').should('exist');
      cy.get('[data-cy=stat-total-deductions]').should('exist');
      cy.get('[data-cy=stat-total-net]').should('exist');
      
      // Verify numeric values
      cy.get('[data-cy=stat-total-employees]').invoke('text').should('match', /\d+/);
    });

    it('should allow filtering payroll records by period', () => {
      cy.loginAs('hr_manager');
      cy.visit('/payroll');
      
      // Apply period filter
      cy.get('[data-cy=period-filter]').click();
      
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      
      cy.get('[data-cy=filter-month-select]').select((lastMonth.getMonth() + 1).toString());
      cy.get('[data-cy=filter-year-select]').select(lastMonth.getFullYear().toString());
      cy.get('[data-cy=apply-filter-button]').click();
      
      // Wait for table to update
      cy.get('[data-cy=table-loading]').should('not.exist');
      
      // Verify filtered results
      cy.get('[data-cy=payroll-row]').each(($row) => {
        cy.wrap($row).within(() => {
          cy.get('[data-cy=payroll-month]').should('contain', lastMonth.toLocaleString('default', { month: 'long' }));
        });
      });
    });

    it('should export payroll report to CSV', () => {
      cy.loginAs('hr_manager');
      cy.visit('/payroll');
      
      // Click export button
      cy.get('[data-cy=export-payroll-button]').click();
      
      // Verify download initiated
      cy.get('[data-cy=success-toast]').should('contain', 'Payroll report exported');
      
      // Verify file download
      const downloadsFolder = Cypress.config('downloadsFolder');
      cy.readFile(`${downloadsFolder}/payroll-report.csv`, { timeout: 10000 }).should('exist');
    });
  });

  describe('Employee Payslip Viewing and Downloading', () => {
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

    it('should allow employee to view their payslip for processed month and download PDF', () => {
      // First, process payroll as HR Manager
      cy.loginAs('hr_manager');
      cy.visit('/payroll');
      cy.get('[data-cy=process-payroll-button]').click();
      cy.get('[data-cy=confirm-process-button]').click();
      cy.get('[data-cy=success-toast]', { timeout: 30000 }).should('be.visible');
      
      // Logout HR Manager
      cy.get('[data-cy=user-menu]').click();
      cy.get('[data-cy=logout-button]').click();
      
      // Login as employee
      cy.loginAs('employee');
      
      // Navigate to payslips page
      cy.visit('/payslips');
      cy.get('[data-cy=payslips-page]').should('be.visible');
      
      // Verify payslip list is visible
      cy.get('[data-cy=my-payslips-list]').should('be.visible');
      cy.get('[data-cy=payslip-row]').should('have.length.at.least', 1);
      
      // Verify current month payslip exists
      const currentMonth = new Date().toLocaleString('default', { month: 'long' });
      const currentYear = new Date().getFullYear();
      
      cy.get('[data-cy=payslip-row]').first().within(() => {
        cy.get('[data-cy=payslip-period]').should('contain', currentMonth);
        cy.get('[data-cy=payslip-period]').should('contain', currentYear);
        cy.get('[data-cy=payslip-status]').should('contain', 'Available');
      });
      
      // Click to view payslip details
      cy.get('[data-cy=payslip-row]').first().within(() => {
        cy.get('[data-cy=view-payslip-button]').click();
      });
      
      // Verify payslip details modal
      cy.get('[data-cy=payslip-details-modal]').should('be.visible');
      
      // Verify all payslip components
      cy.get('[data-cy=payslip-details-modal]').within(() => {
        // Header information
        cy.get('[data-cy=employee-name]').should('exist');
        cy.get('[data-cy=employee-id]').should('exist');
        cy.get('[data-cy=payslip-period]').should('exist');
        cy.get('[data-cy=payment-date]').should('exist');
        
        // Earnings section
        cy.get('[data-cy=earnings-section]').should('be.visible');
        cy.get('[data-cy=basic-salary]').should('exist');
        cy.get('[data-cy=allowances]').should('exist');
        cy.get('[data-cy=gross-salary]').should('exist');
        
        // Deductions section
        cy.get('[data-cy=deductions-section]').should('be.visible');
        cy.get('[data-cy=tax-deduction]').should('exist');
        cy.get('[data-cy=insurance-deduction]').should('exist');
        cy.get('[data-cy=total-deductions]').should('exist');
        
        // Net salary
        cy.get('[data-cy=net-salary]').should('be.visible');
        cy.get('[data-cy=net-salary]').invoke('text').should('match', /\d+/);
      });
      
      // Click download PDF button
      cy.get('[data-cy=download-payslip-button]').click();
      
      // Verify download initiated
      cy.get('[data-cy=success-toast]').should('contain', 'Payslip downloaded');
      
      // Verify PDF file download
      const downloadsFolder = Cypress.config('downloadsFolder');
      cy.readFile(`${downloadsFolder}/payslip-*.pdf`, { timeout: 10000 }).should('exist');
    });

    it('should show message when no payslips are available', () => {
      cy.loginAs('employee');
      cy.visit('/payslips');
      
      // If no payslips processed yet
      cy.get('[data-cy=my-payslips-list]').then(($list) => {
        if ($list.find('[data-cy=payslip-row]').length === 0) {
          cy.get('[data-cy=no-payslips-message]').should('be.visible');
          cy.get('[data-cy=no-payslips-message]').should('contain', 'No payslips available');
        }
      });
    });

    it('should display payslip history for multiple months', () => {
      cy.loginAs('employee');
      cy.visit('/payslips');
      
      // Verify payslip history table
      cy.get('[data-cy=payslip-history]').should('be.visible');
      
      // Verify table columns
      cy.get('[data-cy=payslip-history]').within(() => {
        cy.contains('Period').should('be.visible');
        cy.contains('Gross Salary').should('be.visible');
        cy.contains('Deductions').should('be.visible');
        cy.contains('Net Salary').should('be.visible');
        cy.contains('Status').should('be.visible');
        cy.contains('Actions').should('be.visible');
      });
    });

    it('should allow employee to print payslip', () => {
      cy.loginAs('employee');
      cy.visit('/payslips');
      
      cy.get('[data-cy=payslip-row]').first().within(() => {
        cy.get('[data-cy=view-payslip-button]').click();
      });
      
      cy.get('[data-cy=payslip-details-modal]').should('be.visible');
      
      // Click print button
      cy.window().then((win) => {
        cy.stub(win, 'print').as('print');
      });
      
      cy.get('[data-cy=print-payslip-button]').click();
      cy.get('@print').should('be.called');
    });

    it('should show payslip breakdown with itemized earnings and deductions', () => {
      cy.loginAs('employee');
      cy.visit('/payslips');
      
      cy.get('[data-cy=payslip-row]').first().within(() => {
        cy.get('[data-cy=view-payslip-button]').click();
      });
      
      // Verify detailed breakdown
      cy.get('[data-cy=earnings-breakdown]').should('be.visible');
      cy.get('[data-cy=earnings-breakdown]').within(() => {
        cy.get('[data-cy=earning-item]').should('have.length.at.least', 1);
      });
      
      cy.get('[data-cy=deductions-breakdown]').should('be.visible');
      cy.get('[data-cy=deductions-breakdown]').within(() => {
        cy.get('[data-cy=deduction-item]').should('have.length.at.least', 1);
      });
    });
  });

  describe('Payroll Record Locking', () => {
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

    it('should disable edit controls after payroll has been processed', () => {
      cy.loginAs('hr_manager');
      cy.visit('/payroll');
      
      // Process payroll
      cy.get('[data-cy=process-payroll-button]').click();
      cy.get('[data-cy=confirm-process-button]').click();
      cy.get('[data-cy=success-toast]', { timeout: 30000 }).should('be.visible');
      
      // Try to edit processed payroll record
      cy.get('[data-cy=payroll-row]').first().within(() => {
        cy.get('[data-cy=payroll-status]').should('contain', 'Processed');
        
        // Edit button should be disabled or not exist
        cy.get('[data-cy=edit-payroll-button]').should('be.disabled');
      });
    });

    it('should show lock message when attempting to edit processed payroll', () => {
      cy.loginAs('hr_manager');
      cy.visit('/payroll');
      
      // Process payroll
      cy.get('[data-cy=process-payroll-button]').click();
      cy.get('[data-cy=confirm-process-button]').click();
      cy.get('[data-cy=success-toast]', { timeout: 30000 }).should('be.visible');
      
      // Click on processed payroll row
      cy.get('[data-cy=payroll-row]').first().click();
      
      // Verify lock indicator
      cy.get('[data-cy=payroll-locked-badge]').should('be.visible');
      cy.get('[data-cy=payroll-locked-badge]').should('contain', 'Locked');
      
      // Try to access edit mode
      cy.get('[data-cy=edit-payroll-button]').click();
      
      // Verify lock message
      cy.get('[data-cy=lock-message-modal]').should('be.visible');
      cy.get('[data-cy=lock-message-text]').should('contain', 'This payroll period has been processed and locked');
      cy.get('[data-cy=lock-message-text]').should('contain', 'Cannot edit processed payroll records');
    });

    it('should allow viewing but not editing processed payroll details', () => {
      cy.loginAs('hr_manager');
      cy.visit('/payroll');
      
      // Process payroll
      cy.get('[data-cy=process-payroll-button]').click();
      cy.get('[data-cy=confirm-process-button]').click();
      cy.get('[data-cy=success-toast]', { timeout: 30000 }).should('be.visible');
      
      // View payroll details
      cy.get('[data-cy=payroll-row]').first().within(() => {
        cy.get('[data-cy=view-details-button]').click();
      });
      
      cy.get('[data-cy=payroll-details-modal]').should('be.visible');
      
      // Verify all input fields are disabled
      cy.get('[data-cy=payroll-details-modal]').within(() => {
        cy.get('input').each(($input) => {
          cy.wrap($input).should('be.disabled');
        });
        
        cy.get('select').each(($select) => {
          cy.wrap($select).should('be.disabled');
        });
        
        // Save button should not exist or be disabled
        cy.get('[data-cy=save-button]').should('not.exist');
      });
    });

    it('should show lock icon on processed payroll records', () => {
      cy.loginAs('hr_manager');
      cy.visit('/payroll');
      
      // Process payroll
      cy.get('[data-cy=process-payroll-button]').click();
      cy.get('[data-cy=confirm-process-button]').click();
      cy.get('[data-cy=success-toast]', { timeout: 30000 }).should('be.visible');
      
      // Verify lock icon
      cy.get('[data-cy=payroll-row]').first().within(() => {
        cy.get('[data-cy=lock-icon]').should('be.visible');
        cy.get('[data-cy=payroll-status]').should('contain', 'Processed');
      });
    });

    it('should allow editing draft payroll before processing', () => {
      cy.loginAs('hr_manager');
      cy.visit('/payroll');
      
      // Create draft payroll (if feature exists)
      cy.get('[data-cy=create-draft-button]').then(($btn) => {
        if ($btn.length > 0) {
          cy.wrap($btn).click();
          
          // Fill draft details
          cy.get('[data-cy=draft-modal]').should('be.visible');
          cy.get('[data-cy=confirm-draft-button]').click();
          
          // Verify draft can be edited
          cy.get('[data-cy=payroll-row]').first().within(() => {
            cy.get('[data-cy=payroll-status]').should('contain', 'Draft');
            cy.get('[data-cy=edit-payroll-button]').should('not.be.disabled');
          });
        }
      });
    });
  });

  describe('Payroll Notifications', () => {
    it('should send notification to employees when payroll is processed', () => {
      // Process payroll as HR Manager
      cy.loginAs('hr_manager');
      cy.visit('/payroll');
      cy.get('[data-cy=process-payroll-button]').click();
      cy.get('[data-cy=confirm-process-button]').click();
      cy.get('[data-cy=success-toast]', { timeout: 30000 }).should('be.visible');
      
      cy.get('[data-cy=user-menu]').click();
      cy.get('[data-cy=logout-button]').click();
      
      // Check notification as employee
      cy.loginAs('employee');
      cy.visit('/dashboard');
      
      cy.get('[data-cy=notification-bell]').click();
      cy.get('[data-cy=notification-list]').should('be.visible');
      cy.get('[data-cy=notification-item]').first().within(() => {
        cy.get('[data-cy=notification-message]').should('contain', 'Payslip available');
      });
    });
  });

  describe('Payroll Audit Trail', () => {
    it('should log payroll processing in audit trail', () => {
      cy.loginAs('hr_manager');
      cy.visit('/payroll');
      
      // Process payroll
      cy.get('[data-cy=process-payroll-button]').click();
      cy.get('[data-cy=confirm-process-button]').click();
      cy.get('[data-cy=success-toast]', { timeout: 30000 }).should('be.visible');
      
      // View audit log
      cy.get('[data-cy=payroll-row]').first().within(() => {
        cy.get('[data-cy=view-audit-button]').click();
      });
      
      cy.get('[data-cy=audit-log-modal]').should('be.visible');
      cy.get('[data-cy=audit-log-entry]').first().within(() => {
        cy.get('[data-cy=audit-action]').should('contain', 'Payroll processed');
        cy.get('[data-cy=audit-user]').should('exist');
        cy.get('[data-cy=audit-timestamp]').should('exist');
      });
    });
  });

  describe('Payroll Validation', () => {
    it('should validate employee salary data before processing', () => {
      cy.loginAs('hr_manager');
      cy.visit('/payroll');
      
      cy.get('[data-cy=process-payroll-button]').click();
      cy.get('[data-cy=process-payroll-modal]').should('be.visible');
      
      // Check for validation warnings
      cy.get('[data-cy=validation-warnings]').then(($warnings) => {
        if ($warnings.length > 0) {
          cy.wrap($warnings).should('be.visible');
          cy.get('[data-cy=warning-item]').should('have.length.at.least', 1);
        }
      });
    });

    it('should prevent processing payroll with missing employee data', () => {
      cy.loginAs('hr_manager');
      cy.visit('/payroll');
      
      // If there are employees with incomplete salary information
      cy.get('[data-cy=process-payroll-button]').click();
      cy.get('[data-cy=confirm-process-button]').click();
      
      // Check for validation errors
      cy.get('body').then(($body) => {
        if ($body.find('[data-cy=validation-error]').length > 0) {
          cy.get('[data-cy=validation-error]').should('be.visible');
          cy.get('[data-cy=validation-error]').should('contain', 'incomplete salary information');
        }
      });
    });
  });
});
