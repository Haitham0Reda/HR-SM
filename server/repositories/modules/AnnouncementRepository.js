import BaseRepository from '../BaseRepository.js';
import Announcement from '../../modules/announcements/models/announcement.model.js';
import multiTenantDB from '../../config/multiTenant.js';

/**
 * Announcement Repository - Data access layer for announcement operations
 * Extends BaseRepository with announcement-specific query methods
 * Supports multi-tenant database isolation
 */
class AnnouncementRepository extends BaseRepository {
    constructor() {
        super(Announcement);
    }

    /**
     * Get tenant-specific Announcement model
     */
    async getTenantModel(tenantId) {
        try {
            console.log('🔍 Getting tenant-specific Announcement model for:', tenantId);
            const tenantConnection = await multiTenantDB.getCompanyConnection(tenantId);
            console.log('✅ Connected to tenant database:', tenantConnection.name);

            // Register Department and User models if they don't exist on this connection
            // This is needed for populate() to work
            try {
                if (!tenantConnection.models.Department) {
                    const { default: Department } = await import('../../modules/hr-core/users/models/department.model.js');
                    tenantConnection.model('Department', Department.schema);
                }
            } catch (error) {
                console.warn('Could not register Department model:', error.message);
            }

            try {
                if (!tenantConnection.models.User) {
                    const { default: User } = await import('../../modules/hr-core/users/models/user.model.js');
                    tenantConnection.model('User', User.schema);
                }
            } catch (error) {
                console.warn('Could not register User model:', error.message);
            }

            return tenantConnection.model('Announcement', Announcement.schema);
        } catch (error) {
            console.error('❌ Error getting tenant Announcement model:', error);
            // Fallback to default model if tenant connection fails
            return Announcement;
        }
    }

    /**
     * Override find to use tenant-specific model
     */
    async find(filter, options = {}) {
        if (filter.tenantId) {
            console.log('🔍 AnnouncementRepository.find - Using tenant-specific model for:', filter.tenantId);
            const TenantAnnouncement = await this.getTenantModel(filter.tenantId);
            let query = TenantAnnouncement.find(filter);

            if (options.populate) {
                options.populate.forEach(pop => {
                    query = query.populate(pop);
                });
            }

            if (options.sort) {
                query = query.sort(options.sort);
            }

            if (options.limit) {
                query = query.limit(options.limit);
            }

            if (options.skip) {
                query = query.skip(options.skip);
            }

            const results = await query.exec();
            console.log('✅ AnnouncementRepository.find - Found', results.length, 'announcements in tenant database');
            return results;
        }

        console.log('⚠️ AnnouncementRepository.find - No tenantId, using default model');
        return await super.find(filter, options);
    }

    /**
     * Override findOne to use tenant-specific model
     */
    async findOne(filter, options = {}) {
        if (filter.tenantId) {
            const TenantAnnouncement = await this.getTenantModel(filter.tenantId);
            let query = TenantAnnouncement.findOne(filter);

            if (options.populate) {
                options.populate.forEach(pop => {
                    query = query.populate(pop);
                });
            }

            return await query.exec();
        }

        return await super.findOne(filter, options);
    }

    /**
     * Override create to use tenant-specific model
     */
    async create(data) {
        if (data.tenantId) {
            const TenantAnnouncement = await this.getTenantModel(data.tenantId);
            return await TenantAnnouncement.create(data);
        }

        return await super.create(data);
    }

    /**
     * Override update to use tenant-specific model
     */
    async update(id, data) {
        // We need tenantId to get the right model
        // First try to find the document to get tenantId
        if (data.tenantId) {
            const TenantAnnouncement = await this.getTenantModel(data.tenantId);
            return await TenantAnnouncement.findByIdAndUpdate(id, data, { new: true });
        }

        return await super.update(id, data);
    }

    /**
     * Override delete to use tenant-specific model
     */
    async delete(id, tenantId) {
        if (tenantId) {
            const TenantAnnouncement = await this.getTenantModel(tenantId);
            return await TenantAnnouncement.findByIdAndDelete(id);
        }

        return await super.delete(id);
    }

    /**
     * Override findById to use tenant-specific model
     */
    async findById(id, options = {}) {
        // For findById, we need tenantId passed in options
        if (options.tenantId) {
            const TenantAnnouncement = await this.getTenantModel(options.tenantId);
            let query = TenantAnnouncement.findById(id);

            if (options.populate) {
                options.populate.forEach(pop => {
                    query = query.populate(pop);
                });
            }

            return await query.exec();
        }

        return await super.findById(id, options);
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

        console.log('🔍 AnnouncementRepository.findActive query:', {
            tenantId,
            filter: JSON.stringify(filter, null, 2),
            now: now.toISOString()
        });

        const result = await this.find(filter, options);
        console.log('🔍 AnnouncementRepository.findActive result count:', result.length);

        return result;
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

        console.log('🔍 AnnouncementRepository.findForUser query:', {
            userId,
            userRole,
            userDepartment,
            tenantId,
            filter: JSON.stringify(filter, null, 2),
            now: now.toISOString()
        });

        const result = await this.find(filter, options);
        console.log('🔍 AnnouncementRepository.findForUser result count:', result.length);

        return result;
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