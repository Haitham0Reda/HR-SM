// Position Controller
import Position from '../models/position.model.js';

export const getAllPositions = async (req, res) => {
    try {
        const positions = await Position.find();
        res.json(positions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const createPosition = async (req, res) => {
    try {
        const position = new Position(req.body);
        await position.save();
        res.status(201).json(position);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

export const getPositionById = async (req, res) => {
    try {
        const position = await Position.findById(req.params.id);
        if (!position) return res.status(404).json({ error: 'Position not found' });
        res.json(position);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const updatePosition = async (req, res) => {
    try {
        const position = await Position.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!position) return res.status(404).json({ error: 'Position not found' });
        res.json(position);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

export const deletePosition = async (req, res) => {
    try {
        const position = await Position.findByIdAndDelete(req.params.id);
        if (!position) return res.status(404).json({ error: 'Position not found' });
        res.json({ message: 'Position deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
