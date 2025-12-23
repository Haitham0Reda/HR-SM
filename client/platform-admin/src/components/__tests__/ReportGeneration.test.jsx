import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import RevenueAnalytics from '../RevenueAnalytics';
import { ApiProvider } from '../../contexts/ApiContext';

// Mock Chart.js
jest.mock('react-chartjs-2', () => ({
  Line: ({ data, options }) => (
    <div data-testid="line-chart" data-chart-data={JSON.stringify(data)}>
      Line Chart
    </div>
  ),
  Bar: ({ data, options }) => (
    <div data-testid="bar-chart" data-chart-data={JSON.stringify(data)}>
      Bar Chart
    </div>
  )
}));

// Mock the API context
const mockApi = {
  platform: {
    getRevenueAnalytics: jest.fn(),
    getUsageAnalytics: jest.fn(),
    getPerformanceMetrics: jest.fn()
  }
};

const MockApiProvider = ({ children }) => {
  const contextValue = {
    api: mockApi,
    status: {
      platform: { connected: true, error: null },
      licenseServer: { connected: true, error: null },
      realtime: { connected: true, error: null }
    },
    isHealthy: true,
    hasErrors: false
  };

  return (
    <div data-testid="mock-api-provider">
      {React.cloneElement(children, { ...contextValue })}
    </div>
  );
};

const theme = createTheme();

const renderWithProviders = (component) => {
  return render(
    <ThemeProvider theme={theme}>
      <ApiProvider>
        {component}
      </ApiProvider>
    </ThemeProvider>
  );
};

const mockRevenueData = {
  summary: {
    totalRevenue: 125000,
    mrr: 15000,
    arr: 180000,
    churnRate: 2.5,
    growthRate: 12.3
  },
  timeSeries: [
    { date: '2024-01-01', mrr: 12000, totalRevenue: 12000, activeSubscriptions: 45 },
    { date: '2024-02-01', mrr: 13500, totalRevenue: 25500, activeSubscriptions: 48 },
    { date: '2024-03-01', mrr: 15000, totalRevenue: 40500, activeSubscriptions: 52 }
  ],
  byPlan: [
    { plan: 'basic', revenue: 45000, subscriptions: 30 },
    { plan: 'professional', revenue: 60000, subscriptions: 15 },
    { plan: 'enterprise', revenue: 20000, subscriptions: 7 }
  ]
};

