import api from './api';

// Updated auth service to use correct endpoints and multi-tenant authentication
const authService = {
    // Login user
    login: async (credentials) => {
        const response = await api.post('/auth/login', credentials);
        if (response?.data?.token) {
            localStorage.setItem('tenant_token', response.data.token);
            localStorage.setItem('tenant_id', response.data.user?.tenantId);
            // Remove old token format
            localStorage.removeItem('token');
        }
        return response;
    },

    // Logout user
    logout: () => {
        localStorage.removeItem('tenant_token');
        localStorage.removeItem('tenant_id');
        localStorage.removeItem('token');
    },

    // Get current user
    getCurrentUser: () => {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    },

    // Get current user token
    getToken: () => {
        return localStorage.getItem('tenant_token') || localStorage.getItem('token');
    },

    // Check if user is authenticated
    isAuthenticated: () => {
        return !!(localStorage.getItem('tenant_token') || localStorage.getItem('token'));
    },

    // Get user profile
    getProfile: async () => {
        return await api.get('/auth/me');
    },
};

export default authService;