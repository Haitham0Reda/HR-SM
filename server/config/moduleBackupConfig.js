/**
 * Module Backup Configuration
 * 
 * Central configuration for module-aware backup system
 * Defines which modules and collections should be included in backups
 */

/**
 * Module backup configuration
 * Maps modules to their backup collections and settings
 */
export const MODULE_BACKUP_CONFIG = {
    // Core HR module (always included)
    'hr-core': {
        required: true,
        collections: [
            'attendances',
            'requests', 
            'holidays',
            'missions',
            'vacations',
            'mixedvacations',
            'vacationbalances',
            'overtimes',
            'users',
            'departments',
            'positions',
            'forgetchecks'
        ],
        priority: 1, // Highest priority
        description: 'Core HR functionality - always included in backups'
    },

    // Life Insurance module (optional, license-dependent)
    'life-insurance': {
        required: false,
        licenseFeature: 'life-insurance',
        collections: [
            'insurancepolicies',
            'familymembers', 
            'insuranceclaims',
            'beneficiaries'
        ],
        priority: 2,
        description: 'Life insurance management data',
        fileUploads: [
            'insurance-documents',
            'claim-documents',
            'policy-attachments'
        ]
    },

    // Tasks module (optional)
    'tasks': {
        required: false,
        collections: [
            'tasks',
            'taskreports'
        ],
        priority: 3,
        description: 'Task management data',
        fileUploads: [
            'task-attachments',
            'task-reports'
        ]
    },

    // Clinic module (optional)
    'clinic': {
        required: false,
        collections: [
            'appointments',
            'prescriptions',
            'medicalrecords',
            'clinicservices'
        ],
        priority: 3,
        description: 'Medical clinic data',
        fileUploads: [
            'medical-documents',
            'prescription-attachments'
        ]
    },

    // Payroll module (optional)
    'payroll': {
        required: false,
        collections: [
            'payrolls',
            'payrollitems',
            'salarystructures'
        ],
        priority: 2,
        description: 'Payroll and salary data',
        fileUploads: [
            'payroll-documents'
        ]
    },

    // Reports module (optional)
    'reports': {
        required: false,
        collections: [
            'reporttemplates',
            'reportexecutions',
            'reportschedules'
        ],
        priority: 4,
        description: 'Report generation data'
    },

    // Documents module (optional)
    'documents': {
        required: false,
        collections: [
            'documents',
            'documentcategories',
            'documentversions'
        ],
        priority: 3,
        description: 'Document management data',
        fileUploads: [
            'documents',
            'document-versions'
        ]
    },

    // Notifications module (optional)
    'notifications': {
        required: false,
        collections: [
            'notifications',
            'notificationtemplates',
            'notificationlogs'
        ],
        priority: 5,
        description: 'Notification system data'
    },

    // Email service module (optional)
    'email-service': {
        required: false,
        collections: [
            'emailtemplates',
            'emaillogs',
            'emailqueues'
        ],
        priority: 4,
        description: 'Email service data'
    },

    // Theme module (optional)
    'theme': {
        required: false,
        collections: [
            'themeconfigs'
        ],
        priority: 5,
        description: 'Theme configuration data'
    }
};

/**
 * Backup retention policies per module type
 */
export const MODULE_RETENTION_POLICIES = {
    // Critical modules (longer retention)
    critical: {
        modules: ['hr-core', 'life-insurance', 'payroll'],
        daily: 60,    // 60 days
        weekly: 24,   // 24 weeks (6 months)
        monthly: 24   // 24 months (2 years)
    },

    // Important modules (standard retention)
    important: {
        modules: ['tasks', 'clinic', 'documents'],
        daily: 30,    // 30 days
        weekly: 12,   // 12 weeks (3 months)
        monthly: 12   // 12 months (1 year)
    },

    // Standard modules (shorter retention)
    standard: {
        modules: ['reports', 'notifications', 'email-service', 'theme'],
        daily: 14,    // 14 days
        weekly: 8,    // 8 weeks (2 months)
        monthly: 6    // 6 months
    }
};

/**
 * File upload backup configuration
 */
export const FILE_UPLOAD_BACKUP_CONFIG = {
    // Base upload directories
    baseDirectories: [
        'uploads',
        'server/uploads'
    ],

    // Module-specific upload directories
    moduleDirectories: {
        'life-insurance': [
            'uploads/insurance-documents',
            'uploads/claim-documents', 
            'uploads/policy-attachments'
        ],
        'tasks': [
            'uploads/task-attachments',
            'uploads/task-reports'
        ],
        'clinic': [
            'uploads/medical-documents',
            'uploads/prescription-attachments'
        ],
        'documents': [
            'uploads/documents',
            'uploads/document-versions'
        ],
        'payroll': [
            'uploads/payroll-documents'
        ]
    },

    // File type restrictions for backup
    allowedExtensions: [
        '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
        '.txt', '.rtf', '.csv', '.json', '.xml',
        '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff',
        '.mp4', '.avi', '.mov', '.wmv', '.flv',
        '.mp3', '.wav', '.aac', '.flac',
        '.zip', '.rar', '.7z', '.tar', '.gz'
    ],

    // Maximum file size for backup (in bytes)
    maxFileSize: 100 * 1024 * 1024, // 100MB

    // Exclude patterns
    excludePatterns: [
        '*.tmp',
        '*.temp',
        '*.log',
        '*.cache',
        'node_modules/**',
        '.git/**',
        '.DS_Store',
        'Thumbs.db'
    ]
};

