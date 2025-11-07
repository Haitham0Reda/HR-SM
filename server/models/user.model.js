// models/User.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { getRolePermissions } from './permission.system.js';

const userSchema = new mongoose.Schema({
    employeeId: {
        type: String,
        required: false,
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
            'employee',
            'admin',
            'hr',
            'manager',
            'id-card-admin',
            'supervisor',
            'head-of-department',
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
    lastLogin: Date,
    // Permission Management
    addedPermissions: {
        type: [String],
        default: []
    },
    removedPermissions: {
        type: [String],
        default: []
    },
    permissionNotes: {
        type: String,
        maxlength: 500
    },
    permissionLastModified: Date,
    permissionModifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function (next) {
    // Auto-increment employeeId for new users
    if (this.isNew) {
        const User = this.constructor;
        try {
            const lastUser = await User.findOne({}, {}, { sort: { 'createdAt': -1 } });
            let nextId = 1;
            if (lastUser && lastUser.employeeId) {
                const match = lastUser.employeeId.match(/EMID-(\d+)/);
                if (match) {
                    nextId = parseInt(match[1], 10) + 1;
                }
            }
            this.employeeId = `EMID-${nextId.toString().padStart(4, '0')}`;
        } catch (err) {
            // If there's an error getting the last user, generate a random ID
            this.employeeId = `EMID-${Math.floor(1000 + Math.random() * 9000)}`;
        }
    }

    // Hash password if modified
    if (this.isModified('password')) {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    }

    next();
});

// Method to compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Method to get effective permissions (role + overrides)
userSchema.methods.getEffectivePermissions = async function () {
    const rolePerms = getRolePermissions(this.role);
    const added = this.addedPermissions || [];
    const removed = this.removedPermissions || [];

    // Start with role permissions
    const effectivePerms = new Set(rolePerms);

    // Add custom permissions
    added.forEach(p => effectivePerms.add(p));

    // Remove denied permissions
    removed.forEach(p => effectivePerms.delete(p));

    return Array.from(effectivePerms);
};

// Method to check if user has a specific permission
userSchema.methods.hasPermission = async function (permission) {
    const effectivePermissions = await this.getEffectivePermissions();
    return effectivePermissions.includes(permission);
};

// Method to check if user has any of the specified permissions
userSchema.methods.hasAnyPermission = async function (permissions) {
    const effectivePermissions = await this.getEffectivePermissions();
    return permissions.some(permission => effectivePermissions.includes(permission));
};

// Method to check if user has all of the specified permissions
userSchema.methods.hasAllPermissions = async function (permissions) {
    const effectivePermissions = await this.getEffectivePermissions();
    return permissions.every(permission => effectivePermissions.includes(permission));
};

export default mongoose.model('User', userSchema);