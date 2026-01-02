import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get directory path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

// Import platform models (main database)
import Company from '../platform/models/Company.js';
import License from '../platform/system/models/license.model.js';

// Import tenant model schemas (for tenant-specific databases)
import User from '../modules/hr-core/users/models/user.model.js';
import Department from '../modules/hr-core/users/models/department.model.js';
import Position from '../modules/hr-core/users/models/position.model.js';
import Attendance from '../modules/hr-core/attendance/models/attendance.model.js';

// Import multi-tenant connection manager
import multiTenantDB from '../config/multiTenant.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hr-management';

// Company configurations - 5 distinct companies
const companies = [
    {
        name: 'TechCorp Solutions',
        slug: 'techcorp_solutions',
        allModulesAccess: true,
        subscriptionPlan: 'enterprise',
        email: 'admin@techcorpsolutions.com'
    },
    {
        name: 'Global Retail Inc',
        slug: 'global_retail',
        allModulesAccess: false,
        subscriptionPlan: 'business',
        email: 'admin@globalretail.com'
    },
    {
        name: 'HealthCare Plus',
        slug: 'healthcare_plus',
        allModulesAccess: false,
        subscriptionPlan: 'business',
        email: 'admin@healthcareplus.com'
    },
    {
        name: 'Finance First LLC',
        slug: 'finance_first',
        allModulesAccess: false,
        subscriptionPlan: 'starter',
        email: 'admin@financefirst.com'
    },
    {
        name: 'EduLearn Academy',
        slug: 'edulearn_academy',
        allModulesAccess: false,
        subscriptionPlan: 'starter',
        email: 'admin@edulearnacademy.com'
    }
];

// Module configurations
const ALL_MODULES = ['hr-core', 'attendance', 'leave', 'payroll', 'documents', 'communication', 'reporting', 'tasks', 'logging'];
const BUSINESS_MODULES = ['hr-core', 'attendance', 'leave', 'payroll', 'documents', 'reporting'];
const STARTER_MODULES = ['hr-core', 'attendance', 'leave'];

function getModulesForPlan(plan, allModulesAccess) {
    if (allModulesAccess) return ALL_MODULES;
    if (plan === 'enterprise') return ALL_MODULES;
    if (plan === 'business') return BUSINESS_MODULES;
    return STARTER_MODULES;
}

// Generate users for a company
function generateUsersForCompany(tenantId, slugName, departmentIds, positionIds) {
    const cleanName = slugName.replace(/_/g, '');
    return [
        {
            username: 'admin',
            email: `admin@${cleanName}.com`,
            password: 'Admin@123',
            role: 'admin',
            isActive: true,
            status: 'active',
            tenantId,
            department: departmentIds[0],
            position: positionIds[0],
            personalInfo: {
                firstName: 'Admin',
                lastName: 'User',
                fullName: 'Admin User',
                dateOfBirth: new Date('1985-01-15'),
                gender: 'male',
                phone: '+1-555-0100',
                address: '100 Admin St, New York, NY 10001, USA'
            },
            employeeId: 'EMP001'
        },
        {
            username: 'hr.manager',
            email: `hr@${cleanName}.com`,
            password: 'HR@123',
            role: 'hr',
            isActive: true,
            status: 'active',
            tenantId,
            department: departmentIds[1],
            position: positionIds[1],
            personalInfo: {
                firstName: 'Sarah',
                lastName: 'Johnson',
                fullName: 'Sarah Johnson',
                dateOfBirth: new Date('1988-05-15'),
                gender: 'female',
                phone: '+1-555-0101',
                address: '101 HR Ave, New York, NY 10002, USA'
            },
            employeeId: 'EMP002'
        },
        {
            username: 'john.doe',
            email: `john.doe@${cleanName}.com`,
            password: 'User@123',
            role: 'employee',
            isActive: true,
            status: 'active',
            tenantId,
            department: departmentIds[0],
            position: positionIds[2],
            personalInfo: {
                firstName: 'John',
                lastName: 'Doe',
                fullName: 'John Doe',
                dateOfBirth: new Date('1990-03-20'),
                gender: 'male',
                phone: '+1-555-0102',
                address: '102 Employee St, New York, NY 10003, USA'
            },
            employeeId: 'EMP003'
        },
        {
            username: 'jane.smith',
            email: `jane.smith@${cleanName}.com`,
            password: 'User@123',
            role: 'employee',
            isActive: true,
            status: 'active',
            tenantId,
            department: departmentIds[2],
            position: positionIds[3],
            personalInfo: {
                firstName: 'Jane',
                lastName: 'Smith',
                fullName: 'Jane Smith',
                dateOfBirth: new Date('1992-07-10'),
                gender: 'female',
                phone: '+1-555-0103',
                address: '103 Worker Ln, New York, NY 10004, USA'
            },
            employeeId: 'EMP004'
        },
        {
            username: 'mike.wilson',
            email: `mike.wilson@${cleanName}.com`,
            password: 'User@123',
            role: 'employee',
            isActive: true,
            status: 'active',
            tenantId,
            department: departmentIds[3],
            position: positionIds[3],
            personalInfo: {
                firstName: 'Mike',
                lastName: 'Wilson',
                fullName: 'Mike Wilson',
                dateOfBirth: new Date('1989-11-25'),
                gender: 'male',
                phone: '+1-555-0104',
                address: '104 Staff Rd, New York, NY 10005, USA'
            },
            employeeId: 'EMP005'
        }
    ];
}

