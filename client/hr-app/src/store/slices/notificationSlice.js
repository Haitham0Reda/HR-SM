import { createSlice } from '@reduxjs/toolkit';

// Initial state
const initialState = {
  notifications: [],
  currentNotification: null,
  queue: [],
};

// Notification slice
const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    showNotification: (state, action) => {
      const { message, severity = 'info', duration = 3000, id } = action.payload;
      
      // Ensure message is always a string
      const messageStr = typeof message === 'string' 
        ? message 
        : message?.message || (message ? JSON.stringify(message) : 'An error occurred');
      
      const notification = {
        id: id || Date.now() + Math.random(),
        message: messageStr,
        severity,
        duration,
        timestamp: Date.now(),
        open: true,
      };

      // If no current notification, show immediately
      if (!state.currentNotification) {
        state.currentNotification = notification;
      } else {
        // Add to queue
        state.queue.push(notification);
      }
      
      // Add to notifications history
      state.notifications.push(notification);
    },
    
    showSuccess: (state, action) => {
      const message = typeof action.payload === 'string' ? action.payload : action.payload.message;
      notificationSlice.caseReducers.showNotification(state, {
        payload: { message, severity: 'success' }
      });
    },
    
    showError: (state, action) => {
      const message = typeof action.payload === 'string' ? action.payload : action.payload.message;
      notificationSlice.caseReducers.showNotification(state, {
        payload: { message, severity: 'error' }
      });
    },
    
    showWarning: (state, action) => {
      const message = typeof action.payload === 'string' ? action.payload : action.payload.message;
      notificationSlice.caseReducers.showNotification(state, {
        payload: { message, severity: 'warning' }
      });
    },
    
    showInfo: (state, action) => {
      const message = typeof action.payload === 'string' ? action.payload : action.payload.message;
      notificationSlice.caseReducers.showNotification(state, {
        payload: { message, severity: 'info' }
      });
    },
    
    hideNotification: (state, action) => {
      const notificationId = action.payload;
      
      // Close current notification if it matches
      if (state.currentNotification && state.currentNotification.id === notificationId) {
        state.currentNotification.open = false;
      }
      
      // Update in notifications history
      const notification = state.notifications.find(n => n.id === notificationId);
      if (notification) {
        notification.open = false;
      }
    },
    
    closeCurrentNotification: (state) => {
      if (state.currentNotification) {
        state.currentNotification.open = false;
        
        // Show next notification from queue
        if (state.queue.length > 0) {
          state.currentNotification = state.queue.shift();
        } else {
          state.currentNotification = null;
        }
      }
    },
    
    clearNotification: (state, action) => {
      const notificationId = action.payload;
      
      // Remove from current notification
      if (state.currentNotification && state.currentNotification.id === notificationId) {
        // Show next notification from queue
        if (state.queue.length > 0) {
          state.currentNotification = state.queue.shift();
        } else {
          state.currentNotification = null;
        }
      }
      
      // Remove from queue
      state.queue = state.queue.filter(n => n.id !== notificationId);
      
      // Remove from history
      state.notifications = state.notifications.filter(n => n.id !== notificationId);
    },
    
    clearAllNotifications: (state) => {
      state.notifications = [];
      state.currentNotification = null;
      state.queue = [];
    },
    
    markAsRead: (state, action) => {
      const notificationId = action.payload;
      const notification = state.notifications.find(n => n.id === notificationId);
      if (notification) {
        notification.read = true;
      }
    },
    
    markAllAsRead: (state) => {
      state.notifications.forEach(notification => {
        notification.read = true;
      });
    }
  },
});

// Selectors
export const selectNotifications = (state) => state.notifications;
export const selectCurrentNotification = (state) => state.notifications.currentNotification;
export const selectNotificationQueue = (state) => state.notifications.queue;
export const selectNotificationHistory = (state) => state.notifications.notifications;
export const selectUnreadNotifications = (state) => 
  state.notifications.notifications.filter(n => !n.read);
export const selectUnreadCount = (state) => 
  state.notifications.notifications.filter(n => !n.read).length;

// Notification by severity selectors
export const selectNotificationsBySeverity = (severity) => (state) =>
  state.notifications.notifications.filter(n => n.severity === severity);

export const selectSuccessNotifications = (state) => 
  selectNotificationsBySeverity('success')(state);
export const selectErrorNotifications = (state) => 
  selectNotificationsBySeverity('error')(state);
export const selectWarningNotifications = (state) => 
  selectNotificationsBySeverity('warning')(state);
export const selectInfoNotifications = (state) => 
  selectNotificationsBySeverity('info')(state);

// Export actions
export const {
  showNotification,
  showSuccess,
  showError,
  showWarning,
  showInfo,
  hideNotification,
  closeCurrentNotification,
  clearNotification,
  clearAllNotifications,
  markAsRead,
  markAllAsRead
} = notificationSlice.actions;

export default notificationSlice.reducer;