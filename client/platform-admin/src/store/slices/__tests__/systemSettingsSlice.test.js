import { configureStore } from '@reduxjs/toolkit';
import systemSettingsSlice, {
  fetchSystemSettingsAsync,
  updateSystemSettingsAsync,
  fetchSystemHealthAsync,
  fetchSystemStatsAsync,
  updateNotificationSettingsAsync,
  enableMaintenanceModeAsync,
  disableMaintenanceModeAsync,
  restartSystemServiceAsync,
  backupSystemAsync,
  clearError,
  updateLocalSettings,
  updateLocalNotifications,
  updateLocalMaintenance,
} from '../systemSettingsSlice';

// Mock the platformApi
jest.mock('../../../services/platformApi', () => ({
  get: jest.fn(),
  put: jest.fn(),
  post: jest.fn(),
}));

import platformApi from '../../../services/platformApi';

describe('systemSettingsSlice', () => {
  let store;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        systemSettings: systemSettingsSlice,
      },
    });
    
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = store.getState().systemSettings;
      expect(state).toEqual({
        settings: {},
        systemHealth: {
          status: 'unknown',
          services: {},
          lastCheck: null,
        },
        systemStats: {
          totalTenants: 0,
          totalUsers: 0,
          totalRevenue: 0,
          systemUptime: 0,
        },
        notifications: {
          enabled: true,
          emailNotifications: true,
          smsNotifications: false,
          webhookUrl: '',
        },
        maintenance: {
          mode: false,
          message: '',
          scheduledAt: null,
        },
        loading: false,
        error: null,
        lastSuccessfulOperation: null,
      });
    });
  });

  describe('reducers', () => {
    it('should handle clearError', () => {
      // Set an error first
      store.dispatch({
        type: 'systemSettings/fetchSystemSettingsAsync/rejected',
        payload: 'Test error',
      });
      
      store.dispatch(clearError());
      
      const state = store.getState().systemSettings;
      expect(state.error).toBeNull();
    });

    it('should handle updateLocalSettings', () => {
      const newSettings = { theme: 'dark', language: 'en' };
      
      store.dispatch(updateLocalSettings(newSettings));
      
      const state = store.getState().systemSettings;
      expect(state.settings).toEqual(newSettings);
    });

    it('should handle updateLocalNotifications', () => {
      const newNotifications = { emailNotifications: false, smsNotifications: true };
      
      store.dispatch(updateLocalNotifications(newNotifications));
      
      const state = store.getState().systemSettings;
      expect(state.notifications).toEqual({
        enabled: true,
        emailNotifications: false,
        smsNotifications: true,
        webhookUrl: '',
      });
    });

    it('should handle updateLocalMaintenance', () => {
      const newMaintenance = { mode: true, message: 'System maintenance' };
      
      store.dispatch(updateLocalMaintenance(newMaintenance));
      
      const state = store.getState().systemSettings;
      expect(state.maintenance).toEqual({
        mode: true,
        message: 'System maintenance',
        scheduledAt: null,
      });
    });
  });

  describe('fetchSystemSettingsAsync', () => {
    it('should handle successful fetch', async () => {
      const mockSettings = {
        settings: { theme: 'light', language: 'en' },
        notifications: { enabled: true, emailNotifications: true },
        maintenance: { mode: false, message: '' },
      };
      
      platformApi.get.mockResolvedValueOnce({
        data: { data: mockSettings },
      });

      await store.dispatch(fetchSystemSettingsAsync());

      const state = store.getState().systemSettings;
      expect(state.loading).toBe(false);
      expect(state.settings).toEqual(mockSettings.settings);
      expect(state.notifications).toEqual(mockSettings.notifications);
      expect(state.maintenance).toEqual(mockSettings.maintenance);
      expect(state.error).toBeNull();
    });

    it('should handle fetch failure', async () => {
      const errorMessage = 'Failed to fetch system settings';
      
      platformApi.get.mockRejectedValueOnce({
        response: {
          data: { message: errorMessage },
        },
      });

      await store.dispatch(fetchSystemSettingsAsync());

      const state = store.getState().systemSettings;
      expect(state.loading).toBe(false);
      expect(state.error).toEqual({
        message: errorMessage,
        code: 'FETCH_SETTINGS_FAILED',
        timestamp: expect.any(String),
        retryable: true,
      });
    });
  });

  describe('updateSystemSettingsAsync', () => {
    it('should handle successful update', async () => {
      const settingsData = { theme: 'dark', language: 'es' };
      
      platformApi.put.mockResolvedValueOnce({
        data: { data: settingsData },
      });

      await store.dispatch(updateSystemSettingsAsync(settingsData));

      const state = store.getState().systemSettings;
      expect(state.loading).toBe(false);
      expect(state.settings).toEqual(expect.objectContaining(settingsData));
      expect(state.error).toBeNull();
    });
  });

  describe('fetchSystemHealthAsync', () => {
    it('should handle successful health check', async () => {
      const mockHealth = {
        status: 'healthy',
        services: {
          database: 'online',
          redis: 'online',
          licenseServer: 'online',
        },
      };
      
      platformApi.get.mockResolvedValueOnce({
        data: { data: mockHealth },
      });

      await store.dispatch(fetchSystemHealthAsync());

      const state = store.getState().systemSettings;
      expect(state.loading).toBe(false);
      expect(state.systemHealth.status).toBe('healthy');
      expect(state.systemHealth.services).toEqual(mockHealth.services);
      expect(state.systemHealth.lastCheck).toBeTruthy();
      expect(state.error).toBeNull();
    });

    it('should handle health check failure', async () => {
      const errorMessage = 'Health check failed';
      
      platformApi.get.mockRejectedValueOnce({
        response: {
          data: { message: errorMessage },
        },
      });

      await store.dispatch(fetchSystemHealthAsync());

      const state = store.getState().systemSettings;
      expect(state.loading).toBe(false);
      expect(state.systemHealth.status).toBe('error');
      expect(state.error).toEqual({
        message: errorMessage,
        code: 'FETCH_HEALTH_FAILED',
        timestamp: expect.any(String),
        retryable: true,
      });
    });
  });

  describe('fetchSystemStatsAsync', () => {
    it('should handle successful stats fetch', async () => {
      const mockStats = {
        totalTenants: 150,
        totalUsers: 5000,
        totalRevenue: 250000,
        systemUptime: 99.9,
      };
      
      platformApi.get.mockResolvedValueOnce({
        data: { data: mockStats },
      });

      await store.dispatch(fetchSystemStatsAsync());

      const state = store.getState().systemSettings;
      expect(state.systemStats).toEqual(mockStats);
    });
  });

  describe('updateNotificationSettingsAsync', () => {
    it('should handle successful notification update', async () => {
      const notificationSettings = {
        enabled: true,
        emailNotifications: false,
        smsNotifications: true,
        webhookUrl: 'https://example.com/webhook',
      };
      
      platformApi.put.mockResolvedValueOnce({
        data: { data: notificationSettings },
      });

      await store.dispatch(updateNotificationSettingsAsync(notificationSettings));

      const state = store.getState().systemSettings;
      expect(state.loading).toBe(false);
      expect(state.notifications).toEqual(notificationSettings);
      expect(state.error).toBeNull();
    });
  });

  describe('enableMaintenanceModeAsync', () => {
    it('should handle successful maintenance mode enable', async () => {
      const maintenanceData = {
        mode: true,
        message: 'System maintenance in progress',
        scheduledAt: '2024-01-01T00:00:00Z',
      };
      
      platformApi.post.mockResolvedValueOnce({
        data: { data: maintenanceData },
      });

      await store.dispatch(enableMaintenanceModeAsync({
        message: 'System maintenance in progress',
        scheduledAt: '2024-01-01T00:00:00Z',
      }));

      const state = store.getState().systemSettings;
      expect(state.loading).toBe(false);
      expect(state.maintenance).toEqual(maintenanceData);
      expect(state.error).toBeNull();
    });
  });

  describe('disableMaintenanceModeAsync', () => {
    it('should handle successful maintenance mode disable', async () => {
      const maintenanceData = {
        mode: false,
        message: '',
        scheduledAt: null,
      };
      
      platformApi.post.mockResolvedValueOnce({
        data: { data: maintenanceData },
      });

      await store.dispatch(disableMaintenanceModeAsync());

      const state = store.getState().systemSettings;
      expect(state.loading).toBe(false);
      expect(state.maintenance).toEqual(maintenanceData);
      expect(state.error).toBeNull();
    });
  });

  describe('restartSystemServiceAsync', () => {
    it('should handle successful service restart', async () => {
      const serviceName = 'database';
      const result = { status: 'restarted', timestamp: '2024-01-01T00:00:00Z' };
      
      platformApi.post.mockResolvedValueOnce({
        data: { data: result },
      });

      await store.dispatch(restartSystemServiceAsync(serviceName));

      const state = store.getState().systemSettings;
      expect(state.systemHealth.services[serviceName]).toEqual(result);
    });
  });

  describe('backupSystemAsync', () => {
    it('should handle successful backup', async () => {
      const backupOptions = { includeUploads: true, compress: true };
      
      platformApi.post.mockResolvedValueOnce({
        data: { data: { backupId: 'backup-123', status: 'completed' } },
      });

      await store.dispatch(backupSystemAsync(backupOptions));

      const state = store.getState().systemSettings;
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should handle backup failure', async () => {
      const errorMessage = 'Backup failed';
      
      platformApi.post.mockRejectedValueOnce({
        response: {
          data: { message: errorMessage },
        },
      });

      await store.dispatch(backupSystemAsync({}));

      const state = store.getState().systemSettings;
      expect(state.loading).toBe(false);
      expect(state.error).toEqual({
        message: errorMessage,
        code: 'BACKUP_FAILED',
        timestamp: expect.any(String),
        retryable: true,
      });
    });
  });
});