import api from './api';

// Force cache bust with unique identifier
const SERVICE_VERSION = '2026-01-02-21-13-' + Math.random().toString(36).substr(2, 9);
console.log(`🔄 ForgetCheck Service v${SERVICE_VERSION} loading...`);

const forgetCheckService = {
    getAll: async (params) => {
        console.log(`🔍 [${SERVICE_VERSION}] ForgetCheck Service - getAll called`);
        // Add cache-busting parameter to ensure fresh data
        const cacheBustParams = { 
            ...params, 
            _t: Date.now(),
            v: SERVICE_VERSION 
        };
        const data = await api.get('/forget-checks', { params: cacheBustParams });
        return data;
    },
    getById: async (id) => {
        console.log(`🔍 [${SERVICE_VERSION}] ForgetCheck Service - getById called for ID: ${id}`);
        const data = await api.get(`/forget-checks/${id}`);
        return data;
    },
    create: async (data) => {
        console.log(`🔍 [${SERVICE_VERSION}] ForgetCheck Service - create called`);
        console.log(`🔍 [${SERVICE_VERSION}] Using endpoint: POST /forget-checks`);
        console.log(`🔍 [${SERVICE_VERSION}] Request data:`, JSON.stringify(data, null, 2));
        
        try {
            // Add cache-busting parameter
            const result = await api.post('/forget-checks?v=' + SERVICE_VERSION, data);
            console.log(`✅ [${SERVICE_VERSION}] ForgetCheck Service - create successful`);
            return result;
        } catch (error) {
            console.error(`❌ [${SERVICE_VERSION}] ForgetCheck Service - create failed:`, error);
            throw error;
        }
    },
    update: async (id, data) => {
        console.log(`🔍 [${SERVICE_VERSION}] ForgetCheck Service - update called for ID: ${id}`);
        const result = await api.put(`/forget-checks/${id}`, data);
        return result;
    },
    delete: async (id) => {
        console.log(`🔍 [${SERVICE_VERSION}] ForgetCheck Service - delete called for ID: ${id}`);
        const result = await api.delete(`/forget-checks/${id}`);
        return result;
    },
    approve: async (id) => {
        console.log(`🔍 [${SERVICE_VERSION}] ForgetCheck Service - approve called for ID: ${id}`);
        const result = await api.post(`/forget-checks/${id}/approve`);
        await new Promise(resolve => setTimeout(resolve, 500));
        window.dispatchEvent(new CustomEvent('notificationUpdate'));
        return result;
    },
    reject: async (id, reason) => {
        console.log(`🔍 [${SERVICE_VERSION}] ForgetCheck Service - reject called for ID: ${id}`);
        const result = await api.post(`/forget-checks/${id}/reject`, { reason });
        await new Promise(resolve => setTimeout(resolve, 500));
        window.dispatchEvent(new CustomEvent('notificationUpdate'));
        return result;
    }
};

// Add version identifier
forgetCheckService._version = SERVICE_VERSION;
console.log(`✅ ForgetCheck Service v${SERVICE_VERSION} loaded successfully`);

export default forgetCheckService;
