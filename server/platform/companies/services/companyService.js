/**
 * Platform Company Management Service (Sequelize)
 * 
 * Business logic for managing multi-tenant companies in a single-database architecture
 */

import { Op } from 'sequelize';
import Company from '../../models/Company.js';
import User from '../../../modules/hr-core/users/models/user.model.js';
import Department from '../../../modules/hr-core/users/models/department.model.js';
import Position from '../../../modules/hr-core/users/models/position.model.js';
import Attendance from '../../../modules/hr-core/attendance/models/attendance.model.js';
import Request from '../../../modules/hr-core/requests/models/request.model.js';
import Holiday from '../../../modules/hr-core/holidays/models/holiday.model.js';
import Mission from '../../../modules/hr-core/missions/models/mission.model.js';
import Vacation from '../../../modules/hr-core/vacations/models/vacation.model.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

class CompanyService {
    /**
     * Get comprehensive company statistics
     */
    async getCompanyAnalytics(companySlug) {
        try {
            const company = await Company.findOne({ where: { slug: companySlug } });
            if (!company) {
                throw new Error(`Company not found: ${companySlug}`);
            }

            const tenantId = company.slug;
            
            const analytics = {
                overview: {},
                userAnalytics: {},
                moduleUsage: {},
                dataDistribution: {},
                activityMetrics: {}
            };

            // Overview statistics
            analytics.overview = await this.getOverviewStats(tenantId);
            
            // User analytics
            analytics.userAnalytics = await this.getUserAnalytics(tenantId);
            
            // Module usage
            analytics.moduleUsage = await this.getModuleUsage(company);
            
            // Data distribution
            analytics.dataDistribution = await this.getDataDistribution(tenantId);
            
            // Activity metrics
            analytics.activityMetrics = await this.getActivityMetrics(tenantId);

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

            // Generate slug from company name
            const slug = this.sanitizeCompanyName(name);
            const databaseName = `hrsm_${slug}`;
            const emailDomain = adminEmail.split('@')[1];

            // Create company record
            const company = await Company.create({
                name,
                slug,
                database_name: databaseName,
                admin_email: adminEmail,
                email_domain: emailDomain,
                phone,
                address,
                status: 'active',
                modules: this.buildModulesConfig(modules),
                settings: {
                    timezone: settings.timezone || 'UTC',
                    currency: settings.currency || 'USD',
                    language: settings.language || 'en',
                    workingHours: settings.workingHours || { start: '09:00', end: '17:00' },
                    weekendDays: settings.weekendDays || [5, 6] // Friday, Saturday
                }
            });

            // Create initial structure (departments and positions)
            const initialData = await this.createInitialStructure(slug, industry);

            // Create admin user
            const adminUser = await this.createAdminUser({
                email: adminEmail,
                password: adminPassword,
                tenantId: slug,
                department_id: initialData.departments[0]?.id,
                position_id: initialData.positions[0]?.id
            });

            // Create sample data if requested
            if (createSampleData) {
                await this.createSampleData(slug, initialData);
            }

            return {
                company: {
                    id: company.id,
                    name: company.name,
                    slug: company.slug,
                    database: company.database_name,
                    adminUser: {
                        id: adminUser.id,
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
    async backupCompany(companySlug) {
        try {
            const company = await Company.findOne({ where: { slug: companySlug } });
            if (!company) {
                throw new Error(`Company not found: ${companySlug}`);
            }

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupFileName = `platform_backup_${companySlug}_${timestamp}.json`;

            // Get all company data by tenant_id
            const tenantId = company.slug;
            
            const backupData = {
                company: companySlug,
                timestamp: new Date().toISOString(),
                companyMetadata: company.toJSON(),
                data: {}
            };

            // Backup users
            backupData.data.users = await User.findAll({
                where: { tenant_id: tenantId },
                raw: true
            });

            // Backup departments
            backupData.data.departments = await Department.findAll({
                where: { tenant_id: tenantId },
                raw: true
            });

            // Backup positions
            backupData.data.positions = await Position.findAll({
                where: { tenant_id: tenantId },
                raw: true
            });

            // Backup attendance
            backupData.data.attendance = await Attendance.findAll({
                where: { tenant_id: tenantId },
                raw: true
            });

            // Backup requests
            backupData.data.requests = await Request.findAll({
                where: { tenant_id: tenantId },
                raw: true
            });

            // Backup holidays
            backupData.data.holidays = await Holiday.findAll({
                where: { tenant_id: tenantId },
                raw: true
            });

            // Backup missions
            backupData.data.missions = await Mission.findAll({
                where: { tenant_id: tenantId },
                raw: true
            });

            // Backup vacations
            backupData.data.vacations = await Vacation.findAll({
                where: { tenant_id: tenantId },
                raw: true
            });

            return {
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
    async cloneCompany(sourceCompanySlug, newCompanyData) {
        try {
            const sourceCompany = await Company.findOne({ where: { slug: sourceCompanySlug } });
            if (!sourceCompany) {
                throw new Error(`Source company not found: ${sourceCompanySlug}`);
            }
            
            // Get source company structure
            const sourceStructure = await this.getCompanyStructure(sourceCompany.slug);
            
            // Create new company with cloned structure
            const newCompany = await this.createCompleteCompany({
                ...newCompanyData,
                modules: sourceCompany.getEnabledModules()
            });

            // Clone departments and positions
            await this.cloneStructuralData(sourceCompany.slug, newCompany.company.slug, sourceStructure);

            return newCompany;

        } catch (error) {
            throw new Error(`Failed to clone company: ${error.message}`);
        }
    }

    // Private helper methods

    sanitizeCompanyName(name) {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '')
            .substring(0, 50);
    }

    buildModulesConfig(modulesList) {
        const config = {};
        for (const moduleKey of modulesList) {
            config[moduleKey] = {
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
        }
        return config;
    }

    async getOverviewStats(tenantId) {
        const stats = {};

        try {
            stats.users = await User.count({ where: { tenant_id: tenantId } });
        } catch (error) {
            stats.users = 0;
        }

        try {
            stats.departments = await Department.count({ where: { tenant_id: tenantId } });
        } catch (error) {
            stats.departments = 0;
        }

        try {
            stats.positions = await Position.count({ where: { tenant_id: tenantId } });
        } catch (error) {
            stats.positions = 0;
        }

        try {
            stats.attendance = await Attendance.count({ where: { tenant_id: tenantId } });
        } catch (error) {
            stats.attendance = 0;
        }

        try {
            stats.holidays = await Holiday.count({ where: { tenant_id: tenantId } });
        } catch (error) {
            stats.holidays = 0;
        }

        try {
            stats.vacations = await Vacation.count({ where: { tenant_id: tenantId } });
        } catch (error) {
            stats.vacations = 0;
        }

        try {
            stats.missions = await Mission.count({ where: { tenant_id: tenantId } });
        } catch (error) {
            stats.missions = 0;
        }

        try {
            stats.requests = await Request.count({ where: { tenant_id: tenantId } });
        } catch (error) {
            stats.requests = 0;
        }

        return stats;
    }

    async getUserAnalytics(tenantId) {
        try {
            // Get user counts by role
            const users = await User.findAll({
                where: { tenant_id: tenantId },
                attributes: ['role'],
                raw: true
            });

            const byRole = users.reduce((acc, user) => {
                const role = user.role || 'unknown';
                acc[role] = (acc[role] || 0) + 1;
                return acc;
            }, {});

            const activeUsers = await User.count({
                where: {
                    tenant_id: tenantId,
                    'employment.employment_status': 'active'
                }
            });

            const inactiveUsers = await User.count({
                where: {
                    tenant_id: tenantId,
                    'employment.employment_status': { [Op.ne]: 'active' }
                }
            });

            return {
                byRole: Object.entries(byRole).map(([role, count]) => ({ _id: role, count })),
                activeUsers,
                inactiveUsers,
                totalUsers: activeUsers + inactiveUsers
            };
        } catch (error) {
            return { error: error.message };
        }
    }

    async getModuleUsage(company) {
        try {
            const enabledModules = company.getEnabledModules();
            const moduleUsage = {};
            
            for (const module of enabledModules) {
                const moduleConfig = company.getModuleConfig(module);
                moduleUsage[module] = {
                    enabled: true,
                    tier: moduleConfig.tier,
                    limits: moduleConfig.limits,
                    enabledAt: moduleConfig.enabledAt
                };
            }

            return moduleUsage;
        } catch (error) {
            return { error: error.message };
        }
    }

    async getDataDistribution(tenantId) {
        try {
            const distribution = {};

            distribution.users = await User.count({ where: { tenant_id: tenantId } });
            distribution.departments = await Department.count({ where: { tenant_id: tenantId } });
            distribution.positions = await Position.count({ where: { tenant_id: tenantId } });
            distribution.attendance = await Attendance.count({ where: { tenant_id: tenantId } });
            distribution.requests = await Request.count({ where: { tenant_id: tenantId } });
            distribution.holidays = await Holiday.count({ where: { tenant_id: tenantId } });
            distribution.missions = await Mission.count({ where: { tenant_id: tenantId } });
            distribution.vacations = await Vacation.count({ where: { tenant_id: tenantId } });

            return distribution;
        } catch (error) {
            return { error: error.message };
        }
    }

    async getActivityMetrics(tenantId) {
        try {
            const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            
            const recentUsers = await User.count({
                where: {
                    tenant_id: tenantId,
                    last_login: { [Op.gte]: oneWeekAgo }
                }
            });

            return {
                recentActiveUsers: recentUsers,
                lastWeekActivity: recentUsers
            };
        } catch (error) {
            return { error: error.message };
        }
    }

    async createInitialStructure(tenantId, industry) {
        // Industry-specific departments
        const departmentTemplates = {
            Technology: [
                { name: 'Engineering', code: 'ENG', arabic_name: 'الهندسة' },
                { name: 'Human Resources', code: 'HR', arabic_name: 'الموارد البشرية' },
                { name: 'Administration', code: 'ADMIN', arabic_name: 'الإدارة' }
            ],
            Healthcare: [
                { name: 'Medical Staff', code: 'MED', arabic_name: 'الطاقم الطبي' },
                { name: 'Administration', code: 'ADMIN', arabic_name: 'الإدارة' },
                { name: 'Human Resources', code: 'HR', arabic_name: 'الموارد البشرية' }
            ],
            default: [
                { name: 'Administration', code: 'ADMIN', arabic_name: 'الإدارة' },
                { name: 'Human Resources', code: 'HR', arabic_name: 'الموارد البشرية' }
            ]
        };

        const departments = departmentTemplates[industry] || departmentTemplates.default;

        // Create departments
        const createdDepartments = [];
        for (const dept of departments) {
            const department = await Department.create({
                tenant_id: tenantId,
                ...dept
            });
            createdDepartments.push(department);
        }

        // Create positions
        const createdPositions = [];
        const positions = [
            { title: 'Administrator', code: 'ADMIN', arabic_title: 'مدير' },
            { title: 'Manager', code: 'MGR', arabic_title: 'مدير' },
            { title: 'Employee', code: 'EMP', arabic_title: 'موظف' }
        ];

        for (const pos of positions) {
            const position = await Position.create({
                tenant_id: tenantId,
                department_id: createdDepartments[0].id,
                ...pos
            });
            createdPositions.push(position);
        }

        return {
            departments: createdDepartments,
            positions: createdPositions
        };
    }

    async createAdminUser(userData) {
        const hashedPassword = await bcrypt.hash(userData.password, 12);

        return await User.create({
            tenant_id: userData.tenantId,
            employee_id: `${userData.tenantId.toUpperCase()}-0001`,
            username: 'admin',
            email: userData.email,
            password: hashedPassword,
            role: 'admin',
            personal_info: {
                first_name: 'System',
                last_name: 'Administrator',
                arabic_name: 'مسؤول النظام'
            },
            department_id: userData.department_id,
            position_id: userData.position_id,
            employment: {
                hire_date: new Date(),
                contract_type: 'full-time',
                employment_status: 'active'
            }
        });
    }

    async createSampleData(tenantId, initialData) {
        // This would create sample employees, departments, etc.
        // Implementation would depend on specific requirements
        console.log(`Creating sample data for ${tenantId}`);
    }

    async getCompanyStructure(tenantId) {
        const company = await Company.findOne({ where: { slug: tenantId } });
        const departments = await Department.findAll({
            where: { tenant_id: tenantId },
            raw: true
        });
        const positions = await Position.findAll({
            where: { tenant_id: tenantId },
            raw: true
        });

        return {
            modules: company ? company.getEnabledModules() : [],
            departments,
            positions,
            settings: company ? company.settings : {}
        };
    }

    async cloneStructuralData(sourceTenantId, targetTenantId, sourceStructure) {
        // Clone departments
        for (const dept of sourceStructure.departments) {
            const newDept = { ...dept };
            delete newDept.id;
            delete newDept.created_at;
            delete newDept.updated_at;
            newDept.tenant_id = targetTenantId;
            await Department.create(newDept);
        }

        // Clone positions
        for (const pos of sourceStructure.positions) {
            const newPos = { ...pos };
            delete newPos.id;
            delete newPos.created_at;
            delete newPos.updated_at;
            newPos.tenant_id = targetTenantId;
            await Position.create(newPos);
        }
    }
}

export default new CompanyService();
