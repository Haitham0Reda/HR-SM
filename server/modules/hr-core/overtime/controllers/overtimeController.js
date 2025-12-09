// Overtime Controller - Moved to HR-Core module
import Overtime from '../models/Overtime.js';
import logger from '../../../../utils/logger.js';

export const getAllOvertime = async (req, res) => {
    try {
        const { tenantId } = req.tenant || {};
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant context required' });
        }
        
        const overtime = await Overtime.find({ tenantId })
            .populate('employee', 'username email employeeId personalInfo')
            .populate('department', 'name code')
            .populate('approvedBy', 'username email')
            .sort({ date: -1 });
            
        res.json({ success: true, data: overtime });
    } catch (err) {
        logger.error('Error fetching overtime:', err);
        res.status(500).json({ error: err.message });
    }
};

export const createOvertime = async (req, res) => {
    try {
        const { tenantId } = req.tenant || {};
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant context required' });
        }
        
        const overtimeData = { ...req.body, tenantId };
        const overtime = new Overtime(overtimeData);
        await overtime.save();
        await overtime.populate('employee', 'username email employeeId personalInfo');
        
        res.status(201).json({ success: true, data: overtime });
    } catch (err) {
        logger.error('Error creating overtime:', err);
        res.status(400).json({ error: err.message });
    }
};

export const getOvertimeById = async (req, res) => {
    try {
        const { tenantId } = req.tenant || {};
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant context required' });
        }
        
        const overtime = await Overtime.findOne({ _id: req.params.id, tenantId })
            .populate('employee', 'username email employeeId personalInfo')
            .populate('department', 'name code')
            .populate('approvedBy', 'username email');
            
        if (!overtime) return res.status(404).json({ error: 'Overtime not found' });
        
        res.json({ success: true, data: overtime });
    } catch (err) {
        logger.error('Error fetching overtime:', err);
        res.status(500).json({ error: err.message });
    }
};

export const updateOvertime = async (req, res) => {
    try {
        const { tenantId } = req.tenant || {};
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant context required' });
        }
        
        const overtime = await Overtime.findOneAndUpdate(
            { _id: req.params.id, tenantId },
            req.body,
            { new: true }
        )
            .populate('employee', 'username email employeeId personalInfo')
            .populate('department', 'name code')
            .populate('approvedBy', 'username email');
            
        if (!overtime) return res.status(404).json({ error: 'Overtime not found' });
        
        res.json({ success: true, data: overtime });
    } catch (err) {
        logger.error('Error updating overtime:', err);
        res.status(400).json({ error: err.message });
    }
};

export const deleteOvertime = async (req, res) => {
    try {
        const { tenantId } = req.tenant || {};
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant context required' });
        }
        
        const overtime = await Overtime.findOneAndDelete({ _id: req.params.id, tenantId });
        if (!overtime) return res.status(404).json({ error: 'Overtime not found' });
        
        res.json({ success: true, message: 'Overtime deleted' });
    } catch (err) {
        logger.error('Error deleting overtime:', err);
        res.status(500).json({ error: err.message });
    }
};
