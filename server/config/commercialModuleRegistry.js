/**
 * Commercial Module Registry
 * 
 * This registry extends the basic module registry with commercial metadata,
 * pricing tiers, and licensing information for productization.
 */

import { MODULES } from '../shared/constants/modules.js';
import { validateModuleConfig, PRICING_TIERS, LIMIT_TYPES } from './moduleConfigSchema.js';

/**
 * Commercial module configurations
 * Each module defines its commercial metadata, pricing, and limits
 */
export const commercialModuleConfigs = {
    [MODULES.HR_CORE]: {
        key: MODULES.HR_CORE,
        displayName: 'HR Core',
        version: '1.0.0',
        commercial: {
            description: 'Essential HR functionality including user management, authentication, roles, departments, and audit logging. Always included as the foundation of the system.',
            targetSegment: 'All customers - included in every deployment',
            valueProposition: 'Secure user management, role-based access control, and comprehensive audit trails for compliance',
            pricing: {
                starter: {
                    monthly: 0, // Always free/included
                    onPremise: 0,
                    limits: {
                        employees: 50,
                        storage: 1073741824, // 1GB in bytes
                        apiCalls: 10000
                    }
                },
                business: {
                    monthly: 0,
                    onPremise: 0,
                    limits: {
                        employees: 200,
                        storage: 10737418240, // 10GB
                        apiCalls: 50000
                    }
                },
                enterprise: {
                    monthly: 0,
                    onPremise: 0,
                    limits: {
                        employees: 'unlimited',
                        storage: 'unlimited',
                        apiCalls: 'unlimited'
                    }
                }
            }
        },
        dependencies: {
            required: [],
            optional: []
        },
        features: {},
        integrations: {
            provides: ['user-management', 'authentication', 'authorization', 'audit-logs'],
            consumes: []
        }
    },

    [MODULES.ATTENDANCE]: {
        key: MODULES.ATTENDANCE,
        displayName: 'Attendance & Time Tracking',
        version: '1.0.0',
        commercial: {
            description: 'Track employee attendance, working hours, and time-off with automated reporting and biometric device integration',
            targetSegment: 'Businesses with hourly or shift-based employees, manufacturing, retail, healthcare',
            valueProposition: 'Reduce time theft by up to 5%, automate timesheet processing, ensure labor law compliance, integrate with biometric devices',
            pricing: {
                starter: {
                    monthly: 5, // per employee/month
                    onPremise: 500, // one-time
                    limits: {
                        employees: 50,
                        devices: 2,
                        storage: 1073741824, // 1GB
                        apiCalls: 10000,
                        records: 10000 // attendance records per month
                    }
                },
                business: {
                    monthly: 8,
                    onPremise: 1500,
                    limits: {
                        employees: 200,
                        devices: 10,
                        storage: 10737418240, // 10GB
                        apiCalls: 50000,
                        records: 50000
                    }
                },
                enterprise: {
                    monthly: 'custom',
                    onPremise: 'custom',
                    limits: {
                        employees: 'unlimited',
                        devices: 'unlimited',
                        storage: 'unlimited',
                        apiCalls: 'unlimited',
                        records: 'unlimited'
                    }
                }
            }
        },
        dependencies: {
            required: [MODULES.HR_CORE],
            optional: [MODULES.REPORTING]
        },
        features: {
            biometricDevices: { tier: PRICING_TIERS.BUSINESS },
            geoFencing: { tier: PRICING_TIERS.BUSINESS },
            aiAnomalyDetection: { tier: PRICING_TIERS.ENTERPRISE },
            shiftManagement: { tier: PRICING_TIERS.BUSINESS }
        },
        integrations: {
            provides: ['attendance-data', 'timesheet-export', 'working-hours'],
            consumes: ['employee-roster', 'holiday-calendar', 'shift-schedules']
        }
    },

    [MODULES.LEAVE]: {
        key: MODULES.LEAVE,
        displayName: 'Leave Management',
        version: '1.0.0',
        commercial: {
            description: 'Comprehensive leave request management with automated approval workflows, balance tracking, and policy enforcement',
            targetSegment: 'All businesses managing employee time-off, vacation, and sick leave',
            valueProposition: 'Eliminate manual leave tracking, ensure policy compliance, reduce administrative overhead by 70%, provide employee self-service',
            pricing: {
                starter: {
                    monthly: 3,
                    onPremise: 300,
                    limits: {
                        employees: 50,
                        storage: 536870912, // 512MB
                        apiCalls: 5000,
                        records: 5000
                    }
                },
                business: {
                    monthly: 5,
                    onPremise: 800,
                    limits: {
                        employees: 200,
                        storage: 2147483648, // 2GB
                        apiCalls: 25000,
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
            required: [MODULES.HR_CORE],
            optional: [MODULES.ATTENDANCE, MODULES.REPORTING]
        },
        features: {
            customWorkflows: { tier: PRICING_TIERS.BUSINESS },
            multiLevelApproval: { tier: PRICING_TIERS.BUSINESS },
            leaveAccrual: { tier: PRICING_TIERS.STARTER },
            carryForward: { tier: PRICING_TIERS.BUSINESS }
        },
        integrations: {
            provides: ['leave-balances', 'leave-calendar', 'absence-data'],
            consumes: ['employee-roster', 'holiday-calendar', 'approval-chains']
        }
    },

    [MODULES.PAYROLL]: {
        key: MODULES.PAYROLL,
        displayName: 'Payroll Management',
        version: '1.0.0',
        commercial: {
            description: 'Automated payroll processing with tax calculations, deductions, benefits management, and compliance reporting',
            targetSegment: 'Businesses processing payroll in-house, SMBs to enterprises',
            valueProposition: 'Reduce payroll processing time by 80%, ensure tax compliance, automate salary calculations, integrate with attendance',
            pricing: {
                starter: {
                    monthly: 10,
                    onPremise: 2000,
                    limits: {
                        employees: 50,
                        storage: 2147483648, // 2GB
                        apiCalls: 15000,
                        records: 1000 // payroll runs per month
                    }
                },
                business: {
                    monthly: 15,
                    onPremise: 5000,
                    limits: {
                        employees: 200,
                        storage: 10737418240, // 10GB
                        apiCalls: 50000,
                        records: 5000
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
            required: [MODULES.HR_CORE, MODULES.ATTENDANCE],
            optional: [MODULES.LEAVE, MODULES.REPORTING]
        },
        features: {
            taxCalculation: { tier: PRICING_TIERS.STARTER },
            directDeposit: { tier: PRICING_TIERS.BUSINESS },
            benefitsManagement: { tier: PRICING_TIERS.BUSINESS },
            multiCurrency: { tier: PRICING_TIERS.ENTERPRISE },
            customDeductions: { tier: PRICING_TIERS.BUSINESS }
        },
        integrations: {
            provides: ['payroll-data', 'salary-slips', 'tax-reports'],
            consumes: ['attendance-data', 'leave-balances', 'employee-roster']
        }
    },

    [MODULES.DOCUMENTS]: {
        key: MODULES.DOCUMENTS,
        displayName: 'Document Management',
        version: '1.0.0',
        commercial: {
            description: 'Secure document storage, version control, e-signatures, and automated document workflows for employee files',
            targetSegment: 'Businesses managing employee contracts, certifications, and compliance documents',
            valueProposition: 'Eliminate paper filing, ensure document security, automate expiration tracking, enable remote document signing',
            pricing: {
                starter: {
                    monthly: 4,
                    onPremise: 400,
                    limits: {
                        employees: 50,
                        storage: 5368709120, // 5GB
                        apiCalls: 10000,
                        records: 5000 // documents
                    }
                },
                business: {
                    monthly: 7,
                    onPremise: 1200,
                    limits: {
                        employees: 200,
                        storage: 53687091200, // 50GB
                        apiCalls: 30000,
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
            required: [MODULES.HR_CORE],
            optional: [MODULES.REPORTING]
        },
        features: {
            versionControl: { tier: PRICING_TIERS.BUSINESS },
            eSignatures: { tier: PRICING_TIERS.BUSINESS },
            expirationTracking: { tier: PRICING_TIERS.STARTER },
            templateManagement: { tier: PRICING_TIERS.BUSINESS },
            bulkUpload: { tier: PRICING_TIERS.BUSINESS }
        },
        integrations: {
            provides: ['document-storage', 'document-templates', 'signature-workflows'],
            consumes: ['employee-roster', 'approval-chains']
        }
    },

    [MODULES.COMMUNICATION]: {
        key: MODULES.COMMUNICATION,
        displayName: 'Communication & Notifications',
        version: '1.0.0',
        commercial: {
            description: 'Internal messaging, announcements, notifications, and employee communication hub with mobile push support',
            targetSegment: 'Organizations needing internal communication tools, remote teams, distributed workforce',
            valueProposition: 'Centralize employee communications, reduce email clutter, ensure message delivery, engage remote employees',
            pricing: {
                starter: {
                    monthly: 2,
                    onPremise: 200,
                    limits: {
                        employees: 50,
                        storage: 1073741824, // 1GB
                        apiCalls: 20000,
                        records: 10000 // messages per month
                    }
                },
                business: {
                    monthly: 4,
                    onPremise: 600,
                    limits: {
                        employees: 200,
                        storage: 5368709120, // 5GB
                        apiCalls: 100000,
                        records: 50000
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
            required: [MODULES.HR_CORE],
            optional: []
        },
        features: {
            directMessaging: { tier: PRICING_TIERS.BUSINESS },
            groupChannels: { tier: PRICING_TIERS.BUSINESS },
            mobilePush: { tier: PRICING_TIERS.BUSINESS },
            fileSharing: { tier: PRICING_TIERS.BUSINESS },
            readReceipts: { tier: PRICING_TIERS.ENTERPRISE }
        },
        integrations: {
            provides: ['notifications', 'announcements', 'messaging'],
            consumes: ['employee-roster', 'user-preferences']
        }
    },

    [MODULES.REPORTING]: {
        key: MODULES.REPORTING,
        displayName: 'Reporting & Analytics',
        version: '1.0.0',
        commercial: {
            description: 'Advanced analytics, custom reports, dashboards, and data visualization for HR metrics and insights',
            targetSegment: 'Data-driven organizations, HR analytics teams, management requiring insights',
            valueProposition: 'Make data-driven decisions, identify trends, automate compliance reporting, visualize workforce metrics',
            pricing: {
                starter: {
                    monthly: 6,
                    onPremise: 800,
                    limits: {
                        employees: 50,
                        storage: 2147483648, // 2GB
                        apiCalls: 15000,
                        records: 1000 // reports per month
                    }
                },
                business: {
                    monthly: 12,
                    onPremise: 2500,
                    limits: {
                        employees: 200,
                        storage: 10737418240, // 10GB
                        apiCalls: 50000,
                        records: 5000
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
            required: [MODULES.HR_CORE],
            optional: []
        },
        features: {
            customReports: { tier: PRICING_TIERS.BUSINESS },
            scheduledReports: { tier: PRICING_TIERS.BUSINESS },
            dashboards: { tier: PRICING_TIERS.STARTER },
            dataExport: { tier: PRICING_TIERS.STARTER },
            predictiveAnalytics: { tier: PRICING_TIERS.ENTERPRISE }
        },
        integrations: {
            provides: ['analytics-data', 'report-generation', 'data-visualization'],
            consumes: ['attendance-data', 'leave-balances', 'payroll-data', 'employee-roster']
        }
    },

    [MODULES.TASKS]: {
        key: MODULES.TASKS,
        displayName: 'Task & Work Reporting',
        version: '1.0.0',
        commercial: {
            description: 'Task assignment, work reporting, project tracking, and productivity monitoring for employee work management',
            targetSegment: 'Project-based organizations, consulting firms, teams requiring work tracking',
            valueProposition: 'Track project progress, monitor productivity, assign and manage tasks, generate work reports',
            pricing: {
                starter: {
                    monthly: 4,
                    onPremise: 500,
                    limits: {
                        employees: 50,
                        storage: 1073741824, // 1GB
                        apiCalls: 10000,
                        records: 5000 // tasks per month
                    }
                },
                business: {
                    monthly: 7,
                    onPremise: 1500,
                    limits: {
                        employees: 200,
                        storage: 5368709120, // 5GB
                        apiCalls: 30000,
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
            required: [MODULES.HR_CORE],
            optional: [MODULES.REPORTING]
        },
        features: {
            taskAssignment: { tier: PRICING_TIERS.STARTER },
            workReporting: { tier: PRICING_TIERS.STARTER },
            projectTracking: { tier: PRICING_TIERS.BUSINESS },
            timeTracking: { tier: PRICING_TIERS.BUSINESS },
            ganttCharts: { tier: PRICING_TIERS.ENTERPRISE }
        },
        integrations: {
            provides: ['task-data', 'work-reports', 'project-status'],
            consumes: ['employee-roster', 'user-assignments']
        }
    }
};

/**
 * Validate all module configurations on startup
 */
export function validateAllModuleConfigs() {
    const errors = [];

    // Validate individual module configs
    for (const [moduleKey, config] of Object.entries(commercialModuleConfigs)) {
        try {
            validateModuleConfig(config);
        } catch (error) {
            errors.push({
                module: moduleKey,
                error: error.message,
                details: error.errors
            });
        }
    }

    if (errors.length > 0) {
        console.error('Module configuration validation errors:', errors);
        throw new Error(`${errors.length} module(s) have invalid configurations`);
    }

    return true;
}

/**
 * Validate all module configurations including dependency graph
 * This is an async version that also validates dependencies
 */
export async function validateAllModuleConfigsWithDependencies() {
    const errors = [];

    // Validate individual module configs
    for (const [moduleKey, config] of Object.entries(commercialModuleConfigs)) {
        try {
            validateModuleConfig(config);
        } catch (error) {
            errors.push({
                module: moduleKey,
                error: error.message,
                details: error.errors
            });
        }
    }

    // Validate dependency graph
    try {
        const { dependencyResolver } = await import('../services/dependencyResolver.service.js');
        const graphValidation = dependencyResolver.validateDependencyGraph();

        if (!graphValidation.valid) {
            graphValidation.errors.forEach(error => {
                errors.push({
                    module: error.module || 'dependency-graph',
                    error: error.message,
                    details: error
                });
            });
        }

        // Log warnings but don't fail
        if (graphValidation.warnings.length > 0) {
            console.warn('Module dependency warnings:', graphValidation.warnings);
        }
    } catch (error) {
        console.error('Failed to validate dependency graph:', error);
        errors.push({
            module: 'dependency-graph',
            error: 'Failed to validate dependency graph',
            details: error.message
        });
    }

    if (errors.length > 0) {
        console.error('Module configuration validation errors:', errors);
        throw new Error(`${errors.length} module(s) have invalid configurations`);
    }

    return true;
}

/**
 * Get module configuration by key
 */
export function getModuleConfig(moduleKey) {
    return commercialModuleConfigs[moduleKey] || null;
}

/**
 * Get all module configurations
 */
export function getAllModuleConfigs() {
    return { ...commercialModuleConfigs };
}

/**
 * Get modules by pricing tier
 */
export function getModulesByTier(tier) {
    return Object.values(commercialModuleConfigs).filter(config => {
        return config.commercial.pricing[tier] !== undefined;
    });
}

/**
 * Get module pricing for a specific tier
 */
export function getModulePricing(moduleKey, tier) {
    const config = getModuleConfig(moduleKey);
    if (!config) {
        return null;
    }
    return config.commercial.pricing[tier] || null;
}

/**
 * Get all dependencies for a module (including transitive)
 * @deprecated Use dependencyResolver.resolveDependencies() instead
 */
export function getModuleDependencies(moduleKey, includeOptional = false, visited = new Set()) {
    const config = getModuleConfig(moduleKey);
    if (!config) {
        return [];
    }

    // Prevent circular dependency loops
    if (visited.has(moduleKey)) {
        return [];
    }
    visited.add(moduleKey);

    const dependencies = new Set(config.dependencies.required);

    if (includeOptional) {
        config.dependencies.optional?.forEach(dep => dependencies.add(dep));
    }

    // Recursively get dependencies
    const allDeps = new Set(dependencies);
    for (const dep of dependencies) {
        const subDeps = getModuleDependencies(dep, includeOptional, visited);
        subDeps.forEach(subDep => allDeps.add(subDep));
    }

    return Array.from(allDeps);
}

/**
 * Check if a module has a specific feature in a tier
 */
export function hasFeatureInTier(moduleKey, featureName, tier) {
    const config = getModuleConfig(moduleKey);
    if (!config || !config.features) {
        return false;
    }

    const feature = config.features[featureName];
    if (!feature) {
        return false;
    }

    const tierHierarchy = {
        [PRICING_TIERS.STARTER]: 1,
        [PRICING_TIERS.BUSINESS]: 2,
        [PRICING_TIERS.ENTERPRISE]: 3
    };

    return tierHierarchy[tier] >= tierHierarchy[feature.tier];
}

/**
 * Get marketing summary for all modules
 */
export function getMarketingSummary() {
    return Object.values(commercialModuleConfigs).map(config => ({
        key: config.key,
        displayName: config.displayName,
        description: config.commercial.description,
        targetSegment: config.commercial.targetSegment,
        valueProposition: config.commercial.valueProposition,
        startingPrice: config.commercial.pricing.starter.monthly,
        features: Object.keys(config.features || {})
    }));
}

/**
 * Validate module activation with dependency checking
 * @param {string} moduleKey - Module to validate
 * @param {Array<string>} enabledModules - Currently enabled modules
 * @returns {Object} Validation result
 */
export async function validateModuleActivation(moduleKey, enabledModules = []) {
    const { dependencyResolver } = await import('../services/dependencyResolver.service.js');
    return dependencyResolver.validateModuleActivation(moduleKey, enabledModules);
}

/**
 * Get activation order for modules
 * @param {Array<string>} moduleKeys - Modules to activate
 * @returns {Array<string>} Modules in dependency order
 */
export async function getModuleActivationOrder(moduleKeys) {
    const { dependencyResolver } = await import('../services/dependencyResolver.service.js');
    return dependencyResolver.getActivationOrder(moduleKeys);
}

/**
 * Check if module A depends on module B
 * @param {string} moduleA - Module to check
 * @param {string} moduleB - Potential dependency
 * @returns {boolean} True if A depends on B
 */
export async function checkModuleDependency(moduleA, moduleB) {
    const { dependencyResolver } = await import('../services/dependencyResolver.service.js');
    return dependencyResolver.dependsOn(moduleA, moduleB);
}

export default {
    commercialModuleConfigs,
    validateAllModuleConfigs,
    validateAllModuleConfigsWithDependencies,
    getModuleConfig,
    getAllModuleConfigs,
    getModulesByTier,
    getModulePricing,
    getModuleDependencies,
    hasFeatureInTier,
    getMarketingSummary,
    validateModuleActivation,
    getModuleActivationOrder,
    checkModuleDependency
};
