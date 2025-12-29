/**
 * E2E Tests for Platform Admin - Tenant Management
 * Tests tenant creation, configuration, and management workflows
 */

describe('Platform Admin - Tenant Management', () => {
    beforeEach(() => {
        // Clean up test data before each test
        cy.cleanupTestData();

        // Login as platform admin
        cy.loginAsPlatformAdmin();

        // Navigate to tenant management
        cy.navigateToPlatformSection('tenants');
        cy.shouldBeOnPage('tenants');
    });

    afterEach(() => {
        // Clean up after each test
        cy.cleanupAfterTest();
    });

    describe('Tenant Creation', () => {
        it('should create a new tenant with basic configuration', () => {
            cy.startPerformanceMark('tenant-creation');

            // Click create tenant button
            cy.get('[data-cy="create-tenant-button"]').click();
            cy.get('[data-cy="tenant-creation-modal"]').should('be.visible');

            // Fill tenant basic information
            const tenantData = {
                name: 'New Test Company',
                domain: 'newtestcompany',
                email: 'admin@newtestcompany.com',
                phone: '+1555123456',
                industry: 'Technology',
                size: '10-50'
            };

            cy.fillForm(tenantData);

            // Submit tenant creation
            cy.submitForm('[data-cy="tenant-creation-form"]');

            // Verify success message
            cy.expectSuccessMessage('Tenant created successfully');

            // Verify tenant appears in list
            cy.searchInTable('New Test Company');
            cy.get('[data-cy="table-row"]').should('contain.text', 'New Test Company');
            cy.get('[data-cy="table-row"]').should('contain.text', 'newtestcompany');
            cy.get('[data-cy="table-row"]').should('contain.text', 'Technology');

            cy.endPerformanceMark('tenant-creation', 10000);
        });

        it('should create tenant with advanced configuration', () => {
            // Create tenant with full configuration
            cy.get('[data-cy="create-tenant-button"]').click();

            const advancedTenantData = {
                name: 'Advanced Test Company',
                domain: 'advancedtest',
                email: 'admin@advancedtest.com',
                phone: '+1555987654',
                address: '789 Advanced Street, Tech City, TC 78901',
                industry: 'Healthcare',
                size: '100-500',
                timezone: 'America/New_York',
                currency: 'USD',
                dateFormat: 'MM/DD/YYYY'
            };

            cy.fillForm(advancedTenantData);

            // Configure working hours
            cy.get('[data-cy="working-hours-start"]').clear().type('08:00');
            cy.get('[data-cy="working-hours-end"]').clear().type('17:00');

            // Select working days
            const workingDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
            workingDays.forEach(day => {
                cy.get(`[data-cy="working-day-${day}"]`).check();
            });

            cy.submitForm('[data-cy="tenant-creation-form"]');

            // Verify creation
            cy.expectSuccessMessage('Tenant created successfully');
            cy.searchInTable('Advanced Test Company');
            cy.get('[data-cy="table-row"]').should('contain.text', 'Advanced Test Company');
        });

        it('should validate tenant domain uniqueness', () => {
            // Try to create tenant with existing domain
            cy.get('[data-cy="create-tenant-button"]').click();

            cy.fillForm({
                name: 'Duplicate Domain Company',
                domain: 'testcompany', // This domain already exists
                email: 'admin@duplicate.com'
            });

            cy.submitForm('[data-cy="tenant-creation-form"]');

            // Verify error message
            cy.expectErrorMessage('Domain already exists');
            cy.get('[data-cy="domain-input"]').should('have.class', 'error');
        });

        it('should validate required fields', () => {
            cy.get('[data-cy="create-tenant-button"]').click();

            // Try to submit without required fields
            cy.submitForm('[data-cy="tenant-creation-form"]');

            // Verify validation errors
            cy.get('[data-cy="name-input"]').should('have.class', 'error');
            cy.get('[data-cy="domain-input"]').should('have.class', 'error');
            cy.get('[data-cy="email-input"]').should('have.class', 'error');

            cy.get('[data-cy="validation-error"]').should('contain.text', 'Name is required');
            cy.get('[data-cy="validation-error"]').should('contain.text', 'Domain is required');
            cy.get('[data-cy="validation-error"]').should('contain.text', 'Email is required');
        });
    });

    describe('Tenant Configuration', () => {
        it('should update tenant basic information', () => {
            // Find and edit existing tenant
            cy.searchInTable('Test Company');
            cy.clickTableAction(0, 'edit');

            cy.get('[data-cy="tenant-edit-modal"]').should('be.visible');

            // Update tenant information
            const updatedData = {
                name: 'Updated Test Company',
                phone: '+1555999888',
                address: '456 Updated Street, New City, NC 45678'
            };

            cy.fillForm(updatedData);
            cy.submitForm('[data-cy="tenant-edit-form"]');

            // Verify update
            cy.expectSuccessMessage('Tenant updated successfully');
            cy.searchInTable('Updated Test Company');
            cy.get('[data-cy="table-row"]').should('contain.text', 'Updated Test Company');
        });

        it('should configure tenant settings', () => {
            cy.searchInTable('Test Company');
            cy.clickTableAction(0, 'settings');

            cy.get('[data-cy="tenant-settings-modal"]').should('be.visible');

            // Update settings
            cy.get('[data-cy="timezone-select"]').select('Europe/London');
            cy.get('[data-cy="currency-select"]').select('EUR');
            cy.get('[data-cy="date-format-select"]').select('DD/MM/YYYY');

            // Update working hours
            cy.get('[data-cy="working-hours-start"]').clear().type('09:30');
            cy.get('[data-cy="working-hours-end"]').clear().type('18:00');

            cy.get('[data-cy="save-settings-button"]').click();

            // Verify settings saved
            cy.expectSuccessMessage('Settings updated successfully');

            // Verify settings persist
            cy.clickTableAction(0, 'settings');
            cy.get('[data-cy="timezone-select"]').should('have.value', 'Europe/London');
            cy.get('[data-cy="currency-select"]').should('have.value', 'EUR');
        });

        it('should manage tenant status', () => {
            cy.searchInTable('Test Company');

            // Suspend tenant
            cy.clickTableAction(0, 'suspend');
            cy.confirmDialog();

            cy.expectSuccessMessage('Tenant suspended successfully');
            cy.get('[data-cy="table-row"]').should('contain.text', 'Suspended');

            // Reactivate tenant
            cy.clickTableAction(0, 'activate');
            cy.confirmDialog();

            cy.expectSuccessMessage('Tenant activated successfully');
            cy.get('[data-cy="table-row"]').should('contain.text', 'Active');
        });
    });

    describe('Tenant Search and Filtering', () => {
        it('should search tenants by name', () => {
            cy.searchInTable('Test Company');
            cy.shouldHaveTableRows(1);
            cy.get('[data-cy="table-row"]').should('contain.text', 'Test Company');
        });

        it('should filter tenants by status', () => {
            cy.get('[data-cy="status-filter"]').select('active');
            cy.waitForTableLoad();

            // All visible rows should be active
            cy.get('[data-cy="table-row"]').each(($row) => {
                cy.wrap($row).should('contain.text', 'Active');
            });
        });

        it('should filter tenants by subscription plan', () => {
            cy.get('[data-cy="plan-filter"]').select('enterprise');
            cy.waitForTableLoad();

            // All visible rows should have enterprise plan
            cy.get('[data-cy="table-row"]').each(($row) => {
                cy.wrap($row).should('contain.text', 'Enterprise');
            });
        });

        it('should sort tenants by creation date', () => {
            cy.sortTableBy('created', 'desc');

            // Verify sorting by checking first row is most recent
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="created-date"]').should('be.visible');
            });
        });
    });

    describe('Bulk Operations', () => {
        it('should perform bulk tenant operations', () => {
            // Select multiple tenants
            cy.selectTableRow(0);
            cy.selectTableRow(1);

            // Perform bulk action
            cy.get('[data-cy="bulk-actions"]').select('suspend');
            cy.get('[data-cy="apply-bulk-action"]').click();
            cy.confirmDialog();

            cy.expectSuccessMessage('Bulk operation completed successfully');

            // Verify both tenants are suspended
            cy.get('[data-cy="table-row"]').each(($row, index) => {
                if (index < 2) {
                    cy.wrap($row).should('contain.text', 'Suspended');
                }
            });
        });
    });

    describe('Tenant Analytics', () => {
        it('should display tenant statistics', () => {
            cy.get('[data-cy="tenant-stats"]').should('be.visible');
            cy.get('[data-cy="total-tenants"]').should('contain.text', 'Total Tenants');
            cy.get('[data-cy="active-tenants"]').should('contain.text', 'Active');
            cy.get('[data-cy="suspended-tenants"]').should('contain.text', 'Suspended');
        });

        it('should show tenant usage metrics', () => {
            cy.searchInTable('Test Company');
            cy.clickTableAction(0, 'analytics');

            cy.get('[data-cy="tenant-analytics-modal"]').should('be.visible');
            cy.get('[data-cy="user-count"]').should('be.visible');
            cy.get('[data-cy="storage-usage"]').should('be.visible');
            cy.get('[data-cy="api-usage"]').should('be.visible');
            cy.get('[data-cy="last-activity"]').should('be.visible');
        });
    });

    describe('Error Handling', () => {
        it('should handle network errors gracefully', () => {
            // Simulate network error
            cy.intercept('GET', '**/api/platform/tenants', { forceNetworkError: true }).as('networkError');

            cy.reload();
            cy.get('[data-cy="network-error"]').should('be.visible');
            cy.get('[data-cy="retry-button"]').click();

            // Should recover after retry
            cy.waitForTableLoad();
        });

        it('should handle server errors', () => {
            cy.intercept('POST', '**/api/platform/tenants', { statusCode: 500 }).as('serverError');

            cy.get('[data-cy="create-tenant-button"]').click();
            cy.fillForm({
                name: 'Error Test Company',
                domain: 'errortest',
                email: 'admin@errortest.com'
            });
            cy.submitForm('[data-cy="tenant-creation-form"]');

            cy.expectErrorMessage('Server error occurred');
        });
    });

    describe('Accessibility', () => {
        it('should be accessible', () => {
            cy.checkAccessibility('[data-cy="tenants-page"]');
        });

        it('should support keyboard navigation', () => {
            cy.get('[data-cy="create-tenant-button"]').focus().type('{enter}');
            cy.get('[data-cy="tenant-creation-modal"]').should('be.visible');

            cy.get('[data-cy="name-input"]').focus().type('Keyboard Test Company');
            cy.get('[data-cy="domain-input"]').focus().type('keyboardtest');
            cy.get('[data-cy="email-input"]').focus().type('admin@keyboardtest.com');

            cy.get('[data-cy="submit-button"]').focus().type('{enter}');
            cy.expectSuccessMessage('Tenant created successfully');
        });
    });
});