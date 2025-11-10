import api from './api';

const holidayService = {
    getAll: async (params) => await api.get('/holidays', { params }),
    getById: async (id) => await api.get(`/holidays/${id}`),
    create: async (data) => await api.post('/holidays', data),
    update: async (id, data) => await api.put(`/holidays/${id}`, data),
    delete: async (id) => await api.delete(`/holidays/${id}`),
};

export default holidayService;
