// models/HardCopy.js
import mongoose from 'mongoose';
import { baseSchemaPlugin } from '../../../shared/models/BaseModel.js';

const hardCopySchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    category: {
        type: String,
        default: 'general'
    }, // Allow dynamic categories
    fileUrl: {
        type: String,
        required: true
    },
    fileName: {
        type: String,
        trim: true
    },
    fileSize: {
        type: Number,
        min: 0
    },
    isPublic: {
        type: Boolean,
        default: false
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true,
        index: true
    }
}, {
    timestamps: true
});

// Add tenant isolation plugin
hardCopySchema.plugin(baseSchemaPlugin);

// Indexes for performance
hardCopySchema.index({ tenantId: 1, category: 1 });
hardCopySchema.index({ tenantId: 1, uploadedBy: 1 });
hardCopySchema.index({ tenantId: 1, createdAt: -1 });

export default mongoose.model('HardCopy', hardCopySchema);