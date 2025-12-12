/**
 * organization/location Model
 * Represents different locationes or organizational units
 */
import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema({
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

export default mongoose.model('organization', organizationSchema);