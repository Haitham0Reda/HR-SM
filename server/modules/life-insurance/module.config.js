/**
 * Life Insurance Module Configuration
 * 
 * This is an OPTIONAL module that provides comprehensive life insurance management.
 * It depends on HR-Core for user and department data.
 * It requires the "life-insurance" license feature to be enabled.
 */

export default {
    name: 'life-insurance',
    displayName: 'Life Insurance Management',
    version: '1.0.0',
    description: 'Comprehensive life insurance management including policies, family members, claims processing, and beneficiary management',
    author: 'System',
    category: 'insurance',
    
    // Module dependencies - requires HR-Core for user data
    dependencies: ['hr-core'],
    
    // Optional dependencies
    optionalDependencies: ['email-service', 'documents'],
    
    // Modules that can use this module
    providesTo: [],
    
    // Pricing information
    pricing: {
        tier: 'enterprise',
        monthlyPrice: 49.99,
        yearlyPrice: 499.99,
        currency: 'USD',
        description: 'Includes comprehensive life insurance management, claims processing, and reporting'
    },
    
    // License requirements
    license: {
        requiredFeature: 'life-insurance',
        description: 'Requires life-insurance feature in license'
    },
    
    // Feature flags
    features: {
        policyManagement: true,
        familyMembers: true,
        claimsProcessing: true,
        beneficiaryManagement: true,
        insuranceReports: true,
        documentUpload: true,
        emailNotifications: true,
        policyAnalytics: true
    },
    
    // API routes configuration
    routes: {
        base: '/api/v1/life-insurance',
        endpoints: [
            // Policy Management
            {
                path: '/policies',
                method: 'POST',
                auth: true,
                roles: ['Manager', 'HR', 'Admin'],
                description: 'Create a new insurance policy'
            },
            {
                path: '/policies',
                method: 'GET',
                auth: true,
                description: 'Get insurance policies'
            },
            {
                path: '/policies/:id',
                method: 'GET',
                auth: true,
                description: 'Get policy by ID'
            },
            {
                path: '/policies/:id',
                method: 'PUT',
                auth: true,
                roles: ['Manager', 'HR', 'Admin'],
                description: 'Update policy'
            },
            {
                path: '/policies/:id',
                method: 'DELETE',
                auth: true,
                roles: ['Admin'],
                description: 'Delete policy'
            },
            
            // Family Members
            {
                path: '/policies/:policyId/family-members',
                method: 'POST',
                auth: true,
                description: 'Add family member to policy'
            },
            {
                path: '/policies/:policyId/family-members',
                method: 'GET',
                auth: true,
                description: 'Get family members for policy'
            },
            {
                path: '/family-members/:id',
                method: 'PUT',
                auth: true,
                description: 'Update family member'
            },
            {
                path: '/family-members/:id',
                method: 'DELETE',
                auth: true,
                roles: ['Manager', 'HR', 'Admin'],
                description: 'Remove family member'
            },
            
            // Claims Management
            {
                path: '/claims',
                method: 'POST',
                auth: true,
                description: 'Create insurance claim'
            },
            {
                path: '/claims',
                method: 'GET',
                auth: true,
                description: 'Get insurance claims'
            },
            {
                path: '/claims/:id',
                method: 'GET',
                auth: true,
                description: 'Get claim by ID'
            },
            {
                path: '/claims/:id/review',
                method: 'POST',
                auth: true,
                roles: ['Manager', 'HR', 'Admin'],
                description: 'Review claim'
            },
            {
                path: '/claims/:id/process',
                method: 'POST',
                auth: true,
                roles: ['HR', 'Admin'],
                description: 'Process claim payment'
            },
            
            // Beneficiaries
            {
                path: '/policies/:policyId/beneficiaries',
                method: 'POST',
                auth: true,
                description: 'Add beneficiary to policy'
            },
            {
                path: '/policies/:policyId/beneficiaries',
                method: 'GET',
                auth: true,
                description: 'Get beneficiaries for policy'
            },
            {
                path: '/beneficiaries/:id',
                method: 'PUT',
                auth: true,
                description: 'Update beneficiary'
            },
            {
                path: '/beneficiaries/:id',
                method: 'DELETE',
                auth: true,
                description: 'Remove beneficiary'
            },
            
            // Reports
            {
                path: '/reports/policies',
                method: 'GET',
                auth: true,
                roles: ['Manager', 'HR', 'Admin'],
                description: 'Generate policy reports'
            },
            {
                path: '/reports/claims',
                method: 'GET',
                auth: true,
                roles: ['Manager', 'HR', 'Admin'],
                description: 'Generate claims reports'
            }
        ]
    },
    
    // Database models
    models: ['InsurancePolicy', 'FamilyMember', 'InsuranceClaim', 'Beneficiary'],
    
    // Collections included in backup
    backupCollections: [
        'insurancepolicies',
        'familymembers',
        'insuranceclaims',
        'beneficiaries'
    ],
    
    // Configuration schema
    configSchema: {
        emailNotifications: {
            type: 'boolean',
            default: true,
            description: 'Enable email notifications for insurance events'
        },
        autoApproveSmallClaims: {
            type: 'boolean',
            default: false,
            description: 'Automatically approve claims under threshold amount'
        },
        smallClaimThreshold: {
            type: 'number',
            default: 1000,
            description: 'Threshold amount for small claims auto-approval'
        },
        requireDocumentsForClaims: {
            type: 'boolean',
            default: true,
            description: 'Require document uploads for all claims'
        },
        maxFamilyMembers: {
            type: 'number',
            default: 10,
            description: 'Maximum family members per policy'
        }
    },
    
    // Module metadata
    metadata: {
        required: false,
        canBeDisabled: true,
        isCore: false,
        supportsMultiTenant: true,
        requiresTenantContext: true,
        requiresLicense: true
    },
    
    /**
     * Initialize life insurance module
     * @param {Object} app - Express app instance
     * @param {string} tenantId - Tenant identifier
     * @param {Object} config - Module configuration
     */
    async initialize(app, tenantId, config) {
        console.log(`[Life Insurance Module] Initializing for tenant: ${tenantId}`);
        
        // Check if required license feature is available
        const hasLicenseFeature = config?.licenseFeatures?.includes('life-insurance');
        
        if (!hasLicenseFeature) {
            console.log(`[Life Insurance Module] License feature 'life-insurance' not available for tenant: ${tenantId}`);
            return {
                success: false,
                message: 'Life insurance module requires license feature: life-insurance',
                licenseRequired: true
            };
        }
        
        // Check if email-service is available
        const emailServiceAvailable = config?.enabledModules?.includes('email-service');
        
        if (emailServiceAvailable) {
            console.log(`[Life Insurance Module] Email service is available for tenant: ${tenantId}`);
        } else {
            console.log(`[Life Insurance Module] Email service not available, notifications will be logged only`);
        }
        
        return {
            success: true,
            message: 'Life insurance module initialized successfully',
            emailServiceAvailable,
            licenseFeatureAvailable: true
        };
    },
    
    /**
     * Cleanup life insurance module
     * @param {string} tenantId - Tenant identifier
     */
    async cleanup(tenantId) {
        console.log(`[Life Insurance Module] Cleanup for tenant: ${tenantId}`);
        
        // Insurance data is preserved in the database
        // No specific cleanup needed
        
        return {
            success: true,
            message: 'Life insurance module cleanup completed'
        };
    },
    
    /**
     * Health check for life insurance module
     * @param {string} tenantId - Tenant identifier
     */
    async healthCheck(tenantId) {
        try {
            // Could check database connectivity, license status, etc.
            return {
                healthy: true,
                details: {
                    enabled: true,
                    tenantId,
                    licenseRequired: true
                }
            };
        } catch (error) {
            return {
                healthy: false,
                error: error.message
            };
        }
    }
};