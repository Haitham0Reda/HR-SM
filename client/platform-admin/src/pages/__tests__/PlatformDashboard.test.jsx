import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';
import PlatformDashboard from '../PlatformDashboard';
import tenantManagementSlice from '../../store/slices/tenantManagementSlice';
import systemSettingsSlice from '../../store/slices/systemSettingsSlice';

// Mock the theme context
jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'light',
  }),
}));

// Create a test store
const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      tenantManagement: tenantManagementSlice,
      systemSettings: systemSettingsSlice,
    },
    preloadedState: {
      tenantManagement: {
        tenants: [
          {
            _id: '1',
            name: 'Test Company 1',
            status: 'active',
            usage: { employees: 50, departments: 5 },
          },
          {
            _id: '2',
            name: 'Test Company 2',
            status: 'active',
            usage: { employees: 30, departments: 3 },
          },
        ],
        loading: false,
        error: null,
        ...initialState.tenantManagement,
      },
      systemSettings: {
        systemHealth: {
          status: 'healthy',
          checks: {
            database: { status: 'healthy' },
            memory: { usagePercent: 45, heapUsed: 512, heapTotal: 1024 },
          },
          uptime: 3600,
        },
        systemStats: {
          totalTenants: 2,
          totalUsers: 80,
          totalRevenue: 5000,
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

describe('PlatformDashboard', () => {
  it('renders dashboard with key metrics', async () => {
    renderWithProviders(<PlatformDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Platform Dashboard')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument(); // Total companies
      expect(screen.getByText('80')).toBeInTheDocument(); // Total users
      expect(screen.getByText('Healthy')).toBeInTheDocument(); // System health
    });
  });

  it('displays system health information', async () => {
    renderWithProviders(<PlatformDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('System Resources')).toBeInTheDocument();
      expect(screen.getByText('45%')).toBeInTheDocument(); // Memory usage
      expect(screen.getByText('512 MB / 1024 MB')).toBeInTheDocument();
      expect(screen.getByText('Database: healthy')).toBeInTheDocument();
    });
  });

  it('shows loading state initially', () => {
    renderWithProviders(<PlatformDashboard />, {
      initialState: {
        tenantManagement: { tenants: [], loading: true, error: null },
        systemSettings: { systemHealth: null, loading: true, error: null },
      },
    });
    
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('displays error message when there is an error', async () => {
    renderWithProviders(<PlatformDashboard />, {
      initialState: {
        tenantManagement: { 
          tenants: [], 
          loading: false, 
          error: { message: 'Failed to load tenants' } 
        },
      },
    });
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load tenants')).toBeInTheDocument();
    });
  });

  it('calculates statistics correctly', async () => {
    renderWithProviders(<PlatformDashboard />);
    
    await waitFor(() => {
      // Total companies
      expect(screen.getByText('2')).toBeInTheDocument();
      // Active companies (both are active)
      expect(screen.getByText('2')).toBeInTheDocument();
      // Total users (50 + 30)
      expect(screen.getByText('80')).toBeInTheDocument();
      // Total departments (5 + 3)
      expect(screen.getByText('8')).toBeInTheDocument();
    });
  });

  it('displays top companies section', async () => {
    renderWithProviders(<PlatformDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Top Companies by Users')).toBeInTheDocument();
      expect(screen.getByText('Test Company 1')).toBeInTheDocument();
      expect(screen.getByText('Test Company 2')).toBeInTheDocument();
    });
  });
});