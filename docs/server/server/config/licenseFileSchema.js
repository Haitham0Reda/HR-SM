// config/licenseFileSchema.js
/**
 * License File Schema for On-Premise Deployments
 * 
 * This defines the structure and validation rules for license files
 * used in On-Premise installations.
 */

import crypto from 'crypto';

/**
 * License file JSON schema
 */
export const LICENSE_FILE_SCHEMA = {
    type: 'object',
    required: ['licenseKey', 'companyId', 'companyName', 'issuedAt', 'expiresAt', 'modules', 'signature'],
    properties: {
        licenseKey: {
            type: 'string',
            pattern: '^HRMS-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$',
            description: 'Unique license key in format HRMS-XXXX-XXXX-XXXX'
        },
        companyId: {
            type: 'string',
            minLength: 1,
            description: 'Unique company identifier'
        },
        companyName: {
            type: 'string',
            minLength: 1,
            description: 'Company name'
        },
        issuedAt: {
            type: 'string',
            format: 'date',
            description: 'License issue date (YYYY-MM-DD)'
        },
        expiresAt: {
            type: 'string',
            format: 'date',
            description: 'License expiration date (YYYY-MM-DD)'
        },
        modules: {
            type: 'object',
            description: 'Module licenses',
            patternProperties: {
                '^[a-z-]+$': {
                    type: 'object',
                    required: ['enabled', 'tier'],
                    properties: {
                        enabled: {
                            type: 'boolean',
                            description: 'Whether module is enabled'
                        },
                        tier: {
                            type: 'string',
                            enum: ['starter', 'business', 'enterprise'],
                            description: 'Pricing tier'
                        },
                        limits: {
                            type: 'object',
                            properties: {
                                employees: {
                                    type: 'number',
                                    minimum: 0,
                                    description: 'Maximum number of employees'
                                },
                                devices: {
                                    type: 'number',
                                    minimum: 0,
                                    description: 'Maximum number of devices'
                                },
                                storage: {
                                    type: 'number',
                                    minimum: 0,
                                    description: 'Maximum storage in bytes'
                                },
                                apiCalls: {
                                    type: 'number',
                                    minimum: 0,
                                    description: 'Maximum API calls per month'
                                }
                            }
                        }
                    }
                }
            }
        },
        signature: {
            type: 'string',
            description: 'Digital signature for license verification'
        },
        metadata: {
            type: 'object',
            description: 'Optional metadata',
            properties: {
                contactEmail: { type: 'string', format: 'email' },
                contactPhone: { type: 'string' },
                supportLevel: { type: 'string', enum: ['basic', 'standard', 'premium'] },
                notes: { type: 'string' }
            }
        }
    }
};

/**
 * Validate license file structure
 * @param {Object} licenseData - License data to validate
 * @returns {Object} Validation result { valid: boolean, errors: string[] }
 */
