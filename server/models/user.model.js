// models/User.js
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    employeeId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    username: {
        type: String,
        required: true,
        unique: true,
        minlength: 3,
        maxlength: 30,
        match: /^[a-zA-Z0-9_]+$/, // Alphanumeric and underscores only
        index: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        validate: {
            validator: function (v) {
                return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v);
            },
            message: 'Please enter a valid email'
        },
        index: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    enum: ['employee', 'manager', 'admin', 'hr'],
    default: 'employee',
    index: true
>>>>>>> 07076efdf0bbd10ff85461b6cac5d104d465b9d1
},
    role: {
    type: String,
    enum: [
        // Core roles
        'employee',
        'manager',
        'admin',
        'hr',

        // Specialized roles
        'id-card-admin',  // ID Card printing and management
        'supervisor',
        'head-of-department',
        'alternative-manager',

        // Academic roles
        'lecturer',
        'teaching-assistant',
        'professor',
        'lab-instructor',
        'dean'
    ],
    default: 'employee',
    index: true
},
=======
        enum: ['employee', 'manager', 'admin', 'hr'],
        default: 'employee',
        index: true
>>>>>>> 07076efdf0bbd10ff85461b6cac5d104d465b9d1
    },
profile: {
    firstName: {
        type: String,
            required: true,
                trim: true
    },
    medName: {
        type: String,
            trim: true
    },
    lastName: {
        type: String,
            required: true,
                trim: true
    },
    arabicName: {
        type: String,
            trim: true
    },
    phone: {
        type: String,
            validate: {
            validator: function(v) {
                return !v || /^\+?[\d\s\-\(\)]+$/.test(v);
            },
            message: 'Please enter a valid phone number'
        }
    },
    dateOfBirth: {
        type: Date,
            validate: {
            validator: function(v) {
                return !v || v < new Date();
            },
            message: 'Date of birth cannot be in the future'
        }
    },
    gender: {
        type: String,
            enum: ['male', 'female']
    },
    maritalStatus: {
        type: String,
            enum: ['single', 'married', 'divorced', 'widowed']
    },
    nationalId: {
        type: String, // Changed to String to handle leading zeros
            validate: {
            validator: function(v) {
                return !v || /^\d+$/.test(v);
            },
            message: 'National ID must contain only numbers'
        }
    },
    profilePicture: String
},
department: {
    type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
            index: true
},
school: {
    type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
            required: true
},
position: {
    type: mongoose.Schema.Types.ObjectId,
        ref: 'Position',
            index: true
},
employment: {
    hireDate: {
        type: Date,
            validate: {
            validator: function(v) {
                return !v || v <= new Date();
            },
            message: 'Hire date cannot be in the future'
        }
    },
    contractType: {
        type: String,
            enum: ['full-time', 'part-time', 'contract', 'probation']
    },
    employmentStatus: {
        type: String,
            enum: ['active', 'on-leave', 'terminated', 'resigned'],
            default: 'active'
    },
    terminationDate: Date,
        resignationDate: Date
},
isActive: {
    type: Boolean,
        default: true,
        index: true
},
lastLogin: Date,
    resetPasswordToken: String,
        resetPasswordExpires: Date,
            passwordUpdatedAt: Date
}, {
    timestamps: true,
        toJSON: {
        transform: function(doc, ret) {
            delete ret.password;
            delete ret.resetPasswordToken;
            delete ret.resetPasswordExpires;
            return ret;
        }
    }
});

// Virtual for full name
userSchema.virtual('profile.fullName').get(function () {
    return [this.profile.firstName, this.profile.medName, this.profile.lastName]
        .filter(Boolean)
        .join(' ');
});

// Virtual for employment duration in years
userSchema.virtual('employment.duration').get(function () {
    if (!this.employment?.hireDate) return 0;
    const today = new Date();
    const hireDate = new Date(this.employment.hireDate);
    const diffTime = Math.abs(today - hireDate);
    const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
    return Math.floor(diffYears * 10) / 10; // Return with 1 decimal place
});

