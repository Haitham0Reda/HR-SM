import { configureStore } from '@reduxjs/toolkit';
import subscriptionSlice, {
  fetchSubscriptionsAsync,
  fetchSubscriptionPlansAsync,
  fetchSubscriptionByIdAsync,
  createSubscriptionAsync,
  updateSubscriptionAsync,
  renewSubscriptionAsync,
  cancelSubscriptionAsync,
  fetchSubscriptionAnalyticsAsync,
  clearError,
  setCurrentSubscription,
  clearCurrentSubscription,
} from '../subscriptionSlice';

// Mock the platformApi
jest.mock('../../../services/platformApi', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  patch: jest.fn(),
}));

import platformApi from '../../../services/platformApi';

describe('subscriptionSlice', () => {
  let store;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        subscription: subscriptionSlice,
      },
    });
    
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = store.getState().subscription;
      expect(state).toEqual({
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
      });
    });
  });

  describe('reducers', () => {
    it('should handle clearError', () => {
      // Set an error first
      store.dispatch({
        type: 'subscription/fetchSubscriptionsAsync/rejected',
        payload: 'Test error',
      });
      
      store.dispatch(clearError());
      
      const state = store.getState().subscription;
      expect(state.error).toBeNull();
    });

    it('should handle setCurrentSubscription', () => {
      const subscription = { _id: '1', plan: 'premium' };
      
      store.dispatch(setCurrentSubscription(subscription));
      
      const state = store.getState().subscription;
      expect(state.currentSubscription).toEqual(subscription);
    });

    it('should handle clearCurrentSubscription', () => {
      // Set a subscription first
      store.dispatch(setCurrentSubscription({ _id: '1', plan: 'premium' }));
      
      store.dispatch(clearCurrentSubscription());
      
      const state = store.getState().subscription;
      expect(state.currentSubscription).toBeNull();
    });
  });

  describe('fetchSubscriptionsAsync', () => {
    it('should handle successful fetch', async () => {
      const mockSubscriptions = [
        { _id: '1', plan: 'basic' },
        { _id: '2', plan: 'premium' },
      ];
      
      platformApi.get.mockResolvedValueOnce({
        data: { data: { subscriptions: mockSubscriptions } },
      });

      await store.dispatch(fetchSubscriptionsAsync());

      const state = store.getState().subscription;
      expect(state.loading).toBe(false);
      expect(state.subscriptions).toEqual(mockSubscriptions);
      expect(state.error).toBeNull();
    });

    it('should handle fetch failure', async () => {
      const errorMessage = 'Failed to fetch subscriptions';
      
      platformApi.get.mockRejectedValueOnce({
        response: {
          data: { message: errorMessage },
        },
      });

      await store.dispatch(fetchSubscriptionsAsync());

      const state = store.getState().subscription;
      expect(state.loading).toBe(false);
      expect(state.error).toEqual({
        message: errorMessage,
        code: 'FETCH_SUBSCRIPTIONS_FAILED',
        timestamp: expect.any(String),
        retryable: true,
      });
    });

    it('should build correct query parameters', async () => {
      platformApi.get.mockResolvedValueOnce({
        data: { data: { subscriptions: [] } },
      });

      await store.dispatch(fetchSubscriptionsAsync({
        page: 2,
        limit: 20,
        status: 'active',
        plan: 'premium',
      }));

      expect(platformApi.get).toHaveBeenCalledWith(
        expect.stringContaining('page=2&limit=20&status=active&plan=premium')
      );
    });
  });

  describe('fetchSubscriptionPlansAsync', () => {
    it('should handle successful fetch', async () => {
      const mockPlans = [
        { id: 'basic', name: 'Basic Plan' },
        { id: 'premium', name: 'Premium Plan' },
      ];
      
      platformApi.get.mockResolvedValueOnce({
        data: { data: mockPlans },
      });

      await store.dispatch(fetchSubscriptionPlansAsync());

      const state = store.getState().subscription;
      expect(state.loading).toBe(false);
      expect(state.plans).toEqual(mockPlans);
      expect(state.error).toBeNull();
    });
  });

  describe('fetchSubscriptionByIdAsync', () => {
    it('should handle successful fetch', async () => {
      const mockSubscription = { _id: '1', plan: 'premium' };
      
      platformApi.get.mockResolvedValueOnce({
        data: { data: mockSubscription },
      });

      await store.dispatch(fetchSubscriptionByIdAsync('1'));

      const state = store.getState().subscription;
      expect(state.loading).toBe(false);
      expect(state.currentSubscription).toEqual(mockSubscription);
      expect(state.error).toBeNull();
    });
  });

  describe('createSubscriptionAsync', () => {
    it('should handle successful creation', async () => {
      const newSubscription = { _id: '3', plan: 'enterprise' };
      
      platformApi.post.mockResolvedValueOnce({
        data: { data: newSubscription },
      });

      await store.dispatch(createSubscriptionAsync({ plan: 'enterprise' }));

      const state = store.getState().subscription;
      expect(state.loading).toBe(false);
      expect(state.subscriptions[0]).toEqual(newSubscription); // Should be added to beginning
      expect(state.error).toBeNull();
    });
  });

  describe('updateSubscriptionAsync', () => {
    it('should handle successful update', async () => {
      const existingSubscription = { _id: '1', plan: 'basic' };
      const updatedSubscription = { _id: '1', plan: 'premium' };
      
      // Set initial state with existing subscription
      store.dispatch(setCurrentSubscription(existingSubscription));
      store.dispatch({
        type: 'subscription/fetchSubscriptionsAsync/fulfilled',
        payload: { subscriptions: [existingSubscription] },
      });
      
      platformApi.put.mockResolvedValueOnce({
        data: { data: updatedSubscription },
      });

      await store.dispatch(updateSubscriptionAsync({
        subscriptionId: '1',
        subscriptionData: { plan: 'premium' },
      }));

      const state = store.getState().subscription;
      expect(state.loading).toBe(false);
      expect(state.subscriptions).toHaveLength(1);
      expect(state.subscriptions[0]).toEqual(updatedSubscription);
      expect(state.currentSubscription).toEqual(updatedSubscription);
      expect(state.error).toBeNull();
    });
  });

  describe('renewSubscriptionAsync', () => {
    it('should handle successful renewal', async () => {
      const subscription = { _id: '1', plan: 'premium', expiresAt: '2024-01-01' };
      const renewedSubscription = { _id: '1', plan: 'premium', expiresAt: '2025-01-01' };
      
      // Set initial state
      store.dispatch({
        type: 'subscription/fetchSubscriptionsAsync/fulfilled',
        payload: { subscriptions: [subscription] },
      });
      
      platformApi.patch.mockResolvedValueOnce({
        data: { data: renewedSubscription },
      });

      await store.dispatch(renewSubscriptionAsync({
        subscriptionId: '1',
        renewalData: { duration: '1 year' },
      }));

      const state = store.getState().subscription;
      expect(state.loading).toBe(false);
      expect(state.subscriptions).toHaveLength(1);
      expect(state.subscriptions[0]).toEqual(renewedSubscription);
      expect(state.error).toBeNull();
    });
  });

  describe('cancelSubscriptionAsync', () => {
    it('should handle successful cancellation', async () => {
      const subscription = { _id: '1', plan: 'premium', status: 'active' };
      const cancelledSubscription = { _id: '1', plan: 'premium', status: 'cancelled' };
      
      // Set initial state
      store.dispatch({
        type: 'subscription/fetchSubscriptionsAsync/fulfilled',
        payload: { subscriptions: [subscription] },
      });
      
      platformApi.patch.mockResolvedValueOnce({
        data: { data: cancelledSubscription },
      });

      await store.dispatch(cancelSubscriptionAsync('1'));

      const state = store.getState().subscription;
      expect(state.loading).toBe(false);
      expect(state.subscriptions).toHaveLength(1);
      expect(state.subscriptions[0]).toEqual(cancelledSubscription);
      expect(state.error).toBeNull();
    });
  });

  describe('fetchSubscriptionAnalyticsAsync', () => {
    it('should handle successful analytics fetch', async () => {
      const mockAnalytics = {
        totalRevenue: 50000,
        activeSubscriptions: 150,
        expiringSubscriptions: 10,
        revenueByPlan: {
          basic: 15000,
          premium: 25000,
          enterprise: 10000,
        },
      };
      
      platformApi.get.mockResolvedValueOnce({
        data: { data: mockAnalytics },
      });

      await store.dispatch(fetchSubscriptionAnalyticsAsync());

      const state = store.getState().subscription;
      expect(state.analytics).toEqual(mockAnalytics);
    });
  });
});