// Holiday Routes
import express from 'express';
import { 
    getHolidayForDate, 
    getHolidaysForYearController, 
    checkWorkingDay 
} from '../controller/holiday.controller.js';
import { protect } from '../middleware/index.js';

const router = express.Router();

// Get holiday information for a specific date
// GET /api/holidays/check?date=2024-12-25
router.get('/check', protect, getHolidayForDate);

// Get all holidays for a specific year
// GET /api/holidays/year/2024
router.get('/year/:year', protect, getHolidaysForYearController);

// Check if a date is a working day
// GET /api/holidays/working-day?date=2024-12-25
router.get('/working-day', protect, checkWorkingDay);

export default router;
