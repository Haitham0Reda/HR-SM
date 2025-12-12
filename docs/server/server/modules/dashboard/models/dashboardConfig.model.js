import mongoose from 'mongoose';

const dashboardConfigSchema = new mongoose.Schema({
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

// Ensure only one configuration document exists
dashboardConfigSchema.statics.getConfig = async function () {
    let config = await this.findOne();
    if (!config) {
        config = await this.create({});
    }
    return config;
};

export default mongoose.model('DashboardConfig', dashboardConfigSchema);
