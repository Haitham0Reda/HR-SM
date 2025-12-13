/**
 * API Service
 * 
 * Centralized Axios instance with interceptors for:
 * - Automatic authentication token injection
 * - Global error handling
 * - Request/response logging
 * - Automatic token refresh on 401 errors
 */

import axios from 'axios';
import logger from '../utils/logger';

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
 */
api.interceptors.request.use(
    (config) => {
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

        // Extract data from response for cleaner usage
        return response.data !== undefined ? response.data : response;
    },
    (error) => {
        // Handle different error scenarios
        if (error.response) {
            // Server responded with error status (4xx, 5xx)
            const { status, data } = error.response;

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
            logger.error('Network error - no response received', {
                url: error.config?.url,
                method: error.config?.method
            });
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
