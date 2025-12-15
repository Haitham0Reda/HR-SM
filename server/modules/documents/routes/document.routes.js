import express from 'express';
import {
    getAllDocuments,
    createDocument,
    getDocumentById,
    updateDocument,
    deleteDocument
} from '../controllers/document.controller.js';
import { requireAuth, requireRole } from '../../../shared/middleware/auth.js';
import { requireModule } from '../../../shared/middleware/moduleGuard.js';
import { MODULES, ROLES } from '../../../shared/constants/modules.js';

const router = express.Router();

// All routes require authentication and documents module
router.use(requireAuth);
router.use(requireModule(MODULES.DOCUMENTS));

// Get all documents - All authenticated users (filtered by role in controller)
router.get('/', getAllDocuments);

// Create document - HR or Admin only
router.post('/', requireRole(ROLES.HR, ROLES.ADMIN), createDocument);

// Get document by ID - All authenticated users (access control in controller)
router.get('/:id', getDocumentById);

// Update document - HR or Admin only
router.put('/:id', requireRole(ROLES.HR, ROLES.ADMIN), updateDocument);

// Delete document - HR or Admin only
router.delete('/:id', requireRole(ROLES.HR, ROLES.ADMIN), deleteDocument);

export default router;
