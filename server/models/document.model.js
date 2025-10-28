// models/Document.js
import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    arabicTitle: String,
    type: {
        type: String,
        enum: ['contract', 'national-id', 'certificate', 'offer-letter', 'birth-certificate', 'other']
    },
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department'
    },
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
    },
    expiryDate: Date,
    isConfidential: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

export default mongoose.model('Document', documentSchema);