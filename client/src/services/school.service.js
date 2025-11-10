import api from './api';

const schoolService = {
    getAll: async (params) => await api.get('/schools', { params }),
    getById: async (id) => await api.get(`/schools/${id}`),
    create: async (data) => await api.post('/schools', data),
    update: async (id, data) => await api.put(`/schools/${id}`, data),
    delete: async (id) => await api.delete(`/schools/${id}`),
};

export default schoolService;
