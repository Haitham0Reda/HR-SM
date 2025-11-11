import api from './api';

const leaveService = {
    getAll: async (params) => {
        // api interceptor already returns response.data
        const data = await api.get('/leaves', { params });
        return data;
    },
    getById: async (id) => {
        const data = await api.get(`/leaves/${id}`);
        return data;
    },
    create: async (data) => {
        // Check if data is FormData (for file uploads)
        const config = data instanceof FormData ? {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        } : {};
        const result = await api.post('/leaves', data, config);
        return result;
    },
    update: async (id, data) => {
        const result = await api.put(`/leaves/${id}`, data);
        return result;
    },
    delete: async (id) => {
        const result = await api.delete(`/leaves/${id}`);
        return result;
    },
    getBalance: async (userId) => {
        const data = await api.get(`/leaves/balance/${userId}`);
        return data;
    },
};

export default leaveService;
