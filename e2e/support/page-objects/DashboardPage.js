/**
 * Dashboard Page Object Model
 */

export class DashboardPage {
    constructor() {
        this.selectors = {
            pageContent: '[data-cy="dashboard-page"]',
            userMenu: '[data-cy="user-menu"]',
            logoutButton: '[data-cy="logout-button"]',
            sidebar: '[data-cy="sidebar-menu"]',
            tenantSwitcher: '[data-cy="tenant-switcher"]',
            currentTenant: '[data-cy="current-tenant"]',
            notifications: '[data-cy="notifications"]',
            profileLink: '[data-cy="profile-link"]',
            settingsLink: '[data-cy="settings-link"]',

            // Dashboard widgets
            welcomeWidget: '[data-cy="welcome-widget"]',
            statsWidget: '[data-cy="stats-widget"]',
            recentActivityWidget: '[data-cy="recent-activity-widget"]',
            quickActionsWidget: '[data-cy="quick-actions-widget"]',

            // Module menu items
            hrCoreMenu: '[data-cy="menu-hr-core"]',
            attendanceMenu: '[data-cy="menu-attendance"]',
            payrollMenu: '[data-cy="menu-payroll"]',
            vacationMenu: '[data-cy="menu-vacation"]',
            tasksMenu: '[data-cy="menu-tasks"]',
            documentsMenu: '[data-cy="menu-documents"]',
            missionsMenu: '[data-cy="menu-missions"]',
            overtimeMenu: '[data-cy="menu-overtime"]'
        };
    }

    visit(tenantDomain = 'testcompany') {
        cy.visit(`/${tenantDomain}/dashboard`);
        return this;
    }

    expectToBeOnDashboard() {
        cy.get(this.selectors.pageContent).should('be.visible');
        cy.url().should('include', '/dashboard');
        return this;
    }

    expectWelcomeMessage(userName = null) {
        cy.get(this.selectors.welcomeWidget).should('be.visible');
        if (userName) {
            cy.get(this.selectors.welcomeWidget).should('contain.text', userName);
        }
        return this;
    }

    verifyUserMenu() {
        cy.get(this.selectors.userMenu).should('be.visible');
        cy.get(this.selectors.userMenu).click();
        cy.get(this.selectors.profileLink).should('be.visible');
        cy.get(this.selectors.settingsLink).should('be.visible');
        cy.get(this.selectors.logoutButton).should('be.visible');
        return this;
    }

    logout() {
        cy.get(this.selectors.userMenu).click();
        cy.get(this.selectors.logoutButton).click();
        cy.url().should('include', '/login');
        return this;
    }

    navigateToModule(moduleName) {
        const menuSelector = this.selectors[`${moduleName}Menu`];
        if (menuSelector) {
            cy.get(menuSelector).click();
            cy.url().should('include', `/${moduleName}`);
        } else {
            throw new Error(`Unknown module: ${moduleName}`);
        }
        return this;
    }

    verifyModuleAccess(moduleName, shouldHaveAccess = true) {
        const menuSelector = this.selectors[`${moduleName}Menu`];
        if (shouldHaveAccess) {
            cy.get(menuSelector).should('be.visible');
        } else {
            cy.get(menuSelector).should('not.exist');
        }
        return this;
    }

    verifyAllModulesAccess(enabledModules) {
        const allModules = ['hrCore', 'attendance', 'payroll', 'vacation', 'tasks', 'documents', 'missions', 'overtime'];

        allModules.forEach(module => {
            const shouldHaveAccess = enabledModules.includes(module.replace(/([A-Z])/g, '-$1').toLowerCase());
            this.verifyModuleAccess(module, shouldHaveAccess);
        });

        return this;
    }

    switchTenant(tenantDomain) {
        cy.get(this.selectors.tenantSwitcher).click();
        cy.get(`[data-cy="tenant-option-${tenantDomain}"]`).click();
        cy.url().should('include', `/${tenantDomain}`);
        return this;
    }

    verifyCurrentTenant(expectedTenant) {
        cy.get(this.selectors.currentTenant).should('contain.text', expectedTenant);
        return this;
    }

    verifyDashboardWidgets() {
        cy.get(this.selectors.welcomeWidget).should('be.visible');
        cy.get(this.selectors.statsWidget).should('be.visible');
        cy.get(this.selectors.recentActivityWidget).should('be.visible');
        cy.get(this.selectors.quickActionsWidget).should('be.visible');
        return this;
    }

    verifyStatsWidget(expectedStats = {}) {
        cy.get(this.selectors.statsWidget).should('be.visible');

        if (expectedStats.totalEmployees) {
            cy.get('[data-cy="stat-total-employees"]').should('contain.text', expectedStats.totalEmployees);
        }

        if (expectedStats.presentToday) {
            cy.get('[data-cy="stat-present-today"]').should('contain.text', expectedStats.presentToday);
        }

        if (expectedStats.pendingRequests) {
            cy.get('[data-cy="stat-pending-requests"]').should('contain.text', expectedStats.pendingRequests);
        }

        return this;
    }

    verifyRecentActivity() {
        cy.get(this.selectors.recentActivityWidget).should('be.visible');
        cy.get('[data-cy="activity-list"]').should('be.visible');
        return this;
    }

    verifyQuickActions() {
        cy.get(this.selectors.quickActionsWidget).should('be.visible');
        cy.get('[data-cy="quick-action-button"]').should('have.length.greaterThan', 0);
        return this;
    }

    clickQuickAction(actionName) {
        cy.get(`[data-cy="quick-action-${actionName}"]`).click();
        return this;
    }

    verifyNotifications() {
        cy.get(this.selectors.notifications).should('be.visible');
        return this;
    }

    checkNotificationCount(expectedCount) {
        if (expectedCount > 0) {
            cy.get('[data-cy="notification-badge"]').should('contain.text', expectedCount);
        } else {
            cy.get('[data-cy="notification-badge"]').should('not.exist');
        }
        return this;
    }

    openNotifications() {
        cy.get(this.selectors.notifications).click();
        cy.get('[data-cy="notifications-dropdown"]').should('be.visible');
        return this;
    }

    verifyResponsiveLayout() {
        // Test mobile viewport
        cy.viewport(375, 667);
        cy.get('[data-cy="mobile-menu-toggle"]').should('be.visible');
        cy.get(this.selectors.sidebar).should('not.be.visible');

        // Test tablet viewport
        cy.viewport(768, 1024);
        cy.get('[data-cy="mobile-menu-toggle"]').should('be.visible');

        // Test desktop viewport
        cy.viewport(1280, 720);
        cy.get(this.selectors.sidebar).should('be.visible');

        return this;
    }

    verifyPageLoadPerformance() {
        cy.startPerformanceMark('dashboard-load');
        this.visit();
        cy.get(this.selectors.pageContent).should('be.visible');
        cy.endPerformanceMark('dashboard-load', 3000); // 3 second threshold
        return this;
    }
}