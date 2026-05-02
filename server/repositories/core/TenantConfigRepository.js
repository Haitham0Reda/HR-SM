import { Op, QueryTypes } from 'sequelize';
import BaseRepository from '../BaseRepository.js';
import TenantConfig from '../../modules/hr-core/models/TenantConfig.js';

class TenantConfigRepository extends BaseRepository {
    constructor() {
        super(TenantConfig);
    }

    async findByTenantId(tenantId, options = {}) {
        try {
            return await this.findOne({ tenantId }, options);
        } catch (error) {
            throw this._handleError(error, 'findByTenantId');
        }
    }

    async findByDeploymentMode(deploymentMode, options = {}) {
        try {
            return await this.findAll({ deploymentMode }, options);
        } catch (error) {
            throw this._handleError(error, 'findByDeploymentMode');
        }
    }

    async findBySubscriptionPlan(plan, options = {}) {
        try {
            const { tenantId } = options;
            const tenantFilter = tenantId ? `AND tenant_id = :tenantId` : '';
            return await this.model.sequelize.query(
                `SELECT * FROM tenant_configs WHERE subscription->>'plan' = :plan ${tenantFilter}`,
                {
                    replacements: { plan, ...(tenantId ? { tenantId } : {}) },
                    type: QueryTypes.SELECT,
                    model: this.model,
                    mapToModel: true
                }
            );
        } catch (error) {
            throw this._handleError(error, 'findBySubscriptionPlan');
        }
    }

    async findBySubscriptionStatus(status, options = {}) {
        try {
            const { tenantId } = options;
            const tenantFilter = tenantId ? `AND tenant_id = :tenantId` : '';
            return await this.model.sequelize.query(
                `SELECT * FROM tenant_configs WHERE subscription->>'status' = :status ${tenantFilter}`,
                {
                    replacements: { status, ...(tenantId ? { tenantId } : {}) },
                    type: QueryTypes.SELECT,
                    model: this.model,
                    mapToModel: true
                }
            );
        } catch (error) {
            throw this._handleError(error, 'findBySubscriptionStatus');
        }
    }

    async findWithEnabledModule(moduleName, options = {}) {
        try {
            const { tenantId } = options;
            const tenantFilter = tenantId ? `AND tenant_id = :tenantId` : '';
            return await this.model.sequelize.query(
                `SELECT * FROM tenant_configs WHERE (modules->:moduleName->>'enabled')::boolean = true ${tenantFilter}`,
                {
                    replacements: { moduleName, ...(tenantId ? { tenantId } : {}) },
                    type: QueryTypes.SELECT,
                    model: this.model,
                    mapToModel: true
                }
            );
        } catch (error) {
            throw this._handleError(error, 'findWithEnabledModule');
        }
    }

    async findWithExpiringSubscriptions(daysFromNow = 30, options = {}) {
        try {
            const expirationDate = new Date();
            expirationDate.setDate(expirationDate.getDate() + daysFromNow);
            const now = new Date();

            return await this.model.sequelize.query(
                `SELECT * FROM tenant_configs
                 WHERE subscription->>'status' = 'active'
                   AND (subscription->>'endDate')::timestamp <= :expirationDate
                   AND (subscription->>'endDate')::timestamp >= :now`,
                {
                    replacements: { expirationDate, now },
                    type: QueryTypes.SELECT,
                    model: this.model,
                    mapToModel: true
                }
            );
        } catch (error) {
            throw this._handleError(error, 'findWithExpiringSubscriptions');
        }
    }

    async findWithExpiringLicenses(daysFromNow = 30, options = {}) {
        try {
            const expirationDate = new Date();
            expirationDate.setDate(expirationDate.getDate() + daysFromNow);
            const now = new Date();

            return await this.model.sequelize.query(
                `SELECT * FROM tenant_configs
                 WHERE deployment_mode = 'on-premise'
                   AND (license->>'expiresAt')::timestamp <= :expirationDate
                   AND (license->>'expiresAt')::timestamp >= :now`,
                {
                    replacements: { expirationDate, now },
                    type: QueryTypes.SELECT,
                    model: this.model,
                    mapToModel: true
                }
            );
        } catch (error) {
            throw this._handleError(error, 'findWithExpiringLicenses');
        }
    }

    async searchByCompanyName(searchTerm, options = {}) {
        try {
            return await this.findAll(
                { companyName: { [Op.iLike]: `%${searchTerm}%` } },
                options
            );
        } catch (error) {
            throw this._handleError(error, 'searchByCompanyName');
        }
    }

    async enableModule(tenantId, moduleName, options = {}) {
        try {
            const config = await this.findByTenantId(tenantId);
            if (!config) throw new Error(`Tenant config not found for tenantId: ${tenantId}`);
            config.enableModule(moduleName);
            await config.save();
            return config;
        } catch (error) {
            throw this._handleError(error, 'enableModule');
        }
    }

    async disableModule(tenantId, moduleName, options = {}) {
        try {
            const config = await this.findByTenantId(tenantId);
            if (!config) throw new Error(`Tenant config not found for tenantId: ${tenantId}`);
            config.disableModule(moduleName);
            await config.save();
            return config;
        } catch (error) {
            throw this._handleError(error, 'disableModule');
        }
    }

