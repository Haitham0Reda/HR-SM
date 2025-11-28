/**
 * School/Campus Model
 * Represents different campuses or organizational units
 */
import mongoose from 'mongoose';

const schoolSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    arabicName: {
        type: String,
        trim: true
    },
    code: {
        type: String,
        unique: true,
        trim: true
    },
    description: String,
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

export default mongoose.model('School', schoolSchema);
