// Holiday Controller - Moved to HR-Core module
import Holiday from '../models/Holiday.js';
import logger from '../../../../utils/logger.js';

export const getAllHolidays = async (req, res) => {
    try {
        const { tenantId } = req.tenant || {};
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant context required' });
        }
        
        const holidays = await Holiday.find({ tenantId }).sort({ 'officialHolidays.date': 1 });
        res.json({ success: true, data: holidays });
    } catch (err) {
        logger.error('Error fetching holidays:', err);
        res.status(500).json({ error: err.message });
    }
};

export const createHoliday = async (req, res) => {
    try {
        const { tenantId } = req.tenant || {};
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant context required' });
        }
        
        const holidayData = { ...req.body, tenantId };
        const holiday = new Holiday(holidayData);
        await holiday.save();
        
        res.status(201).json({ success: true, data: holiday });
    } catch (err) {
        logger.error('Error creating holiday:', err);
        res.status(400).json({ error: err.message });
    }
};

export const getHolidayById = async (req, res) => {
    try {
        const { tenantId } = req.tenant || {};
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant context required' });
        }
        
        const holiday = await Holiday.findOne({ _id: req.params.id, tenantId });
        if (!holiday) return res.status(404).json({ error: 'Holiday not found' });
        
        res.json({ success: true, data: holiday });
    } catch (err) {
        logger.error('Error fetching holiday:', err);
        res.status(500).json({ error: err.message });
    }
};

export const updateHoliday = async (req, res) => {
    try {
        const { tenantId } = req.tenant || {};
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant context required' });
        }
        
        const holiday = await Holiday.findOneAndUpdate(
            { _id: req.params.id, tenantId },
            req.body,
            { new: true }
        );
        
        if (!holiday) return res.status(404).json({ error: 'Holiday not found' });
        
        res.json({ success: true, data: holiday });
    } catch (err) {
        logger.error('Error updating holiday:', err);
        res.status(400).json({ error: err.message });
    }
};

export const deleteHoliday = async (req, res) => {
    try {
        const { tenantId } = req.tenant || {};
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant context required' });
        }
        
        const holiday = await Holiday.findOneAndDelete({ _id: req.params.id, tenantId });
        if (!holiday) return res.status(404).json({ error: 'Holiday not found' });
        
        res.json({ success: true, message: 'Holiday deleted' });
    } catch (err) {
        logger.error('Error deleting holiday:', err);
        res.status(500).json({ error: err.message });
    }
};
