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
    validateCampus,
    validateDateFormat,
    validateHolidayData,
    validateWeekendWorkDay,
    validateSuggestions,
    validateYear,
    validateCountryCode
} from '../middleware/index.js';

const router = express.Router();

// Get holiday settings for campus
router.get('/campus/:campusId',
    protect,
    validateCampus,
    getHolidaySettings
);

// Update holiday settings
router.put('/campus/:campusId',
    protect,
    hrOrAdmin,
    validateCampus,
    updateHolidaySettings
);

// Add official holidays with validation
router.post('/campus/:campusId/official',
    protect,
    hrOrAdmin,
    validateCampus,
    validateHolidayData,
    validateDateFormat,
    addOfficialHolidays
);

// Remove official holiday
router.delete('/campus/:campusId/official/:holidayId',
    protect,
    hrOrAdmin,
    validateCampus,
    removeOfficialHoliday
);

// Add weekend work days
router.post('/campus/:campusId/weekend-work',
    protect,
    hrOrAdmin,
    validateCampus,
    validateWeekendWorkDay,
    validateDateFormat,
    addWeekendWorkDays
);

// Remove weekend work day
router.delete('/campus/:campusId/weekend-work/:workDayId',
    protect,
    hrOrAdmin,
    validateCampus,
    removeWeekendWorkDay
);

// Get holiday suggestions from APIs
router.get('/campus/:campusId/suggestions',
    protect,
    hrOrAdmin,
    validateCampus,
    validateYear,
    validateCountryCode,
    getHolidaySuggestions
);

// Add holidays from suggestions
router.post('/campus/:campusId/suggestions',
    protect,
    hrOrAdmin,
    validateCampus,
    validateSuggestions,
    addFromSuggestions
);

// Check if date is working day
router.get('/campus/:campusId/check-working-day',
    protect,
    validateCampus,
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
router.post('/campus/:campusId/import-egypt-holidays',
    protect,
    hrOrAdmin,
    validateCampus,
    importEgyptHolidays
);

export default router;