// Holiday Controller
import { getHolidayInfo, getHolidaysForYear, isWorkingDay } from '../utils/holidayChecker.js';
import Holiday from '../models/holiday.model.js';

/**
 * Get holiday information for a specific date
 */
export const getHolidayForDate = async (req, res) => {
    try {
        const { date } = req.query;

        if (!date) {
            return res.status(400).json({ error: 'Date parameter is required' });
        }

        const holidayInfo = getHolidayInfo(date);
        res.json(holidayInfo);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get all holidays for a specific year
 */
export const getHolidaysForYearController = async (req, res) => {
    try {
        const { year } = req.params;

        if (!year) {
            return res.status(400).json({ error: 'Year parameter is required' });
        }

        const holidays = getHolidaysForYear(parseInt(year));
        res.json(holidays);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Check if a date is a working day
 */
export const checkWorkingDay = async (req, res) => {
    try {
        const { date } = req.query;

        if (!date) {
            return res.status(400).json({ error: 'Date parameter is required' });
        }

        const isWorking = isWorkingDay(date);
        const holidayInfo = getHolidayInfo(date);

        res.json({
            date: date,
            isWorkingDay: isWorking,
            ...holidayInfo
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get Egypt holidays from date-holidays package
 */
export const getEgyptHolidays = async (req, res) => {
    try {
        const { year } = req.query;

        if (!year) {
            return res.status(400).json({ error: 'Year parameter is required' });
        }

        const holidays = getHolidaysForYear(parseInt(year));
        res.json({ holidays });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Import Egypt holidays to database
 */
export const importEgyptHolidays = async (req, res) => {
    try {
        const { year } = req.body;

        if (!year) {
            return res.status(400).json({ error: 'Year parameter is required' });
        }

        // Get holidays from date-holidays package
        const holidays = getHolidaysForYear(parseInt(year));

        if (!holidays || holidays.length === 0) {
            return res.status(404).json({ error: `No holidays found for year ${year}` });
        }

        // Get or create holiday settings for tenant
        const holidaySettings = await Holiday.getOrCreateForTenant(req.user?.tenantId || 'default-tenant');

        // Track import results
        let imported = 0;
        let skipped = 0;
        const errors = [];

        // Import each holiday
        for (const holiday of holidays) {
            try {
                const holidayDate = new Date(holiday.date);

                // Check if holiday already exists
                const exists = holidaySettings.officialHolidays.some(h => {
                    const existingDate = new Date(h.date);
                    return existingDate.toDateString() === holidayDate.toDateString();
                });

                if (exists) {
                    skipped++;
                    continue;
                }

                // Determine if it's an Islamic holiday
                const isIslamic = Holiday.isIslamicHoliday(holiday.name);

                // Add the holiday
                holidaySettings.officialHolidays.push({
                    date: holidayDate,
                    name: holiday.name,
                    dayOfWeek: Holiday.getDayOfWeek(holidayDate),
                    isWeekend: Holiday.isWeekend(holidayDate, holidaySettings.weekendDays),
                    isIslamic: isIslamic,
                    description: holiday.type || ''
                });

                imported++;
            } catch (error) {
                errors.push({
                    holiday: holiday.name,
                    date: holiday.date,
                    error: error.message
                });
            }
        }

        // Sort holidays by date
        holidaySettings.officialHolidays.sort((a, b) => a.date - b.date);

        // Update metadata
        holidaySettings.lastModified = new Date();
        if (req.user && req.user._id) {
            holidaySettings.lastModifiedBy = req.user._id;
        }

        // Save to database
        await holidaySettings.save();

        res.json({
            message: `Successfully imported ${imported} holidays for year ${year}`,
            imported,
            skipped,
            errors: errors.length > 0 ? errors : undefined,
            total: holidays.length
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get holiday settings
 */
export const getHolidaySettings = async (req, res) => {
    try {
        // Get or create holiday settings for tenant
        const holidaySettings = await Holiday.getOrCreateForTenant(req.user?.tenantId || 'default-tenant');

        res.json({ settings: holidaySettings });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Update holiday settings
 */
export const updateHolidaySettings = async (req, res) => {
    try {
        const updates = req.body;

        // Get or create holiday settings for tenant
        const holidaySettings = await Holiday.getOrCreateForTenant(req.user?.tenantId || 'default-tenant');

        // Update fields if provided
        if (updates.weekendDays !== undefined) {
            holidaySettings.weekendDays = updates.weekendDays;
        }

        if (updates.officialHolidays !== undefined) {
            holidaySettings.officialHolidays = updates.officialHolidays;
        }

        if (updates.weekendWorkDays !== undefined) {
            holidaySettings.weekendWorkDays = updates.weekendWorkDays;
        }

        if (updates.earlyLeaveDates !== undefined) {
            holidaySettings.earlyLeaveDates = updates.earlyLeaveDates;
        }

        // Update metadata
        holidaySettings.lastModified = new Date();
        if (req.user && req.user._id) {
            holidaySettings.lastModifiedBy = req.user._id;
        }

        // Save to database
        await holidaySettings.save();

        res.json({
            message: 'Holiday settings updated successfully',
            settings: holidaySettings
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
