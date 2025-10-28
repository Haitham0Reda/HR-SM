// models/Attendance.js
import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    checkIn: {
        time: Date,
        method: {
            type: String,
            enum: ['biometric']
        }
    },
    checkOut: {
        time: Date,
        method: {
            type: String,
            enum: ['biometric']
        }
    },
    totalHours: Number,
    status: {
        type: String,
        enum: ['present', 'absent', 'mission', 'half-day', 'offical-holiday', 'weekend', 'early-leave', 'late-arrival', 'forget-check-in', 'forget-check-out'],
        default: 'absent'
    },
    notes: String,
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

export default mongoose.model('Attendance', attendanceSchema);