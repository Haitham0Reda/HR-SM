/**
 * Request Control Model
 * 
 * Manages system-wide and individual request type controls.
 * Allows HR and Admin to enable/disable request submissions with custom messages.
 * 
 * Features:
 * - System-wide request control (enable/disable all)
 * - Individual request type controls
 * - Custom disabled messages per request type
 * - Admin-only access control
 * - Schedule-based controls (optional)
 * - Audit trail of control changes
 */
import { DataTypes, Op } from 'sequelize';
import { mainAppDb } from '../../../../config/database.js';

const RequestControl = mainAppDb.define('RequestControl', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },

    // Tenant ID for multi-tenancy
    tenantId: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'tenant_id'
    },

    // Organization/location reference
    organization: {
        type: DataTypes.STRING,
        defaultValue: 'default'
    },

    // System-wide control
    systemWide: {
        type: DataTypes.JSONB,
        defaultValue: {
            enabled: true,
            disabledMessage: 'Request submissions are currently disabled. Please contact HR for more information.'
        },
        field: 'system_wide'
        // Structure: { enabled, disabledMessage, disabledBy, disabledAt, enabledBy, enabledAt, reason }
    },

    // Vacation requests control (Annual and Casual leave)
    vacationRequests: {
        type: DataTypes.JSONB,
        defaultValue: {
            enabled: true,
            disabledMessage: 'Vacation requests are currently disabled. Please try again later.',
            leaveTypes: {
                annual: { enabled: true },
                casual: { enabled: true }
            }
        },
        field: 'vacation_requests'
        // Structure: { enabled, disabledMessage, disabledBy, disabledAt, enabledBy, enabledAt, reason, leaveTypes }
    },

    // Permission requests control (Late arrival, Early departure, Overtime)
    permissionRequests: {
        type: DataTypes.JSONB,
        defaultValue: {
            enabled: true,
            disabledMessage: 'Permission requests are currently disabled. Please contact your supervisor.',
            permissionTypes: {
                'late-arrival': { enabled: true },
                'early-departure': { enabled: true },
                'overtime': { enabled: true }
            }
        },
        field: 'permission_requests'
        // Structure: { enabled, disabledMessage, disabledBy, disabledAt, enabledBy, enabledAt, reason, permissionTypes }
    },

    // Sick leave requests control
    sickLeave: {
        type: DataTypes.JSONB,
        defaultValue: {
            enabled: true,
            disabledMessage: 'Sick leave requests are currently disabled. For urgent medical situations, please contact HR directly.'
        },
        field: 'sick_leave'
        // Structure: { enabled, disabledMessage, disabledBy, disabledAt, enabledBy, enabledAt, reason }
    },

    // Mission requests control
    missionRequests: {
        type: DataTypes.JSONB,
        defaultValue: {
            enabled: true,
            disabledMessage: 'Mission requests are currently disabled. Please contact HR for assistance.'
        },
        field: 'mission_requests'
        // Structure: { enabled, disabledMessage, disabledBy, disabledAt, enabledBy, enabledAt, reason }
    },

    // Forgot check-in/out requests control
    forgotCheck: {
        type: DataTypes.JSONB,
        defaultValue: {
            enabled: true,
            disabledMessage: 'Forgot check-in/out corrections are currently disabled. Please submit a formal request to HR.'
        },
        field: 'forgot_check'
        // Structure: { enabled, disabledMessage, disabledBy, disabledAt, enabledBy, enabledAt, reason }
    },

    // Other leave types control
    otherLeaveTypes: {
        type: DataTypes.JSONB,
        defaultValue: {
            emergency: { enabled: true },
            maternity: { enabled: true },
            paternity: { enabled: true },
            unpaid: { enabled: true }
        },
        field: 'other_leave_types'
        // Structure: { emergency, maternity, paternity, unpaid } - each with { enabled, disabledMessage, disabledBy, disabledAt }
    },

    // Scheduled control (optional - for planned maintenance or blackout periods)
    scheduledControl: {
        type: DataTypes.JSONB,
        defaultValue: {
            enabled: false,
            schedules: []
        },
        field: 'scheduled_control'
        // Structure: { enabled, schedules: [{ startDate, endDate, affectedTypes, message, reason, createdBy }] }
    },

    // Change history/audit trail
    changeHistory: {
        type: DataTypes.JSONB,
        defaultValue: [],
        field: 'change_history'
        // Structure: [{ changedAt, changedBy, requestType, action, previousState, newState, reason, message }]
    },

    // Active status
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'is_active'
    }
}, {
    tableName: 'request_controls',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            fields: ['tenant_id', 'organization', 'is_active'],
            unique: true
        },
        {
            fields: ['tenant_id']
        },
        {
            fields: ['organization']
        }
    ]
});

