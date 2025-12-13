// Holiday Routes
import express from 'express';
import {
    getHolidayForDate,
    getHolidaysForYearController,
    checkWorkingDay,
    getEgyptHolidays,
    importEgyptHolidays,
    getHolidaySettings,
    updateHolidaySettings,
    addOfficialHolidays,
    removeOfficialHoliday,
    addWeekendWorkDays,
    removeWeekendWorkDay,
    getHolidaySuggestions,
    addHolidaysFromSuggestions,
    checkWorkingDayAlt
} from './controllers/holiday.controller.js';
import { requireAuth } from '../../../shared/middleware/auth.js';

const router = express.Router();

// Get holiday information for a specific date
// GET /api/holidays/check?date=2024-12-25
router.get('/check', requireAuth, getHolidayForDate);

// Get all holidays for a specific year
// GET /api/holidays/year/2024
router.get('/year/:year', requireAuth, getHolidaysForYearController);

// Check if a date is a working day
// GET /api/holidays/working-day?date=2024-12-25
router.get('/working-day', requireAuth, checkWorkingDay);

// Get Egypt holidays from date-holidays package
// GET /api/holidays/egypt-holidays?year=2024
router.get('/egypt-holidays', requireAuth, getEgyptHolidays);

// Import Egypt holidays to database
// POST /api/holidays/import-egypt-holidays
router.post('/import-egypt-holidays', requireAuth, importEgyptHolidays);

// Get holiday settings
// GET /api/holidays/settings
router.get('/settings', requireAuth, getHolidaySettings);

// Update holiday settings
// PUT /api/holidays/settings
router.put('/settings', requireAuth, updateHolidaySettings);

// Add official holidays
// POST /api/holidays/official
router.post('/official', requireAuth, addOfficialHolidays);

// Remove official holiday
// DELETE /api/holidays/official/:holidayId
router.delete('/official/:holidayId', requireAuth, removeOfficialHoliday);

// Add weekend work days
// POST /api/holidays/weekend-work
router.post('/weekend-work', requireAuth, addWeekendWorkDays);

// Remove weekend work day
// DELETE /api/holidays/weekend-work/:workDayId
router.delete('/weekend-work/:workDayId', requireAuth, removeWeekendWorkDay);

// Get holiday suggestions
// GET /api/holidays/suggestions?year=2024
router.get('/suggestions', requireAuth, getHolidaySuggestions);

// Add holidays from suggestions
// POST /api/holidays/suggestions
router.post('/suggestions', requireAuth, addHolidaysFromSuggestions);

// Check if date is working day (alternative endpoint)
// GET /api/holidays/check-working-day?date=2024-12-25
router.get('/check-working-day', requireAuth, checkWorkingDayAlt);

export default router;