import express from 'express';
import {
    getAllDocuments,
    createDocument,
    getDocumentById,
    updateDocument,
    deleteDocument
} from '../controllers/document.controller.js';
import {
    protect,
    hrOrAdmin,
    validateDocumentEmployee,
    setUploadedBy,
    validateDocumentExpiry,
    checkDocumentAccess
} from '../../../middleware/index.js';
import { requireModuleLicense } from '../../../middleware/licenseValidation.middleware.js';
import { MODULES } from '../../../platform/system/models/license.model.js';

const router = express.Router();

// Apply license validation to all document routes
router.use(requireModuleLicense(MODULES.DOCUMENTS));

// Get all documents - All authenticated users (filtered by role in controller)
router.get('/', protect, getAllDocuments);

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