function generateDepartmentsForCompany(tenantId) {
    return [
        { name: 'Engineering', code: 'ENG', description: 'Engineering and Development', tenantId, isActive: true },
        { name: 'Human Resources', code: 'HR', description: 'HR Management', tenantId, isActive: true },
        { name: 'Sales', code: 'SALES', description: 'Sales and Marketing', tenantId, isActive: true },
        { name: 'Finance', code: 'FIN', description: 'Finance and Accounting', tenantId, isActive: true }
    ];
}

function generatePositionsForCompany(tenantId, departmentIds) {
    return [
        { title: 'Department Head', department: departmentIds[0], tenantId, isActive: true },
        { title: 'HR Manager', department: departmentIds[1], tenantId, isActive: true },
        { title: 'Software Engineer', department: departmentIds[0], tenantId, isActive: true },
        { title: 'Analyst', department: departmentIds[3], tenantId, isActive: true }
    ];
}

function generateAttendanceForUsers(userIds, tenantId, daysBack = 30) {
    const attendance = [];
    const today = new Date();

    userIds.forEach(userId => {
        for (let i = 0; i < daysBack; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            if (date.getDay() === 0 || date.getDay() === 6) continue;

            const checkInHour = 8 + Math.floor(Math.random() * 2);
            const checkInMinute = Math.floor(Math.random() * 60);
            const checkIn = new Date(date);
            checkIn.setHours(checkInHour, checkInMinute, 0, 0);

            const checkOutHour = 17 + Math.floor(Math.random() * 2);
            const checkOutMinute = Math.floor(Math.random() * 60);
            const checkOut = new Date(date);
            checkOut.setHours(checkOutHour, checkOutMinute, 0, 0);

            let status = 'present';
            const isLate = checkInHour > 9 || (checkInHour === 9 && checkInMinute > 0);
            if (isLate) status = 'late';
            const isAbsent = Math.random() < 0.05;
            if (isAbsent) status = 'absent';

            attendance.push({
                employee: userId,
                date: date,
                checkIn: !isAbsent ? { time: checkIn, method: 'manual', location: 'office', isLate } : undefined,
                checkOut: !isAbsent ? { time: checkOut, method: 'manual', location: 'office' } : undefined,
                status: status,
                hours: !isAbsent ? { regular: 8, overtime: 0 } : undefined,
                tenantId: tenantId
            });
        }
    });

    return attendance;
}

