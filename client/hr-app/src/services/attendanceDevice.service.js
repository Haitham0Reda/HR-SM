import api from './api';

const attendanceDeviceService = {
    // Get all devices
    getAllDevices: async () => {
        const response = await api.get('/attendance-devices');
        return response.data;
    },

    // Get device by ID
    getDeviceById: async (id) => {
        const response = await api.get(`/attendance-devices/${id}`);
        return response.data;
    },

    // Register new device
    registerDevice: async (deviceData) => {
        const response = await api.post('/attendance-devices/register', deviceData);
        return response.data;
    },

    // Update device
    updateDevice: async (id, deviceData) => {
        const response = await api.put(`/attendance-devices/${id}`, deviceData);
        return response.data;
    },

    // Delete device
    deleteDevice: async (id) => {
        const response = await api.delete(`/attendance-devices/${id}`);
        return response.data;
    },

    // Test device connection
    testConnection: async (id) => {
        const response = await api.post(`/attendance-devices/${id}/test-connection`);
        return response.data;
    },

    // Sync device
    syncDevice: async (id) => {
        const response = await api.post(`/attendance-devices/${id}/sync`);
        return response.data;
    },

    // Sync all devices
    syncAllDevices: async () => {
        const response = await api.post('/attendance-devices/sync-all');
        return response.data;
    },

    // Get device statistics
    getDeviceStats: async () => {
        const response = await api.get('/attendance-devices/stats');
        return response.data;
    },

    // Import CSV
    importCSV: async (file, deviceId = null) => {
        const formData = new FormData();
        formData.append('file', file);
        if (deviceId) {
            formData.append('deviceId', deviceId);
        }

        const response = await api.post('/attendance-devices/import/csv', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    },

    // Get today's attendance
    getTodayAttendance: async () => {
        const response = await api.get('/attendance/today');
        return response.data;
    },

    // Get monthly attendance
    getMonthlyAttendance: async (year, month) => {
        const response = await api.get('/attendance/monthly', {
            params: { year, month }
        });
        return response.data;
    },

    // Manual check-in
    manualCheckIn: async (data) => {
        const response = await api.post('/attendance/manual/checkin', data);
        return response.data;
    },

    // Manual check-out
    manualCheckOut: async (data) => {
        const response = await api.post('/attendance/manual/checkout', data);
        return response.data;
    }
};

export default attendanceDeviceService;
