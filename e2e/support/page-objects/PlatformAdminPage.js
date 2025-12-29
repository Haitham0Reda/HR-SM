/**
 * Platform Admin Page Object Model
 */

export class PlatformAdminPage {
    constructor() {
        this.selectors = {
            pageContent: '[data-cy="platform-admin-page"]',
            platformHeader: '[data-cy="platform-header"]',
            platformSidebar: '[data-cy="platform-sidebar"]',
            userMenu: '[data-cy="platform-user-menu"]',
            logoutButton: '[data-cy="platform-logout-button"]',

            // Navigation menu items
            dashboardMenu: '[data-cy="platform-menu-dashboard"]',
            tenantsMenu: '[data-cy="platform-menu-tenants"]',
            subscriptionsMenu: '[data-cy="platform-menu-subscriptions"]',
            licensesMenu: '[data-cy="platform-menu-licenses"]',
            modulesMenu: '[data-cy="platform-menu-modules"]',
            systemMenu: '[data-cy="platform-menu-system"]',
            reportsMenu: '[data-cy="platform-menu-reports"]',

            // Dashboard widgets
            totalTenantsWidget: '[data-cy="total-tenants-widget"]',
            activeSubscriptionsWidget: '[data-cy="active-subscriptions-widget"]',
            revenueWidget: '[data-cy="revenue-widget"]',
            systemHealthWidget: '[data-cy="system-health-widget"]',

            // Common elements
            searchInput: '[data-cy="search-input"]',
            filterDropdown: '[data-cy="filter-dropdown"]',
            addButton: '[data-cy="add-button"]',
            exportButton: '[data-cy="export-button"]',
            refreshButton: '[data-cy="refresh-button"]'
        };
    }

    visit() {
        cy.visit('http://localhost:3001/dashboard');
        return this;
    }

    expectToBeOnPlatformAdmin() {
        cy.get(this.selectors.platformHeader).should('be.visible');
        cy.get(this.selectors.pageContent).should('be.visible');
        return this;
    }

    navigateToSection(sectionName) {
        const menuSelector = this.selectors[`${sectionName}Menu`];
        if (menuSelector) {
            cy.get(menuSelector).click();
            cy.url().should('include', `/${sectionName}`);
        } else {
            throw new Error(`Unknown section: ${sectionName}`);
        }
        return this;
    }

    logout() {
        cy.get(this.selectors.userMenu).click();
        cy.get(this.selectors.logoutButton).click();
        cy.url().should('include', '/login');
        return this;
    }

    verifyDashboardWidgets() {
        cy.get(this.selectors.totalTenantsWidget).should('be.visible');
        cy.get(this.selectors.activeSubscriptionsWidget).should('be.visible');
        cy.get(this.selectors.revenueWidget).should('be.visible');
        cy.get(this.selectors.systemHealthWidget).should('be.visible');
        return this;
    }

    verifyTotalTenants(expectedCount) {
        cy.get(this.selectors.totalTenantsWidget)
            .find('[data-cy="widget-value"]')
            .should('contain.text', expectedCount);
        return this;
    }

    verifyActiveSubscriptions(expectedCount) {
        cy.get(this.selectors.activeSubscriptionsWidget)
            .find('[data-cy="widget-value"]')
            .should('contain.text', expectedCount);
        return this;
    }

    verifySystemHealth(expectedStatus = 'Healthy') {
        cy.get(this.selectors.systemHealthWidget)
            .find('[data-cy="health-status"]')
            .should('contain.text', expectedStatus);
        return this;
    }

    searchFor(searchTerm) {
        cy.get(this.selectors.searchInput).clear().type(searchTerm);
        cy.get('[data-cy="search-button"]').click();
        return this;
    }

    applyFilter(filterValue) {
        cy.get(this.selectors.filterDropdown).select(filterValue);
        return this;
    }

    clickAdd() {
        cy.get(this.selectors.addButton).click();
        return this;
    }

    clickExport() {
        cy.get(this.selectors.exportButton).click();
        return this;
    }

    clickRefresh() {
        cy.get(this.selectors.refreshButton).click();
        return this;
    }

