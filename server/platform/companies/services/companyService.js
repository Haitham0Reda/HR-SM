/**
 * Platform Company Management Service
 * 
 * Business logic for managing multi-tenant companies
 */

import multiTenantDB from '../../../config/multiTenant.js';
import { getModelForConnection } from '../../../config/sharedModels.js';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

class CompanyService {
    /**
     * Get comprehensive company statistics
     */
    async getCompanyAnalytics(companyName) {
        try {
            const connection = await multiTenantDB.getCompanyConnection(companyName);
            
            const analytics = {
                overview: {},
                userAnalytics: {},
                moduleUsage: {},
                dataDistribution: {},
                activityMetrics: {}
            };

            // Overview statistics
            analytics.overview = await this.getOverviewStats(connection);
            
            // User analytics
            analytics.userAnalytics = await this.getUserAnalytics(connection);
            
            // Module usage
            analytics.moduleUsage = await this.getModuleUsage(connection);
            
            // Data distribution
            analytics.dataDistribution = await this.getDataDistribution(connection);
            
            // Activity metrics (if available)
            analytics.activityMetrics = await this.getActivityMetrics(connection);

            return analytics;
        } catch (error) {
            throw new Error(`Failed to get company analytics: ${error.message}`);
        }
    }

    /**
     * Create a complete company setup with initial data
     */
    async createCompleteCompany(companyData) {
        try {
            const {
                name,
                industry,
                adminEmail,
                adminPassword = 'admin123',
                phone,
                address,
                modules = ['hr-core'],
                settings = {},
                createSampleData = false
            } = companyData;

            // Create company database
            const connection = await multiTenantDB.createCompanyDatabase(name, {
                adminEmail,
                phone,
                address,
                industry,
                modules,
                settings
            });

            const sanitizedName = multiTenantDB.sanitizeCompanyName(name);

            // Create company metadata
            await this.createCompanyMetadata(connection, {
                name,
                sanitizedName,
                industry,
                adminEmail,
                phone,
                address,
                modules,
                settings
            });

            // Create initial structure
            const initialData = await this.createInitialStructure(connection, sanitizedName, industry);

            // Create admin user
            const adminUser = await this.createAdminUser(connection, {
                email: adminEmail,
                password: adminPassword,
                tenantId: sanitizedName,
                department: initialData.departments[0]?._id,
                position: initialData.positions[0]?._id
            });

            // Create sample data if requested
            if (createSampleData) {
                await this.createSampleData(connection, sanitizedName, initialData);
            }

            return {
                company: {
                    name,
                    sanitizedName,
                    database: `hrsm_${sanitizedName}`,
                    adminUser: {
                        email: adminUser.email,
                        password: adminPassword,
                        role: adminUser.role
                    }
                },
                initialData
            };

        } catch (error) {
            throw new Error(`Failed to create complete company: ${error.message}`);
        }
    }

    /**
     * Backup company data
     */
    async backupCompany(companyName) {
        try {
            // This would integrate with the backup system
            const backupPath = multiTenantDB.getCompanyBackupPath(companyName);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupFileName = `platform_backup_${companyName}_${timestamp}.json`;

            // Get all company data
            const connection = await multiTenantDB.getCompanyConnection(companyName);
            const collections = await connection.db.listCollections().toArray();
            
            const backupData = {
                company: companyName,
                timestamp: new Date().toISOString(),
                collections: {}
            };

            for (const collection of collections) {
                const data = await connection.collection(collection.name).find({}).toArray();
                backupData.collections[collection.name] = data;
            }

            return {
                backupPath,
                backupFileName,
                backupData,
                size: JSON.stringify(backupData).length
            };

        } catch (error) {
            throw new Error(`Failed to backup company: ${error.message}`);
        }
    }

    /**
     * Clone company structure to create a new company
     */
    async cloneCompany(sourceCompanyName, newCompanyData) {
        try {
            const sourceConnection = await multiTenantDB.getCompanyConnection(sourceCompanyName);
            
            // Get source company structure
            const sourceStructure = await this.getCompanyStructure(sourceConnection);
            
            // Create new company with cloned structure
            const newCompany = await this.createCompleteCompany({
                ...newCompanyData,
                modules: sourceStructure.modules
            });

            // Clone departments and positions
            await this.cloneStructuralData(sourceConnection, newCompany.company.sanitizedName, sourceStructure);

            return newCompany;

        } catch (error) {
            throw new Error(`Failed to clone company: ${error.message}`);
        }
    }

