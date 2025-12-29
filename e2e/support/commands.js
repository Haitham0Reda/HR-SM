/**
 * Custom Cypress commands for HR-SM E2E testing
 */

// Authentication commands
Cypress.Commands.add('loginAsTenantUser', (userType = 'employee', tenantDomain = 'testcompany') => {
    cy.fixture('users').then((users) => {
        const user = users[userType];
        cy.visit(`http://localhost:3000/${tenantDomain}/login`);
        cy.get('[data-cy="email-input"]').type(user.email);
        cy.get('[data-cy="password-input"]').type(user.password);
        cy.get('[data-cy="login-button"]').click();
        cy.url().should('not.include', '/login');
        cy.get('[data-cy="user-menu"]').should('be.visible');
    });
});

Cypress.Commands.add('loginAsPlatformAdmin', () => {
    cy.fixture('users').then((users) => {
        const user = users.platformAdmin;
        cy.visit('http://localhost:3001/login');
        cy.get('[data-cy="email-input"]').type(user.email);
        cy.get('[data-cy="password-input"]').type(user.password);
        cy.get('[data-cy="login-button"]').click();
        cy.url().should('include', '/dashboard');
        cy.get('[data-cy="platform-header"]').should('be.visible');
    });
});

Cypress.Commands.add('logout', () => {
    cy.get('[data-cy="user-menu"]').click();
    cy.get('[data-cy="logout-button"]').click();
    cy.url().should('include', '/login');
});

// Navigation commands
Cypress.Commands.add('navigateToModule', (moduleName) => {
    cy.get('[data-cy="sidebar-menu"]').should('be.visible');
    cy.get(`[data-cy="menu-${moduleName}"]`).click();
    cy.url().should('include', `/${moduleName}`);
});

Cypress.Commands.add('navigateToPlatformSection', (sectionName) => {
    cy.get('[data-cy="platform-sidebar"]').should('be.visible');
    cy.get(`[data-cy="platform-menu-${sectionName}"]`).click();
    cy.url().should('include', `/${sectionName}`);
});

// Form filling commands
Cypress.Commands.add('fillForm', (formData) => {
    Object.keys(formData).forEach((field) => {
        const value = formData[field];
        const selector = `[data-cy="${field}-input"]`;

        if (typeof value === 'boolean') {
            if (value) {
                cy.get(selector).check();
            } else {
                cy.get(selector).uncheck();
            }
        } else if (Array.isArray(value)) {
            // Handle multi-select
            cy.get(selector).click();
            value.forEach((option) => {
                cy.get(`[data-cy="${field}-option-${option}"]`).click();
            });
        } else {
            cy.get(selector).clear().type(value.toString());
        }
    });
});

Cypress.Commands.add('submitForm', (formSelector = '[data-cy="form"]') => {
    cy.get(formSelector).within(() => {
        cy.get('[data-cy="submit-button"]').click();
    });
});

// Table and list operations
Cypress.Commands.add('searchInTable', (searchTerm) => {
    cy.get('[data-cy="search-input"]').clear().type(searchTerm);
    cy.get('[data-cy="search-button"]').click();
    cy.get('[data-cy="table-loading"]').should('not.exist');
});

Cypress.Commands.add('sortTableBy', (column, direction = 'asc') => {
    cy.get(`[data-cy="sort-${column}"]`).click();
    if (direction === 'desc') {
        cy.get(`[data-cy="sort-${column}"]`).click();
    }
    cy.get('[data-cy="table-loading"]').should('not.exist');
});

Cypress.Commands.add('selectTableRow', (rowIndex) => {
    cy.get('[data-cy="table-row"]').eq(rowIndex).within(() => {
        cy.get('[data-cy="row-checkbox"]').check();
    });
});

Cypress.Commands.add('clickTableAction', (rowIndex, action) => {
    cy.get('[data-cy="table-row"]').eq(rowIndex).within(() => {
        cy.get(`[data-cy="action-${action}"]`).click();
    });
});

