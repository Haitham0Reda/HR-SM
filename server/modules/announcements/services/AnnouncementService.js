import AnnouncementRepository from '../../../repositories/modules/AnnouncementRepository.js';

/**
 * Announcement Service - Business logic layer for announcement operations
 * Uses AnnouncementRepository for data access
 */
class AnnouncementService {
    constructor() {
        this.announcementRepository = new AnnouncementRepository();
    }

    /**
     * Get all announcements
     */
    async getAllAnnouncements(tenantId, options = {}) {
        const filter = { tenantId };
        const queryOptions = {
            populate: [
                { path: 'createdBy', select: 'username email firstName lastName' },
                { path: 'departments', select: 'name code' }
            ],
            sort: { publishDate: -1 },
            ...options
        };

        return await this.announcementRepository.find(filter, queryOptions);
    }

    /**
     * Get active announcements
     */
    async getActiveAnnouncements(tenantId, options = {}) {
        const queryOptions = {
            populate: [
                { path: 'createdBy', select: 'username email firstName lastName' },
                { path: 'departments', select: 'name code' }
            ],
            sort: { publishDate: -1 },
            ...options
        };

        return await this.announcementRepository.findActive(tenantId, queryOptions);
    }

    /**
     * Get announcements for user based on role and department
     */
    async getAnnouncementsForUser(userId, userRole, userDepartment, tenantId, options = {}) {
        const queryOptions = {
            populate: [
                { path: 'createdBy', select: 'username email firstName lastName' },
                { path: 'departments', select: 'name code' }
            ],
            sort: { publishDate: -1 },
            ...options
        };

        return await this.announcementRepository.findForUser(
            userId,
            userRole,
            userDepartment,
            tenantId,
            queryOptions
        );
    }

    /**
     * Create announcement
     */
    async createAnnouncement(announcementData, tenantId) {
        const dataToCreate = {
            ...announcementData,
            tenantId
        };

        const announcement = await this.announcementRepository.create(dataToCreate);

        // Return populated announcement
        return await this.announcementRepository.findById(announcement._id, {
            populate: [
                { path: 'createdBy', select: 'username email firstName lastName' },
                { path: 'departments', select: 'name code' }
            ]
        });
    }

    /**
     * Get announcement by ID
     */
    async getAnnouncementById(id, tenantId) {
        const announcement = await this.announcementRepository.findOne(
            { _id: id, tenantId },
            {
                populate: [
                    { path: 'createdBy', select: 'username email firstName lastName' },
                    { path: 'departments', select: 'name code' },
                    { path: 'employees', select: 'username email firstName lastName' }
                ]
            }
        );

        if (!announcement) {
            throw new Error('Announcement not found');
        }

        return announcement;
    }

    /**
     * Update announcement
     */
    async updateAnnouncement(id, updateData, tenantId) {
        const announcement = await this.announcementRepository.findOne({ _id: id, tenantId });

        if (!announcement) {
            throw new Error('Announcement not found');
        }

        const updatedAnnouncement = await this.announcementRepository.update(id, updateData);

        // Return populated announcement
        return await this.announcementRepository.findById(id, {
            populate: [
                { path: 'createdBy', select: 'username email firstName lastName' },
                { path: 'departments', select: 'name code' }
            ]
        });
    }

    /**
     * Delete announcement
     */
    async deleteAnnouncement(id, tenantId) {
        const announcement = await this.announcementRepository.findOne({ _id: id, tenantId });

        if (!announcement) {
            throw new Error('Announcement not found');
        }

        await this.announcementRepository.delete(id);
        return { message: 'Announcement deleted' };
    }

    /**
     * Get announcements by status
     */
    async getAnnouncementsByStatus(status, tenantId, options = {}) {
        const now = new Date();
        let filter = { tenantId };

        switch (status) {
            case 'upcoming':
                filter = {
                    ...filter,
                    isActive: true,
                    startDate: { $gt: now }
                };
                break;
            case 'active':
                return await this.getActiveAnnouncements(tenantId, options);
            case 'expired':
                filter = {
                    ...filter,
                    $or: [
                        { isActive: false },
                        { endDate: { $lt: now } }
                    ]
                };
                break;
            default:
                throw new Error('Invalid status. Use: upcoming, active, or expired');
        }

        const queryOptions = {
            populate: [
                { path: 'createdBy', select: 'username email firstName lastName' },
                { path: 'departments', select: 'name code' }
            ],
            sort: { publishDate: -1 },
            ...options
        };

        return await this.announcementRepository.find(filter, queryOptions);
    }

    /**
     * Get announcements by target audience
     */
    async getAnnouncementsByTargetAudience(targetAudience, tenantId, options = {}) {
        return await this.announcementRepository.findByTargetAudience(targetAudience, tenantId, {
            populate: [
                { path: 'createdBy', select: 'username email firstName lastName' },
                { path: 'departments', select: 'name code' }
            ],
            sort: { publishDate: -1 },
            ...options
        });
    }

