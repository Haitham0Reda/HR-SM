// models/DocumentTemplate.js
import mongoose from 'mongoose';
import { baseSchemaPlugin } from '../../../shared/models/BaseModel.js';

const documentTemplateSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: String,
    fileUrl: {
        type: String,
        required: true // URL or path to the template file
    },
    fileType: {
        type: String,
        required: true // e.g., 'pdf', 'docx', etc.
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Apply base schema plugin for multi-tenancy
documentTemplateSchema.plugin(baseSchemaPlugin);

// Compound indexes for tenant isolation and performance
documentTemplateSchema.index({ tenantId: 1, name: 1 });
documentTemplateSchema.index({ tenantId: 1, isActive: 1 });
documentTemplateSchema.index({ tenantId: 1, createdBy: 1 });

export default mongoose.model('DocumentTemplate', documentTemplateSchema);
