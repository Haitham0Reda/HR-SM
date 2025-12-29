/**
 * E2E Tests for Platform Admin - License Management
 * Tests license generation, validation, and management workflows
 */

describe('Platform Admin - License Management', () => {
    beforeEach(() => {
        // Clean up test data before each test
        cy.cleanupTestData();

        // Login as platform admin
        cy.loginAsPlatformAdmin();

        // Navigate to license management
        cy.navigateToPlatformSection('licenses');
        cy.shouldBeOnPage('licenses');
    });

    afterEach(() => {
        // Clean up after each test
        cy.cleanupAfterTest();
    });

    describe('License Generation', () => {
        it('should generate new license for tenant', () => {
            cy.get('[data-cy="generate-license-button"]').click();
            cy.get('[data-cy="license-generation-modal"]').should('be.visible');

            // Fill license details
            const licenseData = {
                tenant: 'testcompany',
                plan: 'enterprise',
                maxUsers: '100',
                maxStorage: '10',
                apiCallsPerMonth: '50000',
                validityPeriod: '12'
            };

            cy.fillForm(licenseData);

            // Select features
            const features = ['hr-core', 'attendance', 'payroll', 'vacation', 'tasks', 'documents'];
            features.forEach(feature => {
                cy.get(`[data-cy="feature-${feature}"]`).check();
            });

            // Set expiry date
            const expiryDate = new Date();
            expiryDate.setFullYear(expiryDate.getFullYear() + 1);
            cy.selectDate(expiryDate, '[data-cy="expiry-date-input"]');

            // Generate license
            cy.submitForm('[data-cy="license-generation-form"]');

            cy.expectSuccessMessage('License generated successfully');

            // Verify license appears in list
            cy.searchInTable('testcompany');
            cy.get('[data-cy="table-row"]').should('contain.text', 'Enterprise');
            cy.get('[data-cy="table-row"]').should('contain.text', 'Active');
            cy.get('[data-cy="table-row"]').should('contain.text', '100 users');
        });

        it('should generate license with custom features', () => {
            cy.get('[data-cy="generate-license-button"]').click();

            // Use custom configuration
            cy.get('[data-cy="custom-config-toggle"]').click();

            const customLicenseData = {
                tenant: 'customcompany',
                maxUsers: '25',
                maxStorage: '5',
                apiCallsPerMonth: '10000'
            };

            cy.fillForm(customLicenseData);

            // Select specific features only
            cy.get('[data-cy="feature-hr-core"]').check();
            cy.get('[data-cy="feature-attendance"]').check();
            cy.get('[data-cy="feature-vacation"]').check();

            // Set custom limits
            cy.get('[data-cy="custom-limits-section"]').should('be.visible');
            cy.get('[data-cy="attendance-records-limit"]').clear().type('1000');
            cy.get('[data-cy="vacation-days-limit"]').clear().type('30');

            cy.submitForm('[data-cy="license-generation-form"]');

            cy.expectSuccessMessage('Custom license generated successfully');

            // Verify custom license
            cy.searchInTable('customcompany');
            cy.get('[data-cy="table-row"]').should('contain.text', 'Custom');
            cy.get('[data-cy="table-row"]').should('contain.text', '25 users');
        });

        it('should validate license generation inputs', () => {
            cy.get('[data-cy="generate-license-button"]').click();

            // Try to submit without required fields
            cy.submitForm('[data-cy="license-generation-form"]');

            // Verify validation errors
            cy.get('[data-cy="tenant-error"]').should('contain.text', 'Tenant is required');
            cy.get('[data-cy="maxUsers-error"]').should('contain.text', 'Max users is required');
            cy.get('[data-cy="expiry-date-error"]').should('contain.text', 'Expiry date is required');

            // Test invalid values
            cy.fillForm({
                tenant: 'testcompany',
                maxUsers: '-5',
                maxStorage: '0',
                apiCallsPerMonth: 'invalid'
            });

            cy.submitForm('[data-cy="license-generation-form"]');

            cy.get('[data-cy="maxUsers-error"]').should('contain.text', 'Max users must be positive');
            cy.get('[data-cy="maxStorage-error"]').should('contain.text', 'Max storage must be greater than 0');
            cy.get('[data-cy="apiCallsPerMonth-error"]').should('contain.text', 'Must be a valid number');
        });
    });

    describe('License Validation', () => {
        it('should validate active license', () => {
            // Find active license
            cy.searchInTable('testcompany');
            cy.clickTableAction(0, 'validate');

            cy.get('[data-cy="license-validation-modal"]').should('be.visible');

            // Show validation in progress
            cy.get('[data-cy="validation-status"]').should('contain.text', 'Validating license...');

            // Show validation results
            cy.get('[data-cy="validation-result"]').should('be.visible');
            cy.get('[data-cy="validation-result"]').should('contain.text', 'License is valid');

            // Show license details
            cy.get('[data-cy="license-details"]').should('be.visible');
            cy.get('[data-cy="license-status"]').should('contain.text', 'Active');
            cy.get('[data-cy="license-expiry"]').should('be.visible');
            cy.get('[data-cy="license-features"]').should('be.visible');
            cy.get('[data-cy="license-limits"]').should('be.visible');

            // Show usage statistics
            cy.get('[data-cy="usage-stats"]').should('be.visible');
            cy.get('[data-cy="current-users"]').should('be.visible');
            cy.get('[data-cy="storage-used"]').should('be.visible');
            cy.get('[data-cy="api-calls-used"]').should('be.visible');
        });

        it('should detect expired license', () => {
            // Create expired license for testing
            cy.task('seedTestData', {
                type: 'license',
                data: {
                    tenantId: 'expiredcompany',
                    status: 'expired',
                    expiresAt: new Date('2023-01-01')
                }
            });

            cy.searchInTable('expiredcompany');
            cy.clickTableAction(0, 'validate');

            cy.get('[data-cy="validation-result"]').should('contain.text', 'License has expired');
            cy.get('[data-cy="license-status"]').should('contain.text', 'Expired');

            // Show renewal option
            cy.get('[data-cy="renew-license-button"]').should('be.visible');
        });

        it('should detect license limit violations', () => {
            // Create license with exceeded limits
            cy.task('seedTestData', {
                type: 'license',
                data: {
                    tenantId: 'overlimitcompany',
                    maxUsers: 10,
                    currentUsers: 15,
                    status: 'active'
                }
            });

            cy.searchInTable('overlimitcompany');
            cy.clickTableAction(0, 'validate');

            cy.get('[data-cy="validation-warnings"]').should('be.visible');
            cy.get('[data-cy="user-limit-warning"]').should('contain.text', 'User limit exceeded (15/10)');

            // Show upgrade suggestion
            cy.get('[data-cy="upgrade-suggestion"]').should('be.visible');
            cy.get('[data-cy="upgrade-suggestion"]').should('contain.text', 'Consider upgrading to Professional plan');
        });

        it('should validate machine binding', () => {
            cy.searchInTable('testcompany');
            cy.clickTableAction(0, 'validate');

            // Show machine binding information
            cy.get('[data-cy="machine-binding"]').should('be.visible');
            cy.get('[data-cy="bound-machine-id"]').should('be.visible');
            cy.get('[data-cy="activation-date"]').should('be.visible');

            // Test machine binding validation
            cy.get('[data-cy="validate-machine-binding"]').click();

            cy.get('[data-cy="machine-validation-result"]').should('be.visible');
            cy.get('[data-cy="machine-validation-result"]').should('contain.text', 'Machine binding is valid');
        });
    });

    describe('License Renewal', () => {
        it('should renew expiring license', () => {
            // Find license expiring soon
            cy.searchInTable('testcompany');
            cy.clickTableAction(0, 'renew');

            cy.get('[data-cy="license-renewal-modal"]').should('be.visible');

            // Show current license details
            cy.get('[data-cy="current-license-info"]').should('be.visible');
            cy.get('[data-cy="current-expiry"]').should('be.visible');

            // Set new expiry date
            const newExpiryDate = new Date();
            newExpiryDate.setFullYear(newExpiryDate.getFullYear() + 1);
            cy.selectDate(newExpiryDate, '[data-cy="new-expiry-date"]');

            // Option to update features/limits
            cy.get('[data-cy="update-features-toggle"]').click();
            cy.get('[data-cy="feature-missions"]').check();

            // Update limits
            cy.get('[data-cy="maxUsers"]').clear().type('150');

            // Renew license
            cy.get('[data-cy="renew-license-submit"]').click();

            cy.expectSuccessMessage('License renewed successfully');

            // Verify updated license
            cy.searchInTable('testcompany');
            cy.get('[data-cy="table-row"]').should('contain.text', '150 users');
            cy.clickTableAction(0, 'view');
            cy.get('[data-cy="license-features"]').should('contain.text', 'Mission Management');
        });

        it('should handle bulk license renewal', () => {
            // Select multiple licenses expiring soon
            cy.selectTableRow(0);
            cy.selectTableRow(1);

            cy.get('[data-cy="bulk-actions"]').select('renew');
            cy.get('[data-cy="apply-bulk-action"]').click();

            cy.get('[data-cy="bulk-renewal-modal"]').should('be.visible');

            // Set renewal period for all
            cy.get('[data-cy="renewal-period"]').select('12-months');

            // Apply bulk renewal
            cy.get('[data-cy="apply-bulk-renewal"]').click();
            cy.confirmDialog();

            cy.expectSuccessMessage('Bulk license renewal completed successfully');

            // Verify all selected licenses are renewed
            cy.get('[data-cy="table-row"]').each(($row, index) => {
                if (index < 2) {
                    cy.wrap($row).should('contain.text', 'Active');
                }
            });
        });
    });

    describe('License Revocation', () => {
        it('should revoke license', () => {
            cy.searchInTable('testcompany');
            cy.clickTableAction(0, 'revoke');

            cy.get('[data-cy="license-revocation-modal"]').should('be.visible');

            // Show revocation warning
            cy.get('[data-cy="revocation-warning"]').should('be.visible');
            cy.get('[data-cy="revocation-warning"]').should('contain.text', 'This action cannot be undone');

            // Require reason for revocation
            cy.get('[data-cy="revocation-reason"]').select('policy-violation');
            cy.get('[data-cy="revocation-notes"]').type('License terms violated');

            // Confirm revocation
            cy.get('[data-cy="confirm-revocation"]').click();
            cy.confirmDialog();

            cy.expectSuccessMessage('License revoked successfully');

            // Verify license status
            cy.searchInTable('testcompany');
            cy.get('[data-cy="table-row"]').should('contain.text', 'Revoked');
        });

        it('should handle revocation with grace period', () => {
            cy.searchInTable('testcompany');
            cy.clickTableAction(0, 'revoke');

            // Set grace period
            cy.get('[data-cy="grace-period-toggle"]').click();
            cy.get('[data-cy="grace-period-days"]').clear().type('7');

            cy.get('[data-cy="revocation-reason"]').select('non-payment');
            cy.get('[data-cy="confirm-revocation"]').click();

            cy.expectSuccessMessage('License scheduled for revocation in 7 days');

            // Verify grace period status
            cy.searchInTable('testcompany');
            cy.get('[data-cy="table-row"]').should('contain.text', 'Grace Period');
        });
    });

    describe('License Analytics', () => {
        it('should display license statistics', () => {
            cy.get('[data-cy="license-analytics"]').should('be.visible');

            // Verify key metrics
            cy.get('[data-cy="total-licenses"]').should('be.visible');
            cy.get('[data-cy="active-licenses"]').should('be.visible');
            cy.get('[data-cy="expired-licenses"]').should('be.visible');
            cy.get('[data-cy="revoked-licenses"]').should('be.visible');

            // Verify charts
            cy.get('[data-cy="license-status-chart"]').should('be.visible');
            cy.get('[data-cy="expiry-timeline-chart"]').should('be.visible');
            cy.get('[data-cy="usage-trends-chart"]').should('be.visible');
        });

        it('should show license usage analytics', () => {
            cy.get('[data-cy="usage-analytics-tab"]').click();

            // Verify usage metrics
            cy.get('[data-cy="average-users-per-license"]').should('be.visible');
            cy.get('[data-cy="storage-utilization"]').should('be.visible');
            cy.get('[data-cy="api-usage-trends"]').should('be.visible');

            // Verify usage distribution
            cy.get('[data-cy="usage-distribution-chart"]').should('be.visible');
        });

        it('should export license data', () => {
            cy.get('[data-cy="export-license-data"]').click();
            cy.get('[data-cy="export-options-modal"]').should('be.visible');

            // Select export options
            cy.get('[data-cy="export-format"]').select('xlsx');
            cy.get('[data-cy="include-usage-data"]').check();
            cy.get('[data-cy="include-audit-trail"]').check();

            // Set date range
            cy.get('[data-cy="export-date-start"]').click();
            cy.selectDate(new Date(2024, 0, 1), '[data-cy="export-date-start"]');

            cy.get('[data-cy="export-date-end"]').click();
            cy.selectDate(new Date(), '[data-cy="export-date-end"]');

            // Export data
            cy.get('[data-cy="export-submit"]').click();

            cy.expectSuccessMessage('License data exported successfully');

            // Verify download
            cy.readFile('e2e/downloads/license-export.xlsx').should('exist');
        });
    });

    describe('Error Handling', () => {
        it('should handle license generation errors', () => {
            cy.intercept('POST', '**/api/platform/licenses', { statusCode: 400, body: { error: 'Invalid license configuration' } }).as('licenseError');

            cy.get('[data-cy="generate-license-button"]').click();
            cy.fillForm({
                tenant: 'testcompany',
                maxUsers: '100'
            });
            cy.submitForm('[data-cy="license-generation-form"]');

            cy.expectErrorMessage('Invalid license configuration');
        });

        it('should handle license server connection errors', () => {
            cy.intercept('GET', '**/api/platform/licenses/validate/**', { forceNetworkError: true }).as('networkError');

            cy.searchInTable('testcompany');
            cy.clickTableAction(0, 'validate');

            cy.get('[data-cy="connection-error"]').should('be.visible');
            cy.get('[data-cy="connection-error"]').should('contain.text', 'Unable to connect to license server');

            // Show retry option
            cy.get('[data-cy="retry-validation"]').should('be.visible');
        });

        it('should handle license validation timeouts', () => {
            cy.intercept('GET', '**/api/platform/licenses/validate/**', { delay: 30000 }).as('timeout');

            cy.searchInTable('testcompany');
            cy.clickTableAction(0, 'validate');

            cy.get('[data-cy="validation-timeout"]').should('be.visible');
            cy.get('[data-cy="validation-timeout"]').should('contain.text', 'License validation timed out');
        });
    });

    describe('Accessibility', () => {
        it('should be accessible', () => {
            cy.checkAccessibility('[data-cy="licenses-page"]');
        });

        it('should support keyboard navigation', () => {
            cy.get('[data-cy="generate-license-button"]').focus().type('{enter}');
            cy.get('[data-cy="license-generation-modal"]').should('be.visible');

            // Navigate through form with keyboard
            cy.get('[data-cy="tenant-select"]').focus().type('{downarrow}{enter}');
            cy.get('[data-cy="maxUsers-input"]').focus().type('50');

            cy.get('[data-cy="submit-button"]').focus().type('{enter}');
        });
    });
});