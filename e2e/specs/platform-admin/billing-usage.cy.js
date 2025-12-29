/**
 * E2E Tests for Platform Admin - Billing and Usage Tracking
 * Tests billing management and usage analytics workflows
 */

describe('Platform Admin - Billing and Usage Tracking', () => {
    beforeEach(() => {
        // Clean up test data before each test
        cy.cleanupTestData();

        // Login as platform admin
        cy.loginAsPlatformAdmin();

        // Navigate to billing and usage
        cy.navigateToPlatformSection('billing');
        cy.shouldBeOnPage('billing');
    });

    afterEach(() => {
        // Clean up after each test
        cy.cleanupAfterTest();
    });

    describe('Billing Overview', () => {
        it('should display billing dashboard', () => {
            cy.get('[data-cy="billing-dashboard"]').should('be.visible');

            // Verify key metrics
            cy.get('[data-cy="total-revenue"]').should('be.visible');
            cy.get('[data-cy="monthly-revenue"]').should('be.visible');
            cy.get('[data-cy="active-subscriptions"]').should('be.visible');
            cy.get('[data-cy="overdue-payments"]').should('be.visible');

            // Verify charts
            cy.get('[data-cy="revenue-trend-chart"]').should('be.visible');
            cy.get('[data-cy="subscription-distribution-chart"]').should('be.visible');
            cy.get('[data-cy="payment-status-chart"]').should('be.visible');

            // Verify recent transactions
            cy.get('[data-cy="recent-transactions"]').should('be.visible');
            cy.get('[data-cy="transaction-list"]').should('be.visible');
        });

        it('should filter billing data by date range', () => {
            // Set custom date range
            cy.get('[data-cy="date-range-picker"]').click();
            cy.get('[data-cy="custom-range"]').click();

            cy.selectDate(new Date(2024, 0, 1), '[data-cy="start-date"]');
            cy.selectDate(new Date(2024, 2, 31), '[data-cy="end-date"]');

            cy.get('[data-cy="apply-date-range"]').click();

            // Verify data updates
            cy.get('[data-cy="date-range-display"]').should('contain.text', 'Jan 1, 2024 - Mar 31, 2024');
            cy.get('[data-cy="revenue-trend-chart"]').should('be.visible');

            // Test predefined ranges
            cy.get('[data-cy="date-range-picker"]').click();
            cy.get('[data-cy="last-30-days"]').click();

            cy.get('[data-cy="date-range-display"]').should('contain.text', 'Last 30 days');
        });

        it('should export billing reports', () => {
            cy.get('[data-cy="export-billing-report"]').click();
            cy.get('[data-cy="export-options-modal"]').should('be.visible');

            // Select report type
            cy.get('[data-cy="report-type"]').select('revenue-summary');

            // Select export format
            cy.get('[data-cy="export-format"]').select('pdf');

            // Set date range
            cy.get('[data-cy="report-date-start"]').click();
            cy.selectDate(new Date(2024, 0, 1), '[data-cy="report-date-start"]');

            cy.get('[data-cy="report-date-end"]').click();
            cy.selectDate(new Date(2024, 11, 31), '[data-cy="report-date-end"]');

            // Include additional data
            cy.get('[data-cy="include-transaction-details"]').check();
            cy.get('[data-cy="include-subscription-breakdown"]').check();

            // Generate report
            cy.get('[data-cy="generate-report"]').click();

            cy.expectSuccessMessage('Billing report generated successfully');

            // Verify download
            cy.readFile('e2e/downloads/billing-report.pdf').should('exist');
        });
    });

    describe('Invoice Management', () => {
        it('should display all invoices', () => {
            cy.get('[data-cy="invoices-tab"]').click();

            cy.get('[data-cy="invoices-table"]').should('be.visible');

            // Verify table headers
            cy.get('[data-cy="table-header"]').should('contain.text', 'Invoice #');
            cy.get('[data-cy="table-header"]').should('contain.text', 'Company');
            cy.get('[data-cy="table-header"]').should('contain.text', 'Amount');
            cy.get('[data-cy="table-header"]').should('contain.text', 'Status');
            cy.get('[data-cy="table-header"]').should('contain.text', 'Due Date');

            // Verify invoice data
            cy.get('[data-cy="table-row"]').should('be.visible');
        });

        it('should create manual invoice', () => {
            cy.get('[data-cy="invoices-tab"]').click();
            cy.get('[data-cy="create-invoice-button"]').click();

            cy.get('[data-cy="invoice-creation-modal"]').should('be.visible');

            // Fill invoice details
            const invoiceData = {
                company: 'testcompany',
                description: 'Custom service charges',
                amount: '500.00',
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            };

            cy.fillForm(invoiceData);

            // Add line items
            cy.get('[data-cy="add-line-item"]').click();
            cy.fillForm({
                itemDescription: 'Setup fee',
                itemQuantity: '1',
                itemRate: '200.00'
            });

            cy.get('[data-cy="add-line-item"]').click();
            cy.fillForm({
                itemDescription: 'Consulting hours',
                itemQuantity: '5',
                itemRate: '60.00'
            });

            // Verify total calculation
            cy.get('[data-cy="invoice-total"]').should('contain.text', '$500.00');

            // Add notes
            cy.get('[data-cy="invoice-notes"]').type('Payment due within 30 days');

            // Create invoice
            cy.submitForm('[data-cy="invoice-creation-form"]');

            cy.expectSuccessMessage('Invoice created successfully');

            // Verify invoice appears in list
            cy.get('[data-cy="table-row"]').should('contain.text', 'testcompany');
            cy.get('[data-cy="table-row"]').should('contain.text', '$500.00');
            cy.get('[data-cy="table-row"]').should('contain.text', 'Pending');
        });

        it('should view and edit invoice details', () => {
            cy.get('[data-cy="invoices-tab"]').click();

            // View invoice details
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="view-invoice"]').click();
            });

            cy.get('[data-cy="invoice-details-modal"]').should('be.visible');

            // Verify invoice information
            cy.get('[data-cy="invoice-number"]').should('be.visible');
            cy.get('[data-cy="invoice-company"]').should('be.visible');
            cy.get('[data-cy="invoice-amount"]').should('be.visible');
            cy.get('[data-cy="invoice-status"]').should('be.visible');

            // Verify line items
            cy.get('[data-cy="line-items"]').should('be.visible');
            cy.get('[data-cy="line-item"]').should('have.length.greaterThan', 0);

            // Edit invoice
            cy.get('[data-cy="edit-invoice"]').click();

            // Update invoice details
            cy.get('[data-cy="invoice-description"]').clear().type('Updated service charges');
            cy.get('[data-cy="invoice-notes"]').clear().type('Updated payment terms');

            // Save changes
            cy.get('[data-cy="save-invoice"]').click();

            cy.expectSuccessMessage('Invoice updated successfully');
        });

        it('should process invoice payment', () => {
            cy.get('[data-cy="invoices-tab"]').click();

            // Find pending invoice
            cy.get('[data-cy="status-filter"]').select('pending');
            cy.waitForTableLoad();

            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="process-payment"]').click();
            });

            cy.get('[data-cy="payment-processing-modal"]').should('be.visible');

            // Verify payment details
            cy.get('[data-cy="payment-amount"]').should('be.visible');
            cy.get('[data-cy="payment-company"]').should('be.visible');

            // Select payment method
            cy.get('[data-cy="payment-method"]').select('credit-card');

            // Add payment reference
            cy.get('[data-cy="payment-reference"]').type('CC-PAYMENT-123456');

            // Add payment notes
            cy.get('[data-cy="payment-notes"]').type('Payment processed via credit card');

            // Process payment
            cy.get('[data-cy="process-payment-submit"]').click();

            cy.expectSuccessMessage('Payment processed successfully');

            // Verify invoice status updated
            cy.get('[data-cy="table-row"]').first().should('contain.text', 'Paid');
        });

        it('should handle overdue invoices', () => {
            cy.get('[data-cy="invoices-tab"]').click();

            // Filter overdue invoices
            cy.get('[data-cy="status-filter"]').select('overdue');
            cy.waitForTableLoad();

            // Send payment reminder
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="send-reminder"]').click();
            });

            cy.get('[data-cy="payment-reminder-modal"]').should('be.visible');

            // Customize reminder message
            cy.get('[data-cy="reminder-message"]').clear().type('Your payment is overdue. Please settle your account to avoid service interruption.');

            // Set reminder type
            cy.get('[data-cy="reminder-type"]').select('final-notice');

            // Send reminder
            cy.get('[data-cy="send-reminder-submit"]').click();

            cy.expectSuccessMessage('Payment reminder sent successfully');

            // Mark invoice as disputed
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="mark-disputed"]').click();
            });

            cy.get('[data-cy="dispute-reason"]').type('Customer disputes service charges');
            cy.get('[data-cy="confirm-dispute"]').click();

            cy.expectSuccessMessage('Invoice marked as disputed');

            // Verify status change
            cy.get('[data-cy="table-row"]').first().should('contain.text', 'Disputed');
        });
    });

    describe('Usage Analytics', () => {
        it('should display usage overview', () => {
            cy.get('[data-cy="usage-tab"]').click();

            cy.get('[data-cy="usage-overview"]').should('be.visible');

            // Verify usage metrics
            cy.get('[data-cy="total-users"]').should('be.visible');
            cy.get('[data-cy="storage-usage"]').should('be.visible');
            cy.get('[data-cy="api-calls"]').should('be.visible');
            cy.get('[data-cy="bandwidth-usage"]').should('be.visible');

            // Verify usage charts
            cy.get('[data-cy="user-growth-chart"]').should('be.visible');
            cy.get('[data-cy="storage-trend-chart"]').should('be.visible');
            cy.get('[data-cy="api-usage-chart"]').should('be.visible');
        });

        it('should show detailed company usage', () => {
            cy.get('[data-cy="usage-tab"]').click();

            // Select specific company
            cy.get('[data-cy="company-filter"]').select('testcompany');
            cy.waitForTableLoad();

            cy.get('[data-cy="company-usage-details"]').should('be.visible');

            // Verify detailed metrics
            cy.get('[data-cy="active-users"]').should('be.visible');
            cy.get('[data-cy="storage-breakdown"]').should('be.visible');
            cy.get('[data-cy="feature-usage"]').should('be.visible');
            cy.get('[data-cy="api-usage-breakdown"]').should('be.visible');

            // Verify usage by module
            cy.get('[data-cy="module-usage"]').should('be.visible');
            cy.get('[data-cy="module-hr-core"]').should('be.visible');
            cy.get('[data-cy="module-attendance"]').should('be.visible');
            cy.get('[data-cy="module-payroll"]').should('be.visible');
        });

        it('should track usage limits and alerts', () => {
            cy.get('[data-cy="usage-tab"]').click();
            cy.get('[data-cy="usage-limits-tab"]').click();

            cy.get('[data-cy="usage-limits-table"]').should('be.visible');

            // View company approaching limits
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="view-limits"]').click();
            });

            cy.get('[data-cy="usage-limits-modal"]').should('be.visible');

            // Verify limit information
            cy.get('[data-cy="user-limit"]').should('be.visible');
            cy.get('[data-cy="storage-limit"]').should('be.visible');
            cy.get('[data-cy="api-limit"]').should('be.visible');

            // Verify usage percentages
            cy.get('[data-cy="user-usage-percentage"]').should('be.visible');
            cy.get('[data-cy="storage-usage-percentage"]').should('be.visible');
            cy.get('[data-cy="api-usage-percentage"]').should('be.visible');

            // Configure usage alerts
            cy.get('[data-cy="configure-alerts"]').click();

            cy.get('[data-cy="alert-threshold-users"]').clear().type('90');
            cy.get('[data-cy="alert-threshold-storage"]').clear().type('85');
            cy.get('[data-cy="alert-threshold-api"]').clear().type('80');

            cy.get('[data-cy="save-alert-settings"]').click();

            cy.expectSuccessMessage('Usage alert settings updated successfully');
        });

        it('should generate usage reports', () => {
            cy.get('[data-cy="usage-tab"]').click();
            cy.get('[data-cy="generate-usage-report"]').click();

            cy.get('[data-cy="usage-report-modal"]').should('be.visible');

            // Select report parameters
            cy.get('[data-cy="report-period"]').select('monthly');
            cy.get('[data-cy="report-companies"]').select('all');

            // Select metrics to include
            cy.get('[data-cy="include-user-metrics"]').check();
            cy.get('[data-cy="include-storage-metrics"]').check();
            cy.get('[data-cy="include-api-metrics"]').check();
            cy.get('[data-cy="include-feature-usage"]').check();

            // Set report format
            cy.get('[data-cy="report-format"]').select('excel');

            // Generate report
            cy.get('[data-cy="generate-report-submit"]').click();

            cy.expectSuccessMessage('Usage report generated successfully');

            // Verify download
            cy.readFile('e2e/downloads/usage-report.xlsx').should('exist');
        });
    });

    describe('Payment Methods', () => {
        it('should manage company payment methods', () => {
            cy.get('[data-cy="payment-methods-tab"]').click();

            cy.get('[data-cy="payment-methods-table"]').should('be.visible');

            // Add new payment method
            cy.get('[data-cy="add-payment-method"]').click();

            cy.get('[data-cy="payment-method-modal"]').should('be.visible');

            // Fill payment method details
            cy.get('[data-cy="company-select"]').select('testcompany');
            cy.get('[data-cy="payment-type"]').select('credit-card');

            cy.fillForm({
                cardNumber: '4111111111111111',
                expiryMonth: '12',
                expiryYear: '2025',
                cvv: '123',
                cardholderName: 'Test Company Admin'
            });

            // Fill billing address
            cy.fillForm({
                billingAddress: '123 Test Street',
                billingCity: 'Test City',
                billingState: 'TC',
                billingZip: '12345',
                billingCountry: 'US'
            });

            // Save payment method
            cy.submitForm('[data-cy="payment-method-form"]');

            cy.expectSuccessMessage('Payment method added successfully');

            // Verify payment method appears in list
            cy.get('[data-cy="table-row"]').should('contain.text', 'testcompany');
            cy.get('[data-cy="table-row"]').should('contain.text', 'Credit Card');
            cy.get('[data-cy="table-row"]').should('contain.text', '****1111');
        });

        it('should set default payment method', () => {
            cy.get('[data-cy="payment-methods-tab"]').click();

            // Set as default
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="set-default"]').click();
            });

            cy.confirmDialog();

            cy.expectSuccessMessage('Default payment method updated successfully');

            // Verify default indicator
            cy.get('[data-cy="table-row"]').first().should('contain.text', 'Default');
        });

        it('should handle failed payments', () => {
            cy.get('[data-cy="payment-methods-tab"]').click();

            // Simulate payment failure
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="test-payment"]').click();
            });

            cy.get('[data-cy="test-payment-modal"]').should('be.visible');

            // Simulate failure
            cy.get('[data-cy="simulate-failure"]').check();
            cy.get('[data-cy="failure-reason"]').select('insufficient-funds');

            cy.get('[data-cy="run-test"]').click();

            // Verify failure handling
            cy.get('[data-cy="payment-failed"]').should('be.visible');
            cy.get('[data-cy="failure-message"]').should('contain.text', 'Insufficient funds');

            // Verify payment method marked as failed
            cy.get('[data-cy="table-row"]').first().should('contain.text', 'Failed');

            // Send payment failure notification
            cy.get('[data-cy="notify-customer"]').click();

            cy.expectSuccessMessage('Payment failure notification sent');
        });
    });

    describe('Revenue Analytics', () => {
        it('should display revenue dashboard', () => {
            cy.get('[data-cy="revenue-tab"]').click();

            cy.get('[data-cy="revenue-dashboard"]').should('be.visible');

            // Verify revenue metrics
            cy.get('[data-cy="total-revenue"]').should('be.visible');
            cy.get('[data-cy="monthly-recurring-revenue"]').should('be.visible');
            cy.get('[data-cy="annual-recurring-revenue"]').should('be.visible');
            cy.get('[data-cy="average-revenue-per-user"]').should('be.visible');

            // Verify revenue charts
            cy.get('[data-cy="revenue-growth-chart"]').should('be.visible');
            cy.get('[data-cy="revenue-by-plan-chart"]').should('be.visible');
            cy.get('[data-cy="churn-rate-chart"]').should('be.visible');
        });

        it('should analyze revenue by subscription plan', () => {
            cy.get('[data-cy="revenue-tab"]').click();
            cy.get('[data-cy="plan-analysis-tab"]').click();

            cy.get('[data-cy="plan-revenue-breakdown"]').should('be.visible');

            // Verify plan metrics
            cy.get('[data-cy="basic-plan-revenue"]').should('be.visible');
            cy.get('[data-cy="professional-plan-revenue"]').should('be.visible');
            cy.get('[data-cy="enterprise-plan-revenue"]').should('be.visible');

            // Verify plan performance
            cy.get('[data-cy="plan-performance-table"]').should('be.visible');
            cy.get('[data-cy="table-header"]').should('contain.text', 'Plan');
            cy.get('[data-cy="table-header"]').should('contain.text', 'Subscribers');
            cy.get('[data-cy="table-header"]').should('contain.text', 'Revenue');
            cy.get('[data-cy="table-header"]').should('contain.text', 'Growth');
        });

        it('should forecast revenue trends', () => {
            cy.get('[data-cy="revenue-tab"]').click();
            cy.get('[data-cy="forecasting-tab"]').click();

            cy.get('[data-cy="revenue-forecast"]').should('be.visible');

            // Configure forecast parameters
            cy.get('[data-cy="forecast-period"]').select('12-months');
            cy.get('[data-cy="growth-assumption"]').clear().type('15');

            cy.get('[data-cy="generate-forecast"]').click();

            // Verify forecast results
            cy.get('[data-cy="forecast-chart"]').should('be.visible');
            cy.get('[data-cy="forecast-metrics"]').should('be.visible');

            // Verify forecast accuracy indicators
            cy.get('[data-cy="confidence-interval"]').should('be.visible');
            cy.get('[data-cy="forecast-assumptions"]').should('be.visible');
        });
    });

    describe('Error Handling', () => {
        it('should handle billing service errors', () => {
            cy.intercept('GET', '**/api/platform/billing/**', { statusCode: 503, body: { error: 'Billing service unavailable' } }).as('billingError');

            cy.reload();

            cy.get('[data-cy="service-error"]').should('be.visible');
            cy.get('[data-cy="service-error"]').should('contain.text', 'Billing service unavailable');

            // Show retry option
            cy.get('[data-cy="retry-button"]').should('be.visible');
        });

        it('should handle payment processing errors', () => {
            cy.intercept('POST', '**/api/platform/payments/process', { statusCode: 400, body: { error: 'Payment processing failed' } }).as('paymentError');

            cy.get('[data-cy="invoices-tab"]').click();
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="process-payment"]').click();
            });

            cy.get('[data-cy="process-payment-submit"]').click();

            cy.expectErrorMessage('Payment processing failed');
        });

        it('should handle invoice generation errors', () => {
            cy.intercept('POST', '**/api/platform/invoices', { statusCode: 400, body: { error: 'Invalid invoice data' } }).as('invoiceError');

            cy.get('[data-cy="invoices-tab"]').click();
            cy.get('[data-cy="create-invoice-button"]').click();

            cy.fillForm({
                company: 'testcompany',
                amount: '100.00'
            });

            cy.submitForm('[data-cy="invoice-creation-form"]');

            cy.expectErrorMessage('Invalid invoice data');
        });
    });

    describe('Accessibility', () => {
        it('should be accessible', () => {
            cy.checkAccessibility('[data-cy="billing-page"]');
        });

        it('should support keyboard navigation', () => {
            cy.get('[data-cy="invoices-tab"]').focus().type('{enter}');
            cy.get('[data-cy="create-invoice-button"]').focus().type('{enter}');

            cy.get('[data-cy="invoice-creation-modal"]').should('be.visible');

            // Navigate through form with keyboard
            cy.get('[data-cy="company-select"]').focus().type('{downarrow}{enter}');
            cy.get('[data-cy="amount-input"]').focus().type('250.00');

            cy.get('[data-cy="submit-button"]').focus().type('{enter}');
        });
    });
});