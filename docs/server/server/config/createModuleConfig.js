/**
 * Module Configuration Helper
 * 
 * Utility functions to help create and manage module.config.js files
 */

import { validateModuleConfig, PRICING_TIERS, LIMIT_TYPES } from './moduleConfigSchema.js';

/**
 * Create a module configuration template
 */
export function createModuleConfigTemplate(moduleKey, displayName) {
    return {
        key: moduleKey,
        displayName: displayName,
        version: '1.0.0',

        commercial: {
            description: 'TODO: Add marketing description (20-500 characters)',
            targetSegment: 'TODO: Define target customer segment',
            valueProposition: 'TODO: Describe value proposition',

            pricing: {
                starter: {
                    monthly: 0, // TODO: Set monthly price per employee
                    onPremise: 0, // TODO: Set one-time on-premise price
                    limits: {
                        employees: 50,
                        storage: 1073741824, // 1GB
                        apiCalls: 10000,
                        records: 5000
                    }
                },
                business: {
                    monthly: 0,
                    onPremise: 0,
                    limits: {
                        employees: 200,
                        storage: 10737418240, // 10GB
                        apiCalls: 50000,
                        records: 25000
                    }
                },
                enterprise: {
                    monthly: 'custom',
                    onPremise: 'custom',
                    limits: {
                        employees: 'unlimited',
                        storage: 'unlimited',
                        apiCalls: 'unlimited',
                        records: 'unlimited'
                    }
                }
            }
        },

        dependencies: {
            required: ['hr-core'], // Always include hr-core
            optional: []
        },

        features: {
            // Example: basicFeature: { tier: 'starter' }
        },

        integrations: {
            provides: [],
            consumes: []
        }
    };
}

/**
 * Format storage size in human-readable format
 */
export function formatStorageSize(bytes) {
    if (bytes === 'unlimited') return 'unlimited';

    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }

    return `${Math.round(size * 100) / 100}${units[unitIndex]}`;
}

/**
 * Parse storage size string to bytes
 */
export function parseStorageSize(sizeStr) {
    if (sizeStr === 'unlimited') return 'unlimited';

    const match = sizeStr.match(/^(\d+(?:\.\d+)?)(B|KB|MB|GB|TB)$/i);
    if (!match) {
        throw new Error(`Invalid storage size format: ${sizeStr}`);
    }

    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();

    const multipliers = {
        'B': 1,
        'KB': 1024,
        'MB': 1024 * 1024,
        'GB': 1024 * 1024 * 1024,
        'TB': 1024 * 1024 * 1024 * 1024
    };

    return Math.floor(value * multipliers[unit]);
}

/**
 * Compare two pricing tiers
 */
export function comparePricingTiers(tier1, tier2) {
    const hierarchy = {
        [PRICING_TIERS.STARTER]: 1,
        [PRICING_TIERS.BUSINESS]: 2,
        [PRICING_TIERS.ENTERPRISE]: 3
    };

    return hierarchy[tier1] - hierarchy[tier2];
}

/**
 * Get the next tier up
 */
export function getNextTier(currentTier) {
    const tiers = [
        PRICING_TIERS.STARTER,
        PRICING_TIERS.BUSINESS,
        PRICING_TIERS.ENTERPRISE
    ];

    const currentIndex = tiers.indexOf(currentTier);
    if (currentIndex === -1 || currentIndex === tiers.length - 1) {
        return null;
    }

    return tiers[currentIndex + 1];
}

/**
 * Calculate total monthly cost for multiple modules
 */
export function calculateMonthlyCost(moduleConfigs, tier, employeeCount) {
    let total = 0;

    for (const config of moduleConfigs) {
        const pricing = config.commercial.pricing[tier];
        if (!pricing) continue;

        if (typeof pricing.monthly === 'number') {
            total += pricing.monthly * employeeCount;
        }
        // 'custom' pricing is handled separately
    }

    return total;
}

/**
 * Calculate total on-premise cost for multiple modules
 */
export function calculateOnPremiseCost(moduleConfigs, tier) {
    let total = 0;

    for (const config of moduleConfigs) {
        const pricing = config.commercial.pricing[tier];
        if (!pricing) continue;

        if (typeof pricing.onPremise === 'number') {
            total += pricing.onPremise;
        }
        // 'custom' pricing is handled separately
    }

    return total;
}

/**
 * Check if limits are sufficient for usage
 */
export function checkLimitsAdequate(limits, usage) {
    const inadequate = [];

    for (const [limitType, limitValue] of Object.entries(limits)) {
        if (limitValue === 'unlimited') continue;

        const usageValue = usage[limitType];
        if (usageValue === undefined) continue;

        if (usageValue > limitValue) {
            inadequate.push({
                type: limitType,
                limit: limitValue,
                usage: usageValue,
                exceeded: usageValue - limitValue
            });
        }
    }

    return inadequate.length > 0 ? inadequate : null;
}

/**
 * Suggest appropriate tier based on usage
 */
export function suggestTier(moduleConfig, usage) {
    const tiers = [
        PRICING_TIERS.STARTER,
        PRICING_TIERS.BUSINESS,
        PRICING_TIERS.ENTERPRISE
    ];

    for (const tier of tiers) {
        const limits = moduleConfig.commercial.pricing[tier].limits;
        const inadequate = checkLimitsAdequate(limits, usage);

        if (!inadequate) {
            return tier;
        }
    }

    return PRICING_TIERS.ENTERPRISE;
}

/**
 * Generate a module config file content as string
 */
export function generateModuleConfigFile(config) {
    // Validate first
    validateModuleConfig(config);

    return `/**
 * Module Configuration: ${config.displayName}
 * 
 * This file defines the commercial metadata, pricing tiers, and technical
 * specifications for the ${config.displayName} module.
 */

export default ${JSON.stringify(config, null, 2)};
`;
}

/**
 * Get limit type display name
 */
export function getLimitTypeDisplayName(limitType) {
    const displayNames = {
        [LIMIT_TYPES.EMPLOYEES]: 'Employees',
        [LIMIT_TYPES.DEVICES]: 'Devices',
        [LIMIT_TYPES.STORAGE]: 'Storage',
        [LIMIT_TYPES.API_CALLS]: 'API Calls',
        [LIMIT_TYPES.RECORDS]: 'Records'
    };

    return displayNames[limitType] || limitType;
}

/**
 * Format limit value for display
 */
export function formatLimitValue(limitType, value) {
    if (value === 'unlimited') return 'Unlimited';

    if (limitType === LIMIT_TYPES.STORAGE) {
        return formatStorageSize(value);
    }

    if (typeof value === 'number') {
        return value.toLocaleString();
    }

    return String(value);
}

export default {
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
};
