// Attendance Controller
import Attendance from '../models/attendance.model.js';

export const getAllAttendance = async (req, res) => {
    try {
        const attendance = await Attendance.find();
        res.json(attendance);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const createAttendance = async (req, res) => {
    try {
        const attendance = new Attendance(req.body);
        await attendance.save();
        res.status(201).json(attendance);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

export const getAttendanceById = async (req, res) => {
    try {
        const attendance = await Attendance.findById(req.params.id);
        if (!attendance) return res.status(404).json({ error: 'Attendance not found' });
        res.json(attendance);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const updateAttendance = async (req, res) => {
    try {
        const attendance = await Attendance.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!attendance) return res.status(404).json({ error: 'Attendance not found' });
        res.json(attendance);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

export const deleteAttendance = async (req, res) => {
    try {
        const attendance = await Attendance.findByIdAndDelete(req.params.id);
        if (!attendance) return res.status(404).json({ error: 'Attendance not found' });
        res.json({ message: 'Attendance deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
