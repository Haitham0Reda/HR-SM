import api from './api';

const leaveService = {
    getAll: async (params) => {
        // api interceptor already returns response.data
        const data = await api.get('/leaves', { params });
        return data;
    },
    getById: async (id) => {
        const data = await api.get(`/leaves/${id}`);
        return data;
    },
    create: async (data) => {
        // Check if data is FormData (for file uploads)
        const config = data instanceof FormData ? {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        } : {};
        const result = await api.post('/leaves', data, config);
        return result;
    },
    update: async (id, data) => {
        const result = await api.put(`/leaves/${id}`, data);
        // If status is being updated, dispatch notification update event
        if (data && (data.status === 'approved' || data.status === 'rejected')) {
            // Add a small delay to ensure server has time to create notification
            await new Promise(resolve => setTimeout(resolve, 500));
            // Dispatch notification update event
            window.dispatchEvent(new CustomEvent('notificationUpdate'));
        }
        return result;
    },
    delete: async (id) => {
        const result = await api.delete(`/leaves/${id}`);
        return result;
    },
    approve: async (id) => {
        const result = await api.put(`/leaves/${id}`, { status: 'approved' });
        return result;
    },
    reject: async (id) => {
        const result = await api.put(`/leaves/${id}`, { status: 'rejected' });
        return result;
    },
    getBalance: async (userId) => {
        const data = await api.get(`/leaves/balance/${userId}`);
        return data;
    },
    approve: async (id, notes = '') => {
        const result = await api.post(`/leaves/${id}/approve`, { notes });
        // Add a small delay to ensure server has time to create notification
        await new Promise(resolve => setTimeout(resolve, 500));
        // Dispatch notification update event
        window.dispatchEvent(new CustomEvent('notificationUpdate'));
        return result;
    },
    reject: async (id, reason) => {
        const result = await api.post(`/leaves/${id}/reject`, { reason });
        // Add a small delay to ensure server has time to create notification
        await new Promise(resolve => setTimeout(resolve, 500));
        // Dispatch notification update event
        window.dispatchEvent(new CustomEvent('notificationUpdate'));
        return result;
    },
    approveSickLeaveByDoctor: async (id, notes = '') => {
        const result = await api.post(`/leaves/${id}/approve-doctor`, { notes });
        // Add a small delay to ensure server has time to create notification
        await new Promise(resolve => setTimeout(resolve, 500));
        // Dispatch notification update event
        window.dispatchEvent(new CustomEvent('notificationUpdate'));
        return result;
    },
    rejectSickLeaveByDoctor: async (id, reason) => {
        const result = await api.post(`/leaves/${id}/reject-doctor`, { reason });
        // Add a small delay to ensure server has time to create notification
        await new Promise(resolve => setTimeout(resolve, 500));
        // Dispatch notification update event
        window.dispatchEvent(new CustomEvent('notificationUpdate'));
        return result;
    },
    getPendingDoctorReview: async () => {
        const data = await api.get('/leaves/pending-doctor-review');
        return data;
    },
};

export default leaveService;