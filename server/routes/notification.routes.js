import express from 'express';
import {
    getAllNotifications,
    createNotification,
    getNotificationById,
    updateNotification,
    deleteNotification
} from '../controller/notification.controller.js';
import { protect, hrOrAdmin } from '../middleware/index.js';

const router = express.Router();

// Get all notifications - Protected (users see their own)
router.get('/', protect, getAllNotifications);

// Create notification - HR or Admin only
router.post('/', protect, hrOrAdmin, createNotification);

// Get notification by ID - Protected
router.get('/:id', protect, getNotificationById);

// Update notification (mark as read) - Protected
router.put('/:id', protect, updateNotification);

// Delete notification - HR or Admin only
router.delete('/:id', protect, hrOrAdmin, deleteNotification);

export default router;
