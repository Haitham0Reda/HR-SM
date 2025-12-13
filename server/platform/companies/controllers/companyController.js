/**
 * Platform Company Management Controller
 * 
 * Handles CRUD operations for multi-tenant companies from the platform interface
 */

import multiTenantDB from '../../../config/multiTenant.js';
import { getAvailableModels, MODEL_REGISTRY } from '../../../config/sharedModels.js';
import mongoose from 'mongoose';

// Helper function to get Company model safely
const getCompanyModel = (connection) => {
    const companySchema = new mongoose.Schema({
        name: String,
        sanitizedName: String,
        industry: String,
        adminEmail: String,
        phone: String,
        address: String,
        modules: [String],
        settings: {
            timezone: String,
            currency: String,
            language: String,
            workingHours: {
                start: String,
                end: String
            },
            weekendDays: [Number]
        },
        createdAt: Date,
        isActive: Boolean,
        updatedAt: { type: Date, default: Date.now }
    });

    // Check if model already exists to avoid compilation error
    try {
        return connection.model('Company');
    } catch (error) {
        return connection.model('Company', companySchema);
    }
};

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

        const companies = await multiTenantDB.listCompanyDatabases();
        const companiesData = [];

        for (const companyName of companies) {
            try {
                const connection = await multiTenantDB.getCompanyConnection(companyName);
                
                // Get company metadata
                const CompanyModel = getCompanyModel(connection);
                const companyInfo = await CompanyModel.findOne();

                // Get statistics
                const stats = await getCompanyStatistics(connection);
                
                // Get collections info
                const collections = await connection.db.listCollections().toArray();
                
                companiesData.push({
                    sanitizedName: companyName,
                    metadata: companyInfo || {
                        name: companyName,
                        sanitizedName: companyName,
                        isActive: true
                    },
                    statistics: stats,
                    collections: collections.map(col => ({
                        name: col.name,
                        type: col.type || 'collection'
                    })),
                    database: `hrsm_${companyName}`,
                    backupPath: multiTenantDB.getCompanyBackupPath(companyName),
                    uploadPath: multiTenantDB.getCompanyUploadPath(companyName)
                });

            } catch (error) {
                console.error(`Error getting data for company ${companyName}:`, error.message);
                companiesData.push({
                    sanitizedName: companyName,
                    metadata: { name: companyName, sanitizedName: companyName, isActive: false },
                    statistics: { error: error.message },
                    collections: [],
                    database: `hrsm_${companyName}`,
                    backupPath: multiTenantDB.getCompanyBackupPath(companyName),
                    uploadPath: multiTenantDB.getCompanyUploadPath(companyName)
                });
            }
        }

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
        
        const connection = await multiTenantDB.getCompanyConnection(companyName);
        
        // Get company metadata
        const CompanyModel = getCompanyModel(connection);
        const companyInfo = await CompanyModel.findOne();

        if (!companyInfo) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'COMPANY_NOT_FOUND',
                    message: 'Company metadata not found'
                }
            });
        }

        // Get detailed statistics
        const stats = await getDetailedCompanyStatistics(connection);
        
        // Get all collections with document counts
        const collections = await getCollectionsWithCounts(connection);
        
        // Get sample data from key collections
        const sampleData = await getSampleData(connection);

        res.json({
            success: true,
            data: {
                company: companyInfo,
                statistics: stats,
                collections: collections,
                sampleData: sampleData,
                database: `hrsm_${companyName}`,
                backupPath: multiTenantDB.getCompanyBackupPath(companyName),
                uploadPath: multiTenantDB.getCompanyUploadPath(companyName)
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

        // Check if company already exists
        const sanitizedName = multiTenantDB.sanitizeCompanyName(name);
        const existingCompanies = await multiTenantDB.listCompanyDatabases();
        
        if (existingCompanies.includes(sanitizedName)) {
            return res.status(409).json({
                success: false,
                error: {
                    code: 'COMPANY_EXISTS',
                    message: 'Company with this name already exists'
                }
            });
        }

        // Set default settings
        const defaultSettings = {
            timezone: 'UTC',
            currency: 'USD',
            language: 'en',
            workingHours: { start: '09:00', end: '17:00' },
            weekendDays: [0, 6], // Sunday, Saturday
            ...settings
        };

        // Create company database and metadata
        const companyData = {
            adminEmail,
            phone,
            address,
            industry,
            modules,
            settings: defaultSettings
        };

        const connection = await multiTenantDB.createCompanyDatabase(name, companyData);

        // Create initial data structure
        await createInitialCompanyStructure(connection, {
            name,
            sanitizedName,
            ...companyData
        });

        res.status(201).json({
            success: true,
            data: {
                company: {
                    name,
                    sanitizedName,
                    database: `hrsm_${sanitizedName}`,
                    ...companyData
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

        const connection = await multiTenantDB.getCompanyConnection(companyName);
        
        const CompanyModel = getCompanyModel(connection);
        
        const updatedCompany = await CompanyModel.findOneAndUpdate(
            { sanitizedName: companyName },
            { ...updates, updatedAt: new Date() },
            { new: true, runValidators: true }
        );

        if (!updatedCompany) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'COMPANY_NOT_FOUND',
                    message: 'Company not found'
                }
            });
        }

        res.json({
            success: true,
            data: {
                company: updatedCompany,
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

        const connection = await multiTenantDB.getCompanyConnection(companyName);
        
        if (permanent === 'true') {
            // Permanent deletion - drop the entire database
            await connection.dropDatabase();
            console.log(`Permanently deleted database: hrsm_${companyName}`);
            
            res.json({
                success: true,
                data: {
                    message: 'Company permanently deleted',
                    companyName,
                    action: 'permanent_delete'
                }
            });
        } else {
            // Soft delete - mark as inactive
            const CompanyModel = getCompanyModel(connection);
            
            await CompanyModel.findOneAndUpdate(
                { sanitizedName: companyName },
                { 
                    isActive: false, 
                    deletedAt: new Date(),
                    updatedAt: new Date()
                }
            );

            res.json({
                success: true,
                data: {
                    message: 'Company archived successfully',
                    companyName,
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

// Helper functions

async function getCompanyStatistics(connection) {
    try {
        const stats = {};
        
        // Get user count
        try {
            const userCount = await connection.collection('users').countDocuments();
            stats.users = userCount;
        } catch (error) {
            stats.users = 0;
        }

        // Get department count
        try {
            const deptCount = await connection.collection('departments').countDocuments();
            stats.departments = deptCount;
        } catch (error) {
            stats.departments = 0;
        }

        // Get total collections
        const collections = await connection.db.listCollections().toArray();
        stats.totalCollections = collections.length;

        return stats;
    } catch (error) {
        return { error: error.message };
    }
}

async function getDetailedCompanyStatistics(connection) {
    const stats = {};
    const collections = ['users', 'departments', 'positions', 'attendance', 'holidays', 'vacations', 'missions', 'requests', 'documents', 'events', 'announcements', 'notifications', 'payroll', 'reports', 'surveys'];

    for (const collectionName of collections) {
        try {
            const count = await connection.collection(collectionName).countDocuments();
            stats[collectionName] = count;
        } catch (error) {
            stats[collectionName] = 0;
        }
    }

    return stats;
}

async function getCollectionsWithCounts(connection) {
    try {
        const collections = await connection.db.listCollections().toArray();
        const collectionsWithCounts = [];

        for (const collection of collections) {
            try {
                const count = await connection.collection(collection.name).countDocuments();
                collectionsWithCounts.push({
                    name: collection.name,
                    type: collection.type || 'collection',
                    documentCount: count
                });
            } catch (error) {
                collectionsWithCounts.push({
                    name: collection.name,
                    type: collection.type || 'collection',
                    documentCount: 0,
                    error: error.message
                });
            }
        }

        return collectionsWithCounts;
    } catch (error) {
        return [];
    }
}

async function getSampleData(connection) {
    const sampleData = {};
    const collections = ['users', 'departments', 'companies'];

    for (const collectionName of collections) {
        try {
            const sample = await connection.collection(collectionName)
                .find({})
                .limit(3)
                .toArray();
            sampleData[collectionName] = sample;
        } catch (error) {
            sampleData[collectionName] = [];
        }
    }

    return sampleData;
}

async function createInitialCompanyStructure(connection, companyData) {
    try {
        // Create basic departments
        const departments = [
            { name: 'Human Resources', code: 'HR', arabicName: 'الموارد البشرية' },
            { name: 'Administration', code: 'ADMIN', arabicName: 'الإدارة' }
        ];

        const DepartmentModel = connection.model('Department', new mongoose.Schema({
            tenantId: String,
            name: String,
            code: String,
            arabicName: String,
            createdAt: { type: Date, default: Date.now }
        }));

        for (const dept of departments) {
            await DepartmentModel.create({
                tenantId: companyData.sanitizedName,
                ...dept
            });
        }

        // Create basic positions
        const positions = [
            { title: 'Administrator', code: 'ADMIN', arabicTitle: 'مدير' },
            { title: 'HR Manager', code: 'HR-MGR', arabicTitle: 'مدير الموارد البشرية' }
        ];

        const PositionModel = connection.model('Position', new mongoose.Schema({
            tenantId: String,
            title: String,
            code: String,
            arabicTitle: String,
            createdAt: { type: Date, default: Date.now }
        }));

        for (const pos of positions) {
            await PositionModel.create({
                tenantId: companyData.sanitizedName,
                ...pos
            });
        }

        console.log(`Created initial structure for company: ${companyData.name}`);
    } catch (error) {
        console.error('Error creating initial company structure:', error);
    }
}

/**
 * Get company modules
 */
export const getCompanyModules = async (req, res) => {
    try {
        const { companyName } = req.params;
        
        const connection = await multiTenantDB.getCompanyConnection(companyName);
        
        const CompanyModel = getCompanyModel(connection);
        const companyInfo = await CompanyModel.findOne({ sanitizedName: companyName });

        if (!companyInfo) {
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

        const enabledModules = companyInfo.modules || [];
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
                companyName,
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

        // Ensure hr-core is always included
        const updatedModules = [...new Set(['hr-core', ...modules])];

        const connection = await multiTenantDB.getCompanyConnection(companyName);
        
        const CompanyModel = getCompanyModel(connection);
        
        const updatedCompany = await CompanyModel.findOneAndUpdate(
            { sanitizedName: companyName },
            { 
                modules: updatedModules,
                updatedAt: new Date()
            },
            { new: true, runValidators: true }
        );

        if (!updatedCompany) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'COMPANY_NOT_FOUND',
                    message: 'Company not found'
                }
            });
        }

        res.json({
            success: true,
            data: {
                companyName,
                modules: updatedCompany.modules,
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

        const connection = await multiTenantDB.getCompanyConnection(companyName);
        
        const CompanyModel = getCompanyModel(connection);
        const company = await CompanyModel.findOne({ sanitizedName: companyName });

        if (!company) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'COMPANY_NOT_FOUND',
                    message: 'Company not found'
                }
            });
        }

        const currentModules = company.modules || [];
        
        if (currentModules.includes(moduleName)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'MODULE_ALREADY_ENABLED',
                    message: `Module '${moduleName}' is already enabled`
                }
            });
        }

        const updatedModules = [...currentModules, moduleName];
        
        await CompanyModel.findOneAndUpdate(
            { sanitizedName: companyName },
            { 
                modules: updatedModules,
                updatedAt: new Date()
            }
        );

        res.json({
            success: true,
            data: {
                companyName,
                moduleName,
                modules: updatedModules,
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

        const connection = await multiTenantDB.getCompanyConnection(companyName);
        
        const CompanyModel = getCompanyModel(connection);
        const company = await CompanyModel.findOne({ sanitizedName: companyName });

        if (!company) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'COMPANY_NOT_FOUND',
                    message: 'Company not found'
                }
            });
        }

        const currentModules = company.modules || [];
        
        if (!currentModules.includes(moduleName)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'MODULE_NOT_ENABLED',
                    message: `Module '${moduleName}' is not currently enabled`
                }
            });
        }

        const updatedModules = currentModules.filter(module => module !== moduleName);
        
        await CompanyModel.findOneAndUpdate(
            { sanitizedName: companyName },
            { 
                modules: updatedModules,
                updatedAt: new Date()
            }
        );

        res.json({
            success: true,
            data: {
                companyName,
                moduleName,
                modules: updatedModules,
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