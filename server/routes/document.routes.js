import express from 'express';
import {
    getAllDocuments,
    createDocument,
    getDocumentById,
    updateDocument,
    deleteDocument
} from '../controller/document.controller.js';

const router = express.Router();

router.get('/', getAllDocuments);
router.post('/', createDocument);
router.get('/:id', getDocumentById);
router.put('/:id', updateDocument);
router.delete('/:id', deleteDocument);

export default router;
