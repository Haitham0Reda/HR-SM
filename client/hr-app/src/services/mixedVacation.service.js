import api from './api';

const mixedVacationService = {
    getAll: async () => {
        const response = await api.get('/mixed-vacations');
        return response.data;
    },

    getById: async (id) => {
        const response = await api.get(`/mixed-vacations/${id}`);
        return response.data;
    },

    create: async (data) => {
        const response = await api.post('/mixed-vacations', data);
        return response.data;
    },

    update: async (id, data) => {
        const response = await api.put(`/mixed-vacations/${id}`, data);
        return response.data;
    },

    delete: async (id) => {
        const response = await api.delete(`/mixed-vacations/${id}`);
        return response.data;
    },
};

export default mixedVacationService;
