const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * Platform User Schema
 * Represents system administrators who manage the platform
 * Separate from tenant users
 */
const platformUserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters long'],
    select: false // Don't include password in queries by default
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true
  },
  role: {
    type: String,
    enum: {
      values: ['super-admin', 'support', 'operations'],
      message: '{VALUE} is not a valid role'
    },
    required: [true, 'Role is required']
  },
  permissions: [{
    type: String,
    trim: true
  }],
  status: {
    type: String,
    enum: {
      values: ['active', 'inactive', 'locked'],
      message: '{VALUE} is not a valid status'
    },
    default: 'active'
  },
  lastLogin: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'platform_users'
});

// Index for faster email lookups
platformUserSchema.index({ email: 1 });

// Index for role-based queries
platformUserSchema.index({ role: 1, status: 1 });

/**
 * Pre-save middleware to hash password
 */
platformUserSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) {
    return next();
  }

  try {
    // Generate salt and hash password
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Method to compare password for authentication
 * @param {string} candidatePassword - Password to compare
 * @returns {Promise<boolean>} True if password matches
 */
platformUserSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

/**
 * Method to get full name
 * @returns {string} Full name
 */
platformUserSchema.methods.getFullName = function() {
  return `${this.firstName} ${this.lastName}`;
};

/**
 * Method to check if user has specific permission
 * @param {string} permission - Permission to check
 * @returns {boolean} True if user has permission
 */
platformUserSchema.methods.hasPermission = function(permission) {
  // Super-admin has all permissions
  if (this.role === 'super-admin') {
    return true;
  }
  
  return this.permissions.includes(permission);
};

/**
 * Method to sanitize user object (remove sensitive data)
 * @returns {Object} Sanitized user object
 */
platformUserSchema.methods.toSafeObject = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

/**
 * Static method to find active users by role
 * @param {string} role - Role to filter by
 * @returns {Promise<Array>} Array of users
 */
platformUserSchema.statics.findActiveByRole = function(role) {
  return this.find({ role, status: 'active' });
};

const PlatformUser = mongoose.model('PlatformUser', platformUserSchema);

module.exports = PlatformUser;
