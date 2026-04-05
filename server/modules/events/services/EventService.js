import EventRepository from '../../../repositories/modules/EventRepository.js';
import { Op } from 'sequelize';

/**
 * Event Service - Business logic layer for event operations
 * Uses EventRepository for data access
 */
class EventService {
    constructor() {
        this.eventRepository = new EventRepository();
    }

    /**
     * Get all events
     */
    async getAllEvents(tenantId, options = {}) {
        const filter = { tenantId };
        const queryOptions = {
            include: [
                { association: 'createdBy', attributes: ['username', 'email'] },
                { association: 'attendees', attributes: ['username', 'email'] }
            ],
            order: [['startDate', 'DESC']],
            ...options
        };

        return await this.eventRepository.findAll(filter, queryOptions);
    }

    /**
     * Create event
     */
    async createEvent(eventData, tenantId, userId) {
        const dataToCreate = {
            ...eventData,
            tenantId,
            createdBy: userId
        };

        const event = await this.eventRepository.create(dataToCreate);

        // Return populated event with tenantId in options
        return await this.eventRepository.findById(event.id, {
            tenantId,
            include: [
                { association: 'createdBy', attributes: ['username', 'email'] },
                { association: 'attendees', attributes: ['username', 'email'] }
            ]
        });
    }

    /**
     * Get event by ID
     */
    async getEventById(id, tenantId) {
        const event = await this.eventRepository.findOne(
            { id, tenantId },
            {
                include: [
                    { association: 'createdBy', attributes: ['username', 'email'] },
                    { association: 'attendees', attributes: ['username', 'email'] }
                ]
            }
        );

        if (!event) {
            throw new Error('Event not found');
        }

        return event;
    }

    /**
     * Update event
     */
    async updateEvent(id, updateData, tenantId) {
        const event = await this.eventRepository.findOne({ id, tenantId });

        if (!event) {
            throw new Error('Event not found');
        }

        // Include tenantId in update data
        const updatedEvent = await this.eventRepository.update(id, { ...updateData, tenantId });

        // Return populated event with tenantId in options
        return await this.eventRepository.findById(id, {
            tenantId,
            include: [
                { association: 'createdBy', attributes: ['username', 'email'] },
                { association: 'attendees', attributes: ['username', 'email'] }
            ]
        });
    }

    /**
     * Delete event
     */
    async deleteEvent(id, tenantId) {
        const event = await this.eventRepository.findOne({ id, tenantId });

        if (!event) {
            throw new Error('Event not found');
        }

        await this.eventRepository.delete(id, tenantId);
        return { message: 'Event deleted' };
    }

    /**
     * Get upcoming events
     */
    async getUpcomingEvents(tenantId, options = {}) {
        return await this.eventRepository.findUpcoming(tenantId, {
            include: [
                { association: 'createdBy', attributes: ['username', 'email'] },
                { association: 'attendees', attributes: ['username', 'email'] }
            ],
            order: [['startDate', 'ASC']],
            ...options
        });
    }

    /**
     * Get past events
     */
    async getPastEvents(tenantId, options = {}) {
        return await this.eventRepository.findPast(tenantId, {
            include: [
                { association: 'createdBy', attributes: ['username', 'email'] },
                { association: 'attendees', attributes: ['username', 'email'] }
            ],
            order: [['startDate', 'DESC']],
            ...options
        });
    }

    /**
     * Get events by date range
     */
    async getEventsByDateRange(startDate, endDate, tenantId, options = {}) {
        return await this.eventRepository.findByDateRange(startDate, endDate, tenantId, {
            include: [
                { association: 'createdBy', attributes: ['username', 'email'] },
                { association: 'attendees', attributes: ['username', 'email'] }
            ],
            order: [['startDate', 'ASC']],
            ...options
        });
    }

    /**
     * Get public events
     */
    async getPublicEvents(tenantId, options = {}) {
        return await this.eventRepository.findPublic(tenantId, {
            populate: [
                { path: 'createdBy', select: 'username email' },
                { path: 'attendees', select: 'username email' }
            ],
            sort: { startDate: -1 },
            ...options
        });
    }

    /**
     * Get events by attendee
     */
    async getEventsByAttendee(userId, tenantId, options = {}) {
        return await this.eventRepository.findByAttendee(userId, tenantId, {
            populate: [
                { path: 'createdBy', select: 'username email' },
                { path: 'attendees', select: 'username email' }
            ],
            sort: { startDate: -1 },
            ...options
        });
    }

    /**
     * Search events
     */
    async searchEvents(searchTerm, tenantId, options = {}) {
        return await this.eventRepository.search(searchTerm, tenantId, {
            populate: [
                { path: 'createdBy', select: 'username email' },
                { path: 'attendees', select: 'username email' }
            ],
            sort: { startDate: -1 },
            ...options
        });
    }
}

export default EventService;
