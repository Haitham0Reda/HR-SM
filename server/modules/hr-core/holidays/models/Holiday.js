/**
 * Holiday Model - PostgreSQL (Sequelize)
 * 
 * Manages official holidays and weekend configurations.
 * Supports multiple locations and custom weekend work days.
 * 
 * @module models/Holiday
 */

import { DataTypes, Op } from 'sequelize';
import { mainAppDb } from '../../../../config/database.js';

const Holiday = mainAppDb.define('Holiday', {
  // Primary Key - UUID
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    comment: 'Unique identifier for the holiday configuration (UUID)'
  },

  // Tenant ID for multi-tenancy
  tenantId: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'tenant_id',
    comment: 'Tenant/Company identifier'
  },

  // Location
  location: {
    type: DataTypes.STRING(100),
    allowNull: false,
    defaultValue: 'default',
    comment: 'Location identifier'
  },

  // Official Holidays - stored as JSONB
  officialHolidays: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
    field: 'official_holidays',
    comment: 'Array of official holiday objects'
  },

  // Weekend Work Days - stored as JSONB
  weekendWorkDays: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
    field: 'weekend_work_days',
    comment: 'Array of weekend work day objects'
  },

  // Weekend Days (day of week numbers: 0=Sunday, 6=Saturday)
  weekendDays: {
    type: DataTypes.ARRAY(DataTypes.INTEGER),
    allowNull: false,
    defaultValue: [5, 6], // Friday and Saturday
    field: 'weekend_days',
    comment: 'Array of weekend day numbers (0=Sunday, 6=Saturday)'
  }
}, {
  tableName: 'holidays',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',

  // Indexes for performance optimization
  indexes: [
    {
      name: 'idx_holidays_tenant_id_location',
      fields: ['tenant_id', 'location'],
      unique: true
    },
    {
      name: 'idx_holidays_tenant_id',
      fields: ['tenant_id']
    }
  ]
});

// Instance Methods
Holiday.prototype.addOfficialHoliday = async function(date, name, description = null) {
  const holidays = [...this.officialHolidays];
  const dateObj = new Date(date);
  
  holidays.push({
    date: dateObj,
    name,
    dayOfWeek: dateObj.toLocaleDateString('en-US', { weekday: 'long' }),
    isWeekend: this.weekendDays.includes(dateObj.getDay()),
    description
  });
  
  this.officialHolidays = holidays;
  return await this.save();
};

Holiday.prototype.removeOfficialHoliday = async function(date) {
  const dateStr = new Date(date).toISOString().split('T')[0];
  this.officialHolidays = this.officialHolidays.filter(h => {
    const hDateStr = new Date(h.date).toISOString().split('T')[0];
    return hDateStr !== dateStr;
  });
  return await this.save();
};

Holiday.prototype.addWeekendWorkDay = async function(date, reason = null) {
  const workDays = [...this.weekendWorkDays];
  workDays.push({
    date: new Date(date),
    reason
  });
  this.weekendWorkDays = workDays;
  return await this.save();
};

Holiday.prototype.isHoliday = function(date) {
  const dateStr = new Date(date).toISOString().split('T')[0];
  return this.officialHolidays.some(h => {
    const hDateStr = new Date(h.date).toISOString().split('T')[0];
    return hDateStr === dateStr;
  });
};

Holiday.prototype.isWeekend = function(date) {
  const dayOfWeek = new Date(date).getDay();
  return this.weekendDays.includes(dayOfWeek);
};

Holiday.prototype.isWeekendWorkDay = function(date) {
  const dateStr = new Date(date).toISOString().split('T')[0];
  return this.weekendWorkDays.some(w => {
    const wDateStr = new Date(w.date).toISOString().split('T')[0];
    return wDateStr === dateStr;
  });
};

Holiday.prototype.isWorkingDay = function(date) {
  // Not a holiday and (not a weekend OR is a weekend work day)
  return !this.isHoliday(date) && (!this.isWeekend(date) || this.isWeekendWorkDay(date));
};

// Static Methods
Holiday.getByTenantAndLocation = function(tenantId, location = 'default') {
  return this.findOne({
    where: { tenantId, location }
  });
};

Holiday.getOrCreate = async function(tenantId, location = 'default') {
  const [holiday] = await this.findOrCreate({
    where: { tenantId, location },
    defaults: {
      tenantId,
      location,
      officialHolidays: [],
      weekendWorkDays: [],
      weekendDays: [5, 6]
    }
  });
  return holiday;
};

Holiday.getHolidaysInRange = async function(tenantId, startDate, endDate, location = 'default') {
  const holiday = await this.findOne({
    where: { tenantId, location }
  });

  if (!holiday) return [];

  const start = new Date(startDate);
  const end = new Date(endDate);

  return holiday.officialHolidays.filter(h => {
    const hDate = new Date(h.date);
    return hDate >= start && hDate <= end;
  });
};

export default Holiday;
