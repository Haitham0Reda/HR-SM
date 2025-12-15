import api from './api';

const hardCopyService = {
    getAll: async (params) => await api.get('/hardcopies', { params }),
    getById: async (id) => await api.get(`/hardcopies/${id}`),
    create: async (data) => await api.post('/hardcopies', data),
    update: async (id, data) => await api.put(`/hardcopies/${id}`, data),
    delete: async (id) => await api.delete(`/hardcopies/${id}`),
    upload: async (formData) => {
        return await api.post('/hardcopies/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    },
};

export default hardCopyService;