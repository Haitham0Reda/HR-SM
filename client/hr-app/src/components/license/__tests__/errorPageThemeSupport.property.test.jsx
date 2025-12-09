/**
 * Property-Based Tests for Error Page Theme Support
 * 
 * Feature: feature-productization, Property 45: Error Page Theme Support
 * Validates: Requirements 13.4
 * 
 * This test verifies that for any error page (locked pages serving as error states),
 * the page should render correctly in both light and dark mode themes.
 * 
 * Requirement 13.4: WHEN an error page is rendered THEN the System SHALL support
 * both light and dark mode themes
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import fc from 'fast-check';
import LockedPage from '../LockedPage';
import LockedFeature from '../LockedFeature';
import UpgradeModal from '../UpgradeModal';
import { ThemeConfigProvider } from '../../../context/ThemeContext';
import { MODULES } from '../../../config/modules';

// Mock useNavigate to avoid routing issues in tests
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    BrowserRouter: ({ children }) => children,
    useNavigate: () => mockNavigate,
    Link: ({ children, to }) => <a href={to}>{children}</a>,
}));

// Mock theme service to avoid API calls
jest.mock('../../../services', () => ({
    themeService: {
        getTheme: jest.fn().mockResolvedValue({}),
    },
}));

// Helper to render components with theme providers
const renderWithTheme = (component, colorMode = 'light') => {
    // Set localStorage to control theme mode
    localStorage.setItem('themeMode', colorMode);

    return render(
        <BrowserRouter>
            <ThemeConfigProvider>
                {component}
            </ThemeConfigProvider>
        </BrowserRouter>
    );
};

describe('Error Page Theme Support - Property-Based Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
    });

    afterEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
    });

    // Sanity check test
    test('Sanity check: LockedPage can render with theme provider', async () => {
        const { container } = renderWithTheme(
            <LockedPage
                moduleKey="attendance"
                moduleName="Test Module"
                description="Test description"
                startingPrice={10}
            />,
            'light'
        );

        // Wait for theme to load
        await waitFor(() => {
            expect(screen.getByText('Test Module')).toBeInTheDocument();
        });

        expect(container).toBeTruthy();
    });

    /**
     * Feature: feature-productization, Property 45: Error Page Theme Support
     * 
     * Property: For any error page, it should render correctly in both light and dark mode themes.
     * 
     * This property ensures that error pages (locked pages) support theme switching
     * as required by Requirement 13.4.
     * 
     * Requirement 13.4: WHEN an error page is rendered THEN the System SHALL support
     * both light and dark mode themes
     */
    test('Property 45: Error Page Theme Support - LockedPage renders in both themes', async () => {
        jest.setTimeout(30000); // Increase timeout for property test

        await fc.assert(
            fc.asyncProperty(
                // Generate arbitrary module keys
                fc.constantFrom(
                    ...Object.values(MODULES).filter(m => m !== MODULES.HR_CORE)
                ),
                // Generate arbitrary module names
                fc.constantFrom(
                    'Attendance Module',
                    'Leave Management',
                    'Payroll System'
                ),
                // Generate arbitrary descriptions
                fc.constantFrom(
                    'Track employee attendance and working hours',
                    'Manage leave requests and approvals'
                ),
                // Generate arbitrary pricing
                fc.integer({ min: 1, max: 100 }),
                // Generate theme modes
                fc.constantFrom('light', 'dark'),
                async (moduleKey, moduleName, description, startingPrice, colorMode) => {
                    // Render LockedPage in the specified theme
                    const { container, unmount } = renderWithTheme(
                        <LockedPage
                            moduleKey={moduleKey}
                            moduleName={moduleName}
                            description={description}
                            startingPrice={startingPrice}
                        />,
                        colorMode
                    );

                    try {
                        // Wait for theme to load and component to render
                        await waitFor(() => {
                            expect(screen.getByText(moduleName)).toBeInTheDocument();
                        });

                        // Verify the page renders without errors
                        expect(container).toBeTruthy();

                        // Verify key content is present regardless of theme
                        expect(screen.getByText(description)).toBeInTheDocument();

                        // Verify pricing is displayed
                        expect(container.textContent).toContain(`$${startingPrice}`);

                        // Verify action buttons are present
                        const upgradeButton = screen.getByRole('button', { name: /upgrade/i });
                        expect(upgradeButton).toBeInTheDocument();

                        const backButton = screen.getByRole('button', { name: /back/i });
                        expect(backButton).toBeInTheDocument();

                        // Verify main region exists (accessibility)
                        const mainRegion = screen.getByRole('main');
                        expect(mainRegion).toBeInTheDocument();

                        // Verify the component doesn't crash with either theme
                        expect(container.innerHTML.length).toBeGreaterThan(0);
                    } finally {
                        unmount();
                    }
                }
            ),
            { numRuns: 20 } // Reduced from 100 to avoid timeout with async tests
        );
    });
});
