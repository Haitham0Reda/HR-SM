// Mission Controller - Moved to HR-Core module
import MissionService from '../services/MissionService.js';
import logger from '../../../../utils/logger.js';

const missionService = new MissionService();

export const getAllMissions = async (req, res) => {
    try {
        const { tenantId } = req.tenant || {};
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant context required' });
        }
        
        const missions = await missionService.getAllMissions(tenantId);
        res.json({ success: true, data: missions });
    } catch (err) {
        logger.error('Error fetching missions:', err);
        res.status(500).json({ error: err.message });
    }
};

export const createMission = async (req, res) => {
    try {
        const { tenantId } = req.tenant || {};
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant context required' });
        }
        
        const mission = await missionService.createMission(req.body, tenantId);
        res.status(201).json({ success: true, data: mission });
    } catch (err) {
        logger.error('Error creating mission:', err);
        res.status(400).json({ error: err.message });
    }
};

export const getMissionById = async (req, res) => {
    try {
        const { tenantId } = req.tenant || {};
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant context required' });
        }
        
        const mission = await missionService.getMissionById(req.params.id, tenantId);
        res.json({ success: true, data: mission });
    } catch (err) {
        logger.error('Error fetching mission:', err);
        const statusCode = err.message === 'Mission not found' ? 404 : 500;
        res.status(statusCode).json({ error: err.message });
    }
};

export const updateMission = async (req, res) => {
    try {
        const { tenantId } = req.tenant || {};
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant context required' });
        }
        
        const mission = await missionService.updateMission(req.params.id, req.body, tenantId);
        res.json({ success: true, data: mission });
    } catch (err) {
        logger.error('Error updating mission:', err);
        const statusCode = err.message === 'Mission not found' ? 404 : 400;
        res.status(statusCode).json({ error: err.message });
    }
};

export const deleteMission = async (req, res) => {
    try {
        const { tenantId } = req.tenant || {};
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant context required' });
        }
        
        const result = await missionService.deleteMission(req.params.id, tenantId);
        res.json({ success: true, message: result.message });
    } catch (err) {
        logger.error('Error deleting mission:', err);
        const statusCode = err.message === 'Mission not found' ? 404 : 500;
        res.status(statusCode).json({ error: err.message });
    }
};
