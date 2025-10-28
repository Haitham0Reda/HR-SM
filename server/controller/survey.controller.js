// Survey Controller
import Survey from '../models/survey.model.js';

export const getAllSurveys = async (req, res) => {
    try {
        const surveys = await Survey.find();
        res.json(surveys);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const createSurvey = async (req, res) => {
    try {
        const survey = new Survey(req.body);
        await survey.save();
        res.status(201).json(survey);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

export const getSurveyById = async (req, res) => {
    try {
        const survey = await Survey.findById(req.params.id);
        if (!survey) return res.status(404).json({ error: 'Survey not found' });
        res.json(survey);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const updateSurvey = async (req, res) => {
    try {
        const survey = await Survey.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!survey) return res.status(404).json({ error: 'Survey not found' });
        res.json(survey);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

export const deleteSurvey = async (req, res) => {
    try {
        const survey = await Survey.findByIdAndDelete(req.params.id);
        if (!survey) return res.status(404).json({ error: 'Survey not found' });
        res.json({ message: 'Survey deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
