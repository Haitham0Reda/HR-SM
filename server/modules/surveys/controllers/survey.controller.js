/**
 * Survey Controller
 * 
 * Manages surveys, responses, and analytics
 */
import SurveyService from '../services/SurveyService.js';
import Survey from '../models/survey.model.js';
import { sendSurveyAssignmentNotifications } from './surveyNotification.controller.js';

const surveyService = new SurveyService();

/**
 * Get all surveys (Admin/HR view)
 */
export const getAllSurveys = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId;

        if (!tenantId) {
            console.log('❌ getAllSurveys: Missing tenant ID', { 
                userTenantId: req.user?.tenantId, 
                reqTenantId: req.tenantId,
                userId: req.user?._id 
            });
            return res.status(400).json({ error: 'Tenant ID is required' });
        }

        console.log('✅ getAllSurveys: Processing request', { 
            tenantId, 
            userId: req.user?._id,
            userRole: req.user?.role 
        });

        const { status, surveyType, page = 1, limit = 50 } = req.query;

        const options = {};
        if (status) options.filter = { ...options.filter, status };
        if (surveyType) options.filter = { ...options.filter, surveyType };

        const skip = (parseInt(page) - 1) * parseInt(limit);
        options.skip = skip;
        options.limit = parseInt(limit);

        const surveys = await surveyService.getAllSurveys(tenantId, options);
        const total = surveys.length; // This would need to be implemented properly with count

        console.log('✅ getAllSurveys: Found surveys', { 
            tenantId, 
            count: surveys.length,
            surveyIds: surveys.map(s => s._id)
        });

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
        console.error('❌ getAllSurveys: Error', { 
            tenantId: req.user?.tenantId || req.tenantId,
            error: err.message,
            stack: err.stack
        });
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
};

/**
 * Get surveys assigned to employee
 */
export const getEmployeeSurveys = async (req, res) => {
    try {
        // Check if user is authenticated
        if (!req.user) {
            console.log('❌ getEmployeeSurveys: User not authenticated');
            return res.status(401).json({ 
                success: false,
                error: 'Authentication required' 
            });
        }

        const tenantId = req.user?.tenantId || req.tenantId;

        if (!tenantId) {
            console.log('❌ getEmployeeSurveys: Missing tenant ID', { 
                userTenantId: req.user?.tenantId, 
                reqTenantId: req.tenantId,
                userId: req.user?._id 
            });
            return res.status(400).json({ 
                success: false,
                error: 'Tenant ID is required' 
            });
        }

        console.log('✅ getEmployeeSurveys: Processing request', { 
            tenantId, 
            userId: req.user?._id,
            userRole: req.user?.role,
            userDepartment: req.user?.department
        });

        try {
            // Use the service which returns surveys with completion status already mapped
            const surveys = await surveyService.getEmployeeSurveys(
                req.user._id,
                req.user.role,
                req.user.department,
                tenantId
            );

            console.log(`✅ getEmployeeSurveys: Found ${surveys.length} surveys for user: ${req.user.username} (${req.user._id}) in tenant: ${tenantId}`);

            res.status(200).json({
                success: true,
                surveys
            });
        } catch (serviceError) {
            console.error('❌ getEmployeeSurveys: Service error', {
                tenantId,
                userId: req.user?._id,
                error: serviceError.message,
                stack: serviceError.stack,
                name: serviceError.name
            });
            throw serviceError;
        }
    } catch (err) {
        console.error('❌ getEmployeeSurveys: Error', { 
            tenantId: req.user?.tenantId || req.tenantId,
            userId: req.user?._id,
            error: err.message,
            stack: err.stack
        });
        res.status(500).json({ 
            success: false,
            error: err.message || 'Failed to fetch surveys'
        });
    }
};

/**
 * Create survey
 */
export const createSurvey = async (req, res) => {
    try {
        // Check if user is authenticated
        if (!req.user) {
            console.log('❌ createSurvey: User not authenticated');
            return res.status(401).json({ 
                success: false,
                error: 'Authentication required' 
            });
        }

        const tenantId = req.user?.tenantId || req.tenantId;

        if (!tenantId) {
            console.log('❌ createSurvey: Missing tenant ID', { 
                userTenantId: req.user?.tenantId, 
                reqTenantId: req.tenantId,
                userId: req.user?._id 
            });
            return res.status(400).json({ error: 'Tenant ID is required' });
        }

        console.log('✅ createSurvey: Processing request', { 
            tenantId, 
            userId: req.user._id,
            surveyTitle: req.body.title
        });

        // Validate required fields
        if (!req.body.title || !req.body.title.trim()) {
            return res.status(400).json({ error: 'Survey title is required' });
        }

        if (!req.body.questions || !Array.isArray(req.body.questions) || req.body.questions.length === 0) {
            return res.status(400).json({ error: 'Survey must have at least one question' });
        }

        // Use the service to create survey (handles multi-tenant database)
        // Remove createdBy from body if it exists, we'll use req.user._id
        const { createdBy, ...surveyData } = req.body;
        
        const survey = await surveyService.createSurvey(
            surveyData,
            req.user._id,
            tenantId
        );

        console.log('✅ createSurvey: Survey created successfully', { 
            tenantId,
            surveyId: survey._id,
            title: survey.title,
            createdBy: req.user._id,
            database: `hrsm_${tenantId}`
        });

        res.status(201).json({
            success: true,
            message: 'Survey created successfully',
            survey
        });
    } catch (err) {
        console.error('❌ createSurvey: Error', { 
            tenantId: req.user?.tenantId || req.tenantId,
            userId: req.user?._id,
            error: err.message,
            stack: err.stack,
            validationErrors: err.errors ? Object.keys(err.errors).map(key => ({
                field: key,
                message: err.errors[key].message
            })) : null
        });
        
        // Return detailed validation errors if available
        if (err.name === 'ValidationError') {
            return res.status(400).json({ 
                error: 'Validation failed',
                details: Object.keys(err.errors).map(key => ({
                    field: key,
                    message: err.errors[key].message
                }))
            });
        }
        
        res.status(400).json({ error: err.message });
    }
};

