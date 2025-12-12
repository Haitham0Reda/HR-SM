import axios from 'axios';

// Create axios instance for platform API
const platformApi = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api/platform',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
platformApi.interceptors.request.use(
  (config) => {
    // Add any request modifications here
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
platformApi.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle common errors
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;

      if (status === 401) {
        // Unauthorized - redirect to login
        window.location.href = '/login';
      } else if (status === 403) {
        // Forbidden
        console.error('Access forbidden:', data.error?.message);
      } else if (status === 500) {
        // Server error
        console.error('Server error:', data.error?.message);
      }
    } else if (error.request) {
      // Request made but no response
      console.error('No response from server');
    } else {
      // Error in request setup
      console.error('Request error:', error.message);
    }

    return Promise.reject(error);
  }
);

export default platformApi;
