/**
 * ModuleGuard Component Tests
 * 
 * Tests for ModuleGuard behavior when module is enabled/disabled.
 * Validates module access control functionality.
 */

import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ModuleGuard from '../../ModuleGuard';

// Mock the ModuleContext
const mockUseModules = jest.fn();

jest.mock('../../../contexts/ModuleContext', () => ({
    useModules: () => mockUseModules()
}));

// Helper to wrap component with required providers
const renderWithProviders = (component) => {
    const theme = createTheme();
    return render(
        <ThemeProvider theme={theme}>
            {component}
        </ThemeProvider>
    );
};

// Test component to use as children
const TestComponent = () => (
    <div data-testid="test-content">
        This is the protected content
    </div>
);

// Custom fallback component
const CustomFallback = () => (
    <div data-testid="custom-fallback">
        Custom fallback content
    </div>
);

describe('ModuleGuard Component', () => {
    afterEach(() => {
        cleanup();
        jest.clearAllMocks();
    });

    describe('Module Enabled', () => {
        beforeEach(() => {
            mockUseModules.mockReturnValue({
                isModuleEnabled: jest.fn().mockReturnValue(true),
                loading: false
            });
        });

        it('should render children when module is enabled', () => {
            renderWithProviders(
                <ModuleGuard moduleId="life-insurance">
                    <TestComponent />
                </ModuleGuard>
            );

            expect(screen.getByTestId('test-content')).toBeInTheDocument();
            expect(screen.getByText('This is the protected content')).toBeInTheDocument();
        });

        it('should call isModuleEnabled with correct moduleId', () => {
            const mockIsModuleEnabled = jest.fn().mockReturnValue(true);
            mockUseModules.mockReturnValue({
                isModuleEnabled: mockIsModuleEnabled,
                loading: false
            });

            renderWithProviders(
                <ModuleGuard moduleId="life-insurance">
                    <TestComponent />
                </ModuleGuard>
            );

            expect(mockIsModuleEnabled).toHaveBeenCalledWith('life-insurance');
        });

        it('should render multiple children when module is enabled', () => {
            renderWithProviders(
                <ModuleGuard moduleId="life-insurance">
                    <div data-testid="child-1">Child 1</div>
                    <div data-testid="child-2">Child 2</div>
                </ModuleGuard>
            );

            expect(screen.getByTestId('child-1')).toBeInTheDocument();
            expect(screen.getByTestId('child-2')).toBeInTheDocument();
        });
    });

    describe('Module Disabled', () => {
        beforeEach(() => {
            mockUseModules.mockReturnValue({
                isModuleEnabled: jest.fn().mockReturnValue(false),
                loading: false
            });
        });

        it('should show default fallback when module is disabled', () => {
            renderWithProviders(
                <ModuleGuard moduleId="life-insurance">
                    <TestComponent />
                </ModuleGuard>
            );

            expect(screen.queryByTestId('test-content')).not.toBeInTheDocument();
            expect(screen.getByText('Module Not Available')).toBeInTheDocument();
            expect(screen.getByText(/This feature is not enabled for your organization/)).toBeInTheDocument();
            expect(screen.getByText(/contact your administrator to enable the life-insurance module/)).toBeInTheDocument();
        });

        it('should show custom fallback when provided', () => {
            renderWithProviders(
                <ModuleGuard 
                    moduleId="life-insurance"
                    fallback={<CustomFallback />}
                >
                    <TestComponent />
                </ModuleGuard>
            );

            expect(screen.queryByTestId('test-content')).not.toBeInTheDocument();
            expect(screen.queryByText('Module Not Available')).not.toBeInTheDocument();
            expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
            expect(screen.getByText('Custom fallback content')).toBeInTheDocument();
        });

        it('should render nothing when showDefaultFallback is false', () => {
            const { container } = renderWithProviders(
                <ModuleGuard 
                    moduleId="life-insurance"
                    showDefaultFallback={false}
                >
                    <TestComponent />
                </ModuleGuard>
            );

            expect(screen.queryByTestId('test-content')).not.toBeInTheDocument();
            expect(screen.queryByText('Module Not Available')).not.toBeInTheDocument();
            expect(container.firstChild).toBeNull();
        });

        it('should prioritize custom fallback over showDefaultFallback setting', () => {
            renderWithProviders(
                <ModuleGuard 
                    moduleId="life-insurance"
                    fallback={<CustomFallback />}
                    showDefaultFallback={false}
                >
                    <TestComponent />
                </ModuleGuard>
            );

            expect(screen.queryByTestId('test-content')).not.toBeInTheDocument();
            expect(screen.queryByText('Module Not Available')).not.toBeInTheDocument();
            expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
        });
    });

    describe('Loading State', () => {
        beforeEach(() => {
            mockUseModules.mockReturnValue({
                isModuleEnabled: jest.fn().mockReturnValue(true),
                loading: true
            });
        });

        it('should render nothing when loading', () => {
            const { container } = renderWithProviders(
                <ModuleGuard moduleId="life-insurance">
                    <TestComponent />
                </ModuleGuard>
            );

            expect(screen.queryByTestId('test-content')).not.toBeInTheDocument();
            expect(screen.queryByText('Module Not Available')).not.toBeInTheDocument();
            expect(container.firstChild).toBeNull();
        });

        it('should not call isModuleEnabled when loading', () => {
            const mockIsModuleEnabled = jest.fn().mockReturnValue(true);
            mockUseModules.mockReturnValue({
                isModuleEnabled: mockIsModuleEnabled,
                loading: true
            });

            renderWithProviders(
                <ModuleGuard moduleId="life-insurance">
                    <TestComponent />
                </ModuleGuard>
            );

            expect(mockIsModuleEnabled).not.toHaveBeenCalled();
        });
    });

    describe('Different Module IDs', () => {
        it('should work with different module identifiers', () => {
            const mockIsModuleEnabled = jest.fn().mockImplementation((moduleId) => {
                return moduleId === 'tasks' || moduleId === 'reports';
            });

            mockUseModules.mockReturnValue({
                isModuleEnabled: mockIsModuleEnabled,
                loading: false
            });

            // Test enabled module
            const { rerender } = renderWithProviders(
                <ModuleGuard moduleId="tasks">
                    <TestComponent />
                </ModuleGuard>
            );

            expect(screen.getByTestId('test-content')).toBeInTheDocument();

            // Test disabled module
            rerender(
                <ThemeProvider theme={createTheme()}>
                    <ModuleGuard moduleId="payroll">
                        <TestComponent />
                    </ModuleGuard>
                </ThemeProvider>
            );

            expect(screen.queryByTestId('test-content')).not.toBeInTheDocument();
            expect(screen.getByText('Module Not Available')).toBeInTheDocument();

            // Test another enabled module
            rerender(
                <ThemeProvider theme={createTheme()}>
                    <ModuleGuard moduleId="reports">
                        <TestComponent />
                    </ModuleGuard>
                </ThemeProvider>
            );

            expect(screen.getByTestId('test-content')).toBeInTheDocument();
        });
    });

    describe('Default Fallback UI', () => {
        beforeEach(() => {
            mockUseModules.mockReturnValue({
                isModuleEnabled: jest.fn().mockReturnValue(false),
                loading: false
            });
        });

        it('should display lock icon in default fallback', () => {
            renderWithProviders(
                <ModuleGuard moduleId="life-insurance">
                    <TestComponent />
                </ModuleGuard>
            );

            // Check for lock icon (MUI LockIcon)
            const lockIcon = document.querySelector('[data-testid="LockIcon"]');
            expect(lockIcon || screen.getByText('Module Not Available')).toBeInTheDocument();
        });

        it('should include module name in default fallback message', () => {
            renderWithProviders(
                <ModuleGuard moduleId="custom-module">
                    <TestComponent />
                </ModuleGuard>
            );

            expect(screen.getByText(/enable the custom-module module/)).toBeInTheDocument();
        });

        it('should have proper styling classes for default fallback', () => {
            renderWithProviders(
                <ModuleGuard moduleId="life-insurance">
                    <TestComponent />
                </ModuleGuard>
            );

            const fallbackContainer = screen.getByText('Module Not Available').closest('div');
            expect(fallbackContainer).toBeInTheDocument();
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty children gracefully', () => {
            mockUseModules.mockReturnValue({
                isModuleEnabled: jest.fn().mockReturnValue(true),
                loading: false
            });

            const { container } = renderWithProviders(
                <ModuleGuard moduleId="life-insurance">
                    {null}
                </ModuleGuard>
            );

            // Should render without errors
            expect(container).toBeInTheDocument();
        });

        it('should handle undefined moduleId gracefully', () => {
            const mockIsModuleEnabled = jest.fn().mockReturnValue(false);
            mockUseModules.mockReturnValue({
                isModuleEnabled: mockIsModuleEnabled,
                loading: false
            });

            renderWithProviders(
                <ModuleGuard moduleId={undefined}>
                    <TestComponent />
                </ModuleGuard>
            );

            expect(mockIsModuleEnabled).toHaveBeenCalledWith(undefined);
            expect(screen.getByText('Module Not Available')).toBeInTheDocument();
        });

        it('should handle null fallback prop', () => {
            mockUseModules.mockReturnValue({
                isModuleEnabled: jest.fn().mockReturnValue(false),
                loading: false
            });

            renderWithProviders(
                <ModuleGuard 
                    moduleId="life-insurance"
                    fallback={null}
                    showDefaultFallback={false}
                >
                    <TestComponent />
                </ModuleGuard>
            );

            const { container } = render(
                <ThemeProvider theme={createTheme()}>
                    <ModuleGuard 
                        moduleId="life-insurance"
                        fallback={null}
                        showDefaultFallback={false}
                    >
                        <TestComponent />
                    </ModuleGuard>
                </ThemeProvider>
            );

            expect(container.firstChild).toBeNull();
        });
    });

    describe('Integration with Insurance Module', () => {
        it('should protect life-insurance module content', () => {
            const mockIsModuleEnabled = jest.fn().mockImplementation((moduleId) => {
                return moduleId !== 'life-insurance'; // life-insurance is disabled
            });

            mockUseModules.mockReturnValue({
                isModuleEnabled: mockIsModuleEnabled,
                loading: false
            });

            renderWithProviders(
                <ModuleGuard moduleId="life-insurance">
                    <div data-testid="insurance-content">
                        Insurance Policy Management
                    </div>
                </ModuleGuard>
            );

            expect(screen.queryByTestId('insurance-content')).not.toBeInTheDocument();
            expect(screen.getByText('Module Not Available')).toBeInTheDocument();
            expect(screen.getByText(/enable the life-insurance module/)).toBeInTheDocument();
        });

        it('should allow access when life-insurance module is enabled', () => {
            const mockIsModuleEnabled = jest.fn().mockImplementation((moduleId) => {
                return moduleId === 'life-insurance'; // life-insurance is enabled
            });

            mockUseModules.mockReturnValue({
                isModuleEnabled: mockIsModuleEnabled,
                loading: false
            });

            renderWithProviders(
                <ModuleGuard moduleId="life-insurance">
                    <div data-testid="insurance-content">
                        Insurance Policy Management
                    </div>
                </ModuleGuard>
            );

            expect(screen.getByTestId('insurance-content')).toBeInTheDocument();
            expect(screen.getByText('Insurance Policy Management')).toBeInTheDocument();
            expect(screen.queryByText('Module Not Available')).not.toBeInTheDocument();
        });
    });
});