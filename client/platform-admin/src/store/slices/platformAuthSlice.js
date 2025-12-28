import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import platformApi from '../../services/platformApi';
import SecureLS from 'secure-ls';

// Secure local storage for platform tokens
const ls = new SecureLS({ encodingType: 'aes' });

// Initial state
const initialState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  lastSuccessfulOperation: null,
};

// Async thunks
export const loginAsync = createAsyncThunk(
  'platformAuth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      console.log('Attempting login with:', email);
      const response = await platformApi.post('/auth/login', {
        email,
        password,
      });

      console.log('Login response:', response.data);
      const { token, user } = response.data.data;

      // Store token securely
      ls.set('platformToken', token);

      // Set token in API client
      platformApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      console.log('Login successful for user:', user.email);
      return { token, user };
    } catch (error) {
      console.error('Login failed:', error);
      
      let errorMessage = 'Login failed';
      if (error.response?.status === 429) {
        errorMessage = 'Too many login attempts. Please wait a moment and try again.';
      } else {
        errorMessage = error.response?.data?.error?.message || error.response?.data?.message || 'Login failed';
      }
      
      return rejectWithValue(errorMessage);
    }
  }
);

export const logoutAsync = createAsyncThunk(
  'platformAuth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await platformApi.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
      // Don't reject on logout error, still clear local state
    } finally {
      // Clear token and user
      ls.remove('platformToken');
      delete platformApi.defaults.headers.common['Authorization'];
    }
    return true;
  }
);

export const checkAuthAsync = createAsyncThunk(
  'platformAuth/checkAuth',
  async (_, { rejectWithValue }) => {
    try {
      const token = ls.get('platformToken');
      if (!token) {
        return rejectWithValue('No token found');
      }

      // Set token in API client
      platformApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Verify token and get platform user info
      const response = await platformApi.get('/auth/me');
      return { token, user: response.data.data.user };
    } catch (error) {
      console.error('Auth check failed:', error);
      
      // Handle rate limiting gracefully
      if (error.response?.status === 429) {
        console.warn('Rate limited during auth check - will retry later');
        return rejectWithValue('Rate limited');
      } else {
        // Clear invalid token for other errors
        ls.remove('platformToken');
        delete platformApi.defaults.headers.common['Authorization'];
        return rejectWithValue('Authentication failed');
      }
    }
  }
);

// Slice
const platformAuthSlice = createSlice({
  name: 'platformAuth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setUser: (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.error = null;
        state.lastSuccessfulOperation = new Date().toISOString();
      })
      .addCase(loginAsync.rejected, (state, action) => {
        state.loading = false;
        state.user = null;
        state.isAuthenticated = false;
        state.error = {
          message: action.payload,
          code: 'LOGIN_FAILED',
          timestamp: new Date().toISOString(),
          retryable: true,
        };
      })
      // Logout
      .addCase(logoutAsync.pending, (state) => {
        state.loading = true;
      })
      .addCase(logoutAsync.fulfilled, (state) => {
        state.loading = false;
        state.user = null;
        state.isAuthenticated = false;
        state.error = null;
        state.lastSuccessfulOperation = new Date().toISOString();
      })
      .addCase(logoutAsync.rejected, (state) => {
        state.loading = false;
        state.user = null;
        state.isAuthenticated = false;
        state.error = null; // Don't show error on logout failure
      })
      // Check Auth
      .addCase(checkAuthAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(checkAuthAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.error = null;
        state.lastSuccessfulOperation = new Date().toISOString();
      })
      .addCase(checkAuthAsync.rejected, (state, action) => {
        state.loading = false;
        state.user = null;
        state.isAuthenticated = false;
        if (action.payload !== 'Rate limited') {
          state.error = {
            message: action.payload,
            code: 'AUTH_CHECK_FAILED',
            timestamp: new Date().toISOString(),
            retryable: action.payload === 'Rate limited',
          };
        }
      });
  },
});

export const { clearError, setUser } = platformAuthSlice.actions;
export default platformAuthSlice.reducer;