    verifyAccessControl(userRole) {
        // Verify menu items based on role
        if (userRole === 'platform_admin') {
            cy.get(this.selectors.tenantsMenu).should('be.visible');
            cy.get(this.selectors.subscriptionsMenu).should('be.visible');
            cy.get(this.selectors.licensesMenu).should('be.visible');
            cy.get(this.selectors.systemMenu).should('be.visible');
        } else if (userRole === 'platform_viewer') {
            cy.get(this.selectors.tenantsMenu).should('be.visible');
            cy.get(this.selectors.subscriptionsMenu).should('be.visible');
            cy.get(this.selectors.systemMenu).should('not.exist');
        }
        return this;
    }

    verifyPageLoadPerformance() {
        cy.startPerformanceMark('platform-admin-load');
        this.visit();
        cy.get(this.selectors.pageContent).should('be.visible');
        cy.endPerformanceMark('platform-admin-load', 3000);
        return this;
    }
}

export class TenantsPage extends PlatformAdminPage {
    constructor() {
        super();
        this.selectors = {
            ...this.selectors,
            tenantsTable: '[data-cy="tenants-table"]',
            tenantRow: '[data-cy="tenant-row"]',
            createTenantButton: '[data-cy="create-tenant-button"]',
            tenantModal: '[data-cy="tenant-modal"]',
            tenantForm: '[data-cy="tenant-form"]',

            // Form fields
            tenantNameInput: '[data-cy="tenant-name-input"]',
            tenantDomainInput: '[data-cy="tenant-domain-input"]',
            tenantEmailInput: '[data-cy="tenant-email-input"]',
            tenantPhoneInput: '[data-cy="tenant-phone-input"]',
            subscriptionPlanSelect: '[data-cy="subscription-plan-select"]',
            enabledModulesSelect: '[data-cy="enabled-modules-select"]',

            // Actions
            editTenantButton: '[data-cy="edit-tenant-button"]',
            deleteTenantButton: '[data-cy="delete-tenant-button"]',
            suspendTenantButton: '[data-cy="suspend-tenant-button"]',
            activateTenantButton: '[data-cy="activate-tenant-button"]'
        };
    }

    visitTenantsPage() {
        this.navigateToSection('tenants');
        return this;
    }

    expectToBeOnTenantsPage() {
        cy.url().should('include', '/tenants');
        cy.get(this.selectors.tenantsTable).should('be.visible');
        return this;
    }

    createTenant(tenantData) {
        cy.get(this.selectors.createTenantButton).click();
        cy.get(this.selectors.tenantModal).should('be.visible');

        cy.get(this.selectors.tenantNameInput).type(tenantData.name);
        cy.get(this.selectors.tenantDomainInput).type(tenantData.domain);
        cy.get(this.selectors.tenantEmailInput).type(tenantData.email);

        if (tenantData.phone) {
            cy.get(this.selectors.tenantPhoneInput).type(tenantData.phone);
        }

        if (tenantData.subscriptionPlan) {
            cy.get(this.selectors.subscriptionPlanSelect).select(tenantData.subscriptionPlan);
        }

        if (tenantData.enabledModules) {
            tenantData.enabledModules.forEach(module => {
                cy.get(this.selectors.enabledModulesSelect).select(module, { multiple: true });
            });
        }

        cy.get('[data-cy="submit-button"]').click();
        cy.get(this.selectors.tenantModal).should('not.exist');

        return this;
    }

    editTenant(tenantIndex, updatedData) {
        cy.get(this.selectors.tenantRow).eq(tenantIndex).within(() => {
            cy.get(this.selectors.editTenantButton).click();
        });

        cy.get(this.selectors.tenantModal).should('be.visible');

        if (updatedData.name) {
            cy.get(this.selectors.tenantNameInput).clear().type(updatedData.name);
        }

        if (updatedData.email) {
            cy.get(this.selectors.tenantEmailInput).clear().type(updatedData.email);
        }

        cy.get('[data-cy="submit-button"]').click();
        cy.get(this.selectors.tenantModal).should('not.exist');

        return this;
    }

    deleteTenant(tenantIndex) {
        cy.get(this.selectors.tenantRow).eq(tenantIndex).within(() => {
            cy.get(this.selectors.deleteTenantButton).click();
        });

        cy.get('[data-cy="confirm-dialog"]').should('be.visible');
        cy.get('[data-cy="confirm-button"]').click();
        cy.get('[data-cy="confirm-dialog"]').should('not.exist');

        return this;
    }