/**
 * Backup verification configuration
 */
export const BACKUP_VERIFICATION_CONFIG = {
    // Collections that must be present for successful backup
    criticalCollections: [
        'users',
        'departments',
        'attendances'
    ],

    // Module-specific verification rules
    moduleVerificationRules: {
        'life-insurance': {
            requiredCollections: ['insurancepolicies'],
            minimumRecords: 0, // Allow empty collections for new installations
            relationships: [
                {
                    parent: 'insurancepolicies',
                    child: 'familymembers',
                    foreignKey: 'policyId'
                },
                {
                    parent: 'insurancepolicies', 
                    child: 'insuranceclaims',
                    foreignKey: 'policyId'
                }
            ]
        },
        'tasks': {
            requiredCollections: ['tasks'],
            minimumRecords: 0
        },
        'clinic': {
            requiredCollections: ['appointments'],
            minimumRecords: 0
        }
    },

    // Verification schedule
    schedule: {
        afterBackup: true,      // Verify immediately after backup
        daily: true,            // Daily verification of recent backups
        weekly: true,           // Weekly comprehensive verification
        beforeRestore: true     // Verify before any restore operation
    }
};

/**
 * Get backup configuration for a specific module
 */
export function getModuleBackupConfig(moduleName) {
    return MODULE_BACKUP_CONFIG[moduleName] || null;
}

/**
 * Get all collections for enabled modules
 */
export function getCollectionsForModules(enabledModules) {
    const collections = new Set();
    
    enabledModules.forEach(moduleName => {
        const config = MODULE_BACKUP_CONFIG[moduleName];
        if (config && config.collections) {
            config.collections.forEach(collection => {
                collections.add(collection);
            });
        }
    });
    
    return Array.from(collections);
}

/**
 * Get file upload directories for enabled modules
 */
export function getFileUploadDirectoriesForModules(enabledModules) {
    const directories = new Set();
    
    // Add base directories
    FILE_UPLOAD_BACKUP_CONFIG.baseDirectories.forEach(dir => {
        directories.add(dir);
    });
    
    // Add module-specific directories
    enabledModules.forEach(moduleName => {
        const moduleDirs = FILE_UPLOAD_BACKUP_CONFIG.moduleDirectories[moduleName];
        if (moduleDirs) {
            moduleDirs.forEach(dir => {
                directories.add(dir);
            });
        }
    });
    
    return Array.from(directories);
}

/**
 * Get retention policy for a module
 */
export function getRetentionPolicyForModule(moduleName) {
    for (const [policyName, policy] of Object.entries(MODULE_RETENTION_POLICIES)) {
        if (policy.modules.includes(moduleName)) {
            return {
                policyName,
                ...policy
            };
        }
    }
    
    // Default to standard policy
    return {
        policyName: 'standard',
        ...MODULE_RETENTION_POLICIES.standard
    };
}

/**
 * Validate module backup configuration
 */
export function validateModuleBackupConfig() {
    const errors = [];
    
    Object.entries(MODULE_BACKUP_CONFIG).forEach(([moduleName, config]) => {
        // Check required fields
        if (!config.collections || !Array.isArray(config.collections)) {
            errors.push(`Module ${moduleName}: collections must be an array`);
        }
        
        if (typeof config.priority !== 'number') {
            errors.push(`Module ${moduleName}: priority must be a number`);
        }
        
        if (!config.description) {
            errors.push(`Module ${moduleName}: description is required`);
        }
        
        // Check license feature for non-required modules
        if (!config.required && config.licenseFeature && typeof config.licenseFeature !== 'string') {
            errors.push(`Module ${moduleName}: licenseFeature must be a string`);
        }
    });
    
    return {
        valid: errors.length === 0,
        errors
    };
}

export default {
    MODULE_BACKUP_CONFIG,
    MODULE_RETENTION_POLICIES,
    FILE_UPLOAD_BACKUP_CONFIG,
    BACKUP_VERIFICATION_CONFIG,
    getModuleBackupConfig,
    getCollectionsForModules,
    getFileUploadDirectoriesForModules,
    getRetentionPolicyForModule,
    validateModuleBackupConfig
};