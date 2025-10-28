// Payroll Controller
import Payroll from '../models/payroll.model.js';

export const getAllPayrolls = async (req, res) => {
    try {
        const payrolls = await Payroll.find();
        res.json(payrolls);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const createPayroll = async (req, res) => {
    try {
        const payroll = new Payroll(req.body);
        await payroll.save();
        res.status(201).json(payroll);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

export const getPayrollById = async (req, res) => {
    try {
        const payroll = await Payroll.findById(req.params.id);
        if (!payroll) return res.status(404).json({ error: 'Payroll not found' });
        res.json(payroll);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const updatePayroll = async (req, res) => {
    try {
        const payroll = await Payroll.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!payroll) return res.status(404).json({ error: 'Payroll not found' });
        res.json(payroll);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

export const deletePayroll = async (req, res) => {
    try {
        const payroll = await Payroll.findByIdAndDelete(req.params.id);
        if (!payroll) return res.status(404).json({ error: 'Payroll not found' });
        res.json({ message: 'Payroll deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
