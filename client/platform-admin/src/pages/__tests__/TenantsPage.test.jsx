import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';
import TenantsPage from '../TenantsPage';
import tenantManagementSlice from '../../store/slices/tenantManagementSlice';

// Mock the child components
jest.mock('../../components/tenants/TenantList', () => {
  return function MockTenantList({ onView, onEdit, onSuspend, onReactivate }) {
    return (
      <div data-testid="tenant-list">
        <button onClick={() => onView({ _id: '1', name: 'Test Tenant' })}>
          View Tenant
        </button>
        <button onClick={() => onEdit({ _id: '1', name: 'Test Tenant' })}>
          Edit Tenant
        </button>
        <button onClick={() => onSuspend({ _id: '1', name: 'Test Tenant' })}>
          Suspend Tenant
        </button>
        <button onClick={() => onReactivate({ _id: '1', name: 'Test Tenant' })}>
          Reactivate Tenant
        </button>
      </div>
    );
  };
});

jest.mock('../../components/tenants/TenantCreate', () => {
  return function MockTenantCreate({ open, onClose, onSuccess }) {
    return open ? (
      <div data-testid="tenant-create">
        <button onClick={onSuccess}>Create Success</button>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null;
  };
});

jest.mock('../../components/tenants/TenantDetails', () => {
  return function MockTenantDetails({ open, onClose, onSuccess, mode }) {
    return open ? (
      <div data-testid="tenant-details">
        <span>Mode: {mode}</span>
        <button onClick={onSuccess}>Update Success</button>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null;
  };
});

// Create a test store
const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      tenantManagement: tenantManagementSlice,
    },
    preloadedState: {
      tenantManagement: {
        tenants: [
          { _id: '1', name: 'Test Tenant 1', status: 'active' },
          { _id: '2', name: 'Test Tenant 2', status: 'trial' },
          { _id: '3', name: 'Test Tenant 3', status: 'suspended' },
        ],
        loading: false,
        error: null,
        ...initialState.tenantManagement,
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

describe('TenantsPage', () => {
  it('renders tenant management page with statistics', () => {
    renderWithProviders(<TenantsPage />);
    
    expect(screen.getByText('Tenant Management')).toBeInTheDocument();
    expect(screen.getByText('Create Tenant')).toBeInTheDocument();
    
    // Check statistics cards
    expect(screen.getByText('Total Tenants')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument(); // Total count
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument(); // Active count
  });

  it('opens create tenant dialog when create button is clicked', () => {
    renderWithProviders(<TenantsPage />);
    
    const createButton = screen.getByText('Create Tenant');
    fireEvent.click(createButton);
    
    expect(screen.getByTestId('tenant-create')).toBeInTheDocument();
  });

  it('handles tenant view action', () => {
    renderWithProviders(<TenantsPage />);
    
    const viewButton = screen.getByText('View Tenant');
    fireEvent.click(viewButton);
    
    expect(screen.getByTestId('tenant-details')).toBeInTheDocument();
    expect(screen.getByText('Mode: view')).toBeInTheDocument();
  });

  it('handles tenant edit action', () => {
    renderWithProviders(<TenantsPage />);
    
    const editButton = screen.getByText('Edit Tenant');
    fireEvent.click(editButton);
    
    expect(screen.getByTestId('tenant-details')).toBeInTheDocument();
    expect(screen.getByText('Mode: edit')).toBeInTheDocument();
  });

  it('handles tenant suspend action with confirmation', () => {
    renderWithProviders(<TenantsPage />);
    
    const suspendButton = screen.getByText('Suspend Tenant');
    fireEvent.click(suspendButton);
    
    expect(screen.getByText('Confirm Suspension')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to suspend tenant "Test Tenant"?')).toBeInTheDocument();
  });

  it('handles tenant reactivate action with confirmation', () => {
    renderWithProviders(<TenantsPage />);
    
    const reactivateButton = screen.getByText('Reactivate Tenant');
    fireEvent.click(reactivateButton);
    
    expect(screen.getByText('Confirm Reactivation')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to reactivate tenant "Test Tenant"?')).toBeInTheDocument();
  });

  it('shows success message when tenant is created', async () => {
    renderWithProviders(<TenantsPage />);
    
    // Open create dialog
    const createButton = screen.getByText('Create Tenant');
    fireEvent.click(createButton);
    
    // Trigger success
    const successButton = screen.getByText('Create Success');
    fireEvent.click(successButton);
    
    await waitFor(() => {
      expect(screen.getByText('Tenant created successfully')).toBeInTheDocument();
    });
  });

  it('calculates statistics correctly from Redux state', () => {
    renderWithProviders(<TenantsPage />);
    
    // Total: 3, Active: 1, Trial: 1, Suspended: 1, Cancelled: 0
    expect(screen.getByText('3')).toBeInTheDocument(); // Total
    expect(screen.getByText('1')).toBeInTheDocument(); // Active
    // Note: The component shows multiple "1"s for different stats
  });

  it('displays error message from Redux state', async () => {
    renderWithProviders(<TenantsPage />, {
      initialState: {
        tenantManagement: {
          tenants: [],
          loading: false,
          error: { message: 'Failed to load tenants' },
        },
      },
    });
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load tenants')).toBeInTheDocument();
    });
  });
});