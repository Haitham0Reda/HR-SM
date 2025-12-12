// Holiday Routes
import express from 'express';
import {
    getHolidayForDate,
    getHolidaysForYearController,
    checkWorkingDay,
    getEgyptHolidays,
    importEgyptHolidays,
    getHolidaySettings,
    updateHolidaySettings
} from '../controllers/holiday.controller.js';
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

// Get Egypt holidays from date-holidays package
// GET /api/holidays/egypt-holidays?year=2024
router.get('/egypt-holidays', protect, getEgyptHolidays);

// Import Egypt holidays to database
// POST /api/holidays/import-egypt-holidays
router.post('/import-egypt-holidays', protect, importEgyptHolidays);

// Get holiday settings
// GET /api/holidays/settings
router.get('/settings', protect, getHolidaySettings);

// Update holiday settings
// PUT /api/holidays/settings
router.put('/settings', protect, updateHolidaySettings);

export default router;
