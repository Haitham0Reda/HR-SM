import { configureStore } from '@reduxjs/toolkit';
import notificationReducer, {
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
  markAllAsRead,
  selectNotifications,
  selectCurrentNotification,
  selectNotificationQueue,
  selectNotificationHistory,
  selectUnreadNotifications,
  selectUnreadCount,
  selectNotificationsBySeverity,
  selectSuccessNotifications,
  selectErrorNotifications,
  selectWarningNotifications,
  selectInfoNotifications
} from '../notificationSlice';

describe('notificationSlice', () => {
  let store;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        notifications: notificationReducer,
      },
    });
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = store.getState().notifications;
      expect(state).toEqual({
        notifications: [],
        currentNotification: null,
        queue: [],
      });
    });
  });

  describe('notification actions', () => {
    it('should show notification with default values', () => {
      store.dispatch(showNotification({ message: 'Test message' }));
      
      const state = store.getState().notifications;
      expect(state.currentNotification).toBeDefined();
      expect(state.currentNotification.message).toBe('Test message');
      expect(state.currentNotification.severity).toBe('info');
      expect(state.currentNotification.duration).toBe(3000);
      expect(state.currentNotification.open).toBe(true);
      expect(state.notifications).toHaveLength(1);
    });

    it('should show notification with custom values', () => {
      store.dispatch(showNotification({ 
        message: 'Custom message', 
        severity: 'error', 
        duration: 5000,
        id: 'custom-id'
      }));
      
      const state = store.getState().notifications;
      expect(state.currentNotification.message).toBe('Custom message');
      expect(state.currentNotification.severity).toBe('error');
      expect(state.currentNotification.duration).toBe(5000);
      expect(state.currentNotification.id).toBe('custom-id');
    });

    it('should handle non-string message objects', () => {
      const messageObj = { message: 'Error occurred', code: 500 };
      store.dispatch(showNotification({ message: messageObj }));
      
      const state = store.getState().notifications;
      expect(state.currentNotification.message).toBe('Error occurred');
    });

    it('should handle invalid message objects', () => {
      store.dispatch(showNotification({ message: { invalid: 'object' } }));
      
      const state = store.getState().notifications;
      expect(state.currentNotification.message).toBe('{"invalid":"object"}');
    });

    it('should handle null/undefined messages', () => {
      store.dispatch(showNotification({ message: null }));
      
      const state = store.getState().notifications;
      expect(state.currentNotification.message).toBe('An error occurred');
    });

    it('should queue notifications when one is already showing', () => {
      // Show first notification
      store.dispatch(showNotification({ message: 'First message' }));
      
      // Show second notification (should be queued)
      store.dispatch(showNotification({ message: 'Second message' }));
      
      const state = store.getState().notifications;
      expect(state.currentNotification.message).toBe('First message');
      expect(state.queue).toHaveLength(1);
      expect(state.queue[0].message).toBe('Second message');
      expect(state.notifications).toHaveLength(2);
    });

    it('should show success notification', () => {
      store.dispatch(showSuccess('Success message'));
      
      const state = store.getState().notifications;
      expect(state.currentNotification.message).toBe('Success message');
      expect(state.currentNotification.severity).toBe('success');
    });

    it('should show error notification', () => {
      store.dispatch(showError('Error message'));
      
      const state = store.getState().notifications;
      expect(state.currentNotification.message).toBe('Error message');
      expect(state.currentNotification.severity).toBe('error');
    });

    it('should show warning notification', () => {
      store.dispatch(showWarning('Warning message'));
      
      const state = store.getState().notifications;
      expect(state.currentNotification.message).toBe('Warning message');
      expect(state.currentNotification.severity).toBe('warning');
    });

    it('should show info notification', () => {
      store.dispatch(showInfo('Info message'));
      
      const state = store.getState().notifications;
      expect(state.currentNotification.message).toBe('Info message');
      expect(state.currentNotification.severity).toBe('info');
    });

    it('should handle object messages in convenience methods', () => {
      store.dispatch(showError({ message: 'Error details' }));
      
      const state = store.getState().notifications;
      expect(state.currentNotification.message).toBe('Error details');
      expect(state.currentNotification.severity).toBe('error');
    });
  });

  describe('notification management', () => {
    beforeEach(() => {
      // Set up some notifications
      store.dispatch(showNotification({ message: 'First', id: 'first' }));
      store.dispatch(showNotification({ message: 'Second', id: 'second' }));
      store.dispatch(showNotification({ message: 'Third', id: 'third' }));
    });

    it('should hide notification by ID', () => {
      store.dispatch(hideNotification('first'));
      
      const state = store.getState().notifications;
      expect(state.currentNotification.open).toBe(false);
      expect(state.notifications[0].open).toBe(false);
    });

    it('should close current notification and show next from queue', () => {
      store.dispatch(closeCurrentNotification());
      
      const state = store.getState().notifications;
      expect(state.currentNotification.message).toBe('Second');
      expect(state.queue).toHaveLength(1);
      expect(state.queue[0].message).toBe('Third');
    });

    it('should close current notification when queue is empty', () => {
      // Clear queue first
      store.dispatch(closeCurrentNotification());
      store.dispatch(closeCurrentNotification());
      store.dispatch(closeCurrentNotification());
      
      const state = store.getState().notifications;
      expect(state.currentNotification).toBeNull();
      expect(state.queue).toHaveLength(0);
    });

    it('should clear specific notification', () => {
      const initialCount = store.getState().notifications.notifications.length;
      
      store.dispatch(clearNotification('second'));
      
      const state = store.getState().notifications;
      expect(state.notifications).toHaveLength(initialCount - 1);
      expect(state.queue).toHaveLength(1); // 'third' should remain
      expect(state.queue[0].message).toBe('Third');
    });

    it('should clear current notification and show next', () => {
      store.dispatch(clearNotification('first'));
      
      const state = store.getState().notifications;
      expect(state.currentNotification.message).toBe('Second');
    });

    it('should clear all notifications', () => {
      store.dispatch(clearAllNotifications());
      
      const state = store.getState().notifications;
      expect(state.notifications).toHaveLength(0);
      expect(state.currentNotification).toBeNull();
      expect(state.queue).toHaveLength(0);
    });

    it('should mark notification as read', () => {
      store.dispatch(markAsRead('first'));
      
      const state = store.getState().notifications;
      expect(state.notifications[0].read).toBe(true);
    });

    it('should mark all notifications as read', () => {
      store.dispatch(markAllAsRead());
      
      const state = store.getState().notifications;
      state.notifications.forEach(notification => {
        expect(notification.read).toBe(true);
      });
    });
  });

  describe('selectors', () => {
    beforeEach(() => {
      // Set up test notifications
      store.dispatch(showSuccess('Success message'));
      store.dispatch(showError('Error message'));
      store.dispatch(showWarning('Warning message'));
      store.dispatch(showInfo('Info message'));
      
      // Mark some as read
      store.dispatch(markAsRead(store.getState().notifications.notifications[0].id));
    });

    it('should select notifications state', () => {
      const notifications = selectNotifications(store.getState());
      expect(notifications.notifications).toHaveLength(4);
      expect(notifications.currentNotification).toBeDefined();
      expect(notifications.queue).toHaveLength(3);
    });

    it('should select current notification', () => {
      const current = selectCurrentNotification(store.getState());
      expect(current.message).toBe('Success message');
      expect(current.severity).toBe('success');
    });

    it('should select notification queue', () => {
      const queue = selectNotificationQueue(store.getState());
      expect(queue).toHaveLength(3);
      expect(queue[0].severity).toBe('error');
      expect(queue[1].severity).toBe('warning');
      expect(queue[2].severity).toBe('info');
    });

    it('should select notification history', () => {
      const history = selectNotificationHistory(store.getState());
      expect(history).toHaveLength(4);
    });

    it('should select unread notifications', () => {
      const unread = selectUnreadNotifications(store.getState());
      expect(unread).toHaveLength(3); // One was marked as read
    });

    it('should select unread count', () => {
      const count = selectUnreadCount(store.getState());
      expect(count).toBe(3);
    });

    it('should select notifications by severity', () => {
      const successNotifications = selectNotificationsBySeverity('success')(store.getState());
      const errorNotifications = selectNotificationsBySeverity('error')(store.getState());
      
      expect(successNotifications).toHaveLength(1);
      expect(errorNotifications).toHaveLength(1);
    });

    it('should select success notifications', () => {
      const success = selectSuccessNotifications(store.getState());
      expect(success).toHaveLength(1);
      expect(success[0].severity).toBe('success');
    });

    it('should select error notifications', () => {
      const errors = selectErrorNotifications(store.getState());
      expect(errors).toHaveLength(1);
      expect(errors[0].severity).toBe('error');
    });

    it('should select warning notifications', () => {
      const warnings = selectWarningNotifications(store.getState());
      expect(warnings).toHaveLength(1);
      expect(warnings[0].severity).toBe('warning');
    });

    it('should select info notifications', () => {
      const info = selectInfoNotifications(store.getState());
      expect(info).toHaveLength(1);
      expect(info[0].severity).toBe('info');
    });
  });
});