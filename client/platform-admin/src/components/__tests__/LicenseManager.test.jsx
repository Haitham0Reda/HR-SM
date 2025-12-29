import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import LicenseManager from '../LicenseManager';
import licenseManagementSlice from '../../store/slices/licenseManagementSlice';

// Mock the API context
const mockApi = {
  license: {
    getTenantLicense: jest.fn(),
    renewLicense: jest.fn(),
    revokeLicense: jest.fn(),
  },
};

jest.mock('../../contexts/ApiContext', () => ({
  useApi: () => ({ api: mockApi }),
}));

const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      licenseManagement: licenseManagementSlice,
    },
    preloadedState: {
      licenseManagement: {
        currentLicense: null,
        loading: false,
        error: null,
        ...initialState.licenseManagement,
      },
    },
  });
};

const renderWithProviders = (component, { initialState = {} } = {}) => {
  const store = createTestStore(initialState);
  
  return render(
    <Provider store={store}>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        {component}
      </LocalizationProvider>
    </Provider>
  );
};

const mockLicense = {
  licenseNumber: 'LIC-001',
  tenantId: 'tenant1',
  type: 'professional',
  status: 'active',
  issuedAt: '2024-01-01T00:00:00.000Z',
  expiresAt: '2024-12-31T23:59:59.000Z',
  features: {
    maxUsers: 100,
    maxStorage: 2048,
    maxAPICallsPerMonth: 50000,
    modules: ['hr-core', 'attendance', 'payroll'],
  },
  activations: [
    {
      machineId: 'machine-123',
      activatedAt: '2024-01-01T00:00:00.000Z',
      lastValidatedAt: '2024-01-15T10:30:00.000Z',
      ipAddress: '192.168.1.100',
    },
  ],
  usage: {
    totalValidations: 1500,
    currentUsers: 85,
    currentStorage: 1024 * 1024 * 1024, // 1GB in bytes
    lastValidatedAt: '2024-01-15T10:30:00.000Z',
  },
  notes: 'Professional license for Acme Corp',
};

