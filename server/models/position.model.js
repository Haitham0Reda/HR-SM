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
        unique: true,
        sparse: true
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

// Pre-save hook to auto-generate code
positionSchema.pre('validate', async function(next) {
    if (!this.code) {
        try {
            // Find the highest code number
            const lastPosition = await this.constructor.findOne({}, { code: 1 })
                .sort({ code: -1 })
                .lean();
            
            let nextNumber = 1;
            if (lastPosition && lastPosition.code) {
                // Extract number from code (e.g., "POS001" -> 1)
                const match = lastPosition.code.match(/\d+$/);
                if (match) {
                    const lastNumber = parseInt(match[0]);
                    if (!isNaN(lastNumber)) {
                        nextNumber = lastNumber + 1;
                    }
                }
            }
            
            this.code = 'POS' + nextNumber.toString().padStart(3, '0');
        } catch (error) {
            return next(error);
        }
    }
    next();
});

export default mongoose.model('Position', positionSchema);