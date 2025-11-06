import express from 'express';
import {
    getAllDocuments,
    createDocument,
    getDocumentById,
    updateDocument,
    deleteDocument
} from '../controller/document.controller.js';
import {
    protect,
    hrOrAdmin,
    validateDocumentEmployee,
    setUploadedBy,
    validateDocumentExpiry,
    checkDocumentAccess
} from '../middleware/index.js';

const router = express.Router();

// Get all documents - HR or Admin only
router.get('/', protect, hrOrAdmin, getAllDocuments);

// Create document - HR or Admin only with validation
router.post('/',
    protect,
    hrOrAdmin,
    validateDocumentEmployee,
    setUploadedBy,
    validateDocumentExpiry,
    createDocument
);

// Get document by ID - Protected with access control
router.get('/:id',
    protect,
    checkDocumentAccess,
    getDocumentById
);

// Update document - HR or Admin only with validation
router.put('/:id',
    protect,
    hrOrAdmin,
    validateDocumentExpiry,
    updateDocument
);

// Delete document - HR or Admin only
router.delete('/:id', protect, hrOrAdmin, deleteDocument);

export default router;
