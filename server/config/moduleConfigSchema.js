/**
 * Module Configuration Schema and Validation
 * 
 * This file defines the schema for module.config.js files and provides
 * validation functions to ensure all modules follow the correct structure.
 */

export const PRICING_TIERS = {
    STARTER: 'starter',
    BUSINESS: 'business',
    ENTERPRISE: 'enterprise'
};

export const LIMIT_TYPES = {
    EMPLOYEES: 'employees',
    DEVICES: 'devices',
    STORAGE: 'storage',
    API_CALLS: 'apiCalls',
    RECORDS: 'records'
};

/**
 * Schema definition for module configuration
 */
export const moduleConfigSchema = {
    // Module identification (required)
    key: {
        type: 'string',
        required: true,
        pattern: /^[a-z][a-z0-9-]*$/,
        description: 'Unique module identifier in kebab-case'
    },
    displayName: {
        type: 'string',
        required: true,
        minLength: 3,
        maxLength: 100,
        description: 'Human-readable module name'
    },
    version: {
        type: 'string',
        required: true,
        pattern: /^\d+\.\d+\.\d+$/,
        description: 'Semantic version (e.g., 1.0.0)'
    },

    // Commercial information (required)
    commercial: {
        type: 'object',
        required: true,
        properties: {
            description: {
                type: 'string',
                required: true,
                minLength: 20,
                maxLength: 500,
                description: 'Marketing description of the module'
            },
            targetSegment: {
                type: 'string',
                required: true,
                minLength: 10,
                maxLength: 200,
                description: 'Target customer segment'
            },
            valueProposition: {
                type: 'string',
                required: true,
                minLength: 20,
                maxLength: 500,
                description: 'Value proposition for customers'
            },
            pricing: {
                type: 'object',
                required: true,
                properties: {
                    starter: {
                        type: 'object',
                        required: true,
                        properties: {
                            monthly: { type: 'number', required: true, min: 0 },
                            onPremise: { type: 'number', required: true, min: 0 },
                            limits: { type: 'object', required: true }
                        }
                    },
                    business: {
                        type: 'object',
                        required: true,
                        properties: {
                            monthly: { type: 'number', required: true, min: 0 },
                            onPremise: { type: 'number', required: true, min: 0 },
                            limits: { type: 'object', required: true }
                        }
                    },
                    enterprise: {
                        type: 'object',
                        required: true,
                        properties: {
                            monthly: { type: ['number', 'string'], required: true },
                            onPremise: { type: ['number', 'string'], required: true },
                            limits: { type: 'object', required: true }
                        }
                    }
                }
            }
        }
    },

    // Technical dependencies (required)
    dependencies: {
        type: 'object',
        required: true,
        properties: {
            required: {
                type: 'array',
                required: true,
                items: { type: 'string' },
                description: 'Modules that must be enabled'
            },
            optional: {
                type: 'array',
                required: false,
                items: { type: 'string' },
                description: 'Modules that enhance functionality if enabled'
            }
        }
    },

    // Feature flags within module (optional)
    features: {
        type: 'object',
        required: false,
        description: 'Feature flags with tier requirements'
    },

    // Integration points (optional)
    integrations: {
        type: 'object',
        required: false,
        properties: {
            provides: {
                type: 'array',
                items: { type: 'string' },
                description: 'Data/services this module provides'
            },
            consumes: {
                type: 'array',
                items: { type: 'string' },
                description: 'Data/services this module consumes'
            }
        }
    }
};

/**
 * Validation error class
 */
export class ModuleConfigValidationError extends Error {
    constructor(message, errors = []) {
        super(message);
        this.name = 'ModuleConfigValidationError';
        this.errors = errors;
    }
}

/**
 * Validate a value against a schema property
 */
