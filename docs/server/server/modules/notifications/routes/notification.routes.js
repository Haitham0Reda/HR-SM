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
import { requireModuleLicense } from '../../../middleware/licenseValidation.middleware.js';
import { MODULES } from '../../../models/license.model.js';

const router = express.Router();

// Apply license validation to all notification routes
router.use(requireModuleLicense(MODULES.COMMUNICATION));

// Get all notifications - Protected (users see their own)
router.get('/', protect, getAllNotifications);

// Mark all as read - Protected
router.put('/read-all', protect, markAllAsRead);

// Create notification - HR or Admin only
router.post('/', protect, hrOrAdmin, createNotification);

// Get notification by ID - Protected
router.get('/:id', protect, getNotificationById);

// Mark notification as read - Protected
router.put('/:id/read', protect, markAsRead);

// Update notification - Protected
router.put('/:id', protect, updateNotification);

// Delete notification - HR or Admin only
router.delete('/:id', protect, hrOrAdmin, deleteNotification);

export default router;
