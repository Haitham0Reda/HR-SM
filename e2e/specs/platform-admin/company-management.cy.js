/**
 * E2E Tests for Platform Admin - Company Profile Management
 * Tests company profile management and configuration workflows
 */

describe('Platform Admin - Company Management', () => {
    beforeEach(() => {
        // Clean up test data before each test
        cy.cleanupTestData();

        // Login as platform admin
        cy.loginAsPlatformAdmin();

        // Navigate to company management
        cy.navigateToPlatformSection('companies');
        cy.shouldBeOnPage('companies');
    });

    afterEach(() => {
        // Clean up after each test
        cy.cleanupAfterTest();
    });

    describe('Company Profile Management', () => {
        it('should display all company profiles', () => {
            cy.get('[data-cy="companies-table"]').should('be.visible');

            // Verify table headers
            cy.get('[data-cy="table-header"]').should('contain.text', 'Company Name');
            cy.get('[data-cy="table-header"]').should('contain.text', 'Domain');
            cy.get('[data-cy="table-header"]').should('contain.text', 'Industry');
            cy.get('[data-cy="table-header"]').should('contain.text', 'Employees');
            cy.get('[data-cy="table-header"]').should('contain.text', 'Status');
            cy.get('[data-cy="table-header"]').should('contain.text', 'Created');

            // Verify test company exists
            cy.get('[data-cy="table-row"]').should('contain.text', 'Test Company Ltd');
            cy.get('[data-cy="table-row"]').should('contain.text', 'testcompany');
            cy.get('[data-cy="table-row"]').should('contain.text', 'Technology');
        });

        it('should view detailed company profile', () => {
            cy.searchInTable('Test Company Ltd');
            cy.clickTableAction(0, 'view');

            cy.get('[data-cy="company-profile-modal"]').should('be.visible');

            // Verify company information sections
            cy.get('[data-cy="basic-info"]').should('be.visible');
            cy.get('[data-cy="contact-info"]').should('be.visible');
            cy.get('[data-cy="subscription-info"]').should('be.visible');
            cy.get('[data-cy="usage-stats"]').should('be.visible');

            // Verify basic information
            cy.get('[data-cy="company-name"]').should('contain.text', 'Test Company Ltd');
            cy.get('[data-cy="company-domain"]').should('contain.text', 'testcompany');
            cy.get('[data-cy="company-industry"]').should('contain.text', 'Technology');
            cy.get('[data-cy="company-size"]').should('contain.text', '50-100');

            // Verify contact information
            cy.get('[data-cy="company-email"]').should('contain.text', 'contact@testcompany.com');
            cy.get('[data-cy="company-phone"]').should('contain.text', '+1234567890');
            cy.get('[data-cy="company-address"]').should('be.visible');

            // Verify subscription information
            cy.get('[data-cy="subscription-plan"]').should('contain.text', 'Enterprise');
            cy.get('[data-cy="subscription-status"]').should('contain.text', 'Active');
            cy.get('[data-cy="enabled-modules"]').should('be.visible');
        });

        it('should edit company profile information', () => {
            cy.searchInTable('Test Company Ltd');
            cy.clickTableAction(0, 'edit');

            cy.get('[data-cy="company-edit-modal"]').should('be.visible');

            // Update basic information
            const updatedData = {
                name: 'Updated Test Company Ltd',
                industry: 'Healthcare',
                size: '100-500',
                description: 'Updated company description for testing purposes'
            };

            cy.fillForm(updatedData);

            // Update contact information
            cy.get('[data-cy="contact-info-tab"]').click();
            cy.fillForm({
                email: 'updated@testcompany.com',
                phone: '+1555999888',
                address: '456 Updated Street, New City, NC 45678',
                website: 'https://updated.testcompany.com'
            });

            // Update business information
            cy.get('[data-cy="business-info-tab"]').click();
            cy.fillForm({
                taxId: 'TAX123456789',
                registrationNumber: 'REG987654321',
                foundedYear: '2010'
            });

            // Save changes
            cy.submitForm('[data-cy="company-edit-form"]');

            cy.expectSuccessMessage('Company profile updated successfully');

            // Verify changes
            cy.searchInTable('Updated Test Company Ltd');
            cy.get('[data-cy="table-row"]').should('contain.text', 'Updated Test Company Ltd');
            cy.get('[data-cy="table-row"]').should('contain.text', 'Healthcare');
        });

        it('should validate company profile data', () => {
            cy.searchInTable('Test Company Ltd');
            cy.clickTableAction(0, 'edit');

            // Clear required fields
            cy.get('[data-cy="name-input"]').clear();
            cy.get('[data-cy="email-input"]').clear();

            // Try to submit with invalid data
            cy.submitForm('[data-cy="company-edit-form"]');

            // Verify validation errors
            cy.get('[data-cy="name-error"]').should('contain.text', 'Company name is required');
            cy.get('[data-cy="email-error"]').should('contain.text', 'Email is required');

            // Test invalid email format
            cy.get('[data-cy="email-input"]').type('invalid-email');
            cy.submitForm('[data-cy="company-edit-form"]');

            cy.get('[data-cy="email-error"]').should('contain.text', 'Invalid email format');

            // Test invalid phone number
            cy.get('[data-cy="phone-input"]').clear().type('invalid-phone');
            cy.submitForm('[data-cy="company-edit-form"]');

            cy.get('[data-cy="phone-error"]').should('contain.text', 'Invalid phone number format');
        });

        it('should manage company logo and branding', () => {
            cy.searchInTable('Test Company Ltd');
            cy.clickTableAction(0, 'branding');

            cy.get('[data-cy="branding-modal"]').should('be.visible');

            // Upload company logo
            cy.uploadFile('test-profile-picture.jpg', '[data-cy="logo-upload"]');

            // Verify logo preview
            cy.get('[data-cy="logo-preview"]').should('be.visible');

            // Update brand colors
            cy.get('[data-cy="primary-color"]').clear().type('#007bff');
            cy.get('[data-cy="secondary-color"]').clear().type('#6c757d');
            cy.get('[data-cy="accent-color"]').clear().type('#28a745');

            // Update theme settings
            cy.get('[data-cy="theme-select"]').select('modern');
            cy.get('[data-cy="layout-select"]').select('sidebar');

            // Save branding changes
            cy.get('[data-cy="save-branding"]').click();

            cy.expectSuccessMessage('Branding updated successfully');

            // Verify branding is applied
            cy.get('[data-cy="company-logo"]').should('be.visible');
            cy.get('[data-cy="primary-color-display"]').should('have.css', 'background-color', 'rgb(0, 123, 255)');
        });
    });

    describe('Company Settings Management', () => {
        it('should configure company working hours', () => {
            cy.searchInTable('Test Company Ltd');
            cy.clickTableAction(0, 'settings');

            cy.get('[data-cy="company-settings-modal"]').should('be.visible');

            // Navigate to working hours tab
            cy.get('[data-cy="working-hours-tab"]').click();

            // Update working hours
            cy.get('[data-cy="working-hours-start"]').clear().type('08:30');
            cy.get('[data-cy="working-hours-end"]').clear().type('17:30');

            // Configure working days
            const workingDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
            workingDays.forEach(day => {
                cy.get(`[data-cy="working-day-${day}"]`).check();
            });

            // Configure break times
            cy.get('[data-cy="lunch-break-start"]').clear().type('12:00');
            cy.get('[data-cy="lunch-break-end"]').clear().type('13:00');

            // Configure overtime settings
            cy.get('[data-cy="overtime-threshold"]').clear().type('8');
            cy.get('[data-cy="overtime-rate"]').clear().type('1.5');

            cy.get('[data-cy="save-working-hours"]').click();

            cy.expectSuccessMessage('Working hours updated successfully');
        });

        it('should configure company holidays', () => {
            cy.searchInTable('Test Company Ltd');
            cy.clickTableAction(0, 'settings');

            cy.get('[data-cy="holidays-tab"]').click();

            // Add new holiday
            cy.get('[data-cy="add-holiday-button"]').click();

            cy.get('[data-cy="holiday-form"]').should('be.visible');

            // Fill holiday details
            cy.fillForm({
                name: 'Independence Day',
                description: 'National Independence Day celebration'
            });

            cy.selectDate(new Date(2024, 6, 4), '[data-cy="holiday-date"]');

            cy.get('[data-cy="holiday-type"]').select('national');
            cy.get('[data-cy="is-recurring"]').check();

            cy.get('[data-cy="save-holiday"]').click();

            cy.expectSuccessMessage('Holiday added successfully');

            // Verify holiday appears in list
            cy.get('[data-cy="holidays-list"]').should('contain.text', 'Independence Day');
            cy.get('[data-cy="holidays-list"]').should('contain.text', 'July 4, 2024');

            // Edit existing holiday
            cy.get('[data-cy="holiday-row"]').first().within(() => {
                cy.get('[data-cy="edit-holiday"]').click();
            });

            cy.get('[data-cy="holiday-description"]').clear().type('Updated holiday description');
            cy.get('[data-cy="save-holiday"]').click();

            cy.expectSuccessMessage('Holiday updated successfully');

            // Delete holiday
            cy.get('[data-cy="holiday-row"]').first().within(() => {
                cy.get('[data-cy="delete-holiday"]').click();
            });

            cy.confirmDialog();

            cy.expectSuccessMessage('Holiday deleted successfully');
        });

        it('should configure company policies', () => {
            cy.searchInTable('Test Company Ltd');
            cy.clickTableAction(0, 'settings');

            cy.get('[data-cy="policies-tab"]').click();

            // Configure leave policy
            cy.get('[data-cy="leave-policy-section"]').should('be.visible');

            cy.get('[data-cy="annual-leave-days"]').clear().type('25');
            cy.get('[data-cy="sick-leave-days"]').clear().type('10');
            cy.get('[data-cy="personal-leave-days"]').clear().type('5');

            // Configure leave approval workflow
            cy.get('[data-cy="require-manager-approval"]').check();
            cy.get('[data-cy="require-hr-approval"]').check();
            cy.get('[data-cy="advance-notice-days"]').clear().type('7');

            // Configure attendance policy
            cy.get('[data-cy="attendance-policy-section"]').should('be.visible');

            cy.get('[data-cy="late-arrival-threshold"]').clear().type('15');
            cy.get('[data-cy="early-departure-threshold"]').clear().type('15');
            cy.get('[data-cy="grace-period-minutes"]').clear().type('5');

            // Configure expense policy
            cy.get('[data-cy="expense-policy-section"]').should('be.visible');

            cy.get('[data-cy="meal-allowance"]').clear().type('50');
            cy.get('[data-cy="travel-allowance"]').clear().type('0.50');
            cy.get('[data-cy="require-receipts"]').check();

            cy.get('[data-cy="save-policies"]').click();

            cy.expectSuccessMessage('Company policies updated successfully');
        });

        it('should configure notification preferences', () => {
            cy.searchInTable('Test Company Ltd');
            cy.clickTableAction(0, 'settings');

            cy.get('[data-cy="notifications-tab"]').click();

            // Configure email notifications
            cy.get('[data-cy="email-notifications"]').should('be.visible');

            cy.get('[data-cy="notify-leave-requests"]').check();
            cy.get('[data-cy="notify-overtime-requests"]').check();
            cy.get('[data-cy="notify-attendance-issues"]').check();
            cy.get('[data-cy="notify-document-uploads"]').check();

            // Configure notification recipients
            cy.get('[data-cy="hr-notifications"]').clear().type('hr@testcompany.com');
            cy.get('[data-cy="manager-notifications"]').clear().type('managers@testcompany.com');
            cy.get('[data-cy="admin-notifications"]').clear().type('admin@testcompany.com');

            // Configure notification frequency
            cy.get('[data-cy="notification-frequency"]').select('immediate');
            cy.get('[data-cy="digest-frequency"]').select('daily');

            // Configure SMS notifications
            cy.get('[data-cy="sms-notifications"]').check();
            cy.get('[data-cy="sms-urgent-only"]').check();

            cy.get('[data-cy="save-notifications"]').click();

            cy.expectSuccessMessage('Notification preferences updated successfully');
        });
    });

    describe('Company Analytics', () => {
        it('should display company statistics', () => {
            cy.searchInTable('Test Company Ltd');
            cy.clickTableAction(0, 'analytics');

            cy.get('[data-cy="company-analytics-modal"]').should('be.visible');

            // Verify key metrics
            cy.get('[data-cy="total-employees"]').should('be.visible');
            cy.get('[data-cy="active-employees"]').should('be.visible');
            cy.get('[data-cy="departments-count"]').should('be.visible');
            cy.get('[data-cy="average-tenure"]').should('be.visible');

            // Verify charts
            cy.get('[data-cy="employee-growth-chart"]').should('be.visible');
            cy.get('[data-cy="department-distribution-chart"]').should('be.visible');
            cy.get('[data-cy="attendance-trends-chart"]').should('be.visible');
        });

        it('should show usage analytics', () => {
            cy.searchInTable('Test Company Ltd');
            cy.clickTableAction(0, 'analytics');

            cy.get('[data-cy="usage-analytics-tab"]').click();

            // Verify usage metrics
            cy.get('[data-cy="module-usage"]').should('be.visible');
            cy.get('[data-cy="feature-adoption"]').should('be.visible');
            cy.get('[data-cy="user-activity"]').should('be.visible');

            // Verify usage charts
            cy.get('[data-cy="module-usage-chart"]').should('be.visible');
            cy.get('[data-cy="daily-active-users-chart"]').should('be.visible');
            cy.get('[data-cy="feature-usage-chart"]').should('be.visible');
        });

        it('should export company data', () => {
            cy.searchInTable('Test Company Ltd');
            cy.clickTableAction(0, 'export');

            cy.get('[data-cy="export-options-modal"]').should('be.visible');

            // Select export options
            cy.get('[data-cy="export-format"]').select('xlsx');
            cy.get('[data-cy="include-employees"]').check();
            cy.get('[data-cy="include-attendance"]').check();
            cy.get('[data-cy="include-payroll"]').check();
            cy.get('[data-cy="include-documents"]').check();

            // Set date range
            cy.get('[data-cy="export-date-start"]').click();
            cy.selectDate(new Date(2024, 0, 1), '[data-cy="export-date-start"]');

            cy.get('[data-cy="export-date-end"]').click();
            cy.selectDate(new Date(), '[data-cy="export-date-end"]');

            // Export data
            cy.get('[data-cy="export-submit"]').click();

            cy.expectSuccessMessage('Company data export started');

            // Verify export status
            cy.get('[data-cy="export-status"]').should('contain.text', 'Processing');

            // Wait for export completion
            cy.get('[data-cy="export-complete"]', { timeout: 60000 }).should('be.visible');

            // Download export file
            cy.get('[data-cy="download-export"]').click();

            // Verify download
            cy.readFile('e2e/downloads/testcompany-export.xlsx').should('exist');
        });
    });

    describe('Company Status Management', () => {
        it('should suspend company account', () => {
            cy.searchInTable('Test Company Ltd');
            cy.clickTableAction(0, 'suspend');

            cy.get('[data-cy="suspend-company-modal"]').should('be.visible');

            // Show suspension warning
            cy.get('[data-cy="suspension-warning"]').should('be.visible');
            cy.get('[data-cy="suspension-warning"]').should('contain.text', 'Users will not be able to access the system');

            // Require suspension reason
            cy.get('[data-cy="suspension-reason"]').select('non-payment');
            cy.get('[data-cy="suspension-notes"]').type('Account suspended due to non-payment');

            // Set suspension duration
            cy.get('[data-cy="suspension-duration"]').select('30-days');

            // Confirm suspension
            cy.get('[data-cy="confirm-suspension"]').click();
            cy.confirmDialog();

            cy.expectSuccessMessage('Company account suspended successfully');

            // Verify status change
            cy.searchInTable('Test Company Ltd');
            cy.get('[data-cy="table-row"]').should('contain.text', 'Suspended');
        });

        it('should reactivate suspended company', () => {
            // First suspend the company
            cy.task('seedTestData', {
                type: 'company',
                data: {
                    domain: 'suspendedcompany',
                    name: 'Suspended Company',
                    status: 'suspended'
                }
            });

            cy.searchInTable('Suspended Company');
            cy.clickTableAction(0, 'reactivate');

            cy.get('[data-cy="reactivate-company-modal"]').should('be.visible');

            // Add reactivation notes
            cy.get('[data-cy="reactivation-notes"]').type('Payment received, reactivating account');

            // Confirm reactivation
            cy.get('[data-cy="confirm-reactivation"]').click();

            cy.expectSuccessMessage('Company account reactivated successfully');

            // Verify status change
            cy.searchInTable('Suspended Company');
            cy.get('[data-cy="table-row"]').should('contain.text', 'Active');
        });

        it('should delete company account', () => {
            // Create test company for deletion
            cy.task('seedTestData', {
                type: 'company',
                data: {
                    domain: 'deletecompany',
                    name: 'Delete Test Company',
                    status: 'inactive'
                }
            });

            cy.searchInTable('Delete Test Company');
            cy.clickTableAction(0, 'delete');

            cy.get('[data-cy="delete-company-modal"]').should('be.visible');

            // Show deletion warning
            cy.get('[data-cy="deletion-warning"]').should('be.visible');
            cy.get('[data-cy="deletion-warning"]').should('contain.text', 'This action cannot be undone');

            // Require confirmation text
            cy.get('[data-cy="confirmation-text"]').type('DELETE');

            // Require deletion reason
            cy.get('[data-cy="deletion-reason"]').select('company-closure');
            cy.get('[data-cy="deletion-notes"]').type('Company has permanently closed operations');

            // Confirm deletion
            cy.get('[data-cy="confirm-deletion"]').click();
            cy.confirmDialog();

            cy.expectSuccessMessage('Company account deleted successfully');

            // Verify company is removed from list
            cy.searchInTable('Delete Test Company');
            cy.shouldHaveTableRows(0);
        });
    });

    describe('Error Handling', () => {
        it('should handle company update errors', () => {
            cy.intercept('PUT', '**/api/platform/companies/**', { statusCode: 400, body: { error: 'Invalid company data' } }).as('companyError');

            cy.searchInTable('Test Company Ltd');
            cy.clickTableAction(0, 'edit');

            cy.fillForm({
                name: 'Updated Company Name'
            });

            cy.submitForm('[data-cy="company-edit-form"]');

            cy.expectErrorMessage('Invalid company data');
        });

        it('should handle export service errors', () => {
            cy.intercept('POST', '**/api/platform/companies/*/export', { statusCode: 503, body: { error: 'Export service unavailable' } }).as('exportError');

            cy.searchInTable('Test Company Ltd');
            cy.clickTableAction(0, 'export');

            cy.get('[data-cy="export-submit"]').click();

            cy.get('[data-cy="export-error"]').should('be.visible');
            cy.get('[data-cy="export-error"]').should('contain.text', 'Export service unavailable');
        });
    });

    describe('Accessibility', () => {
        it('should be accessible', () => {
            cy.checkAccessibility('[data-cy="companies-page"]');
        });

        it('should support keyboard navigation', () => {
            cy.searchInTable('Test Company Ltd');
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="action-view"]').focus().type('{enter}');
            });

            cy.get('[data-cy="company-profile-modal"]').should('be.visible');

            // Navigate through tabs with keyboard
            cy.get('[data-cy="contact-info-tab"]').focus().type('{enter}');
            cy.get('[data-cy="contact-info"]').should('be.visible');
        });
    });
});