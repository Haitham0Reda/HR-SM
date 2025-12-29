import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import LicensesPage from '../LicensesPage';
import licenseManagementSlice from '../../store/slices/licenseManagementSlice';
import tenantManagementSlice from '../../store/slices/tenantManagementSlice';

// Mock the license service
jest.mock('../../services/licenseApi', () => ({
  licenseService: {
    getLicenses: jest.fn(),
    getLicenseAnalytics: jest.fn(),
    getExpiringLicenses: jest.fn(),
    createLicense: jest.fn(),
    renewLicense: jest.fn(),
    revokeLicense: jest.fn(),
  },
}));

// Mock the platform API
jest.mock('../../services/platformApi', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
}));

const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      licenseManagement: licenseManagementSlice,
      tenantManagement: tenantManagementSlice,
    },
    preloadedState: {
      licenseManagement: {
        licenses: [],
        currentLicense: null,
        loading: false,
        error: null,
        lastSuccessfulOperation: null,
        analytics: {
          totalLicenses: 0,
          activeLicenses: 0,
          expiredLicenses: 0,
          revokedLicenses: 0,
          expiringLicenses: [],
          usageStats: null,
        },
        auditTrail: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
        filters: {
          search: '',
          status: 'all',
          type: 'all',
          expiryRange: 'all',
        },
        ...initialState.licenseManagement,
      },
      tenantManagement: {
        tenants: [],
        currentTenant: null,
        loading: false,
        error: null,
        lastSuccessfulOperation: null,
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
        filters: {
          search: '',
          status: 'all',
          subscriptionPlan: 'all',
        },
        ...initialState.tenantManagement,
      },
    },
  });
};

const renderWithProviders = (component, { initialState = {} } = {}) => {
  const store = createTestStore(initialState);
  
  return render(
    <Provider store={store}>
      <BrowserRouter>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          {component}
        </LocalizationProvider>
      </BrowserRouter>
    </Provider>
  );
};

