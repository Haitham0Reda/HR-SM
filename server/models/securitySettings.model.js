/**
 * Security Settings Model
 * 
 * Global security configuration for the system
 */
import mongoose from 'mongoose';

const securitySettingsSchema = new mongoose.Schema({
    // Two-Factor Authentication
    twoFactorAuth: {
        enabled: {
            type: Boolean,
            default: false
        },
        enforced: {
            type: Boolean,
            default: false // Force all users to enable 2FA
        },
        backupCodesCount: {
            type: Number,
            default: 8,
            min: 5,
            max: 20
        }
    },

    // Password Policies
    passwordPolicy: {
        minLength: {
            type: Number,
            default: 8,
            min: 6,
            max: 128
        },
        requireUppercase: {
            type: Boolean,
            default: true
        },
        requireLowercase: {
            type: Boolean,
            default: true
        },
        requireNumbers: {
            type: Boolean,
            default: true
        },
        requireSpecialChars: {
            type: Boolean,
            default: false
        },
        expirationDays: {
            type: Number,
            default: 90, // 0 = never expire
            min: 0
        },
        historyCount: {
            type: Number,
            default: 5, // Prevent reuse of last N passwords
            min: 0,
            max: 24
        },
        expirationWarningDays: {
            type: Number,
            default: 14
        }
    },

    // Account Lockout
    accountLockout: {
        enabled: {
            type: Boolean,
            default: true
        },
        maxAttempts: {
            type: Number,
            default: 5,
            min: 3,
            max: 10
        },
        lockoutDuration: {
            type: Number,
            default: 30, // Minutes
            min: 5,
            max: 1440
        },
        resetOnSuccess: {
            type: Boolean,
            default: true
        }
    },

    // IP Whitelisting
    ipWhitelist: {
        enabled: {
            type: Boolean,
            default: false
        },
        allowedIPs: [{
            ip: String,
            description: String,
            addedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            addedDate: {
                type: Date,
                default: Date.now
            }
        }],
        blockUnauthorized: {
            type: Boolean,
            default: true
        }
    },

    // Session Management
    sessionManagement: {
        maxConcurrentSessions: {
            type: Number,
            default: 3,
            min: 1,
            max: 10
        },
        sessionTimeout: {
            type: Number,
            default: 480, // Minutes (8 hours)
            min: 15,
            max: 1440
        },
        idleTimeout: {
            type: Number,
            default: 60, // Minutes
            min: 5,
            max: 240
        },
        rememberMeDuration: {
            type: Number,
            default: 30, // Days
            min: 1,
            max: 90
        }
    },

    // Development Mode
    developmentMode: {
        enabled: {
            type: Boolean,
            default: false
        },
        allowedUsers: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }],
        maintenanceMessage: {
            type: String,
            default: 'System is currently under maintenance. Please try again later.'
        },
        enabledDate: Date,
        enabledBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    },

    // Audit Settings
    auditSettings: {
        enabled: {
            type: Boolean,
            default: true
        },
        logLoginAttempts: {
            type: Boolean,
            default: true
        },
        logDataChanges: {
            type: Boolean,
            default: true
        },
        logSecurityEvents: {
            type: Boolean,
            default: true
        },
        retentionDays: {
            type: Number,
            default: 365,
            min: 30
        }
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

// Static method to get current settings
securitySettingsSchema.statics.getSettings = async function () {
    let settings = await this.findOne();

    if (!settings) {
        // Create default settings
        settings = await this.create({});
    }

    return settings;
};

// Static method to update settings
securitySettingsSchema.statics.updateSettings = async function (updates, userId) {
    let settings = await this.getSettings();

    // Handle dot notation updates properly
    for (const [key, value] of Object.entries(updates)) {
        if (key.includes('.')) {
            // Handle nested properties using dot notation
            const parts = key.split('.');
            let current = settings;
            for (let i = 0; i < parts.length - 1; i++) {
                current = current[parts[i]];
            }
            current[parts[parts.length - 1]] = value;
        } else {
            // Handle top-level properties
            settings[key] = value;
        }
    }

    settings.lastModified = new Date();
    settings.lastModifiedBy = userId;

    return await settings.save();
};

// Method to check if IP is whitelisted
securitySettingsSchema.methods.isIPWhitelisted = function (ip) {
    if (!this.ipWhitelist.enabled) return true;

    return this.ipWhitelist.allowedIPs.some(entry => entry.ip === ip);
};

// Method to validate password against policy
securitySettingsSchema.methods.validatePassword = function (password) {
    const policy = this.passwordPolicy;
    const errors = [];

    if (password.length < policy.minLength) {
        errors.push(`Password must be at least ${policy.minLength} characters`);
    }

    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }

    if (policy.requireLowercase && !/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }

    if (policy.requireNumbers && !/\d/.test(password)) {
        errors.push('Password must contain at least one number');
    }

    if (policy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        errors.push('Password must contain at least one special character');
    }

    return {
        valid: errors.length === 0,
        errors
    };
};

export default mongoose.model('SecuritySettings', securitySettingsSchema);
