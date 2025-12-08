/**
 * Unit Tests for LicenseContext
 * 
 * Tests the license context hooks with various states:
 * - isModuleEnabled with various states
 * - License data caching
 * - Context updates
 * 
 * Requirements: 1.1, 4.1
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';

// Mock axios before any imports that use it
jest.mock('axios');

// Mock the auth service to prevent API initialization issues
jest.mock('../services/auth.service', () => ({
  getCurrentUser: jest.fn(),
  getProfile: jest.fn(),
  login: jest.fn(),
  logout: jest.fn()
}));

// Mock survey service
jest.mock('../services/survey.service', () => ({
  getMySurveys: jest.fn()
}));

// Now import the components after mocks are set up
import { LicenseProvider, useLicense } from './LicenseContext';
import { AuthProvider } from './AuthContext';

// Mock AuthContext with a custom implementation
jest.mock('./AuthContext', () => {
  const React = require('react');
  const actualAuth = jest.requireActual('./AuthContext');
  
  return {
    ...actualAuth,
    useAuth: jest.fn(),
    AuthProvider: ({ children }) => <div>{children}</div>
  };
});

// Test component that uses the license context
const TestComponent = ({ moduleKey, limitType }) => {
  const {
    isModuleEnabled,
    getModuleLicense,
    isApproachingLimit,
    getModuleUsage,
    loading,
    error,
    licenses,
    usage,
    getEnabledModules,
    isLicenseExpired,
    getDaysUntilExpiration,
    isExpiringSoon,
    hasUsageWarnings,
    hasUsageViolations
  } = useLicense();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <div data-testid="module-enabled">
        {isModuleEnabled(moduleKey) ? 'enabled' : 'disabled'}
      </div>
      <div data-testid="module-license">
        {JSON.stringify(getModuleLicense(moduleKey))}
      </div>
      <div data-testid="approaching-limit">
        {isApproachingLimit(moduleKey, limitType) ? 'yes' : 'no'}
      </div>
      <div data-testid="module-usage">
        {JSON.stringify(getModuleUsage(moduleKey))}
      </div>
      <div data-testid="licenses">
        {JSON.stringify(licenses)}
      </div>
      <div data-testid="usage">
        {JSON.stringify(usage)}
      </div>
      <div data-testid="enabled-modules">
        {JSON.stringify(getEnabledModules())}
      </div>
      <div data-testid="license-expired">
        {isLicenseExpired(moduleKey) ? 'yes' : 'no'}
      </div>
      <div data-testid="days-until-expiration">
        {getDaysUntilExpiration(moduleKey)}
      </div>
      <div data-testid="expiring-soon">
        {isExpiringSoon(moduleKey, 30) ? 'yes' : 'no'}
      </div>
      <div data-testid="has-warnings">
        {hasUsageWarnings() ? 'yes' : 'no'}
      </div>
      <div data-testid="has-violations">
        {hasUsageViolations() ? 'yes' : 'no'}
      </div>
    </div>
  );
};

describe('LicenseContext - isModuleEnabled', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return true for Core HR regardless of license state', async () => {
    const { useAuth } = require('./AuthContext');
    useAuth.mockReturnValue({
      isAuthenticated: true,
      user: { tenantId: 'tenant-123' }
    });

    axios.get.mockResolvedValueOnce({
      data: {
        data: {
          modules: [],
          status: 'active'
        }
      }
    });

    render(
      <LicenseProvider>
        <TestComponent moduleKey="hr-core" />
      </LicenseProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('module-enabled')).toHaveTextContent('enabled');
    });
  });

  test('should return true for enabled module', async () => {
    const { useAuth } = require('./AuthContext');
    useAuth.mockReturnValue({
      isAuthenticated: true,
      user: { tenantId: 'tenant-123' }
    });

    axios.get.mockResolvedValueOnce({
      data: {
        data: {
          modules: [
            {
              key: 'attendance',
              enabled: true,
              tier: 'business',
              limits: { employees: 200 }
            }
          ],
          status: 'active'
        }
      }
    });

    render(
      <LicenseProvider>
        <TestComponent moduleKey="attendance" />
      </LicenseProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('module-enabled')).toHaveTextContent('enabled');
    });
  });

  test('should return false for disabled module', async () => {
    const { useAuth } = require('./AuthContext');
    useAuth.mockReturnValue({
      isAuthenticated: true,
      user: { tenantId: 'tenant-123' }
    });

    axios.get.mockResolvedValueOnce({
      data: {
        data: {
          modules: [
            {
              key: 'attendance',
              enabled: false,
              tier: 'business',
              limits: { employees: 200 }
            }
          ],
          status: 'active'
        }
      }
    });

    render(
      <LicenseProvider>
        <TestComponent moduleKey="attendance" />
      </LicenseProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('module-enabled')).toHaveTextContent('disabled');
    });
  });

  test('should return false for non-existent module', async () => {
    const { useAuth } = require('./AuthContext');
    useAuth.mockReturnValue({
      isAuthenticated: true,
      user: { tenantId: 'tenant-123' }
    });

    axios.get.mockResolvedValueOnce({
      data: {
        data: {
          modules: [],
          status: 'active'
        }
      }
    });

    render(
      <LicenseProvider>
        <TestComponent moduleKey="payroll" />
      </LicenseProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('module-enabled')).toHaveTextContent('disabled');
    });
  });

  test('should handle multiple modules with different states', async () => {
    const { useAuth } = require('./AuthContext');
    useAuth.mockReturnValue({
      isAuthenticated: true,
      user: { tenantId: 'tenant-123' }
    });

    axios.get.mockResolvedValueOnce({
      data: {
        data: {
          modules: [
            { key: 'attendance', enabled: true, tier: 'business' },
            { key: 'payroll', enabled: false, tier: 'starter' },
            { key: 'documents', enabled: true, tier: 'enterprise' }
          ],
          status: 'active'
        }
      }
    });

    const MultiModuleTest = () => {
      const { isModuleEnabled, loading } = useLicense();
      
      if (loading) return <div>Loading...</div>;
      
      return (
        <div>
          <div data-testid="attendance">{isModuleEnabled('attendance') ? 'enabled' : 'disabled'}</div>
          <div data-testid="payroll">{isModuleEnabled('payroll') ? 'enabled' : 'disabled'}</div>
          <div data-testid="documents">{isModuleEnabled('documents') ? 'enabled' : 'disabled'}</div>
        </div>
      );
    };

    render(
      <LicenseProvider>
        <MultiModuleTest />
      </LicenseProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('attendance')).toHaveTextContent('enabled');
      expect(screen.getByTestId('payroll')).toHaveTextContent('disabled');
      expect(screen.getByTestId('documents')).toHaveTextContent('enabled');
    });
  });
});

describe('LicenseContext - License Data Caching', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should fetch license data only once on mount', async () => {
    const { useAuth } = require('./AuthContext');
    useAuth.mockReturnValue({
      isAuthenticated: true,
      user: { tenantId: 'tenant-123' }
    });

    axios.get.mockResolvedValueOnce({
      data: {
        data: {
          modules: [
            { key: 'attendance', enabled: true, tier: 'business' }
          ],
          status: 'active'
        }
      }
    });

    render(
      <LicenseProvider>
        <TestComponent moduleKey="attendance" />
      </LicenseProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('module-enabled')).toHaveTextContent('enabled');
    });

    // Should call API twice: once for license data, once for usage data
    expect(axios.get).toHaveBeenCalledTimes(2);
    expect(axios.get).toHaveBeenCalledWith('/api/v1/licenses/tenant-123');
    expect(axios.get).toHaveBeenCalledWith('/api/v1/licenses/tenant-123/usage');
  });

  test('should cache license data across multiple hook calls', async () => {
    const { useAuth } = require('./AuthContext');
    useAuth.mockReturnValue({
      isAuthenticated: true,
      user: { tenantId: 'tenant-123' }
    });

    const licenseData = {
      modules: [
        { key: 'attendance', enabled: true, tier: 'business', limits: { employees: 200 } },
        { key: 'payroll', enabled: true, tier: 'starter', limits: { employees: 50 } }
      ],
      status: 'active',
      billingCycle: 'monthly'
    };

    axios.get.mockResolvedValueOnce({
      data: { data: licenseData }
    });

    const CachedDataTest = () => {
      const { getModuleLicense, loading } = useLicense();
      
      if (loading) return <div>Loading...</div>;
      
      const attendanceLicense = getModuleLicense('attendance');
      const payrollLicense = getModuleLicense('payroll');
      
      return (
        <div>
          <div data-testid="attendance-tier">{attendanceLicense?.tier}</div>
          <div data-testid="payroll-tier">{payrollLicense?.tier}</div>
        </div>
      );
    };

    render(
      <LicenseProvider>
        <CachedDataTest />
      </LicenseProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('attendance-tier')).toHaveTextContent('business');
      expect(screen.getByTestId('payroll-tier')).toHaveTextContent('starter');
    });

    // Should fetch twice on mount (license + usage), data is then cached for multiple hook calls
    expect(axios.get).toHaveBeenCalledTimes(2);
  });

  test('should not fetch data when not authenticated', async () => {
    const { useAuth } = require('./AuthContext');
    useAuth.mockReturnValue({
      isAuthenticated: false,
      user: null
    });

    render(
      <LicenseProvider>
        <TestComponent moduleKey="attendance" />
      </LicenseProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Should not call API when not authenticated
    expect(axios.get).not.toHaveBeenCalled();
  });

  test('should handle API errors gracefully', async () => {
    const { useAuth } = require('./AuthContext');
    useAuth.mockReturnValue({
      isAuthenticated: true,
      user: { tenantId: 'tenant-123' }
    });

    axios.get.mockRejectedValueOnce({
      response: {
        data: {
          message: 'License not found'
        }
      }
    });

    render(
      <LicenseProvider>
        <TestComponent moduleKey="attendance" />
      </LicenseProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toHaveTextContent('License not found');
    });
  });
});

describe('LicenseContext - Context Updates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should update context when license data changes', async () => {
    const { useAuth } = require('./AuthContext');
    useAuth.mockReturnValue({
      isAuthenticated: true,
      user: { tenantId: 'tenant-123' }
    });

    axios.get.mockResolvedValueOnce({
      data: {
        data: {
          modules: [
            { key: 'attendance', enabled: false, tier: 'starter' }
          ],
          status: 'active'
        }
      }
    });

    const { rerender } = render(
      <LicenseProvider>
        <TestComponent moduleKey="attendance" />
      </LicenseProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('module-enabled')).toHaveTextContent('disabled');
    });

    // Simulate license update
    axios.get.mockResolvedValueOnce({
      data: {
        data: {
          modules: [
            { key: 'attendance', enabled: true, tier: 'business' }
          ],
          status: 'active'
        }
      }
    });

    const RefreshButton = () => {
      const { refreshLicenses } = useLicense();
      return <button onClick={refreshLicenses}>Refresh</button>;
    };

    rerender(
      <LicenseProvider>
        <TestComponent moduleKey="attendance" />
        <RefreshButton />
      </LicenseProvider>
    );

    // Click refresh button
    const refreshButton = screen.getByText('Refresh');
    await act(async () => {
      refreshButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('module-enabled')).toHaveTextContent('enabled');
    });
  });

  test('should provide getEnabledModules that updates with context', async () => {
    const { useAuth } = require('./AuthContext');
    useAuth.mockReturnValue({
      isAuthenticated: true,
      user: { tenantId: 'tenant-123' }
    });

    axios.get.mockResolvedValueOnce({
      data: {
        data: {
          modules: [
            { key: 'attendance', enabled: true, tier: 'business' },
            { key: 'payroll', enabled: false, tier: 'starter' },
            { key: 'documents', enabled: true, tier: 'enterprise' }
          ],
          status: 'active'
        }
      }
    });

    render(
      <LicenseProvider>
        <TestComponent moduleKey="attendance" />
      </LicenseProvider>
    );

    await waitFor(() => {
      const enabledModules = JSON.parse(screen.getByTestId('enabled-modules').textContent);
      expect(enabledModules).toEqual(['attendance', 'documents']);
    });
  });

  test('should update usage data independently from license data', async () => {
    const { useAuth } = require('./AuthContext');
    useAuth.mockReturnValue({
      isAuthenticated: true,
      user: { tenantId: 'tenant-123' }
    });

    axios.get
      .mockResolvedValueOnce({
        data: {
          data: {
            modules: [
              { key: 'attendance', enabled: true, tier: 'business', limits: { employees: 200 } }
            ],
            status: 'active'
          }
        }
      })
      .mockResolvedValueOnce({
        data: {
          data: [
            {
              moduleKey: 'attendance',
              usage: { employees: 150, storage: 5000000000, apiCalls: 30000 },
              limits: { employees: 200, storage: 10737418240, apiCalls: 50000 }
            }
          ]
        }
      });

    render(
      <LicenseProvider>
        <TestComponent moduleKey="attendance" limitType="employees" />
      </LicenseProvider>
    );

    await waitFor(() => {
      const usage = JSON.parse(screen.getByTestId('module-usage').textContent);
      expect(usage).toBeTruthy();
      expect(usage.employees.current).toBe(150);
      expect(usage.employees.limit).toBe(200);
      expect(usage.employees.percentage).toBe(75);
    });
  });

  test('should handle usage data fetch failure gracefully', async () => {
    const { useAuth } = require('./AuthContext');
    useAuth.mockReturnValue({
      isAuthenticated: true,
      user: { tenantId: 'tenant-123' }
    });

    axios.get
      .mockResolvedValueOnce({
        data: {
          data: {
            modules: [
              { key: 'attendance', enabled: true, tier: 'business' }
            ],
            status: 'active'
          }
        }
      })
      .mockRejectedValueOnce(new Error('Usage data unavailable'));

    render(
      <LicenseProvider>
        <TestComponent moduleKey="attendance" limitType="employees" />
      </LicenseProvider>
    );

    // Should still render successfully even if usage data fails
    await waitFor(() => {
      expect(screen.getByTestId('module-enabled')).toHaveTextContent('enabled');
      expect(screen.getByTestId('module-usage')).toHaveTextContent('null');
    });
  });
});

describe('LicenseContext - isApproachingLimit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return true when usage is at 80% or above', async () => {
    const { useAuth } = require('./AuthContext');
    useAuth.mockReturnValue({
      isAuthenticated: true,
      user: { tenantId: 'tenant-123' }
    });

    axios.get
      .mockResolvedValueOnce({
        data: {
          data: {
            modules: [{ key: 'attendance', enabled: true, tier: 'business' }],
            status: 'active'
          }
        }
      })
      .mockResolvedValueOnce({
        data: {
          data: [
            {
              moduleKey: 'attendance',
              usage: { employees: 160 },
              limits: { employees: 200 }
            }
          ]
        }
      });

    render(
      <LicenseProvider>
        <TestComponent moduleKey="attendance" limitType="employees" />
      </LicenseProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('approaching-limit')).toHaveTextContent('yes');
    });
  });

  test('should return false when usage is below 80%', async () => {
    const { useAuth } = require('./AuthContext');
    useAuth.mockReturnValue({
      isAuthenticated: true,
      user: { tenantId: 'tenant-123' }
    });

    axios.get
      .mockResolvedValueOnce({
        data: {
          data: {
            modules: [{ key: 'attendance', enabled: true, tier: 'business' }],
            status: 'active'
          }
        }
      })
      .mockResolvedValueOnce({
        data: {
          data: [
            {
              moduleKey: 'attendance',
              usage: { employees: 100 },
              limits: { employees: 200 }
            }
          ]
        }
      });

    render(
      <LicenseProvider>
        <TestComponent moduleKey="attendance" limitType="employees" />
      </LicenseProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('approaching-limit')).toHaveTextContent('no');
    });
  });

  test('should return false when no usage data exists', async () => {
    const { useAuth } = require('./AuthContext');
    useAuth.mockReturnValue({
      isAuthenticated: true,
      user: { tenantId: 'tenant-123' }
    });

    axios.get.mockResolvedValueOnce({
      data: {
        data: {
          modules: [{ key: 'attendance', enabled: true, tier: 'business' }],
          status: 'active'
        }
      }
    });

    render(
      <LicenseProvider>
        <TestComponent moduleKey="attendance" limitType="employees" />
      </LicenseProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('approaching-limit')).toHaveTextContent('no');
    });
  });
});

describe('LicenseContext - License Expiration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should detect expired license', async () => {
    const { useAuth } = require('./AuthContext');
    useAuth.mockReturnValue({
      isAuthenticated: true,
      user: { tenantId: 'tenant-123' }
    });

    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 10);

    axios.get.mockResolvedValueOnce({
      data: {
        data: {
          modules: [
            {
              key: 'attendance',
              enabled: true,
              tier: 'business',
              expiresAt: pastDate.toISOString()
            }
          ],
          status: 'active'
        }
      }
    });

    render(
      <LicenseProvider>
        <TestComponent moduleKey="attendance" />
      </LicenseProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('license-expired')).toHaveTextContent('yes');
    });
  });

  test('should detect license expiring soon', async () => {
    const { useAuth } = require('./AuthContext');
    useAuth.mockReturnValue({
      isAuthenticated: true,
      user: { tenantId: 'tenant-123' }
    });

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 15);

    axios.get.mockResolvedValueOnce({
      data: {
        data: {
          modules: [
            {
              key: 'attendance',
              enabled: true,
              tier: 'business',
              expiresAt: futureDate.toISOString()
            }
          ],
          status: 'active'
        }
      }
    });

    render(
      <LicenseProvider>
        <TestComponent moduleKey="attendance" />
      </LicenseProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('expiring-soon')).toHaveTextContent('yes');
      const days = parseInt(screen.getByTestId('days-until-expiration').textContent);
      expect(days).toBeGreaterThan(0);
      expect(days).toBeLessThanOrEqual(30);
    });
  });
});

describe('LicenseContext - Usage Warnings and Violations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should detect usage warnings', async () => {
    const { useAuth } = require('./AuthContext');
    useAuth.mockReturnValue({
      isAuthenticated: true,
      user: { tenantId: 'tenant-123' }
    });

    axios.get
      .mockResolvedValueOnce({
        data: {
          data: {
            modules: [{ key: 'attendance', enabled: true, tier: 'business' }],
            status: 'active'
          }
        }
      })
      .mockResolvedValueOnce({
        data: {
          data: [
            {
              moduleKey: 'attendance',
              usage: { employees: 160 },
              limits: { employees: 200 },
              warnings: [{ limitType: 'employees', percentage: 80 }]
            }
          ]
        }
      });

    render(
      <LicenseProvider>
        <TestComponent moduleKey="attendance" />
      </LicenseProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('has-warnings')).toHaveTextContent('yes');
    });
  });

  test('should detect usage violations', async () => {
    const { useAuth } = require('./AuthContext');
    useAuth.mockReturnValue({
      isAuthenticated: true,
      user: { tenantId: 'tenant-123' }
    });

    axios.get
      .mockResolvedValueOnce({
        data: {
          data: {
            modules: [{ key: 'attendance', enabled: true, tier: 'business' }],
            status: 'active'
          }
        }
      })
      .mockResolvedValueOnce({
        data: {
          data: [
            {
              moduleKey: 'attendance',
              usage: { employees: 210 },
              limits: { employees: 200 },
              violations: [{ limitType: 'employees', attemptedValue: 210, limit: 200 }]
            }
          ]
        }
      });

    render(
      <LicenseProvider>
        <TestComponent moduleKey="attendance" />
      </LicenseProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('has-violations')).toHaveTextContent('yes');
    });
  });
});
