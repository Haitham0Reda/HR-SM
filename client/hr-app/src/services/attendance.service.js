import api from './api';

const attendanceService = {
    getAll: async (params) => await api.get('/attendance', { params }),
    getById: async (id) => await api.get(`/attendance/${id}`),
    create: async (data) => await api.post('/attendance', data),
    update: async (id, data) => await api.put(`/attendance/${id}`, data),
    delete: async (id) => await api.delete(`/attendance/${id}`),
    checkIn: async (data) => await api.post('/attendance/check-in', data),
    checkOut: async (data) => await api.post('/attendance/check-out', data),
    
    // New methods for enhanced filtering
    getTodayAttendance: async (params) => await api.get('/attendance/today', { params }),
    getMonthlyAttendance: async (params) => await api.get('/attendance/monthly', { params }),
    getDepartmentStats: async (params) => await api.get('/attendance/departments', { params }),
};

export default attendanceService;
