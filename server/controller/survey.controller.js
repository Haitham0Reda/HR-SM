/**
 * Survey Controller
 * 
 * Manages surveys, responses, and analytics
 */
import Survey from '../models/survey.model.js';
import User from '../models/user.model.js';
import Department from '../models/department.model.js';
import { sendSurveyAssignmentNotifications } from './surveyNotification.controller.js';
import { calculateTotalAssigned, convertToCSV } from '../utils/surveyHelpers.js';

/**
 * Get all surveys (Admin/HR view)
 */
export const getAllSurveys = async (req, res) => {
    try {
        const { status, surveyType, page = 1, limit = 50 } = req.query;

        const query = {};
        if (status) query.status = status;
        if (surveyType) query.surveyType = surveyType;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const surveys = await Survey.find(query)
            .populate('createdBy', 'username email')
            .populate('assignedTo.departments', 'name')
            .select('-responses') // Don't return responses in list view
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip(skip);

        const total = await Survey.countDocuments(query);

        res.status(200).json({
            success: true,
            surveys,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (err) {
        console.error('Error in getAllSurveys:', err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get surveys assigned to employee
 */
export const getEmployeeSurveys = async (req, res) => {
    try {
        const surveys = await Survey.findActiveSurveysForUser(req.user._id);

        console.log(`[getEmployeeSurveys] User: ${req.user.username} (${req.user._id})`);
        console.log(`[getEmployeeSurveys] Found ${surveys.length} active surveys`);

        // Map surveys with completion status
        const surveysWithStatus = surveys.map(survey => {
            const hasResponded = survey.hasUserResponded(req.user._id);
            const response = hasResponded ? survey.getUserResponse(req.user._id) : null;

            console.log(`[getEmployeeSurveys] Survey: ${survey.title}`);
            console.log(`  - hasResponded: ${hasResponded}`);
            console.log(`  - isComplete: ${response?.isComplete || false}`);
            console.log(`  - submittedAt: ${response?.submittedAt}`);

            return {
                _id: survey._id,
                title: survey.title,
                description: survey.description,
                surveyType: survey.surveyType,
                questions: survey.questions,
                questionCount: survey.questions.length,
                settings: survey.settings,
                isMandatory: survey.settings.isMandatory,
                allowAnonymous: survey.settings.allowAnonymous,
                startDate: survey.settings.startDate,
                endDate: survey.settings.endDate,
                status: survey.status,
                hasResponded,
                isComplete: response?.isComplete || false,
                completionPercentage: response?.completionPercentage || 0,
                submittedAt: response?.submittedAt
            };
        });

        res.status(200).json({
            success: true,
            surveys: surveysWithStatus
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Create survey
 */
export const createSurvey = async (req, res) => {
    try {
        const surveyData = {
            ...req.body,
            createdBy: req.user._id
        };

        const survey = new Survey(surveyData);
        await survey.save();
        await survey.populate('createdBy', 'username email');

        res.status(201).json({
            success: true,
            message: 'Survey created successfully',
            survey
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

/**
 * Get survey by ID
 */
export const getSurveyById = async (req, res) => {
    try {
        const survey = await Survey.findById(req.params.id)
            .populate('createdBy', 'username email')
            .populate('assignedTo.departments', 'name')
            .populate('responses.respondent', 'username email profile');

        if (!survey) {
            return res.status(404).json({ error: 'Survey not found' });
        }

        // Non-admin users don't see other users' responses
        if (!['hr', 'admin'].includes(req.user?.role)) {
            const surveyData = survey.toObject();
            surveyData.totalResponses = survey.responses.length;
            surveyData.myResponse = survey.getUserResponse(req.user._id);
            delete surveyData.responses;
            return res.status(200).json({
                success: true,
                survey: surveyData
            });
        }

        // For HR/Admin, hide respondent info for anonymous responses
        const surveyData = survey.toObject();
        surveyData.responses = surveyData.responses.map(r => {
            if (r.isAnonymous) {
                return {
                    ...r,
                    respondent: null
                };
            }
            return r;
        });

        res.status(200).json({
            success: true,
            survey: surveyData
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Update survey
 */
export const updateSurvey = async (req, res) => {
    try {
        const survey = await Survey.findById(req.params.id);

        if (!survey) {
            return res.status(404).json({ error: 'Survey not found' });
        }

        // Don't allow updates if already published and has responses
        if (survey.status !== 'draft' && survey.responses.length > 0) {
            return res.status(400).json({
                error: 'Cannot update survey that has responses. Close and create new survey instead.'
            });
        }

        Object.assign(survey, req.body);
        survey.lastModifiedBy = req.user._id;

        await survey.save();

        res.status(200).json({
            success: true,
            message: 'Survey updated successfully',
            survey
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

/**
 * Delete survey
 */
export const deleteSurvey = async (req, res) => {
    try {
        const survey = await Survey.findById(req.params.id);

        if (!survey) {
            return res.status(404).json({ error: 'Survey not found' });
        }

        // Don't allow deletion if has responses
        if (survey.responses.length > 0) {
            return res.status(400).json({
                error: 'Cannot delete survey that has responses. Archive it instead.'
            });
        }

        await survey.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Survey deleted successfully'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Submit survey response
 */
export const submitSurveyResponse = async (req, res) => {
    try {
        console.log('Received survey submission request:', {
            surveyId: req.params.id,
            body: req.body,
            userId: req.user._id
        });

        const { responses, isAnonymous = false } = req.body;

        if (!responses || !Array.isArray(responses)) {
            return res.status(400).json({ error: 'Invalid responses format. Expected an array.' });
        }

        const survey = await Survey.findById(req.params.id);

        if (!survey) {
            return res.status(404).json({ error: 'Survey not found' });
        }

        if (survey.status !== 'active') {
            return res.status(400).json({ error: 'Survey is not active' });
        }

        // Check if survey is currently active (date range)
        if (!survey.isCurrentlyActive) {
            return res.status(400).json({ error: 'Survey is not available at this time' });
        }

        // Check if anonymous is allowed
        if (isAnonymous && !survey.settings.allowAnonymous) {
            return res.status(400).json({ error: 'Anonymous responses are not allowed for this survey' });
        }

        console.log('Adding response with answers:', responses);

        // Add response with metadata - pass responses as the answers parameter
        await survey.addResponse(req.user._id, responses, isAnonymous, {
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });

        console.log('Response added successfully. Total responses:', survey.stats.totalResponses);

        res.status(201).json({
            success: true,
            message: 'Survey response submitted successfully',
            totalResponses: survey.stats.totalResponses
        });
    } catch (err) {
        console.error('Survey submission error:', err);
        res.status(400).json({ error: err.message });
    }
};

/**
 * Publish survey
 */
export const publishSurvey = async (req, res) => {
    try {
        const survey = await Survey.findById(req.params.id);

        if (!survey) {
            return res.status(404).json({ error: 'Survey not found' });
        }

        if (survey.status !== 'draft') {
            return res.status(400).json({ error: 'Only draft surveys can be published' });
        }

        // Validate survey has questions
        if (survey.questions.length === 0) {
            return res.status(400).json({ error: 'Survey must have at least one question' });
        }

        // Validate assignment
        const hasAssignment = survey.assignedTo.allEmployees ||
            survey.assignedTo.departments.length > 0 ||
            survey.assignedTo.roles.length > 0 ||
            survey.assignedTo.specificEmployees.length > 0;

        if (!hasAssignment) {
            return res.status(400).json({ error: 'Survey must be assigned to at least one target' });
        }

        survey.status = 'active';
        survey.publishedAt = new Date();

        // Calculate total assigned
        survey.stats.totalAssigned = await calculateTotalAssigned(survey);

        await survey.save();

        // Send assignment notifications
        if (survey.settings.emailNotifications.enabled && survey.settings.emailNotifications.sendOnAssignment) {
            try {
                await sendSurveyAssignmentNotifications(survey._id);
            } catch (notifError) {
                console.error('Error sending survey assignment notifications:', notifError);
                // Continue even if notifications fail
            }
        }

        res.status(200).json({
            success: true,
            message: 'Survey published successfully',
            survey
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

/**
 * Close survey
 */
export const closeSurvey = async (req, res) => {
    try {
        const survey = await Survey.findById(req.params.id);

        if (!survey) {
            return res.status(404).json({ error: 'Survey not found' });
        }

        survey.status = 'closed';
        survey.closedAt = new Date();

        await survey.save();

        res.status(200).json({
            success: true,
            message: 'Survey closed successfully',
            survey
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get survey statistics
 */
export const getSurveyStatistics = async (req, res) => {
    try {
        const survey = await Survey.findById(req.params.id);

        if (!survey) {
            return res.status(404).json({ error: 'Survey not found' });
        }

        // Calculate question-wise statistics
        const questionStats = survey.questions.map(question => {
            const responses = survey.responses
                .filter(r => r.isComplete)
                .map(r => r.answers.find(a => a.questionId.toString() === question._id.toString()))
                .filter(a => a);

            let stats = {
                questionId: question._id,
                questionText: question.questionText,
                questionType: question.questionType,
                totalResponses: responses.length
            };

            if (question.questionType === 'single-choice' || question.questionType === 'multiple-choice') {
                // Count responses per option
                const optionCounts = {};
                question.options.forEach(opt => optionCounts[opt] = 0);

                responses.forEach(r => {
                    if (Array.isArray(r.answer)) {
                        r.answer.forEach(ans => {
                            if (optionCounts[ans] !== undefined) optionCounts[ans]++;
                        });
                    } else if (optionCounts[r.answer] !== undefined) {
                        optionCounts[r.answer]++;
                    }
                });

                stats.optionCounts = optionCounts;
            } else if (question.questionType === 'rating') {
                // Calculate average rating
                const ratings = responses.map(r => parseFloat(r.answer)).filter(n => !isNaN(n));
                stats.averageRating = ratings.length > 0
                    ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2)
                    : 0;
                stats.ratingDistribution = {};
                for (let i = question.ratingScale.min; i <= question.ratingScale.max; i++) {
                    stats.ratingDistribution[i] = ratings.filter(r => r === i).length;
                }
            } else if (question.questionType === 'yes-no') {
                stats.yesCount = responses.filter(r => r.answer === true || r.answer === 'yes').length;
                stats.noCount = responses.filter(r => r.answer === false || r.answer === 'no').length;
            }

            return stats;
        });

        res.status(200).json({
            success: true,
            statistics: {
                survey: {
                    _id: survey._id,
                    title: survey.title,
                    totalAssigned: survey.stats.totalAssigned,
                    totalResponses: survey.stats.totalResponses,
                    completionRate: survey.stats.completionRate,
                    status: survey.status
                },
                questions: questionStats
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Export survey responses
 */
export const exportSurveyResponses = async (req, res) => {
    try {
        const { format = 'json' } = req.query;

        const survey = await Survey.findById(req.params.id)
            .populate('responses.respondent', 'username email profile');

        if (!survey) {
            return res.status(404).json({ error: 'Survey not found' });
        }

        const responses = survey.responses.filter(r => r.isComplete).map(r => {
            const data = {
                responseId: r._id,
                submittedAt: r.submittedAt,
                isAnonymous: r.isAnonymous
            };

            if (!r.isAnonymous && r.respondent) {
                data.respondent = {
                    username: r.respondent.username,
                    email: r.respondent.email,
                    name: `${r.respondent.profile?.firstName || ''} ${r.respondent.profile?.lastName || ''}`.trim()
                };
            }

            r.answers.forEach(answer => {
                const question = survey.questions.id(answer.questionId);
                if (question) {
                    data[question.questionText] = answer.answer;
                }
            });

            return data;
        });

        if (format === 'csv') {
            // Convert to CSV
            const csv = convertToCSV(responses);
            res.setHeader('Content-Type', 'text/csv');
            res.attachment(`survey-${survey._id}-${Date.now()}.csv`);
            return res.status(200).send(csv);
        }

        res.status(200).json({
            success: true,
            survey: {
                title: survey.title,
                totalResponses: responses.length
            },
            responses
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
