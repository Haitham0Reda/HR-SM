import axios from 'axios';

// Create axios instance with default config
const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor - Add auth token to requests
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor - Handle errors globally
api.interceptors.response.use(
    (response) => {
        console.log('API Response:', response.config.url, response.data);
        return response.data;
    },
    (error) => {
        // Handle different error scenarios
        if (error.response) {
            // Server responded with error status
            const { status, data } = error.response;

            // Only log errors that aren't expected 403s (permission denied)
            // 403s are expected for users accessing restricted endpoints
            if (status !== 403) {
                console.error('API Error:', error);
                console.error('Error response:', status, data);
            }

            if (status === 401) {
                // Unauthorized - clear token and redirect to login
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
            }

            // Return error with full context
            return Promise.reject({
                message: data.error || data.message || 'An error occurred',
                status: status,
                data: data
            });
        } else if (error.request) {
            // Request made but no response
            console.error('API Error:', error);
            console.error('No response received:', error.request);
            return Promise.reject({
                message: 'Network error. Please check your connection.',
                request: error.request
            });
        } else {
            // Something else happened
            console.error('API Error:', error);
            console.error('Request setup error:', error.message);
            return Promise.reject({
                message: error.message || 'An unexpected error occurred'
            });
        }
    }
);

export default api;
