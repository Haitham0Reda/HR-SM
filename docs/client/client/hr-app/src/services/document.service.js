import api from './api';

const documentService = {
    getAll: async (params) => await api.get('/documents', { params }),
    getById: async (id) => await api.get(`/documents/${id}`),
    create: async (data) => await api.post('/documents', data),
    update: async (id, data) => await api.put(`/documents/${id}`, data),
    delete: async (id) => await api.delete(`/documents/${id}`),
    upload: async (formData) => await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
};

export default documentService;
