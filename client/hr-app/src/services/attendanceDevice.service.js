import api from './api';

const attendanceDeviceService = {
    // Get all devices
    getAllDevices: async () => {
        return await api.get('/attendance-devices');
    },

    // Get device by ID
    getDeviceById: async (id) => {
        return await api.get(`/attendance-devices/${id}`);
    },

    // Register new device
    registerDevice: async (deviceData) => {
        return await api.post('/attendance-devices/register', deviceData);
    },

    // Update device
    updateDevice: async (id, deviceData) => {
        return await api.put(`/attendance-devices/${id}`, deviceData);
    },

    // Delete device
    deleteDevice: async (id) => {
        return await api.delete(`/attendance-devices/${id}`);
    },

    // Test device connection
    testConnection: async (id) => {
        return await api.post(`/attendance-devices/${id}/test-connection`);
    },

    // Sync device
    syncDevice: async (id) => {
        return await api.post(`/attendance-devices/${id}/sync`);
    },

    // Sync all devices
    syncAllDevices: async () => {
        return await api.post('/attendance-devices/sync-all');
    },

    // Get device statistics
    getDeviceStats: async () => {
        return await api.get('/attendance-devices/stats');
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
        // For FormData, we might need to handle differently, but let's keep it simple for now
        return response;
    },

    // Get today's attendance
    getTodayAttendance: async () => {
        return await api.get('/attendance/today');
    },

    // Get monthly attendance
    getMonthlyAttendance: async (year, month) => {
        return await api.get('/attendance/monthly', {
            params: { year, month }
        });
    },

    // Manual check-in
    manualCheckIn: async (data) => {
        return await api.post('/attendance/manual/checkin', data);
    },

    // Manual check-out
    manualCheckOut: async (data) => {
        return await api.post('/attendance/manual/checkout', data);
    }
};

export default attendanceDeviceService;
