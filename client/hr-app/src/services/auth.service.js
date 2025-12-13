import api from './api';

// Fixed login endpoint to use /users/login instead of /auth/login
const authService = {
    // Login user
    login: async (credentials) => {
        const response = await api.post('/auth/login', credentials);
        if (response?.token) {
            localStorage.setItem('token', response.token);
            localStorage.setItem('user', JSON.stringify(response.user));
        }
        return response;
    },

    // Logout user
    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    },

    // Get current user
    getCurrentUser: () => {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    },

    // Get current user token
    getToken: () => {
        return localStorage.getItem('token');
    },

    // Check if user is authenticated
    isAuthenticated: () => {
        return !!localStorage.getItem('token');
    },

    // Get user profile
    getProfile: async () => {
        return await api.get('/users/profile');
    },
};

export default authService;
