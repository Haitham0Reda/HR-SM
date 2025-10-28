import express from 'express';
import {
    getAllPositions,
    createPosition,
    getPositionById,
    updatePosition,
    deletePosition
} from '../controller/position.controller.js';

const router = express.Router();

router.get('/', getAllPositions);
router.post('/', createPosition);
router.get('/:id', getPositionById);
router.put('/:id', updatePosition);
router.delete('/:id', deletePosition);

export default router;
