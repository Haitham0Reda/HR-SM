import express from 'express';
import {
    getHolidaySettings,
    updateHolidaySettings,
    addOfficialHolidays,
    removeOfficialHoliday,
    addWeekendWorkDays,
    removeWeekendWorkDay,
    getHolidaySuggestions,
    addFromSuggestions,
    checkWorkingDay,
    parseDateString,
    getEgyptHolidays,
    importEgyptHolidays
} from '../controller/holiday.controller.js';
import {
    protect,
    hrOrAdmin,
    validateDateFormat,
    validateHolidayData,
    validateWeekendWorkDay,
    validateSuggestions,
    validateYear,
    validateCountryCode
} from '../middleware/index.js';

const router = express.Router();

// Get holiday settings
router.get('/settings',
    protect,
    getHolidaySettings
);

// Update holiday settings
router.put('/settings',
    protect,
    hrOrAdmin,
    updateHolidaySettings
);

// Add official holidays with validation
router.post('/official',
    protect,
    hrOrAdmin,
    validateHolidayData,
    validateDateFormat,
    addOfficialHolidays
);

// Remove official holiday
router.delete('/official/:holidayId',
    protect,
    hrOrAdmin,
    removeOfficialHoliday
);

// Add weekend work days
router.post('/weekend-work',
    protect,
    hrOrAdmin,
    validateWeekendWorkDay,
    validateDateFormat,
    addWeekendWorkDays
);

// Remove weekend work day
router.delete('/weekend-work/:workDayId',
    protect,
    hrOrAdmin,
    removeWeekendWorkDay
);

// Get holiday suggestions from APIs
router.get('/suggestions',
    protect,
    hrOrAdmin,
    validateYear,
    validateCountryCode,
    getHolidaySuggestions
);

// Add holidays from suggestions
router.post('/suggestions',
    protect,
    hrOrAdmin,
    validateSuggestions,
    addFromSuggestions
);

// Check if date is working day
router.get('/check-working-day',
    protect,
    checkWorkingDay
);

// Parse date string utility
router.get('/parse-date',
    protect,
    parseDateString
);

// Get Egypt holidays from date-holidays package
router.get('/egypt-holidays',
    protect,
    hrOrAdmin,
    getEgyptHolidays
);

// Import Egypt holidays to database
router.post('/import-egypt-holidays',
    protect,
    hrOrAdmin,
    importEgyptHolidays
);

export default router;