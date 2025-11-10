import api from './api';

const positionService = {
    getAll: async (params) => await api.get('/positions', { params }),
    getById: async (id) => await api.get(`/positions/${id}`),
    create: async (data) => await api.post('/positions', data),
    update: async (id, data) => await api.put(`/positions/${id}`, data),
    delete: async (id) => await api.delete(`/positions/${id}`),
};

export default positionService;