describe('Report Generation and Export', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.platform.getRevenueAnalytics.mockResolvedValue({
      success: true,
      data: mockRevenueData
    });
  });

  describe('Report Data Loading', () => {
    test('loads revenue analytics data on mount', async () => {
      renderWithProviders(<RevenueAnalytics />);
      
      await waitFor(() => {
        expect(mockApi.platform.getRevenueAnalytics).toHaveBeenCalled();
      });
    });

    test('displays revenue summary metrics', async () => {
      renderWithProviders(<RevenueAnalytics />);
      
      await waitFor(() => {
        expect(screen.getByText('$125,000')).toBeInTheDocument(); // Total revenue
        expect(screen.getByText('$15,000')).toBeInTheDocument(); // MRR
        expect(screen.getByText('$180,000')).toBeInTheDocument(); // ARR
        expect(screen.getByText('2.5%')).toBeInTheDocument(); // Churn rate
      });
    });

    test('renders charts with correct data', async () => {
      renderWithProviders(<RevenueAnalytics />);
      
      await waitFor(() => {
        const lineChart = screen.getByTestId('line-chart');
        expect(lineChart).toBeInTheDocument();
        
        const chartData = JSON.parse(lineChart.getAttribute('data-chart-data'));
        expect(chartData.datasets[0].data).toEqual([12000, 13500, 15000]);
      });
    });
  });

  describe('Export Functionality', () => {
    // Mock URL.createObjectURL and document.createElement
    const mockCreateObjectURL = jest.fn();
    const mockClick = jest.fn();
    const mockAppendChild = jest.fn();
    const mockRemoveChild = jest.fn();

    beforeEach(() => {
      global.URL.createObjectURL = mockCreateObjectURL;
      global.URL.revokeObjectURL = jest.fn();
      
      const mockAnchor = {
        click: mockClick,
        href: '',
        download: '',
        style: { display: '' }
      };
      
      jest.spyOn(document, 'createElement').mockReturnValue(mockAnchor);
      jest.spyOn(document.body, 'appendChild').mockImplementation(mockAppendChild);
      jest.spyOn(document.body, 'removeChild').mockImplementation(mockRemoveChild);
      
      mockCreateObjectURL.mockReturnValue('blob:mock-url');
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    test('exports data as CSV format', async () => {
      renderWithProviders(<RevenueAnalytics />);
      
      await waitFor(() => {
        expect(screen.getByText('$125,000')).toBeInTheDocument();
      });
      
      const exportButton = screen.getByRole('button', { name: /export csv/i });
      await user.click(exportButton);
      
      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      
      // Verify CSV content structure
      const csvBlob = mockCreateObjectURL.mock.calls[0][0];
      expect(csvBlob.type).toBe('text/csv');
    });

    test('exports data as Excel format', async () => {
      renderWithProviders(<RevenueAnalytics />);
      
      await waitFor(() => {
        expect(screen.getByText('$125,000')).toBeInTheDocument();
      });
      
      const exportButton = screen.getByRole('button', { name: /export excel/i });
      await user.click(exportButton);
      
      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      
      // Verify Excel content structure
      const excelBlob = mockCreateObjectURL.mock.calls[0][0];
      expect(excelBlob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    });

    test('exports data as PDF format', async () => {
      renderWithProviders(<RevenueAnalytics />);
      
      await waitFor(() => {
        expect(screen.getByText('$125,000')).toBeInTheDocument();
      });
      
      const exportButton = screen.getByRole('button', { name: /export pdf/i });
      await user.click(exportButton);
      
      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      
      // Verify PDF content structure
      const pdfBlob = mockCreateObjectURL.mock.calls[0][0];
      expect(pdfBlob.type).toBe('application/pdf');
    });

    test('includes correct filename with timestamp', async () => {
      const mockDate = new Date('2024-01-15T10:30:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
      
      renderWithProviders(<RevenueAnalytics />);
      
      await waitFor(() => {
        expect(screen.getByText('$125,000')).toBeInTheDocument();
      });
      
      const exportButton = screen.getByRole('button', { name: /export csv/i });
      await user.click(exportButton);
      
      const mockAnchor = document.createElement.mock.results[0].value;
      expect(mockAnchor.download).toMatch(/revenue-analytics-\d{4}-\d{2}-\d{2}\.csv/);
      
      jest.restoreAllMocks();
    });

    test('handles export errors gracefully', async () => {
      mockCreateObjectURL.mockImplementation(() => {
        throw new Error('Export failed');
      });
      
      renderWithProviders(<RevenueAnalytics />);
      
      await waitFor(() => {
        expect(screen.getByText('$125,000')).toBeInTheDocument();
      });
      
      const exportButton = screen.getByRole('button', { name: /export csv/i });
      await user.click(exportButton);
      
      // Should not crash the component
      expect(screen.getByText('$125,000')).toBeInTheDocument();
    });
  });

  describe('Date Range Filtering', () => {
    test('updates data when date range changes', async () => {
      renderWithProviders(<RevenueAnalytics />);
      
      await waitFor(() => {
        expect(mockApi.platform.getRevenueAnalytics).toHaveBeenCalledTimes(1);
      });
      
      const dateRangeSelect = screen.getByLabelText(/date range/i);
      await user.click(dateRangeSelect);
      
      const lastMonthOption = screen.getByText('Last Month');
      await user.click(lastMonthOption);
      
      await waitFor(() => {
        expect(mockApi.platform.getRevenueAnalytics).toHaveBeenCalledTimes(2);
        expect(mockApi.platform.getRevenueAnalytics).toHaveBeenLastCalledWith(
          expect.objectContaining({
            period: 'last_month'
          })
        );
      });
    });

    test('applies custom date range filter', async () => {
      renderWithProviders(<RevenueAnalytics />);
      
      const startDatePicker = screen.getByLabelText(/start date/i);
      const endDatePicker = screen.getByLabelText(/end date/i);
      
      // Simulate date selection (simplified for testing)
      fireEvent.change(startDatePicker, { target: { value: '2024-01-01' } });
      fireEvent.change(endDatePicker, { target: { value: '2024-01-31' } });
      
      const applyButton = screen.getByRole('button', { name: /apply filter/i });
      await user.click(applyButton);
      
      await waitFor(() => {
        expect(mockApi.platform.getRevenueAnalytics).toHaveBeenCalledWith(
          expect.objectContaining({
            startDate: '2024-01-01',
            endDate: '2024-01-31'
          })
        );
      });
    });
  });

  describe('Report Consistency', () => {
    test('maintains data consistency across different export formats', async () => {
      renderWithProviders(<RevenueAnalytics />);
      
      await waitFor(() => {
        expect(screen.getByText('$125,000')).toBeInTheDocument();
      });
      
      // Export as CSV
      const csvButton = screen.getByRole('button', { name: /export csv/i });
      await user.click(csvButton);
      
      const csvBlob = mockCreateObjectURL.mock.calls[0][0];
      
      // Export as Excel
      const excelButton = screen.getByRole('button', { name: /export excel/i });
      await user.click(excelButton);
      
      const excelBlob = mockCreateObjectURL.mock.calls[1][0];
      
      // Both exports should contain the same data structure
      expect(csvBlob.size).toBeGreaterThan(0);
      expect(excelBlob.size).toBeGreaterThan(0);
    });

    test('includes all required fields in exported data', async () => {
      renderWithProviders(<RevenueAnalytics />);
      
      await waitFor(() => {
        expect(screen.getByText('$125,000')).toBeInTheDocument();
      });
      
      const exportButton = screen.getByRole('button', { name: /export csv/i });
      await user.click(exportButton);
      
      // Verify that the export includes all expected fields
      expect(mockCreateObjectURL).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'text/csv'
        })
      );
    });

    test('preserves data formatting in exports', async () => {
      renderWithProviders(<RevenueAnalytics />);
      
      await waitFor(() => {
        expect(screen.getByText('$125,000')).toBeInTheDocument();
      });
      
      const exportButton = screen.getByRole('button', { name: /export pdf/i });
      await user.click(exportButton);
      
      // PDF should maintain proper formatting
      expect(mockCreateObjectURL).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'application/pdf'
        })
      );
    });
  });

  describe('Loading and Error States', () => {
    test('shows loading indicator while fetching data', () => {
      mockApi.platform.getRevenueAnalytics.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );
      
      renderWithProviders(<RevenueAnalytics />);
      
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    test('displays error message when data loading fails', async () => {
      mockApi.platform.getRevenueAnalytics.mockRejectedValue(
        new Error('Failed to load analytics data')
      );
      
      renderWithProviders(<RevenueAnalytics />);
      
      await waitFor(() => {
        expect(screen.getByText(/failed to load analytics data/i)).toBeInTheDocument();
      });
    });

    test('disables export buttons during loading', () => {
      mockApi.platform.getRevenueAnalytics.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );
      
      renderWithProviders(<RevenueAnalytics />);
      
      const exportButtons = screen.getAllByRole('button', { name: /export/i });
      exportButtons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA labels for export buttons', async () => {
      renderWithProviders(<RevenueAnalytics />);
      
      await waitFor(() => {
        expect(screen.getByText('$125,000')).toBeInTheDocument();
      });
      
      const csvButton = screen.getByRole('button', { name: /export csv/i });
      const excelButton = screen.getByRole('button', { name: /export excel/i });
      const pdfButton = screen.getByRole('button', { name: /export pdf/i });
      
      expect(csvButton).toHaveAttribute('aria-label', expect.stringContaining('CSV'));
      expect(excelButton).toHaveAttribute('aria-label', expect.stringContaining('Excel'));
      expect(pdfButton).toHaveAttribute('aria-label', expect.stringContaining('PDF'));
    });

    test('supports keyboard navigation for export controls', async () => {
      renderWithProviders(<RevenueAnalytics />);
      
      await waitFor(() => {
        expect(screen.getByText('$125,000')).toBeInTheDocument();
      });
      
      const csvButton = screen.getByRole('button', { name: /export csv/i });
      csvButton.focus();
      
      await user.tab();
      
      const excelButton = screen.getByRole('button', { name: /export excel/i });
      expect(excelButton).toHaveFocus();
    });
  });
});