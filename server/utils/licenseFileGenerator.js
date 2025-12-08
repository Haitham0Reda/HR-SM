// utils/licenseFileGenerator.js
import fs from 'fs';
import path from 'path';
import {
    generateSampleLicenseFile,
    generateLicenseSignature,
    validateLicenseFileStructure
} from '../config/licenseFileSchema.js';
import logger from './logger.js';

/**
 * License File Generator Utility
 * 
 * Provides utilities for generating license files for On-Premise deployments
 */

/**
 * Generate a license file with custom parameters
 * @param {Object} params - License parameters
 * @param {string} params.companyId - Company identifier
 * @param {string} params.companyName - Company name
 * @param {number} params.validityDays - Number of days until expiration
 * @param {Object} params.modules - Module configurations
 * @param {Object} params.metadata - Optional metadata
 * @param {string} secretKey - Secret key for signing
 * @returns {Object} Generated license data
 */
export function generateLicenseFile(params, secretKey) {
    const {
        companyId,
        companyName,
        validityDays = 365,
        modules = {},
        metadata = {}
    } = params;

    // Validate required parameters
    if (!companyId || !companyName) {
        throw new Error('companyId and companyName are required');
    }

    if (!secretKey) {
        throw new Error('secretKey is required for signing');
    }

    // Generate dates
    const now = new Date();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + validityDays);

    // Generate license key
    const licenseKey = generateLicenseKey();

    // Build license data (without signature first)
    const licenseData = {
        licenseKey,
        companyId,
        companyName,
        issuedAt: now.toISOString().split('T')[0],
        expiresAt: expiresAt.toISOString().split('T')[0],
        modules: modules || getDefaultModules(),
        metadata: metadata || {}
    };

    // Generate signature
    licenseData.signature = generateLicenseSignature(licenseData, secretKey);

    // Validate structure after signing
    const validation = validateLicenseFileStructure(licenseData);
    if (!validation.valid) {
        throw new Error(`Invalid license structure: ${validation.errors.join(', ')}`);
    }

    logger.info('License file generated', {
        licenseKey,
        companyId,
        companyName,
        validityDays,
        modulesCount: Object.keys(licenseData.modules).length
    });

    return licenseData;
}

/**
 * Generate a random license key in format HRMS-XXXX-XXXX-XXXX
 * @returns {string} License key
 */
export function generateLicenseKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

    const generateSegment = () => {
        let segment = '';
        for (let i = 0; i < 4; i++) {
            segment += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return segment;
    };

    return `HRMS-${generateSegment()}-${generateSegment()}-${generateSegment()}`;
}

/**
 * Get default module configuration
 * @returns {Object} Default modules
 */
function getDefaultModules() {
    return {
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
                storage: 10737418240, // 10GB
                apiCalls: 50000
            }
        },
        'leave': {
            enabled: true,
            tier: 'business',
            limits: {
                employees: 200,
                apiCalls: 50000
            }
        },
        'payroll': {
            enabled: false,
            tier: 'starter',
            limits: {
                employees: 50,
                apiCalls: 10000
            }
        },
        'documents': {
            enabled: false,
            tier: 'starter',
            limits: {
                employees: 50,
                storage: 1073741824, // 1GB
                apiCalls: 10000
            }
        },
        'communication': {
            enabled: false,
            tier: 'starter',
            limits: {
                employees: 50,
                apiCalls: 10000
            }
        },
        'reporting': {
            enabled: false,
            tier: 'starter',
            limits: {
                employees: 50,
                apiCalls: 10000
            }
        },
        'tasks': {
            enabled: false,
            tier: 'starter',
            limits: {
                employees: 50,
                apiCalls: 10000
            }
        }
    };
}

/**
 * Save license file to disk
 * @param {Object} licenseData - License data to save
 * @param {string} outputPath - Output file path
 * @returns {boolean} True if saved successfully
 */
export function saveLicenseFile(licenseData, outputPath) {
    try {
        // Ensure directory exists
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Write file with pretty formatting
        const jsonContent = JSON.stringify(licenseData, null, 2);
        fs.writeFileSync(outputPath, jsonContent, 'utf8');

        // Set restrictive permissions (600 - owner read/write only)
        if (process.platform !== 'win32') {
            fs.chmodSync(outputPath, 0o600);
        }

        logger.info('License file saved', {
            path: outputPath,
            licenseKey: licenseData.licenseKey
        });

        return true;

    } catch (error) {
        logger.error('Failed to save license file', {
            error: error.message,
            path: outputPath
        });
        return false;
    }
}

/**
 * Generate and save a license file
 * @param {Object} params - License parameters
 * @param {string} outputPath - Output file path
 * @param {string} secretKey - Secret key for signing
 * @returns {Object|null} Generated license data or null on failure
 */
export function generateAndSaveLicenseFile(params, outputPath, secretKey) {
    try {
        const licenseData = generateLicenseFile(params, secretKey);
        const saved = saveLicenseFile(licenseData, outputPath);

        if (!saved) {
            return null;
        }

        return licenseData;

    } catch (error) {
        logger.error('Failed to generate and save license file', {
            error: error.message,
            outputPath
        });
        return null;
    }
}

/**
 * Generate a trial license (30 days)
 * @param {string} companyId - Company identifier
 * @param {string} companyName - Company name
 * @param {string} secretKey - Secret key for signing
 * @returns {Object} Trial license data
 */
