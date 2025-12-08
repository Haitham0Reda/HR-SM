/**
 * Configuration Module Exports
 * 
 * Central export point for all configuration-related functionality
 */

// Module configuration schema and validation
export {
    moduleConfigSchema,
    validateModuleConfig,
    validatePricingTier,
    getModuleConfigSummary,
    ModuleConfigValidationError,
    PRICING_TIERS,
    LIMIT_TYPES
} from './moduleConfigSchema.js';

// Commercial module registry
export {
    commercialModuleConfigs,
    validateAllModuleConfigs,
    getModuleConfig,
    getAllModuleConfigs,
    getModulesByTier,
    getModulePricing,
    getModuleDependencies,
    hasFeatureInTier,
    getMarketingSummary
} from './commercialModuleRegistry.js';

// Module configuration helpers
export {
    createModuleConfigTemplate,
    formatStorageSize,
    parseStorageSize,
    comparePricingTiers,
    getNextTier,
    calculateMonthlyCost,
    calculateOnPremiseCost,
    checkLimitsAdequate,
    suggestTier,
    generateModuleConfigFile,
    getLimitTypeDisplayName,
    formatLimitValue
} from './createModuleConfig.js';

// Re-export existing module registry for backward compatibility
export { moduleRegistry, loadModuleRoutes, loadCoreRoutes, loadOptionalModuleRoutes } from './moduleRegistry.js';
