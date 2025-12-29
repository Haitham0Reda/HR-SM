/**
 * Login Page Object Model
 */

export class LoginPage {
    constructor() {
        this.selectors = {
            emailInput: '[data-cy="email-input"]',
            passwordInput: '[data-cy="password-input"]',
            loginButton: '[data-cy="login-button"]',
            forgotPasswordLink: '[data-cy="forgot-password-link"]',
            errorMessage: '[data-cy="error-message"]',
            loadingSpinner: '[data-cy="loading-spinner"]',
            tenantSelector: '[data-cy="tenant-selector"]',
            rememberMeCheckbox: '[data-cy="remember-me-checkbox"]'
        };
    }

    visit(tenantDomain = null) {
        const url = tenantDomain ? `/${tenantDomain}/login` : '/login';
        cy.visit(url);
        return this;
    }

    visitPlatformLogin() {
        cy.visit('http://localhost:3001/login');
        return this;
    }

    enterEmail(email) {
        cy.get(this.selectors.emailInput).clear().type(email);
        return this;
    }

    enterPassword(password) {
        cy.get(this.selectors.passwordInput).clear().type(password);
        return this;
    }

    selectTenant(tenantDomain) {
        cy.get(this.selectors.tenantSelector).select(tenantDomain);
        return this;
    }

    checkRememberMe() {
        cy.get(this.selectors.rememberMeCheckbox).check();
        return this;
    }

    clickLogin() {
        cy.get(this.selectors.loginButton).click();
        return this;
    }

    clickForgotPassword() {
        cy.get(this.selectors.forgotPasswordLink).click();
        return this;
    }

    login(email, password, tenantDomain = null) {
        if (tenantDomain) {
            this.visit(tenantDomain);
        }

        this.enterEmail(email)
            .enterPassword(password)
            .clickLogin();

        return this;
    }

    loginAsTenantUser(userType = 'employee', tenantDomain = 'testcompany') {
        cy.fixture('users').then((users) => {
            const user = users[userType];
            this.login(user.email, user.password, tenantDomain);
        });
        return this;
    }

    loginAsPlatformAdmin() {
        cy.fixture('users').then((users) => {
            const user = users.platformAdmin;
            this.visitPlatformLogin();
            this.enterEmail(user.email)
                .enterPassword(user.password)
                .clickLogin();
        });
        return this;
    }

    expectLoginSuccess() {
        cy.url().should('not.include', '/login');
        cy.get('[data-cy="user-menu"]').should('be.visible');
        return this;
    }

    expectLoginFailure(errorMessage = null) {
        cy.get(this.selectors.errorMessage).should('be.visible');
        if (errorMessage) {
            cy.get(this.selectors.errorMessage).should('contain.text', errorMessage);
        }
        return this;
    }

    expectLoadingState() {
        cy.get(this.selectors.loadingSpinner).should('be.visible');
        return this;
    }

    waitForLoginComplete() {
        cy.get(this.selectors.loadingSpinner).should('not.exist');
        return this;
    }

    verifyFormValidation() {
        // Test empty form submission
        this.clickLogin();
        cy.get('[data-cy="email-error"]').should('be.visible');
        cy.get('[data-cy="password-error"]').should('be.visible');

        // Test invalid email format
        this.enterEmail('invalid-email');
        cy.get('[data-cy="email-error"]').should('contain.text', 'valid email');

        // Test short password
        this.enterPassword('123');
        cy.get('[data-cy="password-error"]').should('contain.text', 'password');

        return this;
    }

    verifyAccessibilityFeatures() {
        // Check form labels
        cy.get(this.selectors.emailInput).should('have.attr', 'aria-label');
        cy.get(this.selectors.passwordInput).should('have.attr', 'aria-label');

        // Check keyboard navigation
        cy.get(this.selectors.emailInput).focus();
        cy.get(this.selectors.emailInput).tab();
        cy.focused().should('have.attr', 'data-cy', 'password-input');

        return this;
    }
}