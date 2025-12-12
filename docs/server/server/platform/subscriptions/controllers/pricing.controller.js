/**
 * Pricing Controller
 * 
 * Handles pricing quote generation and calculations for module subscriptions
 */

import { commercialModuleConfigs } from '../../../config/commercialModuleRegistry.js';
import logger from '../../../utils/logger.js';

/**
 * Bundle discount configuration
 */
const BUNDLE_DISCOUNTS = {
    THREE_MODULES: { threshold: 3, rate: 0.10 },
    FIVE_MODULES: { threshold: 5, rate: 0.15 }
};

/**
 * Calculate bundle discount based on module count
 */
function calculateBundleDiscount(moduleCount, subtotal) {
    let discountRate = 0;

    if (moduleCount >= BUNDLE_DISCOUNTS.FIVE_MODULES.threshold) {
        discountRate = BUNDLE_DISCOUNTS.FIVE_MODULES.rate;
    } else if (moduleCount >= BUNDLE_DISCOUNTS.THREE_MODULES.threshold) {
        discountRate = BUNDLE_DISCOUNTS.THREE_MODULES.rate;
    }

    return {
        rate: discountRate,
        amount: subtotal * discountRate
    };
}

/**
 * Calculate monthly SaaS pricing
 */
function calculateMonthlyCost(modules) {
    const breakdown = [];
    let subtotal = 0;
    let hasCustomPricing = false;

    for (const module of modules) {
        const { moduleKey, tier, employeeCount = 1 } = module;
        const config = commercialModuleConfigs[moduleKey];

        if (!config) {
            throw new Error(`Invalid module key: ${moduleKey}`);
        }

        const pricing = config.commercial?.pricing?.[tier];
        if (!pricing) {
            throw new Error(`Invalid tier ${tier} for module ${moduleKey}`);
        }

        if (pricing.monthly === 'custom') {
            hasCustomPricing = true;
            breakdown.push({
                moduleKey,
                moduleName: config.displayName,
                tier,
                pricePerEmployee: 'custom',
                employeeCount,
                cost: 'custom',
                isCustom: true
            });
            continue;
        }

        const moduleCost = pricing.monthly * employeeCount;
        breakdown.push({
            moduleKey,
            moduleName: config.displayName,
            tier,
            pricePerEmployee: pricing.monthly,
            employeeCount,
            cost: moduleCost,
            limits: pricing.limits,
            isCustom: false
        });

        subtotal += moduleCost;
    }

    const discount = calculateBundleDiscount(modules.length, subtotal);

    return {
        subtotal,
        discount: discount.amount,
        discountRate: discount.rate,
        total: subtotal - discount.amount,
        breakdown,
        moduleCount: modules.length,
        hasCustomPricing
    };
}

/**
 * Calculate one-time On-Premise pricing
 */
function calculateOnPremiseCost(modules) {
    const breakdown = [];
    let subtotal = 0;
    let hasCustomPricing = false;

    for (const module of modules) {
        const { moduleKey, tier } = module;
        const config = commercialModuleConfigs[moduleKey];

        if (!config) {
            throw new Error(`Invalid module key: ${moduleKey}`);
        }

        const pricing = config.commercial?.pricing?.[tier];
        if (!pricing) {
            throw new Error(`Invalid tier ${tier} for module ${moduleKey}`);
        }

        if (pricing.onPremise === 'custom') {
            hasCustomPricing = true;
            breakdown.push({
                moduleKey,
                moduleName: config.displayName,
                tier,
                cost: 'custom',
                isCustom: true
            });
            continue;
        }

        const moduleCost = pricing.onPremise;
        breakdown.push({
            moduleKey,
            moduleName: config.displayName,
            tier,
            cost: moduleCost,
            limits: pricing.limits,
            isCustom: false
        });

        subtotal += moduleCost;
    }

    const discount = calculateBundleDiscount(modules.length, subtotal);

    return {
        subtotal,
        discount: discount.amount,
        discountRate: discount.rate,
        total: subtotal - discount.amount,
        breakdown,
        moduleCount: modules.length,
        hasCustomPricing
    };
}

/**
 * POST /api/v1/pricing/quote
 * Generate a pricing quote for selected modules
 * 
 * Request body:
 * {
 *   deploymentType: 'saas' | 'onpremise',
 *   modules: [{ moduleKey, tier, employeeCount? }],
 *   companyName?: string,
 *   contactEmail?: string,
 *   billingCycle?: 'monthly' | 'annual'
 * }
 */
