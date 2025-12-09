/**
 * Pricing Service
 * 
 * Handles pricing calculations for module subscriptions including:
 * - Monthly SaaS pricing
 * - On-Premise one-time pricing
 * - Bundle discounts
 * - Quote generation
 */

import api from './api';

/**
 * Pricing tiers
 */
export const PRICING_TIERS = {
    STARTER: 'starter',
    BUSINESS: 'business',
    ENTERPRISE: 'enterprise'
};

/**
 * Bundle discount thresholds and rates
 */
const BUNDLE_DISCOUNTS = {
    THREE_MODULES: { threshold: 3, rate: 0.10 }, // 10% discount for 3+ modules
    FIVE_MODULES: { threshold: 5, rate: 0.15 }   // 15% discount for 5+ modules
};

/**
 * Calculate monthly SaaS cost for selected modules
 * 
 * @param {Array<Object>} selectedModules - Array of module selections
 *   Each object should have: { moduleKey, tier, employeeCount }
 * @param {Object} moduleConfigs - Module configuration data
 * @returns {Object} Pricing breakdown with subtotal, discount, and total
 */
export function calculateMonthlyCost(selectedModules, moduleConfigs) {
    if (!selectedModules || selectedModules.length === 0) {
        return {
            subtotal: 0,
            discount: 0,
            discountRate: 0,
            total: 0,
            breakdown: []
        };
    }

    const breakdown = [];
    let subtotal = 0;

    // Calculate cost for each module
    for (const selection of selectedModules) {
        const { moduleKey, tier, employeeCount = 1 } = selection;
        const config = moduleConfigs[moduleKey];

        if (!config) {
            console.warn(`Module config not found for: ${moduleKey}`);
            continue;
        }

        const pricing = config.commercial?.pricing?.[tier];
        if (!pricing) {
            console.warn(`Pricing not found for module ${moduleKey} tier ${tier}`);
            continue;
        }

        // Handle custom pricing (enterprise tier)
        if (pricing.monthly === 'custom') {
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

        // Calculate module cost (price per employee * employee count)
        const pricePerEmployee = pricing.monthly;
        const moduleCost = pricePerEmployee * employeeCount;

        breakdown.push({
            moduleKey,
            moduleName: config.displayName,
            tier,
            pricePerEmployee,
            employeeCount,
            cost: moduleCost,
            isCustom: false
        });

        subtotal += moduleCost;
    }

    // Calculate bundle discount
    const discountInfo = calculateBundleDiscount(selectedModules.length, subtotal);

    return {
        subtotal,
        discount: discountInfo.amount,
        discountRate: discountInfo.rate,
        total: subtotal - discountInfo.amount,
        breakdown,
        moduleCount: selectedModules.length
    };
}

/**
 * Calculate one-time On-Premise cost for selected modules
 * 
 * @param {Array<Object>} selectedModules - Array of module selections
 *   Each object should have: { moduleKey, tier }
 * @param {Object} moduleConfigs - Module configuration data
 * @returns {Object} Pricing breakdown with subtotal, discount, and total
 */
export function calculateOnPremiseCost(selectedModules, moduleConfigs) {
    if (!selectedModules || selectedModules.length === 0) {
        return {
            subtotal: 0,
            discount: 0,
            discountRate: 0,
            total: 0,
            breakdown: []
        };
    }

    const breakdown = [];
    let subtotal = 0;

    // Calculate cost for each module
    for (const selection of selectedModules) {
        const { moduleKey, tier } = selection;
        const config = moduleConfigs[moduleKey];

        if (!config) {
            console.warn(`Module config not found for: ${moduleKey}`);
            continue;
        }

        const pricing = config.commercial?.pricing?.[tier];
        if (!pricing) {
            console.warn(`Pricing not found for module ${moduleKey} tier ${tier}`);
            continue;
        }

        // Handle custom pricing (enterprise tier)
        if (pricing.onPremise === 'custom') {
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
            isCustom: false
        });

        subtotal += moduleCost;
    }

    // Calculate bundle discount
    const discountInfo = calculateBundleDiscount(selectedModules.length, subtotal);

    return {
        subtotal,
        discount: discountInfo.amount,
        discountRate: discountInfo.rate,
        total: subtotal - discountInfo.amount,
        breakdown,
        moduleCount: selectedModules.length
    };
}

