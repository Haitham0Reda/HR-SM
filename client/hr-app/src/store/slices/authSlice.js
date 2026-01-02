import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// Role hierarchy for permission checks
const ROLE_HIERARCHY = {
  'admin': 4,
  'hr': 3,
  'manager': 2,
  'employee': 1
};

// Initial state
const initialState = {
  user: null,
  tenantToken: localStorage.getItem('tenant_token'),
  tenantId: localStorage.getItem('tenant_id'),
  loading: false,
  error: null,
  isAuthenticated: false,
};

// Async thunks
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async ({ email, password, tenantId }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/login', {
        email,
        password,
        tenantId
      });

      // The auth controller returns { success: true, data: { token, user } }
      // API interceptor already extracts response.data, so response is the actual data
      const { user, token } = response.data;

      // Store tokens in localStorage
      localStorage.setItem('tenant_token', token);
      localStorage.setItem('tenant_id', user?.tenantId || tenantId);
      
      // Remove old token if exists
      localStorage.removeItem('token');

      return {
        user,
        tenantToken: token,
        tenantId: user?.tenantId || tenantId
      };
    } catch (error) {
      return rejectWithValue(error.message || error.data?.message || 'Login failed');
    }
  }
);

export const loadUserProfile = createAsyncThunk(
  'auth/loadUserProfile',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      
      if (!auth.tenantToken || !auth.tenantId) {
        throw new Error('No authentication tokens available');
      }

      const userResponse = await api.get('/auth/me');
      // The auth controller returns { success: true, data: user }
      // API interceptor already extracts response.data, so userResponse is the actual response
      const userData = userResponse.data;
      
      return userData;
    } catch (error) {
      console.error('Failed to load user profile:', error);
      
      // Clear auth state for authentication errors
      if (error.status === 401 || error.status === 404 || error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        localStorage.removeItem('tenant_token');
        localStorage.removeItem('tenant_id');
        localStorage.removeItem('token');
      }
      
      return rejectWithValue(error.message || 'Failed to load user profile');
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (_, { rejectWithValue }) => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear local storage
      localStorage.removeItem('tenant_token');
      localStorage.removeItem('tenant_id');
      localStorage.removeItem('token');
    }
    return null;
  }
);

// Auth slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    updateUser: (state, action) => {
      state.user = action.payload;
    },
    clearAuthState: (state) => {
      state.user = null;
      state.tenantToken = null;
      state.tenantId = null;
      state.isAuthenticated = false;
      state.error = null;
      localStorage.removeItem('tenant_token');
      localStorage.removeItem('tenant_id');
      localStorage.removeItem('token');
    },
    setTokensFromStorage: (state) => {
      const token = localStorage.getItem('tenant_token');
      const tenantId = localStorage.getItem('tenant_id');
      state.tenantToken = token;
      state.tenantId = tenantId;
    }
  },
  extraReducers: (builder) => {
    builder
      // Login cases
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.tenantToken = action.payload.tenantToken;
        state.tenantId = action.payload.tenantId;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
      })
      // Load user profile cases
      .addCase(loadUserProfile.pending, (state) => {
        state.loading = true;
      })
      .addCase(loadUserProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(loadUserProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        // Clear auth state for auth errors
        if (action.payload && (action.payload.includes('401') || action.payload.includes('404') || action.payload === 'Unauthorized')) {
          state.user = null;
          state.tenantToken = null;
          state.tenantId = null;
          state.isAuthenticated = false;
        }
      })
      // Logout cases
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.tenantToken = null;
        state.tenantId = null;
        state.isAuthenticated = false;
        state.loading = false;
        state.error = null;
      });
  },
});

// Selectors
export const selectAuth = (state) => state.auth;
export const selectUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectAuthLoading = (state) => state.auth.loading;
export const selectAuthError = (state) => state.auth.error;
export const selectTenantToken = (state) => state.auth.tenantToken;
export const selectTenantId = (state) => state.auth.tenantId;

// Role-based selectors
export const selectIsAdmin = (state) => state.auth.user?.role === 'admin';
export const selectIsHR = (state) => state.auth.user?.role === 'hr';
export const selectIsManager = (state) => state.auth.user?.role === 'manager';
export const selectIsEmployee = (state) => state.auth.user?.role === 'employee';

// Permission selector
export const selectHasRole = (requiredRole) => (state) => {
  const user = state.auth.user;
  if (!user) return false;
  
  const userRoleLevel = ROLE_HIERARCHY[user.role] || 0;
  const requiredRoleLevel = ROLE_HIERARCHY[requiredRole] || 0;
  
  return userRoleLevel >= requiredRoleLevel;
};

// Export actions
export const { clearError, updateUser, clearAuthState, setTokensFromStorage } = authSlice.actions;

export default authSlice.reducer;