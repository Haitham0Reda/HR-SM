import { DataTypes, Op } from 'sequelize';
import { mainAppDb } from '../../../config/database.js';

/**
 * License Model (Sequelize)
 * Manages tenant licenses with module access control
 */

// Module constants
const MODULES = {
    CORE_HR: 'hr-core',
    ATTENDANCE: 'attendance',
    LEAVE: 'leave',
    PAYROLL: 'payroll',
    DOCUMENTS: 'documents',
    COMMUNICATION: 'communication',
    REPORTING: 'reporting',
    TASKS: 'tasks',
    LOGGING: 'logging'
};

const PRICING_TIERS = ['starter', 'business', 'enterprise'];
const LICENSE_STATUS = ['active', 'trial', 'expired', 'suspended', 'cancelled'];
const BILLING_CYCLES = ['monthly', 'annual'];

const License = mainAppDb.define('License', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    tenantId: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        field: 'tenant_id'
    },
    licenseKey: {
        type: DataTypes.STRING(500),
        allowNull: false,
        unique: true,
        field: 'license_key'
    },
    status: {
        type: DataTypes.ENUM(...LICENSE_STATUS),
        defaultValue: 'trial'
    },
    tier: {
        type: DataTypes.ENUM(...PRICING_TIERS),
        defaultValue: 'starter'
    },
    billingCycle: {
        type: DataTypes.ENUM(...BILLING_CYCLES),
        defaultValue: 'monthly',
        field: 'billing_cycle'
    },
    // Enabled modules - stored as JSONB array
    enabledModules: {
        type: DataTypes.JSONB,
        defaultValue: [MODULES.CORE_HR],
        field: 'enabled_modules'
    },
    // License limits - stored as JSONB
    limits: {
        type: DataTypes.JSONB,
        defaultValue: {
            maxUsers: 10,
            maxStorage: 1073741824, // 1GB in bytes
            maxDepartments: 5,
            maxApiCalls: 1000
        }
    },
    // Usage tracking - stored as JSONB
    usage: {
        type: DataTypes.JSONB,
        defaultValue: {
            users: 0,
            storage: 0,
            departments: 0,
            apiCalls: 0,
            lastUpdated: null
        }
    },
    // Dates
    issuedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'issued_at'
    },
    expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'expires_at'
    },
    lastValidatedAt: {
        type: DataTypes.DATE,
        field: 'last_validated_at'
    },
    // Metadata
    metadata: {
        type: DataTypes.JSONB,
        defaultValue: {}
    }
}, {
    tableName: 'licenses',
    timestamps: true,
    underscored: true,
    indexes: [
        { fields: ['tenant_id'], unique: true },
        { fields: ['license_key'], unique: true },
        { fields: ['status'] },
        { fields: ['expires_at'] },
        { fields: ['tier'] }
    ]
});

// Instance methods

/**
 * Check if license is active
 * @returns {boolean}
 */
License.prototype.isActive = function() {
    return this.status === 'active' && new Date() < new Date(this.expiresAt);
};

/**
 * Check if license is expired
 * @returns {boolean}
 */
License.prototype.isExpired = function() {
    return new Date() >= new Date(this.expiresAt);
};

/**
 * Check if module is enabled
 * @param {string} moduleKey
 * @returns {boolean}
 */
License.prototype.hasModule = function(moduleKey) {
    const modules = this.enabledModules || [];
    return modules.includes(moduleKey);
};

/**
 * Enable a module
 * @param {string} moduleKey
 * @returns {Promise<License>}
 */
License.prototype.enableModule = async function(moduleKey) {
    const modules = this.enabledModules || [];
    if (!modules.includes(moduleKey)) {
        modules.push(moduleKey);
        this.enabledModules = modules;
        this.changed('enabledModules', true);
        return await this.save();
    }
    return this;
};

/**
 * Disable a module
 * @param {string} moduleKey
 * @returns {Promise<License>}
 */
