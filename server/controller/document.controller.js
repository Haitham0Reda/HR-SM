// Document Controller
import Document from '../models/document.model.js';

export const getAllDocuments = async (req, res) => {
    try {
        // Filter based on user role and access permissions
        let query = {};

        // Non-admin users only see their own documents or non-confidential ones
        if (!['hr', 'admin'].includes(req.user?.role)) {
            query = {
                $or: [
                    { employee: req.user?._id },
                    { uploadedBy: req.user?._id },
                    { isConfidential: false }
                ]
            };
        }

        const documents = await Document.find(query)
            .populate('employee', 'username email')
            .populate('uploadedBy', 'username email')
            .populate('department', 'name code')
            .sort({ createdAt: -1 });
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
        const document = await Document.findById(req.params.id)
            .populate('employee', 'username email')
            .populate('uploadedBy', 'username email')
            .populate('department', 'name code');
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
