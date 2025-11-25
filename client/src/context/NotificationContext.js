import React, { createContext, useState, useContext, useCallback } from 'react';
import { Snackbar, Alert } from '@mui/material';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
    const [notification, setNotification] = useState({
        open: false,
        message: '',
        severity: 'info', // 'success', 'error', 'warning', 'info'
    });

    const showNotification = useCallback((message, severity = 'info') => {
        // Ensure message is always a string
        const messageStr = typeof message === 'string' 
            ? message 
            : message?.message || JSON.stringify(message) || 'An error occurred';
        
        setNotification({
            open: true,
            message: messageStr,
            severity,
        });
    }, []);

    const showSuccess = useCallback((message) => {
        showNotification(message, 'success');
    }, [showNotification]);

    const showError = useCallback((message) => {
        showNotification(message, 'error');
    }, [showNotification]);

    const showWarning = useCallback((message) => {
        showNotification(message, 'warning');
    }, [showNotification]);

    const showInfo = useCallback((message) => {
        showNotification(message, 'info');
    }, [showNotification]);

    const handleClose = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setNotification((prev) => ({ ...prev, open: false }));
    };

    const value = {
        showNotification,
        showSuccess,
        showError,
        showWarning,
        showInfo,
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
            <Snackbar
                open={notification.open}
                autoHideDuration={3000}
                onClose={handleClose}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                sx={{
                    mt: 8,
                }}
            >
                <Alert
                    onClose={handleClose}
                    severity={notification.severity}
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
                    {notification.message}
                </Alert>
            </Snackbar>
        </NotificationContext.Provider>
    );
};

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};

export default NotificationContext;