// Virtual Properties

/**
 * Check if any request type is disabled
 */
RequestControl.prototype.getHasDisabledRequests = function () {
    return !this.systemWide.enabled ||
        !this.vacationRequests.enabled ||
        !this.permissionRequests.enabled ||
        !this.sickLeave.enabled ||
        !this.missionRequests.enabled ||
        !this.forgotCheck.enabled;
};

/**
 * Get count of disabled request types
 */
RequestControl.prototype.getDisabledCount = function () {
    let count = 0;
    if (!this.vacationRequests.enabled) count++;
    if (!this.permissionRequests.enabled) count++;
    if (!this.sickLeave.enabled) count++;
    if (!this.missionRequests.enabled) count++;
    if (!this.forgotCheck.enabled) count++;
    return count;
};

// Instance Methods

/**
 * Disable system-wide requests
 * @param {String} userId - User making the change
 * @param {String} message - Custom message
 * @param {String} reason - Reason for disabling
 * @returns {Promise<RequestControl>}
 */
RequestControl.prototype.disableSystemWide = async function (userId, message = null, reason = '') {
    const previousState = this.systemWide.enabled;

    this.systemWide = {
        ...this.systemWide,
        enabled: false,
        disabledBy: userId,
        disabledAt: new Date(),
        reason
    };

    if (message) {
        this.systemWide.disabledMessage = message;
    }

    // Log change
    const history = this.changeHistory || [];
    history.push({
        changedAt: new Date(),
        changedBy: userId,
        requestType: 'system-wide',
        action: 'disabled',
        previousState,
        newState: false,
        reason,
        message: message || this.systemWide.disabledMessage
    });
    this.changeHistory = history;

    this.changed('systemWide', true);
    this.changed('changeHistory', true);
    return await this.save();
};

/**
 * Enable system-wide requests
 * @param {String} userId - User making the change
 * @param {String} reason - Reason for enabling
 * @returns {Promise<RequestControl>}
 */
RequestControl.prototype.enableSystemWide = async function (userId, reason = '') {
    const previousState = this.systemWide.enabled;

    this.systemWide = {
        ...this.systemWide,
        enabled: true,
        enabledBy: userId,
        enabledAt: new Date(),
        reason
    };

    // Log change
    const history = this.changeHistory || [];
    history.push({
        changedAt: new Date(),
        changedBy: userId,
        requestType: 'system-wide',
        action: 'enabled',
        previousState,
        newState: true,
        reason
    });
    this.changeHistory = history;

    this.changed('systemWide', true);
    this.changed('changeHistory', true);
    return await this.save();
};

/**
 * Disable specific request type
 * @param {String} requestType - Type of request to disable
 * @param {String} userId - User making the change
 * @param {String} message - Custom message
 * @param {String} reason - Reason for disabling
 * @returns {Promise<RequestControl>}
 */
RequestControl.prototype.disableRequestType = async function (requestType, userId, message = null, reason = '') {
    const typeMap = {
        'vacation': 'vacationRequests',
        'permission': 'permissionRequests',
        'sick-leave': 'sickLeave',
        'mission': 'missionRequests',
        'forgot-check': 'forgotCheck'
    };

    const field = typeMap[requestType];
    if (!field) {
        throw new Error(`Invalid request type: ${requestType}`);
    }

    const previousState = this[field].enabled;

    this[field] = {
        ...this[field],
        enabled: false,
        disabledBy: userId,
        disabledAt: new Date(),
        reason
    };

    if (message) {
        this[field].disabledMessage = message;
    }

    // Log change
    const history = this.changeHistory || [];
    history.push({
        changedAt: new Date(),
        changedBy: userId,
        requestType,
        action: 'disabled',
        previousState,
        newState: false,
        reason,
        message: message || this[field].disabledMessage
    });
    this.changeHistory = history;

    this.changed(field, true);
    this.changed('changeHistory', true);
    return await this.save();
};

