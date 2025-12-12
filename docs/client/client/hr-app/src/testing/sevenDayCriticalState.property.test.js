/**
 * Property-Based Tests for 7-Day Critical State
 * 
 * Feature: feature-productization, Property 42: 7-Day Critical State
 * Validates: Requirements 12.4
 * 
 * This test verifies that for any license expiring within 7 days,
 * the module should be highlighted with a critical state on the status page.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import axios from 'axios';
import fc from 'fast-check';

// Mock axios
jest.mock('axios');

// Mock auth service
jest.mock('../services/auth.service', () => ({
    getCurrentUser: jest.fn(),
    getProfile: jest.fn(),
    login: jest.fn(),
    logout: jest.fn()
}));

// Mock survey service
jest.mock('../services/survey.service', () => ({
    getMySurveys: jest.fn()
}));

// Mock AuthContext
jest.mock('../contexts/AuthContext', () => {
    const React = require('react');
    return {
        useAuth: jest.fn(),
        AuthProvider: ({ children }) => <div>{children}</div>
    };
});

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    BrowserRouter: ({ children }) => <div>{children}</div>,
    useNavigate: () => mockNavigate,
    Link: ({ children, to }) => <a href={to}>{children}</a>
}));

// Import components after mocks
import { LicenseProvider, useLicense } from '../context/LicenseContext';

/**
 * Test component that displays license status with critical states
 * This simulates the LicenseStatusPage behavior
 */
const LicenseStatusCard = ({ moduleKey, moduleName }) => {
    const { getModuleLicense, getDaysUntilExpiration, isExpiringSoon } = useLicense();
    
    const license = getModuleLicense(moduleKey);
    const daysUntil = getDaysUntilExpiration(moduleKey);
    const expiringSoon = isExpiringSoon(moduleKey, 30);
    const critical = isExpiringSoon(moduleKey, 7);

    if (!license || !license.enabled) {
        return null;
    }

    // Determine warning state
    let warningState = 'normal';
    let warningColor = 'success';
    
    if (critical) {
        warningState = 'critical';
        warningColor = 'error';
    } else if (expiringSoon) {
        warningState = 'warning';
        warningColor = 'warning';
    }

    return (
        <div 
            data-testid={`license-card-${moduleKey}`}
            data-warning-state={warningState}
            role="article"
            aria-label={`${moduleName} license status`}
        >
            <h3>{moduleName}</h3>
            <div data-testid="license-status">
                Status: {license.status}
            </div>
            {license.expiresAt && (
                <div data-testid="expiration-info">
                    <span data-testid="expiration-date">
                        Expires: {new Date(license.expiresAt).toLocaleDateString()}
                    </span>
                    {daysUntil !== null && (
                        <span data-testid="days-until-expiration">
                            {daysUntil} days remaining
                        </span>
                    )}
                </div>
            )}
            {warningState !== 'normal' && (
                <div 
                    data-testid="warning-indicator"
                    data-severity={warningColor}
                    role="alert"
                    aria-live="assertive"
                >
                    {warningState === 'critical' ? (
                        <span>Critical: License expires soon!</span>
                    ) : (
                        <span>Warning: License expiring within 30 days</span>
                    )}
                </div>
            )}
            {critical && (
                <div data-testid="renewal-actions">
                    <button data-testid="renew-button">Renew License</button>
                    <button data-testid="contact-support-button">Contact Support</button>
                </div>
            )}
        </div>
    );
};