    /**
     * Get announcements by department
     */
    async getAnnouncementsByDepartment(departmentId, tenantId, options = {}) {
        return await this.announcementRepository.findByDepartment(departmentId, tenantId, {
            populate: [
                { path: 'createdBy', select: 'username email firstName lastName' },
                { path: 'departments', select: 'name code' }
            ],
            sort: { publishDate: -1 },
            ...options
        });
    }

    /**
     * Get announcements by date range
     */
    async getAnnouncementsByDateRange(startDate, endDate, tenantId, options = {}) {
        return await this.announcementRepository.findByDateRange(startDate, endDate, tenantId, {
            populate: [
                { path: 'createdBy', select: 'username email firstName lastName' },
                { path: 'departments', select: 'name code' }
            ],
            sort: { publishDate: -1 },
            ...options
        });
    }

    /**
     * Search announcements
     */
    async searchAnnouncements(searchTerm, tenantId, options = {}) {
        return await this.announcementRepository.search(searchTerm, tenantId, {
            populate: [
                { path: 'createdBy', select: 'username email firstName lastName' },
                { path: 'departments', select: 'name code' }
            ],
            sort: { publishDate: -1 },
            ...options
        });
    }

    /**
     * Get upcoming announcements
     */
    async getUpcomingAnnouncements(tenantId, days = 7, options = {}) {
        return await this.announcementRepository.findUpcoming(tenantId, days, {
            populate: [
                { path: 'createdBy', select: 'username email firstName lastName' },
                { path: 'departments', select: 'name code' }
            ],
            sort: { startDate: 1 },
            ...options
        });
    }

    /**
     * Get expired announcements
     */
    async getExpiredAnnouncements(tenantId, options = {}) {
        return await this.announcementRepository.findExpired(tenantId, {
            populate: [
                { path: 'createdBy', select: 'username email firstName lastName' },
                { path: 'departments', select: 'name code' }
            ],
            sort: { endDate: -1 },
            ...options
        });
    }

    /**
     * Get announcement statistics
     */
    async getAnnouncementStatistics(tenantId) {
        return await this.announcementRepository.getStatistics(tenantId);
    }

    /**
     * Activate announcement
     */
    async activateAnnouncement(id, tenantId) {
        const announcement = await this.announcementRepository.findOne({ _id: id, tenantId });

        if (!announcement) {
            throw new Error('Announcement not found');
        }

        const updateData = {
            isActive: true,
            publishDate: new Date()
        };

        return await this.announcementRepository.update(id, updateData);
    }

    /**
     * Deactivate announcement
     */
    async deactivateAnnouncement(id, tenantId) {
        const announcement = await this.announcementRepository.findOne({ _id: id, tenantId });

        if (!announcement) {
            throw new Error('Announcement not found');
        }

        const updateData = {
            isActive: false
        };

        return await this.announcementRepository.update(id, updateData);
    }

    /**
     * Schedule announcement
     */
    async scheduleAnnouncement(id, startDate, endDate, tenantId) {
        const announcement = await this.announcementRepository.findOne({ _id: id, tenantId });

        if (!announcement) {
            throw new Error('Announcement not found');
        }

        const updateData = {
            startDate,
            endDate,
            isActive: true
        };

        return await this.announcementRepository.update(id, updateData);
    }

    /**
     * Get announcements requiring attention (expiring soon)
     */
    async getAnnouncementsRequiringAttention(tenantId, days = 3) {
        const now = new Date();
        const futureDate = new Date();
        futureDate.setDate(now.getDate() + days);

        const filter = {
            tenantId,
            isActive: true,
            endDate: {
                $gte: now,
                $lte: futureDate
            }
        };

        return await this.announcementRepository.find(filter, {
            populate: [
                { path: 'createdBy', select: 'username email firstName lastName' },
                { path: 'departments', select: 'name code' }
            ],
            sort: { endDate: 1 }
        });
    }

    /**
     * Bulk update announcements
     */
    async bulkUpdateAnnouncements(announcementIds, updateData, tenantId) {
        const results = [];

        for (const announcementId of announcementIds) {
            try {
                const announcement = await this.updateAnnouncement(announcementId, updateData, tenantId);
                results.push({ success: true, announcementId, data: announcement });
            } catch (error) {
                results.push({
                    success: false,
                    announcementId,
                    error: error.message
                });
            }
        }

        return results;
    }

    /**
     * Archive old announcements
     */
    async archiveOldAnnouncements(tenantId, daysOld = 90) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        const oldAnnouncements = await this.announcementRepository.find({
            tenantId,
            publishDate: { $lt: cutoffDate },
            isActive: false
        });

        const results = [];
        for (const announcement of oldAnnouncements) {
            try {
                await this.announcementRepository.update(announcement._id, {
                    archived: true,
                    archivedAt: new Date()
                });
                results.push({ success: true, id: announcement._id });
            } catch (error) {
                results.push({ success: false, id: announcement._id, error: error.message });
            }
        }

        return results;
    }
}

export default AnnouncementService;