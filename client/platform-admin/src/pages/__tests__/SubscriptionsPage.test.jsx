import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';
import SubscriptionsPage from '../SubscriptionsPage';
import subscriptionSlice from '../../store/slices/subscriptionSlice';

// Mock the child components
jest.mock('../../components/subscriptions/PlanList', () => {
  return function MockPlanList({ plans, loading, onEdit }) {
    if (loading) return <div data-testid="plan-list-loading">Loading...</div>;
    
    return (
      <div data-testid="plan-list">
        {plans.map(plan => (
          <div key={plan.id}>
            <span>{plan.name}</span>
            <button onClick={() => onEdit(plan)}>Edit {plan.name}</button>
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
      subscription: subscriptionSlice,
    },
    preloadedState: {
      subscription: {
        plans: [
          { id: '1', name: 'Basic Plan', price: 29 },
          { id: '2', name: 'Pro Plan', price: 99 },
        ],
        subscriptions: [],
        loading: false,
        error: null,
        ...initialState.subscription,
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

describe('SubscriptionsPage', () => {
  it('renders subscription management page', () => {
    renderWithProviders(<SubscriptionsPage />);
    
    expect(screen.getByText('Subscription Management')).toBeInTheDocument();
    expect(screen.getByText('Create Plan')).toBeInTheDocument();
  });

  it('displays tabs for plans and tenant subscriptions', () => {
    renderWithProviders(<SubscriptionsPage />);
    
    expect(screen.getByText('Plans')).toBeInTheDocument();
    expect(screen.getByText('Tenant Subscriptions')).toBeInTheDocument();
  });

  it('shows plan list with Redux data', () => {
    renderWithProviders(<SubscriptionsPage />);
    
    expect(screen.getByTestId('plan-list')).toBeInTheDocument();
    expect(screen.getByText('Basic Plan')).toBeInTheDocument();
    expect(screen.getByText('Pro Plan')).toBeInTheDocument();
  });

  it('handles plan edit action', async () => {
    renderWithProviders(<SubscriptionsPage />);
    
    const editButton = screen.getByText('Edit Basic Plan');
    fireEvent.click(editButton);
    
    await waitFor(() => {
      expect(screen.getByText('Plan editing will be implemented')).toBeInTheDocument();
    });
  });

  it('shows loading state when plans are loading', () => {
    renderWithProviders(<SubscriptionsPage />, {
      initialState: {
        subscription: {
          plans: [],
          loading: true,
          error: null,
        },
      },
    });
    
    expect(screen.getByTestId('plan-list-loading')).toBeInTheDocument();
  });

  it('switches between tabs', () => {
    renderWithProviders(<SubscriptionsPage />);
    
    // Click on Tenant Subscriptions tab
    const tenantTab = screen.getByText('Tenant Subscriptions');
    fireEvent.click(tenantTab);
    
    expect(screen.getByText('Tenant subscription management is available from the Tenants page.')).toBeInTheDocument();
  });

  it('shows create plan message when create button is clicked', async () => {
    renderWithProviders(<SubscriptionsPage />);
    
    const createButton = screen.getByText('Create Plan');
    fireEvent.click(createButton);
    
    await waitFor(() => {
      expect(screen.getByText('Create plan feature coming soon')).toBeInTheDocument();
    });
  });

  it('displays error message from Redux state', async () => {
    renderWithProviders(<SubscriptionsPage />, {
      initialState: {
        subscription: {
          plans: [],
          loading: false,
          error: { message: 'Failed to load plans' },
        },
      },
    });
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load plans')).toBeInTheDocument();
    });
  });

  it('closes snackbar when close button is clicked', async () => {
    renderWithProviders(<SubscriptionsPage />);
    
    // Trigger a snackbar message
    const createButton = screen.getByText('Create Plan');
    fireEvent.click(createButton);
    
    await waitFor(() => {
      expect(screen.getByText('Create plan feature coming soon')).toBeInTheDocument();
    });
    
    // Close the snackbar
    const closeButton = screen.getByLabelText('Close');
    fireEvent.click(closeButton);
    
    await waitFor(() => {
      expect(screen.queryByText('Create plan feature coming soon')).not.toBeInTheDocument();
    });
  });
});