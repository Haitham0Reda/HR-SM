/**
 * Property-Based Tests for Usage Warning Display
 * 
 * Feature: feature-productization, Property 14: Usage Warning Display
 * Validates: Requirements 4.4
 * 
 * This test verifies that for any module usage metric that exceeds 80% of its limit,
 * a warning banner should be displayed to administrators.
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
jest.mock('../context/AuthContext', () => {
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
import UsageWarningBanner from '../components/license/UsageWarningBanner';
import { LicenseProvider } from '../context/LicenseContext';

describe('Usage Warning Display - Property-Based Tests', () => {
    const theme = createTheme();

    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    /**
     * Feature: feature-productization, Property 14: Usage Warning Display
     * 
     * Property: For any module usage metric that exceeds 80% of its limit,
     * a warning banner should be displayed to administrators.
     * 
     * This property ensures that users are warned when approaching usage limits,
     * as required by Requirement 4.4.
     */
    test('Property 14: Usage Warning Display', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate arbitrary usage scenarios
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
                    limitType: fc.constantFrom('employees', 'storage', 'apiCalls'),
                    // Generate usage percentage between 80% and 100%
                    percentage: fc.integer({ min: 80, max: 100 }),
                    // Generate reasonable limit values
                    limit: fc.integer({ min: 100, max: 10000 })
                }),
                async ({ moduleKey, moduleName, limitType, percentage, limit }) => {
                    // Calculate current usage based on percentage
                    const current = Math.floor((limit * percentage) / 100);

                    const usage = {
                        current,
                        limit,
                        percentage
                    };

                    // Mock API responses for LicenseContext
                    axios.get.mockImplementation((url) => {
                        if (url.includes('/licenses/')) {
                            if (url.endsWith('/usage')) {
                                return Promise.resolve({
                                    data: {
                                        data: [{
                                            moduleKey,
                                            usage: {
                                                [limitType]: usage
                                            },
                                            limits: {
                                                [limitType]: limit
                                            },
                                            warnings: [],
                                            violations: []
                                        }]
                                    }
                                });
                            } else {
                                return Promise.resolve({
                                    data: {
                                        data: {
                                            modules: [{
                                                key: moduleKey,
                                                enabled: true,
                                                tier: 'business',
                                                limits: {
                                                    [limitType]: limit
                                                }
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
                                <UsageWarningBanner
                                    moduleKey={moduleKey}
                                    moduleName={moduleName}
                                    limitType={limitType}
                                    usage={usage}
                                />
                            </LicenseProvider>
                        </ThemeProvider>
                    );

                    // Wait for component to render
                    await waitFor(() => {
                        expect(container.querySelector('[role="alert"]')).toBeInTheDocument();
                    }, { timeout: 3000 });

                    // Verify warning banner is displayed
                    const alert = container.querySelector('[role="alert"]');
                    expect(alert).toBeInTheDocument();

                    // Verify the banner contains usage information
                    const alertText = alert.textContent;
                    expect(alertText).toContain(`${percentage}%`);
                    
                    // Verify severity level is correct
                    if (percentage >= 95) {
                        // Critical level
                        expect(alertText).toContain('Critical');
                        expect(alertText).toContain('Further usage may be blocked');
                    } else {
                        // Warning level (80-94%)
                        expect(alertText).toContain('Warning');
                    }

                    // Verify module name is displayed
                    expect(alertText).toContain(moduleName);

                    // Verify limit type is mentioned
                    const limitTypeText = limitType === 'employees' ? 'employee' :
                                         limitType === 'storage' ? 'storage' :
                                         limitType === 'apiCalls' ? 'API call' : limitType;
                    expect(alertText.toLowerCase()).toContain(limitTypeText.toLowerCase());

                    // Verify upgrade button is present
                    const upgradeButton = screen.getByRole('button', { name: /upgrade/i });
                    expect(upgradeButton).toBeInTheDocument();

                    // Verify dismiss button is present (if dismissible)
                    const dismissButton = screen.getByRole('button', { name: /dismiss/i });
                    expect(dismissButton).toBeInTheDocument();

                    // Verify progress bar is present
                    const progressBar = container.querySelector('[role="progressbar"]');
                    expect(progressBar).toBeInTheDocument();
                }
            ),
            { numRuns: 100 } // Run 100 iterations as specified in design
        );
    });

    /**
     * Additional property: Warning should NOT display below 80% threshold
     * 
     * This ensures that warnings only appear when usage is at or above 80%,
     * preventing unnecessary alerts.
     */
    test('Property 14.1: No warning below 80% threshold', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    moduleKey: fc.constantFrom('attendance', 'leave', 'payroll'),
                    moduleName: fc.string({ minLength: 5, maxLength: 50 }),
                    limitType: fc.constantFrom('employees', 'storage', 'apiCalls'),
                    // Generate usage percentage below 80%
                    percentage: fc.integer({ min: 0, max: 79 }),
                    limit: fc.integer({ min: 100, max: 10000 })
                }),
                async ({ moduleKey, moduleName, limitType, percentage, limit }) => {
                    const current = Math.floor((limit * percentage) / 100);

                    const usage = {
                        current,
                        limit,
                        percentage
                    };

                    // Mock API responses
                    axios.get.mockImplementation((url) => {
                        if (url.includes('/licenses/')) {
                            if (url.endsWith('/usage')) {
                                return Promise.resolve({
                                    data: {
                                        data: [{
                                            moduleKey,
                                            usage: {
                                                [limitType]: usage
                                            },
                                            limits: {
                                                [limitType]: limit
                                            },
                                            warnings: [],
                                            violations: []
                                        }]
                                    }
                                });
                            } else {
                                return Promise.resolve({
                                    data: {
                                        data: {
                                            modules: [{
                                                key: moduleKey,
                                                enabled: true,
                                                tier: 'business',
                                                limits: {
                                                    [limitType]: limit
                                                }
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
                                <UsageWarningBanner
                                    moduleKey={moduleKey}
                                    moduleName={moduleName}
                                    limitType={limitType}
                                    usage={usage}
                                />
                            </LicenseProvider>
                        </ThemeProvider>
                    );

                    // Wait a moment to ensure component has time to render if it would
                    await new Promise(resolve => setTimeout(resolve, 100));

                    // Verify warning banner is NOT displayed
                    const alert = container.querySelector('[role="alert"]');
                    expect(alert).not.toBeInTheDocument();
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Additional property: Warning severity matches usage level
     * 
     * This ensures that the severity level (warning vs critical) is correctly
     * determined based on the usage percentage.
     */
    test('Property 14.2: Warning severity matches usage level', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    moduleKey: fc.constantFrom('attendance', 'payroll', 'documents'),
                    moduleName: fc.string({ minLength: 5, maxLength: 50 }),
                    limitType: fc.constantFrom('employees', 'storage', 'apiCalls'),
                    percentage: fc.integer({ min: 80, max: 100 }),
                    limit: fc.integer({ min: 100, max: 10000 })
                }),
                async ({ moduleKey, moduleName, limitType, percentage, limit }) => {
                    const current = Math.floor((limit * percentage) / 100);

                    const usage = {
                        current,
                        limit,
                        percentage
                    };

                    // Mock API responses
                    axios.get.mockImplementation((url) => {
                        if (url.includes('/licenses/')) {
                            if (url.endsWith('/usage')) {
                                return Promise.resolve({
                                    data: {
                                        data: [{
                                            moduleKey,
                                            usage: {
                                                [limitType]: usage
                                            },
                                            limits: {
                                                [limitType]: limit
                                            },
                                            warnings: [],
                                            violations: []
                                        }]
                                    }
                                });
                            } else {
                                return Promise.resolve({
                                    data: {
                                        data: {
                                            modules: [{
                                                key: moduleKey,
                                                enabled: true,
                                                tier: 'business',
                                                limits: {
                                                    [limitType]: limit
                                                }
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
                                <UsageWarningBanner
                                    moduleKey={moduleKey}
                                    moduleName={moduleName}
                                    limitType={limitType}
                                    usage={usage}
                                />
                            </LicenseProvider>
                        </ThemeProvider>
                    );

                    // Wait for component to render
                    await waitFor(() => {
                        expect(container.querySelector('[role="alert"]')).toBeInTheDocument();
                    }, { timeout: 3000 });

                    const alert = container.querySelector('[role="alert"]');
                    const alertText = alert.textContent;

                    // Verify severity matches percentage
                    if (percentage >= 95) {
                        // Should be critical
                        expect(alertText).toContain('Critical');
                        expect(alertText).toContain('Further usage may be blocked');
                        
                        // Check for error severity class (MUI uses specific classes)
                        const alertElement = container.querySelector('.MuiAlert-standardError');
                        expect(alertElement).toBeInTheDocument();
                    } else {
                        // Should be warning (80-94%)
                        expect(alertText).toContain('Warning');
                        expect(alertText).not.toContain('Further usage may be blocked');
                        
                        // Check for warning severity class
                        const alertElement = container.querySelector('.MuiAlert-standardWarning');
                        expect(alertElement).toBeInTheDocument();
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Additional property: Dismissible warnings can be dismissed
     * 
     * This ensures that dismissible warnings properly handle dismissal
     * and persist the dismissal state.
     */
    test('Property 14.3: Dismissible warnings persist dismissal', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    moduleKey: fc.constantFrom('attendance', 'leave'),
                    moduleName: fc.string({ minLength: 5, maxLength: 50 }),
                    limitType: fc.constantFrom('employees', 'storage'),
                    percentage: fc.integer({ min: 80, max: 94 }), // Warning level only
                    limit: fc.integer({ min: 100, max: 1000 })
                }),
                async ({ moduleKey, moduleName, limitType, percentage, limit }) => {
                    const current = Math.floor((limit * percentage) / 100);

                    const usage = {
                        current,
                        limit,
                        percentage
                    };

                    // Mock API responses
                    axios.get.mockImplementation((url) => {
                        if (url.includes('/licenses/')) {
                            if (url.endsWith('/usage')) {
                                return Promise.resolve({
                                    data: {
                                        data: [{
                                            moduleKey,
                                            usage: {
                                                [limitType]: usage
                                            },
                                            limits: {
                                                [limitType]: limit
                                            },
                                            warnings: [],
                                            violations: []
                                        }]
                                    }
                                });
                            } else {
                                return Promise.resolve({
                                    data: {
                                        data: {
                                            modules: [{
                                                key: moduleKey,
                                                enabled: true,
                                                tier: 'business',
                                                limits: {
                                                    [limitType]: limit
                                                }
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

                    // Clear localStorage before test
                    const dismissKey = `usage-warning-dismissed-${moduleKey}-${limitType}`;
                    localStorage.removeItem(dismissKey);

                    // Render the component
                    const { container, rerender } = render(
                        <ThemeProvider theme={theme}>
                            <LicenseProvider>
                                <UsageWarningBanner
                                    moduleKey={moduleKey}
                                    moduleName={moduleName}
                                    limitType={limitType}
                                    usage={usage}
                                    dismissible={true}
                                />
                            </LicenseProvider>
                        </ThemeProvider>
                    );

                    // Wait for component to render
                    await waitFor(() => {
                        expect(container.querySelector('[role="alert"]')).toBeInTheDocument();
                    }, { timeout: 3000 });

                    // Click dismiss button
                    const dismissButton = screen.getByRole('button', { name: /dismiss/i });
                    dismissButton.click();

                    // Wait for dismissal to take effect
                    await waitFor(() => {
                        expect(container.querySelector('[role="alert"]')).not.toBeInTheDocument();
                    }, { timeout: 1000 });

                    // Verify localStorage was updated
                    expect(localStorage.getItem(dismissKey)).toBe('true');

                    // Re-render the component
                    rerender(
                        <ThemeProvider theme={theme}>
                            <LicenseProvider>
                                <UsageWarningBanner
                                    moduleKey={moduleKey}
                                    moduleName={moduleName}
                                    limitType={limitType}
                                    usage={usage}
                                    dismissible={true}
                                />
                            </LicenseProvider>
                        </ThemeProvider>
                    );

                    // Wait a moment
                    await new Promise(resolve => setTimeout(resolve, 100));

                    // Verify warning remains dismissed
                    expect(container.querySelector('[role="alert"]')).not.toBeInTheDocument();
                }
            ),
            { numRuns: 50 } // Fewer runs for this more complex test
        );
    });
});