License.prototype.disableModule = async function(moduleKey) {
    const modules = this.enabledModules || [];
    this.enabledModules = modules.filter(m => m !== moduleKey);
    this.changed('enabledModules', true);
    return await this.save();
};

/**
 * Check if usage is within limits
 * @returns {Object}
 */
License.prototype.checkLimits = function() {
    const limits = this.limits || {};
    const usage = this.usage || {};
    const violations = [];

    if (limits.maxUsers && usage.users > limits.maxUsers) {
        violations.push(`User limit exceeded: ${usage.users}/${limits.maxUsers}`);
    }

    if (limits.maxStorage && usage.storage > limits.maxStorage) {
        violations.push(`Storage limit exceeded: ${usage.storage}/${limits.maxStorage} bytes`);
    }

    if (limits.maxDepartments && usage.departments > limits.maxDepartments) {
        violations.push(`Department limit exceeded: ${usage.departments}/${limits.maxDepartments}`);
    }

    if (limits.maxApiCalls && usage.apiCalls > limits.maxApiCalls) {
        violations.push(`API calls limit exceeded: ${usage.apiCalls}/${limits.maxApiCalls}`);
    }

    return {
        withinLimits: violations.length === 0,
        violations,
        limits,
        usage
    };
};

/**
 * Update usage statistics
 * @param {Object} usageData
 * @returns {Promise<License>}
 */
License.prototype.updateUsage = async function(usageData) {
    this.usage = {
        ...this.usage,
        ...usageData,
        lastUpdated: new Date()
    };
    this.changed('usage', true);
    return await this.save();
};

/**
 * Validate and update last validated timestamp
 * @returns {Promise<License>}
 */
License.prototype.validate = async function() {
    this.lastValidatedAt = new Date();
    
    // Auto-expire if past expiration date
    if (this.isExpired() && this.status === 'active') {
        this.status = 'expired';
    }
    
    return await this.save();
};

/**
 * Get days until expiration
 * @returns {number}
 */
License.prototype.getDaysUntilExpiration = function() {
    const now = new Date();
    const expiry = new Date(this.expiresAt);
    const diffTime = expiry - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Static methods

/**
 * Find license by tenant ID
 * @param {string} tenantId
 * @returns {Promise<License>}
 */
License.findByTenantId = function(tenantId) {
    return this.findOne({ where: { tenantId } });
};

/**
 * Find all active licenses
 * @returns {Promise<Array>}
 */
License.findActiveLicenses = function() {
    return this.findAll({
        where: {
            status: 'active',
            expiresAt: { [Op.gt]: new Date() }
        }
    });
};

/**
 * Find expiring licenses (within days threshold)
 * @param {number} days
 * @returns {Promise<Array>}
 */
License.findExpiringLicenses = function(days = 30) {
    const now = new Date();
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + days);

    return this.findAll({
        where: {
            status: 'active',
            expiresAt: {
                [Op.gte]: now,
                [Op.lte]: threshold
            }
        },
        order: [['expiresAt', 'ASC']]
    });
};

/**
 * Find trial licenses
 * @returns {Promise<Array>}
 */
License.findTrialLicenses = function() {
    return this.findAll({
        where: { status: 'trial' }
    });
};

/**
 * Find licenses by tier
 * @param {string} tier
 * @returns {Promise<Array>}
 */
License.findByTier = function(tier) {
    return this.findAll({
        where: { tier }
    });
};

/**
 * Find licenses with specific module enabled
 * @param {string} moduleKey
 * @returns {Promise<Array>}
 */
License.findByModule = function(moduleKey) {
    return this.findAll({
        where: mainAppDb.literal(`enabled_modules @> '["${moduleKey}"]'::jsonb`)
    });
};

// Define associations
License.associate = (models) => {
    // Add associations here if needed
};

export default License;
export { MODULES, PRICING_TIERS, LICENSE_STATUS, BILLING_CYCLES };
