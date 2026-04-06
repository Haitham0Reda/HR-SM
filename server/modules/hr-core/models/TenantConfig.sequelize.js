import { DataTypes } from 'sequelize';
import { mainAppDb } from '../../../config/database.js';

const TenantConfig = mainAppDb.define('TenantConfig', {
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
    companyName: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'company_name'
    },
    deploymentMode: {
        type: DataTypes.ENUM('saas', 'on-premise'),
        defaultValue: 'saas',
        field: 'deployment_mode'
    },
    modules: {
        type: DataTypes.JSONB,
        defaultValue: {},
        comment: 'Map of module configurations with enabled, enabledAt, disabledAt'
    },
    subscription: {
        type: DataTypes.JSONB,
        defaultValue: {},
        comment: 'Contains plan, status, startDate, endDate, maxEmployees'
    },
    license: {
        type: DataTypes.JSONB,
        defaultValue: {},
        comment: 'Contains key, signature, issuedAt, expiresAt, maxEmployees, enabledModules'
    },
    settings: {
        type: DataTypes.JSONB,
        defaultValue: {
            timezone: 'UTC',
            dateFormat: 'YYYY-MM-DD',
            currency: 'USD',
            language: 'en'
        },
        comment: 'Contains timezone, dateFormat, currency, language'
    }
}, {
    tableName: 'tenant_configs',
    timestamps: true,
    underscored: true,
    indexes: [
        { fields: ['tenant_id'], unique: true }
    ],
    hooks: {
        beforeCreate: (tenantConfig) => {
            // Initialize modules with HR Core enabled by default
            if (!tenantConfig.modules || Object.keys(tenantConfig.modules).length === 0) {
                tenantConfig.modules = {
                    'hr-core': {
                        enabled: true,
                        enabledAt: new Date()
                    }
                };
            }

            // Initialize subscription with defaults
            if (!tenantConfig.subscription || Object.keys(tenantConfig.subscription).length === 0) {
                tenantConfig.subscription = {
                    plan: 'free',
                    status: 'active',
                    maxEmployees: 10
                };
            }

            // Initialize settings with defaults
            if (!tenantConfig.settings || Object.keys(tenantConfig.settings).length === 0) {
                tenantConfig.settings = {
                    timezone: 'UTC',
                    dateFormat: 'YYYY-MM-DD',
                    currency: 'USD',
                    language: 'en'
                };
            }
        }
    }
});

// Instance method: Check if module is enabled
TenantConfig.prototype.isModuleEnabled = function(moduleName) {
    // HR Core is always enabled
    if (moduleName === 'hr-core') return true;

    const moduleConfig = this.modules?.[moduleName];
    return moduleConfig?.enabled || false;
};

// Instance method: Enable module
TenantConfig.prototype.enableModule = function(moduleName) {
    // Validate module name (you may want to import MODULE_METADATA for validation)
    if (!moduleName) {
        throw new Error('Module name is required');
    }

    if (!this.modules) {
        this.modules = {};
    }

    this.modules[moduleName] = {
        enabled: true,
        enabledAt: new Date()
    };

    // Mark the field as changed for Sequelize to save it
    this.changed('modules', true);
};

// Instance method: Disable module
TenantConfig.prototype.disableModule = function(moduleName) {
    if (moduleName === 'hr-core') {
        throw new Error('Cannot disable HR Core module');
    }

    if (!this.modules) {
        this.modules = {};
    }

    const moduleConfig = this.modules[moduleName];
    if (moduleConfig) {
        this.modules[moduleName] = {
            ...moduleConfig,
            enabled: false,
            disabledAt: new Date()
        };

        // Mark the field as changed for Sequelize to save it
        this.changed('modules', true);
    }
};

// Instance method: Validate license for on-premise deployments
TenantConfig.prototype.validateLicense = function() {
    if (this.deploymentMode !== 'on-premise') return true;

    if (!this.license || !this.license.key) {
        return false;
    }

    if (this.license.expiresAt && new Date() > new Date(this.license.expiresAt)) {
        return false;
    }

    return true;
};

// Static method: Get config by tenant ID
TenantConfig.getByTenantId = async function(tenantId) {
    return await this.findOne({
        where: { tenantId }
    });
};

// Static method: Get all active tenants
TenantConfig.getActiveTenants = async function() {
    return await this.findAll({
        where: {
            'subscription.status': 'active'
        }
    });
};

// Define associations
TenantConfig.associate = (models) => {
    // TenantConfig doesn't have direct associations in the original model
    // Add any associations here if needed in the future
};

export default TenantConfig;
