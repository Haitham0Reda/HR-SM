/**
 * Basic smoke tests to verify core functionality
 */

import { LoginPage } from '../../support/page-objects/LoginPage';
import { DashboardPage } from '../../support/page-objects/DashboardPage';

describe('Smoke Tests - Basic Functionality', () => {
    let loginPage;
    let dashboardPage;

    beforeEach(() => {
        loginPage = new LoginPage();
        dashboardPage = new DashboardPage();

        // Clean up test data before each test
        cy.cleanupTestData();

        // Seed basic test data
        cy.fixture('tenants').then((tenants) => {
            cy.seedTestData('tenant', tenants.testCompany);
        });

        cy.fixture('users').then((users) => {
            cy.seedTestData('user', [
                { ...users.employee, tenantId: 'testcompany' },
                { ...users.admin, tenantId: 'testcompany' }
            ]);
        });
    });

    afterEach(() => {
        // Clean up after each test
        cy.cleanupAfterTest();
    });

    it('should load the application homepage', () => {
        cy.visit('/');
        cy.get('body').should('be.visible');
        cy.title().should('not.be.empty');
    });

    it('should display login page for tenant users', () => {
        loginPage.visit('testcompany');

        cy.get('[data-cy="login-form"]').should('be.visible');
        cy.get('[data-cy="email-input"]').should('be.visible');
        cy.get('[data-cy="password-input"]').should('be.visible');
        cy.get('[data-cy="login-button"]').should('be.visible');
    });

    it('should allow valid user login', () => {
        loginPage.loginAsTenantUser('employee', 'testcompany');

        loginPage.expectLoginSuccess();
        dashboardPage.expectToBeOnDashboard();
    });

    it('should reject invalid login credentials', () => {
        loginPage.visit('testcompany');
        loginPage.login('invalid@test.com', 'wrongpassword');

        loginPage.expectLoginFailure('Invalid credentials');
    });

    it('should display dashboard after successful login', () => {
        loginPage.loginAsTenantUser('employee', 'testcompany');

        dashboardPage.expectToBeOnDashboard();
        dashboardPage.verifyDashboardWidgets();
        dashboardPage.verifyUserMenu();
    });

    it('should allow user logout', () => {
        loginPage.loginAsTenantUser('employee', 'testcompany');
        dashboardPage.expectToBeOnDashboard();

        dashboardPage.logout();
        cy.url().should('include', '/login');
    });

    it('should verify basic navigation', () => {
        loginPage.loginAsTenantUser('admin', 'testcompany');
        dashboardPage.expectToBeOnDashboard();

        // Test navigation to different modules
        dashboardPage.navigateToModule('hrCore');
        cy.url().should('include', '/hr-core');

        dashboardPage.navigateToModule('attendance');
        cy.url().should('include', '/attendance');
    });

    it('should verify responsive design', () => {
        loginPage.loginAsTenantUser('employee', 'testcompany');
        dashboardPage.expectToBeOnDashboard();

        dashboardPage.verifyResponsiveLayout();
    });

    it('should verify page load performance', () => {
        cy.startPerformanceMark('app-load');
        loginPage.loginAsTenantUser('employee', 'testcompany');
        dashboardPage.expectToBeOnDashboard();

        const loadTime = cy.endPerformanceMark('app-load', 5000);
        cy.task('log', `Application loaded in ${loadTime}ms`);
    });

    it('should handle network errors gracefully', () => {
        // Simulate network error
        cy.intercept('GET', '**/api/**', { forceNetworkError: true }).as('networkError');

        loginPage.visit('testcompany');
        loginPage.enterEmail('test@example.com');
        loginPage.enterPassword('password');
        loginPage.clickLogin();

        // Should show network error message
        cy.get('[data-cy="network-error"]').should('be.visible');
    });

    it('should verify basic accessibility features', () => {
        loginPage.visit('testcompany');
        loginPage.verifyAccessibilityFeatures();

        cy.checkAccessibility('[data-cy="login-form"]');
    });

    it('should verify form validation', () => {
        loginPage.visit('testcompany');
        loginPage.verifyFormValidation();
    });

    it('should verify tenant isolation in URLs', () => {
        loginPage.loginAsTenantUser('employee', 'testcompany');

        // Verify URL contains tenant domain
        cy.url().should('include', '/testcompany/');

        // Verify tenant indicator
        dashboardPage.verifyCurrentTenant('testcompany');
    });

    it('should verify API health check', () => {
        cy.apiRequest('GET', '/api/health').then((response) => {
            expect(response.status).to.eq(200);
            expect(response.body).to.have.property('status', 'ok');
        });
    });

    it('should verify database connectivity', () => {
        cy.task('verifyDatabaseConnection').then((result) => {
            expect(result.success).to.be.true;
        });
    });

    it('should verify test data seeding and cleanup', () => {
        // Verify data was seeded
        cy.task('getDatabaseStats').then((stats) => {
            expect(stats.companies).to.be.greaterThan(0);
            expect(stats.users).to.be.greaterThan(0);
        });

        // Clean up data
        cy.cleanupTestData();

        // Verify data was cleaned
        cy.task('getDatabaseStats').then((stats) => {
            expect(stats.companies || 0).to.eq(0);
            expect(stats.users || 0).to.eq(0);
        });
    });
});