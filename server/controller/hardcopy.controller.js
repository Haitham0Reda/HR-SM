// Hard Copy Controller
import HardCopy from '../models/hardcopy.model.js';

export const getAllHardCopies = async (req, res) => {
    try {
        console.log('getAllHardCopies called');
        console.log('User:', req.user?.username, 'Role:', req.user?.role);

        // All users can see all hard copies (no filtering)
        const hardCopies = await HardCopy.find({})
            .populate('uploadedBy', 'name username email profile')
            .sort({ createdAt: -1 });

        console.log(`Found ${hardCopies.length} hard copies`);
        res.json(hardCopies);
    } catch (err) {
        console.error('Error in getAllHardCopies:', err);
        res.status(500).json({ error: err.message });
    }
};

export const createHardCopy = async (req, res) => {
    try {
        // Only HR and Admin can create hard copies
        if (!['hr', 'admin'].includes(req.user?.role)) {
            return res.status(403).json({ error: 'Access denied. Only HR and Admin can upload hard copies.' });
        }
        
        const hardCopyData = {
            ...req.body,
            uploadedBy: req.user._id
        };
        const hardCopy = new HardCopy(hardCopyData);
        await hardCopy.save();
        await hardCopy.populate('uploadedBy', 'name username email profile');
        res.status(201).json(hardCopy);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

export const getHardCopyById = async (req, res) => {
    try {
        const hardCopy = await HardCopy.findById(req.params.id)
            .populate('uploadedBy', 'name username email profile');
        if (!hardCopy) return res.status(404).json({ error: 'Hard copy not found' });
        
        // All users can view any hard copy
        res.json(hardCopy);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const updateHardCopy = async (req, res) => {
    try {
        // Only HR and Admin can update hard copies
        if (!['hr', 'admin'].includes(req.user?.role)) {
            return res.status(403).json({ error: 'Access denied. Only HR and Admin can update hard copies.' });
        }
        
        const hardCopy = await HardCopy.findById(req.params.id);
        if (!hardCopy) return res.status(404).json({ error: 'Hard copy not found' });
        
        Object.assign(hardCopy, req.body);
        await hardCopy.save();
        await hardCopy.populate('uploadedBy', 'name username email profile');
        res.json(hardCopy);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

export const deleteHardCopy = async (req, res) => {
    try {
        // Only HR and Admin can delete hard copies
        if (!['hr', 'admin'].includes(req.user?.role)) {
            return res.status(403).json({ error: 'Access denied. Only HR and Admin can delete hard copies.' });
        }
        
        const hardCopy = await HardCopy.findById(req.params.id);
        if (!hardCopy) return res.status(404).json({ error: 'Hard copy not found' });
        
        await HardCopy.findByIdAndDelete(req.params.id);
        res.json({ message: 'Hard copy deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};