export const generateQuote = async (req, res) => {
    try {
        const {
            deploymentType,
            modules,
            companyName,
            contactEmail,
            billingCycle = 'monthly'
        } = req.body;

        // Validate request
        if (!deploymentType || !['saas', 'onpremise'].includes(deploymentType)) {
            return res.status(400).json({
                error: 'INVALID_DEPLOYMENT_TYPE',
                message: 'deploymentType must be either "saas" or "onpremise"'
            });
        }

        if (!modules || !Array.isArray(modules) || modules.length === 0) {
            return res.status(400).json({
                error: 'INVALID_MODULES',
                message: 'modules array is required and must not be empty'
            });
        }

        // Validate each module selection
        for (const module of modules) {
            if (!module.moduleKey || !module.tier) {
                return res.status(400).json({
                    error: 'INVALID_MODULE_SELECTION',
                    message: 'Each module must have moduleKey and tier'
                });
            }

            if (!['starter', 'business', 'enterprise'].includes(module.tier)) {
                return res.status(400).json({
                    error: 'INVALID_TIER',
                    message: `Invalid tier: ${module.tier}. Must be starter, business, or enterprise`
                });
            }

            if (deploymentType === 'saas' && module.employeeCount && module.employeeCount < 1) {
                return res.status(400).json({
                    error: 'INVALID_EMPLOYEE_COUNT',
                    message: 'employeeCount must be at least 1'
                });
            }
        }

        // Calculate pricing based on deployment type
        let pricing;
        if (deploymentType === 'saas') {
            pricing = calculateMonthlyCost(modules);
        } else {
            pricing = calculateOnPremiseCost(modules);
        }

        // Build quote response
        const quote = {
            quoteId: `QUOTE-${Date.now()}`,
            generatedAt: new Date().toISOString(),
            deploymentType,
            billingCycle: deploymentType === 'saas' ? billingCycle : 'one-time',
            companyName,
            contactEmail,
            pricing,
            validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
            notes: []
        };

        // Add notes for custom pricing
        if (pricing.hasCustomPricing) {
            quote.notes.push(
                'This quote includes Enterprise tier modules with custom pricing. Please contact sales for a detailed quote.'
            );
        }

        // Add notes for bundle discounts
        if (pricing.discountRate > 0) {
            quote.notes.push(
                `Bundle discount of ${pricing.discountRate * 100}% applied for selecting ${pricing.moduleCount} modules.`
            );
        }

        // Add annual billing discount note for SaaS
        if (deploymentType === 'saas' && billingCycle === 'annual') {
            quote.notes.push(
                'Annual billing provides 2 months free compared to monthly billing.'
            );
        }

        // Log quote generation
        logger.info('Pricing quote generated', {
            quoteId: quote.quoteId,
            deploymentType,
            moduleCount: modules.length,
            total: pricing.total,
            companyName,
            contactEmail
        });

        res.status(200).json(quote);
    } catch (error) {
        logger.error('Failed to generate pricing quote', {
            error: error.message,
            stack: error.stack
        });

        res.status(500).json({
            error: 'QUOTE_GENERATION_FAILED',
            message: error.message || 'Failed to generate pricing quote'
        });
    }
};

/**
 * GET /api/v1/pricing/modules
 * Get all available modules with pricing information
 */
export const getModulePricing = async (req, res) => {
    try {
        const modules = Object.values(commercialModuleConfigs).map(config => ({
            key: config.key,
            displayName: config.displayName,
            description: config.commercial.description,
            targetSegment: config.commercial.targetSegment,
            valueProposition: config.commercial.valueProposition,
            pricing: config.commercial.pricing,
            dependencies: config.dependencies,
            features: config.features
        }));

        res.status(200).json({
            modules,
            bundleDiscounts: {
                threeModules: {
                    threshold: BUNDLE_DISCOUNTS.THREE_MODULES.threshold,
                    discount: `${BUNDLE_DISCOUNTS.THREE_MODULES.rate * 100}%`
                },
                fiveModules: {
                    threshold: BUNDLE_DISCOUNTS.FIVE_MODULES.threshold,
                    discount: `${BUNDLE_DISCOUNTS.FIVE_MODULES.rate * 100}%`
                }
            }
        });
    } catch (error) {
        logger.error('Failed to get module pricing', {
            error: error.message,
            stack: error.stack
        });

        res.status(500).json({
            error: 'PRICING_FETCH_FAILED',
            message: 'Failed to retrieve module pricing information'
        });
    }
};

/**
 * GET /api/v1/pricing/calculate
 * Calculate pricing without generating a quote (for UI preview)
 * 
 * Query params:
 * - deploymentType: 'saas' | 'onpremise'
 * - modules: JSON string of module selections
 */
export const calculatePricing = async (req, res) => {
    try {
        const { deploymentType, modules: modulesParam } = req.query;

        if (!deploymentType || !modulesParam) {
            return res.status(400).json({
                error: 'MISSING_PARAMETERS',
                message: 'deploymentType and modules parameters are required'
            });
        }

        let modules;
        try {
            modules = JSON.parse(modulesParam);
        } catch (error) {
            return res.status(400).json({
                error: 'INVALID_MODULES_FORMAT',
                message: 'modules parameter must be valid JSON'
            });
        }

        let pricing;
        if (deploymentType === 'saas') {
            pricing = calculateMonthlyCost(modules);
        } else if (deploymentType === 'onpremise') {
            pricing = calculateOnPremiseCost(modules);
        } else {
            return res.status(400).json({
                error: 'INVALID_DEPLOYMENT_TYPE',
                message: 'deploymentType must be either "saas" or "onpremise"'
            });
        }

        res.status(200).json(pricing);
    } catch (error) {
        logger.error('Failed to calculate pricing', {
            error: error.message,
            stack: error.stack
        });

        res.status(500).json({
            error: 'CALCULATION_FAILED',
            message: error.message || 'Failed to calculate pricing'
        });
    }
};

export default {
    generateQuote,
    getModulePricing,
    calculatePricing
};
