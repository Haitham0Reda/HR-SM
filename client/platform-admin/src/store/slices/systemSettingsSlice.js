import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import platformApi from '../../services/platformApi';

// Initial state
const initialState = {
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
};

// Async thunks
export const fetchSystemSettingsAsync = createAsyncThunk(
  'systemSettings/fetchSettings',
  async (_, { rejectWithValue }) => {
    try {
      const response = await platformApi.get('/system/settings');
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch system settings:', error);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch system settings');
    }
  }
);

export const updateSystemSettingsAsync = createAsyncThunk(
  'systemSettings/updateSettings',
  async (settingsData, { rejectWithValue }) => {
    try {
      const response = await platformApi.put('/system/settings', settingsData);
      return response.data.data;
    } catch (error) {
      console.error('Failed to update system settings:', error);
      return rejectWithValue(error.response?.data?.message || 'Failed to update system settings');
    }
  }
);

export const fetchSystemHealthAsync = createAsyncThunk(
  'systemSettings/fetchHealth',
  async (_, { rejectWithValue }) => {
    try {
      const response = await platformApi.get('/system/health');
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch system health:', error);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch system health');
    }
  }
);

export const fetchSystemStatsAsync = createAsyncThunk(
  'systemSettings/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await platformApi.get('/system/stats');
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch system stats:', error);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch system stats');
    }
  }
);

export const updateNotificationSettingsAsync = createAsyncThunk(
  'systemSettings/updateNotifications',
  async (notificationSettings, { rejectWithValue }) => {
    try {
      const response = await platformApi.put('/system/notifications', notificationSettings);
      return response.data.data;
    } catch (error) {
      console.error('Failed to update notification settings:', error);
      return rejectWithValue(error.response?.data?.message || 'Failed to update notification settings');
    }
  }
);

export const enableMaintenanceModeAsync = createAsyncThunk(
  'systemSettings/enableMaintenance',
  async ({ message, scheduledAt }, { rejectWithValue }) => {
    try {
      const response = await platformApi.post('/system/maintenance/enable', {
        message,
        scheduledAt,
      });
      return response.data.data;
    } catch (error) {
      console.error('Failed to enable maintenance mode:', error);
      return rejectWithValue(error.response?.data?.message || 'Failed to enable maintenance mode');
    }
  }
);

export const disableMaintenanceModeAsync = createAsyncThunk(
  'systemSettings/disableMaintenance',
  async (_, { rejectWithValue }) => {
    try {
      const response = await platformApi.post('/system/maintenance/disable');
      return response.data.data;
    } catch (error) {
      console.error('Failed to disable maintenance mode:', error);
      return rejectWithValue(error.response?.data?.message || 'Failed to disable maintenance mode');
    }
  }
);

export const restartSystemServiceAsync = createAsyncThunk(
  'systemSettings/restartService',
  async (serviceName, { rejectWithValue }) => {
    try {
      const response = await platformApi.post(`/system/services/${serviceName}/restart`);
      return { serviceName, result: response.data.data };
    } catch (error) {
      console.error('Failed to restart service:', error);
      return rejectWithValue(error.response?.data?.message || 'Failed to restart service');
    }
  }
);

export const backupSystemAsync = createAsyncThunk(
  'systemSettings/backup',
  async (backupOptions, { rejectWithValue }) => {
    try {
      const response = await platformApi.post('/system/backup', backupOptions);
      return response.data.data;
    } catch (error) {
      console.error('Failed to create system backup:', error);
      return rejectWithValue(error.response?.data?.message || 'Failed to create system backup');
    }
  }
);

