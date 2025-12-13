// Position Controller
import Position from '../models/position.model.js';

export const getAllPositions = async (req, res) => {
    try {
        const positions = await Position.find({ tenantId: req.tenantId })
            .populate('department', 'name code');
        res.json({
            success: true,
            data: positions
        });
    } catch (err) {
        res.status(500).json({ 
            success: false,
            message: err.message 
        });
    }
};

export const createPosition = async (req, res) => {
    try {
        const position = new Position({
            ...req.body,
            tenantId: req.tenantId
        });
        await position.save();
        res.status(201).json({
            success: true,
            data: position
        });
    } catch (err) {
        res.status(400).json({ 
            success: false,
            message: err.message 
        });
    }
};

export const getPositionById = async (req, res) => {
    try {
        const position = await Position.findOne({ 
            _id: req.params.id, 
            tenantId: req.tenantId 
        }).populate('department', 'name code');
        
        if (!position) {
            return res.status(404).json({ 
                success: false,
                message: 'Position not found' 
            });
        }
        
        res.json({
            success: true,
            data: position
        });
    } catch (err) {
        res.status(500).json({ 
            success: false,
            message: err.message 
        });
    }
};

export const updatePosition = async (req, res) => {
    try {
        const position = await Position.findOneAndUpdate(
            { _id: req.params.id, tenantId: req.tenantId },
            req.body,
            { new: true }
        ).populate('department', 'name code');
        
        if (!position) {
            return res.status(404).json({ 
                success: false,
                message: 'Position not found' 
            });
        }
        
        res.json({
            success: true,
            data: position
        });
    } catch (err) {
        res.status(400).json({ 
            success: false,
            message: err.message 
        });
    }
};

export const deletePosition = async (req, res) => {
    try {
        const position = await Position.findOneAndDelete({ 
            _id: req.params.id, 
            tenantId: req.tenantId 
        });
        
        if (!position) {
            return res.status(404).json({ 
                success: false,
                message: 'Position not found' 
            });
        }
        
        res.json({
            success: true,
            message: 'Position deleted successfully'
        });
    } catch (err) {
        res.status(500).json({ 
            success: false,
            message: err.message 
        });
    }
};
