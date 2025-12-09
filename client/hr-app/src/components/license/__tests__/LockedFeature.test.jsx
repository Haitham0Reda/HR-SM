/**
 * LockedFeature Component Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeConfigProvider } from '../../../context/ThemeContext';
import LockedFeature from '../LockedFeature';

const renderWithProviders = (component) => {
    return render(
        <BrowserRouter>
            <ThemeConfigProvider>
                {component}
            </ThemeConfigProvider>
        </BrowserRouter>
    );
};

describe('LockedFeature Component', () => {
    const defaultProps = {
        moduleKey: 'attendance',
        featureName: 'Biometric Devices',
        description: 'Connect biometric devices',
        startingPrice: 8,
    };

    test('renders with all required props', () => {
        renderWithProviders(<LockedFeature {...defaultProps} />);

        expect(screen.getByText('Biometric Devices')).toBeInTheDocument();
        expect(screen.getByText('Connect biometric devices')).toBeInTheDocument();
        expect(screen.getByText(/\$8/)).toBeInTheDocument();
    });

    test('renders without optional props', () => {
        renderWithProviders(
            <LockedFeature
                moduleKey="test"
                featureName="Test Feature"
            />
        );

        expect(screen.getByText('Test Feature')).toBeInTheDocument();
    });

    test('calls onUpgradeClick when upgrade button is clicked', () => {
        const handleUpgradeClick = jest.fn();
        renderWithProviders(
            <LockedFeature
                {...defaultProps}
                onUpgradeClick={handleUpgradeClick}
            />
        );

        const upgradeButton = screen.getByRole('button', { name: /upgrade to access/i });
        fireEvent.click(upgradeButton);

        expect(handleUpgradeClick).toHaveBeenCalledTimes(1);
    });

    test('has proper ARIA labels', () => {
        renderWithProviders(<LockedFeature {...defaultProps} />);

        expect(screen.getByRole('region', { name: /biometric devices is locked/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /upgrade to access biometric devices/i })).toBeInTheDocument();
    });

    test('displays lock icon', () => {
        renderWithProviders(<LockedFeature {...defaultProps} />);

        // Lock icon should be present (aria-hidden)
        const lockIcon = document.querySelector('[data-testid="LockIcon"]');
        expect(lockIcon).toBeInTheDocument();
    });

    test('applies custom styles', () => {
        const customSx = { backgroundColor: 'red' };
        renderWithProviders(
            <LockedFeature
                {...defaultProps}
                sx={customSx}
            />
        );

        const container = screen.getByRole('region');
        expect(container).toHaveStyle({ backgroundColor: 'red' });
    });
});
