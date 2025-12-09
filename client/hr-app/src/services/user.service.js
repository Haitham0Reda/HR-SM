import api from './api';

const userService = {
    // Get all users
    getAll: async (params) => {
        console.log('UserService: Fetching all users with params:', params);
        try {
            const response = await api.get('/users', { params });
            console.log('UserService: Received response:', response);
            return response;
        } catch (error) {
            console.error('UserService: Error fetching users:', error);
            throw error;
        }
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

    // Update current user profile
    updateProfile: async (data) => {
        return await api.put('/users/profile', data);
    },

    // Upload profile picture
    uploadProfilePicture: async (id, formData) => {
        return await api.post(`/users/${id}/profile-picture`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
    },

    // Get user plain password (for credential generation)
    getPlainPassword: async (id) => {
        return await api.get(`/users/${id}/plain-password`);
    },

    // Update vacation balance for a single user
    updateVacationBalance: async (userId, balanceData) => {
        return await api.put(`/users/${userId}/vacation-balance`, balanceData);
    },

    // Bulk update vacation balances
    bulkUpdateVacationBalances: async (updates) => {
        return await api.post('/users/bulk-update-vacation-balances', { updates });
    },

    // Bulk create users from Excel file
    bulkCreateFromExcel: async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return await api.post('/users/bulk-create', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
    },
};

export default userService;