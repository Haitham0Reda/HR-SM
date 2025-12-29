import SurveyRepository from '../../../repositories/modules/SurveyRepository.js';

/**
 * Survey Service - Business logic layer for survey operations
 * Uses SurveyRepository for data access
 */
class SurveyService {
    constructor() {
        this.surveyRepository = new SurveyRepository();
    }

    /**
     * Get all surveys
     */
    async getAllSurveys(tenantId, options = {}) {
        const queryOptions = {
            populate: [
                { path: 'createdBy', select: 'username email firstName lastName' },
                { path: 'assignedTo.departments', select: 'name code' }
            ],
            select: '-responses', // Don't return responses in list view
            sort: { createdAt: -1 },
            ...options
        };

        return await this.surveyRepository.find({ tenantId }, queryOptions);
    }

    /**
     * Get surveys assigned to employee
     */
    async getEmployeeSurveys(userId, userRole, userDepartment, tenantId, options = {}) {
        const surveys = await this.surveyRepository.findAssignedToUser(
            userId,
            userRole,
            userDepartment,
            tenantId,
            options
        );

        // Map surveys with completion status
        return surveys.map(survey => {
            const hasResponded = survey.responses.some(r =>
                r.respondent && r.respondent.toString() === userId.toString()
            );

            const response = hasResponded
                ? survey.responses.find(r => r.respondent && r.respondent.toString() === userId.toString())
                : null;

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
    }

    /**
     * Create survey
     */
    async createSurvey(surveyData, createdBy, tenantId) {
        const dataToCreate = {
            ...surveyData,
            createdBy,
            tenantId
        };

        const survey = await this.surveyRepository.create(dataToCreate);

        // Return populated survey
        return await this.surveyRepository.findById(survey._id, {
            populate: [
                { path: 'createdBy', select: 'username email firstName lastName' }
            ]
        });
    }

    /**
     * Get survey by ID
     */
    async getSurveyById(id, tenantId, userRole = null, userId = null) {
        const survey = await this.surveyRepository.findOne(
            { _id: id, tenantId },
            {
                populate: [
                    { path: 'createdBy', select: 'username email firstName lastName' },
                    { path: 'assignedTo.departments', select: 'name code' },
                    { path: 'responses.respondent', select: 'username email firstName lastName' }
                ]
            }
        );

        if (!survey) {
            throw new Error('Survey not found');
        }

        // Non-admin users don't see other users' responses
        if (userRole && !['hr', 'admin'].includes(userRole)) {
            const surveyData = survey.toObject();
            surveyData.totalResponses = survey.responses.length;

            if (userId) {
                surveyData.myResponse = survey.responses.find(r =>
                    r.respondent && r.respondent._id.toString() === userId.toString()
                );
            }

            delete surveyData.responses;
            return surveyData;
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

        return surveyData;
    }

    /**
     * Update survey
     */
    async updateSurvey(id, updateData, updatedBy, tenantId) {
        const survey = await this.surveyRepository.findOne({ _id: id, tenantId });

        if (!survey) {
            throw new Error('Survey not found');
        }

        // Don't allow updates if already published and has responses
        if (survey.status !== 'draft' && survey.responses.length > 0) {
            throw new Error('Cannot update survey that has responses. Close and create new survey instead.');
        }

        const dataToUpdate = {
            ...updateData,
            lastModifiedBy: updatedBy
        };

        return await this.surveyRepository.update(id, dataToUpdate);
    }

    /**
     * Delete survey
     */
    async deleteSurvey(id, tenantId) {
        const survey = await this.surveyRepository.findOne({ _id: id, tenantId });

        if (!survey) {
            throw new Error('Survey not found');
        }

        // Don't allow deletion if has responses
        if (survey.responses.length > 0) {
            throw new Error('Cannot delete survey that has responses. Archive it instead.');
        }

        await this.surveyRepository.delete(id);
        return { message: 'Survey deleted successfully' };
    }

    /**
     * Submit survey response
     */
    async submitSurveyResponse(surveyId, userId, responses, isAnonymous = false, metadata = {}, tenantId) {
        if (!responses || !Array.isArray(responses)) {
            throw new Error('Invalid responses format. Expected an array.');
        }

        const survey = await this.surveyRepository.findOne({ _id: surveyId, tenantId });

        if (!survey) {
            throw new Error('Survey not found');
        }

        if (survey.status !== 'active') {
            throw new Error('Survey is not active');
        }

        // Check if survey is currently active (date range)
        const now = new Date();
        const isCurrentlyActive =
            (!survey.settings.startDate || survey.settings.startDate <= now) &&
            (!survey.settings.endDate || survey.settings.endDate >= now);

        if (!isCurrentlyActive) {
            throw new Error('Survey is not available at this time');
        }

        // Check if anonymous is allowed
        if (isAnonymous && !survey.settings.allowAnonymous) {
            throw new Error('Anonymous responses are not allowed for this survey');
        }

        // Add response using repository method
        return await this.surveyRepository.addResponse(surveyId, userId, responses, isAnonymous, metadata);
    }

    /**
     * Publish survey
     */
    async publishSurvey(id, tenantId) {
        const survey = await this.surveyRepository.findOne({ _id: id, tenantId });

        if (!survey) {
            throw new Error('Survey not found');
        }

        if (survey.status !== 'draft') {
            throw new Error('Only draft surveys can be published');
        }

        // Validate survey has questions
        if (survey.questions.length === 0) {
            throw new Error('Survey must have at least one question');
        }

        // Validate assignment
        const hasAssignment = survey.assignedTo.allEmployees ||
            survey.assignedTo.departments.length > 0 ||
            survey.assignedTo.roles.length > 0 ||
            survey.assignedTo.specificEmployees.length > 0;

        if (!hasAssignment) {
            throw new Error('Survey must be assigned to at least one target');
        }

        const updateData = {
            status: 'active',
            publishedAt: new Date()
        };

        // Calculate total assigned (this would need to be implemented based on your user/department structure)
        const totalAssigned = await this.calculateTotalAssigned(survey);
        updateData['stats.totalAssigned'] = totalAssigned;

        return await this.surveyRepository.update(id, updateData);
    }

    /**
     * Close survey
     */
    async closeSurvey(id, tenantId) {
        const survey = await this.surveyRepository.findOne({ _id: id, tenantId });

        if (!survey) {
            throw new Error('Survey not found');
        }

        const updateData = {
            status: 'closed',
            closedAt: new Date()
        };

        return await this.surveyRepository.update(id, updateData);
    }

    /**
     * Get survey statistics
     */
    async getSurveyStatistics(id, tenantId) {
        const survey = await this.surveyRepository.findOne({ _id: id, tenantId });

        if (!survey) {
            throw new Error('Survey not found');
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

        return {
            survey: {
                _id: survey._id,
                title: survey.title,
                totalAssigned: survey.stats.totalAssigned,
                totalResponses: survey.stats.totalResponses,
                completionRate: survey.stats.completionRate,
                status: survey.status
            },
            questions: questionStats
        };
    }

    /**
     * Export survey responses
     */
    async exportSurveyResponses(id, format = 'json', tenantId) {
        const survey = await this.surveyRepository.findOne(
            { _id: id, tenantId },
            {
                populate: [
                    { path: 'responses.respondent', select: 'username email firstName lastName' }
                ]
            }
        );

        if (!survey) {
            throw new Error('Survey not found');
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
                    name: `${r.respondent.firstName || ''} ${r.respondent.lastName || ''}`.trim()
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
            // Convert to CSV (this would need a CSV conversion utility)
            return this.convertToCSV(responses);
        }

        return {
            survey: {
                title: survey.title,
                totalResponses: responses.length
            },
            responses
        };
    }

    /**
     * Get surveys by status
     */
    async getSurveysByStatus(status, tenantId, options = {}) {
        return await this.surveyRepository.findByStatus(status, tenantId, {
            populate: [
                { path: 'createdBy', select: 'username email firstName lastName' },
                { path: 'assignedTo.departments', select: 'name code' }
            ],
            sort: { createdAt: -1 },
            ...options
        });
    }

    /**
     * Get surveys by type
     */
    async getSurveysByType(surveyType, tenantId, options = {}) {
        return await this.surveyRepository.findByType(surveyType, tenantId, {
            populate: [
                { path: 'createdBy', select: 'username email firstName lastName' },
                { path: 'assignedTo.departments', select: 'name code' }
            ],
            sort: { createdAt: -1 },
            ...options
        });
    }

    /**
     * Get survey statistics overview
     */
    async getSurveyStatisticsOverview(tenantId) {
        return await this.surveyRepository.getStatistics(tenantId);
    }

    /**
     * Get expiring surveys
     */
    async getExpiringSurveys(tenantId, days = 7) {
        return await this.surveyRepository.findExpiring(tenantId, days, {
            populate: [
                { path: 'createdBy', select: 'username email firstName lastName' }
            ],
            sort: { 'settings.endDate': 1 }
        });
    }

    /**
     * Get surveys requiring attention
     */
    async getSurveysRequiringAttention(tenantId, minResponseRate = 0.5) {
        return await this.surveyRepository.findRequiringAttention(tenantId, minResponseRate, {
            populate: [
                { path: 'createdBy', select: 'username email firstName lastName' }
            ]
        });
    }

    /**
     * Search surveys
     */
    async searchSurveys(searchTerm, tenantId, options = {}) {
        return await this.surveyRepository.search(searchTerm, tenantId, {
            populate: [
                { path: 'createdBy', select: 'username email firstName lastName' },
                { path: 'assignedTo.departments', select: 'name code' }
            ],
            sort: { createdAt: -1 },
            ...options
        });
    }

    /**
     * Calculate total assigned users for survey
     */
    async calculateTotalAssigned(survey) {
        // This would need to be implemented based on your user/department structure
        // For now, return a placeholder value
        let totalAssigned = 0;

        if (survey.assignedTo.allEmployees) {
            // Count all active employees in tenant
            // totalAssigned = await User.countDocuments({ tenantId: survey.tenantId, status: 'active' });
            totalAssigned = 100; // Placeholder
        } else {
            // Count users in specific departments, roles, or specific employees
            totalAssigned = survey.assignedTo.specificEmployees.length;
            // Add department and role counts as needed
        }

        return totalAssigned;
    }

    /**
     * Convert responses to CSV format
     */
    convertToCSV(responses) {
        if (responses.length === 0) return '';

        const headers = Object.keys(responses[0]);
        const csvContent = [
            headers.join(','),
            ...responses.map(row =>
                headers.map(header => {
                    const value = row[header];
                    // Handle nested objects and arrays
                    const stringValue = typeof value === 'object'
                        ? JSON.stringify(value)
                        : String(value || '');
                    // Escape quotes and wrap in quotes if contains comma
                    return stringValue.includes(',')
                        ? `"${stringValue.replace(/"/g, '""')}"`
                        : stringValue;
                }).join(',')
            )
        ].join('\n');

        return csvContent;
    }

    /**
     * Archive old surveys
     */
    async archiveOldSurveys(tenantId, daysOld = 180) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        const oldSurveys = await this.surveyRepository.find({
            tenantId,
            status: 'closed',
            closedAt: { $lt: cutoffDate }
        });

        const results = [];
        for (const survey of oldSurveys) {
            try {
                await this.surveyRepository.update(survey._id, {
                    archived: true,
                    archivedAt: new Date()
                });
                results.push({ success: true, id: survey._id });
            } catch (error) {
                results.push({ success: false, id: survey._id, error: error.message });
            }
        }

        return results;
    }
}

export default SurveyService;