// Mission Controller - Moved to HR-Core module
import Mission from '../models/mission.model.js';
import logger from '../../../../utils/logger.js';

export const getAllMissions = async (req, res) => {
    try {
        const { tenantId } = req.tenant || {};
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant context required' });
        }
        
        const missions = await Mission.find({ tenantId })
            .populate('employee', 'username email employeeId personalInfo')
            .populate('department', 'name code')
            .populate('approvedBy', 'username email')
            .sort({ startDate: -1 });
            
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
        
        const missionData = { ...req.body, tenantId };
        const mission = new Mission(missionData);
        await mission.save();
        await mission.populate('employee', 'username email employeeId personalInfo');
        
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
        
        const mission = await Mission.findOne({ _id: req.params.id, tenantId })
            .populate('employee', 'username email employeeId personalInfo')
            .populate('department', 'name code')
            .populate('approvedBy', 'username email');
            
        if (!mission) return res.status(404).json({ error: 'Mission not found' });
        
        res.json({ success: true, data: mission });
    } catch (err) {
        logger.error('Error fetching mission:', err);
        res.status(500).json({ error: err.message });
    }
};

export const updateMission = async (req, res) => {
    try {
        const { tenantId } = req.tenant || {};
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant context required' });
        }
        
        const mission = await Mission.findOneAndUpdate(
            { _id: req.params.id, tenantId },
            req.body,
            { new: true }
        )
            .populate('employee', 'username email employeeId personalInfo')
            .populate('department', 'name code')
            .populate('approvedBy', 'username email');
            
        if (!mission) return res.status(404).json({ error: 'Mission not found' });
        
        res.json({ success: true, data: mission });
    } catch (err) {
        logger.error('Error updating mission:', err);
        res.status(400).json({ error: err.message });
    }
};

export const deleteMission = async (req, res) => {
    try {
        const { tenantId } = req.tenant || {};
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant context required' });
        }
        
        const mission = await Mission.findOneAndDelete({ _id: req.params.id, tenantId });
        if (!mission) return res.status(404).json({ error: 'Mission not found' });
        
        res.json({ success: true, message: 'Mission deleted' });
    } catch (err) {
        logger.error('Error deleting mission:', err);
        res.status(500).json({ error: err.message });
    }
};
