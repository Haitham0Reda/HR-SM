import api from './api';

const reportService = {
    getAll: async (params) => await api.get('/reports', { params }),
    getById: async (id) => await api.get(`/reports/${id}`),
    create: async (data) => await api.post('/reports', data),
    generate: async (id) => await api.post(`/reports/${id}/generate`),
    export: async (id, format) => await api.get(`/reports/${id}/export/${format}`),
};

export default reportService;