function generateLicenseForCompany(tenantId, subscriptionPlan, allModulesAccess) {
    const now = new Date();
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    const moduleKeys = getModulesForPlan(subscriptionPlan, allModulesAccess);
    const tier = allModulesAccess ? 'enterprise' : subscriptionPlan;

    const modules = moduleKeys.map(key => ({
        key,
        enabled: true,
        tier,
        limits: { employees: tier === 'enterprise' ? 500 : tier === 'business' ? 100 : 50, storage: 10000, apiCalls: 100000 },
        activatedAt: now,
        expiresAt
    }));

    return {
        tenantId: tenantId.toString(),
        subscriptionId: `SUB-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        modules,
        billingCycle: 'annual',
        status: 'active',
        trialEndsAt: null,
        billingEmail: `billing@company.com`
    };
}

async function clearMainDatabase() {
    console.log('\n🗑️  Clearing main (platform) database...');
    // Clear only platform collections
    await Company.deleteMany({});
    await License.deleteMany({});
    console.log('   ✓ Cleared platform_companies and licenses\n');
}

async function seedDatabase() {
    try {
        console.log('\n🌱 Starting Multi-Tenant Database Seeding...\n');
        console.log(`   MongoDB URI: ${MONGODB_URI}\n`);

        // Connect to main database
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to main MongoDB database\n');

        // Clear platform data
        await clearMainDatabase();

        // Seed data for each company
        for (const [index, companyConfig] of companies.entries()) {
            console.log(`\n${'='.repeat(60)}`);
            console.log(`📦 Company ${index + 1}/${companies.length}: ${companyConfig.name}`);
            console.log(`${'='.repeat(60)}\n`);

            // 1. Create Company in main (platform) database
            console.log('1️⃣  Creating company in platform database...');
            const company = await Company.create({
                name: companyConfig.name,
                slug: companyConfig.slug,
                databaseName: `hrsm_${companyConfig.slug}`,
                adminEmail: companyConfig.email,
                status: 'active',
                subscription: {
                    plan: companyConfig.subscriptionPlan,
                    startDate: new Date(),
                    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                },
                settings: { timezone: 'UTC' }
            });
            // Use company slug as tenantId - this matches how the login controller resolves the tenant database
            const tenantId = companyConfig.slug;
            console.log(`   ✓ Company: ${company.name} (ID: ${company._id}, tenantId: ${tenantId})\n`);

            // 2. Create License in main database
            console.log('2️⃣  Creating license...');
            const licenseData = generateLicenseForCompany(tenantId, companyConfig.subscriptionPlan, companyConfig.allModulesAccess);
            const license = await License.create(licenseData);
            const moduleNames = license.modules.filter(m => m.enabled).map(m => m.key);
            console.log(`   ✓ License: ${license.subscriptionId}`);
            console.log(`   ✓ Tier: ${companyConfig.allModulesAccess ? 'ENTERPRISE (ALL MODULES)' : companyConfig.subscriptionPlan.toUpperCase()}`);
            console.log(`   ✓ Modules: ${moduleNames.join(', ')}\n`);

            // 3. Get tenant-specific database connection
            console.log('3️⃣  Connecting to tenant database...');
            const tenantConnection = await multiTenantDB.getCompanyConnection(companyConfig.slug);
            console.log(`   ✓ Connected to: hrsm_${companyConfig.slug}\n`);

            // Register models on tenant connection
            const TenantDepartment = tenantConnection.model('Department', Department.schema);
            const TenantPosition = tenantConnection.model('Position', Position.schema);
            const TenantUser = tenantConnection.model('User', User.schema);
            const TenantAttendance = tenantConnection.model('Attendance', Attendance.schema);

            // Clear tenant database
            await TenantDepartment.deleteMany({});
            await TenantPosition.deleteMany({});
            await TenantUser.deleteMany({});
            await TenantAttendance.deleteMany({});

            // 4. Create Departments in tenant database
            console.log('4️⃣  Creating departments in tenant database...');
            const departmentData = generateDepartmentsForCompany(tenantId);
            const departments = await TenantDepartment.insertMany(departmentData);
            console.log(`   ✓ Created ${departments.length} departments\n`);

            // 5. Create Positions in tenant database
            console.log('5️⃣  Creating positions in tenant database...');
            const positionData = generatePositionsForCompany(tenantId, departments.map(d => d._id));
            const positions = [];
            for (const posData of positionData) {
                const pos = new TenantPosition(posData);
                await pos.save();
                positions.push(pos);
            }
            console.log(`   ✓ Created ${positions.length} positions\n`);

            // 6. Create Users in tenant database (hash passwords manually since insertMany skips hooks)
            console.log('6️⃣  Creating users in tenant database...');
            const userData = generateUsersForCompany(
                tenantId,
                companyConfig.slug,
                departments.map(d => d._id),
                positions.map(p => p._id)
            );

            // Hash passwords
            for (const user of userData) {
                user.password = await bcrypt.hash(user.password, 10);
            }

            const users = await TenantUser.insertMany(userData);
            console.log(`   ✓ Created ${users.length} users:`);
            users.forEach(u => console.log(`      - ${u.personalInfo?.fullName || u.username} (${u.role}) - ${u.email}`));
            console.log('');

            // 7. Create Attendance Records in tenant database
            console.log('7️⃣  Creating attendance records in tenant database...');
            const attendanceData = generateAttendanceForUsers(users.map(u => u._id), tenantId, 30);
            const attendance = await TenantAttendance.insertMany(attendanceData);
            console.log(`   ✓ Created ${attendance.length} attendance records\n`);

            console.log(`✅ Company "${companyConfig.name}" completed!\n`);
        }

        // Print summary
        console.log('\n' + '='.repeat(60));
        console.log('📊 SEEDING SUMMARY');
        console.log('='.repeat(60) + '\n');

        const totalCompanies = await Company.countDocuments();
        const totalLicenses = await License.countDocuments();
        console.log(`Companies:    ${totalCompanies}`);
        console.log(`Licenses:     ${totalLicenses}\n`);

        console.log('🔐 LOGIN CREDENTIALS:');
        console.log('-'.repeat(60));

        for (const cfg of companies) {
            const cleanName = cfg.slug.replace(/_/g, '');
            console.log(`\n${cfg.name}${cfg.allModulesAccess ? ' ⭐ (ALL MODULES)' : ''}`);
            console.log(`  Admin:    admin@${cleanName}.com / Admin@123`);
            console.log(`  HR:       hr@${cleanName}.com / HR@123`);
            console.log(`  Employee: john.doe@${cleanName}.com / User@123`);
            console.log(`  Modules:  ${cfg.allModulesAccess ? 'ALL' : cfg.subscriptionPlan.toUpperCase()}`);
        }

        console.log('\n' + '='.repeat(60));
        console.log('✅ Multi-tenant database seeding completed!');
        console.log('='.repeat(60) + '\n');

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        await multiTenantDB.closeAllConnections();
        await mongoose.connection.close();
        console.log('🔌 All database connections closed\n');
    }
}

// Run the seeder
seedDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
