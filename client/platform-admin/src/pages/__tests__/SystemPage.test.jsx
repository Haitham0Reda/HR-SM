import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';
import SystemPage from '../SystemPage';
import systemSettingsSlice from '../../store/slices/systemSettingsSlice';

// Mock the child components
jest.mock('../../components/system/SystemHealth', () => {
  return function MockSystemHealth({ systemHealth, loading }) {
    if (loading) return <div data-testid="system-health-loading">Loading health...</div>;
    
    return (
      <div data-testid="system-health">
        <span>Status: {systemHealth?.status || 'unknown'}</span>
        <span>Database: {systemHealth?.checks?.database?.status || 'unknown'}</span>
      </div>
    );
  };
});

jest.mock('../../components/system/UsageMetrics', () => {
  return function MockUsageMetrics({ systemStats, loading }) {
    if (loading) return <div data-testid="usage-metrics-loading">Loading metrics...</div>;
    
    return (
      <div data-testid="usage-metrics">
        <span>Total Tenants: {systemStats?.totalTenants || 0}</span>
        <span>Total Users: {systemStats?.totalUsers || 0}</span>
      </div>
    );
  };
});

jest.mock('../../components/theme/ThemeSettings', () => {
  return function MockThemeSettings({ settings, loading }) {
    if (loading) return <div data-testid="theme-settings-loading">Loading settings...</div>;
    
    return (
      <div data-testid="theme-settings">
        <span>Theme: {settings?.theme || 'default'}</span>
      </div>
    );
  };
});

// Create a test store
const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      systemSettings: systemSettingsSlice,
    },
    preloadedState: {
      systemSettings: {
        systemHealth: {
          status: 'healthy',
          checks: {
            database: { status: 'healthy' },
            memory: { usagePercent: 45 },
          },
        },
        systemStats: {
          totalTenants: 5,
          totalUsers: 150,
          totalRevenue: 10000,
        },
        settings: {
          theme: 'light',
          notifications: true,
        },
        loading: false,
        error: null,
        ...initialState.systemSettings,
      },
    },
  });
};

const renderWithProviders = (component, { initialState = {} } = {}) => {
  const store = createTestStore(initialState);
  const theme = createTheme();
  
  return render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        {component}
      </ThemeProvider>
    </Provider>
  );
};

describe('SystemPage', () => {
  it('renders system health & metrics page', () => {
    renderWithProviders(<SystemPage />);
    
    expect(screen.getByText('System Health & Metrics')).toBeInTheDocument();
  });

  it('displays tabs for system health, usage metrics, and theme settings', () => {
    renderWithProviders(<SystemPage />);
    
    expect(screen.getByText('System Health')).toBeInTheDocument();
    expect(screen.getByText('Usage Metrics')).toBeInTheDocument();
    expect(screen.getByText('Theme Settings')).toBeInTheDocument();
  });

  it('shows system health component with Redux data', () => {
    renderWithProviders(<SystemPage />);
    
    expect(screen.getByTestId('system-health')).toBeInTheDocument();
    expect(screen.getByText('Status: healthy')).toBeInTheDocument();
    expect(screen.getByText('Database: healthy')).toBeInTheDocument();
  });

  it('switches to usage metrics tab', () => {
    renderWithProviders(<SystemPage />);
    
    const metricsTab = screen.getByText('Usage Metrics');
    fireEvent.click(metricsTab);
    
    expect(screen.getByTestId('usage-metrics')).toBeInTheDocument();
    expect(screen.getByText('Total Tenants: 5')).toBeInTheDocument();
    expect(screen.getByText('Total Users: 150')).toBeInTheDocument();
  });

  it('switches to theme settings tab', () => {
    renderWithProviders(<SystemPage />);
    
    const themeTab = screen.getByText('Theme Settings');
    fireEvent.click(themeTab);
    
    expect(screen.getByTestId('theme-settings')).toBeInTheDocument();
    expect(screen.getByText('Theme: light')).toBeInTheDocument();
  });

  it('shows loading state when system data is loading', () => {
    renderWithProviders(<SystemPage />, {
      initialState: {
        systemSettings: {
          systemHealth: null,
          systemStats: null,
          settings: null,
          loading: true,
          error: null,
        },
      },
    });
    
    expect(screen.getByTestId('system-health-loading')).toBeInTheDocument();
  });

  it('passes correct props to child components', () => {
    renderWithProviders(<SystemPage />);
    
    // System Health tab (default)
    expect(screen.getByTestId('system-health')).toBeInTheDocument();
    expect(screen.getByText('Status: healthy')).toBeInTheDocument();
    
    // Switch to Usage Metrics
    const metricsTab = screen.getByText('Usage Metrics');
    fireEvent.click(metricsTab);
    
    expect(screen.getByTestId('usage-metrics')).toBeInTheDocument();
    expect(screen.getByText('Total Tenants: 5')).toBeInTheDocument();
    
    // Switch to Theme Settings
    const themeTab = screen.getByText('Theme Settings');
    fireEvent.click(themeTab);
    
    expect(screen.getByTestId('theme-settings')).toBeInTheDocument();
    expect(screen.getByText('Theme: light')).toBeInTheDocument();
  });

  it('handles error state gracefully', () => {
    // Mock console.error to avoid noise in test output
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    renderWithProviders(<SystemPage />, {
      initialState: {
        systemSettings: {
          systemHealth: null,
          systemStats: null,
          settings: null,
          loading: false,
          error: { message: 'Failed to load system data' },
        },
      },
    });
    
    // The component should still render even with an error
    expect(screen.getByText('System Health & Metrics')).toBeInTheDocument();
    expect(screen.getByTestId('system-health')).toBeInTheDocument();
    
    consoleSpy.mockRestore();
  });

  it('handles empty/null data gracefully', () => {
    renderWithProviders(<SystemPage />, {
      initialState: {
        systemSettings: {
          systemHealth: null,
          systemStats: null,
          settings: null,
          loading: false,
          error: null,
        },
      },
    });
    
    expect(screen.getByTestId('system-health')).toBeInTheDocument();
    expect(screen.getByText('Status: unknown')).toBeInTheDocument();
    
    // Switch to metrics tab
    const metricsTab = screen.getByText('Usage Metrics');
    fireEvent.click(metricsTab);
    
    expect(screen.getByText('Total Tenants: 0')).toBeInTheDocument();
    expect(screen.getByText('Total Users: 0')).toBeInTheDocument();
  });
});