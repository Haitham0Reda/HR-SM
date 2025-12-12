import mongoose from 'mongoose';

const forgetCheckSchema = new mongoose.Schema({
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    date: {
        type: Date,
        required: true
    },
    requestType: {
        type: String,
        enum: ['check-in', 'check-out'],
        required: true
    },
    requestedTime: {
        type: String,
        required: true,
        validate: {
            validator: function (v) {
                return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
            },
            message: 'Time must be in HH:MM format'
        }
    },
    reason: {
        type: String,
        required: true,
        minlength: [10, 'Reason must be at least 10 characters'],
        maxlength: 500
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
        index: true
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: Date,
    rejectedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    rejectedAt: Date,
    rejectionReason: String,
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
        index: true
    },
    position: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Position'
    }
}, {
    timestamps: true
});

// Instance method to approve
forgetCheckSchema.methods.approve = async function (approverId) {
    this.status = 'approved';
    this.approvedBy = approverId;
    this.approvedAt = new Date();
    return await this.save();
};

// Instance method to reject
forgetCheckSchema.methods.reject = async function (rejecterId, reason) {
    this.status = 'rejected';
    this.rejectedBy = rejecterId;
    this.rejectedAt = new Date();
    this.rejectionReason = reason;
    return await this.save();
};

// Indexes
forgetCheckSchema.index({ employee: 1, status: 1 });
forgetCheckSchema.index({ employee: 1, date: 1 });
forgetCheckSchema.index({ department: 1, status: 1 });
forgetCheckSchema.index({ date: 1 });

export default mongoose.model('ForgetCheck', forgetCheckSchema);
