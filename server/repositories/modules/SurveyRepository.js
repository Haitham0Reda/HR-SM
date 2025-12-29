import BaseRepository from '../BaseRepository.js';
import Survey from '../../modules/surveys/models/survey.model.js';

/**
 * Survey Repository - Data access layer for survey operations
 * Extends BaseRepository with survey-specific query methods
 */
class SurveyRepository extends BaseRepository {
    constructor() {
        super(Survey);
    }

    /**
     * Find surveys by status
     */
    async findByStatus(status, tenantId, options = {}) {
        const filter = { status, tenantId };
        return await this.find(filter, options);
    }

    /**
     * Find surveys by type
     */
    async findByType(surveyType, tenantId, options = {}) {
        const filter = { surveyType, tenantId };
        return await this.find(filter, options);
    }

    /**
     * Find surveys by creator
     */
    async findByCreator(createdBy, tenantId, options = {}) {
        const filter = { createdBy, tenantId };
        return await this.find(filter, options);
    }

    /**
     * Find active surveys
     */
    async findActive(tenantId, options = {}) {
        const filter = { status: 'active', tenantId };
        return await this.find(filter, options);
    }

    /**
     * Find surveys by date range
     */
    async findByDateRange(startDate, endDate, tenantId, options = {}) {
        const filter = {
            tenantId,
            createdAt: {
                $gte: startDate,
                $lte: endDate
            }
        };
        return await this.find(filter, options);
    }

    /**
     * Find surveys assigned to user
     */
    async findAssignedToUser(userId, userRole, userDepartment, tenantId, options = {}) {
        const now = new Date();

        const filter = {
            tenantId,
            status: 'active',
            $or: [
                // No date restrictions
                { 'settings.startDate': null, 'settings.endDate': null },
                // Only start date - must have started
                { 'settings.startDate': { $lte: now }, 'settings.endDate': null },
                // Only end date - must not have expired
                { 'settings.startDate': null, 'settings.endDate': { $gte: now } },
                // Both dates - must be within range
                { 'settings.startDate': { $lte: now }, 'settings.endDate': { $gte: now } }
            ],
            $or: [
                // Assigned to all employees
                { 'assignedTo.allEmployees': true },
                // Assigned to specific user
                { 'assignedTo.specificEmployees': userId },
                // Assigned to user's role
                { 'assignedTo.roles': userRole },
                // Assigned to user's department
                { 'assignedTo.departments': userDepartment }
            ]
        };

        return await this.find(filter, options);
    }

    /**
     * Find surveys with responses from user
     */
    async findWithUserResponse(userId, tenantId, options = {}) {
        const filter = {
            tenantId,
            'responses.respondent': userId
        };
        return await this.find(filter, options);
    }

    /**
     * Find surveys without responses from user
     */
    async findWithoutUserResponse(userId, tenantId, options = {}) {
        const filter = {
            tenantId,
            'responses.respondent': { $ne: userId }
        };
        return await this.find(filter, options);
    }

    /**
     * Find surveys by department assignment
     */
    async findByDepartmentAssignment(departmentId, tenantId, options = {}) {
        const filter = {
            tenantId,
            'assignedTo.departments': departmentId
        };
        return await this.find(filter, options);
    }

    /**
     * Find surveys by role assignment
     */
    async findByRoleAssignment(role, tenantId, options = {}) {
        const filter = {
            tenantId,
            'assignedTo.roles': role
        };
        return await this.find(filter, options);
    }

    /**
     * Find surveys requiring attention (low response rates)
     */
    async findRequiringAttention(tenantId, minResponseRate = 0.5, options = {}) {
        const surveys = await this.findActive(tenantId, options);

        return surveys.filter(survey => {
            const responseRate = survey.stats.totalAssigned > 0
                ? survey.stats.totalResponses / survey.stats.totalAssigned
                : 0;
            return responseRate < minResponseRate;
        });
    }

    /**
     * Find expiring surveys
     */
    async findExpiring(tenantId, days = 7, options = {}) {
        const now = new Date();
        const futureDate = new Date();
        futureDate.setDate(now.getDate() + days);

        const filter = {
            tenantId,
            status: 'active',
            'settings.endDate': {
                $gte: now,
                $lte: futureDate
            }
        };
        return await this.find(filter, options);
    }

    /**
     * Find completed surveys
     */
    async findCompleted(tenantId, options = {}) {
        const filter = {
            tenantId,
            status: { $in: ['closed', 'completed'] }
        };
        return await this.find(filter, options);
    }

    /**
     * Search surveys by title or description
     */
    async search(searchTerm, tenantId, options = {}) {
        const filter = {
            tenantId,
            $or: [
                { title: { $regex: searchTerm, $options: 'i' } },
                { description: { $regex: searchTerm, $options: 'i' } }
            ]
        };
        return await this.find(filter, options);
    }

