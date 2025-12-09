/**
 * LockedPage Component Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeConfigProvider } from '../../../context/ThemeContext';
import LockedPage from '../LockedPage';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
}));

const renderWithProviders = (component) => {
    return render(
        <BrowserRouter>
            <ThemeConfigProvider>
                {component}
            </ThemeConfigProvider>
        </BrowserRouter>
    );
};

describe('LockedPage Component', () => {
    beforeEach(() => {
        mockNavigate.mockClear();
    });

    const defaultProps = {
        moduleKey: 'payroll',
        moduleName: 'Payroll Management',
        description: 'Automate payroll processing',
        features: ['Feature 1', 'Feature 2', 'Feature 3'],
        startingPrice: 12,
    };

    test('renders with all required props', () => {
        renderWithProviders(<LockedPage {...defaultProps} />);

        expect(screen.getByText('Payroll Management')).toBeInTheDocument();
        expect(screen.getByText('Automate payroll processing')).toBeInTheDocument();
        expect(screen.getByText(/\$12/)).toBeInTheDocument();
    });

    test('renders features list', () => {
        renderWithProviders(<LockedPage {...defaultProps} />);

        expect(screen.getByText('Feature 1')).toBeInTheDocument();
        expect(screen.getByText('Feature 2')).toBeInTheDocument();
        expect(screen.getByText('Feature 3')).toBeInTheDocument();
    });

    test('renders without optional props', () => {
        renderWithProviders(
            <LockedPage
                moduleKey="test"
                moduleName="Test Module"
            />
        );

        expect(screen.getByText('Test Module')).toBeInTheDocument();
    });

    test('navigates to dashboard when back button is clicked', () => {
        renderWithProviders(<LockedPage {...defaultProps} />);

        const backButton = screen.getByRole('button', { name: /back to dashboard/i });
        fireEvent.click(backButton);

        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });

    test('calls onUpgradeClick when upgrade button is clicked', () => {
        const handleUpgradeClick = jest.fn();
        renderWithProviders(
            <LockedPage
                {...defaultProps}
                onUpgradeClick={handleUpgradeClick}
            />
        );

        const upgradeButton = screen.getByRole('button', { name: /upgrade to access/i });
        fireEvent.click(upgradeButton);

        expect(handleUpgradeClick).toHaveBeenCalledTimes(1);
    });

    test('has proper ARIA labels', () => {
        renderWithProviders(<LockedPage {...defaultProps} />);

        expect(screen.getByRole('main')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Payroll Management' })).toBeInTheDocument();
    });

    test('displays lock icon', () => {
        renderWithProviders(<LockedPage {...defaultProps} />);

        const lockIcon = document.querySelector('[data-testid="LockIcon"]');
        expect(lockIcon).toBeInTheDocument();
    });
});
