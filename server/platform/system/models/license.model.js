// models/license.model.js
import mongoose from 'mongoose';

const MODULES = {
    CORE_HR: 'hr-core',
    ATTENDANCE: 'attendance',
    LEAVE: 'leave',
    PAYROLL: 'payroll',
    DOCUMENTS: 'documents',
    COMMUNICATION: 'communication',
    REPORTING: 'reporting',
    TASKS: 'tasks'
};

const PRICING_TIERS = ['starter', 'business', 'enterprise'];
const LICENSE_STATUS = ['active', 'trial', 'expired', 'suspended', 'cancelled'];
const BILLING_CYCLES = ['monthly', 'annual'];

const moduleLicenseSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        enum: Object.values(MODULES)
    },
    enabled: {
        type: Boolean,
        default: false
    },
    tier: {
        type: String,
        enum: PRICING_TIERS,
        required: true
    },
    limits: {
        employees: {
            type: Number,
            default: null
        },
        storage: {
            type: Number,
            default: null
        },
        apiCalls: {
            type: Number,
            default: null
        },
        customLimits: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        }
    },
    activatedAt: {
        type: Date,
        default: null
    },
    expiresAt: {
        type: Date,
        default: null
    }
}, { _id: false });

const licenseSchema = new mongoose.Schema({
    tenantId: {
        type: String,
        required: true,
        index: true
    },
    subscriptionId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    modules: {
        type: [moduleLicenseSchema],
        default: []
    },
    billingCycle: {
        type: String,
        enum: BILLING_CYCLES,
        default: 'monthly'
    },
    status: {
        type: String,
        enum: LICENSE_STATUS,
        default: 'trial',
        index: true
    },
    trialEndsAt: {
        type: Date,
        default: null
    },
    paymentMethod: {
        type: String,
        default: null
    },
    billingEmail: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

// Compound indexes for efficient queries
licenseSchema.index({ tenantId: 1, status: 1 });
licenseSchema.index({ 'modules.key': 1, 'modules.enabled': 1 });
licenseSchema.index({ trialEndsAt: 1 });

/**
 * Get a specific module license by key
 * @param {string} moduleKey - The module key to find
 * @returns {Object|null} The module license or null
 */
licenseSchema.methods.getModuleLicense = function (moduleKey) {
    return this.modules.find(m => m.key === moduleKey) || null;
};

/**
 * Check if a module is enabled
 * @param {string} moduleKey - The module key to check
 * @returns {boolean} True if module is enabled
 */
licenseSchema.methods.isModuleEnabled = function (moduleKey) {
    const module = this.getModuleLicense(moduleKey);
    return module ? module.enabled : false;
};

/**
 * Check if license is expired
 * @returns {boolean} True if license is expired
 */
licenseSchema.methods.isExpired = function () {
    if (this.status === 'expired') {
        return true;
    }

    // Check if any module has expired
    const now = new Date();
    return this.modules.some(m => m.expiresAt && m.expiresAt < now);
};

/**
 * Check if license is in trial period
 * @returns {boolean} True if in trial
 */
licenseSchema.methods.isInTrial = function () {
    if (this.status !== 'trial') {
        return false;
    }

    if (!this.trialEndsAt) {
        return false;
    }

    return new Date() < this.trialEndsAt;
};

/**
 * Get days until expiration for a module
 * @param {string} moduleKey - The module key
 * @returns {number|null} Days until expiration or null
 */
licenseSchema.methods.getDaysUntilExpiration = function (moduleKey) {
    const module = this.getModuleLicense(moduleKey);

    if (!module || !module.expiresAt) {
        return null;
    }

    const now = new Date();
    const expiresAt = new Date(module.expiresAt);
    const diffTime = expiresAt - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
};

/**
 * Activate a module
 * @param {string} moduleKey - The module key to activate
 * @param {string} tier - The pricing tier
 * @param {Object} limits - The usage limits
 * @param {Date} expiresAt - Expiration date
 * @returns {Promise<License>} Updated license
 */
licenseSchema.methods.activateModule = async function (moduleKey, tier, limits = {}, expiresAt = null) {
    let module = this.getModuleLicense(moduleKey);

    if (module) {
        // Update existing module
        module.enabled = true;
        module.tier = tier;
        module.limits = { ...module.limits, ...limits };
        module.activatedAt = new Date();
        module.expiresAt = expiresAt;
    } else {
        // Add new module
        this.modules.push({
            key: moduleKey,
            enabled: true,
            tier,
            limits,
            activatedAt: new Date(),
            expiresAt
        });
    }

    return await this.save();
};

/**
 * Deactivate a module
 * @param {string} moduleKey - The module key to deactivate
 * @returns {Promise<License>} Updated license
 */
licenseSchema.methods.deactivateModule = async function (moduleKey) {
    const module = this.getModuleLicense(moduleKey);

    if (module) {
        module.enabled = false;
    }

    return await this.save();
};

/**
 * Static method to find license by tenant ID
 * @param {string} tenantId - The tenant ID
 * @returns {Promise<License|null>} The license or null
 */
licenseSchema.statics.findByTenantId = function (tenantId) {
    return this.findOne({ tenantId });
};

/**
 * Static method to find active licenses
 * @returns {Promise<License[]>} Array of active licenses
 */
licenseSchema.statics.findActiveLicenses = function () {
    return this.find({ status: 'active' });
};

/**
 * Static method to find expiring licenses
 * @param {number} daysThreshold - Days until expiration threshold
 * @returns {Promise<License[]>} Array of expiring licenses
 */
licenseSchema.statics.findExpiringLicenses = function (daysThreshold = 30) {
    const now = new Date();
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

    return this.find({
        status: 'active',
        'modules.expiresAt': {
            $gte: now,
            $lte: thresholdDate
        }
    });
};

/**
 * Static method to find trial licenses
 * @returns {Promise<License[]>} Array of trial licenses
 */
licenseSchema.statics.findTrialLicenses = function () {
    return this.find({ status: 'trial' });
};

export default mongoose.model('License', licenseSchema);
export { MODULES, PRICING_TIERS, LICENSE_STATUS, BILLING_CYCLES };