describe('LicensesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders license management page with header', () => {
    renderWithProviders(<LicensesPage />);
    
    expect(screen.getByText('License Management')).toBeInTheDocument();
    expect(screen.getByText('Manage licenses, monitor usage, and track analytics')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create license/i })).toBeInTheDocument();
  });

  test('displays analytics cards with correct data', () => {
    const initialState = {
      licenseManagement: {
        analytics: {
          totalLicenses: 25,
          activeLicenses: 20,
          expiredLicenses: 3,
          revokedLicenses: 2,
          expiringLicenses: [
            { licenseNumber: 'LIC-001', tenantId: 'tenant1', expiresAt: '2024-02-01' }
          ],
        },
      },
    };

    renderWithProviders(<LicensesPage />, { initialState });
    
    expect(screen.getByText('25')).toBeInTheDocument(); // Total licenses
    expect(screen.getByText('20')).toBeInTheDocument(); // Active licenses
    expect(screen.getByText('1')).toBeInTheDocument(); // Expiring licenses
    expect(screen.getByText('5')).toBeInTheDocument(); // Inactive licenses (expired + revoked)
  });

  test('displays licenses table with license data', () => {
    const mockLicenses = [
      {
        licenseNumber: 'LIC-001',
        tenantId: 'tenant1',
        type: 'professional',
        status: 'active',
        expiresAt: '2024-12-31T23:59:59.000Z',
        features: {
          maxUsers: 100,
          modules: ['hr-core', 'attendance', 'payroll'],
        },
      },
      {
        licenseNumber: 'LIC-002',
        tenantId: 'tenant2',
        type: 'basic',
        status: 'expired',
        expiresAt: '2023-12-31T23:59:59.000Z',
        features: {
          maxUsers: 50,
          modules: ['hr-core'],
        },
      },
    ];

    const mockTenants = [
      { _id: 'tenant1', name: 'Acme Corp' },
      { _id: 'tenant2', name: 'Tech Solutions' },
    ];

    const initialState = {
      licenseManagement: {
        licenses: mockLicenses,
      },
      tenantManagement: {
        tenants: mockTenants,
      },
    };

    renderWithProviders(<LicensesPage />, { initialState });
    
    expect(screen.getByText('LIC-001')).toBeInTheDocument();
    expect(screen.getByText('LIC-002')).toBeInTheDocument();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Tech Solutions')).toBeInTheDocument();
    expect(screen.getByText('PROFESSIONAL')).toBeInTheDocument();
    expect(screen.getByText('BASIC')).toBeInTheDocument();
  });

  test('opens create license dialog when create button is clicked', async () => {
    renderWithProviders(<LicensesPage />);
    
    const createButton = screen.getByRole('button', { name: /create license/i });
    fireEvent.click(createButton);
    
    await waitFor(() => {
      expect(screen.getByText('Create New License')).toBeInTheDocument();
    });
    
    expect(screen.getByLabelText(/tenant/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/license type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/expiry date/i)).toBeInTheDocument();
  });

  test('filters licenses by status', async () => {
    renderWithProviders(<LicensesPage />);
    
    const statusFilter = screen.getByLabelText(/status/i);
    fireEvent.mouseDown(statusFilter);
    
    await waitFor(() => {
      expect(screen.getByText('Active')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Active'));
    
    // Verify filter is applied (this would trigger a Redux action)
    expect(statusFilter).toHaveValue('active');
  });

  test('searches licenses by search term', async () => {
    renderWithProviders(<LicensesPage />);
    
    const searchInput = screen.getByPlaceholderText(/search licenses/i);
    const searchButton = screen.getByRole('button', { name: /search/i });
    
    fireEvent.change(searchInput, { target: { value: 'LIC-001' } });
    fireEvent.click(searchButton);
    
    expect(searchInput).toHaveValue('LIC-001');
  });

  test('opens analytics dialog when analytics button is clicked', async () => {
    renderWithProviders(<LicensesPage />);
    
    const analyticsButton = screen.getByRole('button', { name: /analytics/i });
    fireEvent.click(analyticsButton);
    
    await waitFor(() => {
      expect(screen.getByText('License Analytics')).toBeInTheDocument();
    });
    
    expect(screen.getByText('License Distribution')).toBeInTheDocument();
    expect(screen.getByText('Expiring Licenses')).toBeInTheDocument();
  });

  test('handles loading state correctly', () => {
    const initialState = {
      licenseManagement: {
        loading: true,
      },
    };

    renderWithProviders(<LicensesPage />, { initialState });
    
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  test('displays error message when error occurs', () => {
    const initialState = {
      licenseManagement: {
        error: {
          message: 'Failed to load licenses',
          code: 'FETCH_LICENSES_FAILED',
          timestamp: new Date().toISOString(),
          retryable: true,
        },
      },
    };

    renderWithProviders(<LicensesPage />, { initialState });
    
    expect(screen.getByText('Failed to load licenses')).toBeInTheDocument();
  });

  test('clears filters when clear button is clicked', async () => {
    renderWithProviders(<LicensesPage />);
    
    // Set some filters first
    const searchInput = screen.getByPlaceholderText(/search licenses/i);
    fireEvent.change(searchInput, { target: { value: 'test' } });
    
    const clearButton = screen.getByRole('button', { name: /clear/i });
    fireEvent.click(clearButton);
    
    await waitFor(() => {
      expect(searchInput).toHaveValue('');
    });
  });

  test('opens action menu when more actions button is clicked', async () => {
    const mockLicenses = [
      {
        licenseNumber: 'LIC-001',
        tenantId: 'tenant1',
        type: 'professional',
        status: 'active',
        expiresAt: '2024-12-31T23:59:59.000Z',
        features: {
          maxUsers: 100,
          modules: ['hr-core'],
        },
      },
    ];

    const initialState = {
      licenseManagement: {
        licenses: mockLicenses,
      },
    };

    renderWithProviders(<LicensesPage />, { initialState });
    
    const moreButton = screen.getByRole('button', { name: /more/i });
    fireEvent.click(moreButton);
    
    await waitFor(() => {
      expect(screen.getByText('View Details')).toBeInTheDocument();
      expect(screen.getByText('Assign to Tenant')).toBeInTheDocument();
      expect(screen.getByText('View Audit Trail')).toBeInTheDocument();
    });
  });

  test('validates create license form', async () => {
    renderWithProviders(<LicensesPage />);
    
    const createButton = screen.getByRole('button', { name: /create license/i });
    fireEvent.click(createButton);
    
    await waitFor(() => {
      expect(screen.getByText('Create New License')).toBeInTheDocument();
    });
    
    const submitButton = screen.getByRole('button', { name: /create license/i });
    expect(submitButton).toBeDisabled(); // Should be disabled without tenant selection
  });

  test('handles pagination correctly', async () => {
    const initialState = {
      licenseManagement: {
        pagination: {
          page: 1,
          limit: 10,
          total: 25,
          totalPages: 3,
        },
      },
    };

    renderWithProviders(<LicensesPage />, { initialState });
    
    expect(screen.getByText('1–10 of 25')).toBeInTheDocument();
  });
});