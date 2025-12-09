import api from './api';

const payrollService = {
    getAll: async (params) => await api.get('/payroll', { params }),
    getById: async (id) => await api.get(`/payroll/${id}`),
    create: async (data) => await api.post('/payroll', data),
    update: async (id, data) => await api.put(`/payroll/${id}`, data),
    delete: async (id) => await api.delete(`/payroll/${id}`),
};

export default payrollService;
