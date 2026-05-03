import express from 'express';
import {
    getAllDocuments,
    createDocument,
    getDocumentById,
    updateDocument,
    deleteDocument,
    uploadDocument,
    testUpload
} from '../controllers/document.controller.js';
import { protect } from '../../../middleware/authMiddleware.js';
import { requireRole } from '../../../shared/middleware/auth.js';
import { moduleGuard } from '../../../middleware/moduleGuard.js';
import { ROLES } from '../../../shared/constants/modules.js';
import { documentUpload } from '../config/multer.config.js';

const router = express.Router();

// All routes require authentication and documents module guard
router.use(protect);
router.use(moduleGuard('documents'));

// Get all documents - All authenticated users (filtered by role in controller)
router.get('/', getAllDocuments);

// Create document - HR or Admin only
router.post('/', requireRole(ROLES.HR, ROLES.ADMIN), createDocument);

// Upload document file - HR or Admin only
router.post('/upload', requireRole(ROLES.HR, ROLES.ADMIN), documentUpload.single('file'), uploadDocument);

// Test upload endpoint accessibility
router.get('/upload/test', requireRole(ROLES.HR, ROLES.ADMIN), testUpload);

// Test endpoint to verify route is working
router.get('/test', (req, res) => {
    res.json({ success: true, message: 'Document routes are working' });
});

// Get document by ID - All authenticated users (access control in controller)
router.get('/:id', getDocumentById);

// Update document - HR or Admin only
router.put('/:id', requireRole(ROLES.HR, ROLES.ADMIN), updateDocument);

// Delete document - HR or Admin only
router.delete('/:id', requireRole(ROLES.HR, ROLES.ADMIN), deleteDocument);

export default router;