/**
 * Enable specific request type
 * @param {String} requestType - Type of request to enable
 * @param {String} userId - User making the change
 * @param {String} reason - Reason for enabling
 * @returns {Promise<RequestControl>}
 */
RequestControl.prototype.enableRequestType = async function (requestType, userId, reason = '') {
    const typeMap = {
        'vacation': 'vacationRequests',
        'permission': 'permissionRequests',
        'sick-leave': 'sickLeave',
        'mission': 'missionRequests',
        'forgot-check': 'forgotCheck'
    };

    const field = typeMap[requestType];
    if (!field) {
        throw new Error(`Invalid request type: ${requestType}`);
    }

    const previousState = this[field].enabled;

    this[field] = {
        ...this[field],
        enabled: true,
        enabledBy: userId,
        enabledAt: new Date(),
        reason
    };

    // Log change
    const history = this.changeHistory || [];
    history.push({
        changedAt: new Date(),
        changedBy: userId,
        requestType,
        action: 'enabled',
        previousState,
        newState: true,
        reason
    });
    this.changeHistory = history;

    this.changed(field, true);
    this.changed('changeHistory', true);
    return await this.save();
};

/**
 * Check if a specific request type is allowed
 * @param {String} requestType - Type of request to check
 * @param {String} subType - Optional sub-type (e.g., 'annual', 'late-arrival')
 * @returns {Object} { allowed: Boolean, message: String }
 */
RequestControl.prototype.isRequestAllowed = function (requestType, subType = null) {
    // Check system-wide first
    if (!this.systemWide.enabled) {
        return {
            allowed: false,
            message: this.systemWide.disabledMessage
        };
    }

    const typeMap = {
        'vacation': 'vacationRequests',
        'annual': 'vacationRequests',
        'casual': 'vacationRequests',
        'permission': 'permissionRequests',
        'late-arrival': 'permissionRequests',
        'early-departure': 'permissionRequests',
        'overtime': 'permissionRequests',
        'sick': 'sickLeave',
        'sick-leave': 'sickLeave',
        'mission': 'missionRequests',
        'forgot-check-in': 'forgotCheck',
        'forgot-check-out': 'forgotCheck',
        'forgot-check': 'forgotCheck'
    };

    const field = typeMap[requestType];
    if (!field) {
        return { allowed: true, message: '' };
    }

    // Check main request type
    if (!this[field].enabled) {
        return {
            allowed: false,
            message: this[field].disabledMessage
        };
    }

    // If requestType is a subType (mapped to a main type), check that subType automatically
    const subTypeMap = {
        'annual': 'annual',
        'casual': 'casual',
        'late-arrival': 'late-arrival',
        'early-departure': 'early-departure',
        'overtime': 'overtime'
    };

    // Check if requestType is actually a subType that should be checked automatically
    if (subTypeMap[requestType] && !subType) {
        subType = subTypeMap[requestType];
    }

    // Check sub-types if applicable
    if (subType && this[field].leaveTypes) {
        const subTypeControl = this[field].leaveTypes[subType];
        if (subTypeControl && !subTypeControl.enabled) {
            return {
                allowed: false,
                message: subTypeControl.disabledMessage || this[field].disabledMessage
            };
        }
    }

    if (subType && this[field].permissionTypes) {
        const subTypeControl = this[field].permissionTypes[subType];
        if (subTypeControl && !subTypeControl.enabled) {
            return {
                allowed: false,
                message: subTypeControl.disabledMessage || this[field].disabledMessage
            };
        }
    }

    return { allowed: true, message: '' };
};

/**
 * Get all disabled request types
 * @returns {Array} Array of disabled request types with messages
 */
