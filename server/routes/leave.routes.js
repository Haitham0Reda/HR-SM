import express from 'express';
import {
    getAllLeaves,
    createLeave,
    getLeaveById,
    updateLeave,
    deleteLeave
} from '../controller/leave.controller.js';

const router = express.Router();

router.get('/', getAllLeaves);
router.post('/', createLeave);
router.get('/:id', getLeaveById);
router.put('/:id', updateLeave);
router.delete('/:id', deleteLeave);

export default router;
