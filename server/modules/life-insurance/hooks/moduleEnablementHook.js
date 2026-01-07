/**
 * Module Enablement Hook for Life Insurance
 * Handles initialization when the life-insurance module is enabled for a tenant
 */

import { seedInsuranceProvidersForTenant } from '../utils/seedInsuranceProviders.js';

/**
 * Hook called when life-insurance module is enabled for a tenant
 * @param {string} tenantId - The tenant ID
 * @param {string} enabledBy - User ID who enabled the module
 * @returns {Promise<Object>} Result of the initialization
 */
export const onLifeInsuranceModuleEnabled = async (tenantId, enabledBy = null) => {
    try {
        console.log(`🔧 Initializing life-insurance module for tenant ${tenantId}...`);

        // Seed default insurance providers
        const seedResult = await seedInsuranceProvidersForTenant(tenantId, enabledBy);
        
        if (seedResult.success) {
            console.log(`✅ Life-insurance module initialized successfully for tenant ${tenantId}`);
            console.log(`   - Seeded ${seedResult.count} default insurance providers`);
            
            return {
                success: true,
                message: `Life-insurance module initialized with ${seedResult.count} default providers`,
                data: {
                    providersSeeded: seedResult.count,
                    providers: seedResult.providers
                }
            };
        } else {
            console.warn(`⚠️ Life-insurance module partially initialized for tenant ${tenantId}: ${seedResult.message}`);
            
            return {
                success: false,
                message: `Module enabled but initialization incomplete: ${seedResult.message}`,
                error: seedResult.error
            };
        }
    } catch (error) {
        console.error(`❌ Error initializing life-insurance module for tenant ${tenantId}:`, error);
        
        return {
            success: false,
            message: 'Module enabled but initialization failed',
            error: error.message
        };
    }
};

/**
 * Hook called when life-insurance module is disabled for a tenant
 * @param {string} tenantId - The tenant ID
 * @param {string} disabledBy - User ID who disabled the module
 * @returns {Promise<Object>} Result of the cleanup
 */
export const onLifeInsuranceModuleDisabled = async (tenantId, disabledBy = null) => {
    try {
        console.log(`🔧 Cleaning up life-insurance module for tenant ${tenantId}...`);
        
        // Note: We don't automatically delete insurance providers when module is disabled
        // as they might have active policies. This should be handled manually by admins.
        
        console.log(`ℹ️ Life-insurance module disabled for tenant ${tenantId}`);
        console.log(`   Note: Insurance providers and policies are preserved. Manual cleanup may be required.`);
        
        return {
            success: true,
            message: 'Life-insurance module disabled. Data preserved for manual review.',
            data: {
                note: 'Insurance providers and policies are preserved and require manual cleanup if needed'
            }
        };
    } catch (error) {
        console.error(`❌ Error during life-insurance module cleanup for tenant ${tenantId}:`, error);
        
        return {
            success: false,
            message: 'Module disabled but cleanup encountered issues',
            error: error.message
        };
    }
};

export default {
    onEnabled: onLifeInsuranceModuleEnabled,
    onDisabled: onLifeInsuranceModuleDisabled
};