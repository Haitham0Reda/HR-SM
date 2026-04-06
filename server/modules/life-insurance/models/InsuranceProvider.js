/**
 * Insurance Provider Model (Sequelize)
 */
import { DataTypes } from 'sequelize';
import { mainAppDb } from '../../../config/database.js';

const InsuranceProvider = mainAppDb.define('InsuranceProvider', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    tenantId: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'tenant_id'
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    nameArabic: {
        type: DataTypes.STRING(100),
        field: 'name_arabic'
    },
    code: {
        type: DataTypes.STRING(10),
        allowNull: false
    },
    // Contact information - stored as JSONB
    contactInfo: {
        type: DataTypes.JSONB,
        defaultValue: {},
        field: 'contact_info'
    },
    licenseNumber: {
        type: DataTypes.STRING(100),
        field: 'license_number'
    },
    establishedYear: {
        type: DataTypes.INTEGER,
        validate: {
            min: 1900,
            max: () => new Date().getFullYear()
        },
        field: 'established_year'
    },
    // Insurance types - stored as JSONB array
    insuranceTypes: {
        type: DataTypes.JSONB,
        defaultValue: [],
        field: 'insurance_types'
    },
    // Coverage areas - stored as JSONB array
    coverageAreas: {
        type: DataTypes.JSONB,
        defaultValue: [],
        field: 'coverage_areas'
    },
    // Financial information - stored as JSONB
    financialInfo: {
        type: DataTypes.JSONB,
        defaultValue: {
            currency: 'EGP',
            paymentTerms: 'monthly',
            commissionRate: 0
        },
        field: 'financial_info'
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive', 'suspended', 'pending'),
        defaultValue: 'active'
    },
    rating: {
        type: DataTypes.DECIMAL(2, 1),
        defaultValue: 3.0,
        validate: { min: 1, max: 5 }
    },
    // Contract information - stored as JSONB
    contractInfo: {
        type: DataTypes.JSONB,
        defaultValue: {},
        field: 'contract_info'
    },
    description: {
        type: DataTypes.TEXT
    },
    notes: {
        type: DataTypes.TEXT
    },
    createdBy: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        },
        field: 'created_by'
    },
    updatedBy: {
        type: DataTypes.UUID,
        references: {
            model: 'users',
            key: 'id'
        },
        field: 'updated_by'
    },
    // History - stored as JSONB array
    history: {
        type: DataTypes.JSONB,
        defaultValue: []
    }
}, {
    tableName: 'insurance_providers',
    timestamps: true,
    underscored: true,
    indexes: [
        { fields: ['tenant_id'] },
        { fields: ['tenant_id', 'code'], unique: true },
        { fields: ['tenant_id', 'name'] },
        { fields: ['tenant_id', 'status'] },
        { fields: ['status'] }
    ],
    hooks: {
        beforeCreate: (provider) => {
            // Auto-generate code if not provided
            if (!provider.code && provider.name) {
                provider.code = provider.name.replace(/[^A-Z0-9]/gi, '').substring(0, 10).toUpperCase();
            }
        },
        beforeUpdate: (provider) => {
            // Add history entry for updates
            if (provider.changed()) {
                const changes = {};
                provider.changed().forEach(field => {
                    if (field !== 'history' && field !== 'updatedAt') {
                        changes[field] = {
                            from: provider._previousDataValues[field],
                            to: provider.getDataValue(field)
                        };
                    }
                });
                
                const history = [...(provider.history || [])];
                history.push({
                    action: 'updated',
                    performedBy: provider.updatedBy,
                    timestamp: new Date(),
                    changes
                });
                provider.history = history;
            }
        }
    }
});

/**
 * Define associations
 */
InsuranceProvider.associate = (models) => {
    InsuranceProvider.belongsTo(models.User, {
        foreignKey: 'createdBy',
        as: 'creator'
    });
    InsuranceProvider.belongsTo(models.User, {
        foreignKey: 'updatedBy',
        as: 'updater'
    });
};

/**
 * Instance method: Get full name with Arabic
 */
InsuranceProvider.prototype.getFullName = function () {
    return this.nameArabic ? `${this.name} (${this.nameArabic})` : this.name;
};

/**
 * Instance method: Activate provider
 */
InsuranceProvider.prototype.activate = async function (userId) {
    this.status = 'active';
    this.updatedBy = userId;
    
    const history = [...(this.history || [])];
    history.push({
        action: 'activated',
        performedBy: userId,
        timestamp: new Date()
    });
    this.history = history;
    
    return await this.save();
};

/**
 * Instance method: Deactivate provider
 */
InsuranceProvider.prototype.deactivate = async function (userId, reason) {
    this.status = 'inactive';
    this.updatedBy = userId;
    
    const history = [...(this.history || [])];
    history.push({
        action: 'deactivated',
        performedBy: userId,
        timestamp: new Date(),
        notes: reason
    });
    this.history = history;
    
    return await this.save();
};

/**
 * Static method: Find providers by tenant
 */
InsuranceProvider.findByTenant = function (tenantId, options = {}) {
    const where = { tenantId };
    
    if (options.status) {
        where.status = options.status;
    }
    
    if (options.insuranceType) {
        // For JSONB array contains query
        where.insuranceTypes = { [Op.contains]: [options.insuranceType] };
    }
    
    return this.findAll({
        where,
        include: [
            {
                model: mainAppDb.models.User,
                as: 'creator',
                attributes: ['firstName', 'lastName', 'email']
            },
            {
                model: mainAppDb.models.User,
                as: 'updater',
                attributes: ['firstName', 'lastName', 'email']
            }
        ],
        order: options.sort || [['name', 'ASC']]
    });
};

/**
 * Static method: Find active providers
 */
InsuranceProvider.findActiveProviders = function (tenantId) {
    return this.findByTenant(tenantId, { status: 'active' });
};

export default InsuranceProvider;
