import express from 'express';
import {
    getAllRequests,
    createRequest,
    getRequestById,
    updateRequest,
    deleteRequest
} from '../controller/request.controller.js';

const router = express.Router();

router.get('/', getAllRequests);
router.post('/', createRequest);
router.get('/:id', getRequestById);
router.put('/:id', updateRequest);
router.delete('/:id', deleteRequest);

export default router;
