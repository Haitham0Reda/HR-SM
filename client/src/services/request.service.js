import api from './api';

const requestService = {
    getAll: async (params) => await api.get('/requests', { params }),
    getById: async (id) => await api.get(`/requests/${id}`),
    create: async (data) => await api.post('/requests', data),
    update: async (id, data) => await api.put(`/requests/${id}`, data),
    delete: async (id) => await api.delete(`/requests/${id}`),
    approve: async (id) => await api.put(`/requests/${id}/approve`),
    reject: async (id, reason) => await api.put(`/requests/${id}/reject`, { reason }),
};

export default requestService;
