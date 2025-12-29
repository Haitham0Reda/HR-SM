/**
 * Component testing support file
 */

// Test validation structure
describe('Component Testing Support', () => {
    it('should have mount command available', () => {
        expect(Cypress.Commands._commands).to.have.property('mount');
    });
});

// Import commands for component testing
import './commands';

// Component testing specific setup
import { mount } from 'cypress/react';

// Add mount command for React components
Cypress.Commands.add('mount', mount);

// Component testing configuration
beforeEach(() => {
    // Set up component testing environment
    cy.viewport(1280, 720);
});

// Mock providers for component testing
export const mockProviders = {
    // Redux provider mock
    reduxProvider: (initialState = {}) => {
        return {
            store: {
                getState: () => initialState,
                dispatch: cy.stub(),
                subscribe: cy.stub()
            }
        };
    },

    // Router provider mock
    routerProvider: (initialRoute = '/') => {
        return {
            location: { pathname: initialRoute },
            navigate: cy.stub()
        };
    },

    // Theme provider mock
    themeProvider: {
        theme: {
            colors: {
                primary: '#007bff',
                secondary: '#6c757d',
                success: '#28a745',
                danger: '#dc3545',
                warning: '#ffc107',
                info: '#17a2b8'
            }
        }
    }
};