import api from './api';

const surveyService = {
    getAll: async (params) => await api.get('/surveys', { params }),
    getMySurveys: async () => await api.get('/surveys/my-surveys'),
    getById: async (id) => await api.get(`/surveys/${id}`),
    create: async (data) => await api.post('/surveys', data),
    update: async (id, data) => await api.put(`/surveys/${id}`, data),
    delete: async (id) => await api.delete(`/surveys/${id}`),
    submit: async (id, responses) => await api.post(`/surveys/${id}/respond`, { responses }),
    getResults: async (id) => await api.get(`/surveys/${id}/statistics`),
};

export default surveyService;