import api from './api';

const leaveService = {
    getAll: async (params) => await api.get('/leaves', { params }),
    getById: async (id) => await api.get(`/leaves/${id}`),
    create: async (data) => await api.post('/leaves', data),
    update: async (id, data) => await api.put(`/leaves/${id}`, data),
    delete: async (id) => await api.delete(`/leaves/${id}`),
    getBalance: async (userId) => await api.get(`/leaves/balance/${userId}`),
};

export default leaveService;
