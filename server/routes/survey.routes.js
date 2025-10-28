import express from 'express';
import {
    getAllSurveys,
    createSurvey,
    getSurveyById,
    updateSurvey,
    deleteSurvey
} from '../controller/survey.controller.js';

const router = express.Router();

router.get('/', getAllSurveys);
router.post('/', createSurvey);
router.get('/:id', getSurveyById);
router.put('/:id', updateSurvey);
router.delete('/:id', deleteSurvey);

export default router;