/**
 * Get survey by ID
 */
export const getSurveyById = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId;

        if (!tenantId) {
            console.log('❌ getSurveyById: Missing tenant ID', { 
                userTenantId: req.user?.tenantId, 
                reqTenantId: req.tenantId,
                userId: req.user?._id,
                surveyId: req.params.id
            });
            return res.status(400).json({ error: 'Tenant ID is required' });
        }

        console.log('✅ getSurveyById: Processing request', { 
            tenantId, 
            userId: req.user?._id,
            surveyId: req.params.id,
            userRole: req.user?.role
        });

        const survey = await Survey.findOne({ _id: req.params.id, tenantId })
            .populate('createdBy', 'username email')
            .populate('assignedTo.departments', 'name')
            .populate('responses.respondent', 'username email profile');

        if (!survey) {
            console.log('❌ getSurveyById: Survey not found', { 
                tenantId,
                surveyId: req.params.id,
                userId: req.user?._id
            });
            return res.status(404).json({ error: 'Survey not found' });
        }

        console.log('✅ getSurveyById: Survey found', { 
            tenantId,
            surveyId: survey._id,
            title: survey.title,
            userId: req.user?._id,
            userRole: req.user?.role,
            totalResponses: survey.responses?.length || 0
        });

        // Non-admin users don't see other users' responses
        if (!['hr', 'admin'].includes(req.user?.role)) {
            const surveyData = survey.toObject();
            surveyData.totalResponses = survey.responses.length;
            surveyData.myResponse = survey.getUserResponse(req.user._id);
            delete surveyData.responses;
            
            console.log('✅ getSurveyById: Returning employee view', { 
                tenantId,
                surveyId: survey._id,
                userId: req.user._id,
                hasMyResponse: !!surveyData.myResponse
            });
            
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

        console.log('✅ getSurveyById: Returning admin view', { 
            tenantId,
            surveyId: survey._id,
            userId: req.user._id,
            totalResponses: surveyData.responses.length,
            anonymousResponses: surveyData.responses.filter(r => r.isAnonymous).length
        });

        res.status(200).json({
            success: true,
            survey: surveyData
        });
    } catch (err) {
        console.error('❌ getSurveyById: Error', { 
            tenantId: req.user?.tenantId || req.tenantId,
            userId: req.user?._id,
            surveyId: req.params.id,
            error: err.message,
            stack: err.stack
        });
        res.status(500).json({ error: err.message });
    }
};

/**
 * Update survey
 */
export const updateSurvey = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId;

        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant ID is required' });
        }

        const survey = await Survey.findOne({ _id: req.params.id, tenantId });

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
        const tenantId = req.user?.tenantId || req.tenantId;

        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant ID is required' });
        }

        const survey = await Survey.findOne({ _id: req.params.id, tenantId });

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
        const tenantId = req.user?.tenantId || req.tenantId;

        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant ID is required' });
        }

        const { responses, isAnonymous = false } = req.body;

        if (!responses || !Array.isArray(responses)) {
            return res.status(400).json({ error: 'Invalid responses format. Expected an array.' });
        }

        const survey = await Survey.findOne({ _id: req.params.id, tenantId });

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

        // Add response with metadata - pass responses as the answers parameter
        await survey.addResponse(req.user._id, responses, isAnonymous, {
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });

        res.status(201).json({
            success: true,
            message: 'Survey response submitted successfully',
            totalResponses: survey.stats.totalResponses
        });
    } catch (err) {

        res.status(400).json({ error: err.message });
    }
};

/**
 * Publish survey
 */
export const publishSurvey = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId;

        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant ID is required' });
        }

        const survey = await Survey.findOne({ _id: req.params.id, tenantId });

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
        const tenantId = req.user?.tenantId || req.tenantId;

        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant ID is required' });
        }

        const survey = await Survey.findOne({ _id: req.params.id, tenantId });

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
        const tenantId = req.user?.tenantId || req.tenantId;

        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant ID is required' });
        }

        const survey = await Survey.findOne({ _id: req.params.id, tenantId });

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
        const tenantId = req.user?.tenantId || req.tenantId;

        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant ID is required' });
        }

        const { format = 'json' } = req.query;

        const survey = await Survey.findOne({ _id: req.params.id, tenantId })
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
