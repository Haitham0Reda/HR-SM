/**
 * Multi-Tenant Database Seed Script (Simplified)
 * Creates 5 different companies with different modules and users for testing
 * Handles missing models gracefully
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import mongoose from 'mongoose';
import multiTenantDB from './config/multiTenant.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from parent directory (root)
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Verify environment variables are loaded
if (!process.env.MONGODB_URI && !process.env.MONGO_URI) {
    console.error('❌ MongoDB URI not found in environment variables');
    process.exit(1);
}

// Safe model imports - only import what exists
let User, Department, Position, Holiday;

try {
    const userModule = await import('./modules/hr-core/users/models/user.model.js');
    User = userModule.default;
} catch (error) {
    console.warn('⚠️  User model not found, creating basic schema');
    User = null;
}

try {
    const deptModule = await import('./modules/hr-core/users/models/department.model.js');
    Department = deptModule.default;
} catch (error) {
    console.warn('⚠️  Department model not found, creating basic schema');
    Department = null;
}

try {
    const posModule = await import('./modules/hr-core/users/models/position.model.js');
    Position = posModule.default;
} catch (error) {
    console.warn('⚠️  Position model not found, creating basic schema');
    Position = null;
}

try {
    const holidayModule = await import('./modules/hr-core/holidays/models/holiday.model.js');
    Holiday = holidayModule.default;
} catch (error) {
    console.warn('⚠️  Holiday model not found, creating basic schema');
    Holiday = null;
}

// Basic schemas for missing models
const createBasicSchemas = () => {
    const schemas = {};

    if (!User) {
        schemas.User = new mongoose.Schema({
            tenantId: { type: String, required: true },
            employeeId: { type: String, required: true, unique: true },
            username: { type: String, required: true },
            email: { type: String, required: true, unique: true },
            password: { type: String, required: true },
            role: { type: String, enum: ['admin', 'hr', 'manager', 'employee'], default: 'employee' },
            personalInfo: {
                firstName: { type: String, required: true },
                lastName: { type: String, required: true },
                arabicName: { type: String },
                phone: { type: String },
                gender: { type: String, enum: ['male', 'female'] },
                dateOfBirth: { type: Date },
                maritalStatus: { type: String, enum: ['single', 'married', 'divorced', 'widowed'] },
                nationalId: { type: String }
            },
            department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
            position: { type: mongoose.Schema.Types.ObjectId, ref: 'Position' },
            employment: {
                hireDate: { type: Date, default: Date.now },
                contractType: { type: String, enum: ['full-time', 'part-time', 'contract'], default: 'full-time' },
                employmentStatus: { type: String, enum: ['active', 'inactive', 'terminated'], default: 'active' }
            },
            lastLogin: { type: Date },
            createdAt: { type: Date, default: Date.now },
            updatedAt: { type: Date, default: Date.now }
        });
        
        // Add password hashing middleware
        schemas.User.pre('save', async function(next) {
            if (!this.isModified('password')) return next();
            
            try {
                const bcrypt = await import('bcryptjs');
                const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
                this.password = await bcrypt.default.hash(this.password, saltRounds);
                next();
            } catch (error) {
                next(error);
            }
        });
    }

    if (!Department) {
        schemas.Department = new mongoose.Schema({
            tenantId: { type: String, required: true },
            name: { type: String, required: true },
            arabicName: { type: String },
            code: { type: String, required: true },
            description: { type: String },
            manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            createdAt: { type: Date, default: Date.now },
            updatedAt: { type: Date, default: Date.now }
        });
    }

    if (!Position) {
        schemas.Position = new mongoose.Schema({
            tenantId: { type: String, required: true },
            title: { type: String, required: true },
            arabicTitle: { type: String },
            code: { type: String, required: true },
            department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
            jobDescription: { type: String },
            createdAt: { type: Date, default: Date.now },
            updatedAt: { type: Date, default: Date.now }
        });
    }

    if (!Holiday) {
        schemas.Holiday = new mongoose.Schema({
            tenantId: { type: String, required: true },
            officialHolidays: [{
                date: { type: Date, required: true },
                name: { type: String, required: true },
                dayOfWeek: { type: String },
                isWeekend: { type: Boolean, default: false },
                description: { type: String }
            }],
            weekendDays: [{ type: Number }], // 0 = Sunday, 1 = Monday, etc.
            weekendWorkDays: [{
                date: { type: Date },
                reason: { type: String },
                dayOfWeek: { type: String }
            }],
            earlyLeaveDates: [{
                date: { type: Date },
                reason: { type: String },
                earlyLeaveTime: { type: String },
                dayOfWeek: { type: String }
            }],
            createdAt: { type: Date, default: Date.now },
            updatedAt: { type: Date, default: Date.now }
        });
    }

    return schemas;
};

// Company configurations with different modules
const COMPANIES = [
    {
        name: 'TechCorp Solutions',
        sanitizedName: 'techcorp_solutions',
        adminEmail: 'admin@techcorp.com',
        phone: '+1-555-0101',
        address: '123 Tech Street, Silicon Valley, CA',
        modules: ['hr-core', 'attendance', 'payroll', 'reports', 'documents'],
        industry: 'Technology',
        employees: 50,
        settings: {
            timezone: 'America/Los_Angeles',
            currency: 'USD',
            language: 'en',
            workingHours: { start: '09:00', end: '17:00' },
            weekendDays: [0, 6] // Sunday, Saturday
        }
    },
    {
        name: 'Global Manufacturing Inc',
        sanitizedName: 'global_manufacturing_inc',
        adminEmail: 'admin@globalmanuf.com',
        phone: '+1-555-0202',
        address: '456 Industrial Blvd, Detroit, MI',
        modules: ['hr-core', 'attendance', 'missions', 'requests', 'events', 'payroll'],
        industry: 'Manufacturing',
        employees: 200,
        settings: {
            timezone: 'America/Detroit',
            currency: 'USD',
            language: 'en',
            workingHours: { start: '08:00', end: '16:00' },
            weekendDays: [0, 6]
        }
    },
    {
        name: 'Healthcare Plus',
        sanitizedName: 'healthcare_plus',
        adminEmail: 'admin@healthcareplus.com',
        phone: '+1-555-0303',
        address: '789 Medical Center Dr, Houston, TX',
        modules: ['hr-core', 'attendance', 'vacations', 'documents', 'surveys', 'notifications'],
        industry: 'Healthcare',
        employees: 150,
        settings: {
            timezone: 'America/Chicago',
            currency: 'USD',
            language: 'en',
            workingHours: { start: '07:00', end: '19:00' },
            weekendDays: [0] // Sunday only
        }
    },
    {
        name: 'Middle East Trading Co',
        sanitizedName: 'middle_east_trading_co',
        adminEmail: 'admin@metradingco.com',
        phone: '+971-4-555-0404',
        address: 'Dubai International Financial Centre, UAE',
        modules: ['hr-core', 'attendance', 'holidays', 'requests', 'announcements', 'dashboard'],
        industry: 'Trading',
        employees: 75,
        settings: {
            timezone: 'Asia/Dubai',
            currency: 'AED',
            language: 'ar',
            workingHours: { start: '08:00', end: '17:00' },
            weekendDays: [5, 6] // Friday, Saturday
        }
    },
    {
        name: 'European Consulting Group',
        sanitizedName: 'european_consulting_group',
        adminEmail: 'admin@euconsulting.eu',
        phone: '+49-30-555-0505',
        address: 'Unter den Linden 1, Berlin, Germany',
        modules: ['hr-core', 'attendance', 'vacations', 'missions', 'reports', 'theme', 'surveys'],
        industry: 'Consulting',
        employees: 100,
        settings: {
            timezone: 'Europe/Berlin',
            currency: 'EUR',
            language: 'en',
            workingHours: { start: '09:00', end: '18:00' },
            weekendDays: [0, 6]
        }
    }
];

// Department templates for different industries
const DEPARTMENT_TEMPLATES = {
    Technology: [
        { name: 'Engineering', code: 'ENG', arabicName: 'الهندسة' },
        { name: 'Product Management', code: 'PM', arabicName: 'إدارة المنتجات' },
        { name: 'DevOps', code: 'DEVOPS', arabicName: 'عمليات التطوير' },
        { name: 'Quality Assurance', code: 'QA', arabicName: 'ضمان الجودة' },
        { name: 'Human Resources', code: 'HR', arabicName: 'الموارد البشرية' },
        { name: 'Sales', code: 'SALES', arabicName: 'المبيعات' }
    ],
    Manufacturing: [
        { name: 'Production', code: 'PROD', arabicName: 'الإنتاج' },
        { name: 'Quality Control', code: 'QC', arabicName: 'مراقبة الجودة' },
        { name: 'Maintenance', code: 'MAINT', arabicName: 'الصيانة' },
        { name: 'Supply Chain', code: 'SC', arabicName: 'سلسلة التوريد' },
        { name: 'Safety', code: 'SAFETY', arabicName: 'السلامة' },
        { name: 'Human Resources', code: 'HR', arabicName: 'الموارد البشرية' }
    ],
    Healthcare: [
        { name: 'Medical Staff', code: 'MED', arabicName: 'الطاقم الطبي' },
        { name: 'Nursing', code: 'NURS', arabicName: 'التمريض' },
        { name: 'Administration', code: 'ADMIN', arabicName: 'الإدارة' },
        { name: 'Laboratory', code: 'LAB', arabicName: 'المختبر' },
        { name: 'Pharmacy', code: 'PHARM', arabicName: 'الصيدلة' },
        { name: 'Human Resources', code: 'HR', arabicName: 'الموارد البشرية' }
    ],
    Trading: [
        { name: 'Sales', code: 'SALES', arabicName: 'المبيعات' },
        { name: 'Procurement', code: 'PROC', arabicName: 'المشتريات' },
        { name: 'Logistics', code: 'LOG', arabicName: 'اللوجستيات' },
        { name: 'Finance', code: 'FIN', arabicName: 'المالية' },
        { name: 'Customer Service', code: 'CS', arabicName: 'خدمة العملاء' },
        { name: 'Human Resources', code: 'HR', arabicName: 'الموارد البشرية' }
    ],
    Consulting: [
        { name: 'Strategy', code: 'STRAT', arabicName: 'الاستراتيجية' },
        { name: 'Operations', code: 'OPS', arabicName: 'العمليات' },
        { name: 'Technology', code: 'TECH', arabicName: 'التكنولوجيا' },
        { name: 'Business Development', code: 'BD', arabicName: 'تطوير الأعمال' },
        { name: 'Research', code: 'RES', arabicName: 'البحوث' },
        { name: 'Human Resources', code: 'HR', arabicName: 'الموارد البشرية' }
    ]
};

// Position templates
const POSITION_TEMPLATES = {
    Technology: [
        { title: 'Software Engineer', code: 'SWE', arabicTitle: 'مهندس برمجيات' },
        { title: 'Senior Developer', code: 'SR-DEV', arabicTitle: 'مطور أول' },
        { title: 'Product Manager', code: 'PM', arabicTitle: 'مدير منتج' },
        { title: 'DevOps Engineer', code: 'DEVOPS', arabicTitle: 'مهندس عمليات التطوير' },
        { title: 'QA Engineer', code: 'QA-ENG', arabicTitle: 'مهندس ضمان الجودة' }
    ],
    Manufacturing: [
        { title: 'Production Supervisor', code: 'PROD-SUP', arabicTitle: 'مشرف إنتاج' },
        { title: 'Quality Inspector', code: 'QC-INS', arabicTitle: 'مفتش جودة' },
        { title: 'Maintenance Technician', code: 'MAINT-TECH', arabicTitle: 'فني صيانة' },
        { title: 'Supply Chain Coordinator', code: 'SC-COORD', arabicTitle: 'منسق سلسلة التوريد' },
        { title: 'Safety Officer', code: 'SAFETY-OFF', arabicTitle: 'ضابط سلامة' }
    ],
    Healthcare: [
        { title: 'Doctor', code: 'DOC', arabicTitle: 'طبيب' },
        { title: 'Nurse', code: 'NURSE', arabicTitle: 'ممرض' },
        { title: 'Lab Technician', code: 'LAB-TECH', arabicTitle: 'فني مختبر' },
        { title: 'Pharmacist', code: 'PHARM', arabicTitle: 'صيدلي' },
        { title: 'Administrative Assistant', code: 'ADMIN-ASST', arabicTitle: 'مساعد إداري' }
    ],
    Trading: [
        { title: 'Sales Manager', code: 'SALES-MGR', arabicTitle: 'مدير مبيعات' },
        { title: 'Procurement Specialist', code: 'PROC-SPEC', arabicTitle: 'أخصائي مشتريات' },
        { title: 'Logistics Coordinator', code: 'LOG-COORD', arabicTitle: 'منسق لوجستيات' },
        { title: 'Financial Analyst', code: 'FIN-ANAL', arabicTitle: 'محلل مالي' },
        { title: 'Customer Service Rep', code: 'CS-REP', arabicTitle: 'ممثل خدمة العملاء' }
    ],
    Consulting: [
        { title: 'Senior Consultant', code: 'SR-CONS', arabicTitle: 'مستشار أول' },
        { title: 'Business Analyst', code: 'BIZ-ANAL', arabicTitle: 'محلل أعمال' },
        { title: 'Project Manager', code: 'PM', arabicTitle: 'مدير مشروع' },
        { title: 'Research Analyst', code: 'RES-ANAL', arabicTitle: 'محلل بحوث' },
        { title: 'Strategy Consultant', code: 'STRAT-CONS', arabicTitle: 'مستشار استراتيجي' }
    ]
};

// User templates for different roles
const USER_TEMPLATES = [
    {
        role: 'admin',
        username: 'admin',
        email: 'admin@{domain}',
        password: 'admin123',
        personalInfo: {
            firstName: 'System',
            lastName: 'Administrator',
            arabicName: 'مسؤول النظام',
            gender: 'male',
            maritalStatus: 'married'
        }
    },
    {
        role: 'hr',
        username: 'hr.manager',
        email: 'hr@{domain}',
        password: 'hr123',
        personalInfo: {
            firstName: 'Sarah',
            lastName: 'Johnson',
            arabicName: 'سارة جونسون',
            gender: 'female',
            maritalStatus: 'single'
        }
    },
    {
        role: 'manager',
        username: 'dept.manager',
        email: 'manager@{domain}',
        password: 'manager123',
        personalInfo: {
            firstName: 'Michael',
            lastName: 'Smith',
            arabicName: 'مايكل سميث',
            gender: 'male',
            maritalStatus: 'married'
        }
    },
    {
        role: 'employee',
        username: 'john.doe',
        email: 'john.doe@{domain}',
        password: 'employee123',
        personalInfo: {
            firstName: 'John',
            lastName: 'Doe',
            arabicName: 'جون دو',
            gender: 'male',
            maritalStatus: 'single'
        }
    },
    {
        role: 'employee',
        username: 'jane.smith',
        email: 'jane.smith@{domain}',
        password: 'employee123',
        personalInfo: {
            firstName: 'Jane',
            lastName: 'Smith',
            arabicName: 'جين سميث',
            gender: 'female',
            maritalStatus: 'married'
        }
    }
];

async function clearCompanyData(connection) {
    const collections = [
        'users', 'departments', 'positions', 'roles', 'attendances', 'holidays',
        'events', 'reports', 'requests', 'mixedvacations', 'announcements',
        'documents', 'vacations', 'missions', 'sickleaves', 'notifications',
        'payrolls', 'permissions', 'requestcontrols', 'vacationbalances',
        'reportconfigs', 'reportexecutions', 'reportexports', 'surveys',
        'surveynotifications', 'documenttemplates', 'forgetchecks',
        'hardcopies', 'dashboardconfigs', 'themeconfigs', 'companies'
    ];

    for (const collectionName of collections) {
        try {
            await connection.collection(collectionName).deleteMany({});
        } catch (error) {
            // Collection might not exist, continue
        }
    }
}

function getModelForConnection(connection, modelName, schema) {
    if (connection.models[modelName]) {
        return connection.models[modelName];
    }
    return connection.model(modelName, schema);
}

async function seedCompany(companyConfig) {
    try {
        console.log(chalk.blue(`\n🏢 Setting up ${companyConfig.name}...`));
        console.log(chalk.gray('─'.repeat(50)));

        // Create company database connection
        const connection = await multiTenantDB.createCompanyDatabase(
            companyConfig.name,
            {
                adminEmail: companyConfig.adminEmail,
                phone: companyConfig.phone,
                address: companyConfig.address,
                industry: companyConfig.industry,
                modules: companyConfig.modules,
                settings: companyConfig.settings
            }
        );

        // Clear existing data
        await clearCompanyData(connection);

        // Create basic schemas if models are missing
        const basicSchemas = createBasicSchemas();

        // Get models for this company
        const UserModel = User ? 
            getModelForConnection(connection, 'User', User.schema) :
            getModelForConnection(connection, 'User', basicSchemas.User);

        const DepartmentModel = Department ? 
            getModelForConnection(connection, 'Department', Department.schema) :
            getModelForConnection(connection, 'Department', basicSchemas.Department);

        const PositionModel = Position ? 
            getModelForConnection(connection, 'Position', Position.schema) :
            getModelForConnection(connection, 'Position', basicSchemas.Position);

        const HolidayModel = Holiday ? 
            getModelForConnection(connection, 'Holiday', Holiday.schema) :
            getModelForConnection(connection, 'Holiday', basicSchemas.Holiday);

        // Create departments
        console.log(chalk.yellow('  📁 Creating departments...'));
        const departmentTemplates = DEPARTMENT_TEMPLATES[companyConfig.industry] || DEPARTMENT_TEMPLATES.Technology;
        const departments = [];
        
        for (const deptTemplate of departmentTemplates) {
            const department = await DepartmentModel.create({
                tenantId: companyConfig.sanitizedName,
                name: deptTemplate.name,
                arabicName: deptTemplate.arabicName,
                code: deptTemplate.code,
                description: `${deptTemplate.name} department for ${companyConfig.name}`
            });
            departments.push(department);
        }
        console.log(chalk.green(`    ✅ Created ${departments.length} departments`));

        // Create positions
        console.log(chalk.yellow('  💼 Creating positions...'));
        const positionTemplates = POSITION_TEMPLATES[companyConfig.industry] || POSITION_TEMPLATES.Technology;
        const positions = [];
        
        for (let i = 0; i < positionTemplates.length; i++) {
            const posTemplate = positionTemplates[i];
            const department = departments[i % departments.length];
            
            const position = await PositionModel.create({
                tenantId: companyConfig.sanitizedName,
                title: posTemplate.title,
                arabicTitle: posTemplate.arabicTitle,
                code: posTemplate.code,
                department: department._id,
                jobDescription: `${posTemplate.title} role in ${department.name}`
            });
            positions.push(position);
        }
        console.log(chalk.green(`    ✅ Created ${positions.length} positions`));

        // Create users
        console.log(chalk.yellow('  👥 Creating users...'));
        const users = [];
        const domain = companyConfig.adminEmail.split('@')[1];
        
        for (let i = 0; i < USER_TEMPLATES.length; i++) {
            const userTemplate = USER_TEMPLATES[i];
            const department = departments[i % departments.length];
            const position = positions[i % positions.length];
            
            const employeeId = `${companyConfig.sanitizedName.toUpperCase()}-${String(i + 1).padStart(4, '0')}`;
            
            const userData = {
                tenantId: companyConfig.sanitizedName,
                employeeId: employeeId,
                username: userTemplate.username,
                email: userTemplate.email.replace('{domain}', domain),
                password: userTemplate.password,
                role: userTemplate.role,
                personalInfo: {
                    ...userTemplate.personalInfo,
                    phone: `+1-555-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
                    dateOfBirth: new Date(1980 + Math.floor(Math.random() * 20), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
                    nationalId: `${Math.floor(Math.random() * 100000000000000)}`
                },
                department: department._id,
                position: position._id,
                employment: {
                    hireDate: new Date(2020 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
                    contractType: 'full-time',
                    employmentStatus: 'active'
                }
            };

            const user = new UserModel(userData);
            await user.save();
            users.push(user);
        }
        console.log(chalk.green(`    ✅ Created ${users.length} users`));

        // Create holidays based on company location
        console.log(chalk.yellow('  📅 Creating holidays...'));
        const holidayData = {
            tenantId: companyConfig.sanitizedName,
            officialHolidays: getHolidaysForRegion(companyConfig.settings.timezone),
            weekendDays: companyConfig.settings.weekendDays,
            weekendWorkDays: [],
            earlyLeaveDates: []
        };
        
        await HolidayModel.create(holidayData);
        console.log(chalk.green('    ✅ Created holiday configuration'));

        // Create company metadata record
        console.log(chalk.yellow('  🏢 Creating company metadata...'));
        const mongoose = await import('mongoose');
        const companySchema = new mongoose.default.Schema({
            name: { type: String, required: true },
            sanitizedName: { type: String, required: true, unique: true },
            createdAt: { type: Date, default: Date.now },
            isActive: { type: Boolean, default: true },
            adminEmail: { type: String },
            phone: { type: String },
            address: { type: String },
            industry: { type: String },
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
            }
        });

        const CompanyMetaModel = getModelForConnection(connection, 'Company', companySchema);
        await CompanyMetaModel.create({
            name: companyConfig.name,
            sanitizedName: companyConfig.sanitizedName,
            adminEmail: companyConfig.adminEmail,
            phone: companyConfig.phone,
            address: companyConfig.address,
            industry: companyConfig.industry,
            modules: companyConfig.modules,
            settings: companyConfig.settings
        });
        console.log(chalk.green('    ✅ Company metadata created'));

        // Assign managers to departments
        console.log(chalk.yellow('  👔 Assigning managers...'));
        const hrUser = users.find(u => u.role === 'hr');
        const managerUser = users.find(u => u.role === 'manager');
        
        if (hrUser && departments.length > 0) {
            const hrDept = departments.find(d => d.code === 'HR');
            if (hrDept) {
                await DepartmentModel.findByIdAndUpdate(hrDept._id, { manager: hrUser._id });
            }
        }
        
        if (managerUser && departments.length > 1) {
            await DepartmentModel.findByIdAndUpdate(departments[0]._id, { manager: managerUser._id });
        }
        console.log(chalk.green('    ✅ Managers assigned'));

        await connection.close();
        console.log(chalk.green(`✅ ${companyConfig.name} setup completed!`));

        return {
            company: companyConfig.name,
            sanitizedName: companyConfig.sanitizedName,
            users: users.map(u => ({
                email: u.email,
                password: u.password,
                role: u.role
            })),
            modules: companyConfig.modules,
            settings: companyConfig.settings
        };

    } catch (error) {
        console.error(chalk.red(`❌ Error setting up ${companyConfig.name}:`), error.message);
        throw error;
    }
}

function getHolidaysForRegion(timezone) {
    const baseHolidays = [
        {
            date: new Date('2025-01-01'),
            name: 'New Year\'s Day',
            dayOfWeek: 'Wednesday',
            isWeekend: false,
            description: 'New Year celebration'
        },
        {
            date: new Date('2025-12-25'),
            name: 'Christmas Day',
            dayOfWeek: 'Thursday',
            isWeekend: false,
            description: 'Christmas celebration'
        }
    ];

    // Add region-specific holidays
    if (timezone.includes('Dubai') || timezone.includes('Asia')) {
        baseHolidays.push({
            date: new Date('2025-04-10'),
            name: 'Eid al-Fitr',
            dayOfWeek: 'Thursday',
            isWeekend: false,
            description: 'End of Ramadan celebration'
        });
    }

    if (timezone.includes('Europe')) {
        baseHolidays.push({
            date: new Date('2025-05-01'),
            name: 'Labour Day',
            dayOfWeek: 'Thursday',
            isWeekend: false,
            description: 'International Workers\' Day'
        });
    }

    return baseHolidays;
}

async function seedMultiTenant() {
    try {
        console.log(chalk.blue('🌍 Multi-Tenant Database Seeding (Simple)'));
        console.log(chalk.gray('==========================================\n'));

        const results = [];

        for (const companyConfig of COMPANIES) {
            const result = await seedCompany(companyConfig);
            results.push(result);
        }

        console.log(chalk.blue('\n🎉 Multi-Tenant Seeding Completed!'));
        console.log(chalk.gray('=====================================\n'));

        console.log(chalk.cyan('📋 Company Login Credentials:'));
        console.log(chalk.gray('─'.repeat(60)));

        results.forEach((result, index) => {
            console.log(chalk.yellow(`\n${index + 1}. ${result.company}`));
            console.log(chalk.gray(`   Database: hrsm_${result.sanitizedName}`));
            console.log(chalk.gray(`   Modules: ${result.modules.join(', ')}`));
            console.log(chalk.gray(`   Timezone: ${result.settings.timezone}`));
            console.log(chalk.gray(`   Currency: ${result.settings.currency}`));
            console.log(chalk.white('   Login Credentials:'));
            
            result.users.forEach(user => {
                console.log(chalk.white(`     ${user.role.toUpperCase()}: ${user.email} / ${user.password}`));
            });
        });

        console.log(chalk.blue('\n🔧 Usage Instructions:'));
        console.log(chalk.gray('─'.repeat(30)));
        console.log(chalk.white('1. Include company identifier in requests:'));
        console.log(chalk.gray('   - Header: x-company-id: techcorp_solutions'));
        console.log(chalk.gray('   - Query: ?company=techcorp_solutions'));
        console.log(chalk.gray('   - JWT token with company field'));
        console.log(chalk.white('\n2. List all companies:'));
        console.log(chalk.gray('   npm run list-companies'));
        console.log(chalk.white('\n3. Backup companies:'));
        console.log(chalk.gray('   npm run backup-all-companies'));

        console.log(chalk.green('\n✨ Ready for multi-tenant testing!\n'));

    } catch (error) {
        console.error(chalk.red('❌ Multi-tenant seeding failed:'), error.message);
        process.exit(1);
    } finally {
        await multiTenantDB.closeAllConnections();
        process.exit(0);
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log(chalk.yellow('\n🛑 Shutting down...'));
    await multiTenantDB.closeAllConnections();
    process.exit(0);
});

// Run the seeding
seedMultiTenant();