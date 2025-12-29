import BaseRepository from '../BaseRepository.js';
import Announcement from '../../modules/announcements/models/announcement.model.js';

/**
 * Announcement Repository - Data access layer for announcement operations
 * Extends BaseRepository with announcement-specific query methods
 */
class AnnouncementRepository extends BaseRepository {
    constructor() {
        super(Announcement);
    }

    /**
     * Find announcements by status
     */
    async findByStatus(status, tenantId, options = {}) {
        const filter = { status, tenantId };
        return await this.find(filter, options);
    }

    /**
     * Find announcements by target audience
     */
    async findByTargetAudience(targetAudience, tenantId, options = {}) {
        const filter = { targetAudience, tenantId };
        return await this.find(filter, options);
    }

    /**
     * Find active announcements
     */
    async findActive(tenantId, options = {}) {
        const now = new Date();
        const filter = {
            tenantId,
            isActive: true,
            $or: [
                // No date restrictions
                { startDate: null, endDate: null },
                // Only start date - must have started
                { startDate: { $lte: now }, endDate: null },
                // Only end date - must not have expired
                { startDate: null, endDate: { $gte: now } },
                // Both dates - must be within range
                { startDate: { $lte: now }, endDate: { $gte: now } }
            ]
        };
        return await this.find(filter, options);
    }

    /**
     * Find announcements by date range
     */
    async findByDateRange(startDate, endDate, tenantId, options = {}) {
        const filter = {
            tenantId,
            publishDate: {
                $gte: startDate,
                $lte: endDate
            }
        };
        return await this.find(filter, options);
    }

    /**
     * Find announcements by department
     */
    async findByDepartment(departmentId, tenantId, options = {}) {
        const filter = {
            tenantId,
            departments: departmentId
        };
        return await this.find(filter, options);
    }

    /**
     * Find announcements by creator
     */
    async findByCreator(createdBy, tenantId, options = {}) {
        const filter = { createdBy, tenantId };
        return await this.find(filter, options);
    }

    /**
     * Find upcoming announcements
     */
    async findUpcoming(tenantId, days = 7, options = {}) {
        const now = new Date();
        const futureDate = new Date();
        futureDate.setDate(now.getDate() + days);

        const filter = {
            tenantId,
            isActive: true,
            startDate: {
                $gt: now,
                $lte: futureDate
            }
        };
        return await this.find(filter, options);
    }

    /**
     * Find expired announcements
     */
    async findExpired(tenantId, options = {}) {
        const now = new Date();
        const filter = {
            tenantId,
            $or: [
                { isActive: false },
                { endDate: { $lt: now } }
            ]
        };
        return await this.find(filter, options);
    }

    /**
     * Find announcements for user based on role and department
     */
    async findForUser(userId, userRole, userDepartment, tenantId, options = {}) {
        const now = new Date();

        let filter = {
            tenantId,
            isActive: true,
            $or: [
                // No date restrictions
                { startDate: null, endDate: null },
                // Only start date - must have started
                { startDate: { $lte: now }, endDate: null },
                // Only end date - must not have expired
                { startDate: null, endDate: { $gte: now } },
                // Both dates - must be within range
                { startDate: { $lte: now }, endDate: { $gte: now } }
            ]
        };

        // If user is not HR or Admin, filter announcements based on their role
        if (userRole !== 'hr' && userRole !== 'admin') {
            const roleFilter = {
                $or: [
                    { targetAudience: 'all' },
                    { targetAudience: 'employees' },
                    { targetAudience: userRole }
                ]
            };

            // Add department filter if user has a department
            if (userDepartment) {
                roleFilter.$or.push({ departments: userDepartment });
            }

            filter = { $and: [filter, roleFilter] };
        }

        return await this.find(filter, options);
    }

    /**
     * Search announcements by title or content
     */
    async search(searchTerm, tenantId, options = {}) {
        const filter = {
            tenantId,
            $or: [
                { title: { $regex: searchTerm, $options: 'i' } },
                { content: { $regex: searchTerm, $options: 'i' } }
            ]
        };
        return await this.find(filter, options);
    }

    /**
     * Get announcement statistics
     */
    async getStatistics(tenantId) {
        const announcements = await this.find({ tenantId });

        const statistics = {
            total: announcements.length,
            active: 0,
            inactive: 0,
            expired: 0,
            byTargetAudience: {},
            byMonth: {},
            recentCount: 0 // Last 30 days
        };

        const now = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        announcements.forEach(announcement => {
            // Status counts
            if (announcement.isActive) {
                // Check if expired
                if (announcement.endDate && announcement.endDate < now) {
                    statistics.expired++;
                } else {
                    statistics.active++;
                }
            } else {
                statistics.inactive++;
            }

            // By target audience
            if (announcement.targetAudience) {
                statistics.byTargetAudience[announcement.targetAudience] =
                    (statistics.byTargetAudience[announcement.targetAudience] || 0) + 1;
            }

            // By month
            const month = new Date(announcement.publishDate).getMonth() + 1;
            statistics.byMonth[month] = (statistics.byMonth[month] || 0) + 1;

            // Recent count
            if (announcement.publishDate && announcement.publishDate > thirtyDaysAgo) {
                statistics.recentCount++;
            }
        });

        return statistics;
    }
}

export default AnnouncementRepository;