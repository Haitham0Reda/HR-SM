import api from './api';

const attendanceService = {
    getAll: async (params) => await api.get('/attendance', { params }),
    getById: async (id) => await api.get(`/attendance/${id}`),
    create: async (data) => await api.post('/attendance', data),
    update: async (id, data) => await api.put(`/attendance/${id}`, data),
    delete: async (id) => await api.delete(`/attendance/${id}`),
    checkIn: async (data) => await api.post('/attendance/check-in', data),
    checkOut: async (data) => await api.post('/attendance/check-out', data),
};

export default attendanceService;
