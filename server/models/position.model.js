// models/Position.js
import mongoose from 'mongoose';

const positionSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    arabicTitle: String,
    code: {
        type: String,
        required: true,
        unique: true
    },
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
        required: true
    },
    jobDescription: String,
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

export default mongoose.model('Position', positionSchema);