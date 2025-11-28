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
            // Find all positions and get the highest code number
            const positions = await this.constructor.find({}, { code: 1 })
                .sort({ code: -1 })
                .lean();
            
            let nextNumber = 1;
            const existingNumbers = new Set();
            
            // Extract all existing numbers
            for (const pos of positions) {
                if (pos.code) {
                    const match = pos.code.match(/\d+$/);
                    if (match) {
                        const num = parseInt(match[0]);
                        if (!isNaN(num)) {
                            existingNumbers.add(num);
                        }
                    }
                }
            }
            
            // Find the next available number
            while (existingNumbers.has(nextNumber)) {
                nextNumber++;
            }
            
            this.code = 'POS' + nextNumber.toString().padStart(3, '0');
        } catch (error) {
            return next(error);
        }
    }
    next();
});

export default mongoose.model('Position', positionSchema);