// School Controller
import School from '../models/school.model.js';

export const getAllSchools = async (req, res) => {
    try {
        const schools = await School.find()
            .populate('dean', 'username email')
            .sort({ schoolCode: 1 });
        res.json(schools);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const createSchool = async (req, res) => {
    try {
        const school = new School(req.body);
        const savedSchool = await school.save();
        await savedSchool.populate('dean', 'username email');
        res.status(201).json(savedSchool);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

export const getSchoolById = async (req, res) => {
    try {
        const school = await School.findById(req.params.id)
            .populate('dean', 'username email');
        if (!school) return res.status(404).json({ error: 'School not found' });
        res.json(school);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const getSchoolByCode = async (req, res) => {
    try {
        const school = await School.findByCode(req.params.code)
            .populate('dean', 'username email');
        if (!school) return res.status(404).json({ error: 'School not found' });
        res.json(school);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const updateSchool = async (req, res) => {
    try {
        const school = await School.findByIdAndUpdate(req.params.id, req.body, { new: true })
            .populate('dean', 'username email');
        if (!school) return res.status(404).json({ error: 'School not found' });
        res.json(school);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

export const deleteSchool = async (req, res) => {
    try {
        const school = await School.findByIdAndDelete(req.params.id);
        if (!school) return res.status(404).json({ error: 'School not found' });
        res.json({ message: 'School deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const getActiveSchools = async (req, res) => {
    try {
        const schools = await School.getActiveSchools();
        res.json(schools);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
