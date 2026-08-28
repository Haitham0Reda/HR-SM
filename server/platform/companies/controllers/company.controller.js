/**
 * Platform Company Management Controller
 * 
 * Handles CRUD operations for multi-tenant companies from the platform interface
 */

import Company from '../../models/Company.js';
import { Op } from 'sequelize';
import { getAvailableModels, MODEL_REGISTRY } from '../../../config/sharedModels.js';

// Cache for company data (5 minutes)
let companiesCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get all companies with their metadata and statistics
 */
export const getAllCompanies = async (req, res) => {
    try {
        // Check cache first
        const now = Date.now();
        if (companiesCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
            return res.json({
                success: true,
                data: {
                    companies: companiesCache,
                    cached: true,
                    cacheAge: Math.round((now - cacheTimestamp) / 1000)
                }
            });
        }

        // Get all companies from the platform_companies table
        const companies = await Company.findAll({
            order: [['createdAt', 'DESC']]
        });

        const companiesData = companies.map(company => ({
            id: company.id,
            name: company.name,
            slug: company.slug,
            sanitizedName: company.slug, // For backward compatibility
            metadata: {
                name: company.name,
                sanitizedName: company.slug,
                adminEmail: company.adminEmail,
                phone: company.phone,
                address: company.address,
                status: company.status,
                isActive: company.status === 'active'
            },
            modules: company.getEnabledModules(),
            settings: company.settings,
            subscription: company.subscription,
            database: company.databaseName,
            statistics: {
                employees: company.usage?.employees || 0,
                storage: company.usage?.storage || 0,
                apiCalls: company.usage?.apiCalls || 0
            },
            // Note: Collections info not available in single-DB architecture
            // This was MongoDB-specific per-tenant database information
            collections: []
        }));

        // Update cache
        companiesCache = companiesData;
        cacheTimestamp = Date.now();

        res.json({
            success: true,
            data: {
                companies: companiesData,
                totalCompanies: companiesData.length,
                availableModels: getAvailableModels()
            },
            meta: {
                timestamp: new Date().toISOString(),
                requestId: req.id || 'unknown',
                cached: false
            }
        });

    } catch (error) {
        console.error('Error getting all companies:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'COMPANIES_FETCH_ERROR',
                message: 'Failed to fetch companies',
                details: error.message
            },
            meta: {
                timestamp: new Date().toISOString(),
                requestId: req.id || 'unknown'
            }
        });
    }
};

/**
 * Get detailed information about a specific company
 */
export const getCompanyDetails = async (req, res) => {
    try {
        const { companyName } = req.params;
        
        // Find company by slug (sanitizedName)
        const company = await Company.findOne({
            where: {
                [Op.or]: [
                    { slug: companyName },
                    { name: companyName }
                ]
            }
        });

        if (!company) {
            return res.status(404).json({
                success: true,
                error: {
                    code: 'COMPANY_NOT_FOUND',
                    message: 'Company metadata not found'
                }
            });
        }

        // Build detailed response
        const detailedData = {
            id: company.id,
            name: company.name,
            slug: company.slug,
            sanitizedName: company.slug,
            adminEmail: company.adminEmail,
            emailDomain: company.emailDomain,
            phone: company.phone,
            address: company.address,
            status: company.status,
            isActive: company.status === 'active',
            subscription: company.subscription,
            modules: company.modules,
            settings: company.settings,
            licenseKey: company.licenseKey,
            licenseData: company.licenseData,
            usage: company.usage,
            database: company.databaseName,
            createdAt: company.createdAt,
            updatedAt: company.updatedAt
        };

        // Get enabled modules list
        const enabledModules = company.getEnabledModules();

        res.json({
            success: true,
            data: {
                company: detailedData,
                enabledModules,
                statistics: {
                    employees: company.usage?.employees || 0,
                    storage: company.usage?.storage || 0,
                    apiCalls: company.usage?.apiCalls || 0
                },
                // Note: Collections and sample data not available in single-DB architecture
                // This was MongoDB-specific per-tenant database information
                collections: [],
                sampleData: {}
            },
            meta: {
                timestamp: new Date().toISOString(),
                requestId: req.id || 'unknown'
            }
        });

    } catch (error) {
        console.error('Error getting company details:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'COMPANY_DETAILS_ERROR',
                message: 'Failed to fetch company details',
                details: error.message
            }
        });
    }
};

/**
 * Create a new company
 */
