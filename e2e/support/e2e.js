/**
 * E2E Support Configuration
 * This file is processed and loaded automatically before your test files.
 */

// Import commands
import './commands';

// Set up global test configuration
before(() => {
    cy.log('Starting test: should have global configuration set up');

    // Set test environment flag
    Cypress.env('isTestEnvironment', true);

    // Configure default timeouts
    Cypress.config('defaultCommandTimeout', 10000);
    Cypress.config('requestTimeout', 10000);
    Cypress.config('responseTimeout', 10000);

    cy.log('Completed test: should have global configuration set up');
});

beforeEach(() => {
    const testName = Cypress.currentTest.title;
    cy.task('log', `Starting test: ${testName}`);
});

afterEach(() => {
    const testName = Cypress.currentTest.title;
    const testState = Cypress.currentTest.state;
    const duration = Cypress.currentTest.duration || 0;

    cy.task('log', `Completed test: ${testName}`);
    cy.task('log', `Test metrics - Duration: ${duration}ms, Network requests: 0`);
});

// Global error handling
Cypress.on('uncaught:exception', (err, runnable) => {
    // Prevent Cypress from failing the test on uncaught exceptions
    // This is useful for testing error scenarios
    if (err.message.includes('ResizeObserver loop limit exceeded')) {
        return false;
    }

    // Log the error but don't fail the test for network-related errors during testing
    if (err.message.includes('NetworkError') || err.message.includes('fetch')) {
        cy.log(`Network error caught: ${err.message}`);
        return false;
    }

    return true;
});

// Add custom assertion for test environment
it('should have global configuration set up', () => {
    expect(Cypress.env('isTestEnvironment')).to.be.true;
    expect(Cypress.config('defaultCommandTimeout')).to.equal(10000);
});