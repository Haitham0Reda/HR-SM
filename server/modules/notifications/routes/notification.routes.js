import express from 'express';
import {
    getAllNotifications,
    createNotification,
    getNotificationById,
    updateNotification,
    deleteNotification,
    markAsRead,
    markAllAsRead
} from '../controllers/notification.controller.js';
import { protect, hrOrAdmin } from '../../../middleware/index.js';
import { moduleGuard } from '../../../middleware/moduleGuard.js';

const router = express.Router();

// Apply authentication and module guard to all routes
router.use(protect);
router.use(moduleGuard('communication'));

// Get all notifications - Protected (users see their own)
router.get('/', getAllNotifications);

// Mark all as read - Protected
router.put('/read-all', markAllAsRead);

// Create notification - HR or Admin only
router.post('/', hrOrAdmin, createNotification);

// Get notification by ID - Protected
router.get('/:id', getNotificationById);

// Mark notification as read - Protected
router.put('/:id/read', markAsRead);

// Update notification - Protected
router.put('/:id', updateNotification);

// Delete notification - HR or Admin only
router.delete('/:id', hrOrAdmin, deleteNotification);

export default router;
