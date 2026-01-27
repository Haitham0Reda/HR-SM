// Holiday Controller
import { getHolidayInfo, getHolidaysForYear, isWorkingDay } from '../utils/holidayChecker.js';
import mongoose from 'mongoose';
import multiTenantDB from '../../../../config/multiTenant.js';

/**
 * Get Holiday model for tenant-specific database
 */
const getHolidayModel = async (tenantId) => {
    const connection = await multiTenantDB.getCompanyConnection(tenantId);
    
    // Check if model is already registered
    if (connection.models.Holiday) {
        return connection.models.Holiday;
    }

    // Define Holiday schema
    const holidaySchema = new mongoose.Schema({
        // Tenant identifier for multi-tenant support
        tenantId: {
            type: String,
            required: true,
            index: true
        },

        // Official Holidays
        officialHolidays: [{
            date: {
                type: Date,
                required: true
            },
            name: String,
            dayOfWeek: String,
            isWeekend: {
                type: Boolean,
                default: false
            },
            isIslamic: {
                type: Boolean,
                default: false
            },
            description: String
        }],

        // Weekend Work Days (makeup days)
        weekendWorkDays: [{
            date: {
                type: Date,
                required: true
            },
            reason: String,
            dayOfWeek: String
        }],

        // Early Leave Dates
        earlyLeaveDates: [{
            date: {
                type: Date,
                required: true
            },
            reason: String,
            earlyLeaveTime: String, // HH:mm format
            dayOfWeek: String
        }],

        // Weekend Configuration
        weekendDays: {
            type: [Number], // 0 = Sunday, 6 = Saturday
            default: [5, 6] // Friday and Saturday for Egypt
        },

        // Metadata
        lastModified: {
            type: Date,
            default: Date.now
        },
        lastModifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }, {
        timestamps: true
    });

    // Indexes
    holidaySchema.index({ tenantId: 1 });
    holidaySchema.index({ 'officialHolidays.date': 1 });
    holidaySchema.index({ 'weekendWorkDays.date': 1 });

    // Static method to get day of week
    holidaySchema.statics.getDayOfWeek = function (date) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[new Date(date).getDay()];
    };

    // Static method to check if date is weekend
    holidaySchema.statics.isWeekend = function (date, weekendDays = [5, 6]) {
        const dayOfWeek = new Date(date).getDay();
        return weekendDays.includes(dayOfWeek);
    };

    // Static method to identify Islamic holidays
    holidaySchema.statics.isIslamicHoliday = function (name) {
        const islamicKeywords = [
            'eid', 'ramadan', 'muharram', 'hijri', 'islamic',
            'mawlid', 'ashura', 'laylat', 'rajab', 'sha\'ban',
            'fitr', 'adha', 'prophet', 'muhammad', 'maulid'
        ];

        const lowerName = name.toLowerCase();
        return islamicKeywords.some(keyword => lowerName.includes(keyword));
    };

    // Method to check if date is holiday
    holidaySchema.methods.isHoliday = function (date) {
        const checkDate = new Date(date);
        checkDate.setHours(0, 0, 0, 0);

        return this.officialHolidays.some(h => {
            const holidayDate = new Date(h.date);
            holidayDate.setHours(0, 0, 0, 0);
            return holidayDate.getTime() === checkDate.getTime();
        });
    };

    // Method to check if date is weekend work day
    holidaySchema.methods.isWeekendWorkDay = function (date) {
        const checkDate = new Date(date);
        checkDate.setHours(0, 0, 0, 0);

        return this.weekendWorkDays.some(w => {
            const workDate = new Date(w.date);
            workDate.setHours(0, 0, 0, 0);
            return workDate.getTime() === checkDate.getTime();
        });
    };

    // Method to check if date is working day
    holidaySchema.methods.isWorkingDay = function (date) {
        const checkDate = new Date(date);

        // If it's a holiday, it's not a working day
        if (this.isHoliday(checkDate)) {
            return false;
        }

        // If it's a weekend work day, it IS a working day
        if (this.isWeekendWorkDay(checkDate)) {
            return true;
        }

        // Check if it's a regular weekend
        const HolidayModel = this.constructor;
        return !HolidayModel.isWeekend(checkDate, this.weekendDays);
    };

    return connection.model('Holiday', holidaySchema);
};

/**
 * Get or create holiday settings for tenant
 */
const getOrCreateForTenant = async (tenantId) => {
    const Holiday = await getHolidayModel(tenantId);
    let settings = await Holiday.findOne({ tenantId: tenantId });

    if (!settings) {
        settings = await Holiday.create({
            tenantId: tenantId,
            officialHolidays: [],
            weekendWorkDays: [],
            earlyLeaveDates: [],
            weekendDays: [5, 6] // Friday and Saturday
        });
    }

    return settings;
};

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

        // Get tenant ID
        const tenantId = req.tenantId || req.user?.tenantId;
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant ID is required' });
        }

        // Get or create holiday settings for tenant using tenant-specific database
        const Holiday = await getHolidayModel(tenantId);
        const holidaySettings = await getOrCreateForTenant(tenantId);

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

        console.log(`✅ Imported ${imported} holidays to tenant database: ${tenantId}`);

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
        // Get tenant ID
        const tenantId = req.tenantId || req.user?.tenantId;
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant ID is required' });
        }

        // Get or create holiday settings for tenant
        const holidaySettings = await getOrCreateForTenant(tenantId);

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

        // Get tenant ID
        const tenantId = req.tenantId || req.user?.tenantId;
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant ID is required' });
        }

        // Get or create holiday settings for tenant
        const Holiday = await getHolidayModel(tenantId);
        const holidaySettings = await getOrCreateForTenant(tenantId);

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

        // Get tenant ID
        const tenantId = req.tenantId || req.user?.tenantId;
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant ID is required' });
        }

        // Get or create holiday settings for tenant
        const Holiday = await getHolidayModel(tenantId);
        const holidaySettings = await getOrCreateForTenant(tenantId);

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

        // Get tenant ID
        const tenantId = req.tenantId || req.user?.tenantId;
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant ID is required' });
        }

        // Get or create holiday settings for tenant
        const holidaySettings = await getOrCreateForTenant(tenantId);

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

        // Get tenant ID
        const tenantId = req.tenantId || req.user?.tenantId;
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant ID is required' });
        }

        // Get or create holiday settings for tenant
        const Holiday = await getHolidayModel(tenantId);
        const holidaySettings = await getOrCreateForTenant(tenantId);

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

        // Get tenant ID
        const tenantId = req.tenantId || req.user?.tenantId;
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant ID is required' });
        }

        // Get or create holiday settings for tenant
        const holidaySettings = await getOrCreateForTenant(tenantId);

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
        
        // Get tenant ID
        const tenantId = req.tenantId || req.user?.tenantId;
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant ID is required' });
        }

        // Get existing holidays to filter out duplicates
        const holidaySettings = await getOrCreateForTenant(tenantId);
        
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

        // Get tenant ID
        const tenantId = req.tenantId || req.user?.tenantId;
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant ID is required' });
        }

        // Get holiday settings for tenant
        const Holiday = await getHolidayModel(tenantId);
        const holidaySettings = await getOrCreateForTenant(tenantId);
        
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
