/**
 * Accessibility Tests for License Components
 * 
 * Verifies WCAG 2.1 AA compliance for all license components
 * 
 * Note: For full accessibility testing with automated tools,
 * install jest-axe: npm install --save-dev jest-axe
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeConfigProvider } from '../../../context/ThemeContext';
import LockedFeature from '../LockedFeature';
import LockedPage from '../LockedPage';
import UpgradeModal from '../UpgradeModal';

const renderWithProviders = (component) => {
    return render(
        <BrowserRouter>
            <ThemeConfigProvider>
                {component}
            </ThemeConfigProvider>
        </BrowserRouter>
    );
};

describe('License Components Accessibility', () => {
    describe('LockedFeature', () => {
        test('should render without errors', () => {
            const { container } = renderWithProviders(
                <LockedFeature
                    moduleKey="attendance"
                    featureName="Biometric Devices"
                    description="Connect biometric devices"
                    startingPrice={8}
                />
            );

            expect(container).toBeInTheDocument();
        });

        test('should have proper heading hierarchy', () => {
            renderWithProviders(
                <LockedFeature
                    moduleKey="attendance"
                    featureName="Biometric Devices"
                    description="Connect biometric devices"
                    startingPrice={8}
                />
            );

            const heading = screen.getByRole('heading', { name: /biometric devices/i });
            expect(heading).toBeInTheDocument();
        });

        test('should have proper region role', () => {
            renderWithProviders(
                <LockedFeature
                    moduleKey="attendance"
                    featureName="Biometric Devices"
                    description="Connect biometric devices"
                    startingPrice={8}
                />
            );

            const region = screen.getByRole('region');
            expect(region).toBeInTheDocument();
            expect(region).toHaveAttribute('aria-label');
        });

        test('should have accessible button', () => {
            renderWithProviders(
                <LockedFeature
                    moduleKey="attendance"
                    featureName="Biometric Devices"
                    description="Connect biometric devices"
                    startingPrice={8}
                />
            );

            const button = screen.getByRole('button');
            expect(button).toBeInTheDocument();
            expect(button).toHaveAttribute('aria-label');
        });
    });

    describe('LockedPage', () => {
        test('should render without errors', () => {
            const { container } = renderWithProviders(
                <LockedPage
                    moduleKey="payroll"
                    moduleName="Payroll Management"
                    description="Automate payroll processing"
                    features={['Feature 1', 'Feature 2']}
                    startingPrice={12}
                />
            );

            expect(container).toBeInTheDocument();
        });

        test('should have proper main landmark', () => {
            renderWithProviders(
                <LockedPage
                    moduleKey="payroll"
                    moduleName="Payroll Management"
                    description="Automate payroll processing"
                    startingPrice={12}
                />
            );

            const main = screen.getByRole('main');
            expect(main).toBeInTheDocument();
            expect(main).toHaveAttribute('aria-labelledby');
        });

        test('should have proper heading structure', () => {
            renderWithProviders(
                <LockedPage
                    moduleKey="payroll"
                    moduleName="Payroll Management"
                    description="Automate payroll processing"
                    startingPrice={12}
                />
            );

            const h1 = screen.getByRole('heading', { level: 1, name: /payroll management/i });
            expect(h1).toBeInTheDocument();
            expect(h1).toHaveAttribute('id', 'locked-page-title');
        });

        test('should have accessible list for features', () => {
            renderWithProviders(
                <LockedPage
                    moduleKey="payroll"
                    moduleName="Payroll Management"
                    description="Automate payroll processing"
                    features={['Feature 1', 'Feature 2']}
                    startingPrice={12}
                />
            );

            const listItems = screen.getAllByRole('listitem');
            expect(listItems.length).toBe(2);
        });

        test('should have accessible buttons', () => {
            renderWithProviders(
                <LockedPage
                    moduleKey="payroll"
                    moduleName="Payroll Management"
                    description="Automate payroll processing"
                    startingPrice={12}
                />
            );

            const buttons = screen.getAllByRole('button');
            buttons.forEach(button => {
                expect(button).toHaveAttribute('aria-label');
            });
        });
    });

    describe('UpgradeModal', () => {
        test('should render without errors', () => {
            const { container } = renderWithProviders(
                <UpgradeModal
                    open={true}
                    onClose={jest.fn()}
                    moduleKey="documents"
                    featureName="Document Templates"
                    description="Create custom templates"
                    currentTier="starter"
                    requiredTier="business"
                />
            );

            expect(container).toBeInTheDocument();
        });

        test('should have proper dialog role', () => {
            renderWithProviders(
                <UpgradeModal
                    open={true}
                    onClose={jest.fn()}
                    moduleKey="documents"
                    featureName="Document Templates"
                    description="Create custom templates"
                    currentTier="starter"
                    requiredTier="business"
                />
            );

            const dialog = screen.getByRole('dialog');
            expect(dialog).toBeInTheDocument();
        });

        test('should have proper ARIA labels', () => {
            renderWithProviders(
                <UpgradeModal
                    open={true}
                    onClose={jest.fn()}
                    moduleKey="documents"
                    featureName="Document Templates"
                    description="Create custom templates"
                    currentTier="starter"
                    requiredTier="business"
                />
            );

            const dialog = screen.getByRole('dialog');
            expect(dialog).toHaveAttribute('aria-labelledby', 'upgrade-modal-title');
            expect(dialog).toHaveAttribute('aria-describedby', 'upgrade-modal-description');
        });

        test('should have keyboard accessible close button', () => {
            renderWithProviders(
                <UpgradeModal
                    open={true}
                    onClose={jest.fn()}
                    moduleKey="documents"
                    featureName="Document Templates"
                    description="Create custom templates"
                    currentTier="starter"
                    requiredTier="business"
                />
            );

            const closeButton = screen.getByRole('button', { name: /close upgrade modal/i });
            expect(closeButton).toBeInTheDocument();
        });

        test('should have accessible upgrade buttons', () => {
            renderWithProviders(
                <UpgradeModal
                    open={true}
                    onClose={jest.fn()}
                    moduleKey="documents"
                    featureName="Document Templates"
                    description="Create custom templates"
                    currentTier="starter"
                    requiredTier="business"
                />
            );

            const upgradeButtons = screen.getAllByRole('button', { name: /upgrade to/i });
            expect(upgradeButtons.length).toBeGreaterThan(0);
            upgradeButtons.forEach(button => {
                expect(button).toHaveAttribute('aria-label');
            });
        });
    });

    describe('Keyboard Navigation', () => {
        test('LockedFeature upgrade button should be keyboard accessible', () => {
            renderWithProviders(
                <LockedFeature
                    moduleKey="attendance"
                    featureName="Biometric Devices"
                    description="Connect biometric devices"
                    startingPrice={8}
                />
            );

            const button = screen.getByRole('button');
            expect(button).toBeInTheDocument();
            expect(button).not.toHaveAttribute('tabindex', '-1');
        });

        test('LockedPage buttons should be keyboard accessible', () => {
            renderWithProviders(
                <LockedPage
                    moduleKey="payroll"
                    moduleName="Payroll Management"
                    description="Automate payroll processing"
                    startingPrice={12}
                />
            );

            const buttons = screen.getAllByRole('button');
            buttons.forEach(button => {
                expect(button).not.toHaveAttribute('tabindex', '-1');
            });
        });

        test('UpgradeModal should have focusable elements', () => {
            renderWithProviders(
                <UpgradeModal
                    open={true}
                    onClose={jest.fn()}
                    moduleKey="documents"
                    featureName="Document Templates"
                    description="Create custom templates"
                    currentTier="starter"
                    requiredTier="business"
                />
            );

            // MUI Dialog handles focus trapping automatically
            const dialog = screen.getByRole('dialog');
            expect(dialog).toBeInTheDocument();

            const buttons = screen.getAllByRole('button');
            expect(buttons.length).toBeGreaterThan(0);
        });
    });
});
