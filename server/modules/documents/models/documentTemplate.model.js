// models/DocumentTemplate.js
import mongoose from 'mongoose';

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
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

export default mongoose.model('DocumentTemplate', documentTemplateSchema);
