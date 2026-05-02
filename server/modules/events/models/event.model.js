/**
 * Event Model - PostgreSQL (Sequelize)
 * 
 * This model represents the events table in the Main Application Database (hrsm_platform).
 * It manages company events with attendee tracking and scheduling.
 * 
 * @module models/Event
 */

import { DataTypes, Op } from 'sequelize';
import { mainAppDb } from '../../../config/database.js';
import User from '../../hr-core/users/models/user.model.js';

const Event = mainAppDb.define('Event', {
  // Primary Key - UUID
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    comment: 'Unique identifier for the event (UUID)'
  },

  // Tenant ID for multi-tenancy
  tenantId: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'tenant_id',
    comment: 'Tenant/Company identifier'
  },

  // Event Information
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Event title'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Event description'
  },
  location: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Event location'
  },

  // Date and Time
  startDate: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'start_date',
    comment: 'Event start date and time'
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'end_date',
    comment: 'Event end date and time'
  },

  // Organizer
  createdById: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'created_by_id',
    comment: 'User who created the event'
  },

  // Attendees - stored as JSONB array of user IDs
  attendees: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
    comment: 'Array of attendee user IDs (JSONB)'
  },

  // Visibility
  isPublic: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_public',
    comment: 'Whether the event is public to all employees'
  }
}, {
  tableName: 'events',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',

  // Indexes for performance optimization
  indexes: [
    {
      name: 'idx_events_tenant_id_start_date',
      fields: ['tenant_id', 'start_date']
    },
    {
      name: 'idx_events_tenant_id_created_by_id',
      fields: ['tenant_id', 'created_by_id']
    },
    {
      name: 'idx_events_tenant_id_is_public',
      fields: ['tenant_id', 'is_public']
    },
    {
      name: 'idx_events_tenant_id_end_date',
      fields: ['tenant_id', 'end_date']
    }
  ],

  // Named scopes
  scopes: {
    upcoming: {
      where: {
        startDate: {
          [Op.gte]: new Date()
        }
      },
      order: [['startDate', 'ASC']]
    },
    past: {
      where: {
        endDate: {
          [Op.lt]: new Date()
        }
      },
      order: [['startDate', 'DESC']]
    },
    public: {
      where: { isPublic: true }
    },
    byCreator: (userId) => {
      return {
        where: { createdById: userId }
      };
    }
  }
});

// Define associations
Event.belongsTo(User, {
  foreignKey: 'createdById',
  as: 'creator'
});

User.hasMany(Event, {
  foreignKey: 'createdById',
  as: 'createdEvents'
});

// Instance Methods
Event.prototype.isOngoing = function() {
  const now = new Date();
  return this.startDate <= now && this.endDate >= now;
};

Event.prototype.isUpcoming = function() {
  return this.startDate > new Date();
};

Event.prototype.hasAttendee = function(userId) {
  return this.attendees.includes(userId);
};

Event.prototype.addAttendee = async function(userId) {
  if (!this.hasAttendee(userId)) {
    this.attendees.push(userId);
    await this.save();
  }
};

Event.prototype.removeAttendee = async function(userId) {
  this.attendees = this.attendees.filter(id => id !== userId);
  await this.save();
};

Event.prototype.getDuration = function() {
  const diffTime = Math.abs(this.endDate - this.startDate);
  return Math.ceil(diffTime / (1000 * 60 * 60)); // Duration in hours
};

// Static Methods
Event.findUpcoming = async function(tenantId, limit = 10) {
  return this.findAll({
    where: {
      tenantId,
      startDate: {
        [Op.gte]: new Date()
      }
    },
    order: [['startDate', 'ASC']],
    limit
  });
};

Event.findByDateRange = async function(tenantId, startDate, endDate) {
  return this.findAll({
    where: {
      tenantId,
      startDate: {
        [Op.gte]: startDate,
        [Op.lte]: endDate
      }
    },
    order: [['startDate', 'ASC']]
  });
};

export default Event;




