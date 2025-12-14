import api from './api';

// Task API functions
export const taskService = {
    // Get all tasks for current user
    getUserTasks: async () => {
        try {
            const response = await api.get('/tasks');
            return response.data || response;
        } catch (error) {
            throw new Error(error.message || 'Failed to fetch tasks');
        }
    },

    // Get task by ID
    getTaskById: async (taskId) => {
        try {
            const response = await api.get(`/tasks/${taskId}`);
            return response.data || response;
        } catch (error) {
            throw new Error(error.message || 'Failed to fetch task');
        }
    },

    // Create a new task
    createTask: async (taskData) => {
        try {
            const response = await api.post('/tasks', taskData);
            return response.data || response;
        } catch (error) {
            throw new Error(error.message || 'Failed to create task');
        }
    },

    // Update task
    updateTask: async (taskId, taskData) => {
        try {
            const response = await api.put(`/tasks/${taskId}`, taskData);
            return response.data || response;
        } catch (error) {
            throw new Error(error.message || 'Failed to update task');
        }
    },

    // Delete task
    deleteTask: async (taskId) => {
        try {
            const response = await api.delete(`/tasks/${taskId}`);
            return response.data || response;
        } catch (error) {
            throw new Error(error.message || 'Failed to delete task');
        }
    },

    // Update task status
    updateTaskStatus: async (taskId, status) => {
        try {
            const response = await api.put(`/tasks/${taskId}/status`, { status });
            return response.data || response;
        } catch (error) {
            throw new Error(error.message || 'Failed to update task status');
        }
    },

    // Get task reports
    getTaskReports: async (taskId) => {
        try {
            const response = await api.get(`/tasks/${taskId}/reports`);
            return response.data || response;
        } catch (error) {
            throw new Error(error.message || 'Failed to fetch task reports');
        }
    },

    // Create or update task report
    upsertTaskReport: async (taskId, reportData) => {
        try {
            const response = await api.post(`/tasks/${taskId}/reports`, reportData);
            return response.data || response;
        } catch (error) {
            throw new Error(error.message || 'Failed to save task report');
        }
    },

    // Submit task report
    submitTaskReport: async (taskId) => {
        try {
            const response = await api.post(`/tasks/${taskId}/reports/submit`, {});
            return response.data || response;
        } catch (error) {
            throw new Error(error.message || 'Failed to submit task report');
        }
    },

    // Review task report
    reviewTaskReport: async (taskId, reviewData) => {
        try {
            const response = await api.post(`/tasks/${taskId}/reports/review`, reviewData);
            return response.data || response;
        } catch (error) {
            throw new Error(error.message || 'Failed to review task report');
        }
    },

    // Upload file for task report
    uploadReportFile: async (taskId, file) => {
        try {
            const formData = new FormData();
            formData.append('file', file);

            // Use fetch for file upload to handle FormData properly
            const response = await fetch(`${process.env.REACT_APP_API_URL}/tasks/${taskId}/reports/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('tenant_token')}`
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            return await response.json();
        } catch (error) {
            throw new Error(error.message || 'Failed to upload file');
        }
    },

    // Download report file
    downloadReportFile: async (fileId) => {
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/tasks/files/${fileId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('tenant_token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Download failed');
            }

            // Create a download link
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', fileId);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            throw new Error(error.message || 'Failed to download file');
        }
    }
};

export default taskService;