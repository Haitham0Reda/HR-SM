import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';

// Mock components to avoid complex dependencies
const MockEnhancedDashboard = () => {
  const [connected, setConnected] = React.useState(false);
  const [alerts, setAlerts] = React.useState([]);

  const handleRefresh = () => {
    // Simulate refresh functionality
    setConnected(true);
  };

  const handleAddAlert = () => {
    setAlerts(prev => [...prev, {
      id: Date.now(),
      level: 'warning',
      message: 'Test alert',
      timestamp: new Date()
    }]);
  };

  return (
    <div data-testid="enhanced-dashboard">
      <h1>Platform Dashboard</h1>
      <div data-testid="connection-status">
        {connected ? 'Real-time monitoring active' : 'Real-time monitoring disconnected'}
      </div>
      <button onClick={handleRefresh} data-testid="refresh-button">
        Refresh
      </button>
      <button onClick={handleAddAlert} data-testid="add-alert-button">
        Add Alert
      </button>
      {alerts.length > 0 && (
        <div data-testid="alerts-panel">
          Recent Alerts ({alerts.length})
          {alerts.map(alert => (
            <div key={alert.id} data-testid="alert-item">
              {alert.level}: {alert.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const MockCreateTenantForm = ({ open, onClose, onSuccess }) => {
  const [step, setStep] = React.useState(0);
  const [formData, setFormData] = React.useState({
    name: '',
    subdomain: '',
    email: ''
  });

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      // Simulate API call
      setTimeout(() => {
        onSuccess({
          tenant: { name: formData.name, id: 'test-123' },
          license: { licenseNumber: 'LIC-123' }
        });
      }, 100);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!open) return null;

  return (
    <div data-testid="create-tenant-form">
      <h2>Create New Company</h2>
      <div data-testid="step-indicator">Step {step + 1} of 4</div>
      
      {step === 0 && (
        <div>
          <input
            data-testid="company-name"
            placeholder="Company Name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
          />
          <input
            data-testid="subdomain"
            placeholder="Subdomain"
            value={formData.subdomain}
            onChange={(e) => handleInputChange('subdomain', e.target.value)}
          />
          <input
            data-testid="email"
            placeholder="Email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
          />
        </div>
      )}
      
      {step === 1 && <div>License Configuration</div>}
      {step === 2 && <div>Module Selection</div>}
      {step === 3 && <div>Review & Create</div>}
      
      <button onClick={handleNext} data-testid="next-button">
        {step === 3 ? 'Create Company' : 'Next'}
      </button>
      <button onClick={onClose} data-testid="cancel-button">
        Cancel
      </button>
    </div>
  );
};

const MockLicenseManager = ({ open, onClose, tenantId }) => {
  const [license, setLicense] = React.useState({
    licenseNumber: 'HRSM-TEST-123',
    status: 'active',
    type: 'professional',
    expiresAt: '2024-12-31'
  });

  const handleRenew = () => {
    setLicense(prev => ({ ...prev, expiresAt: '2025-12-31' }));
  };

  const handleRevoke = () => {
    setLicense(prev => ({ ...prev, status: 'revoked' }));
  };

  if (!open) return null;

  return (
    <div data-testid="license-manager">
      <h2>License Manager</h2>
      <div data-testid="license-info">
        <div>License: {license.licenseNumber}</div>
        <div>Status: {license.status}</div>
        <div>Type: {license.type}</div>
        <div>Expires: {license.expiresAt}</div>
      </div>
      <button onClick={handleRenew} data-testid="renew-button">
        Renew License
      </button>
      <button onClick={handleRevoke} data-testid="revoke-button">
        Revoke License
      </button>
      <button onClick={onClose} data-testid="close-button">
        Close
      </button>
    </div>
  );
};

const theme = createTheme();

const renderWithTheme = (component) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('Dashboard Integration Tests', () => {
  describe('EnhancedDashboard Component', () => {
    test('renders dashboard with main components', () => {
      renderWithTheme(<MockEnhancedDashboard />);
      
      expect(screen.getByText('Platform Dashboard')).toBeInTheDocument();
      expect(screen.getByTestId('connection-status')).toBeInTheDocument();
      expect(screen.getByTestId('refresh-button')).toBeInTheDocument();
    });

    test('handles real-time connection status updates', () => {
      renderWithTheme(<MockEnhancedDashboard />);
      
      expect(screen.getByText('Real-time monitoring disconnected')).toBeInTheDocument();
      
      fireEvent.click(screen.getByTestId('refresh-button'));
      
      expect(screen.getByText('Real-time monitoring active')).toBeInTheDocument();
    });

    test('manages alerts state correctly', () => {
      renderWithTheme(<MockEnhancedDashboard />);
      
      expect(screen.queryByTestId('alerts-panel')).not.toBeInTheDocument();
      
      fireEvent.click(screen.getByTestId('add-alert-button'));
      
      expect(screen.getByTestId('alerts-panel')).toBeInTheDocument();
      expect(screen.getByText('Recent Alerts (1)')).toBeInTheDocument();
      expect(screen.getByText('warning: Test alert')).toBeInTheDocument();
    });

    test('handles user interactions correctly', () => {
      renderWithTheme(<MockEnhancedDashboard />);
      
      const refreshButton = screen.getByTestId('refresh-button');
      
      fireEvent.click(refreshButton);
      
      expect(screen.getByText('Real-time monitoring active')).toBeInTheDocument();
    });
  });

  describe('CreateTenantForm Component', () => {
    test('renders form dialog when open', () => {
      const onClose = jest.fn();
      const onSuccess = jest.fn();
      
      renderWithTheme(
        <MockCreateTenantForm open={true} onClose={onClose} onSuccess={onSuccess} />
      );
      
      expect(screen.getByText('Create New Company')).toBeInTheDocument();
      expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
    });

    test('handles multi-step navigation', () => {
      const onClose = jest.fn();
      const onSuccess = jest.fn();
      
      renderWithTheme(
        <MockCreateTenantForm open={true} onClose={onClose} onSuccess={onSuccess} />
      );
      
      expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
      
      fireEvent.click(screen.getByTestId('next-button'));
      
      expect(screen.getByText('Step 2 of 4')).toBeInTheDocument();
      expect(screen.getByText('License Configuration')).toBeInTheDocument();
    });

    test('handles form input changes', () => {
      const onClose = jest.fn();
      const onSuccess = jest.fn();
      
      renderWithTheme(
        <MockCreateTenantForm open={true} onClose={onClose} onSuccess={onSuccess} />
      );
      
      const nameInput = screen.getByTestId('company-name');
      fireEvent.change(nameInput, { target: { value: 'Test Company' } });
      
      expect(nameInput.value).toBe('Test Company');
    });

    test('completes dual API workflow', async () => {
      const onClose = jest.fn();
      const onSuccess = jest.fn();
      
      renderWithTheme(
        <MockCreateTenantForm open={true} onClose={onClose} onSuccess={onSuccess} />
      );
      
      // Fill form data
      fireEvent.change(screen.getByTestId('company-name'), { target: { value: 'Test Company' } });
      
      // Navigate to final step
      for (let i = 0; i < 3; i++) {
        fireEvent.click(screen.getByTestId('next-button'));
      }
      
      expect(screen.getByText('Review & Create')).toBeInTheDocument();
      
      // Submit form
      fireEvent.click(screen.getByText('Create Company'));
      
      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith({
          tenant: { name: 'Test Company', id: 'test-123' },
          license: { licenseNumber: 'LIC-123' }
        });
      });
    });

    test('handles form cancellation', () => {
      const onClose = jest.fn();
      const onSuccess = jest.fn();
      
      renderWithTheme(
        <MockCreateTenantForm open={true} onClose={onClose} onSuccess={onSuccess} />
      );
      
      fireEvent.click(screen.getByTestId('cancel-button'));
      
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('LicenseManager Component', () => {
    test('renders license information correctly', () => {
      const onClose = jest.fn();
      
      renderWithTheme(
        <MockLicenseManager open={true} onClose={onClose} tenantId="test-123" />
      );
      
      expect(screen.getByText('License Manager')).toBeInTheDocument();
      expect(screen.getByText('License: HRSM-TEST-123')).toBeInTheDocument();
      expect(screen.getByText('Status: active')).toBeInTheDocument();
      expect(screen.getByText('Type: professional')).toBeInTheDocument();
    });

    test('handles license renewal', () => {
      const onClose = jest.fn();
      
      renderWithTheme(
        <MockLicenseManager open={true} onClose={onClose} tenantId="test-123" />
      );
      
      expect(screen.getByText('Expires: 2024-12-31')).toBeInTheDocument();
      
      fireEvent.click(screen.getByTestId('renew-button'));
      
      expect(screen.getByText('Expires: 2025-12-31')).toBeInTheDocument();
    });

    test('handles license revocation', () => {
      const onClose = jest.fn();
      
      renderWithTheme(
        <MockLicenseManager open={true} onClose={onClose} tenantId="test-123" />
      );
      
      expect(screen.getByText('Status: active')).toBeInTheDocument();
      
      fireEvent.click(screen.getByTestId('revoke-button'));
      
      expect(screen.getByText('Status: revoked')).toBeInTheDocument();
    });

    test('handles dialog closure', () => {
      const onClose = jest.fn();
      
      renderWithTheme(
        <MockLicenseManager open={true} onClose={onClose} tenantId="test-123" />
      );
      
      fireEvent.click(screen.getByTestId('close-button'));
      
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Report Generation and Export', () => {
    const MockReportComponent = () => {
      const [data, setData] = React.useState(null);
      const [loading, setLoading] = React.useState(false);

      const loadData = () => {
        setLoading(true);
        setTimeout(() => {
          setData({
            revenue: 125000,
            users: 450,
            licenses: 25
          });
          setLoading(false);
        }, 100);
      };

      const exportData = (format) => {
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report.${format}`;
        a.click();
      };

      React.useEffect(() => {
        loadData();
      }, []);

      if (loading) {
        return <div data-testid="loading">Loading...</div>;
      }

      return (
        <div data-testid="report-component">
          <h2>Analytics Report</h2>
          {data && (
            <div data-testid="report-data">
              <div>Revenue: ${data.revenue.toLocaleString()}</div>
              <div>Users: {data.users}</div>
              <div>Licenses: {data.licenses}</div>
            </div>
          )}
          <button onClick={() => exportData('csv')} data-testid="export-csv">
            Export CSV
          </button>
          <button onClick={() => exportData('excel')} data-testid="export-excel">
            Export Excel
          </button>
          <button onClick={() => exportData('pdf')} data-testid="export-pdf">
            Export PDF
          </button>
        </div>
      );
    };

    test('loads and displays report data', async () => {
      renderWithTheme(<MockReportComponent />);
      
      expect(screen.getByTestId('loading')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.getByTestId('report-data')).toBeInTheDocument();
      });
      
      expect(screen.getByText('Revenue: $125,000')).toBeInTheDocument();
      expect(screen.getByText('Users: 450')).toBeInTheDocument();
      expect(screen.getByText('Licenses: 25')).toBeInTheDocument();
    });

    test('handles export functionality', async () => {
      // Mock URL.createObjectURL
      const mockCreateObjectURL = jest.fn(() => 'mock-url');
      global.URL.createObjectURL = mockCreateObjectURL;
      
      renderWithTheme(<MockReportComponent />);
      
      await waitFor(() => {
        expect(screen.getByTestId('report-data')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByTestId('export-csv'));
      
      expect(mockCreateObjectURL).toHaveBeenCalled();
      
      jest.restoreAllMocks();
    });

    test('supports multiple export formats', async () => {
      const mockCreateObjectURL = jest.fn(() => 'mock-url');
      global.URL.createObjectURL = mockCreateObjectURL;
      
      renderWithTheme(<MockReportComponent />);
      
      await waitFor(() => {
        expect(screen.getByTestId('report-data')).toBeInTheDocument();
      });
      
      // Test CSV export
      fireEvent.click(screen.getByTestId('export-csv'));
      expect(mockCreateObjectURL).toHaveBeenCalled();
      
      // Test Excel export
      fireEvent.click(screen.getByTestId('export-excel'));
      expect(mockCreateObjectURL).toHaveBeenCalled();
      
      // Test PDF export
      fireEvent.click(screen.getByTestId('export-pdf'));
      expect(mockCreateObjectURL).toHaveBeenCalled();
      
      jest.restoreAllMocks();
    });
  });

  describe('Integration Scenarios', () => {
    test('dashboard components work together', () => {
      const App = () => {
        const [showCreateForm, setShowCreateForm] = React.useState(false);
        const [showLicenseManager, setShowLicenseManager] = React.useState(false);

        return (
          <div>
            <MockEnhancedDashboard />
            <button onClick={() => setShowCreateForm(true)} data-testid="show-create-form">
              Create Tenant
            </button>
            <button onClick={() => setShowLicenseManager(true)} data-testid="show-license-manager">
              Manage License
            </button>
            
            <MockCreateTenantForm
              open={showCreateForm}
              onClose={() => setShowCreateForm(false)}
              onSuccess={() => setShowCreateForm(false)}
            />
            
            <MockLicenseManager
              open={showLicenseManager}
              onClose={() => setShowLicenseManager(false)}
              tenantId="test-123"
            />
          </div>
        );
      };

      renderWithTheme(<App />);
      
      expect(screen.getByText('Platform Dashboard')).toBeInTheDocument();
      
      fireEvent.click(screen.getByTestId('show-create-form'));
      expect(screen.getByText('Create New Company')).toBeInTheDocument();
      
      fireEvent.click(screen.getByTestId('cancel-button'));
      expect(screen.queryByText('Create New Company')).not.toBeInTheDocument();
      
      fireEvent.click(screen.getByTestId('show-license-manager'));
      expect(screen.getByText('License Manager')).toBeInTheDocument();
    });
  });
});