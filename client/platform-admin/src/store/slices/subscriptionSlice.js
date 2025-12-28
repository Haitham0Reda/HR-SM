import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import platformApi from '../../services/platformApi';

// Initial state
const initialState = {
  subscriptions: [],
  currentSubscription: null,
  plans: [],
  loading: false,
  error: null,
  lastSuccessfulOperation: null,
  analytics: {
    totalRevenue: 0,
    activeSubscriptions: 0,
    expiringSubscriptions: 0,
    revenueByPlan: {},
  },
};

// Async thunks
export const fetchSubscriptionsAsync = createAsyncThunk(
  'subscription/fetchSubscriptions',
  async ({ page = 1, limit = 10, status = 'all', plan = 'all' } = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (status !== 'all') params.append('status', status);
      if (plan !== 'all') params.append('plan', plan);

      const response = await platformApi.get(`/subscriptions?${params}`);
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch subscriptions:', error);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch subscriptions');
    }
  }
);

export const fetchSubscriptionPlansAsync = createAsyncThunk(
  'subscription/fetchPlans',
  async (_, { rejectWithValue }) => {
    try {
      const response = await platformApi.get('/subscription-plans');
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch subscription plans:', error);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch subscription plans');
    }
  }
);

export const fetchSubscriptionByIdAsync = createAsyncThunk(
  'subscription/fetchSubscriptionById',
  async (subscriptionId, { rejectWithValue }) => {
    try {
      const response = await platformApi.get(`/subscriptions/${subscriptionId}`);
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch subscription:', error);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch subscription');
    }
  }
);

export const createSubscriptionAsync = createAsyncThunk(
  'subscription/createSubscription',
  async (subscriptionData, { rejectWithValue }) => {
    try {
      const response = await platformApi.post('/subscriptions', subscriptionData);
      return response.data.data;
    } catch (error) {
      console.error('Failed to create subscription:', error);
      return rejectWithValue(error.response?.data?.message || 'Failed to create subscription');
    }
  }
);

export const updateSubscriptionAsync = createAsyncThunk(
  'subscription/updateSubscription',
  async ({ subscriptionId, subscriptionData }, { rejectWithValue }) => {
    try {
      const response = await platformApi.put(`/subscriptions/${subscriptionId}`, subscriptionData);
      return response.data.data;
    } catch (error) {
      console.error('Failed to update subscription:', error);
      return rejectWithValue(error.response?.data?.message || 'Failed to update subscription');
    }
  }
);

export const renewSubscriptionAsync = createAsyncThunk(
  'subscription/renewSubscription',
  async ({ subscriptionId, renewalData }, { rejectWithValue }) => {
    try {
      const response = await platformApi.patch(`/subscriptions/${subscriptionId}/renew`, renewalData);
      return response.data.data;
    } catch (error) {
      console.error('Failed to renew subscription:', error);
      return rejectWithValue(error.response?.data?.message || 'Failed to renew subscription');
    }
  }
);

export const cancelSubscriptionAsync = createAsyncThunk(
  'subscription/cancelSubscription',
  async (subscriptionId, { rejectWithValue }) => {
    try {
      const response = await platformApi.patch(`/subscriptions/${subscriptionId}/cancel`);
      return response.data.data;
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      return rejectWithValue(error.response?.data?.message || 'Failed to cancel subscription');
    }
  }
);

export const fetchSubscriptionAnalyticsAsync = createAsyncThunk(
  'subscription/fetchAnalytics',
  async (_, { rejectWithValue }) => {
    try {
      const response = await platformApi.get('/subscriptions/analytics');
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch subscription analytics:', error);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch subscription analytics');
    }
  }
);

