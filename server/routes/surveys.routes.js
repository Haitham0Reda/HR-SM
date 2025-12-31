import express from 'express';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// Get all surveys
router.get('/', async (req, res) => {
    try {
        const { status, type } = req.query;
        
        // Mock surveys data
        let surveys = [
            {
                id: 1,
                title: 'Employee Satisfaction Survey 2025',
                description: 'Annual survey to measure employee satisfaction and engagement',
                type: 'satisfaction',
                status: 'active',
                startDate: '2025-01-01T00:00:00Z',
                endDate: '2025-02-28T23:59:59Z',
                totalQuestions: 25,
                responses: 45,
                targetResponses: 100,
                isAnonymous: true,
                createdBy: 'HR Department'
            },
            {
                id: 2,
                title: 'Training Needs Assessment',
                description: 'Survey to identify training and development needs',
                type: 'training',
                status: 'draft',
                startDate: '2025-02-15T00:00:00Z',
                endDate: '2025-03-15T23:59:59Z',
                totalQuestions: 15,
                responses: 0,
                targetResponses: 80,
                isAnonymous: false,
                createdBy: 'Learning & Development'
            },
            {
                id: 3,
                title: 'Workplace Culture Assessment',
                description: 'Quarterly assessment of workplace culture and values',
                type: 'culture',
                status: 'completed',
                startDate: '2024-10-01T00:00:00Z',
                endDate: '2024-11-30T23:59:59Z',
                totalQuestions: 20,
                responses: 87,
                targetResponses: 75,
                isAnonymous: true,
                createdBy: 'Management Team'
            }
        ];

        // Apply filters
        if (status) {
            surveys = surveys.filter(survey => survey.status === status);
        }
        if (type) {
            surveys = surveys.filter(survey => survey.type === type);
        }

        res.json({
            success: true,
            data: surveys,
            message: 'Surveys retrieved successfully',
            total: surveys.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve surveys',
            error: error.message
        });
    }
});

// Get specific survey
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Mock survey data with questions
        const survey = {
            id: parseInt(id),
            title: 'Survey #' + id,
            description: 'Detailed survey description',
            type: 'satisfaction',
            status: 'active',
            startDate: '2025-01-01T00:00:00Z',
            endDate: '2025-02-28T23:59:59Z',
            totalQuestions: 5,
            responses: 25,
            targetResponses: 50,
            isAnonymous: true,
            createdBy: 'HR Department',
            questions: [
                {
                    id: 1,
                    type: 'rating',
                    question: 'How satisfied are you with your current role?',
                    options: ['Very Dissatisfied', 'Dissatisfied', 'Neutral', 'Satisfied', 'Very Satisfied'],
                    required: true
                },
                {
                    id: 2,
                    type: 'multiple-choice',
                    question: 'Which benefits are most important to you?',
                    options: ['Health Insurance', 'Retirement Plan', 'Flexible Hours', 'Remote Work', 'Professional Development'],
                    required: true,
                    allowMultiple: true
                },
                {
                    id: 3,
                    type: 'text',
                    question: 'What suggestions do you have for improving our workplace?',
                    required: false
                }
            ],
            createdAt: new Date(),
            updatedAt: new Date()
        };

        res.json({
            success: true,
            data: survey,
            message: 'Survey retrieved successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve survey',
            error: error.message
        });
    }
});

// Create new survey
router.post('/', async (req, res) => {
    try {
        const { 
            title, 
            description, 
            type = 'general', 
            startDate, 
            endDate, 
            questions = [],
            isAnonymous = true,
            targetResponses = 50
        } = req.body;
        
        if (!title || !startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Title, start date, and end date are required'
            });
        }

        // Mock survey creation
        const newSurvey = {
            id: Date.now(),
            title,
            description,
            type,
            status: 'draft',
            startDate,
            endDate,
            totalQuestions: questions.length,
            responses: 0,
            targetResponses,
            isAnonymous,
            createdBy: req.user?.name || 'Unknown',
            questions,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        res.status(201).json({
            success: true,
            data: newSurvey,
            message: 'Survey created successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to create survey',
            error: error.message
        });
    }
});

// Update survey
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        
        // Mock survey update
        const updatedSurvey = {
            id: parseInt(id),
            ...updateData,
            updatedAt: new Date()
        };

        res.json({
            success: true,
            data: updatedSurvey,
            message: 'Survey updated successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update survey',
            error: error.message
        });
    }
});

// Delete survey
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        res.json({
            success: true,
            message: `Survey ${id} deleted successfully`
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to delete survey',
            error: error.message
        });
    }
});

// Submit survey response
router.post('/:id/responses', async (req, res) => {
    try {
        const { id } = req.params;
        const { responses } = req.body;
        
        if (!responses || !Array.isArray(responses)) {
            return res.status(400).json({
                success: false,
                message: 'Responses array is required'
            });
        }

        // Mock response submission
        const submissionId = Date.now();
        
        res.status(201).json({
            success: true,
            data: {
                submissionId,
                surveyId: parseInt(id),
                submittedAt: new Date(),
                responseCount: responses.length
            },
            message: 'Survey response submitted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to submit survey response',
            error: error.message
        });
    }
});

// Get survey results/analytics
router.get('/:id/results', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Mock survey results
        const results = {
            surveyId: parseInt(id),
            totalResponses: 45,
            responseRate: '75%',
            completionRate: '92%',
            averageCompletionTime: '8 minutes',
            questionResults: [
                {
                    questionId: 1,
                    question: 'How satisfied are you with your current role?',
                    type: 'rating',
                    responses: {
                        'Very Satisfied': 18,
                        'Satisfied': 15,
                        'Neutral': 8,
                        'Dissatisfied': 3,
                        'Very Dissatisfied': 1
                    }
                },
                {
                    questionId: 2,
                    question: 'Which benefits are most important to you?',
                    type: 'multiple-choice',
                    responses: {
                        'Health Insurance': 35,
                        'Flexible Hours': 28,
                        'Remote Work': 22,
                        'Professional Development': 18,
                        'Retirement Plan': 15
                    }
                }
            ],
            generatedAt: new Date()
        };

        res.json({
            success: true,
            data: results,
            message: 'Survey results retrieved successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve survey results',
            error: error.message
        });
    }
});

export default router;