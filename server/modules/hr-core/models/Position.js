import mongoose from 'mongoose';
import { baseSchemaPlugin } from '../../../shared/models/BaseModel.js';

const positionSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    code: {
        type: String,
        required: true
    },
    description: String,
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department'
    },
    level: {
        type: String,
        enum: ['entry', 'junior', 'mid', 'senior', 'lead', 'manager', 'director', 'executive'],
        default: 'entry'
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    }
});

positionSchema.plugin(baseSchemaPlugin);
positionSchema.index({ code: 1, tenantId: 1 }, { unique: true });

const Position = mongoose.model('Position', positionSchema);

export default Position;
