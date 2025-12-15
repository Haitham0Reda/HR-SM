// models/Document.js
import mongoose from 'mongoose';
import { baseSchemaPlugin } from '../../../shared/models/BaseModel.js';

const documentSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    arabicTitle: String,
    type: {
        type: String,
        enum: ['contract', 'national-id', 'certificate', 'offer-letter', 'birth-certificate', 'other'],
        required: true
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
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    expiryDate: Date,
    isConfidential: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Add tenant isolation and other base functionality
documentSchema.plugin(baseSchemaPlugin);

// Indexes for better performance
documentSchema.index({ tenantId: 1, employee: 1 });
documentSchema.index({ tenantId: 1, type: 1 });
documentSchema.index({ tenantId: 1, uploadedBy: 1 });
documentSchema.index({ tenantId: 1, expiryDate: 1 });

export default mongoose.model('Document', documentSchema);