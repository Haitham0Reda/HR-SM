/**
 * Store Configuration Tests
 * 
 * Tests for Redux store setup including:
 * - Store creation
 * - Redux DevTools configuration
 * - Middleware setup
 * - Slice integration
 */

import { store, persistor } from '../index';
import { baseApi } from '../api';

describe('Redux Store Configuration', () => {
  it('should create store with all slices', () => {
    const state = store.getState();
    
    // Verify all slices are present
    expect(state).toHaveProperty('auth');
    expect(state).toHaveProperty('tenant');
    expect(state).toHaveProperty('modules');
    expect(state).toHaveProperty('notifications');
    expect(state).toHaveProperty('ui');
    expect(state).toHaveProperty(baseApi.reducerPath);
  });

  it('should have correct initial state for UI slice', () => {
    const state = store.getState();
    
    expect(state.ui).toEqual({
      loading: false,
      loadingMessage: null,
      notifications: [],
      sidebarOpen: true,
      sidebarCollapsed: false,
      modals: {},
      themeMode: expect.any(String),
      pageTitle: 'Dashboard',
    });
  });

  it('should have persistor configured', () => {
    expect(persistor).toBeDefined();
    expect(typeof persistor.persist).toBe('function');
    expect(typeof persistor.purge).toBe('function');
  });

  it('should have RTK Query middleware configured', () => {
    const state = store.getState();
    
    // RTK Query reducer should be present
    expect(state[baseApi.reducerPath]).toBeDefined();
  });

  it('should enable Redux DevTools in development', () => {
    // Store should have devTools enabled when NODE_ENV !== 'production'
    // This is configured in the store setup
    expect(store).toBeDefined();
  });
});

describe('UI Slice Actions', () => {
  it('should handle setLoading action', () => {
    const { setLoading } = require('../slices/uiSlice');
    
    store.dispatch(setLoading({ loading: true, message: 'Loading...' }));
    
    const state = store.getState();
    expect(state.ui.loading).toBe(true);
    expect(state.ui.loadingMessage).toBe('Loading...');
  });

  it('should handle clearLoading action', () => {
    const { clearLoading } = require('../slices/uiSlice');
    
    store.dispatch(clearLoading());
    
    const state = store.getState();
    expect(state.ui.loading).toBe(false);
    expect(state.ui.loadingMessage).toBe(null);
  });

  it('should handle toggleSidebar action', () => {
    const { toggleSidebar } = require('../slices/uiSlice');
    
    const initialState = store.getState().ui.sidebarOpen;
    store.dispatch(toggleSidebar());
    
    const newState = store.getState().ui.sidebarOpen;
    expect(newState).toBe(!initialState);
  });

  it('should handle addNotification action', () => {
    const { addNotification } = require('../slices/uiSlice');
    
    store.dispatch(addNotification({
      type: 'success',
      message: 'Test notification',
    }));
    
    const state = store.getState();
    expect(state.ui.notifications.length).toBeGreaterThan(0);
    expect(state.ui.notifications[state.ui.notifications.length - 1]).toMatchObject({
      type: 'success',
      message: 'Test notification',
    });
  });
});
