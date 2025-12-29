/**
 * Helper functions for E2E tests
 */

/**
 * Generate test data with unique identifiers
 */
export const generateTestData = {
    user: (overrides = {}) => ({
        email: `test+${Date.now()}@example.com`,
        password: 'TestPassword123!',
        name: 'Test User',
        role: 'employee',
        ...overrides
    }),

    tenant: (overrides = {}) => ({
        name: `Test Company ${Date.now()}`,
        domain: `test${Date.now()}`,
        email: `admin+${Date.now()}@example.com`,
        ...overrides
    }),

    leaveRequest: (overrides = {}) => {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() + 7);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 2);

        return {
            type: 'Annual Leave',
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            reason: 'Personal time off',
            ...overrides
        };
    }
};

/**
 * Date utilities for tests
 */
export const dateUtils = {
    formatDate: (date, format = 'YYYY-MM-DD') => {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');

        switch (format) {
            case 'YYYY-MM-DD':
                return `${year}-${month}-${day}`;
            case 'MM/DD/YYYY':
                return `${month}/${day}/${year}`;
            case 'DD/MM/YYYY':
                return `${day}/${month}/${year}`;
            default:
                return `${year}-${month}-${day}`;
        }
    },

    addDays: (date, days) => {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    },

    subtractDays: (date, days) => {
        const result = new Date(date);
        result.setDate(result.getDate() - days);
        return result;
    },

    isWeekend: (date) => {
        const day = new Date(date).getDay();
        return day === 0 || day === 6; // Sunday or Saturday
    },

    getNextWorkday: (date) => {
        let nextDay = new Date(date);
        do {
            nextDay.setDate(nextDay.getDate() + 1);
        } while (dateUtils.isWeekend(nextDay));
        return nextDay;
    }
};

/**
 * String utilities for tests
 */
export const stringUtils = {
    generateRandomString: (length = 10) => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    },

    generateEmail: (prefix = 'test') => {
        return `${prefix}+${Date.now()}@example.com`;
    },

    slugify: (text) => {
        return text
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }
};

/**
 * Validation utilities
 */
export const validationUtils = {
    isValidEmail: (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    isValidPassword: (password) => {
        // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special char
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        return passwordRegex.test(password);
    },

    isValidPhoneNumber: (phone) => {
        const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
        return phoneRegex.test(phone);
    }
};

/**
 * API utilities for tests
 */
export const apiUtils = {
    makeRequest: (method, endpoint, data = null, headers = {}) => {
        const baseUrl = Cypress.env('apiUrl');
        const options = {
            method,
            url: `${baseUrl}${endpoint}`,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            },
            failOnStatusCode: false
        };

        if (data) {
            options.body = data;
        }

        return cy.request(options);
    },

    authenticatedRequest: (method, endpoint, data = null, token = null) => {
        const authToken = token || window.localStorage.getItem('authToken');
        return apiUtils.makeRequest(method, endpoint, data, {
            'Authorization': `Bearer ${authToken}`
        });
    }
};

/**
 * Database utilities for tests
 */
export const dbUtils = {
    cleanupTestData: () => {
        return cy.task('cleanupDatabase');
    },

    seedData: (type, data) => {
        return cy.task('seedTestData', { type, data });
    },

    createTestUser: (userData) => {
        return cy.task('seedTestData', { type: 'user', data: userData });
    },

    createTestTenant: (tenantData) => {
        return cy.task('seedTestData', { type: 'tenant', data: tenantData });
    }
};

/**
 * UI interaction utilities
 */
export const uiUtils = {
    waitForElement: (selector, timeout = 10000) => {
        return cy.get(selector, { timeout }).should('be.visible');
    },

    waitForElementToDisappear: (selector, timeout = 10000) => {
        return cy.get(selector, { timeout }).should('not.exist');
    },

    scrollToElement: (selector) => {
        return cy.get(selector).scrollIntoView();
    },

    clickOutside: () => {
        return cy.get('body').click(0, 0);
    },

    pressEscape: () => {
        return cy.get('body').type('{esc}');
    },

    pressEnter: () => {
        return cy.get('body').type('{enter}');
    }
};