/**
 * Calculate bundle discount based on number of modules
 * 
 * @param {number} moduleCount - Number of modules selected
 * @param {number} subtotal - Subtotal before discount
 * @returns {Object} Discount information { rate, amount }
 */
function calculateBundleDiscount(moduleCount, subtotal) {
    let discountRate = 0;

    // Apply highest applicable discount
    if (moduleCount >= BUNDLE_DISCOUNTS.FIVE_MODULES.threshold) {
        discountRate = BUNDLE_DISCOUNTS.FIVE_MODULES.rate;
    } else if (moduleCount >= BUNDLE_DISCOUNTS.THREE_MODULES.threshold) {
        discountRate = BUNDLE_DISCOUNTS.THREE_MODULES.rate;
    }

    const discountAmount = subtotal * discountRate;

    return {
        rate: discountRate,
        amount: discountAmount
    };
}

/**
 * Generate a pricing quote via API
 * 
 * @param {Object} quoteRequest - Quote request data
 *   {
 *     deploymentType: 'saas' | 'onpremise',
 *     modules: [{ moduleKey, tier, employeeCount? }],
 *     companyName?: string,
 *     contactEmail?: string,
 *     billingCycle?: 'monthly' | 'annual'
 *   }
 * @returns {Promise<Object>} Quote data from server
 */
export async function generateQuote(quoteRequest) {
    try {
        const response = await api.post('/v1/pricing/quote', quoteRequest);
        return response;
    } catch (error) {
        console.error('Failed to generate quote:', error);
        throw error;
    }
}

/**
 * Get bundle discount information
 * 
 * @param {number} moduleCount - Number of modules
 * @returns {Object} Discount information
 */
export function getBundleDiscountInfo(moduleCount) {
    if (moduleCount >= BUNDLE_DISCOUNTS.FIVE_MODULES.threshold) {
        return {
            applicable: true,
            rate: BUNDLE_DISCOUNTS.FIVE_MODULES.rate,
            percentage: BUNDLE_DISCOUNTS.FIVE_MODULES.rate * 100,
            description: `${BUNDLE_DISCOUNTS.FIVE_MODULES.rate * 100}% discount for ${BUNDLE_DISCOUNTS.FIVE_MODULES.threshold}+ modules`
        };
    } else if (moduleCount >= BUNDLE_DISCOUNTS.THREE_MODULES.threshold) {
        return {
            applicable: true,
            rate: BUNDLE_DISCOUNTS.THREE_MODULES.rate,
            percentage: BUNDLE_DISCOUNTS.THREE_MODULES.rate * 100,
            description: `${BUNDLE_DISCOUNTS.THREE_MODULES.rate * 100}% discount for ${BUNDLE_DISCOUNTS.THREE_MODULES.threshold}+ modules`
        };
    }

    return {
        applicable: false,
        rate: 0,
        percentage: 0,
        description: 'No bundle discount (select 3+ modules for 10% off)'
    };
}

/**
 * Format currency for display
 * 
 * @param {number|string} amount - Amount to format
 * @param {string} currency - Currency code (default: USD)
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount, currency = 'USD') {
    if (amount === 'custom') {
        return 'Custom Pricing';
    }

    if (typeof amount !== 'number') {
        return amount;
    }

    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(amount);
}

export default {
    calculateMonthlyCost,
    calculateOnPremiseCost,
    generateQuote,
    getBundleDiscountInfo,
    formatCurrency,
    PRICING_TIERS
};
