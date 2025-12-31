/**
 * API Service
 * 
 * Centralized Axios instance with interceptors for:
 * - Automatic authentication token injection
 * - Global error handling
 * - Request/response logging
 * - Automatic token refresh on 401 errors
 * - Circuit breaker for network failures
 */

import axios from 'axios';
import logger from '../utils/logger';
import errorThrottle from '../utils/errorThrottle';

// Circuit breaker state
let circuitBreakerActive = false;
let circuitBreakerUntil = 0;
let consecutiveNetworkFailures = 0;
let circuitBreakerNotificationShown = false;

/**
 * Check if circuit breaker should be activated
 */
const shouldActivateCircuitBreaker = () => {
    return consecutiveNetworkFailures >= 3;
};

/**
 * Show circuit breaker notification to user
 */
const showCircuitBreakerNotification = () => {
    if (circuitBreakerNotificationShown) return;
    
    // Try to show notification using Redux store if available
    try {
        const { store } = require('../store');
        const { showWarning } = require('../store/slices/notificationSlice');
        
        store.dispatch(showWarning({
            message: 'Server connection lost. Retrying in background...',
            duration: 5000
        }));
        
        circuitBreakerNotificationShown = true;
    } catch (error) {
        // Fallback to console if Redux store not available
        console.warn('🔌 Server connection lost. Retrying in background...');
        circuitBreakerNotificationShown = true;
    }
};

/**
 * Activate circuit breaker for network failures
 */
const activateCircuitBreaker = () => {
    const backoffTime = Math.min(30000 * consecutiveNetworkFailures, 120000); // Max 2 minutes
    circuitBreakerUntil = Date.now() + backoffTime;
    circuitBreakerActive = true;
    console.warn(`API circuit breaker activated for ${backoffTime/1000}s due to network failures`);
    showCircuitBreakerNotification();
};

/**
 * Reset circuit breaker on successful request
 */
const resetCircuitBreaker = () => {
    consecutiveNetworkFailures = 0;
    circuitBreakerActive = false;
    circuitBreakerUntil = 0;
    circuitBreakerNotificationShown = false;
};

/**
 * Create axios instance with default configuration
 * Base URL points to Tenant API namespace (/api/v1)
 * Timeout can be configured via environment variables
 */
const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1',
    timeout: 10000, // 10 seconds
    headers: {
        'Content-Type': 'application/json',
    },
});

/**
 * Request Interceptor
 * Automatically adds authentication token to all requests
 * Logs all outgoing requests for debugging
 * Implements circuit breaker for network failures
 */
api.interceptors.request.use(
    (config) => {
        // Check circuit breaker
        if (circuitBreakerActive && Date.now() < circuitBreakerUntil) {
            const errorKey = errorThrottle.createCircuitBreakerKey();
            if (errorThrottle.shouldLog(errorKey, 'API circuit breaker active')) {
                console.warn('🔌 API circuit breaker active - server appears to be down');
            }
            return Promise.reject({
                message: 'API circuit breaker active - server appears to be down',
                circuitBreaker: true
            });
        }

        // Reset circuit breaker if time has passed
        if (circuitBreakerActive && Date.now() >= circuitBreakerUntil) {
            console.log('🔌 API circuit breaker reset - attempting requests again');
            circuitBreakerActive = false;
        }

        logger.debug(`API Request: ${config.method?.toUpperCase()} ${config.url}`);

        // Add Tenant JWT authentication token if available
        const tenantToken = localStorage.getItem('tenant_token') || localStorage.getItem('token');
        if (tenantToken) {
            config.headers.Authorization = `Bearer ${tenantToken}`;
        }
        
        return config;
    },
    (error) => {
        logger.error('API Request Error', { error: error.message });
        return Promise.reject(error);
    }
);

/**
 * Response Interceptor
 * Handles responses and errors globally:
 * - Extracts data from successful responses
 * - Handles 401 (Unauthorized) by redirecting to login
 * - Handles 403 (Forbidden) silently (expected for restricted endpoints)
 * - Logs errors for debugging
 * - Provides consistent error format
 */
api.interceptors.response.use(
    (response) => {
        logger.debug(`API Response: ${response.config.method?.toUpperCase()} ${response.config.url} - Status: ${response.status}`);

        // Reset circuit breaker on successful response
        resetCircuitBreaker();

        // Extract data from response for cleaner usage
        return response.data !== undefined ? response.data : response;
    },
    (error) => {
        // Handle circuit breaker errors
        if (error.circuitBreaker) {
            return Promise.reject(error);
        }

        // Handle different error scenarios
        if (error.response) {
            // Server responded with error status (4xx, 5xx)
            const { status, data } = error.response;

            // Reset circuit breaker if we got a response (server is up)
            resetCircuitBreaker();

            // Only log errors that aren't expected 403s (permission denied)
            // 403s are expected for users accessing restricted endpoints
            if (status !== 403) {
                const method = error.config?.method?.toUpperCase();
                const url = error.config?.url || '';
                const isPlainPassword404 = status === 404 && url.endsWith('/plain-password');
                if (isPlainPassword404) {
                    logger.debug(`API ${method} ${url} - Status: ${status} (expected)`);
                } else {
                    logger.apiCall(
                        method,
                        url,
                        status,
                        new Error(data.error || data.message || 'An error occurred')
                    );
                }
            }

            // Handle 401 Unauthorized - log but don't automatically redirect
            // Let the AuthContext handle the redirect logic
            if (status === 401) {
                logger.warn('Unauthorized access detected', {
                    url: error.config?.url,
                    method: error.config?.method
                });
                // Don't automatically clear storage or redirect
                // Let the calling component handle this
            }

            // Return error with full context
            return Promise.reject({
                message: data.error || data.message || 'An error occurred',
                status: status,
                data: data
            });
        } else if (error.request) {
            // Request was made but no response received (network error)
            consecutiveNetworkFailures++;
            
            if (shouldActivateCircuitBreaker()) {
                activateCircuitBreaker();
            }

            // Throttle network error logging
            const errorKey = errorThrottle.createNetworkErrorKey(error.config?.url, error.config?.method);
            if (errorThrottle.shouldLog(errorKey, 'Network error - no response received')) {
                logger.error('Network error - no response received', {
                    url: error.config?.url,
                    method: error.config?.method,
                    consecutiveFailures: consecutiveNetworkFailures
                });
            }

            return Promise.reject({
                message: 'Network error. Please check your connection.',
                request: error.request
            });
        } else {
            // Something happened in setting up the request
            logger.error('API request setup error', { error: error.message });
            return Promise.reject({
                message: error.message || 'An unexpected error occurred'
            });
        }
    }
);

export default api;