function validateProperty(value, schema, path = '') {
    const errors = [];

    // Check required
    if (schema.required && (value === undefined || value === null)) {
        errors.push(`${path} is required`);
        return errors;
    }

    // If not required and value is undefined, skip validation
    if (!schema.required && (value === undefined || value === null)) {
        return errors;
    }

    // Check type
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    const actualType = Array.isArray(value) ? 'array' : typeof value;

    if (!types.includes(actualType)) {
        errors.push(`${path} must be of type ${types.join(' or ')}, got ${actualType}`);
        return errors;
    }

    // Type-specific validations
    if (actualType === 'string') {
        if (schema.minLength && value.length < schema.minLength) {
            errors.push(`${path} must be at least ${schema.minLength} characters`);
        }
        if (schema.maxLength && value.length > schema.maxLength) {
            errors.push(`${path} must be at most ${schema.maxLength} characters`);
        }
        if (schema.pattern && !schema.pattern.test(value)) {
            errors.push(`${path} does not match required pattern`);
        }
    }

    if (actualType === 'number') {
        if (schema.min !== undefined && value < schema.min) {
            errors.push(`${path} must be at least ${schema.min}`);
        }
        if (schema.max !== undefined && value > schema.max) {
            errors.push(`${path} must be at most ${schema.max}`);
        }
    }

    if (actualType === 'array') {
        if (schema.items) {
            value.forEach((item, index) => {
                const itemErrors = validateProperty(item, schema.items, `${path}[${index}]`);
                errors.push(...itemErrors);
            });
        }
    }

    if (actualType === 'object' && schema.properties) {
        for (const [key, propSchema] of Object.entries(schema.properties)) {
            const propErrors = validateProperty(value[key], propSchema, `${path}.${key}`);
            errors.push(...propErrors);
        }
    }

    return errors;
}

/**
 * Validate a complete module configuration
 */
export function validateModuleConfig(config) {
    const errors = [];

    // Validate top-level properties
    for (const [key, schema] of Object.entries(moduleConfigSchema)) {
        const propErrors = validateProperty(config[key], schema, key);
        errors.push(...propErrors);
    }

    // Additional business logic validations
    if (config.commercial?.pricing) {
        const { starter, business, enterprise } = config.commercial.pricing;

        // Validate pricing progression (starter <= business <= enterprise)
        if (typeof starter?.monthly === 'number' && typeof business?.monthly === 'number') {
            if (starter.monthly > business.monthly) {
                errors.push('Starter monthly price must be less than or equal to Business price');
            }
        }

        // Validate that all tiers have the same limit types
        const starterLimits = Object.keys(starter?.limits || {});
        const businessLimits = Object.keys(business?.limits || {});
        const enterpriseLimits = Object.keys(enterprise?.limits || {});

        const allLimitTypes = new Set([...starterLimits, ...businessLimits, ...enterpriseLimits]);

        for (const limitType of allLimitTypes) {
            if (!starterLimits.includes(limitType)) {
                errors.push(`Starter tier missing limit type: ${limitType}`);
            }
            if (!businessLimits.includes(limitType)) {
                errors.push(`Business tier missing limit type: ${limitType}`);
            }
            if (!enterpriseLimits.includes(limitType)) {
                errors.push(`Enterprise tier missing limit type: ${limitType}`);
            }
        }
    }

    // Validate dependencies don't include self
    if (config.dependencies?.required?.includes(config.key)) {
        errors.push('Module cannot depend on itself');
    }
    if (config.dependencies?.optional?.includes(config.key)) {
        errors.push('Module cannot have itself as optional dependency');
    }

    if (errors.length > 0) {
        throw new ModuleConfigValidationError(
            `Module configuration validation failed for "${config.key || 'unknown'}"`,
            errors
        );
    }

    return true;
}

/**
 * Validate pricing tier structure
 */
export function validatePricingTier(tier, tierName) {
    const errors = [];

    if (!tier) {
        errors.push(`${tierName} tier is missing`);
        return errors;
    }

    if (typeof tier.monthly !== 'number' && tier.monthly !== 'custom') {
        errors.push(`${tierName}.monthly must be a number or "custom"`);
    }

    if (typeof tier.onPremise !== 'number' && tier.onPremise !== 'custom') {
        errors.push(`${tierName}.onPremise must be a number or "custom"`);
    }

    if (!tier.limits || typeof tier.limits !== 'object') {
        errors.push(`${tierName}.limits must be an object`);
    }

    return errors;
}

/**
 * Get a human-readable summary of a module config
 */
export function getModuleConfigSummary(config) {
    return {
        key: config.key,
        displayName: config.displayName,
        version: config.version,
        description: config.commercial?.description,
        targetSegment: config.commercial?.targetSegment,
        requiredDependencies: config.dependencies?.required || [],
        optionalDependencies: config.dependencies?.optional || [],
        pricingTiers: Object.keys(config.commercial?.pricing || {}),
        features: Object.keys(config.features || {})
    };
}

export default {
    moduleConfigSchema,
    validateModuleConfig,
    validatePricingTier,
    getModuleConfigSummary,
    ModuleConfigValidationError,
    PRICING_TIERS,
    LIMIT_TYPES
};
