import BaseRepository from '../BaseRepository.js';
import Event from '../../modules/events/models/event.model.js';
import multiTenantDB from '../../config/multiTenant.js';

/**
 * Event Repository - Data access layer for event operations
 * Extends BaseRepository with event-specific query methods
 * Supports multi-tenant database isolation
 */
class EventRepository extends BaseRepository {
    constructor() {
        super(Event);
    }

    /**
     * Get tenant-specific Event model
     */
    async getTenantModel(tenantId) {
        try {
            console.log('🔍 Getting tenant-specific Event model for:', tenantId);
            const tenantConnection = await multiTenantDB.getCompanyConnection(tenantId);
            console.log('✅ Connected to tenant database:', tenantConnection.name);

            // Register User model if it doesn't exist on this connection
            // This is needed for populate() to work
            try {
                if (!tenantConnection.models.User) {
                    const { default: User } = await import('../../modules/hr-core/users/models/user.model.js');
                    tenantConnection.model('User', User.schema);
                }
            } catch (error) {
                console.warn('Could not register User model:', error.message);
            }

            return tenantConnection.model('Event', Event.schema);
        } catch (error) {
            console.error('❌ Error getting tenant Event model:', error);
            // Fallback to default model if tenant connection fails
            return Event;
        }
    }

    /**
     * Override find to use tenant-specific model
     */
    async find(filter, options = {}) {
        if (filter.tenantId) {
            console.log('🔍 EventRepository.find - Using tenant-specific model for:', filter.tenantId);
            const TenantEvent = await this.getTenantModel(filter.tenantId);
            let query = TenantEvent.find(filter);

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
            console.log('✅ EventRepository.find - Found', results.length, 'events in tenant database');
            return results;
        }

        console.log('⚠️ EventRepository.find - No tenantId, using default model');
        return await super.find(filter, options);
    }

    /**
     * Override findOne to use tenant-specific model
     */
    async findOne(filter, options = {}) {
        if (filter.tenantId) {
            const TenantEvent = await this.getTenantModel(filter.tenantId);
            let query = TenantEvent.findOne(filter);

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
            const TenantEvent = await this.getTenantModel(data.tenantId);
            return await TenantEvent.create(data);
        }

        return await super.create(data);
    }

    /**
     * Override update to use tenant-specific model
     */
    async update(id, data) {
        if (data.tenantId) {
            const TenantEvent = await this.getTenantModel(data.tenantId);
            return await TenantEvent.findByIdAndUpdate(id, data, { new: true });
        }

        return await super.update(id, data);
    }

    /**
     * Override delete to use tenant-specific model
     */
    async delete(id, tenantId) {
        if (tenantId) {
            const TenantEvent = await this.getTenantModel(tenantId);
            return await TenantEvent.findByIdAndDelete(id);
        }

        return await super.delete(id);
    }

    /**
     * Override findById to use tenant-specific model
     */
    async findById(id, options = {}) {
        if (options.tenantId) {
            const TenantEvent = await this.getTenantModel(options.tenantId);
            let query = TenantEvent.findById(id);

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
     * Find events by date range
     */
    async findByDateRange(startDate, endDate, tenantId, options = {}) {
        const filter = {
            tenantId,
            startDate: {
                $gte: startDate,
                $lte: endDate
            }
        };
        return await this.find(filter, options);
    }

    /**
     * Find upcoming events
     */
    async findUpcoming(tenantId, options = {}) {
        const now = new Date();
        const filter = {
            tenantId,
            startDate: { $gte: now }
        };
        return await this.find(filter, options);
    }

    /**
     * Find past events
     */
    async findPast(tenantId, options = {}) {
        const now = new Date();
        const filter = {
            tenantId,
            endDate: { $lt: now }
        };
        return await this.find(filter, options);
    }

    /**
     * Find events by creator
     */
    async findByCreator(createdBy, tenantId, options = {}) {
        const filter = { createdBy, tenantId };
        return await this.find(filter, options);
    }

    /**
     * Find public events
     */
    async findPublic(tenantId, options = {}) {
        const filter = { tenantId, isPublic: true };
        return await this.find(filter, options);
    }

    /**
     * Find events by attendee
     */
    async findByAttendee(userId, tenantId, options = {}) {
        const filter = {
            tenantId,
            attendees: userId
        };
        return await this.find(filter, options);
    }

    /**
     * Search events by title or description
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
}

export default EventRepository;
