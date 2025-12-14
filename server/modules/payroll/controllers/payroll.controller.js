// Payroll Controller
import Payroll from '../models/payroll.model.js';

export const getAllPayrolls = async (req, res) => {
    try {
        // Use tenant context and populate employee data
        const tenantId = req.tenantId || req.user?.tenantId;
        
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant ID is required' });
        }

        const payrolls = await Payroll.find({ tenantId })
            .populate('employee', 'name email role')
            .sort({ period: -1, createdAt: -1 });
            
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

        const payrollData = {
            ...req.body,
            tenantId
        };

        const payroll = new Payroll(payrollData);
        await payroll.save();
        
        // Populate employee data before returning
        await payroll.populate('employee', 'name email role');
        
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

        const payroll = await Payroll.findOne({ 
            _id: req.params.id, 
            tenantId 
        }).populate('employee', 'name email role');
        
        if (!payroll) {
            return res.status(404).json({ error: 'Payroll not found' });
        }
        
        res.json(payroll);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const updatePayroll = async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId;
        
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant ID is required' });
        }

        const payroll = await Payroll.findOneAndUpdate(
            { _id: req.params.id, tenantId },
            req.body,
            { new: true, runValidators: true }
        ).populate('employee', 'name email role');
        
        if (!payroll) {
            return res.status(404).json({ error: 'Payroll not found' });
        }
        
        res.json(payroll);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

export const deletePayroll = async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId;
        
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant ID is required' });
        }

        const payroll = await Payroll.findOneAndDelete({ 
            _id: req.params.id, 
            tenantId 
        });
        
        if (!payroll) {
            return res.status(404).json({ error: 'Payroll not found' });
        }
        
        res.json({ message: 'Payroll deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};