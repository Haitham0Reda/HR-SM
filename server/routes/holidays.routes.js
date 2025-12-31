import express from 'express';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// Get all holidays
router.get('/', async (req, res) => {
    try {
        const { year = new Date().getFullYear() } = req.query;
        
        // Mock holidays data
        const holidays = [
            {
                id: 1,
                name: 'New Year\'s Day',
                date: `${year}-01-01`,
                type: 'public',
                description: 'First day of the year',
                isRecurring: true
            },
            {
                id: 2,
                name: 'Independence Day',
                date: `${year}-07-04`,
                type: 'public',
                description: 'National Independence Day',
                isRecurring: true
            },
            {
                id: 3,
                name: 'Christmas Day',
                date: `${year}-12-25`,
                type: 'public',
                description: 'Christmas celebration',
                isRecurring: true
            },
            {
                id: 4,
                name: 'Company Anniversary',
                date: `${year}-03-15`,
                type: 'company',
                description: 'Annual company celebration',
                isRecurring: true
            },
            {
                id: 5,
                name: 'Labor Day',
                date: `${year}-09-01`,
                type: 'public',
                description: 'International Workers\' Day',
                isRecurring: true
            }
        ];

        res.json({
            success: true,
            data: holidays,
            message: 'Holidays retrieved successfully',
            year: parseInt(year)
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve holidays',
            error: error.message
        });
    }
});

// Get specific holiday
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Mock holiday data
        const holiday = {
            id: parseInt(id),
            name: 'Holiday #' + id,
            date: '2025-01-01',
            type: 'public',
            description: 'Sample holiday description',
            isRecurring: true,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        res.json({
            success: true,
            data: holiday,
            message: 'Holiday retrieved successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve holiday',
            error: error.message
        });
    }
});

// Create new holiday
router.post('/', async (req, res) => {
    try {
        const { name, date, type = 'company', description, isRecurring = false } = req.body;
        
        if (!name || !date) {
            return res.status(400).json({
                success: false,
                message: 'Name and date are required'
            });
        }

        // Mock holiday creation
        const newHoliday = {
            id: Date.now(),
            name,
            date,
            type,
            description,
            isRecurring,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        res.status(201).json({
            success: true,
            data: newHoliday,
            message: 'Holiday created successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to create holiday',
            error: error.message
        });
    }
});

// Update holiday
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, date, type, description, isRecurring } = req.body;
        
        // Mock holiday update
        const updatedHoliday = {
            id: parseInt(id),
            name: name || 'Updated Holiday',
            date: date || '2025-01-01',
            type: type || 'company',
            description: description || 'Updated description',
            isRecurring: isRecurring || false,
            updatedAt: new Date()
        };

        res.json({
            success: true,
            data: updatedHoliday,
            message: 'Holiday updated successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update holiday',
            error: error.message
        });
    }
});

// Delete holiday
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        res.json({
            success: true,
            message: `Holiday ${id} deleted successfully`
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to delete holiday',
            error: error.message
        });
    }
});

export default router;