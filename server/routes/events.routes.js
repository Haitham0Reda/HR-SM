import express from 'express';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// Get all events
router.get('/', async (req, res) => {
    try {
        const { type, status, startDate, endDate } = req.query;
        
        // Mock events data
        let events = [
            {
                id: 1,
                title: 'Team Building Workshop',
                description: 'Annual team building activities and workshops',
                type: 'workshop',
                status: 'scheduled',
                startDate: '2025-02-15T09:00:00Z',
                endDate: '2025-02-15T17:00:00Z',
                location: 'Conference Room A',
                organizer: 'HR Department',
                attendees: 25,
                maxAttendees: 30
            },
            {
                id: 2,
                title: 'Company All-Hands Meeting',
                description: 'Quarterly company-wide meeting',
                type: 'meeting',
                status: 'scheduled',
                startDate: '2025-01-30T14:00:00Z',
                endDate: '2025-01-30T16:00:00Z',
                location: 'Main Auditorium',
                organizer: 'Executive Team',
                attendees: 150,
                maxAttendees: 200
            },
            {
                id: 3,
                title: 'New Employee Orientation',
                description: 'Orientation program for new hires',
                type: 'training',
                status: 'completed',
                startDate: '2025-01-15T09:00:00Z',
                endDate: '2025-01-15T12:00:00Z',
                location: 'Training Room B',
                organizer: 'HR Department',
                attendees: 8,
                maxAttendees: 15
            },
            {
                id: 4,
                title: 'Annual Performance Reviews',
                description: 'Year-end performance evaluation sessions',
                type: 'review',
                status: 'in-progress',
                startDate: '2025-01-20T08:00:00Z',
                endDate: '2025-02-28T18:00:00Z',
                location: 'Various Offices',
                organizer: 'Management Team',
                attendees: 0,
                maxAttendees: 100
            }
        ];

        // Apply filters
        if (type) {
            events = events.filter(event => event.type === type);
        }
        if (status) {
            events = events.filter(event => event.status === status);
        }

        res.json({
            success: true,
            data: events,
            message: 'Events retrieved successfully',
            total: events.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve events',
            error: error.message
        });
    }
});

// Get specific event
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Mock event data
        const event = {
            id: parseInt(id),
            title: 'Event #' + id,
            description: 'Detailed description of the event',
            type: 'meeting',
            status: 'scheduled',
            startDate: '2025-02-01T10:00:00Z',
            endDate: '2025-02-01T12:00:00Z',
            location: 'Conference Room',
            organizer: 'Event Organizer',
            attendees: 15,
            maxAttendees: 25,
            agenda: [
                'Welcome and introductions',
                'Main presentation',
                'Q&A session',
                'Closing remarks'
            ],
            createdAt: new Date(),
            updatedAt: new Date()
        };

        res.json({
            success: true,
            data: event,
            message: 'Event retrieved successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve event',
            error: error.message
        });
    }
});

// Create new event
router.post('/', async (req, res) => {
    try {
        const { 
            title, 
            description, 
            type = 'meeting', 
            startDate, 
            endDate, 
            location, 
            maxAttendees = 50 
        } = req.body;
        
        if (!title || !startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Title, start date, and end date are required'
            });
        }

        // Mock event creation
        const newEvent = {
            id: Date.now(),
            title,
            description,
            type,
            status: 'scheduled',
            startDate,
            endDate,
            location,
            organizer: req.user?.name || 'Unknown',
            attendees: 0,
            maxAttendees,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        res.status(201).json({
            success: true,
            data: newEvent,
            message: 'Event created successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to create event',
            error: error.message
        });
    }
});

// Update event
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        
        // Mock event update
        const updatedEvent = {
            id: parseInt(id),
            ...updateData,
            updatedAt: new Date()
        };

        res.json({
            success: true,
            data: updatedEvent,
            message: 'Event updated successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update event',
            error: error.message
        });
    }
});

// Delete event
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        res.json({
            success: true,
            message: `Event ${id} deleted successfully`
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to delete event',
            error: error.message
        });
    }
});

// Register for event
router.post('/:id/register', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        
        res.json({
            success: true,
            message: `Successfully registered for event ${id}`,
            data: {
                eventId: parseInt(id),
                userId,
                registeredAt: new Date()
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to register for event',
            error: error.message
        });
    }
});

// Unregister from event
router.delete('/:id/register', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        
        res.json({
            success: true,
            message: `Successfully unregistered from event ${id}`,
            data: {
                eventId: parseInt(id),
                userId
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to unregister from event',
            error: error.message
        });
    }
});

export default router;