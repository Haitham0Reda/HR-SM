// models/Department.js
import mongoose from 'mongoose';

const departmentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    arabicName: String,
    code: {
        type: String,
        unique: true
    },
    manager: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    description: String,
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Pre-save hook to auto-generate code
departmentSchema.pre('save', async function(next) {
    if (!this.code) {
        try {
            // Find the highest code number
            const lastDepartment = await this.constructor.findOne({}, { code: 1 })
                .sort({ code: -1 })
                .lean();
            
            let nextNumber = 1;
            if (lastDepartment && lastDepartment.code) {
                const lastNumber = parseInt(lastDepartment.code);
                if (!isNaN(lastNumber)) {
                    nextNumber = lastNumber + 1;
                }
            }
            
            this.code = nextNumber.toString().padStart(3, '0');
        } catch (error) {
            return next(error);
        }
    }
    next();
});

export default mongoose.model('Department', departmentSchema);