export const createCompany = async (req, res) => {
    try {
        const {
            name,
            industry,
            adminEmail,
            phone,
            address,
            modules = ['hr-core'],
            settings = {}
        } = req.body;

        // Validate required fields
        if (!name || !adminEmail) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Company name and admin email are required'
                }
            });
        }

        // Generate slug from name
        const slug = name.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');

        // Check if company already exists
        const existingCompany = await Company.findOne({
            where: {
                [Op.or]: [
                    { slug },
                    { name }
                ]
            }
        });
        
        if (existingCompany) {
            return res.status(409).json({
                success: false,
                error: {
                    code: 'COMPANY_EXISTS',
                    message: 'Company with this name already exists'
                }
            });
        }

        // Extract email domain
        const emailDomain = adminEmail.split('@')[1];

        // Set default settings
        const defaultSettings = {
            timezone: 'UTC',
            currency: 'USD',
            language: 'en',
            dateFormat: 'YYYY-MM-DD',
            workingHours: { start: '09:00', end: '17:00' },
            weekendDays: [0, 6], // Sunday, Saturday
            ...settings
        };

        // Build modules configuration
        const modulesConfig = {};
        const modulesList = ['hr-core', ...modules.filter(m => m !== 'hr-core')];
        
        modulesList.forEach(moduleKey => {
            modulesConfig[moduleKey] = {
                enabled: true,
                tier: 'starter',
                limits: {
                    employees: null,
                    devices: null,
                    storage: null,
                    apiCalls: null
                },
                enabledAt: new Date(),
                disabledAt: null
            };
        });

        // Create company record
        const company = await Company.create({
            name,
            slug,
            databaseName: `hrsm_${slug}`,
            adminEmail,
            emailDomain,
            phone,
            address,
            status: 'trial',
            subscription: {
                plan: 'trial',
                autoRenew: false,
                startDate: new Date(),
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days trial
            },
            modules: modulesConfig,
            settings: defaultSettings,
            usage: {
                employees: 0,
                storage: 0,
                apiCalls: 0
            }
        });

        res.status(201).json({
            success: true,
            data: {
                company: {
                    id: company.id,
                    name: company.name,
                    slug: company.slug,
                    sanitizedName: company.slug,
                    database: company.databaseName,
                    adminEmail: company.adminEmail,
                    phone: company.phone,
                    address: company.address,
                    status: company.status,
                    modules: modulesList,
                    settings: company.settings
                },
                message: 'Company created successfully'
            },
            meta: {
                timestamp: new Date().toISOString(),
                requestId: req.id || 'unknown'
            }
        });

    } catch (error) {
        console.error('Error creating company:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'COMPANY_CREATION_ERROR',
                message: 'Failed to create company',
                details: error.message
            }
        });
    }
};

/**
 * Update company metadata
 */
export const updateCompany = async (req, res) => {
    try {
        const { companyName } = req.params;
        const updates = req.body;

        // Find company by slug or name
        const company = await Company.findOne({
            where: {
                [Op.or]: [
                    { slug: companyName },
                    { name: companyName }
                ]
            }
        });
        
        if (!company) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'COMPANY_NOT_FOUND',
                    message: 'Company not found'
                }
            });
        }

        // Update allowed fields
        const allowedUpdates = ['phone', 'address', 'settings', 'status'];
        allowedUpdates.forEach(field => {
            if (updates[field] !== undefined) {
                company[field] = updates[field];
            }
        });

        // Handle settings merge
        if (updates.settings) {
            company.settings = {
                ...company.settings,
                ...updates.settings
            };
            company.changed('settings', true); // Mark JSONB field as changed
        }

        await company.save();

        res.json({
            success: true,
            data: {
                company: {
                    id: company.id,
                    name: company.name,
                    slug: company.slug,
                    adminEmail: company.adminEmail,
                    phone: company.phone,
                    address: company.address,
                    status: company.status,
                    settings: company.settings,
                    updatedAt: company.updatedAt
                },
                message: 'Company updated successfully'
            },
            meta: {
                timestamp: new Date().toISOString(),
                requestId: req.id || 'unknown'
            }
        });

    } catch (error) {
        console.error('Error updating company:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'COMPANY_UPDATE_ERROR',
                message: 'Failed to update company',
                details: error.message
            }
        });
    }
};

/**
 * Delete/Archive a company
 */
