import axios from 'axios';
import authService from './auth.service';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

const getAuthHeaders = () => {
    const token = authService.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
};

// Task API functions
export const taskService = {
    // Get all tasks for current user
    getUserTasks: async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/tasks`, {
                headers: getAuthHeaders()
            });
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.error || 'Failed to fetch tasks');
        }
    },

    // Get task by ID
    getTaskById: async (taskId) => {
        try {
            const response = await axios.get(`${API_BASE_URL}/tasks/${taskId}`, {
                headers: getAuthHeaders()
            });
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.error || 'Failed to fetch task');
        }
    },

    // Create a new task
    createTask: async (taskData) => {
        try {
            const response = await axios.post(`${API_BASE_URL}/tasks`, taskData, {
                headers: getAuthHeaders()
            });
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.error || 'Failed to create task');
        }
    },

    // Update task
    updateTask: async (taskId, taskData) => {
        try {
            const response = await axios.put(`${API_BASE_URL}/tasks/${taskId}`, taskData, {
                headers: getAuthHeaders()
            });
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.error || 'Failed to update task');
        }
    },

    // Delete task
    deleteTask: async (taskId) => {
        try {
            const response = await axios.delete(`${API_BASE_URL}/tasks/${taskId}`, {
                headers: getAuthHeaders()
            });
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.error || 'Failed to delete task');
        }
    },

    // Update task status
    updateTaskStatus: async (taskId, status) => {
        try {
            const response = await axios.put(`${API_BASE_URL}/tasks/${taskId}/status`,
                { status },
                { headers: getAuthHeaders() }
            );
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.error || 'Failed to update task status');
        }
    },

    // Get task reports
    getTaskReports: async (taskId) => {
        try {
            const response = await axios.get(`${API_BASE_URL}/tasks/${taskId}/reports`, {
                headers: getAuthHeaders()
            });
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.error || 'Failed to fetch task reports');
        }
    },

    // Create or update task report
    upsertTaskReport: async (taskId, reportData) => {
        try {
            const response = await axios.post(`${API_BASE_URL}/tasks/${taskId}/reports`, reportData, {
                headers: getAuthHeaders()
            });
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.error || 'Failed to save task report');
        }
    },

    // Submit task report
    submitTaskReport: async (taskId) => {
        try {
            const response = await axios.post(`${API_BASE_URL}/tasks/${taskId}/reports/submit`, {}, {
                headers: getAuthHeaders()
            });
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.error || 'Failed to submit task report');
        }
    },

    // Review task report
    reviewTaskReport: async (taskId, reviewData) => {
        try {
            const response = await axios.post(`${API_BASE_URL}/tasks/${taskId}/reports/review`, reviewData, {
                headers: getAuthHeaders()
            });
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.error || 'Failed to review task report');
        }
    },

    // Upload file for task report
    uploadReportFile: async (taskId, file) => {
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await axios.post(`${API_BASE_URL}/tasks/${taskId}/reports/upload`, formData, {
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'multipart/form-data'
                }
            });
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.error || 'Failed to upload file');
        }
    },

    // Download report file
    downloadReportFile: async (fileId) => {
        try {
            const response = await axios.get(`${API_BASE_URL}/tasks/files/${fileId}`, {
                headers: getAuthHeaders(),
                responseType: 'blob'
            });

            // Create a download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', fileId); // You might want to get the original filename from headers
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            throw new Error(error.response?.data?.error || 'Failed to download file');
        }
    }
};

export default taskService;