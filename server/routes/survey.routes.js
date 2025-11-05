import express from 'express';
import {
    getAllSurveys,
    createSurvey,
    getSurveyById,
    updateSurvey,
    deleteSurvey
} from '../controller/survey.controller.js';
import { protect, hrOrAdmin } from '../middleware/index.js';

const router = express.Router();

// Get all surveys - All authenticated users can view
router.get('/', protect, getAllSurveys);

// Create survey - HR or Admin only
router.post('/', protect, hrOrAdmin, createSurvey);

// Get survey by ID - All authenticated users
router.get('/:id', protect, getSurveyById);

// Update survey - HR or Admin only
router.put('/:id', protect, hrOrAdmin, updateSurvey);

// Delete survey - HR or Admin only
router.delete('/:id', protect, hrOrAdmin, deleteSurvey);

export default router;
