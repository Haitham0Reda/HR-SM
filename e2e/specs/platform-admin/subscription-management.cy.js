/**
 * E2E Tests for Platform Admin - Subscription Management
 * Tests subscription plan selection, changes, and billing workflow
 */

describe('Platform Admin - Subscription Management', () => {
    beforeEach(() => {
        // Clean up test data before each test
        cy.cleanupTestData();

        // Login as platform admin
        cy.loginAsPlatformAdmin();

        // Navigate to subscription management
        cy.navigateToPlatformSection('subscriptions');
        cy.shouldBeOnPage('subscriptions');
    });

    afterEach(() => {
        // Clean up after each test
        cy.cleanupAfterTest();
    });

    describe('Subscription Plan Management', () => {
        it('should display all available subscription plans', () => {
            cy.get('[data-cy="subscription-plans"]').should('be.visible');

            // Verify basic plan
            cy.get('[data-cy="plan-basic"]').should('be.visible');
            cy.get('[data-cy="plan-basic"]').should('contain.text', 'Basic Plan');
            cy.get('[data-cy="plan-basic"]').should('contain.text', '$29.99');
            cy.get('[data-cy="plan-basic"]').should('contain.text', '10 users');

            // Verify professional plan
            cy.get('[data-cy="plan-professional"]').should('be.visible');
            cy.get('[data-cy="plan-professional"]').should('contain.text', 'Professional Plan');
            cy.get('[data-cy="plan-professional"]').should('contain.text', '$99.99');
            cy.get('[data-cy="plan-professional"]').should('contain.text', '50 users');

            // Verify enterprise plan
            cy.get('[data-cy="plan-enterprise"]').should('be.visible');
            cy.get('[data-cy="plan-enterprise"]').should('contain.text', 'Enterprise Plan');
            cy.get('[data-cy="plan-enterprise"]').should('contain.text', '$299.99');
            cy.get('[data-cy="plan-enterprise"]').should('contain.text', '500 users');
        });

        it('should create new subscription for tenant', () => {
            cy.get('[data-cy="create-subscription-button"]').click();
            cy.get('[data-cy="subscription-creation-modal"]').should('be.visible');

            // Select tenant
            cy.get('[data-cy="tenant-select"]').click();
            cy.get('[data-cy="tenant-option-testcompany"]').click();

            // Select subscription plan
            cy.get('[data-cy="plan-select"]').select('professional');

            // Set billing cycle
            cy.get('[data-cy="billing-cycle"]').select('monthly');

            // Set start date
            const startDate = new Date();
            startDate.setDate(startDate.getDate() + 1);
            cy.selectDate(startDate, '[data-cy="start-date-input"]');

            // Submit subscription creation
            cy.submitForm('[data-cy="subscription-creation-form"]');

            // Verify success
            cy.expectSuccessMessage('Subscription created successfully');

            // Verify subscription appears in list
            cy.searchInTable('testcompany');
            cy.get('[data-cy="table-row"]').should('contain.text', 'Professional Plan');
            cy.get('[data-cy="table-row"]').should('contain.text', 'Active');
        });

        it('should upgrade tenant subscription plan', () => {
            // Find existing subscription
            cy.searchInTable('testcompany');
            cy.clickTableAction(0, 'upgrade');

            cy.get('[data-cy="subscription-upgrade-modal"]').should('be.visible');

            // Current plan should be displayed
            cy.get('[data-cy="current-plan"]').should('contain.text', 'Professional Plan');

            // Select upgrade plan
            cy.get('[data-cy="upgrade-plan-select"]').select('enterprise');

            // Verify upgrade details
            cy.get('[data-cy="upgrade-summary"]').should('be.visible');
            cy.get('[data-cy="price-difference"]').should('contain.text', '+$200.00');
            cy.get('[data-cy="new-features"]').should('contain.text', 'Payroll Management');
            cy.get('[data-cy="new-features"]').should('contain.text', 'Task Management');

            // Confirm upgrade
            cy.get('[data-cy="confirm-upgrade-button"]').click();
            cy.confirmDialog();

            // Verify upgrade success
            cy.expectSuccessMessage('Subscription upgraded successfully');

            // Verify updated plan in table
            cy.searchInTable('testcompany');
            cy.get('[data-cy="table-row"]').should('contain.text', 'Enterprise Plan');
        });

        it('should downgrade tenant subscription plan', () => {
            cy.searchInTable('testcompany');
            cy.clickTableAction(0, 'downgrade');

            cy.get('[data-cy="subscription-downgrade-modal"]').should('be.visible');

            // Show downgrade warning
            cy.get('[data-cy="downgrade-warning"]').should('be.visible');
            cy.get('[data-cy="downgrade-warning"]').should('contain.text', 'Some features will be disabled');

            // Select downgrade plan
            cy.get('[data-cy="downgrade-plan-select"]').select('basic');

            // Show features that will be lost
            cy.get('[data-cy="lost-features"]').should('contain.text', 'Attendance Management');
            cy.get('[data-cy="lost-features"]').should('contain.text', 'Leave Management');

            // Confirm downgrade
            cy.get('[data-cy="confirm-downgrade-button"]').click();
            cy.confirmDialog();

            cy.expectSuccessMessage('Subscription downgraded successfully');

            // Verify downgraded plan
            cy.searchInTable('testcompany');
            cy.get('[data-cy="table-row"]').should('contain.text', 'Basic Plan');
        });
    });

    describe('Billing Management', () => {
        it('should display billing history for tenant', () => {
            cy.searchInTable('testcompany');
            cy.clickTableAction(0, 'billing');

            cy.get('[data-cy="billing-history-modal"]').should('be.visible');

            // Verify billing information
            cy.get('[data-cy="current-balance"]').should('be.visible');
            cy.get('[data-cy="next-billing-date"]').should('be.visible');
            cy.get('[data-cy="payment-method"]').should('be.visible');

            // Verify billing history table
            cy.get('[data-cy="billing-history-table"]').should('be.visible');
            cy.get('[data-cy="billing-history-table"]').within(() => {
                cy.get('[data-cy="table-header"]').should('contain.text', 'Date');
                cy.get('[data-cy="table-header"]').should('contain.text', 'Amount');
                cy.get('[data-cy="table-header"]').should('contain.text', 'Status');
                cy.get('[data-cy="table-header"]').should('contain.text', 'Invoice');
            });
        });

        it('should generate invoice for tenant', () => {
            cy.searchInTable('testcompany');
            cy.clickTableAction(0, 'billing');

            cy.get('[data-cy="generate-invoice-button"]').click();
            cy.get('[data-cy="invoice-generation-modal"]').should('be.visible');

            // Select billing period
            cy.get('[data-cy="billing-period-start"]').click();
            cy.selectDate(new Date(2024, 0, 1), '[data-cy="billing-period-start"]');

            cy.get('[data-cy="billing-period-end"]').click();
            cy.selectDate(new Date(2024, 0, 31), '[data-cy="billing-period-end"]');

            // Add invoice notes
            cy.get('[data-cy="invoice-notes"]').type('Monthly subscription fee');

            // Generate invoice
            cy.get('[data-cy="generate-invoice-submit"]').click();

            cy.expectSuccessMessage('Invoice generated successfully');

            // Verify invoice appears in history
            cy.get('[data-cy="billing-history-table"]').within(() => {
                cy.get('[data-cy="table-row"]').first().should('contain.text', 'Generated');
            });
        });

        it('should handle payment processing', () => {
            cy.searchInTable('testcompany');
            cy.clickTableAction(0, 'billing');

            // Process payment for outstanding invoice
            cy.get('[data-cy="billing-history-table"]').within(() => {
                cy.get('[data-cy="table-row"]').first().within(() => {
                    cy.get('[data-cy="process-payment-button"]').click();
                });
            });

            cy.get('[data-cy="payment-processing-modal"]').should('be.visible');

            // Verify payment details
            cy.get('[data-cy="payment-amount"]').should('be.visible');
            cy.get('[data-cy="payment-method"]').should('be.visible');

            // Process payment
            cy.get('[data-cy="process-payment-submit"]').click();
            cy.confirmDialog();

            cy.expectSuccessMessage('Payment processed successfully');

            // Verify payment status updated
            cy.get('[data-cy="billing-history-table"]').within(() => {
                cy.get('[data-cy="table-row"]').first().should('contain.text', 'Paid');
            });
        });
    });

    describe('Subscription Analytics', () => {
        it('should display subscription statistics', () => {
            cy.get('[data-cy="subscription-stats"]').should('be.visible');

            // Verify key metrics
            cy.get('[data-cy="total-subscriptions"]').should('be.visible');
            cy.get('[data-cy="active-subscriptions"]').should('be.visible');
            cy.get('[data-cy="expired-subscriptions"]').should('be.visible');
            cy.get('[data-cy="monthly-revenue"]').should('be.visible');

            // Verify revenue chart
            cy.get('[data-cy="revenue-chart"]').should('be.visible');

            // Verify plan distribution chart
            cy.get('[data-cy="plan-distribution-chart"]').should('be.visible');
        });

        it('should filter subscriptions by status', () => {
            cy.get('[data-cy="status-filter"]').select('active');
            cy.waitForTableLoad();

            // All visible subscriptions should be active
            cy.get('[data-cy="table-row"]').each(($row) => {
                cy.wrap($row).should('contain.text', 'Active');
            });

            // Test expired filter
            cy.get('[data-cy="status-filter"]').select('expired');
            cy.waitForTableLoad();

            cy.get('[data-cy="table-row"]').each(($row) => {
                cy.wrap($row).should('contain.text', 'Expired');
            });
        });

        it('should export subscription data', () => {
            cy.get('[data-cy="export-subscriptions-button"]').click();
            cy.get('[data-cy="export-options-modal"]').should('be.visible');

            // Select export format
            cy.get('[data-cy="export-format"]').select('csv');

            // Select date range
            cy.get('[data-cy="export-date-start"]').click();
            cy.selectDate(new Date(2024, 0, 1), '[data-cy="export-date-start"]');

            cy.get('[data-cy="export-date-end"]').click();
            cy.selectDate(new Date(2024, 11, 31), '[data-cy="export-date-end"]');

            // Export data
            cy.get('[data-cy="export-submit"]').click();

            cy.expectSuccessMessage('Export completed successfully');

            // Verify download
            cy.readFile('e2e/downloads/subscriptions-export.csv').should('exist');
        });
    });

    describe('Error Handling', () => {
        it('should handle subscription creation errors', () => {
            cy.intercept('POST', '**/api/platform/subscriptions', { statusCode: 400, body: { error: 'Invalid subscription data' } }).as('subscriptionError');

            cy.get('[data-cy="create-subscription-button"]').click();
            cy.fillForm({
                tenant: 'testcompany',
                plan: 'professional'
            });
            cy.submitForm('[data-cy="subscription-creation-form"]');

            cy.expectErrorMessage('Invalid subscription data');
        });

        it('should handle billing service errors', () => {
            cy.intercept('GET', '**/api/platform/billing/**', { statusCode: 503, body: { error: 'Billing service unavailable' } }).as('billingError');

            cy.searchInTable('testcompany');
            cy.clickTableAction(0, 'billing');

            cy.get('[data-cy="service-error"]').should('be.visible');
            cy.get('[data-cy="service-error"]').should('contain.text', 'Billing service unavailable');
        });
    });

    describe('Accessibility', () => {
        it('should be accessible', () => {
            cy.checkAccessibility('[data-cy="subscriptions-page"]');
        });

        it('should support keyboard navigation', () => {
            cy.get('[data-cy="create-subscription-button"]').focus().type('{enter}');
            cy.get('[data-cy="subscription-creation-modal"]').should('be.visible');

            // Navigate through form with keyboard
            cy.get('[data-cy="tenant-select"]').focus().type('{enter}');
            cy.get('[data-cy="tenant-option-testcompany"]').focus().type('{enter}');

            cy.get('[data-cy="plan-select"]').focus().type('{downarrow}{enter}');

            cy.get('[data-cy="submit-button"]').focus().type('{enter}');
        });
    });
});