    async updateSubscriptionPlan(tenantId, plan, subscriptionData = {}, options = {}) {
        try {
            const config = await this.model.findOne({ where: { tenantId } });
            if (!config) return null;

            const subscription = {
                ...config.subscription,
                plan,
                status: 'active',
                ...(subscriptionData.startDate ? { startDate: subscriptionData.startDate } : {}),
                ...(subscriptionData.endDate ? { endDate: subscriptionData.endDate } : {}),
                ...(subscriptionData.maxEmployees ? { maxEmployees: subscriptionData.maxEmployees } : {})
            };

            await config.update({ subscription });
            return config;
        } catch (error) {
            throw this._handleError(error, 'updateSubscriptionPlan');
        }
    }

    async updateLicense(tenantId, licenseData, options = {}) {
        try {
            const config = await this.model.findOne({ where: { tenantId } });
            if (!config) return null;

            await config.update({
                license: {
                    key: licenseData.key,
                    signature: licenseData.signature,
                    issuedAt: licenseData.issuedAt,
                    expiresAt: licenseData.expiresAt,
                    maxEmployees: licenseData.maxEmployees,
                    enabledModules: licenseData.enabledModules
                }
            });
            return config;
        } catch (error) {
            throw this._handleError(error, 'updateLicense');
        }
    }

    async updateSettings(tenantId, settings, options = {}) {
        try {
            const config = await this.model.findOne({ where: { tenantId } });
            if (!config) return null;

            const updatedSettings = {
                ...config.settings,
                ...(settings.timezone ? { timezone: settings.timezone } : {}),
                ...(settings.dateFormat ? { dateFormat: settings.dateFormat } : {}),
                ...(settings.currency ? { currency: settings.currency } : {}),
                ...(settings.language ? { language: settings.language } : {})
            };

            await config.update({ settings: updatedSettings });
            return config;
        } catch (error) {
            throw this._handleError(error, 'updateSettings');
        }
    }

    async getTenantStats(options = {}) {
        try {
            const [stats] = await this.model.sequelize.query(
                `SELECT
                   COUNT(*)                                                                   AS "totalTenants",
                   SUM(CASE WHEN deployment_mode = 'saas' THEN 1 ELSE 0 END)               AS "saasDeployments",
                   SUM(CASE WHEN deployment_mode = 'on-premise' THEN 1 ELSE 0 END)         AS "onPremiseDeployments",
                   SUM(CASE WHEN subscription->>'status' = 'active' THEN 1 ELSE 0 END)     AS "activeSubscriptions",
                   SUM(CASE WHEN subscription->>'status' = 'suspended' THEN 1 ELSE 0 END)  AS "suspendedSubscriptions",
                   SUM(CASE WHEN subscription->>'status' = 'cancelled' THEN 1 ELSE 0 END)  AS "cancelledSubscriptions"
                 FROM tenant_configs`,
                { type: QueryTypes.SELECT }
            );

            return stats || {
                totalTenants: 0,
                saasDeployments: 0,
                onPremiseDeployments: 0,
                activeSubscriptions: 0,
                suspendedSubscriptions: 0,
                cancelledSubscriptions: 0
            };
        } catch (error) {
            throw this._handleError(error, 'getTenantStats');
        }
    }

    async getSubscriptionPlanStats(options = {}) {
        try {
            return await this.model.sequelize.query(
                `SELECT
                   subscription->>'plan'                                                AS "plan",
                   COUNT(*)                                                             AS "totalTenants",
                   SUM(CASE WHEN subscription->>'status' = 'active' THEN 1 ELSE 0 END) AS "activeTenants"
                 FROM tenant_configs
                 GROUP BY subscription->>'plan'
                 ORDER BY COUNT(*) DESC`,
                { type: QueryTypes.SELECT }
            );
        } catch (error) {
            throw this._handleError(error, 'getSubscriptionPlanStats');
        }
    }

    async getModuleUsageStats(options = {}) {
        try {
            return await this.model.sequelize.query(
                `SELECT
                   key AS "moduleName",
                   COUNT(*) AS "enabledTenants"
                 FROM tenant_configs,
                 LATERAL jsonb_each(modules) AS module_entry(key, value)
                 WHERE (value->>'enabled')::boolean = true
                 GROUP BY key
                 ORDER BY COUNT(*) DESC`,
                { type: QueryTypes.SELECT }
            );
        } catch (error) {
            throw this._handleError(error, 'getModuleUsageStats');
        }
    }

    async validateTenantLicense(tenantId, options = {}) {
        try {
            const config = await this.findByTenantId(tenantId);
            if (!config) return false;
            return config.validateLicense();
        } catch (error) {
            throw this._handleError(error, 'validateTenantLicense');
        }
    }

    async isModuleEnabled(tenantId, moduleName, options = {}) {
        try {
            const config = await this.findByTenantId(tenantId);
            if (!config) return false;
            return config.isModuleEnabled(moduleName);
        } catch (error) {
            throw this._handleError(error, 'isModuleEnabled');
        }
    }
}

export default TenantConfigRepository;
