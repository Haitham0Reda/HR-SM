/**
 * UsageWarningBanner Component Tests
 * 
 * Tests for the UsageWarningBanner component including:
 * - Rendering with different severity levels
 * - Dismissible functionality with localStorage
 * - Accessibility compliance
 */

// Mock the navigate function
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    BrowserRouter: ({ children }) => children,
    useNavigate: () => mockNavigate,
    Link: ({ children, to }) => <a href={to}>{children}</a>,
}));

// Mock the useThemeConfig hook
jest.mock('../../../context/ThemeContext', () => ({
    useThemeConfig: () => ({
        colorMode: 'light',
        setColorMode: jest.fn(),
        themeConfig: {},
        loading: false
    }),
    ThemeConfigProvider: ({ children }) => children,
}));

// Mock the useLicense hook
const mockGetModuleUsage = jest.fn();
jest.mock('../../../context/LicenseContext', () => ({
    useLicense: () => ({
        getModuleUsage: mockGetModuleUsage,
        licenses: {},
        usage: {},
        loading: false,
        error: null,
    }),
    LicenseProvider: ({ children }) => children,
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import UsageWarningBanner from '../UsageWarningBanner';

// Helper function to render with all required providers
const renderWithProviders = (component) => {
    return render(
        <BrowserRouter>
            {component}
        </BrowserRouter>
    );
};

describe('UsageWarningBanner', () => {
    beforeEach(() => {
        // Clear localStorage before each test
        localStorage.clear();
        mockNavigate.mockClear();
        mockGetModuleUsage.mockClear();
    });

    describe('Rendering', () => {
        test('renders warning level banner correctly', () => {
            renderWithProviders(
                <UsageWarningBanner
                    moduleKey="attendance"
                    moduleName="Attendance & Time Tracking"
                    limitType="employees"
                    usage={{
                        current: 42,
                        limit: 50,
                        percentage: 84,
                    }}
                />
            );

            expect(screen.getByText(/Warning:/)).toBeInTheDocument();
            expect(screen.getByText(/Attendance & Time Tracking Usage Limit/)).toBeInTheDocument();
            expect(screen.getByText(/84%/)).toBeInTheDocument();
            expect(screen.getByText(/42 of 50/)).toBeInTheDocument();
        });

        test('renders critical level banner correctly', () => {
            renderWithProviders(
                <UsageWarningBanner
                    moduleKey="attendance"
                    moduleName="Attendance & Time Tracking"
                    limitType="employees"
                    usage={{
                        current: 48,
                        limit: 50,
                        percentage: 96,
                    }}
                />
            );

            expect(screen.getByText(/Critical:/)).toBeInTheDocument();
            expect(screen.getByText(/Further usage may be blocked/)).toBeInTheDocument();
        });

        test('does not render when percentage is below 80%', () => {
            const { container } = renderWithProviders(
                <UsageWarningBanner
                    moduleKey="attendance"
                    moduleName="Attendance & Time Tracking"
                    limitType="employees"
                    usage={{
                        current: 30,
                        limit: 50,
                        percentage: 60,
                    }}
                />
            );

            expect(container.firstChild).toBeNull();
        });

        test('does not render when no limit is set', () => {
            const { container } = renderWithProviders(
                <UsageWarningBanner
                    moduleKey="attendance"
                    moduleName="Attendance & Time Tracking"
                    limitType="employees"
                    usage={{
                        current: 42,
                        limit: null,
                        percentage: null,
                    }}
                />
            );

            expect(container.firstChild).toBeNull();
        });
    });

    describe('Limit Type Formatting', () => {
        test('formats storage values in GB', () => {
            renderWithProviders(
                <UsageWarningBanner
                    moduleKey="documents"
                    moduleName="Document Management"
                    limitType="storage"
                    usage={{
                        current: 8589934592, // 8 GB
                        limit: 10737418240, // 10 GB
                        percentage: 80,
                    }}
                />
            );

            expect(screen.getByText(/8.00 GB of 10.00 GB/)).toBeInTheDocument();
        });

        test('formats API calls with locale string', () => {
            renderWithProviders(
                <UsageWarningBanner
                    moduleKey="reporting"
                    moduleName="Advanced Reporting"
                    limitType="apiCalls"
                    usage={{
                        current: 8500,
                        limit: 10000,
                        percentage: 85,
                    }}
                />
            );

            expect(screen.getByText(/8,500 of 10,000/)).toBeInTheDocument();
        });

        test('formats employee count as plain number', () => {
            renderWithProviders(
                <UsageWarningBanner
                    moduleKey="attendance"
                    moduleName="Attendance & Time Tracking"
                    limitType="employees"
                    usage={{
                        current: 42,
                        limit: 50,
                        percentage: 84,
                    }}
                />
            );

            expect(screen.getByText(/42 of 50/)).toBeInTheDocument();
        });
    });

    describe('Dismissible Functionality', () => {
        test('shows dismiss button when dismissible is true', () => {
            renderWithProviders(
                <UsageWarningBanner
                    moduleKey="attendance"
                    moduleName="Attendance & Time Tracking"
                    limitType="employees"
                    usage={{
                        current: 42,
                        limit: 50,
                        percentage: 84,
                    }}
                    dismissible={true}
                />
            );

            expect(screen.getByLabelText('dismiss warning')).toBeInTheDocument();
        });

        test('hides dismiss button when dismissible is false', () => {
            renderWithProviders(
                <UsageWarningBanner
                    moduleKey="attendance"
                    moduleName="Attendance & Time Tracking"
                    limitType="employees"
                    usage={{
                        current: 42,
                        limit: 50,
                        percentage: 84,
                    }}
                    dismissible={false}
                />
            );

            expect(screen.queryByLabelText('dismiss warning')).not.toBeInTheDocument();
        });

        test('dismisses banner and stores in localStorage', () => {
            renderWithProviders(
                <UsageWarningBanner
                    moduleKey="attendance"
                    moduleName="Attendance & Time Tracking"
                    limitType="employees"
                    usage={{
                        current: 42,
                        limit: 50,
                        percentage: 84,
                    }}
                    dismissible={true}
                />
            );

            const dismissButton = screen.getByLabelText('dismiss warning');
            fireEvent.click(dismissButton);

            expect(localStorage.getItem('usage-warning-dismissed-attendance-employees')).toBe('true');
        });

        test('calls onDismiss callback when dismissed', () => {
            const onDismiss = jest.fn();

            renderWithProviders(
                <UsageWarningBanner
                    moduleKey="attendance"
                    moduleName="Attendance & Time Tracking"
                    limitType="employees"
                    usage={{
                        current: 42,
                        limit: 50,
                        percentage: 84,
                    }}
                    dismissible={true}
                    onDismiss={onDismiss}
                />
            );

            const dismissButton = screen.getByLabelText('dismiss warning');
            fireEvent.click(dismissButton);

            expect(onDismiss).toHaveBeenCalledTimes(1);
        });

        test('does not render if previously dismissed', () => {
            localStorage.setItem('usage-warning-dismissed-attendance-employees', 'true');

            const { container } = renderWithProviders(
                <UsageWarningBanner
                    moduleKey="attendance"
                    moduleName="Attendance & Time Tracking"
                    limitType="employees"
                    usage={{
                        current: 42,
                        limit: 50,
                        percentage: 84,
                    }}
                    dismissible={true}
                />
            );

            expect(container.firstChild).toBeNull();
        });
    });

    describe('Upgrade Button', () => {
        test('shows upgrade button by default', () => {
            renderWithProviders(
                <UsageWarningBanner
                    moduleKey="attendance"
                    moduleName="Attendance & Time Tracking"
                    limitType="employees"
                    usage={{
                        current: 42,
                        limit: 50,
                        percentage: 84,
                    }}
                />
            );

            expect(screen.getByText('Upgrade Plan')).toBeInTheDocument();
        });

        test('hides upgrade button when showUpgradeButton is false', () => {
            renderWithProviders(
                <UsageWarningBanner
                    moduleKey="attendance"
                    moduleName="Attendance & Time Tracking"
                    limitType="employees"
                    usage={{
                        current: 42,
                        limit: 50,
                        percentage: 84,
                    }}
                    showUpgradeButton={false}
                />
            );

            expect(screen.queryByText('Upgrade Plan')).not.toBeInTheDocument();
        });

        test('navigates to pricing page when upgrade button is clicked', () => {
            renderWithProviders(
                <UsageWarningBanner
                    moduleKey="attendance"
                    moduleName="Attendance & Time Tracking"
                    limitType="employees"
                    usage={{
                        current: 42,
                        limit: 50,
                        percentage: 84,
                    }}
                />
            );

            const upgradeButton = screen.getByText('Upgrade Plan');
            fireEvent.click(upgradeButton);

            expect(mockNavigate).toHaveBeenCalledWith('/pricing?module=attendance');
        });
    });

    describe('Accessibility', () => {
        test('has proper ARIA role', () => {
            renderWithProviders(
                <UsageWarningBanner
                    moduleKey="attendance"
                    moduleName="Attendance & Time Tracking"
                    limitType="employees"
                    usage={{
                        current: 42,
                        limit: 50,
                        percentage: 84,
                    }}
                />
            );

            expect(screen.getByRole('alert')).toBeInTheDocument();
        });

        test('has aria-live attribute', () => {
            renderWithProviders(
                <UsageWarningBanner
                    moduleKey="attendance"
                    moduleName="Attendance & Time Tracking"
                    limitType="employees"
                    usage={{
                        current: 42,
                        limit: 50,
                        percentage: 84,
                    }}
                />
            );

            const alert = screen.getByRole('alert');
            expect(alert).toHaveAttribute('aria-live', 'polite');
        });

        test('has proper aria-label on upgrade button', () => {
            renderWithProviders(
                <UsageWarningBanner
                    moduleKey="attendance"
                    moduleName="Attendance & Time Tracking"
                    limitType="employees"
                    usage={{
                        current: 42,
                        limit: 50,
                        percentage: 84,
                    }}
                />
            );

            const upgradeButton = screen.getByLabelText('Upgrade Attendance & Time Tracking plan');
            expect(upgradeButton).toBeInTheDocument();
        });

        test('has proper aria-label on dismiss button', () => {
            renderWithProviders(
                <UsageWarningBanner
                    moduleKey="attendance"
                    moduleName="Attendance & Time Tracking"
                    limitType="employees"
                    usage={{
                        current: 42,
                        limit: 50,
                        percentage: 84,
                    }}
                    dismissible={true}
                />
            );

            expect(screen.getByLabelText('dismiss warning')).toBeInTheDocument();
        });
    });

    describe('Progress Bar', () => {
        test('renders progress bar with correct value', () => {
            renderWithProviders(
                <UsageWarningBanner
                    moduleKey="attendance"
                    moduleName="Attendance & Time Tracking"
                    limitType="employees"
                    usage={{
                        current: 42,
                        limit: 50,
                        percentage: 84,
                    }}
                />
            );

            const progressBar = screen.getByRole('progressbar');
            expect(progressBar).toHaveAttribute('aria-valuenow', '84');
        });

        test('caps progress bar at 100%', () => {
            renderWithProviders(
                <UsageWarningBanner
                    moduleKey="attendance"
                    moduleName="Attendance & Time Tracking"
                    limitType="employees"
                    usage={{
                        current: 55,
                        limit: 50,
                        percentage: 110,
                    }}
                />
            );

            const progressBar = screen.getByRole('progressbar');
            expect(progressBar).toHaveAttribute('aria-valuenow', '100');
        });
    });
});
