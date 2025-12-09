import api from './api';

const templateService = {
    getAll: async (params) => await api.get('/document-templates', { params }),
    getById: async (id) => await api.get(`/document-templates/${id}`),
    create: async (data) => await api.post('/document-templates', data),
    update: async (id, data) => await api.put(`/document-templates/${id}`, data),
    delete: async (id) => await api.delete(`/document-templates/${id}`),
};

export default templateService;
