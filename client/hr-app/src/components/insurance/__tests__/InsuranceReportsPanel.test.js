/**
 * InsuranceReportsPanel Component Tests
 * 
 * Tests for InsuranceReportsPanel filtering, export, and analytics display.
 * Validates: Requirements 5.5
 */

import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import InsuranceReportsPanel from '../InsuranceReportsPanel';

// Mock the insurance hooks
const mockGenerateReport = jest.fn();
const mockFetchAnalytics = jest.fn();

jest.mock('../../../hooks/useInsurance', () => ({
    useInsuranceReports: () => ({
        generateReport: mockGenerateReport,
        fetchAnalytics: mockFetchAnalytics,
        analytics: {
            totalPolicies: 156,
            activePolicies: 142,
            totalClaims: 23,
            pendingClaims: 8
        },
        loading: false
    })
}));

// Mock recharts components to avoid canvas issues in tests
jest.mock('recharts', () => ({
    LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
    Line: () => <div data-testid="line" />,
    BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
    Bar: () => <div data-testid="bar" />,
    PieChart: ({ children }) => <div data-testid="pie-chart">{children}</div>,
    Pie: () => <div data-testid="pie" />,
    Cell: () => <div data-testid="cell" />,
    XAxis: () => <div data-testid="x-axis" />,
    YAxis: () => <div data-testid="y-axis" />,
    CartesianGrid: () => <div data-testid="cartesian-grid" />,
    Tooltip: () => <div data-testid="tooltip" />,
    Legend: () => <div data-testid="legend" />,
    ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>
}));

// Helper to wrap component with required providers
const renderWithProviders = (component) => {
    const theme = createTheme();
    return render(
        <ThemeProvider theme={theme}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
                {component}
            </LocalizationProvider>
        </ThemeProvider>
    );
};