    suspendTenant(tenantIndex) {
        cy.get(this.selectors.tenantRow).eq(tenantIndex).within(() => {
            cy.get(this.selectors.suspendTenantButton).click();
        });

        cy.get('[data-cy="confirm-dialog"]').should('be.visible');
        cy.get('[data-cy="confirm-button"]').click();

        return this;
    }

    activateTenant(tenantIndex) {
        cy.get(this.selectors.tenantRow).eq(tenantIndex).within(() => {
            cy.get(this.selectors.activateTenantButton).click();
        });

        return this;
    }

    verifyTenantInTable(tenantData) {
        cy.get(this.selectors.tenantsTable).should('contain.text', tenantData.name);
        cy.get(this.selectors.tenantsTable).should('contain.text', tenantData.domain);
        cy.get(this.selectors.tenantsTable).should('contain.text', tenantData.email);
        return this;
    }

    verifyTenantCount(expectedCount) {
        cy.get(this.selectors.tenantRow).should('have.length', expectedCount);
        return this;
    }

    searchTenant(searchTerm) {
        this.searchFor(searchTerm);
        cy.get('[data-cy="table-loading"]').should('not.exist');
        return this;
    }

    filterByStatus(status) {
        this.applyFilter(status);
        cy.get('[data-cy="table-loading"]').should('not.exist');
        return this;
    }
}

export class LicensesPage extends PlatformAdminPage {
    constructor() {
        super();
        this.selectors = {
            ...this.selectors,
            licensesTable: '[data-cy="licenses-table"]',
            licenseRow: '[data-cy="license-row"]',
            generateLicenseButton: '[data-cy="generate-license-button"]',
            licenseModal: '[data-cy="license-modal"]',

            // License form fields
            tenantSelect: '[data-cy="tenant-select"]',
            featuresSelect: '[data-cy="features-select"]',
            maxUsersInput: '[data-cy="max-users-input"]',
            expiryDateInput: '[data-cy="expiry-date-input"]',

            // License actions
            renewLicenseButton: '[data-cy="renew-license-button"]',
            revokeLicenseButton: '[data-cy="revoke-license-button"]',
            viewLicenseButton: '[data-cy="view-license-button"]'
        };
    }

    visitLicensesPage() {
        this.navigateToSection('licenses');
        return this;
    }

    generateLicense(licenseData) {
        cy.get(this.selectors.generateLicenseButton).click();
        cy.get(this.selectors.licenseModal).should('be.visible');

        cy.get(this.selectors.tenantSelect).select(licenseData.tenantId);

        licenseData.features.forEach(feature => {
            cy.get(this.selectors.featuresSelect).select(feature, { multiple: true });
        });

        cy.get(this.selectors.maxUsersInput).type(licenseData.maxUsers.toString());
        cy.get(this.selectors.expiryDateInput).type(licenseData.expiryDate);

        cy.get('[data-cy="submit-button"]').click();
        cy.get(this.selectors.licenseModal).should('not.exist');

        return this;
    }

    renewLicense(licenseIndex, newExpiryDate) {
        cy.get(this.selectors.licenseRow).eq(licenseIndex).within(() => {
            cy.get(this.selectors.renewLicenseButton).click();
        });

        cy.get('[data-cy="renew-modal"]').should('be.visible');
        cy.get('[data-cy="new-expiry-date"]').type(newExpiryDate);
        cy.get('[data-cy="confirm-renew"]').click();

        return this;
    }

    revokeLicense(licenseIndex) {
        cy.get(this.selectors.licenseRow).eq(licenseIndex).within(() => {
            cy.get(this.selectors.revokeLicenseButton).click();
        });

        cy.get('[data-cy="confirm-dialog"]').should('be.visible');
        cy.get('[data-cy="confirm-button"]').click();

        return this;
    }

    verifyLicenseStatus(licenseIndex, expectedStatus) {
        cy.get(this.selectors.licenseRow).eq(licenseIndex).within(() => {
            cy.get('[data-cy="license-status"]').should('contain.text', expectedStatus);
        });
        return this;
    }
}