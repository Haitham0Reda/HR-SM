import express from 'express';
import { requireAuth } from '../shared/middleware/auth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(requireAuth);

// Get employee of the month
router.get('/employee-of-month', async (req, res) => {
    try {
        // Return placeholder data for development
        res.json({
            success: true,
            data: {
                employee: {
                    id: 'emp-001',
                    name: 'John Doe',
                    department: 'Human Resources',
                    achievements: ['Excellent performance', 'Team collaboration'],
                    photo: null
                },
                month: new Date().toISOString().slice(0, 7), // YYYY-MM format
                reason: 'Outstanding performance and dedication'
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get dashboard statistics
router.get('/stats', async (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                totalEmployees: 8,
                activeProjects: 5,
                pendingRequests: 3,
                upcomingEvents: 2
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get recent activities
router.get('/activities', async (req, res) => {
    try {
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

export default router;