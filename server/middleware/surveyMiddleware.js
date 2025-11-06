/**
 * Survey Middleware
 * 
 * Validation and business logic for surveys
 */
import mongoose from 'mongoose';

/**
 * Validate survey questions
 */
export const validateSurveyQuestions = (req, res, next) => {
    if (req.body.questions && req.body.questions.length > 0) {
        for (let i = 0; i < req.body.questions.length; i++) {
            const question = req.body.questions[i];

            if (!question.questionText) {
                return res.status(400).json({
                    success: false,
                    message: `Question ${i + 1} must have questionText`
                });
            }

            if (!question.type) {
                return res.status(400).json({
                    success: false,
                    message: `Question ${i + 1} must have a type`
                });
            }

            const validTypes = ['text', 'single-choice', 'multiple-choice', 'rating', 'date'];
            if (!validTypes.includes(question.type)) {
                return res.status(400).json({
                    success: false,
                    message: `Question ${i + 1} type must be one of: ${validTypes.join(', ')}`
                });
            }

            // Validate choice questions have options
            if (['single-choice', 'multiple-choice'].includes(question.type)) {
                if (!question.options || question.options.length < 2) {
                    return res.status(400).json({
                        success: false,
                        message: `Question ${i + 1} (${question.type}) must have at least 2 options`
                    });
                }
            }
        }
    } else if (req.body.questions !== undefined) {
        return res.status(400).json({
            success: false,
            message: 'Survey must have at least one question'
        });
    }
    next();
};

/**
 * Auto-set created by from authenticated user
 */
export const setSurveyCreatedBy = (req, res, next) => {
    if (req.user && !req.body.createdBy) {
        req.body.createdBy = req.user._id;
    }
    next();
};

/**
 * Validate survey response
 */
export const validateSurveyResponse = async (req, res, next) => {
    try {
        if (req.body.answers && req.params.id) {
            const Survey = mongoose.model('Survey');
            const survey = await Survey.findById(req.params.id);

            if (!survey) {
                return res.status(404).json({
                    success: false,
                    message: 'Survey not found'
                });
            }

            if (!survey.isActive) {
                return res.status(400).json({
                    success: false,
                    message: 'Survey is not active'
                });
            }

            // Validate answers match questions
            if (req.body.answers.length !== survey.questions.length) {
                return res.status(400).json({
                    success: false,
                    message: 'Number of answers must match number of questions'
                });
            }

            // Validate required questions are answered
            for (let i = 0; i < survey.questions.length; i++) {
                const question = survey.questions[i];
                const answer = req.body.answers[i];

                if (question.required && (!answer || answer === '')) {
                    return res.status(400).json({
                        success: false,
                        message: `Question ${i + 1} is required`
                    });
                }

                // Validate choice answers are valid options
                if (question.type === 'single-choice' && answer) {
                    if (!question.options.includes(answer)) {
                        return res.status(400).json({
                            success: false,
                            message: `Answer for question ${i + 1} must be one of the provided options`
                        });
                    }
                }

                if (question.type === 'multiple-choice' && answer && Array.isArray(answer)) {
                    const invalidAnswers = answer.filter(a => !question.options.includes(a));
                    if (invalidAnswers.length > 0) {
                        return res.status(400).json({
                            success: false,
                            message: `Some answers for question ${i + 1} are not valid options`
                        });
                    }
                }
            }
        }
        next();
    } catch (error) {
        console.error('Error validating survey response:', error);
        return res.status(500).json({
            success: false,
            message: 'Error validating survey response'
        });
    }
};

/**
 * Check if user already responded to survey
 */
export const checkDuplicateResponse = async (req, res, next) => {
    try {
        if (req.params.id && req.user) {
            const Survey = mongoose.model('Survey');
            const survey = await Survey.findById(req.params.id);

            if (survey) {
                const hasResponded = survey.responses.some(
                    response => response.respondent.toString() === req.user._id.toString()
                );

                if (hasResponded) {
                    return res.status(400).json({
                        success: false,
                        message: 'You have already responded to this survey'
                    });
                }
            }
        }
        next();
    } catch (error) {
        console.error('Error checking duplicate response:', error);
        next();
    }
};

export default {
    validateSurveyQuestions,
    setSurveyCreatedBy,
    validateSurveyResponse,
    checkDuplicateResponse
};
