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
import { MODULES } from '../../../platform/system/models/license.model.js';

const router = express.Router();

// Apply authentication to all routes first
router.use(protect);

// Apply license validation to all notification routes (after authentication)
router.use(requireModuleLicense(MODULES.COMMUNICATION));

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
