import React, { useEffect, createContext, useContext } from 'react';
import { Snackbar, Alert } from '@mui/material';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAppSelector } from '../hooks/useAppSelector';
import {
  showNotification,
  showSuccess,
  showError,
  showWarning,
  showInfo,
  closeCurrentNotification,
  selectCurrentNotification,
  selectNotificationQueue
} from '../slices/notificationSlice';

// Create context for backward compatibility
const ReduxNotificationContext = createContext(null);

export const useNotification = () => {
  const context = useContext(ReduxNotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within ReduxNotificationProvider');
  }
  return context;
};

export const ReduxNotificationProvider = ({ children }) => {
  const dispatch = useAppDispatch();
  
  // Selectors
  const currentNotification = useAppSelector(selectCurrentNotification);
  const queue = useAppSelector(selectNotificationQueue);

  // Auto-close notifications after their duration
  useEffect(() => {
    if (currentNotification && currentNotification.open) {
      const timer = setTimeout(() => {
        dispatch(closeCurrentNotification());
      }, currentNotification.duration || 3000);

      return () => clearTimeout(timer);
    }
  }, [currentNotification, dispatch]);

  // Notification functions
  const showNotificationHandler = (message, severity = 'info') => {
    dispatch(showNotification({ message, severity }));
  };

  const showSuccessHandler = (message) => {
    dispatch(showSuccess(message));
  };

  const showErrorHandler = (message) => {
    dispatch(showError(message));
  };

  const showWarningHandler = (message) => {
    dispatch(showWarning(message));
  };

  const showInfoHandler = (message) => {
    dispatch(showInfo(message));
  };

  const handleClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    dispatch(closeCurrentNotification());
  };

  const value = {
    showNotification: showNotificationHandler,
    showSuccess: showSuccessHandler,
    showError: showErrorHandler,
    showWarning: showWarningHandler,
    showInfo: showInfoHandler,
  };

  return (
    <ReduxNotificationContext.Provider value={value}>
      {children}
      {currentNotification && (
        <Snackbar
          open={currentNotification.open}
          autoHideDuration={currentNotification.duration || 3000}
          onClose={handleClose}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          sx={{
            mt: 8,
          }}
        >
          <Alert
            onClose={handleClose}
            severity={currentNotification.severity}
            variant="filled"
            sx={{
              width: '100%',
              minWidth: 300,
              borderRadius: 2,
              boxShadow: 4,
              fontWeight: 500,
              '& .MuiAlert-icon': {
                fontSize: 24,
              },
              '& .MuiAlert-message': {
                fontSize: '0.9375rem',
              },
            }}
          >
            {currentNotification.message}
          </Alert>
        </Snackbar>
      )}
    </ReduxNotificationContext.Provider>
  );
};