// Virtual for age
userSchema.virtual('profile.age').get(function () {
    if (!this.profile?.dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(this.profile.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
});

// Note: Middleware hooks moved to userMiddleware.js
// Use middleware functions in routes for better separation of concerns

// Instance method to check if user is active
userSchema.methods.isCurrentlyActive = function () {
    return this.isActive && this.employment.employmentStatus === 'active';
};

// Instance method to check role permissions
userSchema.methods.hasRole = function (roles) {
    if (Array.isArray(roles)) {
        return roles.includes(this.role);
    }
    return this.role === roles;
};

// Instance method to check if user is manager or above
userSchema.methods.isManagerOrAbove = function () {
    return ['manager', 'admin', 'hr'].includes(this.role);
};
// Instance method to check if user is active
userSchema.methods.isCurrentlyActive = function () {
    return this.isActive && this.employment.employmentStatus === 'active';
};

// Instance method to check role permissions
userSchema.methods.hasRole = function (roles) {
    if (Array.isArray(roles)) {
        return roles.includes(this.role);
    }
    return this.role === roles;
};

// Instance method to check if user is manager or above
userSchema.methods.isManagerOrAbove = function () {
    return ['manager', 'admin', 'hr'].includes(this.role);
};

// Instance method to check if user is ID Card Admin
userSchema.methods.isIDCardAdmin = function () {
    return this.role === 'id-card-admin';
};

// Instance method to check if user has ID card permissions
userSchema.methods.hasIDCardPermissions = function () {
    return ['id-card-admin', 'admin', 'hr'].includes(this.role);
};
=======
// Instance method to check if user is active
userSchema.methods.isCurrentlyActive = function() {
    return this.isActive && this.employment.employmentStatus === 'active';
};

// Instance method to check role permissions
userSchema.methods.hasRole = function(roles) {
    if (Array.isArray(roles)) {
        return roles.includes(this.role);
    }
    return this.role === roles;
};

// Instance method to check if user is manager or above
userSchema.methods.isManagerOrAbove = function() {
    return ['manager', 'admin', 'hr'].includes(this.role);
};

// Instance method to update last login
userSchema.methods.updateLastLogin = async function() {
    this.lastLogin = new Date();
    return await this.save();
};

// Instance method to soft delete user
userSchema.methods.softDelete = async function() {
    this.isActive = false;
    this.employment.employmentStatus = 'terminated';
    this.employment.terminationDate = new Date();
    return await this.save();
};

// Static method to find active users
userSchema.statics.findActive = function() {
    return this.find({
        isActive: true,
        'employment.employmentStatus': 'active'
    });
};

// Static method to find users by role
userSchema.statics.findByRole = function(role) {
    return this.find({ role, isActive: true });
};

// Static method to find users in department
userSchema.statics.findByDepartment = function(departmentId) {
    return this.find({
        department: departmentId,
        isActive: true
    });
};

// Static method to get users with pagination
userSchema.statics.getPaginated = function(query = {}, options = {}) {
    const {
        page = 1,
        limit = 10,
        sort = { createdAt: -1 }
    } = options;

    const skip = (page - 1) * limit;

    return this.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('department position');
};

// Static method to get user statistics
userSchema.statics.getUserStats = async function() {
    const stats = await this.aggregate([
        {
            $group: {
                _id: '$role',
                count: { $sum: 1 },
                active: {
                    $sum: {
                        $cond: [
                            { $and: ['$isActive', { $eq: ['$employment.employmentStatus', 'active'] }] },
                            1,
                            0
                        ]
                    }
                }
            }
        },
        {
            $group: {
                _id: null,
                totalUsers: { $sum: '$count' },
                totalActive: { $sum: '$active' },
                roles: {
                    $push: {
                        role: '$_id',
                        count: '$count',
                        active: '$active'
                    }
                }
            }
        }
    ]);

    return stats[0] || { totalUsers: 0, totalActive: 0, roles: [] };
};

// Compound indexes for better query performance
userSchema.index({ employeeId: 1 }, { unique: true });
userSchema.index({ department: 1, isActive: 1 });
userSchema.index({ 'employment.employmentStatus': 1 });
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ createdAt: 1 });
userSchema.index({ 'profile.firstName': 1, 'profile.lastName': 1 });

// Text index for search functionality
userSchema.index({
    'profile.firstName': 'text',
    'profile.lastName': 'text',
    'profile.arabicName': 'text',
    username: 'text',
    email: 'text'
});

export default mongoose.model('User', userSchema);