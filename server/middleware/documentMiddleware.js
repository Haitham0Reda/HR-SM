/**
 * Document Middleware
 * 
 * Validation and business logic for documents
 */
import mongoose from 'mongoose';

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
            const User = mongoose.model('User');
            const employee = await User.findById(req.body.employee);

            if (!employee) {
                return res.status(404).json({
                    success: false,
                    message: 'Employee not found'
                });
            }
        }
        next();
    } catch (error) {
        console.error('Error validating employee:', error);
        next();
    }
};

/**
 * Auto-set uploaded by from authenticated user
 */
export const setUploadedBy = (req, res, next) => {
    if (req.user && !req.body.uploadedBy) {
        req.body.uploadedBy = req.user._id;
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
            const Document = mongoose.model('Document');
            const document = await Document.findById(req.params.id);

            if (document && document.isConfidential) {
                // Only HR, Admin, document owner, or uploader can access
                const isOwner = document.employee && document.employee.toString() === req.user._id.toString();
                const isUploader = document.uploadedBy.toString() === req.user._id.toString();
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
        console.error('Error checking document access:', error);
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
