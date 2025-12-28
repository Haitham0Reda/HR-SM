// Document Controller
import DocumentService from '../services/DocumentService.js';

const documentService = new DocumentService();

// Helper function to get tenant ID from request
const getTenantId = (req) => {
    return req.tenantId || req.user?.tenantId || 'default-tenant';
};

export const getAllDocuments = async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        
        // Build filter based on user role
        let filter = {};
        if (req.user.role === 'employee') {
            // Employees only see their own documents or non-confidential ones
            filter.$or = [
                { employee: req.user.id },
                { uploadedBy: req.user.id },
                { isConfidential: false }
            ];
        } else if (req.user.role === 'manager') {
            // Managers see documents for their department or non-confidential ones
            filter.$or = [
                { department: req.user.department },
                { uploadedBy: req.user.id },
                { isConfidential: false }
            ];
        }
        // HR and Admin see all documents (no additional filtering needed)

        const options = {
            filter,
            populate: [
                { path: 'employee', select: 'email firstName lastName role employeeId' },
                { path: 'uploadedBy', select: 'email firstName lastName role employeeId' },
                { path: 'department', select: 'name code' }
            ],
            sort: { createdAt: -1 }
        };

        const documents = await documentService.getAllDocuments(tenantId, options);

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
        const tenantId = getTenantId(req);
        const documentData = {
            ...req.body,
            uploadedBy: req.user.id
        };

        const document = await documentService.createDocument(documentData, tenantId);

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
        const tenantId = getTenantId(req);
        const document = await documentService.getDocumentById(req.params.id, tenantId);

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
        const tenantId = getTenantId(req);
        const updateData = { ...req.body, updatedBy: req.user.id };
        
        const document = await documentService.updateDocument(req.params.id, updateData, tenantId);

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
        const tenantId = getTenantId(req);
        const result = await documentService.deleteDocument(req.params.id, tenantId);

        if (!result) {
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