export const deleteCompany = async (req, res) => {
    try {
        const { companyName } = req.params;
        const { permanent = false } = req.query;

        // Find company by slug or name
        const company = await Company.findOne({
            where: {
                [Op.or]: [
                    { slug: companyName },
                    { name: companyName }
                ]
            }
        });
        
        if (!company) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'COMPANY_NOT_FOUND',
                    message: 'Company not found'
                }
            });
        }

        if (permanent === 'true') {
            // Permanent deletion - remove the company record
            // Note: In single-DB architecture, we don't drop databases
            // The tenant data is filtered by tenantId in all queries
            await company.destroy();
            console.log(`Permanently deleted company: ${company.name} (${company.slug})`);
            
            res.json({
                success: true,
                data: {
                    message: 'Company permanently deleted',
                    companyName: company.slug,
                    action: 'permanent_delete'
                }
            });
        } else {
            // Soft delete - mark as inactive
            company.status = 'inactive';
            await company.save();

            res.json({
                success: true,
                data: {
                    message: 'Company archived successfully',
                    companyName: company.slug,
                    action: 'archive'
                }
            });
        }

    } catch (error) {
        console.error('Error deleting company:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'COMPANY_DELETE_ERROR',
                message: 'Failed to delete company',
                details: error.message
            }
        });
    }
};

/**
 * Get available modules and models
 */
export const getAvailableModulesAndModels = async (req, res) => {
    try {
        const availableModels = getAvailableModels();
        const moduleCategories = {
            'hr-core': ['User', 'Department', 'Position', 'Role'],
            'attendance': ['Attendance', 'ForgetCheck'],
            'holidays': ['Holiday'],
            'vacations': ['Vacation', 'SickLeave', 'MixedVacation', 'VacationBalance'],
            'missions': ['Mission'],
            'requests': ['Request', 'Permission', 'RequestControl'],
            'documents': ['Document', 'DocumentTemplate', 'Hardcopy'],
            'events': ['Event'],
            'announcements': ['Announcement'],
            'notifications': ['Notification'],
            'payroll': ['Payroll'],
            'reports': ['Report', 'ReportConfig', 'ReportExecution', 'ReportExport'],
            'surveys': ['Survey', 'SurveyNotification'],
            'dashboard': ['DashboardConfig'],
            'theme': ['ThemeConfig']
        };

        res.json({
            success: true,
            data: {
                availableModels,
                moduleCategories,
                totalModels: availableModels.length,
                totalModules: Object.keys(moduleCategories).length
            },
            meta: {
                timestamp: new Date().toISOString(),
                requestId: req.id || 'unknown'
            }
        });

    } catch (error) {
        console.error('Error getting modules and models:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'MODULES_FETCH_ERROR',
                message: 'Failed to fetch modules and models',
                details: error.message
            }
        });
    }
};

/**
 * Get company modules
 */
export const getCompanyModules = async (req, res) => {
    try {
        const { companyName } = req.params;
        
        // Find company by slug or name
        const company = await Company.findOne({
            where: {
                [Op.or]: [
                    { slug: companyName },
                    { name: companyName }
                ]
            }
        });

        if (!company) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'COMPANY_NOT_FOUND',
                    message: 'Company not found'
                }
            });
        }

        // Get available modules
        const availableModules = {
            'hr-core': { name: 'HR Core', description: 'Core HR functionality', required: true },
            'attendance': { name: 'Attendance', description: 'Time tracking and attendance management' },
            'holidays': { name: 'Holidays', description: 'Holiday and calendar management' },
            'vacations': { name: 'Vacations', description: 'Leave and vacation management' },
            'missions': { name: 'Missions', description: 'Business trips and missions' },
            'requests': { name: 'Requests', description: 'Employee requests and approvals' },
            'documents': { name: 'Documents', description: 'Document management system' },
            'events': { name: 'Events', description: 'Company events and activities' },
            'announcements': { name: 'Announcements', description: 'Company announcements' },
            'notifications': { name: 'Notifications', description: 'System notifications' },
            'payroll': { name: 'Payroll', description: 'Salary and payroll management' },
            'reports': { name: 'Reports', description: 'Analytics and reporting' },
            'surveys': { name: 'Surveys', description: 'Employee surveys and feedback' },
            'dashboard': { name: 'Dashboard', description: 'Custom dashboards' },
            'theme': { name: 'Theme', description: 'UI customization and themes' }
        };

        const enabledModules = company.getEnabledModules();
        const moduleStatus = {};

        Object.keys(availableModules).forEach(moduleKey => {
            moduleStatus[moduleKey] = {
                ...availableModules[moduleKey],
                enabled: enabledModules.includes(moduleKey),
                canDisable: moduleKey !== 'hr-core' // HR Core is always required
            };
        });

        res.json({
            success: true,
            data: {
                companyName: company.slug,
                enabledModules,
                availableModules: moduleStatus,
                totalAvailable: Object.keys(availableModules).length,
                totalEnabled: enabledModules.length
            },
            meta: {
                timestamp: new Date().toISOString(),
                requestId: req.id || 'unknown'
            }
        });

    } catch (error) {
        console.error('Error getting company modules:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'MODULES_FETCH_ERROR',
                message: 'Failed to fetch company modules',
                details: error.message
            }
        });
    }
};

