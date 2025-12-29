import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { licenseService } from '../../services/licenseApi';

// Initial state
const initialState = {
  licenses: [],
  currentLicense: null,
  loading: false,
  error: null,
  lastSuccessfulOperation: null,
  analytics: {
    totalLicenses: 0,
    activeLicenses: 0,
    expiredLicenses: 0,
    revokedLicenses: 0,
    expiringLicenses: [],
    usageStats: null,
  },
  auditTrail: [],
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  },
  filters: {
    search: '',
    status: 'all',
    type: 'all',
    expiryRange: 'all',
  },
};

// Async thunks
export const fetchLicensesAsync = createAsyncThunk(
  'licenseManagement/fetchLicenses',
  async ({ page = 1, limit = 10, search = '', status = 'all', type = 'all' } = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (search) params.append('search', search);
      if (status !== 'all') params.append('status', status);
      if (type !== 'all') params.append('type', type);

      const response = await licenseService.getLicenses(params.toString());
      return response.data;
    } catch (error) {
      console.error('Failed to fetch licenses:', error);
      return rejectWithValue(error.message || 'Failed to fetch licenses');
    }
  }
);

export const fetchLicenseByIdAsync = createAsyncThunk(
  'licenseManagement/fetchLicenseById',
  async (licenseNumber, { rejectWithValue }) => {
    try {
      const response = await licenseService.getLicense(licenseNumber);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch license:', error);
      return rejectWithValue(error.message || 'Failed to fetch license');
    }
  }
);

export const fetchTenantLicenseAsync = createAsyncThunk(
  'licenseManagement/fetchTenantLicense',
  async (tenantId, { rejectWithValue }) => {
    try {
      const response = await licenseService.getTenantLicense(tenantId);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch tenant license:', error);
      return rejectWithValue(error.message || 'Failed to fetch tenant license');
    }
  }
);

export const createLicenseAsync = createAsyncThunk(
  'licenseManagement/createLicense',
  async (licenseData, { rejectWithValue }) => {
    try {
      const response = await licenseService.createLicense(licenseData);
      return response.data;
    } catch (error) {
      console.error('Failed to create license:', error);
      return rejectWithValue(error.message || 'Failed to create license');
    }
  }
);

export const renewLicenseAsync = createAsyncThunk(
  'licenseManagement/renewLicense',
  async ({ licenseNumber, renewalData }, { rejectWithValue }) => {
    try {
      const response = await licenseService.renewLicense(licenseNumber, renewalData);
      return response.data;
    } catch (error) {
      console.error('Failed to renew license:', error);
      return rejectWithValue(error.message || 'Failed to renew license');
    }
  }
);

export const revokeLicenseAsync = createAsyncThunk(
  'licenseManagement/revokeLicense',
  async ({ licenseNumber, reason }, { rejectWithValue }) => {
    try {
      const response = await licenseService.revokeLicense(licenseNumber, reason);
      return { licenseNumber, ...response.data };
    } catch (error) {
      console.error('Failed to revoke license:', error);
      return rejectWithValue(error.message || 'Failed to revoke license');
    }
  }
);

export const validateLicenseAsync = createAsyncThunk(
  'licenseManagement/validateLicense',
  async ({ token, machineId }, { rejectWithValue }) => {
    try {
      const response = await licenseService.validateLicense(token, machineId);
      return response.data;
    } catch (error) {
      console.error('Failed to validate license:', error);
      return rejectWithValue(error.message || 'Failed to validate license');
    }
  }
);

export const fetchLicenseAnalyticsAsync = createAsyncThunk(
  'licenseManagement/fetchLicenseAnalytics',
  async (_, { rejectWithValue }) => {
    try {
      const response = await licenseService.getLicenseAnalytics();
      return response.data;
    } catch (error) {
      console.error('Failed to fetch license analytics:', error);
      return rejectWithValue(error.message || 'Failed to fetch license analytics');
    }
  }
);

export const fetchExpiringLicensesAsync = createAsyncThunk(
  'licenseManagement/fetchExpiringLicenses',
  async (days = 30, { rejectWithValue }) => {
    try {
      const response = await licenseService.getExpiringLicenses(days);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch expiring licenses:', error);
      return rejectWithValue(error.message || 'Failed to fetch expiring licenses');
    }
  }
);

export const fetchLicenseUsageAnalyticsAsync = createAsyncThunk(
  'licenseManagement/fetchLicenseUsageAnalytics',
  async (dateRange, { rejectWithValue }) => {
    try {
      const response = await licenseService.getLicenseUsageAnalytics(dateRange);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch license usage analytics:', error);
      return rejectWithValue(error.message || 'Failed to fetch license usage analytics');
    }
  }
);

export const fetchLicenseAuditTrailAsync = createAsyncThunk(
  'licenseManagement/fetchLicenseAuditTrail',
  async ({ licenseNumber, page = 1, limit = 20 }, { rejectWithValue }) => {
    try {
      const response = await licenseService.getLicenseAuditTrail(licenseNumber, { page, limit });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch license audit trail:', error);
      return rejectWithValue(error.message || 'Failed to fetch license audit trail');
    }
  }
);