export function generateTrialLicense(companyId, companyName, secretKey) {
    return generateLicenseFile({
        companyId,
        companyName,
        validityDays: 30,
        modules: {
            'hr-core': {
                enabled: true,
                tier: 'enterprise',
                limits: {}
            },
            'attendance': {
                enabled: true,
                tier: 'starter',
                limits: {
                    employees: 10,
                    devices: 2,
                    storage: 1073741824, // 1GB
                    apiCalls: 5000
                }
            },
            'leave': {
                enabled: true,
                tier: 'starter',
                limits: {
                    employees: 10,
                    apiCalls: 5000
                }
            },
            'payroll': {
                enabled: true,
                tier: 'starter',
                limits: {
                    employees: 10,
                    apiCalls: 5000
                }
            },
            'documents': {
                enabled: true,
                tier: 'starter',
                limits: {
                    employees: 10,
                    storage: 1073741824, // 1GB
                    apiCalls: 5000
                }
            },
            'communication': {
                enabled: true,
                tier: 'starter',
                limits: {
                    employees: 10,
                    apiCalls: 5000
                }
            },
            'reporting': {
                enabled: true,
                tier: 'starter',
                limits: {
                    employees: 10,
                    apiCalls: 5000
                }
            },
            'tasks': {
                enabled: true,
                tier: 'starter',
                limits: {
                    employees: 10,
                    apiCalls: 5000
                }
            }
        },
        metadata: {
            supportLevel: 'basic',
            notes: 'Trial license - 30 days'
        }
    }, secretKey);
}

/**
 * Generate an enterprise license (1 year)
 * @param {string} companyId - Company identifier
 * @param {string} companyName - Company name
 * @param {string} secretKey - Secret key for signing
 * @returns {Object} Enterprise license data
 */
export function generateEnterpriseLicense(companyId, companyName, secretKey) {
    return generateLicenseFile({
        companyId,
        companyName,
        validityDays: 365,
        modules: {
            'hr-core': {
                enabled: true,
                tier: 'enterprise',
                limits: {}
            },
            'attendance': {
                enabled: true,
                tier: 'enterprise',
                limits: {} // Empty limits means unlimited for enterprise
            },
            'leave': {
                enabled: true,
                tier: 'enterprise',
                limits: {}
            },
            'payroll': {
                enabled: true,
                tier: 'enterprise',
                limits: {}
            },
            'documents': {
                enabled: true,
                tier: 'enterprise',
                limits: {}
            },
            'communication': {
                enabled: true,
                tier: 'enterprise',
                limits: {}
            },
            'reporting': {
                enabled: true,
                tier: 'enterprise',
                limits: {}
            },
            'tasks': {
                enabled: true,
                tier: 'enterprise',
                limits: {}
            }
        },
        metadata: {
            supportLevel: 'premium',
            notes: 'Enterprise license - 1 year'
        }
    }, secretKey);
}

/**
 * Extend license expiration date
 * @param {Object} existingLicense - Existing license data
 * @param {number} additionalDays - Days to add to expiration
 * @param {string} secretKey - Secret key for signing
 * @returns {Object} Updated license data
 */
export function extendLicense(existingLicense, additionalDays, secretKey) {
    const currentExpiration = new Date(existingLicense.expiresAt);
    const newExpiration = new Date(currentExpiration);
    newExpiration.setDate(newExpiration.getDate() + additionalDays);

    const updatedLicense = {
        ...existingLicense,
        expiresAt: newExpiration.toISOString().split('T')[0]
    };

    // Remove old signature
    delete updatedLicense.signature;

    // Generate new signature
    updatedLicense.signature = generateLicenseSignature(updatedLicense, secretKey);

    logger.info('License extended', {
        licenseKey: updatedLicense.licenseKey,
        oldExpiration: existingLicense.expiresAt,
        newExpiration: updatedLicense.expiresAt,
        additionalDays
    });

    return updatedLicense;
}

/**
 * Enable a module in an existing license
 * @param {Object} existingLicense - Existing license data
 * @param {string} moduleKey - Module key to enable
 * @param {string} tier - Pricing tier
 * @param {Object} limits - Module limits
 * @param {string} secretKey - Secret key for signing
 * @returns {Object} Updated license data
 */
export function enableModule(existingLicense, moduleKey, tier, limits, secretKey) {
    const updatedLicense = {
        ...existingLicense,
        modules: {
            ...existingLicense.modules,
            [moduleKey]: {
                enabled: true,
                tier,
                limits: limits || {}
            }
        }
    };

    // Remove old signature
    delete updatedLicense.signature;

    // Generate new signature
    updatedLicense.signature = generateLicenseSignature(updatedLicense, secretKey);

    logger.info('Module enabled in license', {
        licenseKey: updatedLicense.licenseKey,
        moduleKey,
        tier
    });

    return updatedLicense;
}

/**
 * Disable a module in an existing license
 * @param {Object} existingLicense - Existing license data
 * @param {string} moduleKey - Module key to disable
 * @param {string} secretKey - Secret key for signing
 * @returns {Object} Updated license data
 */
export function disableModule(existingLicense, moduleKey, secretKey) {
    if (!existingLicense.modules[moduleKey]) {
        throw new Error(`Module ${moduleKey} not found in license`);
    }

    const updatedLicense = {
        ...existingLicense,
        modules: {
            ...existingLicense.modules,
            [moduleKey]: {
                ...existingLicense.modules[moduleKey],
                enabled: false
            }
        }
    };

    // Remove old signature
    delete updatedLicense.signature;

    // Generate new signature
    updatedLicense.signature = generateLicenseSignature(updatedLicense, secretKey);

    logger.info('Module disabled in license', {
        licenseKey: updatedLicense.licenseKey,
        moduleKey
    });

    return updatedLicense;
}

export default {
    generateLicenseFile,
    generateLicenseKey,
    saveLicenseFile,
    generateAndSaveLicenseFile,
    generateTrialLicense,
    generateEnterpriseLicense,
    extendLicense,
    enableModule,
    disableModule
};
