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

/**
 * Add official holidays
 */
export const addOfficialHolidays = async (req, res) => {
    try {
        const { holidays } = req.body;

        if (!holidays || !Array.isArray(holidays)) {
            return res.status(400).json({ 
                success: false,
                message: 'Holidays array is required' 
            });
        }

        // Get or create holiday settings for tenant
        const holidaySettings = await Holiday.getOrCreateForTenant(req.user?.tenantId || 'default-tenant');

        const results = {
            added: [],
            errors: []
        };

        // Add each holiday
        for (const holiday of holidays) {
            try {
                const { date, name, description } = holiday;
                
                if (!date || !name) {
                    results.errors.push({
                        holiday,
                        error: 'Date and name are required'
                    });
                    continue;
                }

                const holidayDate = new Date(date);
                
                // Check if holiday already exists
                const exists = holidaySettings.officialHolidays.some(h => {
                    const existingDate = new Date(h.date);
                    return existingDate.toDateString() === holidayDate.toDateString();
                });

                if (exists) {
                    results.errors.push({
                        holiday,
                        error: 'Holiday already exists for this date'
                    });
                    continue;
                }

                // Add the holiday
                holidaySettings.officialHolidays.push({
                    date: holidayDate,
                    name,
                    dayOfWeek: Holiday.getDayOfWeek(holidayDate),
                    isWeekend: Holiday.isWeekend(holidayDate, holidaySettings.weekendDays),
                    isIslamic: Holiday.isIslamicHoliday(name),
                    description: description || ''
                });

                results.added.push(holiday);
            } catch (error) {
                results.errors.push({
                    holiday,
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
            success: true,
            message: `Added ${results.added.length} holidays`,
            data: results
        });
    } catch (err) {
        res.status(500).json({ 
            success: false,
            message: err.message 
        });
    }
};

/**
 * Remove official holiday
 */
export const removeOfficialHoliday = async (req, res) => {
    try {
        const { holidayId } = req.params;

        // Get or create holiday settings for tenant
        const holidaySettings = await Holiday.getOrCreateForTenant(req.user?.tenantId || 'default-tenant');

        // Find and remove the holiday
        const initialLength = holidaySettings.officialHolidays.length;
        holidaySettings.officialHolidays = holidaySettings.officialHolidays.filter(
            h => h._id.toString() !== holidayId
        );

        if (holidaySettings.officialHolidays.length === initialLength) {
            return res.status(404).json({
                success: false,
                message: 'Holiday not found'
            });
        }

        // Update metadata
        holidaySettings.lastModified = new Date();
        if (req.user && req.user._id) {
            holidaySettings.lastModifiedBy = req.user._id;
        }

        // Save to database
        await holidaySettings.save();

        res.json({
            success: true,
            message: 'Holiday removed successfully'
        });
    } catch (err) {
        res.status(500).json({ 
            success: false,
            message: err.message 
        });
    }
};

/**
 * Add weekend work days
 */
export const addWeekendWorkDays = async (req, res) => {
    try {
        const { workDays } = req.body;

        if (!workDays || !Array.isArray(workDays)) {
            return res.status(400).json({ 
                success: false,
                message: 'Work days array is required' 
            });
        }

        // Get or create holiday settings for tenant
        const holidaySettings = await Holiday.getOrCreateForTenant(req.user?.tenantId || 'default-tenant');

        const results = {
            added: [],
            errors: []
        };

        // Add each work day
        for (const workDay of workDays) {
            try {
                const { date, reason } = workDay;
                
                if (!date) {
                    results.errors.push({
                        workDay,
                        error: 'Date is required'
                    });
                    continue;
                }

                const workDate = new Date(date);
                
                // Check if work day already exists
                const exists = holidaySettings.weekendWorkDays.some(w => {
                    const existingDate = new Date(w.date);
                    return existingDate.toDateString() === workDate.toDateString();
                });

                if (exists) {
                    results.errors.push({
                        workDay,
                        error: 'Weekend work day already exists for this date'
                    });
                    continue;
                }

                // Add the work day
                holidaySettings.weekendWorkDays.push({
                    date: workDate,
                    reason: reason || '',
                    dayOfWeek: Holiday.getDayOfWeek(workDate)
                });

                results.added.push(workDay);
            } catch (error) {
                results.errors.push({
                    workDay,
                    error: error.message
                });
            }
        }

        // Sort work days by date
        holidaySettings.weekendWorkDays.sort((a, b) => a.date - b.date);

        // Update metadata
        holidaySettings.lastModified = new Date();
        if (req.user && req.user._id) {
            holidaySettings.lastModifiedBy = req.user._id;
        }

        // Save to database
        await holidaySettings.save();

        res.json({
            success: true,
            message: `Added ${results.added.length} weekend work days`,
            data: results
        });
    } catch (err) {
        res.status(500).json({ 
            success: false,
            message: err.message 
        });
    }
};

/**
 * Remove weekend work day
 */
export const removeWeekendWorkDay = async (req, res) => {
    try {
        const { workDayId } = req.params;

        // Get or create holiday settings for tenant
        const holidaySettings = await Holiday.getOrCreateForTenant(req.user?.tenantId || 'default-tenant');

        // Find and remove the work day
        const initialLength = holidaySettings.weekendWorkDays.length;
        holidaySettings.weekendWorkDays = holidaySettings.weekendWorkDays.filter(
            w => w._id.toString() !== workDayId
        );

        if (holidaySettings.weekendWorkDays.length === initialLength) {
            return res.status(404).json({
                success: false,
                message: 'Weekend work day not found'
            });
        }

        // Update metadata
        holidaySettings.lastModified = new Date();
        if (req.user && req.user._id) {
            holidaySettings.lastModifiedBy = req.user._id;
        }

        // Save to database
        await holidaySettings.save();

        res.json({
            success: true,
            message: 'Weekend work day removed successfully'
        });
    } catch (err) {
        res.status(500).json({ 
            success: false,
            message: err.message 
        });
    }
};

/**
 * Get holiday suggestions (Egypt holidays)
 */
export const getHolidaySuggestions = async (req, res) => {
    try {
        const { year } = req.query;

        if (!year) {
            return res.status(400).json({ 
                success: false,
                message: 'Year parameter is required' 
            });
        }

        const holidays = getHolidaysForYear(parseInt(year));
        
        // Get existing holidays to filter out duplicates
        const holidaySettings = await Holiday.getOrCreateForTenant(req.user?.tenantId || 'default-tenant');
        
        const suggestions = holidays.filter(holiday => {
            const holidayDate = new Date(holiday.date);
            return !holidaySettings.officialHolidays.some(h => {
                const existingDate = new Date(h.date);
                return existingDate.toDateString() === holidayDate.toDateString();
            });
        });

        res.json({
            success: true,
            data: suggestions
        });
    } catch (err) {
        res.status(500).json({ 
            success: false,
            message: err.message 
        });
    }
};

/**
 * Add holidays from suggestions
 */
export const addHolidaysFromSuggestions = async (req, res) => {
    try {
        const { selectedHolidays } = req.body;

        if (!selectedHolidays || !Array.isArray(selectedHolidays)) {
            return res.status(400).json({ 
                success: false,
                message: 'Selected holidays array is required' 
            });
        }

        // Convert suggestions to holiday format
        const holidays = selectedHolidays.map(holiday => ({
            date: holiday.date,
            name: holiday.name,
            description: holiday.type || ''
        }));

        // Use the existing addOfficialHolidays function
        req.body = { holidays };
        return await addOfficialHolidays(req, res);
    } catch (err) {
        res.status(500).json({ 
            success: false,
            message: err.message 
        });
    }
};

/**
 * Check if date is working day (alternative endpoint)
 */
export const checkWorkingDayAlt = async (req, res) => {
    try {
        const { date } = req.query;

        if (!date) {
            return res.status(400).json({ 
                success: false,
                message: 'Date parameter is required' 
            });
        }

        // Get holiday settings for tenant
        const holidaySettings = await Holiday.getOrCreateForTenant(req.user?.tenantId || 'default-tenant');
        
        const checkDate = new Date(date);
        const isWorking = holidaySettings.isWorkingDay(checkDate);
        const isHoliday = holidaySettings.isHoliday(checkDate);
        const isWeekendWorkDay = holidaySettings.isWeekendWorkDay(checkDate);
        const isWeekend = Holiday.isWeekend(checkDate, holidaySettings.weekendDays);

        res.json({
            success: true,
            data: {
                date: date,
                isWorkingDay: isWorking,
                isHoliday,
                isWeekend,
                isWeekendWorkDay,
                dayOfWeek: Holiday.getDayOfWeek(checkDate)
            }
        });
    } catch (err) {
        res.status(500).json({ 
            success: false,
            message: err.message 
        });
    }
};