// Slice
const licenseManagementSlice = createSlice({
  name: 'licenseManagement',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentLicense: (state, action) => {
      state.currentLicense = action.payload;
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearCurrentLicense: (state) => {
      state.currentLicense = null;
    },
    clearAuditTrail: (state) => {
      state.auditTrail = [];
    },
    resetAnalytics: (state) => {
      state.analytics = initialState.analytics;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Licenses
      .addCase(fetchLicensesAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLicensesAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.licenses = action.payload.licenses || [];
        state.pagination = {
          page: action.payload.page || 1,
          limit: action.payload.limit || 10,
          total: action.payload.total || 0,
          totalPages: action.payload.totalPages || 0,
        };
        state.error = null;
        state.lastSuccessfulOperation = new Date().toISOString();
      })
      .addCase(fetchLicensesAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = {
          message: action.payload,
          code: 'FETCH_LICENSES_FAILED',
          timestamp: new Date().toISOString(),
          retryable: true,
        };
      })
      // Fetch License by ID
      .addCase(fetchLicenseByIdAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLicenseByIdAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.currentLicense = action.payload;
        state.error = null;
        state.lastSuccessfulOperation = new Date().toISOString();
      })
      .addCase(fetchLicenseByIdAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = {
          message: action.payload,
          code: 'FETCH_LICENSE_FAILED',
          timestamp: new Date().toISOString(),
          retryable: true,
        };
      })
      // Fetch Tenant License
      .addCase(fetchTenantLicenseAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTenantLicenseAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.currentLicense = action.payload;
        state.error = null;
        state.lastSuccessfulOperation = new Date().toISOString();
      })
      .addCase(fetchTenantLicenseAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = {
          message: action.payload,
          code: 'FETCH_TENANT_LICENSE_FAILED',
          timestamp: new Date().toISOString(),
          retryable: true,
        };
      })
      // Create License
      .addCase(createLicenseAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createLicenseAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.licenses.unshift(action.payload);
        state.error = null;
        state.lastSuccessfulOperation = new Date().toISOString();
      })
      .addCase(createLicenseAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = {
          message: action.payload,
          code: 'CREATE_LICENSE_FAILED',
          timestamp: new Date().toISOString(),
          retryable: true,
        };
      })
      // Renew License
      .addCase(renewLicenseAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(renewLicenseAsync.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.licenses.findIndex(license => license.licenseNumber === action.payload.licenseNumber);
        if (index !== -1) {
          state.licenses[index] = action.payload;
        }
        if (state.currentLicense && state.currentLicense.licenseNumber === action.payload.licenseNumber) {
          state.currentLicense = action.payload;
        }
        state.error = null;
        state.lastSuccessfulOperation = new Date().toISOString();
      })
      .addCase(renewLicenseAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = {
          message: action.payload,
          code: 'RENEW_LICENSE_FAILED',
          timestamp: new Date().toISOString(),
          retryable: true,
        };
      })
      // Revoke License
      .addCase(revokeLicenseAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(revokeLicenseAsync.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.licenses.findIndex(license => license.licenseNumber === action.payload.licenseNumber);
        if (index !== -1) {
          state.licenses[index] = { ...state.licenses[index], status: 'revoked' };
        }
        if (state.currentLicense && state.currentLicense.licenseNumber === action.payload.licenseNumber) {
          state.currentLicense = { ...state.currentLicense, status: 'revoked' };
        }
        state.error = null;
        state.lastSuccessfulOperation = new Date().toISOString();
      })
      .addCase(revokeLicenseAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = {
          message: action.payload,
          code: 'REVOKE_LICENSE_FAILED',
          timestamp: new Date().toISOString(),
          retryable: true,
        };
      })
      // Validate License
      .addCase(validateLicenseAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(validateLicenseAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        state.lastSuccessfulOperation = new Date().toISOString();
      })
      .addCase(validateLicenseAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = {
          message: action.payload,
          code: 'VALIDATE_LICENSE_FAILED',
          timestamp: new Date().toISOString(),
          retryable: true,
        };
      })
      // Fetch License Analytics
      .addCase(fetchLicenseAnalyticsAsync.fulfilled, (state, action) => {
        state.analytics = { ...state.analytics, ...action.payload };
        state.lastSuccessfulOperation = new Date().toISOString();
      })
      // Fetch Expiring Licenses
      .addCase(fetchExpiringLicensesAsync.fulfilled, (state, action) => {
        state.analytics.expiringLicenses = action.payload.licenses || [];
        state.lastSuccessfulOperation = new Date().toISOString();
      })
      // Fetch License Usage Analytics
      .addCase(fetchLicenseUsageAnalyticsAsync.fulfilled, (state, action) => {
        state.analytics.usageStats = action.payload;
        state.lastSuccessfulOperation = new Date().toISOString();
      })
      // Fetch License Audit Trail
      .addCase(fetchLicenseAuditTrailAsync.fulfilled, (state, action) => {
        state.auditTrail = action.payload.auditEntries || [];
        state.lastSuccessfulOperation = new Date().toISOString();
      });
  },
});

export const { 
  clearError, 
  setCurrentLicense, 
  setFilters, 
  clearCurrentLicense, 
  clearAuditTrail, 
  resetAnalytics 
} = licenseManagementSlice.actions;

export default licenseManagementSlice.reducer;