/**
 * Update company modules (bulk update)
 */
export const updateCompanyModules = async (req, res) => {
    try {
        const { companyName } = req.params;
        const { modules } = req.body;

        if (!Array.isArray(modules)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Modules must be an array'
                }
            });
        }

        // Find company by slug or name
        const company = await Company.findOne({
            where: {
                [Op.or]: [
                    { slug: companyName },
                    { name: companyName }
                ]
            }
        });
        
        if (!company) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'COMPANY_NOT_FOUND',
                    message: 'Company not found'
                }
            });
        }

        // Ensure hr-core is always included
        const updatedModules = [...new Set(['hr-core', ...modules])];

        // Update modules configuration
        const modulesConfig = company.modules || {};
        
        // Disable modules not in the list
        Object.keys(modulesConfig).forEach(moduleKey => {
            if (!updatedModules.includes(moduleKey) && moduleKey !== 'hr-core') {
                company.disableModule(moduleKey);
            }
        });

        // Enable new modules
        updatedModules.forEach(moduleKey => {
            if (!company.isModuleEnabled(moduleKey)) {
                company.enableModule(moduleKey);
            }
        });

        await company.save();

        res.json({
            success: true,
            data: {
                companyName: company.slug,
                modules: company.getEnabledModules(),
                message: 'Company modules updated successfully'
            },
            meta: {
                timestamp: new Date().toISOString(),
                requestId: req.id || 'unknown'
            }
        });

    } catch (error) {
        console.error('Error updating company modules:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'MODULES_UPDATE_ERROR',
                message: 'Failed to update company modules',
                details: error.message
            }
        });
    }
};

/**
 * Enable a specific module for a company
 */
export const enableModule = async (req, res) => {
    try {
        const { companyName, moduleName } = req.params;

        // Find company by slug or name
        const company = await Company.findOne({
            where: {
                [Op.or]: [
                    { slug: companyName },
                    { name: companyName }
                ]
            }
        });

        if (!company) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'COMPANY_NOT_FOUND',
                    message: 'Company not found'
                }
            });
        }

        if (company.isModuleEnabled(moduleName)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'MODULE_ALREADY_ENABLED',
                    message: `Module '${moduleName}' is already enabled`
                }
            });
        }

        company.enableModule(moduleName);
        await company.save();

        res.json({
            success: true,
            data: {
                companyName: company.slug,
                moduleName,
                modules: company.getEnabledModules(),
                message: `Module '${moduleName}' enabled successfully`
            },
            meta: {
                timestamp: new Date().toISOString(),
                requestId: req.id || 'unknown'
            }
        });

    } catch (error) {
        console.error('Error enabling module:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'MODULE_ENABLE_ERROR',
                message: 'Failed to enable module',
                details: error.message
            }
        });
    }
};

/**
 * Disable a specific module for a company
 */
export const disableModule = async (req, res) => {
    try {
        const { companyName, moduleName } = req.params;

        // Prevent disabling hr-core
        if (moduleName === 'hr-core') {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'MODULE_REQUIRED',
                    message: 'HR Core module cannot be disabled as it is required'
                }
            });
        }

        // Find company by slug or name
        const company = await Company.findOne({
            where: {
                [Op.or]: [
                    { slug: companyName },
                    { name: companyName }
                ]
            }
        });

        if (!company) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'COMPANY_NOT_FOUND',
                    message: 'Company not found'
                }
            });
        }

        if (!company.isModuleEnabled(moduleName)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'MODULE_NOT_ENABLED',
                    message: `Module '${moduleName}' is not currently enabled`
                }
            });
        }

        company.disableModule(moduleName);
        await company.save();

        res.json({
            success: true,
            data: {
                companyName: company.slug,
                moduleName,
                modules: company.getEnabledModules(),
                message: `Module '${moduleName}' disabled successfully`
            },
            meta: {
                timestamp: new Date().toISOString(),
                requestId: req.id || 'unknown'
            }
        });

    } catch (error) {
        console.error('Error disabling module:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'MODULE_DISABLE_ERROR',
                message: 'Failed to disable module',
                details: error.message
            }
        });
    }
};

export default {
    getAllCompanies,
    getCompanyDetails,
    createCompany,
    updateCompany,
    deleteCompany,
    getAvailableModulesAndModels,
    getCompanyModules,
    updateCompanyModules,
    enableModule,
    disableModule
};