// Modal and dialog operations
Cypress.Commands.add('openModal', (modalTrigger) => {
    cy.get(`[data-cy="${modalTrigger}"]`).click();
    cy.get('[data-cy="modal"]').should('be.visible');
});

Cypress.Commands.add('closeModal', () => {
    cy.get('[data-cy="modal-close"]').click();
    cy.get('[data-cy="modal"]').should('not.exist');
});

Cypress.Commands.add('confirmDialog', () => {
    cy.get('[data-cy="confirm-dialog"]').should('be.visible');
    cy.get('[data-cy="confirm-button"]').click();
    cy.get('[data-cy="confirm-dialog"]').should('not.exist');
});

Cypress.Commands.add('cancelDialog', () => {
    cy.get('[data-cy="confirm-dialog"]').should('be.visible');
    cy.get('[data-cy="cancel-button"]').click();
    cy.get('[data-cy="confirm-dialog"]').should('not.exist');
});

// File upload commands
Cypress.Commands.add('uploadFile', (fileName, inputSelector = '[data-cy="file-input"]') => {
    cy.fixture(fileName, 'base64').then((fileContent) => {
        cy.get(inputSelector).selectFile({
            contents: Cypress.Buffer.from(fileContent, 'base64'),
            fileName: fileName,
            mimeType: 'application/octet-stream'
        });
    });
});

// Date picker commands
Cypress.Commands.add('selectDate', (date, inputSelector = '[data-cy="date-input"]') => {
    cy.get(inputSelector).click();
    cy.get('[data-cy="date-picker"]').should('be.visible');

    if (typeof date === 'string') {
        cy.get(inputSelector).clear().type(date);
    } else {
        // Handle date object
        const day = date.getDate();
        const month = date.getMonth();
        const year = date.getFullYear();

        cy.get('[data-cy="year-select"]').select(year.toString());
        cy.get('[data-cy="month-select"]').select(month.toString());
        cy.get(`[data-cy="day-${day}"]`).click();
    }
});

// Notification and toast commands
Cypress.Commands.add('expectSuccessMessage', (message) => {
    cy.get('[data-cy="success-toast"]').should('be.visible');
    if (message) {
        cy.get('[data-cy="success-toast"]').should('contain.text', message);
    }
    cy.get('[data-cy="success-toast"]').should('not.exist', { timeout: 10000 });
});

Cypress.Commands.add('expectErrorMessage', (message) => {
    cy.get('[data-cy="error-toast"]').should('be.visible');
    if (message) {
        cy.get('[data-cy="error-toast"]').should('contain.text', message);
    }
});

// API commands
Cypress.Commands.add('apiRequest', (method, url, body = null, headers = {}) => {
    const options = {
        method,
        url: `${Cypress.env('apiUrl')}${url}`,
        headers: {
            'Content-Type': 'application/json',
            ...headers
        },
        failOnStatusCode: false
    };

    if (body) {
        options.body = body;
    }

    return cy.request(options);
});

Cypress.Commands.add('apiLogin', (userType = 'employee', tenantDomain = 'testcompany') => {
    cy.fixture('users').then((users) => {
        const user = users[userType];
        return cy.apiRequest('POST', `/auth/login`, {
            email: user.email,
            password: user.password,
            tenantDomain: tenantDomain
        }).then((response) => {
            expect(response.status).to.eq(200);
            const token = response.body.token;
            window.localStorage.setItem('authToken', token);
            return token;
        });
    });
});

// Database commands
Cypress.Commands.add('cleanupTestData', () => {
    cy.task('cleanupDatabase');
});

Cypress.Commands.add('seedTestData', (dataType, data) => {
    cy.task('seedTestData', { type: dataType, data });
});

// Wait commands
Cypress.Commands.add('waitForPageLoad', () => {
    cy.get('[data-cy="loading-spinner"]').should('not.exist');
    cy.get('[data-cy="page-content"]').should('be.visible');
});

Cypress.Commands.add('waitForTableLoad', () => {
    cy.get('[data-cy="table-loading"]').should('not.exist');
    cy.get('[data-cy="table-content"]').should('be.visible');
});