    // Private helper methods

    async getOverviewStats(connection) {
        const stats = {};
        const collections = ['users', 'departments', 'positions', 'attendance', 'holidays', 'vacations', 'missions', 'requests', 'documents', 'events', 'announcements', 'notifications', 'payroll', 'reports', 'surveys'];

        for (const collectionName of collections) {
            try {
                stats[collectionName] = await connection.collection(collectionName).countDocuments();
            } catch (error) {
                stats[collectionName] = 0;
            }
        }

        return stats;
    }

    async getUserAnalytics(connection) {
        try {
            const userStats = await connection.collection('users').aggregate([
                {
                    $group: {
                        _id: '$role',
                        count: { $sum: 1 }
                    }
                }
            ]).toArray();

            const activeUsers = await connection.collection('users').countDocuments({
                'employment.employmentStatus': 'active'
            });

            const inactiveUsers = await connection.collection('users').countDocuments({
                'employment.employmentStatus': { $ne: 'active' }
            });

            return {
                byRole: userStats,
                activeUsers,
                inactiveUsers,
                totalUsers: activeUsers + inactiveUsers
            };
        } catch (error) {
            return { error: error.message };
        }
    }

    async getModuleUsage(connection) {
        try {
            // Get company metadata to see enabled modules
            const companyInfo = await connection.collection('companies').findOne();
            const enabledModules = companyInfo?.modules || [];

            const moduleUsage = {};
            for (const module of enabledModules) {
                moduleUsage[module] = {
                    enabled: true,
                    lastUsed: new Date() // This would be tracked in real usage
                };
            }

            return moduleUsage;
        } catch (error) {
            return { error: error.message };
        }
    }

    async getDataDistribution(connection) {
        try {
            const collections = await connection.db.listCollections().toArray();
            const distribution = {};

            for (const collection of collections) {
                const count = await connection.collection(collection.name).countDocuments();
                distribution[collection.name] = count;
            }

            return distribution;
        } catch (error) {
            return { error: error.message };
        }
    }

    async getActivityMetrics(connection) {
        try {
            // This would track actual user activity
            const recentUsers = await connection.collection('users').find({
                lastLogin: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
            }).count();

            return {
                recentActiveUsers: recentUsers,
                lastWeekActivity: recentUsers
            };
        } catch (error) {
            return { error: error.message };
        }
    }

    async createCompanyMetadata(connection, companyData) {
        const companySchema = new mongoose.Schema({
            name: { type: String, required: true },
            sanitizedName: { type: String, required: true, unique: true },
            industry: { type: String },
            adminEmail: { type: String },
            phone: { type: String },
            address: { type: String },
            modules: [{ type: String }],
            settings: {
                timezone: { type: String },
                currency: { type: String },
                language: { type: String },
                workingHours: {
                    start: { type: String },
                    end: { type: String }
                },
                weekendDays: [{ type: Number }]
            },
            createdAt: { type: Date, default: Date.now },
            isActive: { type: Boolean, default: true }
        });

        const CompanyModel = connection.model('Company', companySchema);
        return await CompanyModel.create(companyData);
    }

