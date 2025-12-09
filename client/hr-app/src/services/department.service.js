import api from './api';

const departmentService = {
    getAll: async (params) => await api.get('/departments', { params }),
    getById: async (id) => await api.get(`/departments/${id}`),
    create: async (data) => await api.post('/departments', data),
    update: async (id, data) => await api.put(`/departments/${id}`, data),
    delete: async (id) => await api.delete(`/departments/${id}`),
};

export default departmentService;
