import api from './api';

const salaryService = {
    // Get all salaries with pagination
    getAll: async (params) => await api.get('/payroll/salaries', { params }),
    
    // Get current salary for employee
    getCurrentSalary: async (employeeId) => await api.get(`/payroll/salaries/employee/${employeeId}/current`),
    
    // Get salary history for employee
    getSalaryHistory: async (employeeId) => await api.get(`/payroll/salaries/employee/${employeeId}/history`),
    
    // Create new salary
    create: async (data) => await api.post('/payroll/salaries', data),
    
    // Update salary
    update: async (id, data) => await api.put(`/payroll/salaries/${id}`, data),
    
    // Delete salary
    delete: async (id) => await api.delete(`/payroll/salaries/${id}`)
};

export default salaryService;