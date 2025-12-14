import api from './api';

const resignedService = {
    getAll: async (params) => {
        const response = await api.get('/resigned-employees', { params });
        // Handle both possible response structures
        if (Array.isArray(response)) {
            return response;
        }
        return response?.data || response?.resignedEmployees || [];
    },
    getById: async (id) => await api.get(`/resigned-employees/${id}`),
    create: async (data) => await api.post('/resigned-employees', data),
    update: async (id, data) => await api.put(`/resigned-employees/${id}`, data),
    delete: async (id) => await api.delete(`/resigned-employees/${id}`),
};

export default resignedService;