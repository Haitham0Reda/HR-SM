/**
 * Multer Configuration for Insurance Documents
 * 
 * Configures file upload handling for insurance claims and policy documents
 * Features:
 * - Automatic directory creation
 * - Unique filename generation
 * - File type validation for insurance documents
 * - File size limits
 */

import multer from 'multer';
import path from 'path';
import fs from 'fs';

/**
 * Upload directory for insurance documents
 * Created automatically if it doesn't exist
 */
const uploadDir = 'uploads/insurance-documents';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

/**
 * Storage configuration for insurance documents
 * Defines where and how files are stored
 */
const storage = multer.diskStorage({
    /**
     * Set destination folder for uploaded files
     */
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    
    /**
     * Generate unique filename for uploaded files
     * Format: insurance-{claimId}-{timestamp}-{random}.{extension}
     */
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const claimId = req.params.id || 'unknown';
        cb(null, `insurance-${claimId}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

/**
 * File filter to validate file types for insurance documents
 * Allows: JPEG, JPG, PNG, PDF, DOC, DOCX
 * 
 * @param {Object} req - Express request object
 * @param {Object} file - Uploaded file object
 * @param {Function} cb - Callback function
 */
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Only PDF, JPG, PNG, DOC, and DOCX files are allowed for insurance documents'));
    }
};

/**
 * Multer instance for insurance document uploads
 * - Max file size: 10MB (larger than default for insurance documents)
 * - Allowed types: PDF, JPG, PNG, DOC, DOCX
 * - Unique filenames with claim ID and timestamps
 */
const insuranceUpload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit for insurance documents
        files: 5 // Maximum 5 files per upload
    },
    fileFilter: fileFilter
});

/**
 * Memory storage for temporary processing
 * Used for document validation before saving to disk
 */
const memoryStorage = multer.memoryStorage();

const insuranceUploadMemory = multer({
    storage: memoryStorage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 5 // Maximum 5 files per upload
    },
    fileFilter: fileFilter
});

export { insuranceUpload, insuranceUploadMemory };
export default insuranceUpload;