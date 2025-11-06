import express from 'express';
import {
    getAllDocumentTemplates,
    createDocumentTemplate,
    getDocumentTemplateById,
    updateDocumentTemplate,
    deleteDocumentTemplate
} from '../controller/documentTemplate.controller.js';
import {
    protect,
    hrOrAdmin,
    validateTemplateFileType,
    checkTemplateNameUnique,
    setTemplateCreatedBy,
    validateTemplateFile
} from '../middleware/index.js';

const router = express.Router();

// Get all document templates - All authenticated users can view
router.get('/', protect, getAllDocumentTemplates);

// Create document template - HR or Admin only with validation
router.post('/',
    protect,
    hrOrAdmin,
    checkTemplateNameUnique,
    validateTemplateFileType,
    validateTemplateFile,
    setTemplateCreatedBy,
    createDocumentTemplate
);

// Get document template by ID - All authenticated users
router.get('/:id', protect, getDocumentTemplateById);

// Update document template - HR or Admin only with validation
router.put('/:id',
    protect,
    hrOrAdmin,
    checkTemplateNameUnique,
    validateTemplateFileType,
    updateDocumentTemplate
);

// Delete document template - HR or Admin only
router.delete('/:id', protect, hrOrAdmin, deleteDocumentTemplate);

export default router;
