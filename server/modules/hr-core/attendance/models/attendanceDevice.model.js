/**
 * Attendance Device Model - PostgreSQL (Sequelize)
 * 
 * This model represents the attendance_devices table in the Main Application Database (hrsm_platform).
 * It manages biometric and other attendance tracking devices with sync capabilities.
 * 
 * @module models/AttendanceDevice
 */

import { DataTypes, Op } from 'sequelize';
import { mainAppDb } from '../../../../config/database.js';
import Department from '../../users/models/department.model.js';
import User from '../../users/models/user.model.js';

const AttendanceDevice = mainAppDb.define('AttendanceDevice', {
  // Primary Key - UUID
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    comment: 'Unique identifier for the attendance device (UUID)'
  },

  // Tenant ID for multi-tenancy
  tenantId: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'tenant_id',
    comment: 'Tenant/Company identifier'
  },

  // Device Information
  deviceName: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'device_name',
    comment: 'Device name/identifier'
  },
  deviceType: {
    type: DataTypes.ENUM('zkteco', 'cloud', 'mobile', 'qr', 'csv', 'biometric-generic', 'manual'),
    allowNull: false,
    field: 'device_type',
    comment: 'Type of attendance device'
  },

  // Network Configuration
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: true,
    field: 'ip_address',
    validate: {
      isIP: true
    },
    comment: 'Device IP address (for network devices)'
  },
  port: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 65535
    },
    comment: 'Device port number'
  },

  // Authentication
  apiKey: {
    type: DataTypes.STRING(512),
    allowNull: true,
    field: 'api_key',
    comment: 'API key for device authentication'
  },
  token: {
    type: DataTypes.STRING(512),
    allowNull: true,
    comment: 'Authentication token'
  },
  apiUrl: {
    type: DataTypes.STRING(512),
    allowNull: true,
    field: 'api_url',
    comment: 'Device API endpoint URL'
  },

  // Status
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'error', 'syncing'),
    allowNull: false,
    defaultValue: 'inactive',
    comment: 'Current device status'
  },

  // Sync Information
  lastSync: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_sync',
    comment: 'Last successful sync timestamp'
  },
  lastSyncStatus: {
    type: DataTypes.ENUM('success', 'failed', 'partial'),
    allowNull: true,
    field: 'last_sync_status',
    comment: 'Status of last sync attempt'
  },
  lastSyncError: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'last_sync_error',
    comment: 'Error message from last failed sync'
  },
  syncInterval: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 5,
    field: 'sync_interval',
    comment: 'Sync interval in minutes'
  },
  autoSync: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'auto_sync',
    comment: 'Whether automatic sync is enabled'
  },

  // Device Configuration - stored as JSONB
  config: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
    comment: 'Device-specific configuration settings (JSONB)'
  },

  // Statistics - stored as JSONB
  stats: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      lastRecordCount: 0
    },
    comment: 'Device synchronization statistics (JSONB)'
  },

  // Department Mapping
  departments: {
    type: DataTypes.ARRAY(DataTypes.UUID),
    allowNull: false,
    defaultValue: [],
    comment: 'Array of department IDs associated with this device'
  },

  // Active Status
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active',
    comment: 'Whether the device is currently active'
  },

  // Audit Trail
  createdById: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'created_by_id',
    comment: 'User who created this device record'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Additional notes about the device'
  }
}, {
  tableName: 'attendance_devices',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',

  // Indexes for performance optimization
  indexes: [
    {
      name: 'idx_attendance_devices_tenant_id_device_name',
      fields: ['tenant_id', 'device_name'],
      unique: true
    },
    {
      name: 'idx_attendance_devices_tenant_id_device_type_status',
      fields: ['tenant_id', 'device_type', 'status']
    },
    {
      name: 'idx_attendance_devices_tenant_id_auto_sync_is_active',
      fields: ['tenant_id', 'auto_sync', 'is_active']
    },
    {
      name: 'idx_attendance_devices_tenant_id_last_sync',
      fields: ['tenant_id', 'last_sync']
    }
  ],

  // Named scopes
  scopes: {
    active: {
      where: { isActive: true, status: 'active' }
    },
    forSync: {
      where: {
        isActive: true,
        autoSync: true,
        status: { [Op.ne]: 'syncing' }
      }
    },
    byType: (deviceType) => {
      return {
        where: { deviceType }
      };
    },
    needsAttention: {
      where: {
        status: 'error'
      }
    }
  }
});

// Define associations
AttendanceDevice.belongsToMany(Department, {
  through: 'device_departments',
  foreignKey: 'deviceId',
  otherKey: 'departmentId',
  as: 'departmentList'
});

Department.belongsToMany(AttendanceDevice, {
  through: 'device_departments',
  foreignKey: 'departmentId',
  otherKey: 'deviceId',
  as: 'attendanceDevices'
});

AttendanceDevice.belongsTo(User, {
  foreignKey: 'createdById',
  as: 'createdBy'
});

// Instance Methods
AttendanceDevice.prototype.updateSyncStatus = async function(success, recordCount = 0, error = null) {
  this.lastSync = new Date();
  this.lastSyncStatus = success ? 'success' : 'failed';
  this.lastSyncError = error;
  this.stats.totalSyncs += 1;

  if (success) {
    this.stats.successfulSyncs += 1;
    this.stats.lastRecordCount = recordCount;
    this.status = 'active';
  } else {
    this.stats.failedSyncs += 1;
    this.status = 'error';
  }

  await this.save();
  return this;
};

AttendanceDevice.prototype.getSuccessRate = function() {
  if (this.stats.totalSyncs === 0) return 100;
  return (this.stats.successfulSyncs / this.stats.totalSyncs) * 100;
};

// Static Methods
AttendanceDevice.getDevicesForSync = async function(tenantId = null) {
  const where = {
    isActive: true,
    autoSync: true,
    status: { [Op.ne]: 'syncing' }
  };

  if (tenantId) {
    where.tenantId = tenantId;
  }

  return this.findAll({ where });
};

AttendanceDevice.getDeviceStats = async function(tenantId = null) {
  const where = tenantId ? { tenantId } : {};

  const devices = await this.findAll({ where });

  const stats = devices.reduce((acc, device) => {
    const type = device.deviceType;
    if (!acc[type]) {
      acc[type] = { total: 0, active: 0, inactive: 0, error: 0 };
    }

    acc[type].total += 1;
    if (device.status === 'active') acc[type].active += 1;
    else if (device.status === 'inactive') acc[type].inactive += 1;
    else if (device.status === 'error') acc[type].error += 1;

    return acc;
  }, {});

  return Object.entries(stats).map(([deviceType, data]) => ({
    deviceType,
    ...data
  }));
};

export default AttendanceDevice;







