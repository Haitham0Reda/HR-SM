// Department Controller
import Department from '../models/department.model.js';

export const getAllDepartments = async (req, res) => {
    try {
        const departments = await Department.find()
            .populate('manager', 'username email')
            .populate('school', 'name schoolCode');
        res.status(200).json(departments);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const createDepartment = async (req, res) => {
    try {
        const department = new Department(req.body);
        await department.save();
        res.status(201).json(department);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

export const getDepartmentById = async (req, res) => {
    try {
        const department = await Department.findById(req.params.id)
            .populate('manager', 'username email')
            .populate('school', 'name schoolCode');
        if (!department) return res.status(404).json({ error: 'Department not found' });
        res.status(200).json(department);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const updateDepartment = async (req, res) => {
    try {
        const department = await Department.findByIdAndUpdate(req.params.id, req.body, { new: true })
            .populate('manager', 'username email')
            .populate('school', 'name schoolCode');
        if (!department) return res.status(404).json({ error: 'Department not found' });
        res.status(200).json(department);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

export const deleteDepartment = async (req, res) => {
    try {
        const department = await Department.findByIdAndDelete(req.params.id);
        if (!department) return res.status(404).json({ error: 'Department not found' });
        res.status(200).json({ message: 'Department deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
