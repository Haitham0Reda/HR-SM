// models/User.js
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    employeeId: {
        type: String,
        required: true,
        unique: true
    },
    username: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: [
            // Admin roles
            'employee',
            'admin',
            'hr',
            'manager',
            'alternative-manager',
            'head-of-department',
            'supervisor',

            // Academic roles
            'lecturer',
            'teaching-assistant',
            'professor', ,
            'lab-instructor',
            'dean'
        ],
        default: 'employee'
    },
    profile: {
        firstName: String,
        medName: String,
        lastName: String,
        arabicName: String,
        phone: String,
        dateOfBirth: Date,
        gender: {
            type: String,
            enum: ['male', 'female']
        },
        maritalStatus: {
            type: String,
            enum: ['single', 'married', 'divorced', 'widowed']
        },
        nationalId: Number,
        profilePicture: String
    },
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department'
    },
    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        required: true
    },
    position: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Position'
    },
    employment: {
        hireDate: Date,
        contractType: {
            type: String,
            enum: ['full-time', 'part-time', 'contract', 'probation']
        },
        employmentStatus: {
            type: String,
            enum: ['active', 'on-leave', 'terminated', 'resigned']
        },
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastLogin: Date
}, {
    timestamps: true
});

// Auto-increment employeeId in the format EMID-0001, EMID-0002, ...
userSchema.pre('save', async function (next) {
    if (!this.isNew) return next();
    const User = this.constructor;
    const lastUser = await User.findOne({}).sort({ createdAt: -1 });
    let nextId = 1;
    if (lastUser && lastUser.employeeId) {
        const match = lastUser.employeeId.match(/EMID-(\d+)/);
        if (match) {
            nextId = parseInt(match[1], 10) + 1;
        }
    }
    this.employeeId = `EMID-${nextId.toString().padStart(4, '0')}`;
    next();
});

// Add index for employeeId (unique)
userSchema.index({ employeeId: 1 }, { unique: true });

export default mongoose.model('User', userSchema);