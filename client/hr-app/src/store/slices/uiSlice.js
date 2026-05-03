/**
 * UI Slice
 * 
 * Manages global UI state including:
 * - Loading states
 * - Notification queue
 * - Sidebar open/close state
 * - Modal states
 * - Theme preferences
 */

import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  // Global loading state
  loading: false,
  loadingMessage: null,
  
  // Notification queue
  notifications: [],
  
  // Sidebar state
  sidebarOpen: true,
  sidebarCollapsed: false,
  
  // Modal states
  modals: {},
  
  // Theme preferences — read from localStorage once at init, then persist
  // via redux-persist. DO NOT write to localStorage in reducers (breaks purity).
  themeMode: (() => {
    try {
      return localStorage.getItem('themeMode') || 'light';
    } catch {
      return 'light';
    }
  })(),
  
  // Page title
  pageTitle: 'Dashboard',
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // Loading state actions
    setLoading: (state, action) => {
      state.loading = action.payload.loading;
      state.loadingMessage = action.payload.message || null;
    },
    clearLoading: (state) => {
      state.loading = false;
      state.loadingMessage = null;
    },
    
    // Notification actions
    addNotification: (state, action) => {
      const notification = {
        id: Date.now() + Math.random(),
        timestamp: Date.now(),
        ...action.payload,
      };
      state.notifications.push(notification);
    },
    removeNotification: (state, action) => {
      state.notifications = state.notifications.filter(
        (notification) => notification.id !== action.payload
      );
    },
    clearNotifications: (state) => {
      state.notifications = [];
    },
    
    // Sidebar actions
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action) => {
      state.sidebarOpen = action.payload;
    },
    toggleSidebarCollapsed: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setSidebarCollapsed: (state, action) => {
      state.sidebarCollapsed = action.payload;
    },
    
    // Modal actions
    openModal: (state, action) => {
      const { modalId, data } = action.payload;
      state.modals[modalId] = {
        open: true,
        data: data || null,
      };
    },
    closeModal: (state, action) => {
      const modalId = action.payload;
      if (state.modals[modalId]) {
        state.modals[modalId].open = false;
      }
    },
    clearModal: (state, action) => {
      const modalId = action.payload;
      delete state.modals[modalId];
    },
    
    // Theme actions — DO NOT write to localStorage in reducers (breaks purity).
    // redux-persist will sync state to storage automatically.
    setThemeMode: (state, action) => {
      state.themeMode = action.payload;
    },
    toggleThemeMode: (state) => {
      state.themeMode = state.themeMode === 'light' ? 'dark' : 'light';
    },
    
    // Page title action
    setPageTitle: (state, action) => {
      state.pageTitle = action.payload;
    },
  },
});

// Selectors
export const selectLoading = (state) => state.ui.loading;
export const selectLoadingMessage = (state) => state.ui.loadingMessage;
export const selectNotifications = (state) => state.ui.notifications;
export const selectSidebarOpen = (state) => state.ui.sidebarOpen;
export const selectSidebarCollapsed = (state) => state.ui.sidebarCollapsed;
export const selectModal = (modalId) => (state) => state.ui.modals[modalId];
export const selectThemeMode = (state) => state.ui.themeMode;
export const selectPageTitle = (state) => state.ui.pageTitle;

// Export actions
export const {
  setLoading,
  clearLoading,
  addNotification,
  removeNotification,
  clearNotifications,
  toggleSidebar,
  setSidebarOpen,
  toggleSidebarCollapsed,
  setSidebarCollapsed,
  openModal,
  closeModal,
  clearModal,
  setThemeMode,
  toggleThemeMode,
  setPageTitle,
} = uiSlice.actions;

export default uiSlice.reducer;
