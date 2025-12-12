// Holiday Checker Utility
import Holidays from 'date-holidays';

/**
 * Initialize holidays for a specific country
 * Default: Egypt (EG)
 * You can change this to any country code supported by date-holidays
 */
const hd = new Holidays('EG'); // Egypt

/**
 * Check if a given date is a holiday
 * @param {Date|string} date - The date to check
 * @returns {Object|null} - Holiday object if it's a holiday, null otherwise
 */
export const isHoliday = (date) => {
    const checkDate = new Date(date);
    const holidays = hd.isHoliday(checkDate);
    
    if (holidays) {
        // holidays can be an array or a single object
        return Array.isArray(holidays) ? holidays[0] : holidays;
    }
    
    return null;
};

/**
 * Check if a given date is a weekend (Saturday or Sunday for Egypt)
 * @param {Date|string} date - The date to check
 * @returns {boolean} - True if weekend, false otherwise
 */
export const isWeekend = (date) => {
    const checkDate = new Date(date);
    const dayOfWeek = checkDate.getDay();
    // Saturday (6) or Sunday (0) for Egypt
    return dayOfWeek === 0 || dayOfWeek === 6;
};

/**
 * Check if a given date is a working day (not weekend and not holiday)
 * @param {Date|string} date - The date to check
 * @returns {boolean} - True if working day, false otherwise
 */
export const isWorkingDay = (date) => {
    return !isWeekend(date) && !isHoliday(date);
};

/**
 * Get all holidays for a specific year
 * @param {number} year - The year to get holidays for
 * @returns {Array} - Array of holiday objects
 */
export const getHolidaysForYear = (year) => {
    return hd.getHolidays(year);
};

/**
 * Get holiday name if the date is a holiday
 * @param {Date|string} date - The date to check
 * @returns {string|null} - Holiday name or null
 */
export const getHolidayName = (date) => {
    const holiday = isHoliday(date);
    return holiday ? holiday.name : null;
};

/**
 * Get holiday type (official, weekend, etc.)
 * @param {Date|string} date - The date to check
 * @returns {string} - Holiday type or 'working-day'
 */
export const getHolidayType = (date) => {
    if (isWeekend(date)) {
        return 'weekend';
    }
    
    const holiday = isHoliday(date);
    if (holiday) {
        return holiday.type || 'official-holiday';
    }
    
    return 'working-day';
};

/**
 * Get detailed holiday information
 * @param {Date|string} date - The date to check
 * @returns {Object} - Detailed holiday information
 */
export const getHolidayInfo = (date) => {
    const checkDate = new Date(date);
    const weekend = isWeekend(date);
    const holiday = isHoliday(date);
    
    return {
        date: checkDate,
        isWeekend: weekend,
        isHoliday: !!holiday,
        isWorkingDay: !weekend && !holiday,
        holidayName: holiday ? holiday.name : null,
        holidayType: getHolidayType(date),
        note: weekend ? 'Official Holiday (Weekend)' : (holiday ? `Official Holiday (${holiday.name})` : null)
    };
};

export default {
    isHoliday,
    isWeekend,
    isWorkingDay,
    getHolidaysForYear,
    getHolidayName,
    getHolidayType,
    getHolidayInfo
};
