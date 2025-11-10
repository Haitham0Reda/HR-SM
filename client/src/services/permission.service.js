import api from './api';

const permissionService = {
    getAll: async (params) => await api.get('/permissions', { params }),
    getById: async (id) => await api.get(`/permissions/${id}`),
    create: async (data) => await api.post('/permissions', data),
    update: async (id, data) => await api.put(`/permissions/${id}`, data),
    delete: async (id) => await api.delete(`/permissions/${id}`),
    approve: async (id, comments) => await api.post(`/permissions/${id}/approve`, { comments }),
    reject: async (id, reason) => await api.post(`/permissions/${id}/reject`, { reason }),
};

export default permissionService;
