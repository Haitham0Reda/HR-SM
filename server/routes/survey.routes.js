import express from 'express';
import {
    getAllSurveys,
    getEmployeeSurveys,
    createSurvey,
    getSurveyById,
    updateSurvey,
    deleteSurvey,
    submitSurveyResponse,
    publishSurvey,
    closeSurvey,
    getSurveyStatistics,
    exportSurveyResponses
} from '../controller/survey.controller.js';
import {
    getUserNotifications,
    markNotificationAsRead,
    sendSurveyReminders
} from '../controller/surveyNotification.controller.js';
import {
    protect,
    hrOrAdmin,
    validateSurveyQuestions,
    setSurveyCreatedBy,
    validateSurveyResponse,
    checkDuplicateResponse
} from '../middleware/index.js';

const router = express.Router();

// Get all surveys - HR or Admin
router.get('/',
    protect,
    hrOrAdmin,
    getAllSurveys
);

// Get employee's assigned surveys - Protected
router.get('/my-surveys',
    protect,
    getEmployeeSurveys
);

// Get survey by ID - All authenticated users
router.get('/:id',
    protect,
    getSurveyById
);

// Create survey - HR or Admin only with validation
router.post('/',
    protect,
    hrOrAdmin,
    validateSurveyQuestions,
    setSurveyCreatedBy,
    createSurvey
);

// Update survey - HR or Admin only with validation
router.put('/:id',
    protect,
    hrOrAdmin,
    validateSurveyQuestions,
    updateSurvey
);

// Delete survey - HR or Admin only
router.delete('/:id',
    protect,
    hrOrAdmin,
    deleteSurvey
);

// Publish survey - HR or Admin
router.post('/:id/publish',
    protect,
    hrOrAdmin,
    publishSurvey
);

// Close survey - HR or Admin
router.post('/:id/close',
    protect,
    hrOrAdmin,
    closeSurvey
);

// Send reminders - HR or Admin
router.post('/:id/send-reminders',
    protect,
    hrOrAdmin,
    async (req, res) => {
        try {
            const result = await sendSurveyReminders(req.params.id);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
);

// Submit survey response - Protected, with validation
router.post('/:id/respond',
    protect,
    checkDuplicateResponse,
    validateSurveyResponse,
    submitSurveyResponse
);

// Get survey statistics - HR or Admin
router.get('/:id/statistics',
    protect,
    hrOrAdmin,
    getSurveyStatistics
);

// Export survey responses - HR or Admin
router.get('/:id/export',
    protect,
    hrOrAdmin,
    exportSurveyResponses
);

// Get user's survey notifications
router.get('/notifications/me',
    protect,
    getUserNotifications
);

// Mark notification as read
router.put('/notifications/:id/read',
    protect,
    markNotificationAsRead
);

export default router;
