/**
 * E2E Tests for Platform Admin - Module Management
 * Tests module enable/disable functionality with license validation
 */

describe('Platform Admin - Module Management', () => {
    beforeEach(() => {
        // Clean up test data before each test
        cy.cleanupTestData();

        // Login as platform admin
        cy.loginAsPlatformAdmin();

        // Navigate to module management
        cy.navigateToPlatformSection('modules');
        cy.shouldBeOnPage('modules');
    });

    afterEach(() => {
        // Clean up after each test
        cy.cleanupAfterTest();
    });

    describe('Module Configuration', () => {
        it('should display all available modules', () => {
            cy.get('[data-cy="modules-grid"]').should('be.visible');

            // Verify core modules
            cy.get('[data-cy="module-hr-core"]').should('be.visible');
            cy.get('[data-cy="module-hr-core"]').should('contain.text', 'HR Core');
            cy.get('[data-cy="module-hr-core"]').should('contain.text', 'Required');

            // Verify optional modules
            const optionalModules = ['attendance', 'payroll', 'vacation', 'tasks', 'documents', 'missions', 'overtime'];
            optionalModules.forEach(module => {
                cy.get(`[data-cy="module-${module}"]`).should('be.visible');
                cy.get(`[data-cy="module-${module}"]`).should('contain.text', 'Optional');
            });
        });

        it('should enable module for tenant', () => {
            // Search for tenant
            cy.searchInTable('testcompany');
            cy.clickTableAction(0, 'configure-modules');

            cy.get('[data-cy="module-configuration-modal"]').should('be.visible');

            // Verify current modules
            cy.get('[data-cy="current-modules"]').should('be.visible');
            cy.get('[data-cy="module-hr-core"]').should('have.class', 'enabled');

            // Enable payroll module
            cy.get('[data-cy="module-payroll"]').within(() => {
                cy.get('[data-cy="enable-toggle"]').click();
            });

            // Verify license validation
            cy.get('[data-cy="license-validation"]').should('be.visible');
            cy.get('[data-cy="license-validation"]').should('contain.text', 'Checking license compatibility');

            // Confirm module enablement
            cy.get('[data-cy="save-module-config"]').click();

            cy.expectSuccessMessage('Module configuration updated successfully');

            // Verify module is enabled
            cy.get('[data-cy="module-payroll"]').should('have.class', 'enabled');
        });

        it('should disable module for tenant', () => {
            cy.searchInTable('testcompany');
            cy.clickTableAction(0, 'configure-modules');

            // Disable attendance module
            cy.get('[data-cy="module-attendance"]').within(() => {
                cy.get('[data-cy="enable-toggle"]').click();
            });

            // Show warning about data retention
            cy.get('[data-cy="disable-warning"]').should('be.visible');
            cy.get('[data-cy="disable-warning"]').should('contain.text', 'Existing attendance data will be preserved');

            // Confirm disable
            cy.get('[data-cy="confirm-disable"]').click();
            cy.confirmDialog();

            cy.get('[data-cy="save-module-config"]').click();

            cy.expectSuccessMessage('Module configuration updated successfully');

            // Verify module is disabled
            cy.get('[data-cy="module-attendance"]').should('have.class', 'disabled');
        });

        it('should validate license restrictions', () => {
            // Switch to basic plan tenant
            cy.searchInTable('basiccompany');
            cy.clickTableAction(0, 'configure-modules');

            // Try to enable enterprise-only module
            cy.get('[data-cy="module-payroll"]').within(() => {
                cy.get('[data-cy="enable-toggle"]').click();
            });

            // Should show license restriction error
            cy.get('[data-cy="license-error"]').should('be.visible');
            cy.get('[data-cy="license-error"]').should('contain.text', 'Payroll module requires Professional plan or higher');

            // Enable toggle should revert
            cy.get('[data-cy="module-payroll"]').within(() => {
                cy.get('[data-cy="enable-toggle"]').should('not.be.checked');
            });
        });

        it('should bulk configure modules', () => {
            // Select multiple tenants
            cy.selectTableRow(0);
            cy.selectTableRow(1);

            // Bulk configure modules
            cy.get('[data-cy="bulk-actions"]').select('configure-modules');
            cy.get('[data-cy="apply-bulk-action"]').click();

            cy.get('[data-cy="bulk-module-config-modal"]').should('be.visible');

            // Enable modules for all selected tenants
            cy.get('[data-cy="module-tasks"]').within(() => {
                cy.get('[data-cy="enable-toggle"]').click();
            });

            cy.get('[data-cy="module-documents"]').within(() => {
                cy.get('[data-cy="enable-toggle"]').click();
            });

            // Apply bulk configuration
            cy.get('[data-cy="apply-bulk-config"]').click();
            cy.confirmDialog();

            cy.expectSuccessMessage('Bulk module configuration completed successfully');

            // Verify modules enabled for both tenants
            cy.get('[data-cy="table-row"]').each(($row, index) => {
                if (index < 2) {
                    cy.wrap($row).within(() => {
                        cy.get('[data-cy="enabled-modules"]').should('contain.text', 'Tasks');
                        cy.get('[data-cy="enabled-modules"]').should('contain.text', 'Documents');
                    });
                }
            });
        });
    });

    describe('Module Analytics', () => {
        it('should display module usage statistics', () => {
            cy.get('[data-cy="module-analytics"]').should('be.visible');

            // Verify usage metrics
            cy.get('[data-cy="total-modules"]').should('be.visible');
            cy.get('[data-cy="most-used-module"]').should('be.visible');
            cy.get('[data-cy="least-used-module"]').should('be.visible');

            // Verify usage chart
            cy.get('[data-cy="module-usage-chart"]').should('be.visible');

            // Verify adoption rate chart
            cy.get('[data-cy="adoption-rate-chart"]').should('be.visible');
        });

        it('should show module performance metrics', () => {
            cy.get('[data-cy="module-performance"]').should('be.visible');

            // Click on specific module for details
            cy.get('[data-cy="module-attendance"]').click();

            cy.get('[data-cy="module-details-modal"]').should('be.visible');

            // Verify performance metrics
            cy.get('[data-cy="active-users"]').should('be.visible');
            cy.get('[data-cy="daily-usage"]').should('be.visible');
            cy.get('[data-cy="error-rate"]').should('be.visible');
            cy.get('[data-cy="response-time"]').should('be.visible');

            // Verify usage trends
            cy.get('[data-cy="usage-trend-chart"]').should('be.visible');
        });

        it('should export module usage data', () => {
            cy.get('[data-cy="export-module-data"]').click();
            cy.get('[data-cy="export-options-modal"]').should('be.visible');

            // Select export options
            cy.get('[data-cy="export-format"]').select('json');
            cy.get('[data-cy="include-usage-stats"]').check();
            cy.get('[data-cy="include-performance-metrics"]').check();

            // Export data
            cy.get('[data-cy="export-submit"]').click();

            cy.expectSuccessMessage('Module data exported successfully');

            // Verify download
            cy.readFile('e2e/downloads/module-usage-export.json').should('exist');
        });
    });

    describe('Module Dependencies', () => {
        it('should handle module dependencies correctly', () => {
            cy.searchInTable('testcompany');
            cy.clickTableAction(0, 'configure-modules');

            // Try to disable HR Core (required module)
            cy.get('[data-cy="module-hr-core"]').within(() => {
                cy.get('[data-cy="enable-toggle"]').should('be.disabled');
            });

            // Show dependency information
            cy.get('[data-cy="module-hr-core"]').within(() => {
                cy.get('[data-cy="dependency-info"]').should('contain.text', 'Required for all other modules');
            });
        });

        it('should show dependent modules when disabling', () => {
            cy.searchInTable('testcompany');
            cy.clickTableAction(0, 'configure-modules');

            // Try to disable attendance (has dependent modules)
            cy.get('[data-cy="module-attendance"]').within(() => {
                cy.get('[data-cy="enable-toggle"]').click();
            });

            // Should show dependent modules warning
            cy.get('[data-cy="dependency-warning"]').should('be.visible');
            cy.get('[data-cy="dependency-warning"]').should('contain.text', 'This will also disable: Overtime Management');

            // Confirm or cancel
            cy.get('[data-cy="confirm-with-dependencies"]').click();

            // Verify both modules are disabled
            cy.get('[data-cy="module-attendance"]').should('have.class', 'disabled');
            cy.get('[data-cy="module-overtime"]').should('have.class', 'disabled');
        });
    });

    describe('Error Handling', () => {
        it('should handle module configuration errors', () => {
            cy.intercept('PUT', '**/api/platform/modules/config', { statusCode: 400, body: { error: 'Invalid module configuration' } }).as('configError');

            cy.searchInTable('testcompany');
            cy.clickTableAction(0, 'configure-modules');

            cy.get('[data-cy="module-tasks"]').within(() => {
                cy.get('[data-cy="enable-toggle"]').click();
            });

            cy.get('[data-cy="save-module-config"]').click();

            cy.expectErrorMessage('Invalid module configuration');
        });

        it('should handle license validation errors', () => {
            cy.intercept('GET', '**/api/platform/license/validate', { statusCode: 503, body: { error: 'License server unavailable' } }).as('licenseError');

            cy.searchInTable('testcompany');
            cy.clickTableAction(0, 'configure-modules');

            cy.get('[data-cy="module-payroll"]').within(() => {
                cy.get('[data-cy="enable-toggle"]').click();
            });

            cy.get('[data-cy="license-error"]').should('be.visible');
            cy.get('[data-cy="license-error"]').should('contain.text', 'Unable to validate license');
        });
    });

    describe('Accessibility', () => {
        it('should be accessible', () => {
            cy.checkAccessibility('[data-cy="modules-page"]');
        });

        it('should support keyboard navigation', () => {
            cy.searchInTable('testcompany');
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="action-configure-modules"]').focus().type('{enter}');
            });

            cy.get('[data-cy="module-configuration-modal"]').should('be.visible');

            // Navigate through modules with keyboard
            cy.get('[data-cy="module-tasks"]').within(() => {
                cy.get('[data-cy="enable-toggle"]').focus().type(' ');
            });

            cy.get('[data-cy="save-module-config"]').focus().type('{enter}');
        });
    });
});