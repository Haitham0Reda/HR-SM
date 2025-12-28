import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';
import ModulesPage from '../ModulesPage';
import moduleManagementSlice from '../../store/slices/moduleManagementSlice';

// Mock the child components
jest.mock('../../components/modules/ModuleRegistry', () => {
  return function MockModuleRegistry({ modules, loading }) {
    if (loading) return <div data-testid="module-registry-loading">Loading modules...</div>;
    
    return (
      <div data-testid="module-registry">
        {modules.map(module => (
          <div key={module.id}>
            <span>{module.name}</span>
            <span>{module.version}</span>
          </div>
        ))}
      </div>
    );
  };
});

// Create a test store
const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      moduleManagement: moduleManagementSlice,
    },
    preloadedState: {
      moduleManagement: {
        availableModules: [
          { id: '1', name: 'HR Core', version: '1.0.0' },
          { id: '2', name: 'Payroll', version: '2.1.0' },
          { id: '3', name: 'Attendance', version: '1.5.0' },
        ],
        tenantModules: {},
        loading: false,
        error: null,
        ...initialState.moduleManagement,
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

describe('ModulesPage', () => {
  it('renders module management page', () => {
    renderWithProviders(<ModulesPage />);
    
    expect(screen.getByText('Module Management')).toBeInTheDocument();
  });

  it('displays tabs for module registry and tenant modules', () => {
    renderWithProviders(<ModulesPage />);
    
    expect(screen.getByText('Module Registry')).toBeInTheDocument();
    expect(screen.getByText('Tenant Modules')).toBeInTheDocument();
  });

  it('shows module registry with Redux data', () => {
    renderWithProviders(<ModulesPage />);
    
    expect(screen.getByTestId('module-registry')).toBeInTheDocument();
    expect(screen.getByText('HR Core')).toBeInTheDocument();
    expect(screen.getByText('Payroll')).toBeInTheDocument();
    expect(screen.getByText('Attendance')).toBeInTheDocument();
    expect(screen.getByText('1.0.0')).toBeInTheDocument();
    expect(screen.getByText('2.1.0')).toBeInTheDocument();
    expect(screen.getByText('1.5.0')).toBeInTheDocument();
  });

  it('shows loading state when modules are loading', () => {
    renderWithProviders(<ModulesPage />, {
      initialState: {
        moduleManagement: {
          availableModules: [],
          loading: true,
          error: null,
        },
      },
    });
    
    expect(screen.getByTestId('module-registry-loading')).toBeInTheDocument();
  });

  it('switches between tabs', () => {
    renderWithProviders(<ModulesPage />);
    
    // Click on Tenant Modules tab
    const tenantTab = screen.getByText('Tenant Modules');
    fireEvent.click(tenantTab);
    
    expect(screen.getByText('Tenant-specific module configuration is available from the Tenants page.')).toBeInTheDocument();
  });

  it('handles empty modules list', () => {
    renderWithProviders(<ModulesPage />, {
      initialState: {
        moduleManagement: {
          availableModules: [],
          loading: false,
          error: null,
        },
      },
    });
    
    const moduleRegistry = screen.getByTestId('module-registry');
    expect(moduleRegistry).toBeInTheDocument();
    expect(moduleRegistry).toBeEmptyDOMElement();
  });

  it('passes correct props to ModuleRegistry component', () => {
    renderWithProviders(<ModulesPage />);
    
    // Verify that the component receives the modules and loading state
    expect(screen.getByTestId('module-registry')).toBeInTheDocument();
    
    // Check that all modules are displayed (indicating props are passed correctly)
    expect(screen.getByText('HR Core')).toBeInTheDocument();
    expect(screen.getByText('Payroll')).toBeInTheDocument();
    expect(screen.getByText('Attendance')).toBeInTheDocument();
  });

  it('handles error state gracefully', () => {
    // Mock console.error to avoid noise in test output
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    renderWithProviders(<ModulesPage />, {
      initialState: {
        moduleManagement: {
          availableModules: [],
          loading: false,
          error: { message: 'Failed to load modules' },
        },
      },
    });
    
    // The component should still render even with an error
    expect(screen.getByText('Module Management')).toBeInTheDocument();
    expect(screen.getByTestId('module-registry')).toBeInTheDocument();
    
    consoleSpy.mockRestore();
  });
});