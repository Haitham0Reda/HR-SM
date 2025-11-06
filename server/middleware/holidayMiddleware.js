/**
 * Holiday Middleware
 * 
 * Validation and business logic for holidays
 */
import mongoose from 'mongoose';

/**
 * Validate date format (DD-MM-YYYY)
 */
export const validateDateFormat = (req, res, next) => {
    const { dates } = req.body;

    if (!dates) {
        return next();
    }

    const dateArray = dates.split(',').map(d => d.trim()).filter(d => d);
    const dateRegex = /^\d{2}-\d{2}-\d{4}$/;

    const invalidDates = dateArray.filter(date => !dateRegex.test(date));

    if (invalidDates.length > 0) {
        return res.status(400).json({
            success: false,
            message: 'Invalid date format. Use DD-MM-YYYY format.',
            invalidDates
        });
    }

    next();
};

/**
 * Validate campus exists
 */
export const validateCampus = async (req, res, next) => {
    try {
        const { campusId } = req.params;

        if (!campusId) {
            return res.status(400).json({
                success: false,
                message: 'Campus ID is required'
            });
        }

        if (!mongoose.Types.ObjectId.isValid(campusId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid campus ID'
            });
        }

        next();
    } catch (error) {
        console.error('Error validating campus:', error);
        next();
    }
};

/**
 * Validate holiday data
 */
export const validateHolidayData = (req, res, next) => {
    const { dates, name } = req.body;

    if (!dates || dates.trim() === '') {
        return res.status(400).json({
            success: false,
            message: 'Dates are required'
        });
    }

    if (name && name.length > 100) {
        return res.status(400).json({
            success: false,
            message: 'Holiday name must be less than 100 characters'
        });
    }

    next();
};

/**
 * Validate weekend work day data
 */
export const validateWeekendWorkDay = (req, res, next) => {
    const { dates } = req.body;

    if (!dates || dates.trim() === '') {
        return res.status(400).json({
            success: false,
            message: 'Dates are required'
        });
    }

    next();
};

/**
 * Validate suggestion data
 */
export const validateSuggestions = (req, res, next) => {
    const { holidays } = req.body;

    if (!holidays || !Array.isArray(holidays)) {
        return res.status(400).json({
            success: false,
            message: 'Holidays array is required'
        });
    }

    if (holidays.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'At least one holiday must be selected'
        });
    }

    // Validate each holiday has required fields
    const invalidHolidays = holidays.filter(h => !h.date || !h.name);

    if (invalidHolidays.length > 0) {
        return res.status(400).json({
            success: false,
            message: 'Each holiday must have date and name',
            invalidHolidays
        });
    }

    next();
};

/**
 * Validate year parameter
 */
export const validateYear = (req, res, next) => {
    const { year } = req.query;

    if (year) {
        const yearNum = parseInt(year);

        if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
            return res.status(400).json({
                success: false,
                message: 'Year must be between 2000 and 2100'
            });
        }
    }

    next();
};

/**
 * Validate country code
 */
export const validateCountryCode = (req, res, next) => {
    const { country } = req.query;

    if (country) {
        // Country code should be 2 letters
        if (!/^[A-Z]{2}$/.test(country)) {
            return res.status(400).json({
                success: false,
                message: 'Country code must be 2 uppercase letters (e.g., EG, US)'
            });
        }
    }

    next();
};

export default {
    validateDateFormat,
    validateCampus,
    validateHolidayData,
    validateWeekendWorkDay,
    validateSuggestions,
    validateYear,
    validateCountryCode
};
