/**
 * Holiday Controller
 * 
 * Manages holidays, weekend work days, and holiday suggestions
 */
import Holiday from '../models/holiday.model.js';
import axios from 'axios';
import Holidays from 'date-holidays';

// Default organization ID (campus concept removed)
const DEFAULT_ORG_ID = 'default-organization';

/**
 * Get holiday settings
 */
export const getHolidaySettings = async (req, res) => {
    try {
        const settings = await Holiday.getOrCreateForCampus(DEFAULT_ORG_ID);

        res.status(200).json({
            success: true,
            settings
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Update holiday settings
 */
export const updateHolidaySettings = async (req, res) => {
    try {
        const { weekendDays } = req.body;

        const settings = await Holiday.getOrCreateForCampus(DEFAULT_ORG_ID);

        if (weekendDays !== undefined) {
            settings.weekendDays = weekendDays;
        }

        settings.lastModified = new Date();
        settings.lastModifiedBy = req.user._id;

        await settings.save();

        res.status(200).json({
            success: true,
            message: 'Holiday settings updated successfully',
            settings
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

/**
 * Add official holidays
 */
export const addOfficialHolidays = async (req, res) => {
    try {
        const { dates, name, description } = req.body;

        if (!dates) {
            return res.status(400).json({ error: 'Dates are required' });
        }

        const settings = await Holiday.getOrCreateForCampus(DEFAULT_ORG_ID);

        const result = settings.addMultipleHolidays(dates, name);

        settings.lastModified = new Date();
        settings.lastModifiedBy = req.user._id;

        await settings.save();

        res.status(200).json({
            success: true,
            message: `Added ${result.added.length} holidays`,
            added: result.added,
            errors: result.errors,
            settings
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

/**
 * Remove official holiday
 */
export const removeOfficialHoliday = async (req, res) => {
    try {
        const { holidayId } = req.params;

        const settings = await Holiday.getOrCreateForCampus(DEFAULT_ORG_ID);

        settings.officialHolidays = settings.officialHolidays.filter(
            h => h._id.toString() !== holidayId
        );

        settings.lastModified = new Date();
        settings.lastModifiedBy = req.user._id;

        await settings.save();

        res.status(200).json({
            success: true,
            message: 'Holiday removed successfully',
            settings
        });
    } catch (err) {
        console.error('Error in removeOfficialHoliday:', err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Add weekend work days
 */
export const addWeekendWorkDays = async (req, res) => {
    try {
        const { dates, reason } = req.body;

        if (!dates) {
            return res.status(400).json({ error: 'Dates are required' });
        }

        const settings = await Holiday.getOrCreateForCampus(DEFAULT_ORG_ID);

        const dateArray = dates.split(',').map(d => d.trim()).filter(d => d);
        const added = [];
        const errors = [];

        dateArray.forEach(dateStr => {
            try {
                settings.addWeekendWorkDay(dateStr, reason);
                added.push(dateStr);
            } catch (error) {
                errors.push({ date: dateStr, error: error.message });
            }
        });

        settings.lastModified = new Date();
        settings.lastModifiedBy = req.user._id;

        await settings.save();

        res.status(200).json({
            success: true,
            message: `Added ${added.length} weekend work days`,
            added,
            errors,
            settings
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

/**
 * Remove weekend work day
 */
export const removeWeekendWorkDay = async (req, res) => {
    try {
        const { workDayId } = req.params;

        const settings = await Holiday.getOrCreateForCampus(DEFAULT_ORG_ID);

        settings.weekendWorkDays = settings.weekendWorkDays.filter(
            w => w._id.toString() !== workDayId
        );

        settings.lastModified = new Date();
        settings.lastModifiedBy = req.user._id;

        await settings.save();

        res.status(200).json({
            success: true,
            message: 'Weekend work day removed successfully',
            settings
        });
    } catch (err) {
        console.error('Error in removeWeekendWorkDay:', err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get holiday suggestions from APIs
 */
export const getHolidaySuggestions = async (req, res) => {
    try {
        const { year = new Date().getFullYear(), country = 'EG' } = req.query;

        const settings = await Holiday.getOrCreateForCampus(DEFAULT_ORG_ID);

        let suggestions = [];
        let source = 'none';

        // Try primary API (date.nager.at)
        try {
            const response = await axios.get(
                `https://date.nager.at/api/v3/PublicHolidays/${year}/${country}`,
                { timeout: 5000 }
            );

            if (response.data && Array.isArray(response.data)) {
                suggestions = response.data.map(holiday => ({
                    date: holiday.date,
                    name: holiday.name,
                    localName: holiday.localName,
                    dayOfWeek: Holiday.getDayOfWeek(holiday.date),
                    isWeekend: Holiday.isWeekend(holiday.date, settings.weekendDays),
                    isIslamic: Holiday.isIslamicHoliday(holiday.name),
                    source: 'date.nager.at'
                }));
                source = 'date.nager.at';
            }
        } catch (apiError) {
            console.log('Primary API failed:', apiError.message);
        }

        // Try secondary API (abstractapi.com) if primary failed
        if (suggestions.length === 0 && process.env.ABSTRACT_API_KEY) {
            try {
                const response = await axios.get(
                    `https://holidays.abstractapi.com/v1/?api_key=${process.env.ABSTRACT_API_KEY}&country=${country}&year=${year}`,
                    { timeout: 5000 }
                );

                if (response.data && Array.isArray(response.data)) {
                    suggestions = response.data.map(holiday => ({
                        date: holiday.date,
                        name: holiday.name,
                        localName: holiday.name_local || holiday.name,
                        dayOfWeek: Holiday.getDayOfWeek(holiday.date),
                        isWeekend: Holiday.isWeekend(holiday.date, settings.weekendDays),
                        isIslamic: Holiday.isIslamicHoliday(holiday.name),
                        source: 'abstractapi.com'
                    }));
                    source = 'abstractapi.com';
                }
            } catch (apiError) {
                console.log('Secondary API failed:', apiError.message);
            }
        }

        // Fallback: Egypt holidays if APIs failed
        if (suggestions.length === 0 && country === 'EG') {
            suggestions = getEgyptFallbackHolidays(year, settings.weekendDays);
            source = 'fallback';
        }

        // Filter out holidays already in official list
        const existingDates = new Set(
            settings.officialHolidays.map(h => new Date(h.date).toISOString().split('T')[0])
        );

        suggestions = suggestions.filter(s => !existingDates.has(s.date));

        // Sort by date
        suggestions.sort((a, b) => new Date(a.date) - new Date(b.date));

        res.status(200).json({
            success: true,
            suggestions,
            count: suggestions.length,
            source,
            year,
            country
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Helper: Get fallback Egypt holidays
 */
function getEgyptFallbackHolidays(year, weekendDays = [5, 6]) {
    const holidays = [
        // Fixed date holidays
        { date: `${year}-01-07`, name: 'Coptic Christmas', isIslamic: false },
        { date: `${year}-01-25`, name: 'January 25 Revolution', isIslamic: false },
        { date: `${year}-04-25`, name: 'Sinai Liberation Day', isIslamic: false },
        { date: `${year}-05-01`, name: 'Labour Day', isIslamic: false },
        { date: `${year}-06-30`, name: 'June 30 Revolution', isIslamic: false },
        { date: `${year}-07-23`, name: 'July 23 Revolution', isIslamic: false },
        { date: `${year}-10-06`, name: 'Armed Forces Day', isIslamic: false },

        // Islamic holidays (approximate - would need Islamic calendar API for exact dates)
        { date: `${year}-04-10`, name: 'Eid al-Fitr', isIslamic: true },
        { date: `${year}-04-11`, name: 'Eid al-Fitr', isIslamic: true },
        { date: `${year}-04-12`, name: 'Eid al-Fitr', isIslamic: true },
        { date: `${year}-06-16`, name: 'Arafat Day', isIslamic: true },
        { date: `${year}-06-17`, name: 'Eid al-Adha', isIslamic: true },
        { date: `${year}-06-18`, name: 'Eid al-Adha', isIslamic: true },
        { date: `${year}-06-19`, name: 'Eid al-Adha', isIslamic: true },
        { date: `${year}-07-07`, name: 'Islamic New Year', isIslamic: true },
        { date: `${year}-09-15`, name: 'Prophet\'s Birthday', isIslamic: true }
    ];

    return holidays.map(h => ({
        ...h,
        localName: h.name,
        dayOfWeek: Holiday.getDayOfWeek(h.date),
        isWeekend: Holiday.isWeekend(h.date, weekendDays),
        source: 'fallback'
    }));
}

/**
 * Get official holidays for Egypt from date-holidays package
 */
export const getEgyptHolidays = async (req, res) => {
    try {
        const { year = new Date().getFullYear() } = req.query;
        
        // Create instance for Egypt
        const hd = new Holidays('EG');
        
        // Get holidays for the specified year
        const holidays = hd.getHolidays(year);
        
        res.status(200).json({
            success: true,
            year,
            holidays
        });
    } catch (err) {
        console.error('Error fetching Egypt holidays:', err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Import Egypt holidays to database
 */
export const importEgyptHolidays = async (req, res) => {
    try {
        const { year = new Date().getFullYear() } = req.body;
        
        // Create instance for Egypt
        const hd = new Holidays('EG');
        
        // Get holidays for the specified year
        const holidays = hd.getHolidays(year);
        
        // Get holiday settings for campus
        const settings = await Holiday.getOrCreateForCampus(DEFAULT_ORG_ID);
        
        // Import holidays to database
        let importedCount = 0;
        const errors = [];
        
        for (const holiday of holidays) {
            try {
                // Format date as DD-MM-YYYY for our system
                const dateObj = new Date(holiday.date);
                const formattedDate = `${String(dateObj.getDate()).padStart(2, '0')}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${dateObj.getFullYear()}`;
                
                // Check if holiday already exists
                const exists = settings.officialHolidays.some(h => 
                    h.date.getTime() === dateObj.getTime() && h.name === holiday.name
                );
                
                if (!exists) {
                    settings.addOfficialHoliday(formattedDate, holiday.name, holiday.description || '');
                    importedCount++;
                }
            } catch (error) {
                errors.push({
                    date: holiday.date,
                    name: holiday.name,
                    error: error.message
                });
            }
        }
        
        // Save settings if any holidays were imported
        if (importedCount > 0) {
            settings.lastModified = new Date();
            settings.lastModifiedBy = req.user._id;
            await settings.save();
        }
        
        res.status(200).json({
            success: true,
            message: `Imported ${importedCount} holidays`,
            importedCount,
            errors: errors.length > 0 ? errors : undefined,
            settings
        });
    } catch (err) {
        console.error('Error importing Egypt holidays:', err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Add holidays from suggestions
 */
export const addFromSuggestions = async (req, res) => {
    try {
        const { holidays } = req.body; // Array of holiday objects

        if (!holidays || !Array.isArray(holidays) || holidays.length === 0) {
            return res.status(400).json({ error: 'Holidays array is required' });
        }

        const settings = await Holiday.getOrCreateForCampus(DEFAULT_ORG_ID);

        const added = [];
        const errors = [];

        holidays.forEach(holiday => {
            try {
                const date = new Date(holiday.date);
                const dayOfWeek = Holiday.getDayOfWeek(date);
                const isWeekend = Holiday.isWeekend(date, settings.weekendDays);
                const isIslamic = Holiday.isIslamicHoliday(holiday.name);

                // Check if already exists
                const exists = settings.officialHolidays.some(h =>
                    new Date(h.date).toDateString() === date.toDateString()
                );

                if (!exists) {
                    settings.officialHolidays.push({
                        date,
                        name: holiday.name,
                        dayOfWeek,
                        isWeekend,
                        isIslamic,
                        description: holiday.localName || holiday.name
                    });
                    added.push(holiday.name);
                }
            } catch (error) {
                errors.push({ holiday: holiday.name, error: error.message });
            }
        });

        // Sort by date
        settings.officialHolidays.sort((a, b) => a.date - b.date);

        settings.lastModified = new Date();
        settings.lastModifiedBy = req.user._id;

        await settings.save();

        res.status(200).json({
            success: true,
            message: `Added ${added.length} holidays from suggestions`,
            added,
            errors,
            settings
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

/**
 * Check if date is working day
 */
export const checkWorkingDay = async (req, res) => {
    try {
        const { date } = req.query;

        if (!date) {
            return res.status(400).json({ error: 'Date is required' });
        }

        const settings = await Holiday.getOrCreateForCampus(DEFAULT_ORG_ID);

        const checkDate = new Date(date);
        const isWorking = settings.isWorkingDay(checkDate);
        const isHoliday = settings.isHoliday(checkDate);
        const isWeekendWork = settings.isWeekendWorkDay(checkDate);
        const dayOfWeek = Holiday.getDayOfWeek(checkDate);
        const isWeekend = Holiday.isWeekend(checkDate, settings.weekendDays);

        res.status(200).json({
            success: true,
            date: checkDate,
            dayOfWeek,
            isWorkingDay: isWorking,
            isHoliday,
            isWeekend,
            isWeekendWorkDay: isWeekendWork
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

/**
 * Parse date string and get day info
 */
export const parseDateString = async (req, res) => {
    try {
        const { dateString } = req.query;

        if (!dateString) {
            return res.status(400).json({ error: 'Date string is required' });
        }

        const date = Holiday.parseDate(dateString);

        if (!date) {
            return res.status(400).json({
                error: 'Invalid date format. Use DD-MM-YYYY format.'
            });
        }

        const dayOfWeek = Holiday.getDayOfWeek(date);
        const isWeekend = Holiday.isWeekend(date, [5, 6]); // Default Friday/Saturday

        res.status(200).json({
            success: true,
            date,
            dateString,
            dayOfWeek,
            isWeekend,
            formatted: date.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};
