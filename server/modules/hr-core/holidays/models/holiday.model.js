/**
 * Holiday Model
 * 
 * Manages official holidays, weekend work days, and holiday settings
 */
import { DataTypes } from 'sequelize';
import { mainAppDb } from '../../../../config/database.js';

const Holiday = mainAppDb.define('Holiday', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    tenantId: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'tenant_id',
        comment: 'Tenant identifier for multi-tenancy'
    },
    // Official Holidays stored as JSONB array
    officialHolidays: {
        type: DataTypes.JSONB,
        defaultValue: [],
        field: 'official_holidays',
        comment: 'Array of official holiday objects'
    },
    // Weekend Work Days stored as JSONB array
    weekendWorkDays: {
        type: DataTypes.JSONB,
        defaultValue: [],
        field: 'weekend_work_days',
        comment: 'Array of weekend work day objects'
    },
    // Early Leave Dates stored as JSONB array
    earlyLeaveDates: {
        type: DataTypes.JSONB,
        defaultValue: [],
        field: 'early_leave_dates',
        comment: 'Array of early leave date objects'
    },
    // Weekend Configuration
    weekendDays: {
        type: DataTypes.ARRAY(DataTypes.INTEGER),
        defaultValue: [5, 6], // Friday and Saturday for Egypt
        field: 'weekend_days',
        comment: '0 = Sunday, 6 = Saturday'
    },
    // Metadata
    lastModified: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'last_modified'
    },
    lastModifiedBy: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'last_modified_by',
        references: {
            model: 'users',
            key: 'id'
        }
    }
}, {
    tableName: 'holidays',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            fields: ['tenant_id']
        }
    ]
});

// Static method to get day of week
Holiday.getDayOfWeek = function (date) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date(date).getDay()];
};

// Static method to check if date is weekend
Holiday.isWeekend = function (date, weekendDays = [5, 6]) {
    const dayOfWeek = new Date(date).getDay();
    return weekendDays.includes(dayOfWeek);
};

// Static method to parse DD-MM-YYYY format
Holiday.parseDate = function (dateString) {
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

// Instance method to add official holiday
Holiday.prototype.addOfficialHoliday = function (dateString, name, description = '') {
    const date = Holiday.parseDate(dateString);
    if (!date) {
        throw new Error(`Invalid date format: ${dateString}. Use DD-MM-YYYY format.`);
    }

    const holidays = this.officialHolidays || [];
    
    // Check if already exists
    const exists = holidays.some(h =>
        new Date(h.date).toDateString() === date.toDateString()
    );

    if (exists) {
        throw new Error(`Holiday already exists for date: ${dateString}`);
    }

    const dayOfWeek = Holiday.getDayOfWeek(date);
    const isWeekend = Holiday.isWeekend(date, this.weekendDays);

    holidays.push({
        date: date.toISOString(),
        name: name || 'Official Holiday',
        dayOfWeek,
        isWeekend,
        description
    });

    // Sort by date
    holidays.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    this.officialHolidays = holidays;
    return this;
};

// Instance method to add multiple holidays
Holiday.prototype.addMultipleHolidays = function (dateString, name = 'Official Holiday') {
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

// Instance method to add weekend work day
Holiday.prototype.addWeekendWorkDay = function (dateString, reason = '') {
    const date = Holiday.parseDate(dateString);
    if (!date) {
        throw new Error(`Invalid date format: ${dateString}. Use DD-MM-YYYY format.`);
    }

    const workDays = this.weekendWorkDays || [];
    
    // Check if already exists
    const exists = workDays.some(w =>
        new Date(w.date).toDateString() === date.toDateString()
    );

    if (exists) {
        throw new Error(`Weekend work day already exists for date: ${dateString}`);
    }

    const dayOfWeek = Holiday.getDayOfWeek(date);

    workDays.push({
        date: date.toISOString(),
        reason,
        dayOfWeek
    });

    // Sort by date
    workDays.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    this.weekendWorkDays = workDays;
    return this;
};

// Instance method to check if date is holiday
Holiday.prototype.isHoliday = function (date) {
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    const holidays = this.officialHolidays || [];
    return holidays.some(h => {
        const holidayDate = new Date(h.date);
        holidayDate.setHours(0, 0, 0, 0);
        return holidayDate.getTime() === checkDate.getTime();
    });
};

// Instance method to check if date is weekend work day
Holiday.prototype.isWeekendWorkDay = function (date) {
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    const workDays = this.weekendWorkDays || [];
    return workDays.some(w => {
        const workDate = new Date(w.date);
        workDate.setHours(0, 0, 0, 0);
        return workDate.getTime() === checkDate.getTime();
    });
};

// Instance method to check if date is working day
Holiday.prototype.isWorkingDay = function (date) {
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
    return !Holiday.isWeekend(checkDate, this.weekendDays);
};

// Static method to get or create holiday settings for tenant
Holiday.getOrCreateForTenant = async function (tenantId) {
    let settings = await this.findOne({ where: { tenantId } });

    if (!settings) {
        settings = await this.create({
            tenantId,
            officialHolidays: [],
            weekendWorkDays: [],
            earlyLeaveDates: [],
            weekendDays: [5, 6] // Friday and Saturday
        });
    }

    return settings;
};

// Static method to identify Islamic holidays
Holiday.isIslamicHoliday = function (name) {
    const islamicKeywords = [
        'eid', 'ramadan', 'muharram', 'hijri', 'islamic',
        'mawlid', 'ashura', 'laylat', 'rajab', 'sha\'ban',
        'fitr', 'adha', 'prophet', 'muhammad', 'maulid'
    ];

    const lowerName = name.toLowerCase();
    return islamicKeywords.some(keyword => lowerName.includes(keyword));
};

// Define associations
Holiday.associate = (models) => {
    Holiday.belongsTo(models.User, {
        foreignKey: 'lastModifiedBy',
        as: 'modifier'
    });
};

export default Holiday;
