import express from 'express';
import {
    getAllAttendance,
    createAttendance,
    getAttendanceById,
    updateAttendance,
    deleteAttendance
} from '../controller/attendance.controller.js';


const router = express.Router();

router.get('/', getAllAttendance);
router.post('/', createAttendance);
router.get('/:id', getAttendanceById);
router.put('/:id', updateAttendance);
router.delete('/:id', deleteAttendance);

export default router;
