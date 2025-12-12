/**
 * Multer Configuration
 * 
 * Configures file upload handling for medical documents and other files
 * Features:
 * - Automatic directory creation
 * - Unique filename generation
 * - File type validation
 * - File size limits
 */

import multer from 'multer';
import path from 'path';
import fs from 'fs';

/**
 * Upload directory for medical documents
 * Created automatically if it doesn't exist
 */
const uploadDir = 'uploads/medical-documents';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

/**
 * Storage configuration
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
     * Format: medical-{timestamp}-{random}.{extension}
     */
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'medical-' + uniqueSuffix + path.extname(file.originalname));
    }
});

/**
 * File filter to validate file types
 * Only allows: JPEG, JPG, PNG, PDF, DOC, DOCX
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
        cb(new Error('Only PDF, JPG, PNG, DOC, and DOCX files are allowed'));
    }
};

/**
 * Multer instance with configuration
 * - Max file size: 5MB
 * - Allowed types: PDF, JPG, PNG, DOC, DOCX
 * - Unique filenames with timestamps
 */
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: fileFilter
});

export default upload;
