import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';
import PlatformLayout from '../PlatformLayout';
import platformAuthSlice from '../../../store/slices/platformAuthSlice';

// Mock the theme context
jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    currentTheme: 'light',
    changeTheme: jest.fn(),
    getAvailableThemes: () => ['light', 'dark'],
  }),
}));

// Create a test store
const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      platformAuth: platformAuthSlice,
    },
    preloadedState: {
      platformAuth: {
        user: {
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          role: 'admin',
        },
        isAuthenticated: true,
        loading: false,
        error: null,
        ...initialState.platformAuth,
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
        <BrowserRouter>
          {component}
        </BrowserRouter>
      </ThemeProvider>
    </Provider>
  );
};

describe('PlatformLayout', () => {
  it('renders platform layout with user information', () => {
    renderWithProviders(<PlatformLayout />);
    
    expect(screen.getByText('HRMS Platform Administration')).toBeInTheDocument();
    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  it('displays navigation menu items', () => {
    renderWithProviders(<PlatformLayout />);
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Companies')).toBeInTheDocument();
    expect(screen.getByText('Tenants')).toBeInTheDocument();
    expect(screen.getByText('Subscriptions')).toBeInTheDocument();
    expect(screen.getByText('Modules')).toBeInTheDocument();
    expect(screen.getByText('System')).toBeInTheDocument();
  });

  it('opens user menu when account icon is clicked', () => {
    renderWithProviders(<PlatformLayout />);
    
    const accountButton = screen.getByLabelText('account of current user');
    fireEvent.click(accountButton);
    
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('Role: admin')).toBeInTheDocument();
    expect(screen.getByText('Logout')).toBeInTheDocument();
  });

  it('opens theme menu when palette icon is clicked', () => {
    renderWithProviders(<PlatformLayout />);
    
    const themeButton = screen.getByLabelText('theme settings');
    fireEvent.click(themeButton);
    
    expect(screen.getByText('Select Theme')).toBeInTheDocument();
    expect(screen.getByText('light')).toBeInTheDocument();
    expect(screen.getByText('dark')).toBeInTheDocument();
  });

  it('handles mobile drawer toggle', () => {
    renderWithProviders(<PlatformLayout />);
    
    // Mobile menu button should be present but hidden on larger screens
    const mobileMenuButton = screen.getByLabelText('open drawer');
    expect(mobileMenuButton).toBeInTheDocument();
  });
});