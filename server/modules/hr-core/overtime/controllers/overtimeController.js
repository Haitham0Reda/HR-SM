// Overtime Controller - Moved to HR-Core module
import OvertimeService from '../services/OvertimeService.js';
import logger from '../../../../utils/logger.js';

const overtimeService = new OvertimeService();

export const getAllOvertime = async (req, res) => {
    try {
        const tenantId = req.tenant?.tenantId || req.tenantId;
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant context required' });
        }
        
        const overtime = await overtimeService.getAllOvertime(tenantId);
        res.json({ success: true, data: overtime });
    } catch (err) {
        logger.error('Error fetching overtime:', err);
        res.status(500).json({ error: err.message });
    }
};

export const createOvertime = async (req, res) => {
    try {
        const tenantId = req.tenant?.tenantId || req.tenantId;
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant context required' });
        }
        
        const overtime = await overtimeService.createOvertime(req.body, tenantId);
        res.status(201).json({ success: true, data: overtime });
    } catch (err) {
        logger.error('Error creating overtime:', err);
        res.status(400).json({ error: err.message });
    }
};

export const getOvertimeById = async (req, res) => {
    try {
        const tenantId = req.tenant?.tenantId || req.tenantId;
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant context required' });
        }
        
        const overtime = await overtimeService.getOvertimeById(req.params.id, tenantId);
        res.json({ success: true, data: overtime });
    } catch (err) {
        logger.error('Error fetching overtime:', err);
        const statusCode = err.message === 'Overtime record not found' ? 404 : 500;
        res.status(statusCode).json({ error: err.message });
    }
};

export const updateOvertime = async (req, res) => {
    try {
        const tenantId = req.tenant?.tenantId || req.tenantId;
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant context required' });
        }
        
        const overtime = await overtimeService.updateOvertime(req.params.id, req.body, tenantId);
        res.json({ success: true, data: overtime });
    } catch (err) {
        logger.error('Error updating overtime:', err);
        const statusCode = err.message === 'Overtime record not found' ? 404 : 400;
        res.status(statusCode).json({ error: err.message });
    }
};

export const deleteOvertime = async (req, res) => {
    try {
        const tenantId = req.tenant?.tenantId || req.tenantId;
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant context required' });
        }
        
        const result = await overtimeService.deleteOvertime(req.params.id, tenantId);
        res.json({ success: true, message: result.message });
    } catch (err) {
        logger.error('Error deleting overtime:', err);
        const statusCode = err.message === 'Overtime record not found' ? 404 : 500;
        res.status(statusCode).json({ error: err.message });
    }
};
