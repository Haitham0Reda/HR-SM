/**
 * Holiday Model
 * 
 * Manages official holidays, weekend work days, and holiday settings
 */
import mongoose from 'mongoose';

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

// Static method to parse DD-MM-YYYY format
holidaySchema.statics.parseDate = function (dateString) {
    const parts = dateString.trim().split('-');
    if (parts.length !== 3) return null;

    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1; // Month is 0-indexed
    const year = parseInt(parts[2]);

    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    if (day < 1 || day > 31 || month < 0 || month > 11 || year < 1900 || year > 2100) return null;

    const date = new Date(year, month, day);

    // Validate the date is valid
    if (date.getDate() !== day || date.getMonth() !== month || date.getFullYear() !== year) {
        return null;
    }

    return date;
};

// Method to add official holiday
holidaySchema.methods.addOfficialHoliday = function (dateString, name, description = '') {
    const date = this.constructor.parseDate(dateString);
    if (!date) {
        throw new Error(`Invalid date format: ${dateString}. Use DD-MM-YYYY format.`);
    }

    // Check if already exists
    const exists = this.officialHolidays.some(h =>
        h.date.toDateString() === date.toDateString()
    );

    if (exists) {
        throw new Error(`Holiday already exists for date: ${dateString}`);
    }

    const dayOfWeek = this.constructor.getDayOfWeek(date);
    const isWeekend = this.constructor.isWeekend(date, this.weekendDays);

    this.officialHolidays.push({
        date,
        name: name || 'Official Holiday',
        dayOfWeek,
        isWeekend,
        description
    });

    // Sort by date
    this.officialHolidays.sort((a, b) => a.date - b.date);

    return this;
};

// Method to add multiple holidays from comma-separated string
holidaySchema.methods.addMultipleHolidays = function (dateString, name = 'Official Holiday') {
    const dates = dateString.split(',').map(d => d.trim()).filter(d => d);
    const added = [];
    const errors = [];

    dates.forEach(dateStr => {
        try {
            this.addOfficialHoliday(dateStr, name);
            added.push(dateStr);
        } catch (error) {
            errors.push({ date: dateStr, error: error.message });
        }
    });

    return { added, errors };
};

// Method to add weekend work day
holidaySchema.methods.addWeekendWorkDay = function (dateString, reason = '') {
    const date = this.constructor.parseDate(dateString);
    if (!date) {
        throw new Error(`Invalid date format: ${dateString}. Use DD-MM-YYYY format.`);
    }

    // Check if already exists
    const exists = this.weekendWorkDays.some(w =>
        w.date.toDateString() === date.toDateString()
    );

    if (exists) {
        throw new Error(`Weekend work day already exists for date: ${dateString}`);
    }

    const dayOfWeek = this.constructor.getDayOfWeek(date);

    this.weekendWorkDays.push({
        date,
        reason,
        dayOfWeek
    });

    // Sort by date
    this.weekendWorkDays.sort((a, b) => a.date - b.date);

    return this;
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
    return !this.constructor.isWeekend(checkDate, this.weekendDays);
};

// Static method to get or create holiday settings for tenant
holidaySchema.statics.getOrCreateForTenant = async function (tenantId) {
    let settings = await this.findOne({ tenantId: tenantId });

    if (!settings) {
        settings = await this.create({
            tenantId: tenantId,
            officialHolidays: [],
            weekendWorkDays: [],
            earlyLeaveDates: [],
            weekendDays: [5, 6] // Friday and Saturday
        });
    }

    return settings;
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

export default mongoose.model('Holiday', holidaySchema);
