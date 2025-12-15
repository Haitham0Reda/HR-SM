// Document Controller
import Document from '../models/document.model.js';

export const getAllDocuments = async (req, res) => {
    try {
        // Base query with tenant isolation
        let query = { tenantId: req.tenantId };

        // Role-based filtering
        if (req.user.role === 'employee') {
            // Employees only see their own documents or non-confidential ones
            query.$or = [
                { employee: req.user.id },
                { uploadedBy: req.user.id },
                { isConfidential: false }
            ];
        } else if (req.user.role === 'manager') {
            // Managers see documents for their department or non-confidential ones
            query.$or = [
                { department: req.user.department },
                { uploadedBy: req.user.id },
                { isConfidential: false }
            ];
        }
        // HR and Admin see all documents (no additional filtering needed)

        const documents = await Document.find(query)
            .populate('employee', 'email firstName lastName role employeeId')
            .populate('uploadedBy', 'email firstName lastName role employeeId')
            .populate('department', 'name code')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: documents
        });
    } catch (err) {
        console.error('Error fetching documents:', err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

export const createDocument = async (req, res) => {
    try {
        const documentData = {
            ...req.body,
            uploadedBy: req.user.id,
            tenantId: req.tenantId
        };

        const document = await Document.create(documentData);
        
        await document.populate('employee', 'email firstName lastName role employeeId');
        await document.populate('uploadedBy', 'email firstName lastName role employeeId');
        await document.populate('department', 'name code');

        res.status(201).json({
            success: true,
            data: document
        });
    } catch (err) {
        res.status(400).json({
            success: false,
            message: err.message
        });
    }
};

export const getDocumentById = async (req, res) => {
    try {
        const document = await Document.findOne({
            _id: req.params.id,
            tenantId: req.tenantId
        })
            .populate('employee', 'email firstName lastName role employeeId')
            .populate('uploadedBy', 'email firstName lastName role employeeId')
            .populate('department', 'name code');

        if (!document) {
            return res.status(404).json({
                success: false,
                message: 'Document not found'
            });
        }

        // Check access permissions
        const canAccess = 
            document.employee?._id.toString() === req.user.id ||
            document.uploadedBy?._id.toString() === req.user.id ||
            ['hr', 'admin'].includes(req.user.role) ||
            (!document.isConfidential && req.user.role === 'manager');

        if (!canAccess) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        res.json({
            success: true,
            data: document
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

export const updateDocument = async (req, res) => {
    try {
        const document = await Document.findOneAndUpdate(
            { _id: req.params.id, tenantId: req.tenantId },
            { ...req.body, updatedBy: req.user.id },
            { new: true }
        )
            .populate('employee', 'email firstName lastName role employeeId')
            .populate('uploadedBy', 'email firstName lastName role employeeId')
            .populate('department', 'name code');

        if (!document) {
            return res.status(404).json({
                success: false,
                message: 'Document not found'
            });
        }

        res.json({
            success: true,
            data: document
        });
    } catch (err) {
        res.status(400).json({
            success: false,
            message: err.message
        });
    }
};

export const deleteDocument = async (req, res) => {
    try {
        const document = await Document.findOneAndDelete({
            _id: req.params.id,
            tenantId: req.tenantId
        });

        if (!document) {
            return res.status(404).json({
                success: false,
                message: 'Document not found'
            });
        }

        res.json({
            success: true,
            message: 'Document deleted successfully'
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};
