import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ApiProvider } from '../../contexts/ApiContext';
import { platformService } from '../../services/platformApi';
import { licenseService } from '../../services/licenseApi';

// Mock the API services
jest.mock('../../services/platformApi');
jest.mock('../../services/licenseApi');
jest.mock('../../services/realtimeService', () => ({
  connect: jest.fn(),
  subscribe: jest.fn(() => jest.fn()),
  requestMetricsUpdate: jest.fn(),
}));

const TestComponent = () => {
  const [platformStatus, setPlatformStatus] = React.useState('checking');
  const [licenseStatus, setLicenseStatus] = React.useState('checking');

  React.useEffect(() => {
    const checkConnections = async () => {
      try {
        // Test platform API connection
        await platformService.getSystemHealth();
        setPlatformStatus('connected');
      } catch (error) {
        setPlatformStatus('error');
      }

      try {
        // Test license server connection
        await licenseService.healthCheck();
        setLicenseStatus('connected');
      } catch (error) {
        setLicenseStatus('error');
      }
    };

    checkConnections();
  }, []);

  return (
    <div>
      <div data-testid="platform-status">Platform API: {platformStatus}</div>
      <div data-testid="license-status">License Server: {licenseStatus}</div>
    </div>
  );
};

describe('Dual Backend Communication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('successfully communicates with both platform API and license server', async () => {
    // Mock successful responses
    platformService.getSystemHealth.mockResolvedValue({
      success: true,
      data: { status: 'healthy' }
    });

    licenseService.healthCheck.mockResolvedValue({
      success: true,
      data: { status: 'operational' }
    });

    render(
      <ApiProvider>
        <TestComponent />
      </ApiProvider>
    );

    // Wait for both API calls to complete
    await waitFor(() => {
      expect(screen.getByText('Platform API: connected')).toBeInTheDocument();
      expect(screen.getByText('License Server: connected')).toBeInTheDocument();
    });

    // Verify both APIs were called
    expect(platformService.getSystemHealth).toHaveBeenCalledTimes(1);
    expect(licenseService.healthCheck).toHaveBeenCalledTimes(1);
  });

  test('handles platform API failure gracefully', async () => {
    // Mock platform API failure
    platformService.getSystemHealth.mockRejectedValue(new Error('Platform API unavailable'));
    
    // Mock license server success
    licenseService.healthCheck.mockResolvedValue({
      success: true,
      data: { status: 'operational' }
    });

    render(
      <ApiProvider>
        <TestComponent />
      </ApiProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Platform API: error')).toBeInTheDocument();
      expect(screen.getByText('License Server: connected')).toBeInTheDocument();
    });
  });

  test('handles license server failure gracefully', async () => {
    // Mock platform API success
    platformService.getSystemHealth.mockResolvedValue({
      success: true,
      data: { status: 'healthy' }
    });
    
    // Mock license server failure
    licenseService.healthCheck.mockRejectedValue(new Error('License server unavailable'));

    render(
      <ApiProvider>
        <TestComponent />
      </ApiProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Platform API: connected')).toBeInTheDocument();
      expect(screen.getByText('License Server: error')).toBeInTheDocument();
    });
  });

  test('API context provides access to both services', () => {
    const mockPlatformService = {
      getTenants: jest.fn(),
      createTenant: jest.fn(),
      getSystemMetrics: jest.fn(),
    };

    const mockLicenseService = {
      createLicense: jest.fn(),
      validateLicense: jest.fn(),
      getLicenseAnalytics: jest.fn(),
    };

    // Verify the services are properly structured
    expect(typeof platformService.getTenants).toBe('function');
    expect(typeof platformService.createTenant).toBe('function');
    expect(typeof platformService.getSystemMetrics).toBe('function');
    
    expect(typeof licenseService.createLicense).toBe('function');
    expect(typeof licenseService.validateLicense).toBe('function');
    expect(typeof licenseService.getLicenseAnalytics).toBe('function');
  });

  test('createTenantWithLicense workflow integrates both APIs', async () => {
    // Mock successful tenant creation
    platformService.createTenant.mockResolvedValue({
      success: true,
      data: {
        _id: 'tenant-123',
        name: 'Test Company',
        subdomain: 'test-company'
      }
    });

    // Mock successful license creation
    licenseService.createLicense.mockResolvedValue({
      success: true,
      data: {
        licenseNumber: 'HRSM-TEST-123',
        token: 'jwt-token-here',
        expiresAt: '2024-12-31T23:59:59Z'
      }
    });

    // Mock tenant update
    platformService.updateTenant = jest.fn().mockResolvedValue({
      success: true
    });

    // Simulate the createTenantWithLicense workflow
    const tenantData = {
      name: 'Test Company',
      subdomain: 'test-company',
      contactEmail: 'admin@test-company.com'
    };

    const licenseData = {
      type: 'professional',
      modules: ['hr-core', 'tasks'],
      maxUsers: 100,
      expiresAt: '2024-12-31T23:59:59Z'
    };

    // Step 1: Create tenant
    const tenantResponse = await platformService.createTenant(tenantData);
    expect(tenantResponse.success).toBe(true);
    expect(tenantResponse.data._id).toBe('tenant-123');

    // Step 2: Create license
    const licenseResponse = await licenseService.createLicense({
      ...licenseData,
      tenantId: tenantResponse.data._id,
      tenantName: tenantResponse.data.name
    });
    expect(licenseResponse.success).toBe(true);
    expect(licenseResponse.data.licenseNumber).toBe('HRSM-TEST-123');

    // Step 3: Update tenant with license info
    await platformService.updateTenant(tenantResponse.data._id, {
      'license.licenseKey': licenseResponse.data.token,
      'license.licenseNumber': licenseResponse.data.licenseNumber,
      'license.licenseType': licenseData.type,
      'license.expiresAt': licenseData.expiresAt
    });

    // Verify all API calls were made
    expect(platformService.createTenant).toHaveBeenCalledWith(tenantData);
    expect(licenseService.createLicense).toHaveBeenCalledWith({
      ...licenseData,
      tenantId: 'tenant-123',
      tenantName: 'Test Company'
    });
    expect(platformService.updateTenant).toHaveBeenCalledWith('tenant-123', {
      'license.licenseKey': 'jwt-token-here',
      'license.licenseNumber': 'HRSM-TEST-123',
      'license.licenseType': 'professional',
      'license.expiresAt': '2024-12-31T23:59:59Z'
    });
  });
});