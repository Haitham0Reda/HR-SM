/**
 * Document Middleware
 * 
 * Validation and business logic for documents
 */
import User from '../modules/hr-core/users/models/user.model.js';
import Document from '../modules/documents/models/document.model.js';

/**
 * Validate file upload
 */
export const validateFileUpload = (req, res, next) => {
    if (!req.body.fileUrl && !req.file) {
        return res.status(400).json({
            success: false,
            message: 'File is required'
        });
    }
    next();
};

/**
 * Validate employee exists
 */
export const validateDocumentEmployee = async (req, res, next) => {
    try {
        if (req.body.employee) {
            const employee = await User.findByPk(req.body.employee);

            if (!employee) {
                return res.status(404).json({
                    success: false,
                    message: 'Employee not found'
                });
            }
        }
        next();
    } catch (error) {

        next();
    }
};

/**
 * Auto-set uploaded by from authenticated user
 */
export const setUploadedBy = (req, res, next) => {
    if (req.user && !req.body.uploadedBy) {
        req.body.uploadedBy = req.user.id;
    }
    next();
};

/**
 * Validate expiry date for documents
 */
export const validateDocumentExpiry = (req, res, next) => {
    if (req.body.expiryDate) {
        const expiryDate = new Date(req.body.expiryDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (expiryDate < today) {
            return res.status(400).json({
                success: false,
                message: 'Expiry date cannot be in the past'
            });
        }
    }
    next();
};

/**
 * Check access permissions for confidential documents
 */
export const checkDocumentAccess = async (req, res, next) => {
    try {
        if (req.params.id) {
            const document = await Document.findByPk(req.params.id);

            if (document && document.is_confidential) {
                // Only HR, Admin, document owner, or uploader can access
                const isOwner = document.employee && document.employee === req.user.id;
                const isUploader = document.uploaded_by === req.user.id;
                const isAuthorized = ['hr', 'admin'].includes(req.user.role);

                if (!isOwner && !isUploader && !isAuthorized) {
                    return res.status(403).json({
                        success: false,
                        message: 'Access denied. This document is confidential.'
                    });
                }
            }
        }
        next();
    } catch (error) {

        next();
    }
};

export default {
    validateFileUpload,
    validateDocumentEmployee,
    setUploadedBy,
    validateDocumentExpiry,
    checkDocumentAccess
};