RequestControl.prototype.getDisabledRequests = function () {
    const disabled = [];

    if (!this.systemWide.enabled) {
        disabled.push({
            type: 'system-wide',
            message: this.systemWide.disabledMessage,
            disabledAt: this.systemWide.disabledAt,
            disabledBy: this.systemWide.disabledBy,
            reason: this.systemWide.reason
        });
    }

    const types = [
        { key: 'vacationRequests', name: 'vacation' },
        { key: 'permissionRequests', name: 'permission' },
        { key: 'sickLeave', name: 'sick-leave' },
        { key: 'missionRequests', name: 'mission' },
        { key: 'forgotCheck', name: 'forgot-check' }
    ];

    types.forEach(({ key, name }) => {
        if (!this[key].enabled) {
            disabled.push({
                type: name,
                message: this[key].disabledMessage,
                disabledAt: this[key].disabledAt,
                disabledBy: this[key].disabledBy,
                reason: this[key].reason
            });
        }
    });

    return disabled;
};

// Static Methods

/**
 * Get or create control configuration
 * @param {String} tenantId - Tenant ID
 * @param {String} organization - Organization name
 * @returns {Promise<RequestControl>}
 */
RequestControl.getControl = async function (tenantId, organization = 'default') {
    let control = await this.findOne({
        where: {
            tenantId,
            organization,
            isActive: true
        }
    });

    if (!control) {
        control = await this.create({
            tenantId,
            organization
        });
    }

    return control;
};

/**
 * Check if request is allowed (static version)
 * @param {String} tenantId - Tenant ID
 * @param {String} requestType - Type of request
 * @param {String} organization - Organization name
 * @returns {Promise<Object>} { allowed: Boolean, message: String }
 */
RequestControl.checkRequestAllowed = async function (tenantId, requestType, organization = 'default') {
    const control = await this.getControl(tenantId, organization);
    return control.isRequestAllowed(requestType);
};

/**
 * Get change history
 * @param {String} tenantId - Tenant ID
 * @param {String} organization - Organization name
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Array>}
 */
RequestControl.getChangeHistory = async function (tenantId, organization = 'default', startDate, endDate) {
    const control = await this.getControl(tenantId, organization);

    let history = control.changeHistory || [];

    if (startDate || endDate) {
        history = history.filter(h => {
            const changeDate = new Date(h.changedAt);
            if (startDate && changeDate < startDate) return false;
            if (endDate && changeDate > endDate) return false;
            return true;
        });
    }

    return history.sort((a, b) => new Date(b.changedAt) - new Date(a.changedAt));
};

/**
 * Get control statistics
 * @param {String} tenantId - Tenant ID
 * @param {String} organization - Organization name
 * @returns {Promise<Object>}
 */
RequestControl.getControlStats = async function (tenantId, organization = 'default') {
    const control = await this.getControl(tenantId, organization);

    const stats = {
        systemWideEnabled: control.systemWide.enabled,
        enabledTypes: 0,
        disabledTypes: 0,
        totalChanges: (control.changeHistory || []).length,
        recentChanges: (control.changeHistory || []).slice(-10).reverse(),
        disabledRequests: control.getDisabledRequests()
    };

    const types = ['vacationRequests', 'permissionRequests', 'sickLeave', 'missionRequests', 'forgotCheck'];
    types.forEach(type => {
        if (control[type].enabled) {
            stats.enabledTypes++;
        } else {
            stats.disabledTypes++;
        }
    });

    return stats;
};

/**
 * Get active controls across all organizations
 * @param {String} tenantId - Tenant ID
 * @returns {Promise<Array>}
 */
RequestControl.getAllActiveControls = function (tenantId) {
    return this.findAll({
        where: {
            tenantId,
            isActive: true
        },
        order: [['organization', 'ASC']]
    });
};

/**
 * Validate request before creation
 * @param {String} tenantId - Tenant ID
 * @param {String} requestType - Type of request
 * @param {String} employeeId - Employee ID
 * @param {String} subType - Optional sub-type
 * @returns {Promise<Object>} { allowed: Boolean, message: String }
 */
RequestControl.validateRequest = async function (tenantId, requestType, employeeId, subType = null) {
    try {
        const control = await this.getControl(tenantId, 'default');
        return control.isRequestAllowed(requestType, subType);
    } catch (error) {
        // On error, allow the request to prevent blocking legitimate requests
        return { allowed: true, message: '' };
    }
};

/**
 * Get controls by tenant
 * @param {String} tenantId - Tenant ID
 * @returns {Query}
 */
RequestControl.withTenant = function (tenantId) {
    return this.findAll({ where: { tenantId } });
};

export default RequestControl;