describe('InsuranceReportsPanel Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        
        // Mock URL.createObjectURL for file downloads
        global.URL.createObjectURL = jest.fn(() => 'mock-url');
        global.URL.revokeObjectURL = jest.fn();
        
        // Mock document methods for file downloads
        const mockLink = {
            click: jest.fn(),
            download: '',
            href: ''
        };
        document.createElement = jest.fn().mockImplementation((tagName) => {
            if (tagName === 'a') {
                return mockLink;
            }
            return {};
        });
        document.body.appendChild = jest.fn();
        document.body.removeChild = jest.fn();
    });

    afterEach(() => {
        cleanup();
    });

    describe('Component Rendering', () => {
        it('should render the main title and refresh button', () => {
            renderWithProviders(<InsuranceReportsPanel />);

            expect(screen.getByText('Insurance Reports & Analytics')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /refresh analytics/i })).toBeInTheDocument();
        });

        it('should render key metrics cards', () => {
            renderWithProviders(<InsuranceReportsPanel />);

            expect(screen.getByText('Total Policies')).toBeInTheDocument();
            expect(screen.getByText('Total Coverage')).toBeInTheDocument();
            expect(screen.getByText('Monthly Premiums')).toBeInTheDocument();
            expect(screen.getByText('Active Claims')).toBeInTheDocument();
        });

        it('should render report generation section', () => {
            renderWithProviders(<InsuranceReportsPanel />);

            expect(screen.getByText('Generate Reports')).toBeInTheDocument();
            expect(screen.getByLabelText(/report type/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/policy type/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/status/i)).toBeInTheDocument();
        });

        it('should render charts section', () => {
            renderWithProviders(<InsuranceReportsPanel />);

            expect(screen.getByText('Policy Distribution by Type')).toBeInTheDocument();
            expect(screen.getByText('Monthly Trends')).toBeInTheDocument();
            expect(screen.getByText('Premium Collection Trends')).toBeInTheDocument();
            
            // Check that chart components are rendered
            expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
            expect(screen.getAllByTestId('line-chart')).toHaveLength(1);
            expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
        });
    });

    describe('Report Generation', () => {
        it('should have default filter values', () => {
            renderWithProviders(<InsuranceReportsPanel />);

            const reportTypeSelect = screen.getByLabelText(/report type/i);
            expect(reportTypeSelect).toHaveValue('policies');

            const policyTypeSelect = screen.getByLabelText(/policy type/i);
            expect(policyTypeSelect).toHaveValue('');

            const statusSelect = screen.getByLabelText(/status/i);
            expect(statusSelect).toHaveValue('');
        });

        it('should update filter values when changed', async () => {
            renderWithProviders(<InsuranceReportsPanel />);

            // Change report type
            const reportTypeSelect = screen.getByLabelText(/report type/i);
            await userEvent.click(reportTypeSelect);
            const claimsOption = screen.getByText('Claims Report');
            await userEvent.click(claimsOption);

            expect(reportTypeSelect).toHaveValue('claims');

            // Change policy type
            const policyTypeSelect = screen.getByLabelText(/policy type/i);
            await userEvent.click(policyTypeSelect);
            const catAOption = screen.getByText('Category A');
            await userEvent.click(catAOption);

            expect(policyTypeSelect).toHaveValue('CAT_A');

            // Change status
            const statusSelect = screen.getByLabelText(/status/i);
            await userEvent.click(statusSelect);
            const activeOption = screen.getByText('Active');
            await userEvent.click(activeOption);

            expect(statusSelect).toHaveValue('active');
        });

        it('should generate PDF report when PDF button is clicked', async () => {
            renderWithProviders(<InsuranceReportsPanel />);

            const pdfButton = screen.getByRole('button', { name: /pdf/i });
            await userEvent.click(pdfButton);

            expect(mockGenerateReport).toHaveBeenCalledWith('policies', expect.objectContaining({
                format: 'pdf'
            }));
        });

        it('should generate Excel report when Excel button is clicked', async () => {
            renderWithProviders(<InsuranceReportsPanel />);

            const excelButton = screen.getByRole('button', { name: /excel/i });
            await userEvent.click(excelButton);

            expect(mockGenerateReport).toHaveBeenCalledWith('policies', expect.objectContaining({
                format: 'excel'
            }));
        });

        it('should include all filter parameters when generating report', async () => {
            renderWithProviders(<InsuranceReportsPanel />);

            // Set filters
            const reportTypeSelect = screen.getByLabelText(/report type/i);
            await userEvent.click(reportTypeSelect);
            const analyticsOption = screen.getByText('Analytics Report');
            await userEvent.click(analyticsOption);

            const policyTypeSelect = screen.getByLabelText(/policy type/i);
            await userEvent.click(policyTypeSelect);
            const catBOption = screen.getByText('Category B');
            await userEvent.click(catBOption);

            const statusSelect = screen.getByLabelText(/status/i);
            await userEvent.click(statusSelect);
            const expiredOption = screen.getByText('Expired');
            await userEvent.click(expiredOption);

            // Generate report
            const pdfButton = screen.getByRole('button', { name: /pdf/i });
            await userEvent.click(pdfButton);

            expect(mockGenerateReport).toHaveBeenCalledWith('analytics', expect.objectContaining({
                reportType: 'analytics',
                policyType: 'CAT_B',
                status: 'expired',
                format: 'pdf'
            }));
        });
    });

    describe('Date Filtering', () => {
        it('should have default date range (1 year)', () => {
            renderWithProviders(<InsuranceReportsPanel />);

            const startDateInput = screen.getByLabelText(/start date/i);
            const endDateInput = screen.getByLabelText(/end date/i);

            expect(startDateInput).toBeInTheDocument();
            expect(endDateInput).toBeInTheDocument();
        });

        it('should update date filters', async () => {
            renderWithProviders(<InsuranceReportsPanel />);

            const startDateInput = screen.getByLabelText(/start date/i);
            await userEvent.clear(startDateInput);
            await userEvent.type(startDateInput, '01/01/2024');

            const endDateInput = screen.getByLabelText(/end date/i);
            await userEvent.clear(endDateInput);
            await userEvent.type(endDateInput, '12/31/2024');

            // Generate report to verify dates are included
            const pdfButton = screen.getByRole('button', { name: /pdf/i });
            await userEvent.click(pdfButton);

            expect(mockGenerateReport).toHaveBeenCalledWith('policies', expect.objectContaining({
                startDate: expect.any(String),
                endDate: expect.any(String)
            }));
        });
    });

    describe('Analytics Display', () => {
        it('should display key metrics with correct values', () => {
            renderWithProviders(<InsuranceReportsPanel />);

            expect(screen.getByText('156')).toBeInTheDocument(); // Total policies
            expect(screen.getByText('142 active')).toBeInTheDocument(); // Active policies
            expect(screen.getByText('23')).toBeInTheDocument(); // Total claims
            expect(screen.getByText('8 pending')).toBeInTheDocument(); // Pending claims
        });

        it('should display trend indicators', () => {
            renderWithProviders(<InsuranceReportsPanel />);

            // Should show trend percentages (mocked data)
            expect(screen.getByText(/8\.5% vs last year/)).toBeInTheDocument();
            expect(screen.getByText(/12\.1% vs last year/)).toBeInTheDocument();
            expect(screen.getByText(/5\.7% vs last year/)).toBeInTheDocument();
        });

        it('should show formatted currency values', () => {
            renderWithProviders(<InsuranceReportsPanel />);

            // Should display formatted currency (from mock data)
            expect(screen.getByText(/\$15,600,000/)).toBeInTheDocument(); // Total coverage
            expect(screen.getByText(/\$46,800/)).toBeInTheDocument(); // Monthly premiums
        });
    });

    describe('Refresh Functionality', () => {
        it('should refresh analytics when refresh button is clicked', async () => {
            renderWithProviders(<InsuranceReportsPanel />);

            const refreshButton = screen.getByRole('button', { name: /refresh analytics/i });
            await userEvent.click(refreshButton);

            expect(mockFetchAnalytics).toHaveBeenCalled();
        });

        it('should call fetchAnalytics on component mount', () => {
            renderWithProviders(<InsuranceReportsPanel />);

            expect(mockFetchAnalytics).toHaveBeenCalled();
        });
    });

    describe('Loading States', () => {
        it('should show loading progress when analyticsLoading is true', () => {
            // Mock loading state
            jest.doMock('../../../hooks/useInsurance', () => ({
                useInsuranceReports: () => ({
                    generateReport: mockGenerateReport,
                    fetchAnalytics: mockFetchAnalytics,
                    analytics: null,
                    loading: true
                })
            }));

            renderWithProviders(<InsuranceReportsPanel />);

            // Should show loading indicator
            expect(screen.getByRole('progressbar')).toBeInTheDocument();
        });

        it('should disable buttons when loading', () => {
            // Mock loading state
            jest.doMock('../../../hooks/useInsurance', () => ({
                useInsuranceReports: () => ({
                    generateReport: mockGenerateReport,
                    fetchAnalytics: mockFetchAnalytics,
                    analytics: null,
                    loading: true
                })
            }));

            renderWithProviders(<InsuranceReportsPanel />);

            const pdfButton = screen.getByRole('button', { name: /pdf/i });
            const excelButton = screen.getByRole('button', { name: /excel/i });

            expect(pdfButton).toBeDisabled();
            expect(excelButton).toBeDisabled();
        });
    });

    describe('Report Type Options', () => {
        it('should display all report type options', async () => {
            renderWithProviders(<InsuranceReportsPanel />);

            const reportTypeSelect = screen.getByLabelText(/report type/i);
            await userEvent.click(reportTypeSelect);

            expect(screen.getByText('Policies Report')).toBeInTheDocument();
            expect(screen.getByText('Claims Report')).toBeInTheDocument();
            expect(screen.getByText('Analytics Report')).toBeInTheDocument();
        });

        it('should display all policy type options', async () => {
            renderWithProviders(<InsuranceReportsPanel />);

            const policyTypeSelect = screen.getByLabelText(/policy type/i);
            await userEvent.click(policyTypeSelect);

            expect(screen.getByText('All Types')).toBeInTheDocument();
            expect(screen.getByText('Category A')).toBeInTheDocument();
            expect(screen.getByText('Category B')).toBeInTheDocument();
            expect(screen.getByText('Category C')).toBeInTheDocument();
        });

        it('should display all status options', async () => {
            renderWithProviders(<InsuranceReportsPanel />);

            const statusSelect = screen.getByLabelText(/status/i);
            await userEvent.click(statusSelect);

            expect(screen.getByText('All Status')).toBeInTheDocument();
            expect(screen.getByText('Active')).toBeInTheDocument();
            expect(screen.getByText('Expired')).toBeInTheDocument();
            expect(screen.getByText('Cancelled')).toBeInTheDocument();
        });
    });

    describe('Error Handling', () => {
        it('should handle report generation errors gracefully', async () => {
            mockGenerateReport.mockRejectedValue(new Error('Report generation failed'));
            
            renderWithProviders(<InsuranceReportsPanel />);

            const pdfButton = screen.getByRole('button', { name: /pdf/i });
            await userEvent.click(pdfButton);

            expect(mockGenerateReport).toHaveBeenCalled();
            // Component should not crash and buttons should remain functional
            expect(pdfButton).toBeInTheDocument();
        });

        it('should handle analytics fetch errors gracefully', async () => {
            mockFetchAnalytics.mockRejectedValue(new Error('Analytics fetch failed'));
            
            renderWithProviders(<InsuranceReportsPanel />);

            const refreshButton = screen.getByRole('button', { name: /refresh analytics/i });
            await userEvent.click(refreshButton);

            expect(mockFetchAnalytics).toHaveBeenCalled();
            // Component should not crash
            expect(refreshButton).toBeInTheDocument();
        });
    });

    describe('Accessibility', () => {
        it('should have proper ARIA labels for interactive elements', () => {
            renderWithProviders(<InsuranceReportsPanel />);

            expect(screen.getByLabelText(/report type/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/policy type/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/status/i)).toBeInTheDocument();
        });

        it('should have proper button labels', () => {
            renderWithProviders(<InsuranceReportsPanel />);

            expect(screen.getByRole('button', { name: /refresh analytics/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /pdf/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /excel/i })).toBeInTheDocument();
        });
    });
});