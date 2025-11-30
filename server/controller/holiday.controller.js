// Holiday Controller
import { getHolidayInfo, getHolidaysForYear, isWorkingDay } from '../utils/holidayChecker.js';

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
