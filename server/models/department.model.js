// models/Department.js
import mongoose from 'mongoose';

const departmentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    arabicName: String,
    code: {
        type: String,
        required: true,
        unique: true
    },
    manager: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        required: true
    },
    description: String,
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Add index for code (unique)
departmentSchema.index({ code: 1 }, { unique: true });

export default mongoose.model('Department', departmentSchema);