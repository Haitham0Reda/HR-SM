import { Op } from 'sequelize';
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

        const holidays = getHolidaysForYear(parseInt(year));
        if (!holidays || holidays.length === 0) {
            return res.status(404).json({ error: `No holidays found for year ${year}` });
        }

        const tenantId = req.tenantId || req.user?.tenantId;
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant ID is required' });
        }

        let settings = await Holiday.findOne({ where: { tenantId } });
        if (!settings) {
            settings = await Holiday.create({
                tenantId,
                officialHolidays: [],
                weekendWorkDays: [],
                earlyLeaveDates: [],
                weekendDays: [5, 6]
            });
        }

        let imported = 0, skipped = 0;
        const errors = [];

        for (const holiday of holidays) {
            try {
                const holidayDate = new Date(holiday.date);
                const exists = settings.officialHolidays.some(h =>
                    new Date(h.date).toDateString() === holidayDate.toDateString()
                );
                if (exists) {
                    skipped++;
                    continue;
                }

                const isIslamic = Holiday.isIslamicHoliday(holiday.name);
                settings.officialHolidays.push({
                    date: holidayDate,
                    name: holiday.name,
                    dayOfWeek: Holiday.getDayOfWeek(holidayDate),
                    isWeekend: Holiday.isWeekend(holidayDate, settings.weekendDays),
                    isIslamic,
                    description: holiday.type || ''
                });
                imported++;
            } catch (error) {
                errors.push({ holiday: holiday.name, date: holiday.date, error: error.message });
            }
        }

        settings.officialHolidays.sort((a, b) => a.date - b.date);
        settings.lastModified = new Date();
        if (req.user?.id) {
            settings.lastModifiedBy = req.user.id;
        }
        await settings.save();

        res.json({
            message: `Successfully imported ${imported} holidays for year ${year}`,
            imported,
            skipped,
            errors: errors.length > 0 ? errors : undefined,
            total: holidays.length
        });
    } catch (err) {
        console.error('Import holidays error:', err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get holiday settings
 */
export const getHolidaySettings = async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId;
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant ID is required' });
        }

        let settings = await Holiday.findOne({ where: { tenantId } });
        if (!settings) {
            settings = await Holiday.create({
                tenantId,
                officialHolidays: [],
                weekendWorkDays: [],
                earlyLeaveDates: [],
                weekendDays: [5, 6]
            });
        }
        res.json(settings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Update holiday settings
 */
export const updateHolidaySettings = async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId;
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant ID is required' });
        }

        const { officialHolidays, weekendWorkDays, earlyLeaveDates, weekendDays } = req.body;

        const [settings] = await Holiday.findOrCreate({
            where: { tenantId },
            defaults: {
                tenantId,
                officialHolidays: officialHolidays || [],
                weekendWorkDays: weekendWorkDays || [],
                earlyLeaveDates: earlyLeaveDates || [],
                weekendDays: weekendDays || [5, 6]
            }
        });

        if (officialHolidays !== undefined) settings.officialHolidays = officialHolidays;
        if (weekendWorkDays !== undefined) settings.weekendWorkDays = weekendWorkDays;
        if (earlyLeaveDates !== undefined) settings.earlyLeaveDates = earlyLeaveDates;
        if (weekendDays !== undefined) settings.weekendDays = weekendDays;
        settings.lastModified = new Date();
        if (req.user?.id) {
            settings.lastModifiedBy = req.user.id;
        }
        await settings.save();

        res.json(settings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Helper functions (these were originally in utils/holidayChecker.js)
function getHolidayInfo(date) {
    // Implementation would check if date is holiday/weekend
    return { isHoliday: false, isWorkingDay: true, holidayName: null };
}

function getHolidaysForYear(year) {
    // Would import from date-holidays package
    return [];
}

function isWorkingDay(date) {
    return true;
}
