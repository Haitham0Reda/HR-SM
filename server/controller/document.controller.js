// Document Controller
import Document from '../models/document.model.js';

export const getAllDocuments = async (req, res) => {
    try {
        const documents = await Document.find();
        res.json(documents);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const createDocument = async (req, res) => {
    try {
        const document = new Document(req.body);
        await document.save();
        res.status(201).json(document);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

export const getDocumentById = async (req, res) => {
    try {
        const document = await Document.findById(req.params.id);
        if (!document) return res.status(404).json({ error: 'Document not found' });
        res.json(document);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const updateDocument = async (req, res) => {
    try {
        const document = await Document.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!document) return res.status(404).json({ error: 'Document not found' });
        res.json(document);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

export const deleteDocument = async (req, res) => {
    try {
        const document = await Document.findByIdAndDelete(req.params.id);
        if (!document) return res.status(404).json({ error: 'Document not found' });
        res.json({ message: 'Document deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
