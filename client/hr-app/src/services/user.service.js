import api from './api';

const userService = {
    // Get all users
    getAll: async (params) => {
        if (process.env.NODE_ENV === 'development') {
            console.log('UserService: Fetching all users with params:', params);
        }
        try {
            const response = await api.get('/users', { params });
            if (process.env.NODE_ENV === 'development') {
                console.log('UserService: Received response:', response);
            }
            return response;
        } catch (error) {
            console.error('UserService: Error fetching users:', error);
            throw error;
        }
    },

    // Get user by ID
    getById: async (id) => {
        try {
            if (process.env.NODE_ENV === 'development') {
                console.log(`UserService: Fetching user by ID: ${id}`);
            }
            const response = await api.get(`/users/${id}`);
            console.log('UserService: Successfully fetched user:', response.data);
            return response;
        } catch (error) {
            console.error(`UserService: Error fetching user ${id}:`, error);
            
            // Provide more specific error messages
            if (error.response?.status === 500) {
                console.error('UserService: Server error - possible database or schema issue');
            } else if (error.response?.status === 404) {
                console.error('UserService: User not found');
            } else if (error.response?.status === 401) {
                console.error('UserService: Authentication required');
            }
            
            throw error;
        }
    },

    // Create user
    create: async (data) => {
        try {
            console.log('UserService: Creating user with data:', data);
            const response = await api.post('/users', data);
            console.log('UserService: User created successfully:', response.data);
            
            // Check if email was auto-generated
            if (response.data.message && response.data.message.includes('Email auto-generated')) {
                console.log('UserService: Email was auto-generated:', response.data.message);
            }
            
            return response;
        } catch (error) {
            console.error('UserService: Error creating user:', error);
            throw error;
        }
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
        try {
            const result = await api.get(`/users/${id}/plain-password`);
            return result;
        } catch (err) {
            if (err?.status === 404) {
                return { plainPassword: null, status: 404 };
            }
            throw err;
        }
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
