import express from 'express';
import { param, query } from 'express-validator';
import { handleValidationErrors } from '../middleware/validation.middleware.js';
import { requireAuth } from '../shared/middleware/auth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(requireAuth);

// Validation rules
const validateNotificationId = [
    param('id')
        .isMongoId()
        .withMessage('Invalid notification ID'),
    handleValidationErrors
];

const validatePagination = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    query('status')
        .optional()
        .isIn(['read', 'unread'])
        .withMessage('Status must be read or unread'),
    handleValidationErrors
];

// Get all notifications
router.get('/', validatePagination, async (req, res) => {
    try {
        // Return empty notifications for development
        res.json({
            success: true,
            data: []
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get notification by ID
router.get('/:id', validateNotificationId, async (req, res) => {
    try {
        res.status(404).json({
            success: false,
            message: 'Notification not found'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Mark notification as read
router.put('/:id/read', validateNotificationId, async (req, res) => {
    try {
        res.json({
            success: true,
            message: 'Notification marked as read'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

export default router;