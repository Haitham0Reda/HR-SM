// models/HardCopy.js
import mongoose from 'mongoose';

const hardCopySchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: String,
    category: {
        type: String,
        enum: ['general', 'contract', 'certificate', 'id-card', 'payroll', 'attendance', 'other'],
        default: 'general'
    },
    location: String, // Physical location of the hard copy
    fileUrl: {
        type: String,
        required: true
    },
    fileName: String,
    fileSize: Number,
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

export default mongoose.model('HardCopy', hardCopySchema);