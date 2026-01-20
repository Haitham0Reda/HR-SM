import mongoose from 'mongoose';

const dashboardConfigSchema = new mongoose.Schema({
    // Tenant ID for multi-tenancy
    tenantId: {
        type: String,
        required: [true, 'Tenant ID is required'],
        trim: true
        // Removed index: true to avoid conflict with compound index below
    },

    // Employee of the Month configuration
    employeeOfTheMonth: {
        enabled: {
            type: Boolean,
            default: true
        },
        selectedEmployee: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        month: {
            type: String,
            default: () => new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })
        },
        updatedAt: {
            type: Date,
            default: Date.now
        }
    },

    // Dashboard widgets visibility
    widgets: {
        todayAttendance: {
            type: Boolean,
            default: true
        },
        quickActions: {
            type: Boolean,
            default: true
        },
        announcements: {
            type: Boolean,
            default: true
        }
    },

    // Quick action cards configuration
    quickActionCards: {
        attendance: {
            type: Boolean,
            default: true
        },
        vacations: {
            type: Boolean,
            default: true
        },
        permissions: {
            type: Boolean,
            default: true
        },
        forgetCheck: {
            type: Boolean,
            default: true
        },
        sickLeave: {
            type: Boolean,
            default: true
        },
        profile: {
            type: Boolean,
            default: true
        }
    },

    // Last updated by
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Compound index for tenant isolation (unique per tenant)
dashboardConfigSchema.index({ tenantId: 1 }, { unique: true });

// Ensure only one configuration document exists per tenant
dashboardConfigSchema.statics.getConfig = async function (tenantId) {
    let config = await this.findOne({ tenantId });
    if (!config) {
        config = await this.create({ tenantId });
    }
    return config;
};

// Add withTenant static method for tenant-aware queries
dashboardConfigSchema.statics.withTenant = function (tenantId) {
    return this.find({ tenantId });
};

export default mongoose.model('DashboardConfig', dashboardConfigSchema);
