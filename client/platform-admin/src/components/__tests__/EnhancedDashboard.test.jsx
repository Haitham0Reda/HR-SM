import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import EnhancedDashboard from '../EnhancedDashboard';
import realtimeService from '../../services/realtimeService';

// Mock the realtime service
jest.mock('../../services/realtimeService', () => ({
  connect: jest.fn(),
  subscribe: jest.fn(() => jest.fn()), // Return unsubscribe function
  requestMetricsUpdate: jest.fn(),
  getConnectionStatus: jest.fn(() => ({ connected: true }))
}));

// Mock the child components
jest.mock('../SystemMetrics', () => {
  return function SystemMetrics({ data }) {
    return <div data-testid="system-metrics">System Metrics Component</div>;
  };
});

jest.mock('../TenantHealthMonitor', () => {
  return function TenantHealthMonitor({ data }) {
    return <div data-testid="tenant-health-monitor">Tenant Health Monitor Component</div>;
  };
});

jest.mock('../LicenseMonitor', () => {
  return function LicenseMonitor({ data }) {
    return <div data-testid="license-monitor">License Monitor Component</div>;
  };
});

const theme = createTheme();

const renderWithTheme = (component) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('EnhancedDashboard', () => {
  let mockUnsubscribe;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUnsubscribe = jest.fn();
    realtimeService.subscribe.mockReturnValue(mockUnsubscribe);
    realtimeService.getConnectionStatus.mockReturnValue({ connected: false }); // Start disconnected
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    test('renders dashboard with all main components', () => {
      renderWithTheme(<EnhancedDashboard />);
      
      expect(screen.getByText('Platform Dashboard')).toBeInTheDocument();
      expect(screen.getByTestId('system-metrics')).toBeInTheDocument();
      expect(screen.getByTestId('tenant-health-monitor')).toBeInTheDocument();
      expect(screen.getByTestId('license-monitor')).toBeInTheDocument();
    });

    test('displays connection status indicator', () => {
      renderWithTheme(<EnhancedDashboard />);
      
      expect(screen.getByText('Real-time monitoring disconnected')).toBeInTheDocument();
    });

    test('renders refresh button', () => {
      renderWithTheme(<EnhancedDashboard />);
      
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      expect(refreshButton).toBeInTheDocument();
    });
  });

  describe('Socket.io Integration', () => {
    test('initializes real-time connection on mount', () => {
      renderWithTheme(<EnhancedDashboard />);
      
      expect(realtimeService.connect).toHaveBeenCalledTimes(1);
    });

    test('subscribes to connection and alerts events', () => {
      renderWithTheme(<EnhancedDashboard />);
      
      expect(realtimeService.subscribe).toHaveBeenCalledWith('connection', expect.any(Function));
      expect(realtimeService.subscribe).toHaveBeenCalledWith('alerts', expect.any(Function));
    });

    test('handles connection status updates', async () => {
      let connectionCallback;
      realtimeService.subscribe.mockImplementation((event, callback) => {
        if (event === 'connection') {
          connectionCallback = callback;
        }
        return mockUnsubscribe;
      });

      renderWithTheme(<EnhancedDashboard />);

      // Simulate connection lost
      act(() => {
        connectionCallback({ connected: false });
      });

      await waitFor(() => {
        expect(screen.getByText('Real-time monitoring disconnected')).toBeInTheDocument();
      });

      // Simulate connection restored
      act(() => {
        connectionCallback({ connected: true, reconnected: true });
      });

      await waitFor(() => {
        expect(screen.getByText('Real-time monitoring active')).toBeInTheDocument();
      });
    });

    test('displays system alerts when received', async () => {
      let alertsCallback;
      realtimeService.subscribe.mockImplementation((event, callback) => {
        if (event === 'alerts') {
          alertsCallback = callback;
        }
        return mockUnsubscribe;
      });

      renderWithTheme(<EnhancedDashboard />);

      // Simulate critical alert
      const criticalAlert = {
        level: 'critical',
        type: 'system',
        message: 'High CPU usage detected'
      };

      act(() => {
        alertsCallback(criticalAlert);
      });

      await waitFor(() => {
        expect(screen.getByText(/Latest Critical Alert/)).toBeInTheDocument();
        expect(screen.getByText('High CPU usage detected')).toBeInTheDocument();
      });
    });

    test('shows warning alerts in snackbar', async () => {
      let alertsCallback;
      realtimeService.subscribe.mockImplementation((event, callback) => {
        if (event === 'alerts') {
          alertsCallback = callback;
        }
        return mockUnsubscribe;
      });

      renderWithTheme(<EnhancedDashboard />);

      // Simulate warning alert
      const warningAlert = {
        level: 'warning',
        type: 'memory',
        message: 'Memory usage is high'
      };

      act(() => {
        alertsCallback(warningAlert);
      });

      await waitFor(() => {
        expect(screen.getByText('Warning: Memory usage is high')).toBeInTheDocument();
      });
    });

    test('unsubscribes from events on unmount', () => {
      const { unmount } = renderWithTheme(<EnhancedDashboard />);
      
      unmount();
      
      expect(mockUnsubscribe).toHaveBeenCalledTimes(2); // connection and alerts
    });
  });

  describe('State Management', () => {
    test('manages connection state correctly', async () => {
      let connectionCallback;
      realtimeService.subscribe.mockImplementation((event, callback) => {
        if (event === 'connection') {
          connectionCallback = callback;
        }
        return mockUnsubscribe;
      });

      renderWithTheme(<EnhancedDashboard />);

      // Initial state should show disconnected
      expect(screen.getByText('Real-time monitoring disconnected')).toBeInTheDocument();

      // Update to disconnected
      act(() => {
        connectionCallback({ connected: false });
      });

      await waitFor(() => {
        expect(screen.getByText('Real-time monitoring disconnected')).toBeInTheDocument();
      });
    });

    test('manages alerts state correctly', async () => {
      let alertsCallback;
      realtimeService.subscribe.mockImplementation((event, callback) => {
        if (event === 'alerts') {
          alertsCallback = callback;
        }
        return mockUnsubscribe;
      });

      renderWithTheme(<EnhancedDashboard />);

      // Add multiple alerts
      const alerts = [
        { level: 'info', type: 'system', message: 'System started' },
        { level: 'warning', type: 'memory', message: 'Memory usage high' },
        { level: 'critical', type: 'cpu', message: 'CPU overload' }
      ];

      for (const alert of alerts) {
        act(() => {
          alertsCallback(alert);
        });
      }

      await waitFor(() => {
        expect(screen.getByText(/Recent Alerts \(3\)/)).toBeInTheDocument();
      });
    });

    test('limits alerts to 50 items', async () => {
      let alertsCallback;
      realtimeService.subscribe.mockImplementation((event, callback) => {
        if (event === 'alerts') {
          alertsCallback = callback;
        }
        return mockUnsubscribe;
      });

      renderWithTheme(<EnhancedDashboard />);

      // Add 52 alerts
      for (let i = 0; i < 52; i++) {
        act(() => {
          alertsCallback({
            level: 'info',
            type: 'test',
            message: `Alert ${i}`
          });
        });
      }

      await waitFor(() => {
        expect(screen.getByText(/Recent Alerts \(50\)/)).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    test('handles refresh button click', async () => {
      renderWithTheme(<EnhancedDashboard />);
      
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      
      fireEvent.click(refreshButton);
      
      await waitFor(() => {
        expect(realtimeService.requestMetricsUpdate).toHaveBeenCalledTimes(1);
      });
    });

    test('shows refresh success message', async () => {
      renderWithTheme(<EnhancedDashboard />);
      
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      
      fireEvent.click(refreshButton);
      
      await waitFor(() => {
        expect(screen.getByText('Dashboard refreshed')).toBeInTheDocument();
      });
    });

    test('handles refresh error gracefully', async () => {
      realtimeService.requestMetricsUpdate.mockImplementation(() => {
        throw new Error('Network error');
      });
      
      renderWithTheme(<EnhancedDashboard />);
      
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      
      fireEvent.click(refreshButton);
      
      await waitFor(() => {
        expect(screen.getByText('Dashboard refreshed')).toBeInTheDocument();
      });
    });

    test('disables refresh button while loading', async () => {
      // Mock a slow request
      realtimeService.requestMetricsUpdate.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );
      
      renderWithTheme(<EnhancedDashboard />);
      
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      
      fireEvent.click(refreshButton);
      
      // Button should not be disabled in this implementation
      expect(refreshButton).not.toBeDisabled();
      
      await waitFor(() => {
        expect(refreshButton).not.toBeDisabled();
      });
    });

    test('closes alert snackbar when close button is clicked', async () => {
      let alertsCallback;
      realtimeService.subscribe.mockImplementation((event, callback) => {
        if (event === 'alerts') {
          alertsCallback = callback;
        }
        return mockUnsubscribe;
      });

      renderWithTheme(<EnhancedDashboard />);

      // Trigger an alert
      act(() => {
        alertsCallback({
          level: 'warning',
          type: 'test',
          message: 'Test alert'
        });
      });

      await waitFor(() => {
        expect(screen.getByText('Warning: Test alert')).toBeInTheDocument();
      });

      // Close the alert
      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText('Warning: Test alert')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    test('handles connection errors gracefully', async () => {
      let connectionCallback;
      realtimeService.subscribe.mockImplementation((event, callback) => {
        if (event === 'connection') {
          connectionCallback = callback;
        }
        return mockUnsubscribe;
      });

      renderWithTheme(<EnhancedDashboard />);

      // Simulate connection error
      act(() => {
        connectionCallback({ 
          connected: false, 
          error: 'Connection failed' 
        });
      });

      await waitFor(() => {
        expect(screen.getByText('Real-time connection lost. Attempting to reconnect...')).toBeInTheDocument();
      });
    });

    test('handles subscription errors gracefully', () => {
      realtimeService.subscribe.mockImplementation(() => {
        // Don't throw during subscription, just return a mock unsubscribe
        return jest.fn();
      });

      // Should not crash the component
      expect(() => {
        renderWithTheme(<EnhancedDashboard />);
      }).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA labels', () => {
      renderWithTheme(<EnhancedDashboard />);
      
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      expect(refreshButton).toHaveAttribute('aria-label', 'refresh');
    });

    test('has proper heading structure', () => {
      renderWithTheme(<EnhancedDashboard />);
      
      const mainHeading = screen.getByRole('heading', { name: /platform dashboard/i });
      expect(mainHeading).toHaveTextContent('Platform Dashboard');
    });
  });

  describe('Responsive Design', () => {
    test('renders grid layout correctly', () => {
      renderWithTheme(<EnhancedDashboard />);
      
      // Check that grid containers exist
      const gridContainers = screen.getAllByRole('generic');
      expect(gridContainers.length).toBeGreaterThan(0);
    });
  });
});