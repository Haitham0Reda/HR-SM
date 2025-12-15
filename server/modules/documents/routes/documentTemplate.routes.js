import express from 'express';
import {
    getAllDocumentTemplates,
    createDocumentTemplate,
    getDocumentTemplateById,
    updateDocumentTemplate,
    deleteDocumentTemplate
} from '../controllers/documentTemplate.controller.js';
import {
    protect,
    hrOrAdmin,
    validateTemplateFileType,
    checkTemplateNameUnique,
    setTemplateCreatedBy,
    validateTemplateFile
} from '../../../middleware/index.js';
import { requireModuleLicense } from '../../../middleware/licenseValidation.middleware.js';
import { MODULES } from '../../../platform/system/models/license.model.js';

const router = express.Router();

// Apply authentication to all routes first
router.use(protect);

// Apply license validation to all document template routes (after authentication)
router.use(requireModuleLicense(MODULES.DOCUMENTS));

// Get all document templates - All authenticated users can view
router.get('/', getAllDocumentTemplates);

// Create document template - HR or Admin only with validation
router.post('/',
    hrOrAdmin,
    checkTemplateNameUnique,
    validateTemplateFileType,
    validateTemplateFile,
    setTemplateCreatedBy,
    createDocumentTemplate
);

// Get document template by ID - All authenticated users
router.get('/:id', getDocumentTemplateById);

// Update document template - HR or Admin only with validation
router.put('/:id',
    hrOrAdmin,
    checkTemplateNameUnique,
    validateTemplateFileType,
    updateDocumentTemplate
);

// Delete document template - HR or Admin only
router.delete('/:id', hrOrAdmin, deleteDocumentTemplate);

export default router;
