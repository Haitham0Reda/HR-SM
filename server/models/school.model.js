import mongoose from 'mongoose';

const schoolSchema = new mongoose.Schema({
    schoolCode: {
        type: String,
        required: true,
        unique: true,
        enum: ['BUS', 'ENG', 'CS'], // Fixed codes for your three schools
        uppercase: true
    },
    name: {
        type: String,
        required: true,
        enum: [
            'School of Business',
            'School of Engineering', 
            'School of Computer Science'
        ]
    },
    arabicName: {
        type: String,
        required: true,
        enum: [
            'المعهد الكندى العالى للإدارة بالسادس من اكتوبر',
            'المعهد الكندى العالى للهندسة بالسادس من اكتوبر',
            'المعهد الكندى العالى للحاسبات والذكاء الاصطناعى بالسادس من اكتوبر'
        ]
    },
    dean: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Static method to get school by code
schoolSchema.statics.findByCode = function(code) {
    return this.findOne({ schoolCode: code.toUpperCase() });
};

// Static method to get all active schools
schoolSchema.statics.getActiveSchools = function() {
    return this.find({ isActive: true }).populate('dean');
};

// Add index for schoolId (unique)
schoolSchema.index({ schoolId: 1 }, { unique: true });

export default mongoose.model('School', schoolSchema);