// Slice
const subscriptionSlice = createSlice({
  name: 'subscription',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentSubscription: (state, action) => {
      state.currentSubscription = action.payload;
    },
    clearCurrentSubscription: (state) => {
      state.currentSubscription = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Subscriptions
      .addCase(fetchSubscriptionsAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSubscriptionsAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.subscriptions = action.payload.subscriptions || [];
        state.error = null;
        state.lastSuccessfulOperation = new Date().toISOString();
      })
      .addCase(fetchSubscriptionsAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = {
          message: action.payload,
          code: 'FETCH_SUBSCRIPTIONS_FAILED',
          timestamp: new Date().toISOString(),
          retryable: true,
        };
      })
      // Fetch Subscription Plans
      .addCase(fetchSubscriptionPlansAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSubscriptionPlansAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.plans = action.payload || [];
        state.error = null;
        state.lastSuccessfulOperation = new Date().toISOString();
      })
      .addCase(fetchSubscriptionPlansAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = {
          message: action.payload,
          code: 'FETCH_PLANS_FAILED',
          timestamp: new Date().toISOString(),
          retryable: true,
        };
      })
      // Fetch Subscription by ID
      .addCase(fetchSubscriptionByIdAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSubscriptionByIdAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.currentSubscription = action.payload;
        state.error = null;
        state.lastSuccessfulOperation = new Date().toISOString();
      })
      .addCase(fetchSubscriptionByIdAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = {
          message: action.payload,
          code: 'FETCH_SUBSCRIPTION_FAILED',
          timestamp: new Date().toISOString(),
          retryable: true,
        };
      })
      // Create Subscription
      .addCase(createSubscriptionAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createSubscriptionAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.subscriptions.unshift(action.payload);
        state.error = null;
        state.lastSuccessfulOperation = new Date().toISOString();
      })
      .addCase(createSubscriptionAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = {
          message: action.payload,
          code: 'CREATE_SUBSCRIPTION_FAILED',
          timestamp: new Date().toISOString(),
          retryable: true,
        };
      })
      // Update Subscription
      .addCase(updateSubscriptionAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateSubscriptionAsync.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.subscriptions.findIndex(sub => sub._id === action.payload._id);
        if (index !== -1) {
          state.subscriptions[index] = action.payload;
        }
        if (state.currentSubscription && state.currentSubscription._id === action.payload._id) {
          state.currentSubscription = action.payload;
        }
        state.error = null;
        state.lastSuccessfulOperation = new Date().toISOString();
      })
      .addCase(updateSubscriptionAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = {
          message: action.payload,
          code: 'UPDATE_SUBSCRIPTION_FAILED',
          timestamp: new Date().toISOString(),
          retryable: true,
        };
      })
      // Renew Subscription
      .addCase(renewSubscriptionAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(renewSubscriptionAsync.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.subscriptions.findIndex(sub => sub._id === action.payload._id);
        if (index !== -1) {
          state.subscriptions[index] = action.payload;
        }
        if (state.currentSubscription && state.currentSubscription._id === action.payload._id) {
          state.currentSubscription = action.payload;
        }
        state.error = null;
        state.lastSuccessfulOperation = new Date().toISOString();
      })
      .addCase(renewSubscriptionAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = {
          message: action.payload,
          code: 'RENEW_SUBSCRIPTION_FAILED',
          timestamp: new Date().toISOString(),
          retryable: true,
        };
      })
      // Cancel Subscription
      .addCase(cancelSubscriptionAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(cancelSubscriptionAsync.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.subscriptions.findIndex(sub => sub._id === action.payload._id);
        if (index !== -1) {
          state.subscriptions[index] = action.payload;
        }
        if (state.currentSubscription && state.currentSubscription._id === action.payload._id) {
          state.currentSubscription = action.payload;
        }
        state.error = null;
        state.lastSuccessfulOperation = new Date().toISOString();
      })
      .addCase(cancelSubscriptionAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = {
          message: action.payload,
          code: 'CANCEL_SUBSCRIPTION_FAILED',
          timestamp: new Date().toISOString(),
          retryable: true,
        };
      })
      // Fetch Analytics
      .addCase(fetchSubscriptionAnalyticsAsync.fulfilled, (state, action) => {
        state.analytics = action.payload;
        state.lastSuccessfulOperation = new Date().toISOString();
      });
  },
});

export const { clearError, setCurrentSubscription, clearCurrentSubscription } = subscriptionSlice.actions;
export default subscriptionSlice.reducer;