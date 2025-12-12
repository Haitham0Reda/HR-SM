// models/Role.js
import mongoose from 'mongoose';
import { validatePermissions } from '../../../../utils/permissionValidator.js';

const roleSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        // System identifier (e.g., 'custom-manager', 'project-lead')
    },
    displayName: {
        type: String,
        required: true,
        // Human-readable name (e.g., 'Custom Manager', 'Project Lead')
    },
    description: {
        type: String,
        default: ''
    },
    permissions: {
        type: [{
            type: String,
            // Array of permission keys (e.g., 'users.view', 'documents.edit')
        }],
        validate: {
            validator: function(permissions) {
                // Validate permissions using the validation utility
                const validation = validatePermissions(permissions);
                return validation.valid;
            },
            message: function(props) {
                const validation = validatePermissions(props.value);
                return validation.errors.join('; ');
            }
        }
    },
    isSystemRole: {
        type: Boolean,
        default: false,
        // True for predefined roles (admin, hr, etc.), false for custom roles
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Instance Methods

// Get permission count
roleSchema.methods.getPermissionCount = function() {
    return this.permissions ? this.permissions.length : 0;
};

// Check if role has specific permission
roleSchema.methods.hasPermission = function(permission) {
    return this.permissions && this.permissions.includes(permission);
};

// Add permissions to role
roleSchema.methods.addPermissions = function(permissions) {
    if (!Array.isArray(permissions)) {
        permissions = [permissions];
    }
    
    if (!this.permissions) {
        this.permissions = [];
    }
    
    permissions.forEach(permission => {
        if (!this.permissions.includes(permission)) {
            this.permissions.push(permission);
        }
    });
    
    return this;
};

// Remove permissions from role
roleSchema.methods.removePermissions = function(permissions) {
    if (!Array.isArray(permissions)) {
        permissions = [permissions];
    }
    
    if (!this.permissions) {
        return this;
    }
    
    this.permissions = this.permissions.filter(p => !permissions.includes(p));
    
    return this;
};

// Static Methods

// Find role by name
roleSchema.statics.findByName = function(name) {
    return this.findOne({ name: name.toLowerCase() });
};

// Get all system-defined roles
roleSchema.statics.getSystemRoles = function() {
    return this.find({ isSystemRole: true });
};

// Get all custom roles
roleSchema.statics.getCustomRoles = function() {
    return this.find({ isSystemRole: false });
};

export default mongoose.model('Role', roleSchema);
