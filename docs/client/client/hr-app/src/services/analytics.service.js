import api from './api';

const analyticsService = {
    getDashboard: async () => await api.get('/analytics/dashboard'),
    getAttendance: async (params) => await api.get('/analytics/attendance', { params }),
    getLeaves: async (params) => await api.get('/analytics/leaves', { params }),
    getPayroll: async (params) => await api.get('/analytics/payroll', { params }),
    getKPIs: async () => await api.get('/analytics/kpis'),
};

export default analyticsService;
