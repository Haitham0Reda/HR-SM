import mongoose from 'mongoose';
import { MODULES, MODULE_METADATA } from '../../../shared/constants/modules.js';

const tenantConfigSchema = new mongoose.Schema({
    tenantId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    companyName: {
        type: String,
        required: true
    },
    deploymentMode: {
        type: String,
        enum: ['saas', 'on-premise'],
        default: 'saas'
    },
    modules: {
        type: Map,
        of: {
            enabled: { type: Boolean, default: false },
            enabledAt: Date,
            disabledAt: Date
        },
        default: () => {
            const defaultModules = new Map();
            // HR Core is always enabled
            defaultModules.set(MODULES.HR_CORE, { enabled: true, enabledAt: new Date() });
            return defaultModules;
        }
    },
    subscription: {
        plan: {
            type: String,
            enum: ['free', 'basic', 'professional', 'enterprise'],
            default: 'free'
        },
        status: {
            type: String,
            enum: ['active', 'suspended', 'cancelled'],
            default: 'active'
        },
        startDate: Date,
        endDate: Date,
        maxEmployees: {
            type: Number,
            default: 10
        }
    },
    license: {
        key: String,
        signature: String,
        issuedAt: Date,
        expiresAt: Date,
        maxEmployees: Number,
        enabledModules: [String]
    },
    settings: {
        timezone: { type: String, default: 'UTC' },
        dateFormat: { type: String, default: 'YYYY-MM-DD' },
        currency: { type: String, default: 'USD' },
        language: { type: String, default: 'en' }
    }
}, {
    timestamps: true
});

// Method to check if module is enabled
tenantConfigSchema.methods.isModuleEnabled = function (moduleName) {
    if (moduleName === MODULES.HR_CORE) return true;

    const moduleConfig = this.modules.get(moduleName);
    return moduleConfig?.enabled || false;
};

// Method to enable module
tenantConfigSchema.methods.enableModule = function (moduleName) {
    if (!MODULE_METADATA[moduleName]) {
        throw new Error(`Invalid module: ${moduleName}`);
    }

    this.modules.set(moduleName, {
        enabled: true,
        enabledAt: new Date()
    });
};

// Method to disable module
tenantConfigSchema.methods.disableModule = function (moduleName) {
    if (moduleName === MODULES.HR_CORE) {
        throw new Error('Cannot disable HR Core module');
    }

    const moduleConfig = this.modules.get(moduleName);
    if (moduleConfig) {
        moduleConfig.enabled = false;
        moduleConfig.disabledAt = new Date();
        this.modules.set(moduleName, moduleConfig);
    }
};

// Validate license for on-premise deployments
tenantConfigSchema.methods.validateLicense = function () {
    if (this.deploymentMode !== 'on-premise') return true;

    if (!this.license || !this.license.key) {
        return false;
    }

    if (this.license.expiresAt && new Date() > this.license.expiresAt) {
        return false;
    }

    return true;
};

const TenantConfig = mongoose.model('TenantConfig', tenantConfigSchema);

export default TenantConfig;