/**
 * Test environment utilities
 */
export const testUtils = {
    skipOnCondition: (condition, reason) => {
        if (condition) {
            cy.log(`Skipping test: ${reason}`);
            return true;
        }
        return false;
    },

    retryOnFailure: (testFn, maxRetries = 3) => {
        let attempts = 0;
        const runTest = () => {
            attempts++;
            try {
                testFn();
            } catch (error) {
                if (attempts < maxRetries) {
                    cy.log(`Test failed, retrying... (${attempts}/${maxRetries})`);
                    runTest();
                } else {
                    throw error;
                }
            }
        };
        runTest();
    },

    measurePerformance: (actionFn, label) => {
        const startTime = performance.now();
        actionFn();
        const endTime = performance.now();
        const duration = endTime - startTime;
        cy.log(`${label} took ${duration.toFixed(2)}ms`);
        return duration;
    }
};

/**
 * File utilities for tests
 */
export const fileUtils = {
    createTestFile: (fileName, content, mimeType = 'text/plain') => {
        const blob = new Blob([content], { type: mimeType });
        return new File([blob], fileName, { type: mimeType });
    },

    generateCSVContent: (headers, rows) => {
        const csvHeaders = headers.join(',');
        const csvRows = rows.map(row => row.join(',')).join('\n');
        return `${csvHeaders}\n${csvRows}`;
    },

    generateJSONContent: (data) => {
        return JSON.stringify(data, null, 2);
    }
};

/**
 * Error handling utilities
 */
export const errorUtils = {
    expectError: (errorMessage, errorCode = null) => {
        cy.get('[data-cy="error-message"]').should('be.visible');
        if (errorMessage) {
            cy.get('[data-cy="error-message"]').should('contain.text', errorMessage);
        }
        if (errorCode) {
            cy.get('[data-cy="error-code"]').should('contain.text', errorCode);
        }
    },

    expectValidationError: (fieldName, errorMessage) => {
        cy.get(`[data-cy="${fieldName}-error"]`).should('be.visible');
        if (errorMessage) {
            cy.get(`[data-cy="${fieldName}-error"]`).should('contain.text', errorMessage);
        }
    },

    clearErrors: () => {
        cy.get('[data-cy="clear-errors"]').click();
        cy.get('[data-cy="error-message"]').should('not.exist');
    }
};

/**
 * Multi-tenant utilities
 */
export const tenantUtils = {
    switchToTenant: (tenantDomain) => {
        cy.get('[data-cy="tenant-switcher"]').click();
        cy.get(`[data-cy="tenant-option-${tenantDomain}"]`).click();
        cy.url().should('include', `/${tenantDomain}`);
    },

    verifyTenantContext: (expectedTenant) => {
        cy.get('[data-cy="current-tenant"]').should('contain.text', expectedTenant);
    },

    verifyDataIsolation: (tenantA, tenantB) => {
        // Switch to tenant A and create data
        tenantUtils.switchToTenant(tenantA);
        // Verify tenant B cannot see tenant A's data
        tenantUtils.switchToTenant(tenantB);
        // Add specific isolation checks here
    }
};

/**
 * License utilities
 */
export const licenseUtils = {
    verifyModuleAccess: (moduleName, shouldHaveAccess = true) => {
        if (shouldHaveAccess) {
            cy.get(`[data-cy="module-${moduleName}"]`).should('be.visible');
        } else {
            cy.get(`[data-cy="module-${moduleName}"]`).should('not.exist');
        }
    },

    verifyLicenseStatus: (expectedStatus) => {
        cy.get('[data-cy="license-status"]').should('contain.text', expectedStatus);
    },

    simulateLicenseExpiry: () => {
        // Mock expired license response
        cy.intercept('GET', '**/license/validate', {
            statusCode: 403,
            body: { error: 'License expired' }
        }).as('expiredLicense');
    }
};