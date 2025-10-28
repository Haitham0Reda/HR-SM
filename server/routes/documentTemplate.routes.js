import express from 'express';
import {
    getAllDocumentTemplates,
    createDocumentTemplate,
    getDocumentTemplateById,
    updateDocumentTemplate,
    deleteDocumentTemplate
} from '../controller/documentTemplate.controller.js';

const router = express.Router();

router.get('/', getAllDocumentTemplates);
router.post('/', createDocumentTemplate);
router.get('/:id', getDocumentTemplateById);
router.put('/:id', updateDocumentTemplate);
router.delete('/:id', deleteDocumentTemplate);

export default router;
