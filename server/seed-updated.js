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
import connectDB from './config/db.js';

// HR Core Models
import User from './modules/hr-core/users/models/user.model.js';
import Department from './modules/hr-core/users/models/department.model.js';
import Position from './modules/hr-core/users/models/position.model.js';
import Role from './modules/hr-core/users/models/role.model.js';
import ResignedEmployee from './modules/hr-core/users/models/resignedEmployee.model.js';
import IDCard from './modules/hr-core/users/models/idCard.model.js';
import IDCardBatch from './modules/hr-core/users/models/idCardBatch.model.js';

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
import organization from './platform/models/organization.model.js';
import SecuritySettings from './platform/system/models/securitySettings.model.js';
import SecurityAudit from './platform/system/models/securityAudit.model.js';
import PermissionAudit from './platform/system/models/permissionAudit.model.js';

// Backup Models
import Backup from './modules/hr-core/backup/models/backup.model.js';
import BackupExecution from './modules/hr-core/backup/models/backupExecution.model.js';

const seedData = async () => {
    try {
        console.log('🔌 Connecting to database...');
        // Connect to database
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
        await Backup.deleteMany({});
        await BackupExecution.deleteMany({});
        await Document.deleteMany({});
        await Vacation.deleteMany({});
        await Mission.deleteMany({});
        await SickLeave.deleteMany({});
        await Notification.deleteMany({});
        await Payroll.deleteMany({});
        await Permission.deleteMany({});
        await PermissionAudit.deleteMany({});
        await ResignedEmployee.deleteMany({});
        await SecuritySettings.deleteMany({});
        await Survey.deleteMany({});
        await DocumentTemplate.deleteMany({});
        await VacationBalance.deleteMany({});
        await RequestControl.deleteMany({});
        await IDCard.deleteMany({});
        await IDCardBatch.deleteMany({});
        await ReportConfig.deleteMany({});
        await ReportExecution.deleteMany({});
        await ReportExport.deleteMany({});
        await SurveyNotification.deleteMany({});
        await SecurityAudit.deleteMany({});
        await Role.deleteMany({});
        await ForgetCheck.deleteMany({});
        await Hardcopy.deleteMany({});
        await DashboardConfig.deleteMany({});
        await ThemeConfig.deleteMany({});
        await organization.deleteMany({});
        console.log('✅ Existing data cleared\n');

        // Create organization/location
        console.log('🏫 Creating organization/location...');
        const organizations = await organization.create([
            {
                name: 'Main location',
                arabicName: 'الحرم الجامعي الرئيسي',
                code: 'MAIN',
                description: 'Main location location',
                isActive: true
            }
        ]);
        const defaultorganization = organizations[0];
        console.log(`✅ Created ${organizations.length} organization/location\n`);

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
                name: 'Civil Engineering',
                arabicName: 'الهندسة المدنية',
                code: 'CIV',
                description: 'Civil and Construction Engineering'
            },
            {
                tenantId: DEFAULT_TENANT_ID,
                name: 'Mechanical Engineering',
                arabicName: 'الهندسة الميكانيكية',
                code: 'MEC',
                description: 'Mechanical and Industrial Engineering'
            },
            {
                tenantId: DEFAULT_TENANT_ID,
                name: 'Electrical Engineering',
                arabicName: 'الهندسة الكهربائية',
                code: 'ELE',
                description: 'Electrical and Electronics Engineering'
            },
            {
                tenantId: DEFAULT_TENANT_ID,
                name: 'Software Engineering',
                arabicName: 'هندسة البرمجيات',
                code: 'SWE',
                description: 'Software Development and Engineering'
            },
            {
                tenantId: DEFAULT_TENANT_ID,
                name: 'Artificial Intelligence',
                arabicName: 'الذكاء الاصطناعي',
                code: 'AI',
                description: 'AI and Machine Learning'
            },
            {
                tenantId: DEFAULT_TENANT_ID,
                name: 'Information Systems',
                arabicName: 'نظم المعلومات',
                code: 'IS',
                description: 'Information Systems and Database Management'
            }
        ]);
        console.log(`✅ Created ${departments.length} departments\n`);

        // Create Positions
        console.log('💼 Creating positions...');
        const positions = await Position.create([
            {
                tenantId: DEFAULT_TENANT_ID,
                title: 'manager',
                arabicTitle: 'أستاذ',
                code: 'PROF-ACC',
                department: departments[0]._id,
                jobDescription: 'Senior business position'
            },
            {
                tenantId: DEFAULT_TENANT_ID,
                title: 'Associate manager',
                arabicTitle: 'أستاذ مساعد',
                code: 'ASPROF-ACC',
                department: departments[0]._id,
                jobDescription: 'Mid-level business position'
            },
            {
                tenantId: DEFAULT_TENANT_ID,
                title: 'specialist',
                arabicTitle: 'محاضر',
                code: 'LEC-MKT',
                department: departments[1]._id,
                jobDescription: 'Teaching and research'
            },
            {
                tenantId: DEFAULT_TENANT_ID,
                title: 'HR Manager',
                arabicTitle: 'مدير الموارد البشرية',
                code: 'MGR-HR',
                department: departments[2]._id,
                jobDescription: 'Human resources management'
            },
            {
                tenantId: DEFAULT_TENANT_ID,
                title: 'manager',
                arabicTitle: 'أستاذ',
                code: 'PROF-CIV',
                department: departments[3]._id,
                jobDescription: 'Senior business position'
            },
            {
                tenantId: DEFAULT_TENANT_ID,
                title: 'Assistant specialist',
                arabicTitle: 'معيد',
                code: 'ASLEC-MEC',
                department: departments[4]._id,
                jobDescription: 'Junior teaching position'
            },
            {
                tenantId: DEFAULT_TENANT_ID,
                title: 'Lab Engineer',
                arabicTitle: 'مهندس مختبر',
                code: 'LAB-ELE',
                department: departments[5]._id,
                jobDescription: 'Laboratory management and support'
            },
            {
                tenantId: DEFAULT_TENANT_ID,
                title: 'manager',
                arabicTitle: 'أستاذ',
                code: 'PROF-SWE',
                department: departments[6]._id,
                jobDescription: 'Senior business position'
            },
            {
                tenantId: DEFAULT_TENANT_ID,
                title: 'Research Assistant',
                arabicTitle: 'مساعد بحث',
                code: 'RA-AI',
                department: departments[7]._id,
                jobDescription: 'Research and development'
            },
            {
                tenantId: DEFAULT_TENANT_ID,
                title: 'System Administrator',
                arabicTitle: 'مسؤول نظام',
                code: 'SYSADM-IS',
                department: departments[8]._id,
                jobDescription: 'System administration and maintenance'
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
                email: 'admin@cic.com.eg',
                password: 'admin123',
                role: 'admin',
                profile: {
                    firstName: 'System',
                    lastName: 'Administrator',
                    arabicName: 'مسؤول النظام',
                    phone: '+201234567890',
                    gender: 'male',
                    dateOfBirth: new Date('1980-01-01'),
                    maritalStatus: 'married',
                    nationalId: 29001010101010
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
                email: 'hr@cic.com.eg',
                password: 'hr123',
                role: 'hr',
                profile: {
                    firstName: 'Sarah',
                    lastName: 'Ahmed',
                    arabicName: 'سارة أحمد',
                    phone: '+201234567891',
                    gender: 'female',
                    dateOfBirth: new Date('1985-05-15'),
                    maritalStatus: 'married',
                    nationalId: 28505150101011
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
                email: 'manager@cic.com.eg',
                password: 'manager123',
                role: 'manager',
                profile: {
                    firstName: 'Mohamed',
                    lastName: 'Hassan',
                    arabicName: 'محمد حسن',
                    phone: '+201234567892',
                    gender: 'male',
                    dateOfBirth: new Date('1978-08-20'),
                    maritalStatus: 'married',
                    nationalId: 27808200101012
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
                email: 'john.doe@cic.com.eg',
                password: 'employee123',
                role: 'employee',
                profile: {
                    firstName: 'John',
                    medName: 'Michael',
                    lastName: 'Doe',
                    arabicName: 'جون مايكل دو',
                    phone: '+201234567893',
                    gender: 'male',
                    dateOfBirth: new Date('1990-03-10'),
                    maritalStatus: 'single',
                    nationalId: 29003100101013
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
                email: 'jane.smith@cic.com.eg',
                password: 'employee123',
                role: 'employee',
                profile: {
                    firstName: 'Jane',
                    lastName: 'Smith',
                    arabicName: 'جين سميث',
                    phone: '+201234567894',
                    gender: 'female',
                    dateOfBirth: new Date('1992-07-25'),
                    maritalStatus: 'single',
                    nationalId: 29207250201014
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
                email: 'ahmed.ali@cic.com.eg',
                password: 'employee123',
                role: 'employee',
                profile: {
                    firstName: 'Ahmed',
                    lastName: 'Ali',
                    arabicName: 'أحمد علي',
                    phone: '+201234567895',
                    gender: 'male',
                    dateOfBirth: new Date('1988-11-30'),
                    maritalStatus: 'married',
                    nationalId: 28811300301015
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
                email: 'fatma.mohamed@cic.com.eg',
                password: 'employee123',
                role: 'employee',
                profile: {
                    firstName: 'Fatma',
                    lastName: 'Mohamed',
                    arabicName: 'فاطمة محمد',
                    phone: '+201234567896',
                    gender: 'female',
                    dateOfBirth: new Date('1995-02-14'),
                    maritalStatus: 'single',
                    nationalId: 29502140201016
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
                email: 'omar.ibrahim@cic.com.eg',
                password: 'employee123',
                role: 'employee',
                profile: {
                    firstName: 'Omar',
                    lastName: 'Ibrahim',
                    arabicName: 'عمر إبراهيم',
                    phone: '+201234567897',
                    gender: 'male',
                    dateOfBirth: new Date('1983-06-18'),
                    maritalStatus: 'married',
                    nationalId: 28306180101017
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

        console.log('════════════════════════════════════════');
        console.log('🎉 Database seeded successfully!');
        console.log('════════════════════════════════════════\n');

        console.log('📋 Test Credentials:');
        console.log('───────────────────────────────────────');
        console.log('Admin:');
        console.log('  Email: admin@cic.com.eg');
        console.log('  Password: admin123');
        console.log('  Role: admin\n');

        console.log('HR Manager:');
        console.log('  Email: hr@cic.com.eg');
        console.log('  Password: hr123');
        console.log('  Role: hr\n');

        console.log('Manager:');
        console.log('  Email: manager@cic.com.eg');
        console.log('  Password: manager123');
        console.log('  Role: manager\n');

        console.log('Employee:');
        console.log('  Email: john.doe@cic.com.eg');
        console.log('  Password: employee123');
        console.log('  Role: employee\n');

        console.log('Employee:');
        console.log('  Email: omar.ibrahim@cic.com.eg');
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