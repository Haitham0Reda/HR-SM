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
                    error: `Question ${i + 1} must have questionText`
                });
            }

            if (!question.questionType) {
                return res.status(400).json({
                    success: false,
                    error: `Question ${i + 1} must have a questionType`
                });
            }

            const validTypes = [
                'text',
                'textarea',
                'single-choice',
                'multiple-choice',
                'rating',
                'yes-no',
                'number',
                'date'
            ];

            if (!validTypes.includes(question.questionType)) {
                return res.status(400).json({
                    success: false,
                    error: `Question ${i + 1} type must be one of: ${validTypes.join(', ')}`
                });
            }

            // Validate choice questions have options
            if (['single-choice', 'multiple-choice'].includes(question.questionType)) {
                if (!question.options || question.options.length < 2) {
                    return res.status(400).json({
                        success: false,
                        error: `Question ${i + 1} (${question.questionType}) must have at least 2 options`
                    });
                }
            }

            // Validate rating questions have valid scale
            if (question.questionType === 'rating') {
                if (question.ratingScale) {
                    const { min, max } = question.ratingScale;
                    if (min >= max) {
                        return res.status(400).json({
                            success: false,
                            error: `Question ${i + 1}: Rating scale min must be less than max`
                        });
                    }
                    if (max > 10) {
                        return res.status(400).json({
                            success: false,
                            error: `Question ${i + 1}: Rating scale max cannot exceed 10`
                        });
                    }
                }
            }
        }
    } else if (req.body.questions !== undefined && req.body.status === 'active') {
        return res.status(400).json({
            success: false,
            error: 'Active survey must have at least one question'
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
                    error: 'Survey not found'
                });
            }

            if (survey.status !== 'active') {
                return res.status(400).json({
                    success: false,
                    error: 'Survey is not active'
                });
            }

            // Check if survey is within date range
            if (!survey.isCurrentlyActive) {
                return res.status(400).json({
                    success: false,
                    error: 'Survey is not available at this time'
                });
            }

            // Validate all answers have questionId
            for (let i = 0; i < req.body.answers.length; i++) {
                const answer = req.body.answers[i];

                if (!answer.questionId) {
                    return res.status(400).json({
                        success: false,
                        error: `Answer ${i + 1} must include questionId`
                    });
                }

                const question = survey.questions.id(answer.questionId);

                if (!question) {
                    return res.status(400).json({
                        success: false,
                        error: `Question not found for answer ${i + 1}`
                    });
                }

                // Validate required questions
                if (question.required && (answer.answer === undefined || answer.answer === null || answer.answer === '')) {
                    return res.status(400).json({
                        success: false,
                        error: `Question "${question.questionText}" is required`
                    });
                }

                // Validate choice answers are valid options
                if (question.questionType === 'single-choice' && answer.answer) {
                    if (!question.options.includes(answer.answer)) {
                        return res.status(400).json({
                            success: false,
                            error: `Answer for "${question.questionText}" must be one of the provided options`
                        });
                    }
                }

                if (question.questionType === 'multiple-choice' && answer.answer) {
                    if (!Array.isArray(answer.answer)) {
                        return res.status(400).json({
                            success: false,
                            error: `Answer for "${question.questionText}" must be an array`
                        });
                    }

                    const invalidAnswers = answer.answer.filter(a => !question.options.includes(a));
                    if (invalidAnswers.length > 0) {
                        return res.status(400).json({
                            success: false,
                            error: `Some answers for "${question.questionText}" are not valid options`
                        });
                    }
                }

                // Validate rating range
                if (question.questionType === 'rating' && answer.answer !== undefined) {
                    const rating = parseFloat(answer.answer);
                    const min = question.ratingScale?.min || 1;
                    const max = question.ratingScale?.max || 5;

                    if (isNaN(rating) || rating < min || rating > max) {
                        return res.status(400).json({
                            success: false,
                            error: `Rating for "${question.questionText}" must be between ${min} and ${max}`
                        });
                    }
                }

                // Validate number input
                if (question.questionType === 'number' && answer.answer !== undefined && answer.answer !== '') {
                    if (isNaN(parseFloat(answer.answer))) {
                        return res.status(400).json({
                            success: false,
                            error: `Answer for "${question.questionText}" must be a number`
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
            error: 'Error validating survey response'
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
                // Allow multiple submissions if enabled
                if (survey.settings.allowMultipleSubmissions) {
                    return next();
                }

                const hasResponded = survey.responses.some(
                    response => response.respondent && response.respondent.toString() === req.user._id.toString()
                );

                if (hasResponded) {
                    return res.status(400).json({
                        success: false,
                        error: 'You have already responded to this survey'
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