describe('7-Day Critical State - Property-Based Tests', () => {
    const theme = createTheme();

    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    // Set longer timeout for property-based tests
    jest.setTimeout(30000);

    /**
     * Helper function to create a date N days from now
     */
    const daysFromNow = (days) => {
        const date = new Date();
        date.setDate(date.getDate() + days);
        return date.toISOString();
    };

    /**
     * Feature: feature-productization, Property 42: 7-Day Critical State
     * 
     * Property: For any license expiring within 7 days,
     * the module should be highlighted with a critical state on the status page.
     * 
     * This property ensures that administrators receive urgent warnings about
     * imminent license expirations, as required by Requirement 12.4.
     */
    test('Property 42: 7-Day Critical State', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate arbitrary license scenarios
                fc.record({
                    moduleKey: fc.constantFrom(
                        'attendance',
                        'leave',
                        'payroll',
                        'documents',
                        'communication',
                        'reporting',
                        'tasks'
                    ),
                    moduleName: fc.string({ minLength: 5, maxLength: 50 }),
                    // Generate days between 1 and 7 (critical range)
                    daysUntilExpiration: fc.integer({ min: 1, max: 7 }),
                    tier: fc.constantFrom('starter', 'business', 'enterprise')
                }),
                async ({ moduleKey, moduleName, daysUntilExpiration, tier }) => {
                    const expiresAt = daysFromNow(daysUntilExpiration);

                    // Mock API responses for LicenseContext
                    axios.get.mockImplementation((url) => {
                        if (url.includes('/licenses/')) {
                            if (url.endsWith('/usage')) {
                                return Promise.resolve({
                                    data: {
                                        data: []
                                    }
                                });
                            } else {
                                return Promise.resolve({
                                    data: {
                                        data: {
                                            modules: [{
                                                key: moduleKey,
                                                enabled: true,
                                                tier: tier,
                                                limits: {
                                                    employees: 100,
                                                    storage: 1000000,
                                                    apiCalls: 10000
                                                },
                                                activatedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
                                                expiresAt: expiresAt
                                            }],
                                            status: 'active',
                                            billingCycle: 'monthly'
                                        }
                                    }
                                });
                            }
                        }
                        return Promise.reject(new Error('Unknown URL'));
                    });

                    // Setup useAuth mock
                    const { useAuth } = require('../context/AuthContext');
                    useAuth.mockReturnValue({
                        isAuthenticated: true,
                        user: {
                            tenantId: 'test-tenant-123',
                            role: 'admin'
                        }
                    });

                    // Render the component
                    const { container } = render(
                        <ThemeProvider theme={theme}>
                            <LicenseProvider>
                                <LicenseStatusCard
                                    moduleKey={moduleKey}
                                    moduleName={moduleName}
                                />
                            </LicenseProvider>
                        </ThemeProvider>
                    );

                    // Wait for component to render with license data
                    await waitFor(() => {
                        expect(screen.getByTestId(`license-card-${moduleKey}`)).toBeInTheDocument();
                    }, { timeout: 3000 });

                    // Verify the card is rendered
                    const card = screen.getByTestId(`license-card-${moduleKey}`);
                    expect(card).toBeInTheDocument();

                    // Verify warning state is set to 'critical' (not 'warning' or 'normal')
                    expect(card).toHaveAttribute('data-warning-state', 'critical');

                    // Verify warning indicator is present
                    const warningIndicator = screen.getByTestId('warning-indicator');
                    expect(warningIndicator).toBeInTheDocument();
                    expect(warningIndicator).toHaveAttribute('role', 'alert');
                    expect(warningIndicator).toHaveAttribute('data-severity', 'error');
                    expect(warningIndicator).toHaveAttribute('aria-live', 'assertive');

                    // Verify critical message is displayed
                    const warningText = warningIndicator.textContent;
                    expect(warningText).toContain('Critical');
                    expect(warningText).toContain('expires soon');

                    // Verify expiration information is displayed
                    const expirationInfo = screen.getByTestId('expiration-info');
                    expect(expirationInfo).toBeInTheDocument();

                    // Verify days until expiration is shown
                    const daysDisplay = screen.getByTestId('days-until-expiration');
                    expect(daysDisplay).toBeInTheDocument();
                    expect(daysDisplay.textContent).toContain(`${daysUntilExpiration} days`);

                    // Verify expiration date is displayed
                    const expirationDate = screen.getByTestId('expiration-date');
                    expect(expirationDate).toBeInTheDocument();
                    expect(expirationDate.textContent).toContain('Expires:');

                    // Verify module name is displayed
                    expect(card.textContent).toContain(moduleName);

                    // Verify status is active
                    const statusDisplay = screen.getByTestId('license-status');
                    expect(statusDisplay.textContent).toContain('active');

                    // Verify renewal actions are present (as per Requirement 12.5)
                    const renewalActions = screen.getByTestId('renewal-actions');
                    expect(renewalActions).toBeInTheDocument();

                    const renewButton = screen.getByTestId('renew-button');
                    expect(renewButton).toBeInTheDocument();
                    expect(renewButton.textContent).toContain('Renew');

                    const contactButton = screen.getByTestId('contact-support-button');
                    expect(contactButton).toBeInTheDocument();
                    expect(contactButton.textContent).toContain('Contact Support');
                }
            ),
            { numRuns: 100 } // Run 100 iterations as specified in design
        );
    });

    /**
     * Additional property: No critical state beyond 7 days
     * 
     * This ensures that licenses expiring more than 7 days in the future
     * do NOT show a critical state (they may show warning if within 30 days).
     */
    test('Property 42.1: No critical state beyond 7 days', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    moduleKey: fc.constantFrom('attendance', 'leave', 'payroll'),
                    moduleName: fc.string({ minLength: 5, maxLength: 50 }),
                    // Generate days beyond 7 days
                    daysUntilExpiration: fc.integer({ min: 8, max: 365 }),
                    tier: fc.constantFrom('starter', 'business', 'enterprise')
                }),
                async ({ moduleKey, moduleName, daysUntilExpiration, tier }) => {
                    const expiresAt = daysFromNow(daysUntilExpiration);

                    // Mock API responses
                    axios.get.mockImplementation((url) => {
                        if (url.includes('/licenses/')) {
                            if (url.endsWith('/usage')) {
                                return Promise.resolve({
                                    data: {
                                        data: []
                                    }
                                });
                            } else {
                                return Promise.resolve({
                                    data: {
                                        data: {
                                            modules: [{
                                                key: moduleKey,
                                                enabled: true,
                                                tier: tier,
                                                limits: {
                                                    employees: 100
                                                },
                                                activatedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
                                                expiresAt: expiresAt
                                            }],
                                            status: 'active',
                                            billingCycle: 'monthly'
                                        }
                                    }
                                });
                            }
                        }
                        return Promise.reject(new Error('Unknown URL'));
                    });

                    // Setup useAuth mock
                    const { useAuth } = require('../context/AuthContext');
                    useAuth.mockReturnValue({
                        isAuthenticated: true,
                        user: {
                            tenantId: 'test-tenant-123',
                            role: 'admin'
                        }
                    });

                    // Render the component
                    const { container } = render(
                        <ThemeProvider theme={theme}>
                            <LicenseProvider>
                                <LicenseStatusCard
                                    moduleKey={moduleKey}
                                    moduleName={moduleName}
                                />
                            </LicenseProvider>
                        </ThemeProvider>
                    );

                    // Wait for component to render
                    await waitFor(() => {
                        expect(screen.getByTestId(`license-card-${moduleKey}`)).toBeInTheDocument();
                    }, { timeout: 3000 });

                    const card = screen.getByTestId(`license-card-${moduleKey}`);

                    // Verify warning state is NOT 'critical'
                    expect(card).not.toHaveAttribute('data-warning-state', 'critical');

                    // If within 30 days, it may be 'warning', otherwise 'normal'
                    const warningState = card.getAttribute('data-warning-state');
                    if (daysUntilExpiration <= 30) {
                        expect(warningState).toBe('warning');
                    } else {
                        expect(warningState).toBe('normal');
                    }

                    // Verify critical message is NOT displayed
                    const warningIndicator = screen.queryByTestId('warning-indicator');
                    if (warningIndicator) {
                        expect(warningIndicator.textContent).not.toContain('Critical');
                    }

                    // Verify renewal actions are NOT present (only shown for critical)
                    expect(screen.queryByTestId('renewal-actions')).not.toBeInTheDocument();
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Additional property: Critical state has higher priority than warning
     * 
     * This ensures that when a license is within 7 days (which is also within 30 days),
     * the critical state is displayed, not the warning state.
     */
    test('Property 42.2: Critical state overrides warning state', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    moduleKey: fc.constantFrom('attendance', 'documents', 'tasks'),
                    moduleName: fc.string({ minLength: 5, maxLength: 50 }),
                    // Generate days within critical range (1-7 days)
                    daysUntilExpiration: fc.integer({ min: 1, max: 7 }),
                    tier: fc.constantFrom('starter', 'business', 'enterprise')
                }),
                async ({ moduleKey, moduleName, daysUntilExpiration, tier }) => {
                    const expiresAt = daysFromNow(daysUntilExpiration);

                    // Mock API responses
                    axios.get.mockImplementation((url) => {
                        if (url.includes('/licenses/')) {
                            if (url.endsWith('/usage')) {
                                return Promise.resolve({
                                    data: {
                                        data: []
                                    }
                                });
                            } else {
                                return Promise.resolve({
                                    data: {
                                        data: {
                                            modules: [{
                                                key: moduleKey,
                                                enabled: true,
                                                tier: tier,
                                                limits: {
                                                    employees: 100
                                                },
                                                activatedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
                                                expiresAt: expiresAt
                                            }],
                                            status: 'active',
                                            billingCycle: 'monthly'
                                        }
                                    }
                                });
                            }
                        }
                        return Promise.reject(new Error('Unknown URL'));
                    });

                    // Setup useAuth mock
                    const { useAuth } = require('../context/AuthContext');
                    useAuth.mockReturnValue({
                        isAuthenticated: true,
                        user: {
                            tenantId: 'test-tenant-123',
                            role: 'admin'
                        }
                    });

                    // Render the component
                    const { container } = render(
                        <ThemeProvider theme={theme}>
                            <LicenseProvider>
                                <LicenseStatusCard
                                    moduleKey={moduleKey}
                                    moduleName={moduleName}
                                />
                            </LicenseProvider>
                        </ThemeProvider>
                    );

                    // Wait for component to render
                    await waitFor(() => {
                        expect(screen.getByTestId(`license-card-${moduleKey}`)).toBeInTheDocument();
                    }, { timeout: 3000 });

                    const card = screen.getByTestId(`license-card-${moduleKey}`);

                    // Verify warning state is 'critical' (not 'warning')
                    expect(card).toHaveAttribute('data-warning-state', 'critical');

                    // Verify warning indicator shows critical severity
                    const warningIndicator = screen.getByTestId('warning-indicator');
                    expect(warningIndicator).toHaveAttribute('data-severity', 'error');

                    // Verify critical message is displayed (not warning message)
                    expect(warningIndicator.textContent).toContain('Critical');
                    expect(warningIndicator.textContent).not.toContain('30 days');

                    // Verify renewal actions are present
                    expect(screen.getByTestId('renewal-actions')).toBeInTheDocument();
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Additional property: Licenses without expiration dates show no critical state
     * 
     * This ensures that perpetual or unlimited licenses don't show critical warnings.
     */
    test('Property 42.3: No critical state for licenses without expiration', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    moduleKey: fc.constantFrom('attendance', 'leave', 'payroll'),
                    moduleName: fc.string({ minLength: 5, maxLength: 50 }),
                    tier: fc.constantFrom('starter', 'business', 'enterprise')
                }),
                async ({ moduleKey, moduleName, tier }) => {
                    // Mock API responses - no expiresAt field
                    axios.get.mockImplementation((url) => {
                        if (url.includes('/licenses/')) {
                            if (url.endsWith('/usage')) {
                                return Promise.resolve({
                                    data: {
                                        data: []
                                    }
                                });
                            } else {
                                return Promise.resolve({
                                    data: {
                                        data: {
                                            modules: [{
                                                key: moduleKey,
                                                enabled: true,
                                                tier: tier,
                                                limits: {
                                                    employees: 100
                                                },
                                                activatedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
                                                // No expiresAt field
                                            }],
                                            status: 'active',
                                            billingCycle: 'monthly'
                                        }
                                    }
                                });
                            }
                        }
                        return Promise.reject(new Error('Unknown URL'));
                    });

                    // Setup useAuth mock
                    const { useAuth } = require('../context/AuthContext');
                    useAuth.mockReturnValue({
                        isAuthenticated: true,
                        user: {
                            tenantId: 'test-tenant-123',
                            role: 'admin'
                        }
                    });

                    // Render the component
                    const { container } = render(
                        <ThemeProvider theme={theme}>
                            <LicenseProvider>
                                <LicenseStatusCard
                                    moduleKey={moduleKey}
                                    moduleName={moduleName}
                                />
                            </LicenseProvider>
                        </ThemeProvider>
                    );

                    // Wait for component to render
                    await waitFor(() => {
                        expect(screen.getByTestId(`license-card-${moduleKey}`)).toBeInTheDocument();
                    }, { timeout: 3000 });

                    const card = screen.getByTestId(`license-card-${moduleKey}`);

                    // Verify warning state is 'normal'
                    expect(card).toHaveAttribute('data-warning-state', 'normal');

                    // Verify warning indicator is NOT present
                    expect(screen.queryByTestId('warning-indicator')).not.toBeInTheDocument();

                    // Verify renewal actions are NOT present
                    expect(screen.queryByTestId('renewal-actions')).not.toBeInTheDocument();

                    // Verify expiration info is NOT displayed
                    expect(screen.queryByTestId('expiration-info')).not.toBeInTheDocument();
                }
            ),
            { numRuns: 50 }
        );
    });
});
