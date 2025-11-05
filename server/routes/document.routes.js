import express from 'express';
import {
    getAllDocuments,
    createDocument,
    getDocumentById,
    updateDocument,
    deleteDocument
} from '../controller/document.controller.js';
import { protect, hrOrAdmin } from '../middleware/index.js';

const router = express.Router();

// Get all documents - HR or Admin only
router.get('/', protect, hrOrAdmin, getAllDocuments);

// Create document - HR or Admin only
router.post('/', protect, hrOrAdmin, createDocument);

// Get document by ID - Protected (access control in controller)
router.get('/:id', protect, getDocumentById);

// Update document - HR or Admin only
router.put('/:id', protect, hrOrAdmin, updateDocument);

// Delete document - HR or Admin only
router.delete('/:id', protect, hrOrAdmin, deleteDocument);

export default router;
