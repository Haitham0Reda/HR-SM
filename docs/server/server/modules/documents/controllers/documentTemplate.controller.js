// Document Template Controller
import DocumentTemplate from '../models/documentTemplate.model.js';

export const getAllDocumentTemplates = async (req, res) => {
    try {
        const templates = await DocumentTemplate.find({ isActive: true })
            .populate('createdBy', 'username email')
            .sort({ createdAt: -1 });
        res.json(templates);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const createDocumentTemplate = async (req, res) => {
    try {
        const template = new DocumentTemplate(req.body);
        await template.save();
        res.status(201).json(template);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

export const getDocumentTemplateById = async (req, res) => {
    try {
        const template = await DocumentTemplate.findById(req.params.id)
            .populate('createdBy', 'username email');
        if (!template) return res.status(404).json({ error: 'Document Template not found' });
        res.json(template);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const updateDocumentTemplate = async (req, res) => {
    try {
        const template = await DocumentTemplate.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!template) return res.status(404).json({ error: 'Document Template not found' });
        res.json(template);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

export const deleteDocumentTemplate = async (req, res) => {
    try {
        const template = await DocumentTemplate.findByIdAndDelete(req.params.id);
        if (!template) return res.status(404).json({ error: 'Document Template not found' });
        res.json({ message: 'Document Template deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
