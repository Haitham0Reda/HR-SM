import express from 'express';
import {
    getAllAttendance,
    createAttendance,
    getAttendanceById,
    updateAttendance,
    deleteAttendance
} from '../controller/attendance.controller.js';
import { protect, checkActive } from '../middleware/index.js';

const router = express.Router();

// Get all attendance records - protected
router.get('/', protect, getAllAttendance);

// Create attendance record - protected, requires active employee
router.post('/', protect, checkActive, createAttendance);

// Get attendance by ID
router.get('/:id', protect, getAttendanceById);

// Update attendance record
router.put('/:id', protect, updateAttendance);

// Delete attendance record - admin only recommended
router.delete('/:id', protect, deleteAttendance);

export default router;
