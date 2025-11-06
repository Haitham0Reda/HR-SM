/**
 * Database Seed Script
 * Populates the database with test data
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });
import connectDB from './config/db.js';
import User from './models/user.model.js';
import School from './models/school.model.js';
import Department from './models/department.model.js';
import Position from './models/position.model.js';
import Attendance from './models/attendance.model.js';
import Holiday from './models/holiday.model.js';
import Event from './models/event.model.js';
import Report from './models/report.model.js';
import Request from './models/request.model.js';
import MixedVacation from './models/mixedVacation.model.js';
// Additional models to be seeded
import Announcement from './models/announcement.model.js';
import Backup from './models/backup.model.js';
import BackupExecution from './models/backupExecution.model.js';
import Document from './models/document.model.js';
import Leave from './models/leave.model.js';
import Notification from './models/notification.model.js';
import Payroll from './models/payroll.model.js';
import Permission from './models/permission.model.js';
import PermissionAudit from './models/permissionAudit.model.js';
import ResignedEmployee from './models/resignedEmployee.model.js';
import SecuritySettings from './models/securitySettings.model.js';
import Survey from './models/survey.model.js';
// Additional specialized models
import DocumentTemplate from './models/documentTemplate.model.js';
import VacationBalance from './models/vacationBalance.model.js';
import RequestControl from './models/requestControl.model.js';

// NEW: Import missing models
import IDCard from './models/idCard.model.js';
import IDCardBatch from './models/idCardBatch.model.js';
import ReportConfig from './models/reportConfig.model.js';
import ReportExecution from './models/reportExecution.model.js';
import ReportExport from './models/reportExport.model.js';
import SurveyNotification from './models/surveyNotification.model.js';
import SecurityAudit from './models/securityAudit.model.js';

const seedData = async () => {
    try {
        // Connect to database
        connectDB();
        
        console.log('🌱 Starting database seed...\n');

        // Clear existing data
        console.log('🗑️  Clearing existing data...');
        await User.deleteMany({});
        await School.deleteMany({});
        await Department.deleteMany({});
        await Position.deleteMany({});
        await Attendance.deleteMany({});
        await Holiday.deleteMany({});
        await Event.deleteMany({});
        await Report.deleteMany({});
        await Request.deleteMany({});
        await MixedVacation.deleteMany({});
        // Clear additional models
        await Announcement.deleteMany({});
        await Backup.deleteMany({});
        await BackupExecution.deleteMany({});
        await Document.deleteMany({});
        await Leave.deleteMany({});
        await Notification.deleteMany({});
        await Payroll.deleteMany({});
        await Permission.deleteMany({});
        await PermissionAudit.deleteMany({});
        await ResignedEmployee.deleteMany({});
        await SecuritySettings.deleteMany({});
        await Survey.deleteMany({});
        // Clear additional specialized models
        await DocumentTemplate.deleteMany({});
        await VacationBalance.deleteMany({});
        await RequestControl.deleteMany({});
        
        // NEW: Clear missing models
        await IDCard.deleteMany({});
        await IDCardBatch.deleteMany({});
        await ReportConfig.deleteMany({});
        await ReportExecution.deleteMany({});
        await ReportExport.deleteMany({});
        await SurveyNotification.deleteMany({});
        await SecurityAudit.deleteMany({});
        console.log('✅ Existing data cleared\n');

        // Create Schools
        console.log('🏫 Creating schools...');
        const schools = await School.create([
            {
                schoolCode: 'BUS',
                name: 'School of Business',
                arabicName: 'المعهد الكندى العالى للإدارة بالسادس من اكتوبر'
            },
            {
                schoolCode: 'ENG',
                name: 'School of Engineering',
                arabicName: 'المعهد الكندى العالى للهندسة بالسادس من اكتوبر'
            },
            {
                schoolCode: 'CS',
                name: 'School of Computer Science',
                arabicName: 'المعهد الكندى العالى للحاسبات والذكاء الاصطناعى بالسادس من اكتوبر'
            }
        ]);
        console.log(`✅ Created ${schools.length} schools\n`);

        // Create Departments
        console.log('🏢 Creating departments...');
        const departments = await Department.create([
            // Business School Departments
            {
                name: 'Accounting',
                arabicName: 'المحاسبة',
                code: 'BUS-ACC',
                school: schools[0]._id,
                description: 'Accounting and Financial Management'
            },
            {
                name: 'Marketing',
                arabicName: 'التسويق',
                code: 'BUS-MKT',
                school: schools[0]._id,
                description: 'Marketing and Business Development'
            },
            {
                name: 'Human Resources',
                arabicName: 'الموارد البشرية',
                code: 'BUS-HR',
                school: schools[0]._id,
                description: 'Human Resources Management'
            },
            // Engineering School Departments
            {
                name: 'Civil Engineering',
                arabicName: 'الهندسة المدنية',
                code: 'ENG-CIV',
                school: schools[1]._id,
                description: 'Civil and Construction Engineering'
            },
            {
                name: 'Mechanical Engineering',
                arabicName: 'الهندسة الميكانيكية',
                code: 'ENG-MEC',
                school: schools[1]._id,
                description: 'Mechanical and Industrial Engineering'
            },
            {
                name: 'Electrical Engineering',
                arabicName: 'الهندسة الكهربائية',
                code: 'ENG-ELE',
                school: schools[1]._id,
                description: 'Electrical and Electronics Engineering'
            },
            // Computer Science School Departments
            {
                name: 'Software Engineering',
                arabicName: 'هندسة البرمجيات',
                code: 'CS-SWE',
                school: schools[2]._id,
                description: 'Software Development and Engineering'
            },
            {
                name: 'Artificial Intelligence',
                arabicName: 'الذكاء الاصطناعي',
                code: 'CS-AI',
                school: schools[2]._id,
                description: 'AI and Machine Learning'
            },
            {
                name: 'Information Systems',
                arabicName: 'نظم المعلومات',
                code: 'CS-IS',
                school: schools[2]._id,
                description: 'Information Systems and Database Management'
            }
        ]);
        console.log(`✅ Created ${departments.length} departments\n`);

        // Create Positions
        console.log('💼 Creating positions...');
        const positions = await Position.create([
            // Business Positions
            {
                title: 'Professor',
                arabicTitle: 'أستاذ',
                code: 'BUS-ACC-PROF',
                department: departments[0]._id,
                jobDescription: 'Senior academic position'
            },
            {
                title: 'Associate Professor',
                arabicTitle: 'أستاذ مساعد',
                code: 'BUS-ACC-ASPROF',
                department: departments[0]._id,
                jobDescription: 'Mid-level academic position'
            },
            {
                title: 'Lecturer',
                arabicTitle: 'محاضر',
                code: 'BUS-MKT-LEC',
                department: departments[1]._id,
                jobDescription: 'Teaching and research'
            },
            {
                title: 'HR Manager',
                arabicTitle: 'مدير الموارد البشرية',
                code: 'BUS-HR-MGR',
                department: departments[2]._id,
                jobDescription: 'Human resources management'
            },
            // Engineering Positions
            {
                title: 'Professor',
                arabicTitle: 'أستاذ',
                code: 'ENG-CIV-PROF',
                department: departments[3]._id,
                jobDescription: 'Senior academic position'
            },
            {
                title: 'Assistant Lecturer',
                arabicTitle: 'معيد',
                code: 'ENG-MEC-ASLEC',
                department: departments[4]._id,
                jobDescription: 'Junior teaching position'
            },
            {
                title: 'Lab Engineer',
                arabicTitle: 'مهندس مختبر',
                code: 'ENG-ELE-LAB',
                department: departments[5]._id,
                jobDescription: 'Laboratory management and support'
            },
            // Computer Science Positions
            {
                title: 'Professor',
                arabicTitle: 'أستاذ',
                code: 'CS-SWE-PROF',
                department: departments[6]._id,
                jobDescription: 'Senior academic position'
            },
            {
                title: 'Research Assistant',
                arabicTitle: 'مساعد بحث',
                code: 'CS-AI-RA',
                department: departments[7]._id,
                jobDescription: 'Research and development'
            },
            {
                title: 'System Administrator',
                arabicTitle: 'مسؤول نظام',
                code: 'CS-IS-SYSADM',
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
                employeeId: 'EMID-0001',
                username: 'admin',
                email: 'admin@cic.edu.eg',
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
                school: schools[0]._id,
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
                employeeId: 'EMID-0002',
                username: 'hr.manager',
                email: 'hr@cic.edu.eg',
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
                school: schools[0]._id,
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
                employeeId: 'EMID-0003',
                username: 'dept.manager',
                email: 'manager@cic.edu.eg',
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
                school: schools[2]._id,
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
                employeeId: 'EMID-0004',
                username: 'john.doe',
                email: 'john.doe@cic.edu.eg',
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
                school: schools[0]._id,
                department: departments[0]._id,
                position: positions[0]._id,
                employment: {
                    hireDate: new Date('2022-01-15'),
                    contractType: 'full-time',
                    employmentStatus: 'active'
                }
            },
            {
                employeeId: 'EMID-0005',
                username: 'jane.smith',
                email: 'jane.smith@cic.edu.eg',
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
                school: schools[1]._id,
                department: departments[3]._id,
                position: positions[4]._id,
                employment: {
                    hireDate: new Date('2022-06-01'),
                    contractType: 'full-time',
                    employmentStatus: 'active'
                }
            },
            {
                employeeId: 'EMID-0006',
                username: 'ahmed.ali',
                email: 'ahmed.ali@cic.edu.eg',
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
                school: schools[2]._id,
                department: departments[6]._id,
                position: positions[7]._id,
                employment: {
                    hireDate: new Date('2021-09-15'),
                    contractType: 'full-time',
                    employmentStatus: 'active'
                }
            },
            {
                employeeId: 'EMID-0007',
                username: 'fatma.mohamed',
                email: 'fatma.mohamed@cic.edu.eg',
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
                school: schools[2]._id,
                department: departments[7]._id,
                position: positions[8]._id,
                employment: {
                    hireDate: new Date('2023-02-01'),
                    contractType: 'contract',
                    employmentStatus: 'active'
                }
            },
            {
                employeeId: 'EMID-0008',
                username: 'omar.ibrahim',
                email: 'omar.ibrahim@cic.edu.eg',
                password: 'employee123',
                role: 'supervisor',
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
                school: schools[1]._id,
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
                campus: schools[0]._id,
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
                        reason: 'End of Academic Year',
                        earlyLeaveTime: '14:00',
                        dayOfWeek: 'Monday'
                    }
                ],
                weekendDays: [5, 6] // Friday and Saturday
            }
        ]);
        console.log(`✅ Created ${holidays.length} holiday records\n`);

        // Create Events
        console.log('🎉 Creating events...');
        const events = await Event.create([
            {
                title: 'Annual Staff Meeting',
                description: 'Annual meeting for all staff members to discuss upcoming initiatives',
                location: 'Main Conference Hall',
                startDate: new Date('2025-01-15T09:00:00'),
                endDate: new Date('2025-01-15T12:00:00'),
                createdBy: users[0]._id,
                attendees: [users[1]._id, users[2]._id, users[3]._id],
                isPublic: true
            },
            {
                title: 'Engineering Workshop',
                description: 'Hands-on workshop for engineering department staff',
                location: 'Engineering Building, Room 201',
                startDate: new Date('2025-02-10T14:00:00'),
                endDate: new Date('2025-02-10T17:00:00'),
                createdBy: users[4]._id,
                attendees: [users[4]._id, users[5]._id, users[7]._id],
                isPublic: false
            },
            {
                title: 'Employee Training Session',
                description: 'Professional development training for all employees',
                location: 'Training Center',
                startDate: new Date('2025-03-05T10:00:00'),
                endDate: new Date('2025-03-05T16:00:00'),
                createdBy: users[1]._id,
                attendees: [users[3]._id, users[4]._id, users[5]._id, users[6]._id, users[7]._id],
                isPublic: true
            }
        ]);
        console.log(`✅ Created ${events.length} events\n`);

        // Create Reports
        console.log('📊 Creating reports...');
        const reports = await Report.create([
            {
                name: 'Employee Attendance Report',
                description: 'Monthly attendance summary for all employees',
                reportType: 'attendance',
                fields: [
                    { fieldName: 'employeeName', displayName: 'Employee Name', dataType: 'string' },
                    { fieldName: 'presentDays', displayName: 'Present Days', dataType: 'number' },
                    { fieldName: 'absentDays', displayName: 'Absent Days', dataType: 'number' },
                    { fieldName: 'lateArrivals', displayName: 'Late Arrivals', dataType: 'number' }
                ],
                filters: [
                    { field: 'date', operator: 'between', value: ['2025-01-01', '2025-01-31'] }
                ],
                sorting: [
                    { field: 'employeeName', order: 'asc' }
                ],
                visualization: {
                    enabled: true,
                    chartType: 'bar',
                    xAxis: 'employeeName',
                    yAxis: 'presentDays'
                },
                isPublic: true,
                createdBy: users[0]._id,
                exportSettings: {
                    defaultFormat: 'excel',
                    includeCharts: true
                }
            },
            {
                name: 'Department Performance Report',
                description: 'Quarterly performance metrics by department',
                reportType: 'department',
                fields: [
                    { fieldName: 'departmentName', displayName: 'Department', dataType: 'string' },
                    { fieldName: 'employeeCount', displayName: 'Employee Count', dataType: 'number' },
                    { fieldName: 'avgPerformance', displayName: 'Average Performance', dataType: 'number' }
                ],
                filters: [
                    { field: 'quarter', operator: 'equals', value: 'Q1-2025' }
                ],
                sorting: [
                    { field: 'avgPerformance', order: 'desc' }
                ],
                visualization: {
                    enabled: true,
                    chartType: 'pie',
                    xAxis: 'departmentName',
                    yAxis: 'avgPerformance'
                },
                isPublic: true,
                createdBy: users[1]._id,
                exportSettings: {
                    defaultFormat: 'pdf',
                    includeCharts: true
                }
            }
        ]);
        console.log(`✅ Created ${reports.length} reports\n`);

        // Create Requests
        console.log('📬 Creating requests...');
        const requests = await Request.create([
            {
                employee: users[3]._id,
                type: 'permission',
                details: {
                    date: new Date('2025-01-20'),
                    startTime: '14:00',
                    endTime: '16:00',
                    reason: 'Personal appointment'
                },
                status: 'pending',
                requestedAt: new Date('2025-01-15'),
                comments: 'Need approval for personal appointment'
            },
            {
                employee: users[4]._id,
                type: 'overtime',
                details: {
                    date: new Date('2025-01-25'),
                    startTime: '18:00',
                    endTime: '20:00',
                    reason: 'Project deadline'
                },
                status: 'approved',
                requestedAt: new Date('2025-01-20'),
                reviewedAt: new Date('2025-01-21'),
                reviewer: users[1]._id,
                comments: 'Approved for project completion'
            },
            {
                employee: users[5]._id,
                type: 'sick-leave',
                details: {
                    startDate: new Date('2025-02-05'),
                    endDate: new Date('2025-02-07'),
                    reason: 'Medical leave'
                },
                status: 'pending',
                requestedAt: new Date('2025-02-01'),
                comments: 'Doctor appointment required'
            }
        ]);
        console.log(`✅ Created ${requests.length} requests\n`);

        // Create Mixed Vacations
        console.log('🏖️ Creating mixed vacations...');
        const mixedVacations = await MixedVacation.create([
            {
                name: 'Summer Vacation 2025',
                description: 'Summer vacation period with official holidays included',
                startDate: new Date('2025-07-01'),
                endDate: new Date('2025-07-31'),
                totalDays: 31,
                officialHolidays: [
                    {
                        date: new Date('2025-07-23'),
                        name: 'Revolution Day',
                        dayOfWeek: 'Wednesday'
                    }
                ],
                officialHolidayCount: 1,
                personalDaysRequired: 20,
                deductionStrategy: 'auto',
                applicableTo: {
                    allEmployees: true
                },
                applications: [
                    {
                        employee: users[3]._id,
                        status: 'pending',
                        balanceBefore: { annual: 21, casual: 7 },
                        balanceAfter: { annual: 21, casual: 7 }
                    }
                ],
                status: 'active',
                createdBy: users[0]._id
            },
            {
                name: 'Winter Break 2025',
                description: 'Winter holiday period with official holidays',
                startDate: new Date('2025-12-20'),
                endDate: new Date('2026-01-10'),
                totalDays: 22,
                officialHolidays: [
                    {
                        date: new Date('2025-12-25'),
                        name: 'Christmas Day',
                        dayOfWeek: 'Thursday'
                    },
                    {
                        date: new Date('2026-01-01'),
                        name: 'New Year Day',
                        dayOfWeek: 'Thursday'
                    },
                    {
                        date: new Date('2026-01-07'),
                        name: 'Coptic Christmas',
                        dayOfWeek: 'Wednesday'
                    }
                ],
                officialHolidayCount: 3,
                personalDaysRequired: 15,
                deductionStrategy: 'annual-first',
                applicableTo: {
                    allEmployees: true
                },
                applications: [],
                status: 'draft',
                createdBy: users[0]._id
            }
        ]);
        console.log(`✅ Created ${mixedVacations.length} mixed vacations\n`);

        // Create Attendance Records
        console.log('🕒 Creating attendance records...');
        const attendanceRecords = [];
        
        // Create attendance records for John Doe (users[3])
        for (let i = 0; i < 10; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            
            // Skip weekends
            const dayOfWeek = date.getDay();
            if (dayOfWeek === 5 || dayOfWeek === 6) continue; // Skip Friday and Saturday
            
            const checkInTime = new Date(date);
            checkInTime.setHours(8, 30, 0, 0);
            
            const checkOutTime = new Date(date);
            checkOutTime.setHours(17, 0, 0, 0);
            
            attendanceRecords.push({
                employee: users[3]._id,
                department: departments[0]._id,
                position: positions[0]._id,
                date: date,
                schedule: {
                    startTime: '09:00',
                    endTime: '17:00',
                    expectedHours: 8
                },
                checkIn: {
                    time: checkInTime,
                    method: 'biometric',
                    location: 'office',
                    isLate: false,
                    lateMinutes: 0
                },
                checkOut: {
                    time: checkOutTime,
                    method: 'biometric',
                    location: 'office',
                    isEarly: false,
                    earlyMinutes: 0
                },
                hours: {
                    actual: 8,
                    expected: 8,
                    overtime: 0,
                    workFromHome: 0,
                    totalHours: 8
                },
                status: 'present'
            });
        }
        
        // Create some late attendance records
        for (let i = 10; i < 13; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            
            // Skip weekends
            const dayOfWeek = date.getDay();
            if (dayOfWeek === 5 || dayOfWeek === 6) continue; // Skip Friday and Saturday
            
            const checkInTime = new Date(date);
            checkInTime.setHours(9, 30, 0, 0);
            
            const checkOutTime = new Date(date);
            checkOutTime.setHours(17, 30, 0, 0);
            
            attendanceRecords.push({
                employee: users[3]._id,
                department: departments[0]._id,
                position: positions[0]._id,
                date: date,
                schedule: {
                    startTime: '09:00',
                    endTime: '17:00',
                    expectedHours: 8
                },
                checkIn: {
                    time: checkInTime,
                    method: 'biometric',
                    location: 'office',
                    isLate: true,
                    lateMinutes: 30
                },
                checkOut: {
                    time: checkOutTime,
                    method: 'biometric',
                    location: 'office',
                    isEarly: false,
                    earlyMinutes: 0
                },
                hours: {
                    actual: 8,
                    expected: 8,
                    overtime: 0.5,
                    workFromHome: 0,
                    totalHours: 8.5
                },
                status: 'late'
            });
        }
        
        const attendances = await Attendance.create(attendanceRecords);
        console.log(`✅ Created ${attendances.length} attendance records\n`);

        // Create Announcements
        console.log('📢 Creating announcements...');
        const announcements = await Announcement.create([
            {
                title: 'New HR Policy Implementation',
                arabicTitle: 'تطبيق سياسة الموارد البشرية الجديدة',
                content: 'Please be informed that the new HR policy will be implemented starting from January 2025.',
                arabicContent: 'يرجى العلم بأن سياسة الموارد البشرية الجديدة سيتم تطبيقها بدءاً من يناير 2025.',
                type: 'policy',
                priority: 'high',
                targetAudience: 'all',
                publishDate: new Date('2025-01-01'),
                expiryDate: new Date('2025-12-31'),
                isActive: true,
                createdBy: users[0]._id
            },
            {
                title: 'Office Maintenance Notice',
                arabicTitle: 'إشعار صيانة المكتب',
                content: 'The office will be closed for maintenance on January 15th from 9 AM to 5 PM.',
                arabicContent: 'سيتم إغلاق المكتب للصيانة في 15 يناير من الساعة 9 صباحاً حتى 5 مساءً.',
                type: 'maintenance',
                priority: 'medium',
                targetAudience: 'all',
                publishDate: new Date('2025-01-10'),
                expiryDate: new Date('2025-01-20'),
                isActive: true,
                createdBy: users[1]._id
            }
        ]);
        console.log(`✅ Created ${announcements.length} announcements\n`);

        // Create Backups
        console.log('💾 Creating backups...');
        const backups = await Backup.create([
            {
                name: 'Daily Database Backup',
                description: 'Daily automated backup of the entire database',
                backupType: 'database',
                schedule: {
                    enabled: true,
                    frequency: 'daily',
                    time: '02:00'
                },
                settings: {
                    encryption: {
                        enabled: true
                    },
                    compression: {
                        enabled: true
                    },
                    retention: {
                        enabled: true,
                        days: 30
                    },
                    notification: {
                        enabled: true,
                        onFailure: true
                    }
                },
                sources: {
                    databases: [{
                        name: 'hrsm_db'
                    }]
                },
                storage: {
                    location: './backups/database'
                },
                isActive: true,
                createdBy: users[0]._id
            },
            {
                name: 'Weekly Full Backup',
                description: 'Weekly full backup including database and files',
                backupType: 'full',
                schedule: {
                    enabled: true,
                    frequency: 'weekly',
                    dayOfWeek: 0,
                    time: '03:00'
                },
                settings: {
                    encryption: {
                        enabled: true
                    },
                    compression: {
                        enabled: true
                    },
                    retention: {
                        enabled: true,
                        days: 90
                    },
                    notification: {
                        enabled: true,
                        onFailure: true
                    }
                },
                sources: {
                    databases: [{
                        name: 'hrsm_db'
                    }],
                    filePaths: ['./uploads', './documents']
                },
                storage: {
                    location: './backups/full'
                },
                isActive: true,
                createdBy: users[0]._id
            }
        ]);
        console.log(`✅ Created ${backups.length} backups\n`);

        // Create Backup Executions
        console.log('🔄 Creating backup executions...');
        const backupExecutions = await BackupExecution.create([
            {
                backup: backups[0]._id,
                backupName: backups[0].name,
                executionType: 'scheduled',
                triggeredBy: users[0]._id,
                status: 'completed',
                startTime: new Date(Date.now() - 3600000),
                endTime: new Date(Date.now() - 3500000),
                duration: 100000,
                backupFile: 'daily-backup-2025-01-01.tar.gz',
                backupPath: './backups/database/daily-backup-2025-01-01.tar.gz',
                backupSize: 1024000000,
                compressedSize: 512000000,
                compressionRatio: 0.5,
                isEncrypted: true,
                encryptionAlgorithm: 'aes-256-cbc',
                itemsBackedUp: {
                    databases: 1,
                    collections: 25,
                    documents: 10000,
                    files: 0,
                    totalSize: 1024000000
                },
                checksum: 'a1b2c3d4e5f67890',
                verified: true,
                verifiedAt: new Date(Date.now() - 3400000),
                notificationSent: true,
                notificationSentAt: new Date(Date.now() - 3400000),
                serverInfo: {
                    hostname: 'server01',
                    nodeVersion: '18.17.0',
                    platform: 'linux'
                }
            },
            {
                backup: backups[0]._id,
                backupName: backups[0].name,
                executionType: 'scheduled',
                triggeredBy: users[0]._id,
                status: 'failed',
                startTime: new Date(Date.now() - 86400000),
                endTime: new Date(Date.now() - 86300000),
                duration: 100000,
                error: {
                    message: 'Database connection timeout',
                    code: 'DB_TIMEOUT'
                },
                notificationSent: true,
                notificationSentAt: new Date(Date.now() - 86300000),
                serverInfo: {
                    hostname: 'server01',
                    nodeVersion: '18.17.0',
                    platform: 'linux'
                }
            },
            {
                backup: backups[1]._id,
                backupName: backups[1].name,
                executionType: 'manual',
                triggeredBy: users[0]._id,
                status: 'completed',
                startTime: new Date(Date.now() - 172800000),
                endTime: new Date(Date.now() - 172000000),
                duration: 800000,
                backupFile: 'weekly-full-backup-2024-12-31.tar.gz',
                backupPath: './backups/full/weekly-full-backup-2024-12-31.tar.gz',
                backupSize: 5120000000,
                compressedSize: 2560000000,
                compressionRatio: 0.5,
                isEncrypted: true,
                encryptionAlgorithm: 'aes-256-cbc',
                itemsBackedUp: {
                    databases: 1,
                    collections: 25,
                    documents: 50000,
                    files: 1000,
                    totalSize: 5120000000
                },
                checksum: 'f6e5d4c3b2a10987',
                verified: true,
                verifiedAt: new Date(Date.now() - 171000000),
                notificationSent: true,
                notificationSentAt: new Date(Date.now() - 171000000),
                serverInfo: {
                    hostname: 'server01',
                    nodeVersion: '18.17.0',
                    platform: 'linux'
                }
            }
        ]);
        console.log(`✅ Created ${backupExecutions.length} backup executions\n`);

        // Create Documents
        console.log('📄 Creating documents...');
        const documents = await Document.create([
            {
                title: 'Employee Handbook',
                arabicTitle: 'دليل الموظف',
                type: 'contract',
                employee: users[3]._id,
                department: departments[0]._id,
                fileUrl: '/documents/employee-handbook.pdf',
                fileName: 'employee-handbook.pdf',
                fileSize: 2048000,
                uploadedBy: users[0]._id,
                expiryDate: new Date('2026-01-01'),
                isConfidential: false
            },
            {
                title: 'National ID Copy',
                arabicTitle: 'نسخة البطاقة الشخصية',
                type: 'national-id',
                employee: users[4]._id,
                fileUrl: '/documents/national-id-0005.pdf',
                fileName: 'national-id-0005.pdf',
                fileSize: 1024000,
                uploadedBy: users[4]._id,
                isConfidential: true
            }
        ]);
        console.log(`✅ Created ${documents.length} documents\n`);

        // Create Leaves
        console.log('🌴 Creating leaves...');
        const leaves = await Leave.create([
            {
                employee: users[3]._id,
                leaveType: 'annual',
                startDate: new Date(new Date().setDate(new Date().getDate() + 10)),
                endDate: new Date(new Date().setDate(new Date().getDate() + 15)),
                duration: 5,
                reason: 'Annual vacation with family',
                status: 'approved',
                approvedBy: users[1]._id,
                approvedAt: new Date(),
                department: departments[0]._id,
                position: positions[0]._id
            },
            {
                employee: users[5]._id,
                leaveType: 'sick',
                startDate: new Date(new Date().setDate(new Date().getDate() + 5)),
                endDate: new Date(new Date().setDate(new Date().getDate() + 7)),
                duration: 3,
                reason: 'Medical treatment required',
                status: 'pending',
                department: departments[6]._id,
                position: positions[7]._id,
                medicalDocumentation: {
                    required: true,
                    provided: false
                }
            }
        ]);
        console.log(`✅ Created ${leaves.length} leaves\n`);

        // Create Notifications
        console.log('🔔 Creating notifications...');
        const notifications = await Notification.create([
            {
                recipient: users[3]._id,
                type: 'request',
                title: 'New Permission Request',
                message: 'Your permission request for January 20th has been approved',
                isRead: false,
                relatedModel: 'Request',
                relatedId: requests[0]._id
            },
            {
                recipient: users[4]._id,
                type: 'announcement',
                title: 'New Announcement',
                message: 'New HR policy implementation announcement',
                isRead: false,
                relatedModel: 'Announcement',
                relatedId: announcements[0]._id
            }
        ]);
        console.log(`✅ Created ${notifications.length} notifications\n`);

        // Create Payrolls
        console.log('💰 Creating payrolls...');
        const payrolls = await Payroll.create([
            {
                employee: users[3]._id,
                period: '2025-01',
                deductions: [
                    {
                        type: 'tax',
                        arabicName: 'ضريبة',
                        description: 'Income tax',
                        amount: 500.00
                    },
                    {
                        type: 'insurance',
                        arabicName: 'تأمين',
                        description: 'Health insurance',
                        amount: 200.00
                    }
                ],
                totalDeductions: 700.00
            },
            {
                employee: users[4]._id,
                period: '2025-01',
                deductions: [
                    {
                        type: 'tax',
                        arabicName: 'ضريبة',
                        description: 'Income tax',
                        amount: 550.00
                    },
                    {
                        type: 'insurance',
                        arabicName: 'تأمين',
                        description: 'Health insurance',
                        amount: 200.00
                    }
                ],
                totalDeductions: 750.00
            }
        ]);
        console.log(`✅ Created ${payrolls.length} payrolls\n`);

        // Create Permissions
        console.log('⏰ Creating permissions...');
        const permissions = await Permission.create([
            {
                employee: users[3]._id,
                permissionType: 'late-arrival',
                date: new Date(new Date().setDate(new Date().getDate() + 3)),
                time: {
                    scheduled: '09:00',
                    requested: '10:30',
                    duration: 90
                },
                reason: 'Traffic delay due to road construction',
                status: 'approved',
                approval: {
                    reviewedBy: users[1]._id,
                    reviewedAt: new Date(),
                    comments: 'Approved due to valid reason'
                },
                attendanceRecord: attendances[0]._id,
                attendanceAdjusted: true
            },
            {
                employee: users[5]._id,
                permissionType: 'early-departure',
                date: new Date(new Date().setDate(new Date().getDate() + 5)),
                time: {
                    scheduled: '17:00',
                    requested: '16:00',
                    duration: 60
                },
                reason: 'Personal appointment',
                status: 'pending'
            }
        ]);
        console.log(`✅ Created ${permissions.length} permissions\n`);

        // Create Permission Audits
        console.log('📋 Creating permission audits...');
        const permissionAudits = await PermissionAudit.create([
            {
                user: users[3]._id,
                modifiedBy: users[0]._id,
                action: 'role-change',
                changes: {
                    previousRole: 'employee',
                    newRole: 'manager'
                },
                reason: 'Promotion to department manager',
                ipAddress: '192.168.1.100',
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            {
                user: users[5]._id,
                modifiedBy: users[1]._id,
                action: 'permission-added',
                changes: {
                    permissionsAdded: ['view-reports', 'export-data']
                },
                reason: 'Granted access to reports for project work',
                ipAddress: '192.168.1.101',
                userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            },
            {
                user: users[6]._id,
                modifiedBy: users[0]._id,
                action: 'permission-removed',
                changes: {
                    permissionsRemoved: ['delete-users']
                },
                reason: 'Removed unnecessary administrative permissions',
                ipAddress: '192.168.1.100',
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        ]);
        console.log(`✅ Created ${permissionAudits.length} permission audits\n`);

        // Create Resigned Employees
        console.log('👋 Creating resigned employees...');
        const resignedEmployees = await ResignedEmployee.create([
            {
                employee: users[6]._id,
                resignationType: 'resignation-letter',
                resignationDate: new Date(),
                lastWorkingDay: new Date(new Date().setDate(new Date().getDate() + 30)),
                reason: 'Personal reasons',
                status: 'processed',
                processedBy: users[0]._id,
                processedDate: new Date()
            }
        ]);
        console.log(`✅ Created ${resignedEmployees.length} resigned employees\n`);

        // Create Security Settings
        console.log('🔒 Creating security settings...');
        const securitySettings = await SecuritySettings.create({
            twoFactorAuth: {
                enabled: true,
                enforced: false
            },
            passwordPolicy: {
                minLength: 8,
                requireUppercase: true,
                requireLowercase: true,
                requireNumbers: true,
                expirationDays: 90
            },
            accountLockout: {
                enabled: true,
                maxAttempts: 5,
                lockoutDuration: 30
            },
            sessionManagement: {
                maxConcurrentSessions: 3,
                sessionTimeout: 480,
                idleTimeout: 60
            },
            auditSettings: {
                enabled: true,
                logLoginAttempts: true,
                logDataChanges: true,
                logSecurityEvents: true,
                retentionDays: 365
            },
            lastModifiedBy: users[0]._id
        });
        console.log('✅ Created security settings\n');

        // Create Surveys
        console.log('📊 Creating surveys...');
        const surveys = await Survey.create([
            {
                title: 'Employee Satisfaction Survey',
                description: 'Quarterly employee satisfaction survey to gather feedback',
                surveyType: 'satisfaction',
                questions: [
                    {
                        questionText: 'How satisfied are you with your current work environment?',
                        questionType: 'rating',
                        ratingScale: {
                            min: 1,
                            max: 5
                        },
                        required: true,
                        order: 1
                    },
                    {
                        questionText: 'What do you like most about working here?',
                        questionType: 'textarea',
                        required: true,
                        order: 2
                    }
                ],
                settings: {
                    isMandatory: true,
                    allowAnonymous: true,
                    startDate: new Date(new Date().setDate(new Date().getDate() + 1)),
                    endDate: new Date(new Date().setDate(new Date().getDate() + 30))
                },
                assignedTo: {
                    allEmployees: true
                },
                status: 'active',
                createdBy: users[0]._id
            },
            {
                title: 'Training Needs Assessment',
                description: 'Assessment of employee training needs for 2025',
                surveyType: 'training',
                questions: [
                    {
                        questionText: 'Which technical skills would you like to improve?',
                        questionType: 'multiple-choice',
                        options: [
                            'Programming Languages',
                            'Database Management',
                            'Cloud Technologies',
                            'Cybersecurity',
                            'Project Management'
                        ],
                        required: true,
                        order: 1
                    },
                    {
                        questionText: 'How many hours per week can you dedicate to training?',
                        questionType: 'single-choice',
                        options: [
                            '1-2 hours',
                            '3-5 hours',
                            '5-10 hours',
                            'More than 10 hours'
                        ],
                        required: true,
                        order: 2
                    }
                ],
                settings: {
                    isMandatory: false,
                    startDate: new Date(new Date().setDate(new Date().getDate() + 5)),
                    endDate: new Date(new Date().setDate(new Date().getDate() + 35))
                },
                assignedTo: {
                    departments: [departments[6]._id, departments[7]._id]
                },
                status: 'draft',
                createdBy: users[1]._id
            }
        ]);
        console.log(`✅ Created ${surveys.length} surveys\n`);

        // Create Document Templates
        console.log('📋 Creating document templates...');
        const documentTemplates = await DocumentTemplate.create([
            {
                name: 'Employment Contract Template',
                description: 'Standard employment contract template',
                fileUrl: '/templates/employment-contract.docx',
                fileType: 'docx',
                isActive: true,
                createdBy: users[0]._id
            },
            {
                name: 'Leave Request Form',
                description: 'Standard leave request form template',
                fileUrl: '/templates/leave-request-form.pdf',
                fileType: 'pdf',
                isActive: true,
                createdBy: users[1]._id
            }
        ]);
        console.log(`✅ Created ${documentTemplates.length} document templates\n`);

        // Create Vacation Balances
        console.log('🏖️ Creating vacation balances...');
        const vacationBalances = await VacationBalance.create([
            {
                employee: users[3]._id,
                year: new Date().getFullYear(),
                annual: {
                    allocated: 21,
                    used: 5,
                    pending: 0,
                    available: 16,
                    carriedOver: 0
                },
                casual: {
                    allocated: 7,
                    used: 1,
                    pending: 0,
                    available: 6
                },
                sick: {
                    allocated: 10,
                    used: 0,
                    pending: 0,
                    available: 10
                },
                eligibility: {
                    isEligible: true,
                    eligibleFrom: new Date('2022-04-15'),
                    probationEnds: new Date('2022-04-15'),
                    tenure: 3
                },
                flexibleHours: {
                    allocated: 40,
                    used: 8,
                    pending: 0,
                    available: 32
                }
            },
            {
                employee: users[4]._id,
                year: new Date().getFullYear(),
                annual: {
                    allocated: 21,
                    used: 0,
                    pending: 5,
                    available: 16,
                    carriedOver: 0
                },
                casual: {
                    allocated: 7,
                    used: 0,
                    pending: 2,
                    available: 5
                },
                sick: {
                    allocated: 10,
                    used: 0,
                    pending: 0,
                    available: 10
                },
                eligibility: {
                    isEligible: true,
                    eligibleFrom: new Date('2022-09-01'),
                    probationEnds: new Date('2022-09-01'),
                    tenure: 2
                },
                flexibleHours: {
                    allocated: 40,
                    used: 0,
                    pending: 0,
                    available: 40
                }
            }
        ]);
        console.log(`✅ Created ${vacationBalances.length} vacation balances\n`);

        // Create Request Controls
        console.log('🎛️ Creating request controls...');
        const requestControls = await RequestControl.create([
            {
                organization: 'default',
                systemWide: {
                    enabled: true,
                    disabledMessage: 'All requests are currently enabled',
                    enabledBy: users[0]._id,
                    enabledAt: new Date()
                },
                vacationRequests: {
                    enabled: true,
                    disabledMessage: 'Vacation requests are currently enabled',
                    leaveTypes: {
                        annual: {
                            enabled: true
                        },
                        casual: {
                            enabled: true
                        }
                    }
                },
                permissionRequests: {
                    enabled: true,
                    disabledMessage: 'Permission requests are currently enabled',
                    permissionTypes: {
                        lateArrival: {
                            enabled: true
                        },
                        earlyDeparture: {
                            enabled: true
                        },
                        overtime: {
                            enabled: true
                        }
                    }
                },
                sickLeave: {
                    enabled: true,
                    disabledMessage: 'Sick leave requests are currently enabled'
                },
                missionRequests: {
                    enabled: true,
                    disabledMessage: 'Mission requests are currently enabled'
                },
                forgotCheck: {
                    enabled: true,
                    disabledMessage: 'Forgot check-in/out corrections are currently enabled'
                }
            }
        ]);
        console.log(`✅ Created ${requestControls.length} request controls\n`);

        // NEW: Create ID Cards
        console.log('💳 Creating ID cards...');
        const idCards = await IDCard.create([
            {
                employee: users[3]._id,
                department: departments[0]._id,
                school: schools[0]._id,
                position: positions[0]._id,
                cardNumber: 'ID-0001',
                cardType: 'employee',
                status: 'active',
                issue: {
                    issuedDate: new Date(),
                    issuedBy: users[0]._id,
                    issueReason: 'new-hire'
                },
                expiry: {
                    expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 2))
                },
                template: {
                    templateName: 'Standard Employee Card',
                    includePhoto: true,
                    includeQRCode: true
                },
                qrCode: {
                    data: 'encrypted-data-0001',
                    generatedAt: new Date()
                },
                isActive: true
            },
            {
                employee: users[4]._id,
                department: departments[3]._id,
                school: schools[1]._id,
                position: positions[4]._id,
                cardNumber: 'ID-0002',
                cardType: 'employee',
                status: 'active',
                issue: {
                    issuedDate: new Date(),
                    issuedBy: users[0]._id,
                    issueReason: 'new-hire'
                },
                expiry: {
                    expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 2))
                },
                template: {
                    templateName: 'Standard Employee Card',
                    includePhoto: true,
                    includeQRCode: true
                },
                qrCode: {
                    data: 'encrypted-data-0002',
                    generatedAt: new Date()
                },
                isActive: true
            }
        ]);
        console.log(`✅ Created ${idCards.length} ID cards\n`);

        // NEW: Create ID Card Batches
        console.log('📦 Creating ID card batches...');
        const idCardBatches = await IDCardBatch.create([
            {
                batchNumber: 'BATCH-001',
                name: 'New Hire Batch',
                description: 'ID cards for new employees',
                batchType: 'new-hire',
                cards: [idCards[0]._id, idCards[1]._id],
                status: 'completed',
                processing: {
                    totalCards: 2,
                    processedCards: 2,
                    successfulCards: 2,
                    progress: 100
                },
                createdBy: users[0]._id,
                printer: {
                    printerName: 'Main Office Printer'
                },
                settings: {
                    orientation: 'portrait',
                    copies: 1
                }
            }
        ]);
        console.log(`✅ Created ${idCardBatches.length} ID card batches\n`);

        // NEW: Create Report Configurations
        console.log('📊 Creating report configurations...');
        const reportConfigs = await ReportConfig.create([
            {
                organization: 'default',
                hrMonth: {
                    startDay: 21,
                    endDay: 20,
                    isDefault: true,
                    label: 'HR Month'
                },
                workingDays: {
                    daysOfWeek: [0, 1, 2, 3, 4], // Sunday to Thursday
                    weekendDays: [5, 6] // Friday and Saturday
                },
                reportSettings: {
                    defaultRangeType: 'hr-month',
                    timezone: 'UTC',
                    includeWeekends: true,
                    includeHolidays: true
                },
                isActive: true
            }
        ]);
        console.log(`✅ Created ${reportConfigs.length} report configurations\n`);

        // NEW: Create Report Exports
        console.log('📤 Creating report exports...');
        const reportExports = await ReportExport.create([
            {
                reportType: 'attendance-summary',
                title: 'Monthly Attendance Report',
                subtitle: 'January 2025',
                exportFormat: 'excel',
                dateRange: {
                    rangeType: 'current-month',
                    startDate: new Date('2025-01-01'),
                    endDate: new Date('2025-01-31'),
                    label: 'January 2025'
                },
                generatedBy: users[0]._id,
                status: 'completed',
                processing: {
                    startedAt: new Date(Date.now() - 3600000),
                    completedAt: new Date(Date.now() - 3500000),
                    duration: 100000
                },
                settings: {
                    includeCharts: true,
                    includeRawData: true
                },
                organization: 'default'
            }
        ]);
        console.log(`✅ Created ${reportExports.length} report exports\n`);

        // NEW: Create Report Executions
        console.log('📈 Creating report executions...');
        const reportExecutions = await ReportExecution.create([
            {
                report: reports[0]._id,
                reportName: reports[0].name,
                executedBy: users[0]._id,
                executionType: 'manual',
                parameters: {
                    startDate: new Date('2025-01-01'),
                    endDate: new Date('2025-01-31')
                },
                status: 'completed',
                startTime: new Date(Date.now() - 7200000),
                endTime: new Date(Date.now() - 7100000),
                duration: 100000,
                resultCount: 50,
                exportFormat: 'excel',
                exportPath: './exports/attendance-report-2025-01.xlsx',
                exportSize: 1024000
            }
        ]);
        console.log(`✅ Created ${reportExecutions.length} report executions\n`);

        // NEW: Create Survey Notifications
        console.log('🔔 Creating survey notifications...');
        const surveyNotifications = await SurveyNotification.create([
            {
                survey: surveys[0]._id,
                notificationType: 'survey-assigned',
                message: {
                    subject: `New Survey: ${surveys[0].title}`,
                    body: 'You have been assigned a new survey. Please complete it by the due date.',
                    priority: 'normal'
                },
                recipients: [
                    { user: users[3]._id, sent: true, sentAt: new Date() },
                    { user: users[4]._id, sent: true, sentAt: new Date() }
                ],
                stats: {
                    totalRecipients: 2,
                    sentCount: 2
                },
                status: 'sent',
                sentAt: new Date()
            }
        ]);
        console.log(`✅ Created ${surveyNotifications.length} survey notifications\n`);

        // NEW: Create Security Audits
        console.log('🔒 Creating security audits...');
        const securityAudits = await SecurityAudit.create([
            {
                eventType: 'login-success',
                user: users[0]._id,
                username: users[0].username,
                userEmail: users[0].email,
                userRole: users[0].role,
                ipAddress: '192.168.1.100',
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                details: { method: 'password' },
                severity: 'info',
                success: true,
                timestamp: new Date()
            },
            {
                eventType: 'login-failed',
                ipAddress: '192.168.1.101',
                userAgent: 'Mozilla/5.0 (Unknown)',
                details: { reason: 'Invalid credentials' },
                severity: 'warning',
                success: false,
                timestamp: new Date()
            }
        ]);
        console.log(`✅ Created ${securityAudits.length} security audits\n`);

        // Update schools with deans
        console.log('🎓 Assigning deans to schools...');
        await School.findByIdAndUpdate(schools[0]._id, { dean: users[0]._id });
        await School.findByIdAndUpdate(schools[1]._id, { dean: users[4]._id });
        await School.findByIdAndUpdate(schools[2]._id, { dean: users[2]._id });
        console.log('✅ Deans assigned\n');

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
        console.log('  Email: admin@cic.edu.eg');
        console.log('  Password: admin123');
        console.log('  Role: admin\n');
        
        console.log('HR Manager:');
        console.log('  Email: hr@cic.edu.eg');
        console.log('  Password: hr123');
        console.log('  Role: hr\n');
        
        console.log('Department Manager:');
        console.log('  Email: manager@cic.edu.eg');
        console.log('  Password: manager123');
        console.log('  Role: manager\n');
        
        console.log('Employee:');
        console.log('  Email: john.doe@cic.edu.eg');
        console.log('  Password: employee123');
        console.log('  Role: employee\n');
        
        console.log('Supervisor:');
        console.log('  Email: omar.ibrahim@cic.edu.eg');
        console.log('  Password: employee123');
        console.log('  Role: supervisor\n');
        
        console.log('════════════════════════════════════════\n');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    }
};

seedData();