// Assertion commands
Cypress.Commands.add('shouldBeOnPage', (pageName) => {
    cy.url().should('include', `/${pageName}`);
    cy.get(`[data-cy="${pageName}-page"]`).should('be.visible');
});

Cypress.Commands.add('shouldHaveTableRows', (count) => {
    if (count === 0) {
        cy.get('[data-cy="empty-table"]').should('be.visible');
    } else {
        cy.get('[data-cy="table-row"]').should('have.length', count);
    }
});

Cypress.Commands.add('shouldContainText', (selector, text) => {
    cy.get(selector).should('contain.text', text);
});

// Multi-tenant commands
Cypress.Commands.add('switchTenant', (tenantDomain) => {
    cy.get('[data-cy="tenant-switcher"]').click();
    cy.get(`[data-cy="tenant-option-${tenantDomain}"]`).click();
    cy.url().should('include', `/${tenantDomain}`);
    cy.waitForPageLoad();
});

Cypress.Commands.add('verifyTenantIsolation', (tenantDomain) => {
    cy.url().should('include', `/${tenantDomain}`);
    cy.get('[data-cy="tenant-indicator"]').should('contain.text', tenantDomain);
});

// License validation commands
Cypress.Commands.add('verifyModuleAccess', (moduleName, shouldHaveAccess = true) => {
    if (shouldHaveAccess) {
        cy.get(`[data-cy="menu-${moduleName}"]`).should('be.visible');
        cy.navigateToModule(moduleName);
        cy.get(`[data-cy="${moduleName}-page"]`).should('be.visible');
    } else {
        cy.get(`[data-cy="menu-${moduleName}"]`).should('not.exist');
    }
});

// Performance monitoring commands
Cypress.Commands.add('measurePageLoadTime', (pageName) => {
    const startTime = Date.now();
    cy.visit(`/${pageName}`);
    cy.waitForPageLoad().then(() => {
        const loadTime = Date.now() - startTime;
        cy.task('log', `Page ${pageName} loaded in ${loadTime}ms`);
        expect(loadTime).to.be.lessThan(5000); // 5 second threshold
    });
});

// Error handling commands
Cypress.Commands.add('handleNetworkError', () => {
    cy.intercept('**', { forceNetworkError: true }).as('networkError');
    cy.get('[data-cy="network-error"]').should('be.visible');
    cy.get('[data-cy="retry-button"]').click();
});

Cypress.Commands.add('cleanupAfterTest', () => {
    cy.task('cleanupDatabase');
});

// Accessibility testing commands
Cypress.Commands.add('checkAccessibility', (selector = 'body') => {
    // Basic accessibility check - in a real implementation, you would use cypress-axe
    cy.get(selector).should('be.visible');

    // Check for basic accessibility attributes
    cy.get(selector).within(() => {
        // Check for proper heading structure
        cy.get('h1, h2, h3, h4, h5, h6').should('exist');

        // Check for alt text on images
        cy.get('img').each(($img) => {
            cy.wrap($img).should('have.attr', 'alt');
        });

        // Check for form labels
        cy.get('input, select, textarea').each(($input) => {
            const id = $input.attr('id');
            if (id) {
                cy.get(`label[for="${id}"]`).should('exist');
            }
        });
    });
});

// Performance monitoring commands
Cypress.Commands.add('startPerformanceMark', (markName) => {
    cy.window().then((win) => {
        win.performance.mark(`${markName}-start`);
    });
});

Cypress.Commands.add('endPerformanceMark', (markName, threshold = 5000) => {
    cy.window().then((win) => {
        win.performance.mark(`${markName}-end`);
        win.performance.measure(markName, `${markName}-start`, `${markName}-end`);

        const measure = win.performance.getEntriesByName(markName)[0];
        expect(measure.duration).to.be.lessThan(threshold);

        cy.task('log', `Performance: ${markName} took ${measure.duration.toFixed(2)}ms`);
    });
});