export function validateLicenseFileStructure(licenseData) {
    const errors = [];

    // Check required fields
    const requiredFields = ['licenseKey', 'companyId', 'companyName', 'issuedAt', 'expiresAt', 'modules', 'signature'];
    for (const field of requiredFields) {
        if (!licenseData[field]) {
            errors.push(`Missing required field: ${field}`);
        }
    }

    // Validate license key format
    if (licenseData.licenseKey && !/^HRMS-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(licenseData.licenseKey)) {
        errors.push('Invalid license key format. Expected: HRMS-XXXX-XXXX-XXXX');
    }

    // Validate dates
    if (licenseData.issuedAt) {
        // Check if it's a non-empty string first
        if (typeof licenseData.issuedAt !== 'string' || licenseData.issuedAt.trim().length === 0) {
            errors.push('Invalid issuedAt date format');
        } else {
            const issuedDate = new Date(licenseData.issuedAt);
            if (isNaN(issuedDate.getTime())) {
                errors.push('Invalid issuedAt date format');
            }
        }
    }

    if (licenseData.expiresAt) {
        // Check if it's a non-empty string first
        if (typeof licenseData.expiresAt !== 'string' || licenseData.expiresAt.trim().length === 0) {
            errors.push('Invalid expiresAt date format');
        } else {
            const expiresDate = new Date(licenseData.expiresAt);
            if (isNaN(expiresDate.getTime())) {
                errors.push('Invalid expiresAt date format');
            }
        }
    }

    // Validate modules
    if (licenseData.modules) {
        if (typeof licenseData.modules !== 'object') {
            errors.push('Modules must be an object');
        } else {
            for (const [moduleKey, moduleConfig] of Object.entries(licenseData.modules)) {
                if (moduleConfig.enabled === undefined) {
                    errors.push(`Module ${moduleKey}: missing 'enabled' field`);
                }
                if (!moduleConfig.tier) {
                    errors.push(`Module ${moduleKey}: missing 'tier' field`);
                }
                if (moduleConfig.tier && !['starter', 'business', 'enterprise'].includes(moduleConfig.tier)) {
                    errors.push(`Module ${moduleKey}: invalid tier '${moduleConfig.tier}'`);
                }

                // Validate limits if present
                if (moduleConfig.limits) {
                    const limits = moduleConfig.limits;
                    // Allow null or undefined for unlimited, but validate if a number is provided
                    if (limits.employees !== undefined && limits.employees !== null && (typeof limits.employees !== 'number' || limits.employees <= 0)) {
                        errors.push(`Module ${moduleKey}: invalid employees limit`);
                    }
                    if (limits.storage !== undefined && limits.storage !== null && (typeof limits.storage !== 'number' || limits.storage < 0)) {
                        errors.push(`Module ${moduleKey}: invalid storage limit`);
                    }
                    if (limits.apiCalls !== undefined && limits.apiCalls !== null && (typeof limits.apiCalls !== 'number' || limits.apiCalls < 0)) {
                        errors.push(`Module ${moduleKey}: invalid apiCalls limit`);
                    }
                }
            }
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Check if license is expired
 * @param {Object} licenseData - License data
 * @returns {boolean} True if expired
 */
export function isLicenseExpired(licenseData) {
    if (!licenseData.expiresAt) {
        return false;
    }

    const expiresDate = new Date(licenseData.expiresAt);
    const now = new Date();

    return now > expiresDate;
}

/**
 * Get days until expiration
 * @param {Object} licenseData - License data
 * @returns {number|null} Days until expiration or null if no expiration
 */
export function getDaysUntilExpiration(licenseData) {
    if (!licenseData.expiresAt) {
        return null;
    }

    const expiresDate = new Date(licenseData.expiresAt);
    const now = new Date();
    const diffTime = expiresDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
}

/**
 * Generate signature for license data
 * @param {Object} licenseData - License data (without signature)
 * @param {string} secretKey - Secret key for signing
 * @returns {string} Signature hash
 */
export function generateLicenseSignature(licenseData, secretKey) {
    // Create a copy without the signature field
    const dataToSign = { ...licenseData };
    delete dataToSign.signature;

    // Sort keys for consistent hashing
    const sortedData = JSON.stringify(dataToSign, Object.keys(dataToSign).sort());

    // Generate HMAC signature
    const hmac = crypto.createHmac('sha256', secretKey);
    hmac.update(sortedData);
    return hmac.digest('hex');
}

/**
 * Verify license signature
 * @param {Object} licenseData - License data with signature
 * @param {string} secretKey - Secret key for verification
 * @returns {boolean} True if signature is valid
 */
export function verifyLicenseSignature(licenseData, secretKey) {
    if (!licenseData.signature) {
        return false;
    }

    const expectedSignature = generateLicenseSignature(licenseData, secretKey);
    return licenseData.signature === expectedSignature;
}

/**
 * Parse and validate license file
 * @param {string} licenseFileContent - License file content (JSON string)
 * @param {string} secretKey - Secret key for signature verification
 * @returns {Object} Validation result { valid: boolean, data: Object|null, errors: string[] }
 */
export function parseLicenseFile(licenseFileContent, secretKey) {
    const errors = [];
    let licenseData = null;

    try {
        licenseData = JSON.parse(licenseFileContent);
    } catch (error) {
        errors.push(`Failed to parse license file: ${error.message}`);
        return { valid: false, data: null, errors };
    }

    // Validate structure
    const structureValidation = validateLicenseFileStructure(licenseData);
    if (!structureValidation.valid) {
        errors.push(...structureValidation.errors);
    }

    // Verify signature
    if (secretKey && !verifyLicenseSignature(licenseData, secretKey)) {
        errors.push('Invalid license signature');
    }

    // Check expiration
    if (isLicenseExpired(licenseData)) {
        errors.push('License has expired');
    }

    return {
        valid: errors.length === 0,
        data: licenseData,
        errors
    };
}

/**
 * Generate a sample license file
 * @param {Object} params - License parameters
 * @param {string} secretKey - Secret key for signing
 * @returns {Object} License file data
 */
export function generateSampleLicenseFile(params, secretKey) {
    const {
        companyId = 'company-123',
        companyName = 'Sample Company',
        validityDays = 365,
        modules = {}
    } = params;

    const now = new Date();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + validityDays);

    // Generate license key
    const generateKeySegment = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let segment = '';
        for (let i = 0; i < 4; i++) {
            segment += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return segment;
    };

    const licenseKey = `HRMS-${generateKeySegment()}-${generateKeySegment()}-${generateKeySegment()}`;

    const licenseData = {
        licenseKey,
        companyId,
        companyName,
        issuedAt: now.toISOString().split('T')[0],
        expiresAt: expiresAt.toISOString().split('T')[0],
        modules: modules || {
            'hr-core': {
                enabled: true,
                tier: 'enterprise',
                limits: {}
            },
            'attendance': {
                enabled: true,
                tier: 'business',
                limits: {
                    employees: 200,
                    devices: 10,
                    storage: 10737418240
                }
            }
        }
    };

    // Generate signature
    licenseData.signature = generateLicenseSignature(licenseData, secretKey);

    return licenseData;
}

/**
 * Example license file template
 */
export const EXAMPLE_LICENSE_FILE = {
    licenseKey: 'HRMS-ABCD-1234-EFGH',
    companyId: 'company-123',
    companyName: 'Acme Corporation',
    issuedAt: '2025-01-01',
    expiresAt: '2026-01-01',
    modules: {
        'hr-core': {
            enabled: true,
            tier: 'enterprise',
            limits: {}
        },
        'attendance': {
            enabled: true,
            tier: 'business',
            limits: {
                employees: 200,
                devices: 10,
                storage: 10737418240,
                apiCalls: 50000
            }
        },
        'leave': {
            enabled: true,
            tier: 'business',
            limits: {
                employees: 200
            }
        },
        'payroll': {
            enabled: false,
            tier: 'starter',
            limits: {
                employees: 50
            }
        }
    },
    signature: 'generated-signature-hash',
    metadata: {
        contactEmail: 'admin@acme.com',
        supportLevel: 'premium',
        notes: 'Annual enterprise license'
    }
};

export default {
    LICENSE_FILE_SCHEMA,
    validateLicenseFileStructure,
    isLicenseExpired,
    getDaysUntilExpiration,
    generateLicenseSignature,
    verifyLicenseSignature,
    parseLicenseFile,
    generateSampleLicenseFile,
    EXAMPLE_LICENSE_FILE
};
