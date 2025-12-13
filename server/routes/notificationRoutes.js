import express from 'express';
import { requireAuth } from '../shared/middleware/auth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(requireAuth);

// Get all notifications
router.get('/', async (req, res) => {
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
router.get('/:id', async (req, res) => {
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
router.put('/:id/read', async (req, res) => {
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