// Holiday Model - Moved to HR-Core module
// This is a placeholder - full implementation should be moved from server/models/holiday.model.js
import mongoose from 'mongoose';

const holidaySchema = new mongoose.Schema({
    tenantId: {
        type: String,
        required: [true, 'Tenant ID is required'],
        index: true,
        trim: true
    },
    campus: {
        type: String,
        default: 'default'
    },
    officialHolidays: [{
        date: {
            type: Date,
            required: true
        },
        name: {
            type: String,
            required: true
        },
        dayOfWeek: String,
        isWeekend: Boolean,
        description: String
    }],
    weekendWorkDays: [{
        date: {
            type: Date,
            required: true
        },
        reason: String
    }],
    weekendDays: {
        type: [Number],
        default: [5, 6] // Friday and Saturday
    }
}, {
    timestamps: true
});

// Compound indexes for tenant isolation
holidaySchema.index({ tenantId: 1, campus: 1 });
holidaySchema.index({ tenantId: 1, 'officialHolidays.date': 1 });

export default mongoose.model('Holiday', holidaySchema);
