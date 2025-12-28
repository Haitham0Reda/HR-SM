// Payroll Controller
import PayrollService from '../services/PayrollService.js';

const payrollService = new PayrollService();

export const getAllPayrolls = async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId;
        
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant ID is required' });
        }

        const payrolls = await payrollService.getAllPayrolls(tenantId);
        res.json(payrolls);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const createPayroll = async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId;
        
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant ID is required' });
        }

        const payroll = await payrollService.createPayroll(req.body, tenantId);
        res.status(201).json(payroll);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

export const getPayrollById = async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId;
        
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant ID is required' });
        }

        const payroll = await payrollService.getPayrollById(req.params.id, tenantId);
        res.json(payroll);
    } catch (err) {
        const statusCode = err.message === 'Payroll not found' ? 404 : 500;
        res.status(statusCode).json({ error: err.message });
    }
};

export const updatePayroll = async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId;
        
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant ID is required' });
        }

        const payroll = await payrollService.updatePayroll(req.params.id, req.body, tenantId);
        res.json(payroll);
    } catch (err) {
        const statusCode = err.message === 'Payroll not found' ? 404 : 400;
        res.status(statusCode).json({ error: err.message });
    }
};

export const deletePayroll = async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId;
        
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant ID is required' });
        }

        const result = await payrollService.deletePayroll(req.params.id, tenantId);
        res.json(result);
    } catch (err) {
        const statusCode = err.message === 'Payroll not found' ? 404 : 500;
        res.status(statusCode).json({ error: err.message });
    }
};