// Slice
const systemSettingsSlice = createSlice({
  name: 'systemSettings',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    updateLocalSettings: (state, action) => {
      state.settings = { ...state.settings, ...action.payload };
    },
    updateLocalNotifications: (state, action) => {
      state.notifications = { ...state.notifications, ...action.payload };
    },
    updateLocalMaintenance: (state, action) => {
      state.maintenance = { ...state.maintenance, ...action.payload };
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch System Settings
      .addCase(fetchSystemSettingsAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSystemSettingsAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.settings = action.payload.settings || {};
        state.notifications = action.payload.notifications || state.notifications;
        state.maintenance = action.payload.maintenance || state.maintenance;
        state.error = null;
        state.lastSuccessfulOperation = new Date().toISOString();
      })
      .addCase(fetchSystemSettingsAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = {
          message: action.payload,
          code: 'FETCH_SETTINGS_FAILED',
          timestamp: new Date().toISOString(),
          retryable: true,
        };
      })
      // Update System Settings
      .addCase(updateSystemSettingsAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateSystemSettingsAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.settings = { ...state.settings, ...action.payload };
        state.error = null;
        state.lastSuccessfulOperation = new Date().toISOString();
      })
      .addCase(updateSystemSettingsAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = {
          message: action.payload,
          code: 'UPDATE_SETTINGS_FAILED',
          timestamp: new Date().toISOString(),
          retryable: true,
        };
      })
      // Fetch System Health
      .addCase(fetchSystemHealthAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSystemHealthAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.systemHealth = {
          ...action.payload,
          lastCheck: new Date().toISOString(),
        };
        state.error = null;
        state.lastSuccessfulOperation = new Date().toISOString();
      })
      .addCase(fetchSystemHealthAsync.rejected, (state, action) => {
        state.loading = false;
        state.systemHealth.status = 'error';
        state.error = {
          message: action.payload,
          code: 'FETCH_HEALTH_FAILED',
          timestamp: new Date().toISOString(),
          retryable: true,
        };
      })
      // Fetch System Stats
      .addCase(fetchSystemStatsAsync.fulfilled, (state, action) => {
        state.systemStats = action.payload;
        state.lastSuccessfulOperation = new Date().toISOString();
      })
      // Update Notification Settings
      .addCase(updateNotificationSettingsAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateNotificationSettingsAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.notifications = action.payload;
        state.error = null;
        state.lastSuccessfulOperation = new Date().toISOString();
      })
      .addCase(updateNotificationSettingsAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = {
          message: action.payload,
          code: 'UPDATE_NOTIFICATIONS_FAILED',
          timestamp: new Date().toISOString(),
          retryable: true,
        };
      })
      // Enable Maintenance Mode
      .addCase(enableMaintenanceModeAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(enableMaintenanceModeAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.maintenance = action.payload;
        state.error = null;
        state.lastSuccessfulOperation = new Date().toISOString();
      })
      .addCase(enableMaintenanceModeAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = {
          message: action.payload,
          code: 'ENABLE_MAINTENANCE_FAILED',
          timestamp: new Date().toISOString(),
          retryable: true,
        };
      })
      // Disable Maintenance Mode
      .addCase(disableMaintenanceModeAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(disableMaintenanceModeAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.maintenance = action.payload;
        state.error = null;
        state.lastSuccessfulOperation = new Date().toISOString();
      })
      .addCase(disableMaintenanceModeAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = {
          message: action.payload,
          code: 'DISABLE_MAINTENANCE_FAILED',
          timestamp: new Date().toISOString(),
          retryable: true,
        };
      })
      // Restart Service
      .addCase(restartSystemServiceAsync.fulfilled, (state, action) => {
        const { serviceName, result } = action.payload;
        if (state.systemHealth.services) {
          state.systemHealth.services[serviceName] = result;
        }
        state.lastSuccessfulOperation = new Date().toISOString();
      })
      // Backup System
      .addCase(backupSystemAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(backupSystemAsync.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
        state.lastSuccessfulOperation = new Date().toISOString();
      })
      .addCase(backupSystemAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = {
          message: action.payload,
          code: 'BACKUP_FAILED',
          timestamp: new Date().toISOString(),
          retryable: true,
        };
      });
  },
});

export const { 
  clearError, 
  updateLocalSettings, 
  updateLocalNotifications, 
  updateLocalMaintenance 
} = systemSettingsSlice.actions;
export default systemSettingsSlice.reducer;