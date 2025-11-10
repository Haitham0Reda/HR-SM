import api from './api';

const userService = {
    // Get all users
    getAll: async (params) => {
        return await api.get('/users', { params });
    },

    // Get user by ID
    getById: async (id) => {
        return await api.get(`/users/${id}`);
    },

    // Create user
    create: async (data) => {
        return await api.post('/users', data);
    },

    // Update user
    update: async (id, data) => {
        return await api.put(`/users/${id}`, data);
    },

    // Delete user
    delete: async (id) => {
        return await api.delete(`/users/${id}`);
    },

    // Get current user profile
    getProfile: async () => {
        return await api.get('/users/profile');
    },
};

export default userService;
