// Vacation Controller - Moved to HR-Core module
import Vacation from '../models/Vacation.js';
import logger from '../../../../utils/logger.js';

export const getAllVacations = async (req, res) => {
    try {
        const { tenantId } = req.tenant || {};
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant context required' });
        }
        
        const vacations = await Vacation.find({ tenantId })
            .populate('employee', 'username email employeeId personalInfo')
            .populate('department', 'name code')
            .populate('approvedBy', 'username email')
            .sort({ startDate: -1 });
            
        res.json({ success: true, data: vacations });
    } catch (err) {
        logger.error('Error fetching vacations:', err);
        res.status(500).json({ error: err.message });
    }
};

export const createVacation = async (req, res) => {
    try {
        const { tenantId } = req.tenant || {};
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant context required' });
        }
        
        const vacationData = { ...req.body, tenantId };
        const vacation = new Vacation(vacationData);
        await vacation.save();
        await vacation.populate('employee', 'username email employeeId personalInfo');
        
        res.status(201).json({ success: true, data: vacation });
    } catch (err) {
        logger.error('Error creating vacation:', err);
        res.status(400).json({ error: err.message });
    }
};

export const getVacationById = async (req, res) => {
    try {
        const { tenantId } = req.tenant || {};
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant context required' });
        }
        
        const vacation = await Vacation.findOne({ _id: req.params.id, tenantId })
            .populate('employee', 'username email employeeId personalInfo')
            .populate('department', 'name code')
            .populate('approvedBy', 'username email');
            
        if (!vacation) return res.status(404).json({ error: 'Vacation not found' });
        
        res.json({ success: true, data: vacation });
    } catch (err) {
        logger.error('Error fetching vacation:', err);
        res.status(500).json({ error: err.message });
    }
};

export const updateVacation = async (req, res) => {
    try {
        const { tenantId } = req.tenant || {};
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant context required' });
        }
        
        const vacation = await Vacation.findOneAndUpdate(
            { _id: req.params.id, tenantId },
            req.body,
            { new: true }
        )
            .populate('employee', 'username email employeeId personalInfo')
            .populate('department', 'name code')
            .populate('approvedBy', 'username email');
            
        if (!vacation) return res.status(404).json({ error: 'Vacation not found' });
        
        res.json({ success: true, data: vacation });
    } catch (err) {
        logger.error('Error updating vacation:', err);
        res.status(400).json({ error: err.message });
    }
};

export const deleteVacation = async (req, res) => {
    try {
        const { tenantId } = req.tenant || {};
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant context required' });
        }
        
        const vacation = await Vacation.findOneAndDelete({ _id: req.params.id, tenantId });
        if (!vacation) return res.status(404).json({ error: 'Vacation not found' });
        
        res.json({ success: true, message: 'Vacation deleted' });
    } catch (err) {
        logger.error('Error deleting vacation:', err);
        res.status(500).json({ error: err.message });
    }
};
