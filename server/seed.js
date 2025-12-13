/**
 * Database Seed Script - Updated for Modular Structure
 * Populates the database with test data using new modular model imports
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from parent directory (root)
dotenv.config({ path: path.join(__dirname, '..', '.env') });
import connectDB from './config/database.js';

// HR Core Models
import User from './modules/hr-core/users/models/user.model.js';
import Department from './modules/hr-core/users/models/department.model.js';
import Position from './modules/hr-core/users/models/position.model.js';
import Role from './modules/hr-core/users/models/role.model.js';

// Attendance Models
import Attendance from './modules/hr-core/attendance/models/attendance.model.js';
import ForgetCheck from './modules/hr-core/attendance/models/forgetCheck.model.js';

// Holiday Models
import Holiday from './modules/hr-core/holidays/models/holiday.model.js';

// Vacation Models
import Vacation from './modules/hr-core/vacations/models/vacation.model.js';
import SickLeave from './modules/hr-core/vacations/models/sickLeave.model.js';
import MixedVacation from './modules/hr-core/vacations/models/mixedVacation.model.js';
import VacationBalance from './modules/hr-core/vacations/models/vacationBalance.model.js';

// Mission Models
import Mission from './modules/hr-core/missions/models/mission.model.js';

// Request Models
import Request from './modules/hr-core/requests/models/request.model.js';
import Permission from './modules/hr-core/requests/models/permission.model.js';
import RequestControl from './modules/hr-core/requests/models/requestControl.model.js';

// Document Models
import Document from './modules/documents/models/document.model.js';
import DocumentTemplate from './modules/documents/models/documentTemplate.model.js';
import Hardcopy from './modules/documents/models/hardcopy.model.js';

// Event Models
import Event from './modules/events/models/event.model.js';

// Announcement Models
import Announcement from './modules/announcements/models/announcement.model.js';

// Notification Models
import Notification from './modules/notifications/models/notification.model.js';

// Payroll Models
import Payroll from './modules/payroll/models/payroll.model.js';

// Report Models
import Report from './modules/reports/models/report.model.js';
import ReportConfig from './modules/reports/models/reportConfig.model.js';
import ReportExecution from './modules/reports/models/reportExecution.model.js';
import ReportExport from './modules/reports/models/reportExport.model.js';

// Survey Models
import Survey from './modules/surveys/models/survey.model.js';
import SurveyNotification from './modules/surveys/models/surveyNotification.model.js';

// Dashboard Models
import DashboardConfig from './modules/dashboard/models/dashboardConfig.model.js';

// Theme Models
import ThemeConfig from './modules/theme/models/themeConfig.model.js';

// Platform Models
// organization model removed - not needed for general HR system

const seedData = async () => {
    try {
        console.log('🔌 Connecting to database...');
        await connectDB();
        console.log('✅ Database connected');

        console.log('🌱 Starting database seed...\n');

        // Default tenant ID for seeded data
        const DEFAULT_TENANT_ID = 'default-tenant';

        // Clear existing data
        console.log('🗑️  Clearing existing data...');
        await User.deleteMany({});
        await Department.deleteMany({});
        await Position.deleteMany({});
        await Attendance.deleteMany({});
        await Holiday.deleteMany({});
        await Event.deleteMany({});
        await Report.deleteMany({});
        await Request.deleteMany({});
        await MixedVacation.deleteMany({});
        await Announcement.deleteMany({});
        await Document.deleteMany({});
        await Vacation.deleteMany({});
        await Mission.deleteMany({});
        await SickLeave.deleteMany({});
        await Notification.deleteMany({});
        await Payroll.deleteMany({});
        await Permission.deleteMany({});
        await RequestControl.deleteMany({});
        await VacationBalance.deleteMany({});
        await ReportConfig.deleteMany({});
        await ReportExecution.deleteMany({});
        await ReportExport.deleteMany({});
        await Survey.deleteMany({});
        await SurveyNotification.deleteMany({});
        await DocumentTemplate.deleteMany({});
        await Role.deleteMany({});
        await ForgetCheck.deleteMany({});
        await Hardcopy.deleteMany({});
        await DashboardConfig.deleteMany({});
        await ThemeConfig.deleteMany({});
        // organization model removed
        console.log('✅ Existing data cleared\n');

        // organization/location creation removed - not needed for general HR system
        console.log('� Sretting up company structure...');

        // Create Departments
        console.log('🏢 Creating departments...');
        const departments = await Department.create([
            {
                tenantId: DEFAULT_TENANT_ID,
                name: 'Accounting',
                arabicName: 'المحاسبة',
                code: 'ACC',
                description: 'Accounting and Financial Management'
            },
            {
                tenantId: DEFAULT_TENANT_ID,
                name: 'Marketing',
                arabicName: 'التسويق',
                code: 'MKT',
                description: 'Marketing and Business Development'
            },
            {
                tenantId: DEFAULT_TENANT_ID,
                name: 'Human Resources',
                arabicName: 'الموارد البشرية',
                code: 'HR',
                description: 'Human Resources Management'
            },
            {
                tenantId: DEFAULT_TENANT_ID,
                name: 'Operations',
                arabicName: 'العمليات',
                code: 'OPS',
                description: 'Daily operations and process management'
            },
            {
                tenantId: DEFAULT_TENANT_ID,
                name: 'Information Technology',
                arabicName: 'تكنولوجيا المعلومات',
                code: 'IT',
                description: 'IT systems and technology management'
            },
            {
                tenantId: DEFAULT_TENANT_ID,
                name: 'Customer Service',
                arabicName: 'خدمة العملاء',
                code: 'CS',
                description: 'Customer support and service'
            },
            {
                tenantId: DEFAULT_TENANT_ID,
                name: 'Quality Assurance',
                arabicName: 'ضمان الجودة',
                code: 'QA',
                description: 'Quality control and assurance'
            },
            {
                tenantId: DEFAULT_TENANT_ID,
                name: 'Research & Development',
                arabicName: 'البحث والتطوير',
                code: 'RD',
                description: 'Product research and development'
            },
            {
                tenantId: DEFAULT_TENANT_ID,
                name: 'Administration',
                arabicName: 'الإدارة',
                code: 'ADM',
                description: 'General administration and support'
            }
        ]);
        console.log(`✅ Created ${departments.length} departments\n`);

        // Create Positions
        console.log('💼 Creating positions...');
        const positions = await Position.create([
            {
                tenantId: DEFAULT_TENANT_ID,
                title: 'Accountant',
                arabicTitle: 'محاسب',
                code: 'ACC-001',
                department: departments[0]._id,
                jobDescription: 'Financial accounting and bookkeeping'
            },
            {
                tenantId: DEFAULT_TENANT_ID,
                title: 'Marketing Manager',
                arabicTitle: 'مدير التسويق',
                code: 'MKT-MGR',
                department: departments[1]._id,
                jobDescription: 'Marketing strategy and campaign management'
            },
            {
                tenantId: DEFAULT_TENANT_ID,
                title: 'HR Manager',
                arabicTitle: 'مدير الموارد البشرية',
                code: 'HR-MGR',
                department: departments[2]._id,
                jobDescription: 'Human resources management'
            },
            {
                tenantId: DEFAULT_TENANT_ID,
                title: 'Operations Manager',
                arabicTitle: 'مدير العمليات',
                code: 'OPS-MGR',
                department: departments[3]._id,
                jobDescription: 'Operations and process management'
            },
            {
                tenantId: DEFAULT_TENANT_ID,
                title: 'IT Specialist',
                arabicTitle: 'أخصائي تكنولوجيا المعلومات',
                code: 'IT-SPEC',
                department: departments[4]._id,
                jobDescription: 'IT support and system maintenance'
            },
            {
                tenantId: DEFAULT_TENANT_ID,
                title: 'Customer Service Representative',
                arabicTitle: 'ممثل خدمة العملاء',
                code: 'CS-REP',
                department: departments[5]._id,
                jobDescription: 'Customer support and service'
            },
            {
                tenantId: DEFAULT_TENANT_ID,
                title: 'Quality Analyst',
                arabicTitle: 'محلل الجودة',
                code: 'QA-ANAL',
                department: departments[6]._id,
                jobDescription: 'Quality control and analysis'
            },
            {
                tenantId: DEFAULT_TENANT_ID,
                title: 'Research Analyst',
                arabicTitle: 'محلل البحوث',
                code: 'RD-ANAL',
                department: departments[7]._id,
                jobDescription: 'Research and development analysis'
            },
            {
                tenantId: DEFAULT_TENANT_ID,
                title: 'Administrative Assistant',
                arabicTitle: 'مساعد إداري',
                code: 'ADM-ASST',
                department: departments[8]._id,
                jobDescription: 'Administrative support and coordination'
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
                department: departments[2]._id,
                position: positions[3]._id,
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
                department: departments[2]._id,
                position: positions[3]._id,
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
                department: departments[6]._id,
                position: positions[7]._id,
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
                department: departments[0]._id,
                position: positions[0]._id,
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
                department: departments[3]._id,
                position: positions[4]._id,
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
                department: departments[6]._id,
                position: positions[7]._id,
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
                department: departments[7]._id,
                position: positions[8]._id,
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
                department: departments[4]._id,
                position: positions[5]._id,
                employment: {
                    hireDate: new Date('2020-05-10'),
                    contractType: 'full-time',
                    employmentStatus: 'active'
                }
            }
        ];

        const users = [];
        for (const userData of usersData) {
            const user = new User(userData);
            await user.save();
            users.push(user);
        }
        console.log(`✅ Created ${users.length} users\n`);

        // Create Holidays
        console.log('📅 Creating holidays...');
        const holidays = await Holiday.create([
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
        await Department.findByIdAndUpdate(departments[0]._id, { manager: users[3]._id });
        await Department.findByIdAndUpdate(departments[2]._id, { manager: users[1]._id });
        await Department.findByIdAndUpdate(departments[6]._id, { manager: users[2]._id });
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