import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import LicenseManager from '../LicenseManager';
import { ApiProvider } from '../../contexts/ApiContext';

// Mock the API context
const mockApi = {
  license: {
    getTenantLicense: jest.fn(),
    renewLicense: jest.fn(),
    revokeLicense: jest.fn()
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

const renderWithProviders = (component, props = {}) => {
  const defaultProps = {
    open: true,
    onClose: jest.fn(),
    tenantId: 'tenant123',
    tenantName: 'Test Company',
    ...props
  };

  return render(
    <ThemeProvider theme={theme}>
      <ApiProvider>
        {React.cloneElement(component, defaultProps)}
      </ApiProvider>
    </ThemeProvider>
  );
};

const mockLicenseData = {
  licenseNumber: 'HRSM-TEST-123',
  type: 'professional',
  status: 'active',
  issuedAt: '2024-01-01T00:00:00.000Z',
  expiresAt: '2024-12-31T23:59:59.999Z',
  binding: {
    boundDomain: 'testcompany.hrms.local'
  },
  features: {
    modules: ['hr-core', 'tasks', 'payroll'],
    maxUsers: 200,
    maxStorage: 10240,
    maxAPICallsPerMonth: 100000
  },
  activations: [
    {
      machineId: 'machine-123',
      activatedAt: '2024-01-01T00:00:00.000Z',
      lastValidatedAt: '2024-01-15T12:00:00.000Z',
      ipAddress: '192.168.1.100'
    }
  ],
  maxActivations: 1,
  usage: {
    totalValidations: 1500,
    currentUsers: 45,
    currentStorage: 5368709120,
    lastValidatedAt: '2024-01-15T12:00:00.000Z'
  },
  notes: 'Test license for development'
};

describe('LicenseManager', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.license.getTenantLicense.mockResolvedValue({
      success: true,
      data: mockLicenseData
    });
  });

  describe('Component Rendering', () => {
    test('renders license manager dialog when open', async () => {
      renderWithProviders(<LicenseManager />);
      
      expect(screen.getByText('License Manager - Test Company')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.getByText('License Information')).toBeInTheDocument();
      });
    });

    test('does not render when closed', () => {
      renderWithProviders(<LicenseManager />, { open: false });
      
      expect(screen.queryByText('License Manager - Test Company')).not.toBeInTheDocument();
    });

    test('loads license data on mount', async () => {
      renderWithProviders(<LicenseManager />);
      
      await waitFor(() => {
        expect(mockApi.license.getTenantLicense).toHaveBeenCalledWith('tenant123');
      });
    });
  });
  describe('License Data Display', () => {
    test('displays license information correctly', async () => {
      renderWithProviders(<LicenseManager />);
      
      await waitFor(() => {
        expect(screen.getByText('HRSM-TEST-123')).toBeInTheDocument();
        expect(screen.getByText('PROFESSIONAL')).toBeInTheDocument();
        expect(screen.getByText('testcompany.hrms.local')).toBeInTheDocument();
      });
    });

    test('displays license features', async () => {
      renderWithProviders(<LicenseManager />);
      
      await waitFor(() => {
        expect(screen.getByText('200')).toBeInTheDocument(); // Max users
        expect(screen.getByText('10240 MB')).toBeInTheDocument(); // Storage
        expect(screen.getByText('100,000')).toBeInTheDocument(); // API calls
      });
    });

    test('displays enabled modules as chips', async () => {
      renderWithProviders(<LicenseManager />);
      
      await waitFor(() => {
        expect(screen.getByText('hr-core')).toBeInTheDocument();
        expect(screen.getByText('tasks')).toBeInTheDocument();
        expect(screen.getByText('payroll')).toBeInTheDocument();
      });
    });

    test('displays license activations', async () => {
      renderWithProviders(<LicenseManager />);
      
      await waitFor(() => {
        expect(screen.getByText(/Machine ID: machine-123/)).toBeInTheDocument();
        expect(screen.getByText(/IP Address: 192.168.1.100/)).toBeInTheDocument();
      });
    });

    test('displays usage statistics', async () => {
      renderWithProviders(<LicenseManager />);
      
      await waitFor(() => {
        expect(screen.getByText('1500')).toBeInTheDocument(); // Total validations
        expect(screen.getByText('45')).toBeInTheDocument(); // Current users
        expect(screen.getByText('5120')).toBeInTheDocument(); // Storage in MB
      });
    });
  });

  describe('License Status', () => {
    test('shows active status for valid license', async () => {
      renderWithProviders(<LicenseManager />);
      
      await waitFor(() => {
        expect(screen.getByText('ACTIVE')).toBeInTheDocument();
        expect(screen.getByTestId('CheckCircleIcon')).toBeInTheDocument();
      });
    });

    test('shows expiring status for licenses expiring soon', async () => {
      const expiringLicense = {
        ...mockLicenseData,
        expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString() // 15 days
      };
      
      mockApi.license.getTenantLicense.mockResolvedValue({
        success: true,
        data: expiringLicense
      });
      
      renderWithProviders(<LicenseManager />);
      
      await waitFor(() => {
        expect(screen.getByText('EXPIRING')).toBeInTheDocument();
        expect(screen.getByText(/License expires in \d+ days/)).toBeInTheDocument();
      });
    });

    test('shows expired status for expired licenses', async () => {
      const expiredLicense = {
        ...mockLicenseData,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Yesterday
      };
      
      mockApi.license.getTenantLicense.mockResolvedValue({
        success: true,
        data: expiredLicense
      });
      
      renderWithProviders(<LicenseManager />);
      
      await waitFor(() => {
        expect(screen.getByText('EXPIRED')).toBeInTheDocument();
        expect(screen.getByText(/License has expired/)).toBeInTheDocument();
      });
    });

    test('shows revoked status for revoked licenses', async () => {
      const revokedLicense = {
        ...mockLicenseData,
        status: 'revoked'
      };
      
      mockApi.license.getTenantLicense.mockResolvedValue({
        success: true,
        data: revokedLicense
      });
      
      renderWithProviders(<LicenseManager />);
      
      await waitFor(() => {
        expect(screen.getByText('REVOKED')).toBeInTheDocument();
        expect(screen.getByText(/License has been revoked/)).toBeInTheDocument();
      });
    });
  });

  describe('License Operations', () => {
    test('opens renew dialog when renew button is clicked', async () => {
      renderWithProviders(<LicenseManager />);
      
      await waitFor(() => {
        expect(screen.getByText('HRSM-TEST-123')).toBeInTheDocument();
      });
      
      const renewButton = screen.getByRole('button', { name: /renew license/i });
      await user.click(renewButton);
      
      expect(screen.getByText('Renew License')).toBeInTheDocument();
      expect(screen.getByLabelText(/new expiry date/i)).toBeInTheDocument();
    });

    test('opens revoke dialog when revoke button is clicked', async () => {
      renderWithProviders(<LicenseManager />);
      
      await waitFor(() => {
        expect(screen.getByText('HRSM-TEST-123')).toBeInTheDocument();
      });
      
      const revokeButton = screen.getByRole('button', { name: /revoke license/i });
      await user.click(revokeButton);
      
      expect(screen.getByText('Revoke License')).toBeInTheDocument();
      expect(screen.getByText(/This action cannot be undone/)).toBeInTheDocument();
    });

    test('performs license renewal', async () => {
      mockApi.license.renewLicense.mockResolvedValue({
        success: true,
        data: { ...mockLicenseData, expiresAt: '2025-12-31T23:59:59.999Z' }
      });
      
      renderWithProviders(<LicenseManager />);
      
      await waitFor(() => {
        expect(screen.getByText('HRSM-TEST-123')).toBeInTheDocument();
      });
      
      const renewButton = screen.getByRole('button', { name: /renew license/i });
      await user.click(renewButton);
      
      const confirmRenewButton = screen.getByRole('button', { name: /renew license/i });
      await user.click(confirmRenewButton);
      
      await waitFor(() => {
        expect(mockApi.license.renewLicense).toHaveBeenCalledWith(
          'HRSM-TEST-123',
          expect.objectContaining({
            type: 'professional',
            maxUsers: 200
          })
        );
      });
    });

    test('performs license revocation', async () => {
      mockApi.license.revokeLicense.mockResolvedValue({
        success: true,
        data: { ...mockLicenseData, status: 'revoked' }
      });
      
      renderWithProviders(<LicenseManager />);
      
      await waitFor(() => {
        expect(screen.getByText('HRSM-TEST-123')).toBeInTheDocument();
      });
      
      const revokeButton = screen.getByRole('button', { name: /revoke license/i });
      await user.click(revokeButton);
      
      const reasonField = screen.getByLabelText(/reason for revocation/i);
      await user.type(reasonField, 'License violation');
      
      const confirmRevokeButton = screen.getByRole('button', { name: /revoke license/i });
      await user.click(confirmRevokeButton);
      
      await waitFor(() => {
        expect(mockApi.license.revokeLicense).toHaveBeenCalledWith(
          'HRSM-TEST-123',
          'License violation'
        );
      });
    });

    test('disables operation buttons for revoked licenses', async () => {
      const revokedLicense = {
        ...mockLicenseData,
        status: 'revoked'
      };
      
      mockApi.license.getTenantLicense.mockResolvedValue({
        success: true,
        data: revokedLicense
      });
      
      renderWithProviders(<LicenseManager />);
      
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /renew license/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /revoke license/i })).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    test('displays error message when license loading fails', async () => {
      mockApi.license.getTenantLicense.mockRejectedValue(new Error('License not found'));
      
      renderWithProviders(<LicenseManager />);
      
      await waitFor(() => {
        expect(screen.getByText('License not found')).toBeInTheDocument();
      });
    });

    test('handles renewal errors gracefully', async () => {
      mockApi.license.renewLicense.mockRejectedValue(new Error('Renewal failed'));
      
      renderWithProviders(<LicenseManager />);
      
      await waitFor(() => {
        expect(screen.getByText('HRSM-TEST-123')).toBeInTheDocument();
      });
      
      const renewButton = screen.getByRole('button', { name: /renew license/i });
      await user.click(renewButton);
      
      const confirmRenewButton = screen.getByRole('button', { name: /renew license/i });
      await user.click(confirmRenewButton);
      
      await waitFor(() => {
        expect(screen.getByText('Renewal failed')).toBeInTheDocument();
      });
    });

    test('handles revocation errors gracefully', async () => {
      mockApi.license.revokeLicense.mockRejectedValue(new Error('Revocation failed'));
      
      renderWithProviders(<LicenseManager />);
      
      await waitFor(() => {
        expect(screen.getByText('HRSM-TEST-123')).toBeInTheDocument();
      });
      
      const revokeButton = screen.getByRole('button', { name: /revoke license/i });
      await user.click(revokeButton);
      
      const reasonField = screen.getByLabelText(/reason for revocation/i);
      await user.type(reasonField, 'Test reason');
      
      const confirmRevokeButton = screen.getByRole('button', { name: /revoke license/i });
      await user.click(confirmRevokeButton);
      
      await waitFor(() => {
        expect(screen.getByText('Revocation failed')).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    test('shows loading indicator while fetching license data', () => {
      mockApi.license.getTenantLicense.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );
      
      renderWithProviders(<LicenseManager />);
      
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    test('disables buttons during operations', async () => {
      mockApi.license.renewLicense.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );
      
      renderWithProviders(<LicenseManager />);
      
      await waitFor(() => {
        expect(screen.getByText('HRSM-TEST-123')).toBeInTheDocument();
      });
      
      const renewButton = screen.getByRole('button', { name: /renew license/i });
      await user.click(renewButton);
      
      const confirmRenewButton = screen.getByRole('button', { name: /renew license/i });
      await user.click(confirmRenewButton);
      
      expect(confirmRenewButton).toBeDisabled();
    });
  });

  describe('Data Refresh', () => {
    test('refreshes license data when refresh button is clicked', async () => {
      renderWithProviders(<LicenseManager />);
      
      await waitFor(() => {
        expect(mockApi.license.getTenantLicense).toHaveBeenCalledTimes(1);
      });
      
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);
      
      await waitFor(() => {
        expect(mockApi.license.getTenantLicense).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA labels', async () => {
      renderWithProviders(<LicenseManager />);
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      
      await waitFor(() => {
        const refreshButton = screen.getByRole('button', { name: /refresh/i });
        expect(refreshButton).toBeInTheDocument();
      });
    });

    test('supports keyboard navigation', async () => {
      renderWithProviders(<LicenseManager />);
      
      await waitFor(() => {
        expect(screen.getByText('HRSM-TEST-123')).toBeInTheDocument();
      });
      
      const closeButton = screen.getByRole('button', { name: /close/i });
      closeButton.focus();
      
      await user.tab();
      
      const renewButton = screen.getByRole('button', { name: /renew license/i });
      expect(renewButton).toHaveFocus();
    });
  });

  describe('Dialog Management', () => {
    test('closes dialog when close button is clicked', async () => {
      const onClose = jest.fn();
      renderWithProviders(<LicenseManager />, { onClose });
      
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);
      
      expect(onClose).toHaveBeenCalled();
    });

    test('closes renewal dialog when cancel is clicked', async () => {
      renderWithProviders(<LicenseManager />);
      
      await waitFor(() => {
        expect(screen.getByText('HRSM-TEST-123')).toBeInTheDocument();
      });
      
      const renewButton = screen.getByRole('button', { name: /renew license/i });
      await user.click(renewButton);
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);
      
      expect(screen.queryByText('Renew License')).not.toBeInTheDocument();
    });

    test('closes revoke dialog when cancel is clicked', async () => {
      renderWithProviders(<LicenseManager />);
      
      await waitFor(() => {
        expect(screen.getByText('HRSM-TEST-123')).toBeInTheDocument();
      });
      
      const revokeButton = screen.getByRole('button', { name: /revoke license/i });
      await user.click(revokeButton);
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);
      
      expect(screen.queryByText('Revoke License')).not.toBeInTheDocument();
    });
  });
});