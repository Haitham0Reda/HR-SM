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
 * Base URL and timeout can be configured via environment variables
 */
const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
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
        console.log('API Request:', config);
        logger.debug(`API Request: ${config.method?.toUpperCase()} ${config.url}`);

        // Add authentication token if available
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
            console.log('Added auth token to request');
        } else {
            console.log('No auth token found');
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
        console.log('API Response:', response.config.url, response);
        logger.debug(`API Response: ${response.config.method?.toUpperCase()} ${response.config.url} - Status: ${response.status}`);

        // Extract data from response for cleaner usage
        return response.data !== undefined ? response.data : response;
    },
    (error) => {
        // Handle different error scenarios
        if (error.response) {
            // Server responded with error status (4xx, 5xx)
            const { status, data } = error.response;
            console.log('API Error Response:', status, data);

            // Only log errors that aren't expected 403s (permission denied)
            // 403s are expected for users accessing restricted endpoints
            if (status !== 403) {
                console.error('API Error:', error);
                console.error('Error response:', status, data);
                logger.apiCall(
                    error.config?.method?.toUpperCase(),
                    error.config?.url,
                    status,
                    new Error(data.error || data.message || 'An error occurred')
                );
            }

            // Handle 401 Unauthorized - clear auth and redirect to login
            if (status === 401) {
                console.log('Unauthorized access, redirecting to login');
                logger.warn('Unauthorized access - redirecting to login');
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/';
            }

            // Return error with full context
            return Promise.reject({
                message: data.error || data.message || 'An error occurred',
                status: status,
                data: data
            });
        } else if (error.request) {
            // Request was made but no response received (network error)
            console.error('API Error:', error);
            console.error('No response received:', error.request);
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
            console.error('API Error:', error);
            console.error('Request setup error:', error.message);
            logger.error('API request setup error', { error: error.message });
            return Promise.reject({
                message: error.message || 'An unexpected error occurred'
            });
        }
    }
);

export default api;
