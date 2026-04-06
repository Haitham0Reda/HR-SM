import { DataTypes } from 'sequelize';
import sequelize from '../../../config/database.js';

/**
 * Report Configuration Model
 * 
 * Manages reporting settings including HR month configuration and date range utilities.
 * HR Month typically runs from day 21 of current month to day 20 of next month,
 * aligning with payroll cycles.
 * 
 * CRITICAL: All records must have tenant_id for multi-tenancy isolation
 */

const ReportConfig = sequelize.define('ReportConfig', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // Tenant isolation - REQUIRED
  tenant_id: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'tenant_id'
  },
  
  // Organization/location reference
  organization: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'default'
  },
  
  // HR Month Configuration (JSONB)
  hr_month: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {
      startDay: 21,
      endDay: 20,
      isDefault: true,
      label: 'HR Month'
    },
    field: 'hr_month'
    // Structure: { startDay, endDay, isDefault, label }
  },
  
  // Payroll cycle configuration (JSONB)
  payroll_cycle: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: { type: 'monthly' },
    field: 'payroll_cycle'
    // Structure: { type, cycleStartDate, customCycleDays }
  },
  
  // Working days configuration (JSONB)
  working_days: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {
      daysOfWeek: [0, 1, 2, 3, 4],
      weekendDays: [5, 6]
    },
    field: 'working_days'
    // Structure: { daysOfWeek: [], weekendDays: [] }
  },
  
  // Official holidays (JSONB array)
  holidays: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: []
    // Structure: [{ name, date, isRecurring, month, day }]
  },
  
  // Report settings (JSONB)
  report_settings: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {
      defaultRangeType: 'hr-month',
      timezone: 'UTC',
      includeWeekends: true,
      includeHolidays: true
    },
    field: 'report_settings'
    // Structure: { defaultRangeType, customStartDate, customEndDate, timezone, includeWeekends, includeHolidays }
  },
  
  // Active status
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active'
  }
}, {
  tableName: 'report_configs',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['tenant_id', 'organization', 'is_active']
    },
    {
      fields: ['tenant_id']
    },
    {
      fields: ['organization']
    }
  ]
});

// Instance methods
ReportConfig.prototype.calculateHRMonth = function(offset = 0) {
  const today = new Date();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  let startMonth, startYear, endMonth, endYear;
  
  // Determine which HR month we're in
  if (currentDay >= this.hr_month.startDay) {
    startMonth = currentMonth;
    startYear = currentYear;
  } else {
    startMonth = currentMonth - 1;
    startYear = currentYear;
    if (startMonth < 0) {
      startMonth = 11;
      startYear -= 1;
    }
  }
  
  // Apply offset
  startMonth += offset;
  while (startMonth < 0) {
    startMonth += 12;
    startYear -= 1;
  }
  while (startMonth > 11) {
    startMonth -= 12;
    startYear += 1;
  }
  
  // Calculate end month (next month)
  endMonth = startMonth + 1;
  endYear = startYear;
  if (endMonth > 11) {
    endMonth = 0;
    endYear += 1;
  }
  
  const startDate = new Date(startYear, startMonth, this.hr_month.startDay, 0, 0, 0, 0);
  const endDate = new Date(endYear, endMonth, this.hr_month.endDay, 23, 59, 59, 999);
  
  return {
    startDate,
    endDate,
    label: `${this.hr_month.label} (${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()})`
  };
};

ReportConfig.prototype.calculateCurrentMonth = function() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  
  const startDate = new Date(year, month, 1, 0, 0, 0, 0);
  const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
  
  return {
    startDate,
    endDate,
    label: `Current Month (${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()})`
  };
};

ReportConfig.prototype.calculatePreviousMonth = function() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  
  const prevMonth = month - 1;
  const prevYear = prevMonth < 0 ? year - 1 : year;
  const adjustedMonth = prevMonth < 0 ? 11 : prevMonth;
  
  const startDate = new Date(prevYear, adjustedMonth, 1, 0, 0, 0, 0);
  const endDate = new Date(prevYear, adjustedMonth + 1, 0, 23, 59, 59, 999);
  
  return {
    startDate,
    endDate,
    label: `Previous Month (${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()})`
  };
};

ReportConfig.prototype.getDateRange = function(rangeType, customStart = null, customEnd = null) {
  switch (rangeType) {
    case 'hr-month':
      return this.calculateHRMonth();
    case 'current-month':
      return this.calculateCurrentMonth();
    case 'previous-month':
      return this.calculatePreviousMonth();
    case 'custom':
      if (!customStart || !customEnd) {
        throw new Error('Custom range requires both start and end dates');
      }
      if (new Date(customStart) > new Date(customEnd)) {
        throw new Error('Start date must be before end date');
      }
      return {
        startDate: new Date(customStart),
        endDate: new Date(customEnd),
        label: `Custom Range (${new Date(customStart).toLocaleDateString()} - ${new Date(customEnd).toLocaleDateString()})`
      };
    default:
      return this.calculateHRMonth();
  }
};

ReportConfig.prototype.calculateWorkingDays = function(startDate, endDate) {
  let workingDays = 0;
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    
    if (this.working_days.daysOfWeek.includes(dayOfWeek)) {
      const isHoliday = this.holidays.some(holiday => {
        if (holiday.isRecurring) {
          return holiday.month === current.getMonth() + 1 && holiday.day === current.getDate();
        } else {
          const holidayDate = new Date(holiday.date);
          return holidayDate.toDateString() === current.toDateString();
        }
      });
      
      if (!isHoliday) {
        workingDays++;
      }
    }
    
    current.setDate(current.getDate() + 1);
  }
  
  return workingDays;
};

ReportConfig.prototype.isWorkingDay = function(date) {
  const dayOfWeek = date.getDay();
  
  if (!this.working_days.daysOfWeek.includes(dayOfWeek)) {
    return false;
  }
  
  const isHoliday = this.holidays.some(holiday => {
    if (holiday.isRecurring) {
      return holiday.month === date.getMonth() + 1 && holiday.day === date.getDate();
    } else {
      const holidayDate = new Date(holiday.date);
      return holidayDate.toDateString() === date.toDateString();
    }
  });
  
  return !isHoliday;
};

// Static methods
ReportConfig.getConfig = async function(tenantId, organization = 'default') {
  let config = await this.findOne({
    where: {
      tenant_id: tenantId,
      organization,
      is_active: true
    }
  });
  
  if (!config) {
    config = await this.create({
      tenant_id: tenantId,
      organization
    });
  }
  
  return config;
};

ReportConfig.getHRMonthRange = async function(tenantId, organization = 'default', offset = 0) {
  const config = await this.getConfig(tenantId, organization);
  return config.calculateHRMonth(offset);
};

ReportConfig.withTenant = function(tenantId) {
  return this.findAll({
    where: { tenant_id: tenantId }
  });
};

export default ReportConfig;
