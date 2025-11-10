import api from './api';

const vacationService = {
    getAll: async (params) => await api.get('/mixed-vacations', { params }),
    getById: async (id) => await api.get(`/mixed-vacations/${id}`),
    create: async (data) => await api.post('/mixed-vacations', data),
    update: async (id, data) => await api.put(`/mixed-vacations/${id}`, data),
    delete: async (id) => await api.delete(`/mixed-vacations/${id}`),
};

export default vacationService;