    /**
     * Get survey statistics
     */
    async getStatistics(tenantId) {
        const surveys = await this.find({ tenantId });

        const statistics = {
            total: surveys.length,
            draft: 0,
            active: 0,
            closed: 0,
            totalResponses: 0,
            averageResponseRate: 0,
            byType: {},
            byMonth: {},
            recentCount: 0 // Last 30 days
        };

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        let totalAssigned = 0;
        let totalResponses = 0;

        surveys.forEach(survey => {
            // Status counts
            statistics[survey.status]++;

            // Response statistics
            totalAssigned += survey.stats.totalAssigned || 0;
            totalResponses += survey.stats.totalResponses || 0;
            statistics.totalResponses += survey.stats.totalResponses || 0;

            // By type
            if (survey.surveyType) {
                statistics.byType[survey.surveyType] =
                    (statistics.byType[survey.surveyType] || 0) + 1;
            }

            // By month
            const month = new Date(survey.createdAt).getMonth() + 1;
            statistics.byMonth[month] = (statistics.byMonth[month] || 0) + 1;

            // Recent count
            if (survey.createdAt && survey.createdAt > thirtyDaysAgo) {
                statistics.recentCount++;
            }
        });

        // Calculate average response rate
        if (totalAssigned > 0) {
            statistics.averageResponseRate = (totalResponses / totalAssigned) * 100;
        }

        return statistics;
    }

    /**
     * Get response statistics for survey
     */
    async getResponseStatistics(surveyId) {
        const survey = await this.findById(surveyId);

        if (!survey) {
            throw new Error('Survey not found');
        }

        const statistics = {
            totalAssigned: survey.stats.totalAssigned || 0,
            totalResponses: survey.stats.totalResponses || 0,
            completionRate: survey.stats.completionRate || 0,
            completeResponses: 0,
            incompleteResponses: 0,
            anonymousResponses: 0,
            responsesByDay: {},
            averageCompletionTime: 0
        };

        let totalCompletionTime = 0;
        let completedResponsesCount = 0;

        survey.responses.forEach(response => {
            if (response.isComplete) {
                statistics.completeResponses++;

                // Calculate completion time if available
                if (response.submittedAt && response.startedAt) {
                    const completionTime = response.submittedAt - response.startedAt;
                    totalCompletionTime += completionTime;
                    completedResponsesCount++;
                }
            } else {
                statistics.incompleteResponses++;
            }

            if (response.isAnonymous) {
                statistics.anonymousResponses++;
            }

            // Responses by day
            if (response.submittedAt) {
                const dateKey = response.submittedAt.toISOString().split('T')[0];
                statistics.responsesByDay[dateKey] = (statistics.responsesByDay[dateKey] || 0) + 1;
            }
        });

        // Calculate average completion time in minutes
        if (completedResponsesCount > 0) {
            statistics.averageCompletionTime = totalCompletionTime / completedResponsesCount / (1000 * 60);
        }

        return statistics;
    }

    /**
     * Add response to survey
     */
    async addResponse(surveyId, userId, answers, isAnonymous = false, metadata = {}) {
        const survey = await this.findById(surveyId);

        if (!survey) {
            throw new Error('Survey not found');
        }

        // Check if user already responded
        const existingResponse = survey.responses.find(r =>
            r.respondent && r.respondent.toString() === userId.toString()
        );

        if (existingResponse) {
            throw new Error('User has already responded to this survey');
        }

        const response = {
            respondent: isAnonymous ? null : userId,
            answers,
            isAnonymous,
            isComplete: true,
            submittedAt: new Date(),
            metadata
        };

        survey.responses.push(response);

        // Update statistics
        survey.stats.totalResponses = survey.responses.length;
        if (survey.stats.totalAssigned > 0) {
            survey.stats.completionRate = (survey.stats.totalResponses / survey.stats.totalAssigned) * 100;
        }

        return await survey.save();
    }

    /**
     * Remove response from survey
     */
    async removeResponse(surveyId, responseId) {
        const survey = await this.findById(surveyId);

        if (!survey) {
            throw new Error('Survey not found');
        }

        const responseIndex = survey.responses.findIndex(r => r._id.toString() === responseId);

        if (responseIndex === -1) {
            throw new Error('Response not found');
        }

        survey.responses.splice(responseIndex, 1);

        // Update statistics
        survey.stats.totalResponses = survey.responses.length;
        if (survey.stats.totalAssigned > 0) {
            survey.stats.completionRate = (survey.stats.totalResponses / survey.stats.totalAssigned) * 100;
        }

        return await survey.save();
    }

    /**
     * Get surveys requiring reminders
     */
    async findRequiringReminders(tenantId, options = {}) {
        const now = new Date();
        const filter = {
            tenantId,
            status: 'active',
            'settings.endDate': { $gte: now },
            'settings.emailNotifications.enabled': true,
            'settings.emailNotifications.sendReminders': true
        };
        return await this.find(filter, options);
    }

    /**
     * Update survey statistics
     */
    async updateStatistics(surveyId, totalAssigned) {
        const survey = await this.findById(surveyId);

        if (!survey) {
            throw new Error('Survey not found');
        }

        survey.stats.totalAssigned = totalAssigned;
        survey.stats.totalResponses = survey.responses.length;

        if (totalAssigned > 0) {
            survey.stats.completionRate = (survey.stats.totalResponses / totalAssigned) * 100;
        }

        return await survey.save();
    }
}

export default SurveyRepository;