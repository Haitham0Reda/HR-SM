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
import mongoose from 'mongoose';

const requestControlSchema = new mongoose.Schema({
    // Organization/Campus reference
    organization: {
        type: String,
        default: 'default',
        index: true
    },

    // System-wide control
    systemWide: {
        enabled: {
            type: Boolean,
            default: true
        },
        disabledMessage: {
            type: String,
            default: 'Request submissions are currently disabled. Please contact HR for more information.'
        },
        disabledBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        disabledAt: Date,
        enabledBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        enabledAt: Date,
        reason: String  // Reason for disabling
    },

    // Vacation requests control (Annual and Casual leave)
    vacationRequests: {
        enabled: {
            type: Boolean,
            default: true
        },
        disabledMessage: {
            type: String,
            default: 'Vacation requests are currently disabled. Please try again later.'
        },
        disabledBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        disabledAt: Date,
        enabledBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        enabledAt: Date,
        reason: String,
        // Specific leave types under vacation
        leaveTypes: {
            'annual': {
                enabled: {
                    type: Boolean,
                    default: true
                },
                disabledMessage: String
            },
            'casual': {
                enabled: {
                    type: Boolean,
                    default: true
                },
                disabledMessage: String
            }
        }
    },

    // Permission requests control (Late arrival, Early departure, Overtime)
    permissionRequests: {
        enabled: {
            type: Boolean,
            default: true
        },
        disabledMessage: {
            type: String,
            default: 'Permission requests are currently disabled. Please contact your supervisor.'
        },
        disabledBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        disabledAt: Date,
        enabledBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        enabledAt: Date,
        reason: String,
        // Specific permission types
        permissionTypes: {
            'late-arrival': {
                enabled: {
                    type: Boolean,
                    default: true
                },
                disabledMessage: String
            },
            'early-departure': {
                enabled: {
                    type: Boolean,
                    default: true
                },
                disabledMessage: String
            },
            'overtime': {
                enabled: {
                    type: Boolean,
                    default: true
                },
                disabledMessage: String
            }
        }
    },

    // Sick leave requests control
    sickLeave: {
        enabled: {
            type: Boolean,
            default: true
        },
        disabledMessage: {
            type: String,
            default: 'Sick leave requests are currently disabled. For urgent medical situations, please contact HR directly.'
        },
        disabledBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        disabledAt: Date,
        enabledBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        enabledAt: Date,
        reason: String
    },

    // Mission requests control
    missionRequests: {
        enabled: {
            type: Boolean,
            default: true
        },
        disabledMessage: {
            type: String,
            default: 'Mission requests are currently disabled. Please contact HR for assistance.'
        },
        disabledBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        disabledAt: Date,
        enabledBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        enabledAt: Date,
        reason: String
    },

    // Forgot check-in/out requests control
    forgotCheck: {
        enabled: {
            type: Boolean,
            default: true
        },
        disabledMessage: {
            type: String,
            default: 'Forgot check-in/out corrections are currently disabled. Please submit a formal request to HR.'
        },
        disabledBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        disabledAt: Date,
        enabledBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        enabledAt: Date,
        reason: String
    },

    // Other leave types control
    otherLeaveTypes: {
        emergency: {
            enabled: {
                type: Boolean,
                default: true
            },
            disabledMessage: String,
            disabledBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            disabledAt: Date
        },
        maternity: {
            enabled: {
                type: Boolean,
                default: true
            },
            disabledMessage: String,
            disabledBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            disabledAt: Date
        },
        paternity: {
            enabled: {
                type: Boolean,
                default: true
            },
            disabledMessage: String,
            disabledBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            disabledAt: Date
        },
        unpaid: {
            enabled: {
                type: Boolean,
                default: true
            },
            disabledMessage: String,
            disabledBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            disabledAt: Date
        }
    },

    // Scheduled control (optional - for planned maintenance or blackout periods)
    scheduledControl: {
        enabled: {
            type: Boolean,
            default: false
        },
        schedules: [{
            startDate: Date,
            endDate: Date,
            affectedTypes: [{
                type: String,
                enum: ['all', 'vacation', 'permission', 'sick-leave', 'mission', 'forgot-check']
            }],
            message: String,
            reason: String,
            createdBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            }
        }]
    },

    // Change history/audit trail
    changeHistory: [{
        changedAt: {
            type: Date,
            default: Date.now
        },
        changedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        requestType: {
            type: String,
            enum: ['system-wide', 'vacation', 'permission', 'sick-leave', 'mission', 'forgot-check', 'emergency', 'maternity', 'paternity', 'unpaid'],
            required: true
        },
        action: {
            type: String,
            enum: ['enabled', 'disabled'],
            required: true
        },
        previousState: Boolean,
        newState: Boolean,
        reason: String,
        message: String
    }],

    // Active status
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Virtual to check if any request type is disabled
requestControlSchema.virtual('hasDisabledRequests').get(function () {
    return !this.systemWide.enabled ||
        !this.vacationRequests.enabled ||
        !this.permissionRequests.enabled ||
        !this.sickLeave.enabled ||
        !this.missionRequests.enabled ||
        !this.forgotCheck.enabled;
});

// Virtual to get count of disabled request types
requestControlSchema.virtual('disabledCount').get(function () {
    let count = 0;
    if (!this.vacationRequests.enabled) count++;
    if (!this.permissionRequests.enabled) count++;
    if (!this.sickLeave.enabled) count++;
    if (!this.missionRequests.enabled) count++;
    if (!this.forgotCheck.enabled) count++;
    return count;
});

/**
 * Instance method to disable system-wide requests
 * 
 * @param {ObjectId} userId - User making the change
 * @param {String} message - Custom message
 * @param {String} reason - Reason for disabling
 * @returns {Promise<RequestControl>} Updated control
 */
requestControlSchema.methods.disableSystemWide = async function (userId, message = null, reason = '') {
    const previousState = this.systemWide.enabled;

    this.systemWide.enabled = false;
    this.systemWide.disabledBy = userId;
    this.systemWide.disabledAt = new Date();
    this.systemWide.reason = reason;

    if (message) {
        this.systemWide.disabledMessage = message;
    }

    // Log change
    this.changeHistory.push({
        changedBy: userId,
        requestType: 'system-wide',
        action: 'disabled',
        previousState,
        newState: false,
        reason,
        message: message || this.systemWide.disabledMessage
    });

    return await this.save();
};

/**
 * Instance method to enable system-wide requests
 * 
 * @param {ObjectId} userId - User making the change
 * @param {String} reason - Reason for enabling
 * @returns {Promise<RequestControl>} Updated control
 */
requestControlSchema.methods.enableSystemWide = async function (userId, reason = '') {
    const previousState = this.systemWide.enabled;

    this.systemWide.enabled = true;
    this.systemWide.enabledBy = userId;
    this.systemWide.enabledAt = new Date();
    this.systemWide.reason = reason;

    // Log change
    this.changeHistory.push({
        changedBy: userId,
        requestType: 'system-wide',
        action: 'enabled',
        previousState,
        newState: true,
        reason
    });

    return await this.save();
};

/**
 * Instance method to disable specific request type
 * 
 * @param {String} requestType - Type of request to disable
 * @param {ObjectId} userId - User making the change
 * @param {String} message - Custom message
 * @param {String} reason - Reason for disabling
 * @returns {Promise<RequestControl>} Updated control
 */
requestControlSchema.methods.disableRequestType = async function (requestType, userId, message = null, reason = '') {
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

    this[field].enabled = false;
    this[field].disabledBy = userId;
    this[field].disabledAt = new Date();
    this[field].reason = reason;

    if (message) {
        this[field].disabledMessage = message;
    }

    // Log change
    this.changeHistory.push({
        changedBy: userId,
        requestType,
        action: 'disabled',
        previousState,
        newState: false,
        reason,
        message: message || this[field].disabledMessage
    });

    return await this.save();
};

/**
 * Instance method to enable specific request type
 * 
 * @param {String} requestType - Type of request to enable
 * @param {ObjectId} userId - User making the change
 * @param {String} reason - Reason for enabling
 * @returns {Promise<RequestControl>} Updated control
 */
requestControlSchema.methods.enableRequestType = async function (requestType, userId, reason = '') {
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

    this[field].enabled = true;
    this[field].enabledBy = userId;
    this[field].enabledAt = new Date();
    this[field].reason = reason;

    // Log change
    this.changeHistory.push({
        changedBy: userId,
        requestType,
        action: 'enabled',
        previousState,
        newState: true,
        reason
    });

    return await this.save();
};

/**
 * Instance method to check if a specific request type is allowed
 * 
 * @param {String} requestType - Type of request to check
 * @param {String} subType - Optional sub-type (e.g., 'annual', 'late-arrival')
 * @returns {Object} { allowed: Boolean, message: String }
 */
requestControlSchema.methods.isRequestAllowed = function (requestType, subType = null) {
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
 * Instance method to get all disabled request types
 * 
 * @returns {Array} Array of disabled request types with messages
 */
requestControlSchema.methods.getDisabledRequests = function () {
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

/**
 * Static method to get or create control configuration
 * 
 * @param {String} organization - Organization name
 * @returns {Promise<RequestControl>} Control configuration
 */
requestControlSchema.statics.getControl = async function (organization = 'default') {
    let control = await this.findOne({
        organization,
        isActive: true
    });

    if (!control) {
        control = await this.create({
            organization
        });
    }

    return control;
};

/**
 * Static method to check if request is allowed (static version)
 * 
 * @param {String} requestType - Type of request
 * @param {String} organization - Organization name
 * @returns {Promise<Object>} { allowed: Boolean, message: String }
 */
requestControlSchema.statics.checkRequestAllowed = async function (requestType, organization = 'default') {
    const control = await this.getControl(organization);
    return control.isRequestAllowed(requestType);
};

/**
 * Static method to get change history
 * 
 * @param {String} organization - Organization name
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Array>} Change history
 */
requestControlSchema.statics.getChangeHistory = async function (organization = 'default', startDate, endDate) {
    const control = await this.getControl(organization);

    let history = control.changeHistory;

    if (startDate || endDate) {
        history = history.filter(h => {
            const changeDate = new Date(h.changedAt);
            if (startDate && changeDate < startDate) return false;
            if (endDate && changeDate > endDate) return false;
            return true;
        });
    }

    return history.sort((a, b) => b.changedAt - a.changedAt);
};

/**
 * Static method to get control statistics
 * 
 * @param {String} organization - Organization name
 * @returns {Promise<Object>} Control statistics
 */
requestControlSchema.statics.getControlStats = async function (organization = 'default') {
    const control = await this.getControl(organization);

    const stats = {
        systemWideEnabled: control.systemWide.enabled,
        enabledTypes: 0,
        disabledTypes: 0,
        totalChanges: control.changeHistory.length,
        recentChanges: control.changeHistory.slice(-10).reverse(),
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
 * Static method to notify specific users about request control changes
 * 
 * @param {Array} userIds - Array of user IDs to notify
 * @param {String} title - Notification title
 * @param {String} message - Notification message
 * @param {ObjectId} controlId - Request control ID
 * @returns {Promise<void>}
 */
requestControlSchema.statics.notifyUsers = async function (userIds, title, message, controlId) {
    try {
        const Notification = mongoose.model('Notification');

        const notifications = userIds.map(userId => ({
            recipient: userId,
            type: 'request-control',
            title,
            message,
            relatedModel: 'RequestControl',
            relatedId: controlId
        }));

        if (notifications.length > 0) {
            await Notification.insertMany(notifications);
        }
    } catch (error) {
        console.error('Error sending request control notifications:', error);
    }
};

/**
 * Static method to get active controls across all schools
 * 
 * @returns {Promise<Array>} Active control configurations
 */
requestControlSchema.statics.getAllActiveControls = function () {
    return this.find({ isActive: true })
        .sort({ organization: 1 });
};

/**
 * Static method to validate request before creation
 * Use in controllers before creating leave/permission requests
 * 
 * @param {String} requestType - Type of request (vacation, permission, sick-leave, etc.)
 * @param {ObjectId} employeeId - Employee ID
 * @param {String} subType - Optional sub-type
 * @returns {Promise<Object>} { allowed: Boolean, message: String }
 */
requestControlSchema.statics.validateRequest = async function (requestType, employeeId, subType = null) {
    try {
        const User = mongoose.model('User');
        const employee = await User.findById(employeeId);

        if (!employee) {
            return { allowed: false, message: 'Employee not found' };
        }

        const control = await this.getControl('default');
        return control.isRequestAllowed(requestType, subType);
    } catch (error) {
        console.error('Error validating request:', error);
        // On error, allow the request to prevent blocking legitimate requests
        return { allowed: true, message: '' };
    }
};

// Note: Post-save notification logic moved to requestControlMiddleware.js
// Call sendRequestControlNotifications function after save in controllers

// Compound indexes for better performance
requestControlSchema.index({ organization: 1, isActive: 1 }, { unique: true });
requestControlSchema.index({ 'changeHistory.changedAt': -1 });
requestControlSchema.index({ 'changeHistory.changedBy': 1 });

export default mongoose.model('RequestControl', requestControlSchema);
