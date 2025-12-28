// Vacation Controller - Moved to HR-Core module
import VacationService from '../services/VacationService.js';
import logger from '../../../../utils/logger.js';

const vacationService = new VacationService();

export const getAllVacations = async (req, res) => {
    try {
        const { tenantId } = req.tenant || {};
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant context required' });
        }
        
        const vacations = await vacationService.getAllVacations(tenantId);
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
        
        const vacation = await vacationService.createVacation(req.body, tenantId);
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
        
        const vacation = await vacationService.getVacationById(req.params.id, tenantId);
        res.json({ success: true, data: vacation });
    } catch (err) {
        logger.error('Error fetching vacation:', err);
        const statusCode = err.message === 'Vacation request not found' ? 404 : 500;
        res.status(statusCode).json({ error: err.message });
    }
};

export const updateVacation = async (req, res) => {
    try {
        const { tenantId } = req.tenant || {};
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant context required' });
        }
        
        const vacation = await vacationService.updateVacation(req.params.id, req.body, tenantId);
        res.json({ success: true, data: vacation });
    } catch (err) {
        logger.error('Error updating vacation:', err);
        const statusCode = err.message === 'Vacation request not found' ? 404 : 400;
        res.status(statusCode).json({ error: err.message });
    }
};

export const deleteVacation = async (req, res) => {
    try {
        const { tenantId } = req.tenant || {};
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant context required' });
        }
        
        const result = await vacationService.deleteVacation(req.params.id, tenantId);
        res.json({ success: true, message: result.message });
    } catch (err) {
        logger.error('Error deleting vacation:', err);
        const statusCode = err.message === 'Vacation request not found' ? 404 : 500;
        res.status(statusCode).json({ error: err.message });
    }
};