    async createInitialStructure(connection, tenantId, industry) {
        // Industry-specific departments
        const departmentTemplates = {
            Technology: [
                { name: 'Engineering', code: 'ENG', arabicName: 'الهندسة' },
                { name: 'Human Resources', code: 'HR', arabicName: 'الموارد البشرية' },
                { name: 'Administration', code: 'ADMIN', arabicName: 'الإدارة' }
            ],
            Healthcare: [
                { name: 'Medical Staff', code: 'MED', arabicName: 'الطاقم الطبي' },
                { name: 'Administration', code: 'ADMIN', arabicName: 'الإدارة' },
                { name: 'Human Resources', code: 'HR', arabicName: 'الموارد البشرية' }
            ],
            default: [
                { name: 'Administration', code: 'ADMIN', arabicName: 'الإدارة' },
                { name: 'Human Resources', code: 'HR', arabicName: 'الموارد البشرية' }
            ]
        };

        const departments = departmentTemplates[industry] || departmentTemplates.default;

        // Create departments
        const DepartmentModel = connection.model('Department', new mongoose.Schema({
            tenantId: String,
            name: String,
            code: String,
            arabicName: String,
            createdAt: { type: Date, default: Date.now }
        }));

        const createdDepartments = [];
        for (const dept of departments) {
            const department = await DepartmentModel.create({
                tenantId,
                ...dept
            });
            createdDepartments.push(department);
        }

        // Create positions
        const PositionModel = connection.model('Position', new mongoose.Schema({
            tenantId: String,
            title: String,
            code: String,
            arabicTitle: String,
            department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
            createdAt: { type: Date, default: Date.now }
        }));

        const createdPositions = [];
        const positions = [
            { title: 'Administrator', code: 'ADMIN', arabicTitle: 'مدير' },
            { title: 'Manager', code: 'MGR', arabicTitle: 'مدير' },
            { title: 'Employee', code: 'EMP', arabicTitle: 'موظف' }
        ];

        for (const pos of positions) {
            const position = await PositionModel.create({
                tenantId,
                department: createdDepartments[0]._id,
                ...pos
            });
            createdPositions.push(position);
        }

        return {
            departments: createdDepartments,
            positions: createdPositions
        };
    }

    async createAdminUser(connection, userData) {
        const userSchema = new mongoose.Schema({
            tenantId: String,
            employeeId: String,
            username: String,
            email: String,
            password: String,
            role: String,
            personalInfo: {
                firstName: String,
                lastName: String,
                arabicName: String
            },
            department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
            position: { type: mongoose.Schema.Types.ObjectId, ref: 'Position' },
            employment: {
                hireDate: { type: Date, default: Date.now },
                contractType: String,
                employmentStatus: String
            },
            createdAt: { type: Date, default: Date.now }
        });

        // Add password hashing middleware
        userSchema.pre('save', async function(next) {
            if (!this.isModified('password')) return next();
            const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
            this.password = await bcrypt.hash(this.password, saltRounds);
            next();
        });

        const UserModel = connection.model('User', userSchema);

        return await UserModel.create({
            tenantId: userData.tenantId,
            employeeId: `${userData.tenantId.toUpperCase()}-0001`,
            username: 'admin',
            email: userData.email,
            password: userData.password,
            role: 'admin',
            personalInfo: {
                firstName: 'System',
                lastName: 'Administrator',
                arabicName: 'مسؤول النظام'
            },
            department: userData.department,
            position: userData.position,
            employment: {
                hireDate: new Date(),
                contractType: 'full-time',
                employmentStatus: 'active'
            }
        });
    }

    async createSampleData(connection, tenantId, initialData) {
        // This would create sample employees, departments, etc.
        // Implementation would depend on specific requirements
        console.log(`Creating sample data for ${tenantId}`);
    }

    async getCompanyStructure(connection) {
        const companyInfo = await connection.collection('companies').findOne();
        const departments = await connection.collection('departments').find({}).toArray();
        const positions = await connection.collection('positions').find({}).toArray();

        return {
            modules: companyInfo?.modules || [],
            departments,
            positions,
            settings: companyInfo?.settings || {}
        };
    }

    async cloneStructuralData(sourceConnection, targetTenantId, sourceStructure) {
        const targetConnection = await multiTenantDB.getCompanyConnection(targetTenantId);

        // Clone departments
        for (const dept of sourceStructure.departments) {
            const newDept = { ...dept };
            delete newDept._id;
            newDept.tenantId = targetTenantId;
            await targetConnection.collection('departments').insertOne(newDept);
        }

        // Clone positions
        for (const pos of sourceStructure.positions) {
            const newPos = { ...pos };
            delete newPos._id;
            newPos.tenantId = targetTenantId;
            await targetConnection.collection('positions').insertOne(newPos);
        }
    }
}

export default new CompanyService();