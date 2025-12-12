import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { baseSchemaPlugin } from '../../../shared/models/BaseModel.js';
import { ROLES } from '../../../shared/constants/modules.js';

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        select: false
    },
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: Object.values(ROLES),
        default: ROLES.EMPLOYEE
    },
    employeeId: {
        type: String,
        sparse: true
    },
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department'
    },
    position: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Position'
    },
    manager: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    phone: String,
    dateOfBirth: Date,
    hireDate: Date,
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended'],
        default: 'active'
    },
    profilePicture: String,
    address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: String
    }
});

// Apply base schema plugin for multi-tenancy
userSchema.plugin(baseSchemaPlugin);

// Compound index for email uniqueness per tenant
userSchema.index({ email: 1, tenantId: 1 }, { unique: true });
userSchema.index({ employeeId: 1, tenantId: 1 }, { unique: true, sparse: true });

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    this.password = await bcrypt.hash(this.password, 12);
    next();
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Method to get full name
userSchema.methods.getFullName = function () {
    return `${this.firstName} ${this.lastName}`;
};

// Virtual for subordinates (employees managed by this user)
userSchema.virtual('subordinates', {
    ref: 'User',
    localField: '_id',
    foreignField: 'manager'
});

const User = mongoose.model('User', userSchema);

export default User;
