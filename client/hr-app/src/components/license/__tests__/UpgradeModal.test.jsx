/**
 * UpgradeModal Component Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeConfigProvider } from '../../../context/ThemeContext';
import UpgradeModal from '../UpgradeModal';

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

describe('UpgradeModal Component', () => {
    beforeEach(() => {
        mockNavigate.mockClear();
    });

    const defaultProps = {
        open: true,
        onClose: jest.fn(),
        moduleKey: 'documents',
        featureName: 'Document Templates',
        description: 'Create custom templates',
        currentTier: 'starter',
        requiredTier: 'business',
    };

    test('renders when open', () => {
        renderWithProviders(<UpgradeModal {...defaultProps} />);

        expect(screen.getByText('Upgrade Required')).toBeInTheDocument();
        expect(screen.getByText('Document Templates')).toBeInTheDocument();
        expect(screen.getByText('Create custom templates')).toBeInTheDocument();
    });

    test('does not render when closed', () => {
        renderWithProviders(<UpgradeModal {...defaultProps} open={false} />);

        expect(screen.queryByText('Upgrade Required')).not.toBeInTheDocument();
    });

    test('displays current tier information', () => {
        renderWithProviders(<UpgradeModal {...defaultProps} />);

        expect(screen.getByText(/starter/i)).toBeInTheDocument();
        expect(screen.getByText(/requires the business plan/i)).toBeInTheDocument();
    });

    test('displays default pricing tiers', () => {
        renderWithProviders(<UpgradeModal {...defaultProps} />);

        expect(screen.getByText('Business')).toBeInTheDocument();
        expect(screen.getByText('Enterprise')).toBeInTheDocument();
    });

    test('displays custom pricing tiers', () => {
        const customTiers = [
            {
                name: 'Professional',
                price: 10,
                features: ['Feature A', 'Feature B'],
            },
        ];

        renderWithProviders(
            <UpgradeModal
                {...defaultProps}
                pricingTiers={customTiers}
            />
        );

        expect(screen.getByText('Professional')).toBeInTheDocument();
        expect(screen.getByText('Feature A')).toBeInTheDocument();
    });

    test('calls onClose when close button is clicked', () => {
        const handleClose = jest.fn();
        renderWithProviders(
            <UpgradeModal
                {...defaultProps}
                onClose={handleClose}
            />
        );

        const closeButton = screen.getByRole('button', { name: /close upgrade modal/i });
        fireEvent.click(closeButton);

        expect(handleClose).toHaveBeenCalledTimes(1);
    });

    test('calls onClose when "Maybe Later" button is clicked', () => {
        const handleClose = jest.fn();
        renderWithProviders(
            <UpgradeModal
                {...defaultProps}
                onClose={handleClose}
            />
        );

        const maybeLaterButton = screen.getByRole('button', { name: /maybe later/i });
        fireEvent.click(maybeLaterButton);

        expect(handleClose).toHaveBeenCalledTimes(1);
    });

    test('calls onUpgradeClick when upgrade button is clicked', () => {
        const handleUpgradeClick = jest.fn();
        renderWithProviders(
            <UpgradeModal
                {...defaultProps}
                onUpgradeClick={handleUpgradeClick}
            />
        );

        const upgradeButtons = screen.getAllByRole('button', { name: /upgrade to/i });
        fireEvent.click(upgradeButtons[0]);

        expect(handleUpgradeClick).toHaveBeenCalled();
    });

    test('navigates to pricing page when "View All Pricing" is clicked', () => {
        renderWithProviders(<UpgradeModal {...defaultProps} />);

        const viewPricingButton = screen.getByRole('button', { name: /view all pricing/i });
        fireEvent.click(viewPricingButton);

        expect(mockNavigate).toHaveBeenCalledWith('/pricing?module=documents');
    });

    test('has proper ARIA labels', () => {
        renderWithProviders(<UpgradeModal {...defaultProps} />);

        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByLabelText(/upgrade required/i)).toBeInTheDocument();
    });

    test('highlights required tier', () => {
        renderWithProviders(<UpgradeModal {...defaultProps} />);

        // The Business tier should be highlighted since it's the required tier
        const businessSection = screen.getByText('Business').closest('div');
        expect(businessSection).toHaveStyle({ borderColor: expect.stringContaining('primary') });
    });
});
