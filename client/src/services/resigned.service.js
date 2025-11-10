import api from './api';

const resignedService = {
    getAll: async (params) => await api.get('/resigned-employees', { params }),
    getById: async (id) => await api.get(`/resigned-employees/${id}`),
    create: async (data) => await api.post('/resigned-employees', data),
    update: async (id, data) => await api.put(`/resigned-employees/${id}`, data),
    delete: async (id) => await api.delete(`/resigned-employees/${id}`),
};

export default resignedService;
