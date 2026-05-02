/**
 * Database Seed Script - PostgreSQL/Sequelize Version
 * Populates the database with test data using Sequelize models
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from parent directory (root)
dotenv.config({ path: path.join(__dirname, '..', '.env') });
import { mainAppDb } from './config/database.js';

// HR Core Models
import User from './modules/hr-core/users/models/user.model.js';
import Department from './modules/hr-core/users/models/department.model.js';
import Position from './modules/hr-core/users/models/position.model.js';

// Holiday Models
import Holiday from './modules/hr-core/holidays/models/holiday.model.js';

const seedData = async () => {
    try {
        console.log('🔌 Connecting to database...');
        await mainAppDb.authenticate();
        console.log('✅ Database connected');

        console.log('🌱 Starting database seed...\n');

        // Default tenant ID for seeded data
        const DEFAULT_TENANT_ID = 'default-tenant';

        // Clear existing data
        console.log('🗑️  Clearing existing data...');
        await User.destroy({ where: {}, truncate: true, cascade: true });
        await Department.destroy({ where: {}, truncate: true, cascade: true });
        await Position.destroy({ where: {}, truncate: true, cascade: true });
        await Holiday.destroy({ where: {}, truncate: true, cascade: true });
        console.log('✅ Existing data cleared\n');

        // organization/location creation removed - not needed for general HR system
        console.log('🏢 Setting up company structure...');

        // Create Departments
        console.log('🏢 Creating departments...');
        const departments = await Department.bulkCreate([
            {
                tenantId: DEFAULT_TENANT_ID,
                name: 'Accounting',
                code: 'ACC',
                description: 'Accounting and Financial Management'
            },
            {
                tenantId: DEFAULT_TENANT_ID,
                name: 'Marketing',
                code: 'MKT',
                description: 'Marketing and Business Development'
            },
            {
                tenantId: DEFAULT_TENANT_ID,
                name: 'Human Resources',
                code: 'HR',
                description: 'Human Resources Management'
            },
            {
                tenantId: DEFAULT_TENANT_ID,
                name: 'Operations',
                code: 'OPS',
                description: 'Daily operations and process management'
            },
            {
                tenantId: DEFAULT_TENANT_ID,
                name: 'Information Technology',
                code: 'IT',
                description: 'IT systems and technology management'
            },
            {
                tenantId: DEFAULT_TENANT_ID,
                name: 'Customer Service',
                code: 'CS',
                description: 'Customer support and service'
            },
            {
                tenantId: DEFAULT_TENANT_ID,
                name: 'Quality Assurance',
                code: 'QA',
                description: 'Quality control and assurance'
            },
            {
                tenantId: DEFAULT_TENANT_ID,
                name: 'Research & Development',
                code: 'RD',
                description: 'Product research and development'
            },
            {
                tenantId: DEFAULT_TENANT_ID,
                name: 'Administration',
                code: 'ADM',
                description: 'General administration and support'
            }
        ]);
        console.log(`✅ Created ${departments.length} departments\n`);

        // Create Positions
        console.log('💼 Creating positions...');
        const positions = await Position.bulkCreate([
            {
                tenantId: DEFAULT_TENANT_ID,
                title: 'Accountant',
                code: 'ACC-001',
                departmentId: departments[0].id,
                description: 'Financial accounting and bookkeeping'
            },
            {
                tenantId: DEFAULT_TENANT_ID,
                title: 'Marketing Manager',
                code: 'MKT-MGR',
                departmentId: departments[1].id,
                description: 'Marketing strategy and campaign management'
            },
            {
                tenantId: DEFAULT_TENANT_ID,
                title: 'HR Manager',
                code: 'HR-MGR',
                departmentId: departments[2].id,
                description: 'Human resources management'
            },
            {
                tenantId: DEFAULT_TENANT_ID,
                title: 'Operations Manager',
                code: 'OPS-MGR',
                departmentId: departments[3].id,
                description: 'Operations and process management'
            },
            {
                tenantId: DEFAULT_TENANT_ID,
                title: 'IT Specialist',
                code: 'IT-SPEC',
                departmentId: departments[4].id,
                description: 'IT support and system maintenance'
            },
            {
                tenantId: DEFAULT_TENANT_ID,
                title: 'Customer Service Representative',
                code: 'CS-REP',
                departmentId: departments[5].id,
                description: 'Customer support and service'
            },
            {
                tenantId: DEFAULT_TENANT_ID,
                title: 'Quality Analyst',
                code: 'QA-ANAL',
                departmentId: departments[6].id,
                description: 'Quality control and analysis'
            },
            {
                tenantId: DEFAULT_TENANT_ID,
                title: 'Research Analyst',
                code: 'RD-ANAL',
                departmentId: departments[7].id,
                description: 'Research and development analysis'
            },
            {
                tenantId: DEFAULT_TENANT_ID,
                title: 'Administrative Assistant',
                code: 'ADM-ASST',
                departmentId: departments[8].id,
                description: 'Administrative support and coordination'
            }
        ]);
        console.log(`✅ Created ${positions.length} positions\n`);

        // Create Users
        console.log('👥 Creating users...');
        const usersData = [
            // Admin User
            {
                tenantId: DEFAULT_TENANT_ID,
                employeeId: 'EMID-0001',
                username: 'admin',
                email: 'admin@company.com',
                password: 'admin123',
                role: 'admin',
                personalInfo: {
                    firstName: 'System',
                    lastName: 'Administrator',
                    arabicName: 'مسؤول النظام',
                    phone: '+201234567890',
                    gender: 'male',
                    dateOfBirth: new Date('1980-01-01'),
                    maritalStatus: 'married',
                    nationalId: '29001010101010'
                },
                departmentId: departments[2].id,
                positionId: positions[3].id,
                employment: {
                    hireDate: new Date('2020-01-01'),
                    contractType: 'full-time',
                    employmentStatus: 'active'
                }
            },
            // HR User
            {
                tenantId: DEFAULT_TENANT_ID,
                employeeId: 'EMID-0002',
                username: 'hr.manager',
                email: 'hr@company.com',
                password: 'hr123',
                role: 'hr',
                personalInfo: {
                    firstName: 'Sarah',
                    lastName: 'Ahmed',
                    arabicName: 'سارة أحمد',
                    phone: '+201234567891',
                    gender: 'female',
                    dateOfBirth: new Date('1985-05-15'),
                    maritalStatus: 'married',
                    nationalId: '28505150101011'
                },
                departmentId: departments[2].id,
                positionId: positions[3].id,
                employment: {
                    hireDate: new Date('2021-03-15'),
                    contractType: 'full-time',
                    employmentStatus: 'active'
                }
            },
            // Manager User
            {
                tenantId: DEFAULT_TENANT_ID,
                employeeId: 'EMID-0003',
                username: 'dept.manager',
                email: 'manager@company.com',
                password: 'manager123',
                role: 'manager',
                personalInfo: {
                    firstName: 'Mohamed',
                    lastName: 'Hassan',
                    arabicName: 'محمد حسن',
                    phone: '+201234567892',
                    gender: 'male',
                    dateOfBirth: new Date('1978-08-20'),
                    maritalStatus: 'married',
                    nationalId: '27808200101012'
                },
                departmentId: departments[6].id,
                positionId: positions[7].id,
                employment: {
                    hireDate: new Date('2019-09-01'),
                    contractType: 'full-time',
                    employmentStatus: 'active'
                }
            },
            // Regular Employees
            {
                tenantId: DEFAULT_TENANT_ID,
                employeeId: 'EMID-0004',
                username: 'john.doe',
                email: 'john.doe@company.com',
                password: 'employee123',
                role: 'employee',
                personalInfo: {
                    firstName: 'John',
                    medName: 'Michael',
                    lastName: 'Doe',
                    arabicName: 'جون مايكل دو',
                    phone: '+201234567893',
                    gender: 'male',
                    dateOfBirth: new Date('1990-03-10'),
                    maritalStatus: 'single',
                    nationalId: '29003100101013'
                },
                departmentId: departments[0].id,
                positionId: positions[0].id,
                employment: {
                    hireDate: new Date('2022-01-15'),
                    contractType: 'full-time',
                    employmentStatus: 'active'
                }
            },
            {
                tenantId: DEFAULT_TENANT_ID,
                employeeId: 'EMID-0005',
                username: 'jane.smith',
                email: 'jane.smith@company.com',
                password: 'employee123',
                role: 'employee',
                personalInfo: {
                    firstName: 'Jane',
                    lastName: 'Smith',
                    arabicName: 'جين سميث',
                    phone: '+201234567894',
                    gender: 'female',
                    dateOfBirth: new Date('1992-07-25'),
                    maritalStatus: 'single',
                    nationalId: '29207250201014'
                },
                departmentId: departments[3].id,
                positionId: positions[4].id,
                employment: {
                    hireDate: new Date('2022-06-01'),
                    contractType: 'full-time',
                    employmentStatus: 'active'
                }
            },
            {
                tenantId: DEFAULT_TENANT_ID,
                employeeId: 'EMID-0006',
                username: 'ahmed.ali',
                email: 'ahmed.ali@company.com',
                password: 'employee123',
                role: 'employee',
                personalInfo: {
                    firstName: 'Ahmed',
                    lastName: 'Ali',
                    arabicName: 'أحمد علي',
                    phone: '+201234567895',
                    gender: 'male',
                    dateOfBirth: new Date('1988-11-30'),
                    maritalStatus: 'married',
                    nationalId: '28811300301015'
                },
                departmentId: departments[6].id,
                positionId: positions[7].id,
                employment: {
                    hireDate: new Date('2021-09-15'),
                    contractType: 'full-time',
                    employmentStatus: 'active'
                }
            },
            {
                tenantId: DEFAULT_TENANT_ID,
                employeeId: 'EMID-0007',
                username: 'fatma.mohamed',
                email: 'fatma.mohamed@company.com',
                password: 'employee123',
                role: 'employee',
                personalInfo: {
                    firstName: 'Fatma',
                    lastName: 'Mohamed',
                    arabicName: 'فاطمة محمد',
                    phone: '+201234567896',
                    gender: 'female',
                    dateOfBirth: new Date('1995-02-14'),
                    maritalStatus: 'single',
                    nationalId: '29502140201016'
                },
                departmentId: departments[7].id,
                positionId: positions[8].id,
                employment: {
                    hireDate: new Date('2023-02-01'),
                    contractType: 'contract',
                    employmentStatus: 'active'
                }
            },
            {
                tenantId: DEFAULT_TENANT_ID,
                employeeId: 'EMID-0008',
                username: 'omar.ibrahim',
                email: 'omar.ibrahim@company.com',
                password: 'employee123',
                role: 'employee',
                personalInfo: {
                    firstName: 'Omar',
                    lastName: 'Ibrahim',
                    arabicName: 'عمر إبراهيم',
                    phone: '+201234567897',
                    gender: 'male',
                    dateOfBirth: new Date('1983-06-18'),
                    maritalStatus: 'married',
                    nationalId: '28306180101017'
                },
                departmentId: departments[4].id,
                positionId: positions[5].id,
                employment: {
                    hireDate: new Date('2020-05-10'),
                    contractType: 'full-time',
                    employmentStatus: 'active'
                }
            }
        ];

        const users = await User.bulkCreate(usersData);
        console.log(`✅ Created ${users.length} users\n`);

        // Create Holidays
        console.log('📅 Creating holidays...');
        const holidays = await Holiday.bulkCreate([
            {
                tenantId: DEFAULT_TENANT_ID,
                officialHolidays: [
                    {
                        date: new Date('2025-01-07'),
                        name: 'Coptic Christmas',
                        dayOfWeek: 'Tuesday',
                        isWeekend: false,
                        description: 'Coptic Orthodox Christmas Day'
                    },
                    {
                        date: new Date('2025-01-25'),
                        name: 'Revolution Day',
                        dayOfWeek: 'Saturday',
                        isWeekend: true,
                        description: 'Revolution Day 2011'
                    },
                    {
                        date: new Date('2025-04-25'),
                        name: 'Sinai Liberation Day',
                        dayOfWeek: 'Friday',
                        isWeekend: true,
                        description: 'Sinai Liberation Day'
                    },
                    {
                        date: new Date('2025-05-01'),
                        name: 'Labour Day',
                        dayOfWeek: 'Thursday',
                        isWeekend: false,
                        description: 'International Labour Day'
                    },
                    {
                        date: new Date('2025-07-23'),
                        name: 'Revolution Day',
                        dayOfWeek: 'Wednesday',
                        isWeekend: false,
                        description: 'Revolution Day July 23'
                    }
                ],
                weekendWorkDays: [
                    {
                        date: new Date('2025-06-15'),
                        reason: 'Compensation for Eid al-Fitr',
                        dayOfWeek: 'Sunday'
                    }
                ],
                earlyLeaveDates: [
                    {
                        date: new Date('2025-06-30'),
                        reason: 'End of Fiscal Year',
                        earlyLeaveTime: '14:00',
                        dayOfWeek: 'Monday'
                    }
                ],
                weekendDays: [5, 6] // Friday and Saturday
            }
        ]);
        console.log(`✅ Created ${holidays.length} holiday records\n`);

        // Update departments with managers
        console.log('👔 Assigning managers to departments...');
        await Department.update(
            { managerId: users[3].id },
            { where: { id: departments[0].id } }
        );
        await Department.update(
            { managerId: users[1].id },
            { where: { id: departments[2].id } }
        );
        await Department.update(
            { managerId: users[2].id },
            { where: { id: departments[6].id } }
        );
        console.log('✅ Managers assigned\n');

        console.log('════════════════════════════════════════');
        console.log('🎉 Database seeded successfully!');
        console.log('════════════════════════════════════════\n');

        console.log('📋 Test Credentials:');
        console.log('───────────────────────────────────────');
        console.log('Admin:');
        console.log('  Email: admin@company.com');
        console.log('  Password: admin123');
        console.log('  Role: admin\n');

        console.log('HR Manager:');
        console.log('  Email: hr@company.com');
        console.log('  Password: hr123');
        console.log('  Role: hr\n');

        console.log('Manager:');
        console.log('  Email: manager@company.com');
        console.log('  Password: manager123');
        console.log('  Role: manager\n');

        console.log('Employee:');
        console.log('  Email: john.doe@company.com');
        console.log('  Password: employee123');
        console.log('  Role: employee\n');

        console.log('Employee:');
        console.log('  Email: omar.ibrahim@company.com');
        console.log('  Password: employee123');
        console.log('  Role: employee\n');

        console.log('════════════════════════════════════════\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    }
};

seedData();