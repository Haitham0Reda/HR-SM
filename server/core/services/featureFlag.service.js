/**
 * Feature Flag Service
 * 
 * This service manages feature flags for enabling/disabling modules
 * in both SaaS (multi-tenant) and On-Premise deployments.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default feature flags
const DEFAULT_FEATURE_FLAGS = {
    // Core HR module - always enabled
    hrCore: {
        enabled: true,
        description: 'Core HR functionality (authentication, user management, etc.)',
        required: true
    },

    // Sellable modules
    attendance: {
        enabled: true,
        description: 'Attendance & Time Tracking module'
    },

    leave: {
        enabled: true,
        description: 'Leave & Permission Management module'
    },

    payroll: {
        enabled: true,
        description: 'Payroll Management module'
    },

    documents: {
        enabled: true,
        description: 'Document Management module'
    },

    communication: {
        enabled: true,
        description: 'Communication & Notifications module'
    },

    reporting: {
        enabled: true,
        description: 'Reporting & Analytics module'
    },

    tasks: {
        enabled: true,
        description: 'Task & Work Reporting module'
    },

    // Advanced features
    advancedScheduling: {
        enabled: false,
        description: 'Advanced scheduling features'
    },

    aiAnalytics: {
        enabled: false,
        description: 'AI-powered analytics'
    }
};

// License validation schema
const LICENSE_SCHEMA = {
    modules: {
        type: 'object',
        required: true,
        description: 'Enabled modules mapping'
    },
    employeeLimit: {
        type: 'number',
        required: true,
        description: 'Maximum number of employees allowed'
    },
    expiryDate: {
        type: 'string',
        format: 'date',
        required: true,
        description: 'License expiration date (ISO 8601)'
    },
    companyId: {
        type: 'string',
        required: true,
        description: 'Company identifier'
    }
};

class FeatureFlagService {
    constructor() {
        this.featureFlags = { ...DEFAULT_FEATURE_FLAGS };
        this.license = null;
        this.tenantId = null;
    }

    /**
     * Initialize feature flags from environment variables
     */
    initFromEnv() {
        // Override feature flags from environment variables
        Object.keys(this.featureFlags).forEach(flag => {
            const envVar = `FEATURE_${flag.toUpperCase()}`;
            if (process.env[envVar] !== undefined) {
                this.featureFlags[flag].enabled = process.env[envVar] === 'true';
            }
        });

        return this.featureFlags;
    }

    /**
     * Load license file for On-Premise deployments
     * @param {string} licensePath - Path to license file
     */
    async loadLicense(licensePath = null) {
        try {
            // Default to license file in config directory
            if (!licensePath) {
                licensePath = path.join(__dirname, '..', 'config', 'license.json');
            }

            // Check if license file exists
            try {
                await fs.access(licensePath);
            } catch {
                console.warn('No license file found. Using default feature flags.');
                return null;
            }

            // Read and parse license file
            const licenseData = await fs.readFile(licensePath, 'utf8');
            const license = JSON.parse(licenseData);

            // Validate license
            if (!this.validateLicense(license)) {
                throw new Error('Invalid license file');
            }

            // Check expiration
            const expiryDate = new Date(license.expiryDate);
            const currentDate = new Date();

            if (currentDate > expiryDate) {
                throw new Error('License has expired');
            }

            // Apply license settings
            this.license = license;
            this.tenantId = license.companyId;

            // Update feature flags based on license
            Object.keys(license.modules).forEach(module => {
                if (this.featureFlags[module]) {
                    this.featureFlags[module].enabled = license.modules[module];
                }
            });

            console.log(`License loaded for company: ${license.companyId}`);
            return license;
        } catch (error) {
            console.error('Failed to load license:', error.message);
            throw error;
        }
    }

    /**
     * Validate license structure
     * @param {object} license - License object to validate
     * @returns {boolean} - Whether license is valid
     */
    validateLicense(license) {
        // Check required fields
        for (const [field, schema] of Object.entries(LICENSE_SCHEMA)) {
            if (schema.required && (license[field] === undefined || license[field] === null)) {
                console.error(`Missing required field in license: ${field}`);
                return false;
            }

            // Check type
            if (license[field] !== undefined && typeof license[field] !== schema.type) {
                console.error(`Invalid type for field ${field}: expected ${schema.type}, got ${typeof license[field]}`);
                return false;
            }

            // Check format for date fields
            if (schema.format === 'date' && license[field]) {
                const date = new Date(license[field]);
                if (isNaN(date.getTime())) {
                    console.error(`Invalid date format for field ${field}: ${license[field]}`);
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Check if a feature is enabled
     * @param {string} feature - Feature name
     * @param {string} tenantId - Tenant ID (for multi-tenant deployments)
     * @returns {boolean} - Whether feature is enabled
     */
    isFeatureEnabled(feature, tenantId = null) {
        // Core HR features are always enabled
        if (this.featureFlags[feature]?.required) {
            return true;
        }

        // For multi-tenant deployments, check tenant-specific settings
        if (tenantId && this.tenantId && tenantId !== this.tenantId) {
            // In a real implementation, we would check tenant-specific feature flags
            // For now, we'll use the global settings
            console.warn(`Checking feature for different tenant: ${tenantId}`);
        }

        return this.featureFlags[feature]?.enabled || false;
    }

    /**
     * Get all feature flags
     * @returns {object} - Current feature flags
     */
    getFeatureFlags() {
        return { ...this.featureFlags };
    }

    /**
     * Get license information
     * @returns {object|null} - License information or null if not loaded
     */
    getLicense() {
        return this.license ? { ...this.license } : null;
    }

    /**
     * Get tenant ID
     * @returns {string|null} - Tenant ID or null if not set
     */
    getTenantId() {
        return this.tenantId;
    }

    /**
     * Generate a sample license file
     * @param {object} options - License options
     * @returns {object} - Generated license
     */
    generateSampleLicense(options = {}) {
        const {
            companyId = 'sample-company',
            employeeLimit = 100,
            expiryDays = 365,
            modules = {}
        } = options;

        // Merge with default modules
        const enabledModules = {
            hrCore: true,
            attendance: true,
            leave: true,
            payroll: false,
            documents: true,
            communication: true,
            reporting: true,
            tasks: true,
            ...modules
        };

        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + expiryDays);

        return {
            companyId,
            employeeLimit,
            expiryDate: expiryDate.toISOString().split('T')[0],
            modules: enabledModules
        };
    }

    /**
     * Save license to file
     * @param {object} license - License to save
     * @param {string} filePath - Path to save license
     */
    async saveLicense(license, filePath = null) {
        if (!filePath) {
            filePath = path.join(__dirname, '..', 'config', 'license.json');
        }

        await fs.writeFile(filePath, JSON.stringify(license, null, 2));
        console.log(`License saved to ${filePath}`);
    }
}

// Export singleton instance
const featureFlagService = new FeatureFlagService();
export default featureFlagService;