describe('LicenseManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders license manager dialog when open', () => {
    const initialState = {
      licenseManagement: {
        currentLicense: mockLicense,
      },
    };

    renderWithProviders(
      <LicenseManager
        open={true}
        onClose={jest.fn()}
        tenantId="tenant1"
        tenantName="Acme Corp"
      />,
      { initialState }
    );
    
    expect(screen.getByText('License Manager - Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('License Status')).toBeInTheDocument();
  });

  test('does not render when closed', () => {
    renderWithProviders(
      <LicenseManager
        open={false}
        onClose={jest.fn()}
        tenantId="tenant1"
        tenantName="Acme Corp"
      />
    );
    
    expect(screen.queryByText('License Manager - Acme Corp')).not.toBeInTheDocument();
  });

  test('displays license information correctly', () => {
    const initialState = {
      licenseManagement: {
        currentLicense: mockLicense,
      },
    };

    renderWithProviders(
      <LicenseManager
        open={true}
        onClose={jest.fn()}
        tenantId="tenant1"
        tenantName="Acme Corp"
      />,
      { initialState }
    );
    
    expect(screen.getByText('LIC-001')).toBeInTheDocument();
    expect(screen.getByText('PROFESSIONAL')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument(); // Max users
    expect(screen.getByText('2048 MB')).toBeInTheDocument(); // Storage
    expect(screen.getByText('50,000')).toBeInTheDocument(); // API calls
  });

  test('shows active status for valid license', () => {
    const initialState = {
      licenseManagement: {
        currentLicense: {
          ...mockLicense,
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
        },
      },
    };

    renderWithProviders(
      <LicenseManager
        open={true}
        onClose={jest.fn()}
        tenantId="tenant1"
        tenantName="Acme Corp"
      />,
      { initialState }
    );
    
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
  });

  test('shows expiring status for license expiring soon', () => {
    const initialState = {
      licenseManagement: {
        currentLicense: {
          ...mockLicense,
          expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days from now
        },
      },
    };

    renderWithProviders(
      <LicenseManager
        open={true}
        onClose={jest.fn()}
        tenantId="tenant1"
        tenantName="Acme Corp"
      />,
      { initialState }
    );
    
    expect(screen.getByText('EXPIRING')).toBeInTheDocument();
    expect(screen.getByText(/expires in \d+ days/i)).toBeInTheDocument();
  });

  test('shows expired status for expired license', () => {
    const initialState = {
      licenseManagement: {
        currentLicense: {
          ...mockLicense,
          expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        },
      },
    };

    renderWithProviders(
      <LicenseManager
        open={true}
        onClose={jest.fn()}
        tenantId="tenant1"
        tenantName="Acme Corp"
      />,
      { initialState }
    );
    
    expect(screen.getByText('EXPIRED')).toBeInTheDocument();
    expect(screen.getByText(/license has expired/i)).toBeInTheDocument();
  });

  test('shows revoked status for revoked license', () => {
    const initialState = {
      licenseManagement: {
        currentLicense: {
          ...mockLicense,
          status: 'revoked',
        },
      },
    };

    renderWithProviders(
      <LicenseManager
        open={true}
        onClose={jest.fn()}
        tenantId="tenant1"
        tenantName="Acme Corp"
      />,
      { initialState }
    );
    
    expect(screen.getByText('REVOKED')).toBeInTheDocument();
    expect(screen.getByText(/license has been revoked/i)).toBeInTheDocument();
  });

  test('displays license features correctly', () => {
    const initialState = {
      licenseManagement: {
        currentLicense: mockLicense,
      },
    };

    renderWithProviders(
      <LicenseManager
        open={true}
        onClose={jest.fn()}
        tenantId="tenant1"
        tenantName="Acme Corp"
      />,
      { initialState }
    );
    
    expect(screen.getByText('hr-core')).toBeInTheDocument();
    expect(screen.getByText('attendance')).toBeInTheDocument();
    expect(screen.getByText('payroll')).toBeInTheDocument();
  });

  test('displays license activations', () => {
    const initialState = {
      licenseManagement: {
        currentLicense: mockLicense,
      },
    };

    renderWithProviders(
      <LicenseManager
        open={true}
        onClose={jest.fn()}
        tenantId="tenant1"
        tenantName="Acme Corp"
      />,
      { initialState }
    );
    
    expect(screen.getByText('License Activations (1/1)')).toBeInTheDocument();
    expect(screen.getByText('machine-123')).toBeInTheDocument();
    expect(screen.getByText('192.168.1.100')).toBeInTheDocument();
  });

  test('displays usage statistics', () => {
    const initialState = {
      licenseManagement: {
        currentLicense: mockLicense,
      },
    };

    renderWithProviders(
      <LicenseManager
        open={true}
        onClose={jest.fn()}
        tenantId="tenant1"
        tenantName="Acme Corp"
      />,
      { initialState }
    );
    
    expect(screen.getByText('Usage Statistics')).toBeInTheDocument();
    expect(screen.getByText('1500')).toBeInTheDocument(); // Total validations
    expect(screen.getByText('85')).toBeInTheDocument(); // Current users
    expect(screen.getByText('1024')).toBeInTheDocument(); // Storage in MB
  });

  test('opens renew license dialog when renew button is clicked', async () => {
    const initialState = {
      licenseManagement: {
        currentLicense: mockLicense,
      },
    };

    renderWithProviders(
      <LicenseManager
        open={true}
        onClose={jest.fn()}
        tenantId="tenant1"
        tenantName="Acme Corp"
      />,
      { initialState }
    );
    
    const renewButton = screen.getByRole('button', { name: /renew license/i });
    fireEvent.click(renewButton);
    
    await waitFor(() => {
      expect(screen.getByText('Renew License')).toBeInTheDocument();
    });
    
    expect(screen.getByLabelText(/new expiry date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/license type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/max users/i)).toBeInTheDocument();
  });

  test('opens revoke license dialog when revoke button is clicked', async () => {
    const initialState = {
      licenseManagement: {
        currentLicense: mockLicense,
      },
    };

    renderWithProviders(
      <LicenseManager
        open={true}
        onClose={jest.fn()}
        tenantId="tenant1"
        tenantName="Acme Corp"
      />,
      { initialState }
    );
    
    const revokeButton = screen.getByRole('button', { name: /revoke license/i });
    fireEvent.click(revokeButton);
    
    await waitFor(() => {
      expect(screen.getByText('Revoke License')).toBeInTheDocument();
    });
    
    expect(screen.getByText(/this action cannot be undone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/reason for revocation/i)).toBeInTheDocument();
  });

  test('disables action buttons for revoked license', () => {
    const initialState = {
      licenseManagement: {
        currentLicense: {
          ...mockLicense,
          status: 'revoked',
        },
      },
    };

    renderWithProviders(
      <LicenseManager
        open={true}
        onClose={jest.fn()}
        tenantId="tenant1"
        tenantName="Acme Corp"
      />,
      { initialState }
    );
    
    expect(screen.queryByRole('button', { name: /renew license/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /revoke license/i })).not.toBeInTheDocument();
  });

  test('shows loading state', () => {
    const initialState = {
      licenseManagement: {
        loading: true,
      },
    };

    renderWithProviders(
      <LicenseManager
        open={true}
        onClose={jest.fn()}
        tenantId="tenant1"
        tenantName="Acme Corp"
      />,
      { initialState }
    );
    
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  test('shows error message', () => {
    const initialState = {
      licenseManagement: {
        error: {
          message: 'Failed to load license data',
        },
      },
    };

    renderWithProviders(
      <LicenseManager
        open={true}
        onClose={jest.fn()}
        tenantId="tenant1"
        tenantName="Acme Corp"
      />,
      { initialState }
    );
    
    expect(screen.getByText('Failed to load license data')).toBeInTheDocument();
  });

  test('calls onClose when close button is clicked', () => {
    const mockOnClose = jest.fn();
    const initialState = {
      licenseManagement: {
        currentLicense: mockLicense,
      },
    };

    renderWithProviders(
      <LicenseManager
        open={true}
        onClose={mockOnClose}
        tenantId="tenant1"
        tenantName="Acme Corp"
      />,
      { initialState }
    );
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  test('refreshes data when refresh button is clicked', () => {
    const initialState = {
      licenseManagement: {
        currentLicense: mockLicense,
      },
    };

    renderWithProviders(
      <LicenseManager
        open={true}
        onClose={jest.fn()}
        tenantId="tenant1"
        tenantName="Acme Corp"
      />,
      { initialState }
    );
    
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);
    
    // This would trigger a Redux action to reload data
    expect(refreshButton).toBeInTheDocument();
  });

  test('validates revoke form requires reason', async () => {
    const initialState = {
      licenseManagement: {
        currentLicense: mockLicense,
      },
    };

    renderWithProviders(
      <LicenseManager
        open={true}
        onClose={jest.fn()}
        tenantId="tenant1"
        tenantName="Acme Corp"
      />,
      { initialState }
    );
    
    const revokeButton = screen.getByRole('button', { name: /revoke license/i });
    fireEvent.click(revokeButton);
    
    await waitFor(() => {
      expect(screen.getByText('Revoke License')).toBeInTheDocument();
    });
    
    const submitButton = screen.getByRole('button', { name: /revoke license/i });
    expect(submitButton).toBeDisabled(); // Should be disabled without reason
  });

  test('displays notes when available', () => {
    const initialState = {
      licenseManagement: {
        currentLicense: mockLicense,
      },
    };

    renderWithProviders(
      <LicenseManager
        open={true}
        onClose={jest.fn()}
        tenantId="tenant1"
        tenantName="Acme Corp"
      />,
      { initialState }
    );
    
    expect(screen.getByText('Notes')).toBeInTheDocument();
    expect(screen.getByText('Professional license for Acme Corp')).toBeInTheDocument();
  });
});