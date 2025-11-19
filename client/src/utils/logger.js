const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Log levels
const LOG_LEVELS = {
    INFO: 'info',
    WARN: 'warn',
    ERROR: 'error',
    DEBUG: 'debug'
};

// Send log to backend
const sendLogToBackend = async (level, message, meta = {}) => {
    try {
        await fetch(`${API_URL}/api/logs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                level,
                message,
                meta: {
                    ...meta,
                    timestamp: new Date().toISOString(),
                    userAgent: navigator.userAgent,
                    url: window.location.href
                }
            }),
        });
    } catch (error) {
        // Silently fail - don't want logging errors to break the app
        console.error('Failed to send log to backend:', error);
    }
};

// Main logger function
const logger = (level, message, meta = {}) => {
    // Always log to console in development
    if (process.env.NODE_ENV === 'development') {
        console[level](message, meta);
    }

    // Send important logs to backend
    if (level === LOG_LEVELS.ERROR || level === LOG_LEVELS.WARN) {
        sendLogToBackend(level, message, meta);
    }
};

// Exported logging functions
export const logInfo = (message, meta = {}) => {
    logger(LOG_LEVELS.INFO, message, meta);
};

export const logWarn = (message, meta = {}) => {
    logger(LOG_LEVELS.WARN, message, meta);
};

export const logError = (message, meta = {}) => {
    logger(LOG_LEVELS.ERROR, message, meta);
};

export const logDebug = (message, meta = {}) => {
    if (process.env.NODE_ENV === 'development') {
        logger(LOG_LEVELS.DEBUG, message, meta);
    }
};

// Log user actions
export const logUserAction = (action, details = {}) => {
    logInfo(`User Action: ${action}`, { action, ...details });
};

// Log API calls
export const logApiCall = (method, endpoint, status, error = null) => {
    const message = `API ${method} ${endpoint} - Status: ${status}`;
    if (error) {
        logError(message, { method, endpoint, status, error: error.message });
    } else {
        logInfo(message, { method, endpoint, status });
    }
};

// Global error handler
export const setupGlobalErrorHandler = () => {
    window.addEventListener('error', (event) => {
        logError('Uncaught Error', {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            error: event.error?.stack
        });
    });

    window.addEventListener('unhandledrejection', (event) => {
        logError('Unhandled Promise Rejection', {
            reason: event.reason,
            promise: event.promise
        });
    });
};

export default {
    info: logInfo,
    warn: logWarn,
    error: logError,
    debug: logDebug,
    userAction: logUserAction,
    apiCall: logApiCall,
    setupGlobalErrorHandler
};
