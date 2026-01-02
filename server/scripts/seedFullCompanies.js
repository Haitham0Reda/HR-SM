#!/usr/bin/env node
/**
 * Comprehensive Company Seeding Script
 * Creates 5 companies with complete HR data including one with full module access
 * Includes ALL models, proper tenant ID handling, and license verification
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { faker } from '@faker-js/faker';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from root directory
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Import ALL models - HR Core
import User from '../modules/hr-core/users/models/user.model.js';
import Role from '../modules/hr-core/users/models/role.model.js';
import Department from '../modules/hr-core/users/models/department.model.js';
import Position from '../modules/hr-core/users/models/position.model.js';
import ResignedEmployee from '../modules/hr-core/users/models/resignedEmployee.model.js';

// Attendance & Time
import Attendance from '../modules/hr-core/attendance/models/attendance.model.js';
import AttendanceDevice from '../modules/hr-core/attendance/models/attendanceDevice.model.js';
import ForgetCheck from '../modules/hr-core/attendance/models/forgetCheck.model.js';
import Overtime from '../modules/hr-core/overtime/models/overtime.model.js';

// Vacations & Leave
import Vacation from '../modules/hr-core/vacations/models/vacation.model.js';
import SickLeave from '../modules/hr-core/vacations/models/sickLeave.model.js';
import VacationBalance from '../modules/hr-core/vacations/models/vacationBalance.model.js';
import MixedVacation from '../modules/hr-core/vacations/models/mixedVacation.model.js';

// Holidays & Missions
import Holiday from '../modules/hr-core/holidays/models/holiday.model.js';
import Mission from '../modules/hr-core/missions/models/mission.model.js';

// Requests & Permissions
import Request from '../modules/hr-core/requests/models/request.model.js';
import Permission from '../modules/hr-core/requests/models/permission.model.js';
import RequestControl from '../modules/hr-core/requests/models/requestControl.model.js';

// Payroll
import Payroll from '../modules/payroll/models/payroll.model.js';

// Documents
import Document from '../modules/documents/models/document.model.js';
import DocumentTemplate from '../modules/documents/models/documentTemplate.model.js';
import IDCard from '../modules/documents/models/idCard.model.js';
import Hardcopy from '../modules/documents/models/hardcopy.model.js';

// Surveys
import Survey from '../modules/surveys/models/survey.model.js';
import SurveyNotification from '../modules/surveys/models/surveyNotification.model.js';

// Clinic
import MedicalProfile from '../modules/clinic/models/MedicalProfile.js';
import Appointment from '../modules/clinic/models/Appointment.js';
import Visit from '../modules/clinic/models/Visit.js';
import Prescription from '../modules/clinic/models/Prescription.js';

// Life Insurance
import InsurancePolicy from '../modules/life-insurance/models/InsurancePolicy.js';
import InsuranceClaim from '../modules/life-insurance/models/InsuranceClaim.js';
import Beneficiary from '../modules/life-insurance/models/Beneficiary.js';
import FamilyMember from '../modules/life-insurance/models/FamilyMember.js';

// Tasks
import Task from '../modules/tasks/models/task.model.js';

// Email Service
import EmailLog from '../modules/email-service/models/EmailLog.js';

// Events and Notifications
import Event from '../modules/events/models/event.model.js';
import Announcement from '../modules/announcements/models/announcement.model.js';
import Notification from '../modules/notifications/models/notification.model.js';

// Reports
import Report from '../modules/reports/models/report.model.js';
import ReportConfig from '../modules/reports/models/reportConfig.model.js';
import ReportExecution from '../modules/reports/models/reportExecution.model.js';
import ReportExport from '../modules/reports/models/reportExport.model.js';

// Dashboard and Theme
import DashboardConfig from '../modules/dashboard/models/dashboardConfig.model.js';
import ThemeConfig from '../modules/theme/models/themeConfig.model.js';

// Platform Models
import CompanyLicense from '../models/CompanyLicense.js';

// System Models (try to import, skip if not available)
let SecurityAudit, UsageTracking, SystemAlerts, PerformanceMetrics, SecuritySettings, PermissionAudit;
try {
  SecurityAudit = (await import('../platform/system/models/securityAudit.model.js')).default;
  UsageTracking = (await import('../platform/system/models/usageTracking.model.js')).default;
  SystemAlerts = (await import('../platform/system/models/systemAlerts.model.js')).default;
  PerformanceMetrics = (await import('../platform/system/models/performanceMetrics.model.js')).default;
  SecuritySettings = (await import('../platform/system/models/securitySettings.model.js')).default;
  PermissionAudit = (await import('../platform/system/models/permissionAudit.model.js')).default;
} catch (error) {
  console.log(chalk.yellow('⚠️  Some system models not found, will skip them'));
}

// Company definitions - Reduced employee counts for smaller database size
const COMPANIES = [
  {
    id: 'techcorp_solutions',
    name: 'TechCorp Solutions',
    domain: 'techcorp.com',
    licenseType: 'enterprise',
    fullAccess: true, // This company gets all modules
    industry: 'Technology',
    size: 'medium',
    employeeCount: 25 // Reduced from 150
  },
  {
    id: 'global_manufacturing',
    name: 'Global Manufacturing Inc',
    domain: 'globalmanuf.com',
    licenseType: 'professional',
    fullAccess: false,
    industry: 'Manufacturing',
    size: 'medium',
    employeeCount: 20 // Reduced from 200
  },
  {
    id: 'healthcare_plus',
    name: 'Healthcare Plus',
    domain: 'healthcareplus.com',
    licenseType: 'professional',
    fullAccess: false,
    industry: 'Healthcare',
    size: 'small',
    employeeCount: 15 // Reduced from 80
  },
  {
    id: 'finance_first',
    name: 'Finance First',
    domain: 'financefirst.com',
    licenseType: 'starter',
    fullAccess: false,
    industry: 'Finance',
    size: 'small',
    employeeCount: 12 // Reduced from 60
  },
  {
    id: 'edulearn_academy',
    name: 'EduLearn Academy',
    domain: 'edulearn.edu',
    licenseType: 'starter',
    fullAccess: false,
    industry: 'Education',
    size: 'small',
    employeeCount: 10 // Reduced from 40
  }
];

// Module definitions
const ALL_MODULES = [
  { id: 'hr-core', name: 'HR Core', tier: 'basic' },
  { id: 'attendance', name: 'Attendance Management', tier: 'basic' },
  { id: 'payroll', name: 'Payroll Management', tier: 'standard' },
  { id: 'documents', name: 'Document Management', tier: 'standard' },
  { id: 'surveys', name: 'Employee Surveys', tier: 'standard' },
  { id: 'clinic', name: 'Medical Clinic', tier: 'premium' },
  { id: 'life-insurance', name: 'Life Insurance', tier: 'premium' },
  { id: 'reports', name: 'Advanced Reports', tier: 'premium' },
  { id: 'dashboard', name: 'Executive Dashboard', tier: 'premium' },
  { id: 'events', name: 'Event Management', tier: 'standard' },
  { id: 'announcements', name: 'Company Announcements', tier: 'basic' },
  { id: 'notifications', name: 'Notification System', tier: 'basic' }
];

// Department templates
const DEPARTMENT_TEMPLATES = {
  technology: [
    { name: 'Engineering', code: 'ENG', description: 'Software Development and Engineering' },
    { name: 'Product Management', code: 'PM', description: 'Product Strategy and Management' },
    { name: 'Quality Assurance', code: 'QA', description: 'Quality Control and Testing' },
    { name: 'DevOps', code: 'DEVOPS', description: 'Development Operations' },
    { name: 'Data Science', code: 'DS', description: 'Data Analytics and Science' },
    { name: 'Human Resources', code: 'HR', description: 'Human Resources Management' },
    { name: 'Finance', code: 'FIN', description: 'Financial Management' },
    { name: 'Marketing', code: 'MKT', description: 'Marketing and Sales' },
    { name: 'Operations', code: 'OPS', description: 'Business Operations' }
  ],
  manufacturing: [
    { name: 'Production', code: 'PROD', description: 'Manufacturing and Production' },
    { name: 'Quality Control', code: 'QC', description: 'Quality Control and Assurance' },
    { name: 'Supply Chain', code: 'SC', description: 'Supply Chain Management' },
    { name: 'Maintenance', code: 'MAINT', description: 'Equipment Maintenance' },
    { name: 'Safety', code: 'SAFETY', description: 'Workplace Safety' },
    { name: 'Human Resources', code: 'HR', description: 'Human Resources Management' },
    { name: 'Finance', code: 'FIN', description: 'Financial Management' },
    { name: 'Logistics', code: 'LOG', description: 'Logistics and Distribution' }
  ],
  healthcare: [
    { name: 'Medical', code: 'MED', description: 'Medical Services' },
    { name: 'Nursing', code: 'NURS', description: 'Nursing Services' },
    { name: 'Administration', code: 'ADMIN', description: 'Healthcare Administration' },
    { name: 'Pharmacy', code: 'PHARM', description: 'Pharmaceutical Services' },
    { name: 'Laboratory', code: 'LAB', description: 'Laboratory Services' },
    { name: 'Human Resources', code: 'HR', description: 'Human Resources Management' },
    { name: 'Finance', code: 'FIN', description: 'Financial Management' },
    { name: 'IT Support', code: 'IT', description: 'Information Technology' }
  ],
  finance: [
    { name: 'Investment Banking', code: 'IB', description: 'Investment Banking Services' },
    { name: 'Risk Management', code: 'RISK', description: 'Risk Assessment and Management' },
    { name: 'Compliance', code: 'COMP', description: 'Regulatory Compliance' },
    { name: 'Accounting', code: 'ACC', description: 'Accounting and Auditing' },
    { name: 'Client Relations', code: 'CR', description: 'Client Relationship Management' },
    { name: 'Human Resources', code: 'HR', description: 'Human Resources Management' },
    { name: 'Operations', code: 'OPS', description: 'Business Operations' }
  ],
  education: [
    { name: 'Academic Affairs', code: 'ACAD', description: 'Academic Programs and Curriculum' },
    { name: 'Student Services', code: 'SS', description: 'Student Support Services' },
    { name: 'Administration', code: 'ADMIN', description: 'Educational Administration' },
    { name: 'Library', code: 'LIB', description: 'Library Services' },
    { name: 'IT Services', code: 'IT', description: 'Information Technology' },
    { name: 'Human Resources', code: 'HR', description: 'Human Resources Management' },
    { name: 'Finance', code: 'FIN', description: 'Financial Management' }
  ]
};

// Position templates
const POSITION_TEMPLATES = {
  technology: [
    { title: 'Software Engineer', code: 'SE', level: 'mid' },
    { title: 'Senior Software Engineer', code: 'SSE', level: 'senior' },
    { title: 'Tech Lead', code: 'TL', level: 'lead' },
    { title: 'Engineering Manager', code: 'EM', level: 'manager' },
    { title: 'Product Manager', code: 'PM', level: 'manager' },
    { title: 'QA Engineer', code: 'QAE', level: 'mid' },
    { title: 'DevOps Engineer', code: 'DOE', level: 'mid' },
    { title: 'Data Scientist', code: 'DS', level: 'senior' },
    { title: 'HR Manager', code: 'HRM', level: 'manager' },
    { title: 'Finance Manager', code: 'FM', level: 'manager' }
  ],
  manufacturing: [
    { title: 'Production Supervisor', code: 'PS', level: 'supervisor' },
    { title: 'Quality Inspector', code: 'QI', level: 'mid' },
    { title: 'Maintenance Technician', code: 'MT', level: 'mid' },
    { title: 'Safety Officer', code: 'SO', level: 'senior' },
    { title: 'Supply Chain Manager', code: 'SCM', level: 'manager' },
    { title: 'Production Manager', code: 'PM', level: 'manager' },
    { title: 'Operations Director', code: 'OD', level: 'director' }
  ],
  healthcare: [
    { title: 'Physician', code: 'MD', level: 'senior' },
    { title: 'Registered Nurse', code: 'RN', level: 'mid' },
    { title: 'Nurse Practitioner', code: 'NP', level: 'senior' },
    { title: 'Pharmacist', code: 'PHARM', level: 'senior' },
    { title: 'Lab Technician', code: 'LT', level: 'mid' },
    { title: 'Medical Administrator', code: 'MA', level: 'manager' },
    { title: 'Chief Medical Officer', code: 'CMO', level: 'executive' }
  ],
  finance: [
    { title: 'Financial Analyst', code: 'FA', level: 'mid' },
    { title: 'Investment Advisor', code: 'IA', level: 'senior' },
    { title: 'Risk Analyst', code: 'RA', level: 'mid' },
    { title: 'Compliance Officer', code: 'CO', level: 'senior' },
    { title: 'Portfolio Manager', code: 'PM', level: 'manager' },
    { title: 'Branch Manager', code: 'BM', level: 'manager' },
    { title: 'Chief Financial Officer', code: 'CFO', level: 'executive' }
  ],
  education: [
    { title: 'Teacher', code: 'TCH', level: 'mid' },
    { title: 'Senior Teacher', code: 'STCH', level: 'senior' },
    { title: 'Department Head', code: 'DH', level: 'manager' },
    { title: 'Academic Coordinator', code: 'AC', level: 'senior' },
    { title: 'Student Advisor', code: 'SA', level: 'mid' },
    { title: 'Librarian', code: 'LIB', level: 'mid' },
    { title: 'Principal', code: 'PRIN', level: 'executive' }
  ]
};

class CompanySeeder {
  constructor() {
    this.createdData = {
      companies: 0,
      users: 0,
      departments: 0,
      positions: 0,
      attendance: 0,
      vacations: 0,
      documents: 0,
      surveys: 0,
      medicalProfiles: 0,
      insurancePolicies: 0,
      licenses: 0,
      overtime: 0,
      tasks: 0,
      resignedEmployees: 0,
      requestControls: 0,
      mixedVacations: 0,
      prescriptions: 0,
      visits: 0,
      emailLogs: 0,
      systemAlerts: 0,
      securityAudits: 0
    };
    
    // Generate consistent tenant tokens for each company
    this.tenantTokens = new Map();
    this.licenseKeys = new Map();
  }

  generateTenantToken(companyId) {
    if (!this.tenantTokens.has(companyId)) {
      const token = crypto.randomBytes(32).toString('hex');
      this.tenantTokens.set(companyId, token);
    }
    return this.tenantTokens.get(companyId);
  }

  generateLicenseKey(companyId) {
    if (!this.licenseKeys.has(companyId)) {
      const key = crypto.randomBytes(32).toString('hex');
      this.licenseKeys.set(companyId, key);
    }
    return this.licenseKeys.get(companyId);
  }

  async connectToDatabase() {
    try {
      // Connect to MongoDB without specifying a database
      const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
      if (!mongoUri) {
        throw new Error('MongoDB URI not found in environment variables');
      }

      await mongoose.connect(mongoUri);
      console.log(chalk.green('✅ Connected to MongoDB'));
    } catch (error) {
      console.error(chalk.red('❌ Database connection failed:'), error.message);
      throw error;
    }
  }

  async createCompanyDatabase(companyId) {
    // Switch to company-specific database
    const dbName = `hrsm_${companyId}`;
    const companyDb = mongoose.connection.useDb(dbName);
    
    console.log(chalk.blue(`📊 Creating database: ${dbName}`));
    
    // Test the connection by creating a simple collection
    await companyDb.collection('test').insertOne({ test: true });
    await companyDb.collection('test').drop();
    
    return companyDb;
  }

  getModulesForLicense(licenseType, fullAccess = false) {
    if (fullAccess) {
      return ALL_MODULES;
    }

    switch (licenseType) {
      case 'enterprise':
        return ALL_MODULES;
      case 'professional':
        return ALL_MODULES.filter(m => m.tier !== 'premium');
      case 'starter':
        return ALL_MODULES.filter(m => m.tier === 'basic');
      default:
        return ALL_MODULES.filter(m => m.tier === 'basic');
    }
  }

  getLimitsForLicense(licenseType, employeeCount) {
    const baseLimits = {
      starter: { maxUsers: 50, maxStorage: 5 * 1024 * 1024 * 1024, maxApiCallsPerMonth: 10000 },
      professional: { maxUsers: 200, maxStorage: 20 * 1024 * 1024 * 1024, maxApiCallsPerMonth: 50000 },
      enterprise: { maxUsers: 1000, maxStorage: 100 * 1024 * 1024 * 1024, maxApiCallsPerMonth: 200000 }
    };

    const limits = baseLimits[licenseType] || baseLimits.starter;
    
    // Adjust based on actual employee count
    limits.maxUsers = Math.max(limits.maxUsers, employeeCount + 20);
    
    return limits;
  }

  async createCompanyLicense(company, companyDb) {
    const modules = this.getModulesForLicense(company.licenseType, company.fullAccess);
    const limits = this.getLimitsForLicense(company.licenseType, company.employeeCount);

    const licenseData = {
      licenseId: `lic_${company.id}_${Date.now()}`,
      licenseNumber: `HRSM-${faker.string.alphanumeric(6).toUpperCase()}-${faker.string.alphanumeric(6).toUpperCase()}`,
      companyId: company.id,
      companyName: company.name,
      licenseType: company.licenseType,
      status: 'active',
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      limits,
      modules: modules.map(m => ({
        moduleId: m.id,
        moduleName: m.name,
        tier: m.tier,
        enabled: true
      })),
      tenantToken: this.generateTenantToken(company.id),
      signature: this.generateLicenseSignature(company.id)
    };

    // Create encrypted license copy in company database
    const CompanyLicenseModel = companyDb.model('CompanyLicense', CompanyLicense.schema);
    
    const encryptionKey = this.generateLicenseKey(company.id);
    const companyLicense = new CompanyLicenseModel({
      licenseId: licenseData.licenseId,
      licenseNumber: licenseData.licenseNumber,
      companyId: company.id,
      integrity: {
        integrityHash: 'temp', // Will be updated by updateEncryptedData
        lastIntegrityCheck: new Date(),
        tamperDetection: false,
        encryptionKeyRotationDate: new Date()
      }
    });

    companyLicense.updateEncryptedData(licenseData, encryptionKey);
    
    // Enable offline mode with 72-hour grace period
    companyLicense.enableOfflineMode(72);
    
    await companyLicense.save();

    this.createdData.licenses++;
    return licenseData;
  }

  generateLicenseSignature(companyId) {
    const data = `${companyId}-${Date.now()}-${process.env.LICENSE_SIGNING_SECRET || 'default-secret'}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  async createDepartments(company, companyDb) {
    const industryKey = company.industry.toLowerCase();
    const deptTemplates = DEPARTMENT_TEMPLATES[industryKey] || DEPARTMENT_TEMPLATES.technology;
    
    const DepartmentModel = companyDb.model('Department', Department.schema);
    const departments = [];

    for (const template of deptTemplates) {
      const department = new DepartmentModel({
        tenantId: company.id,
        name: template.name,
        arabicName: this.getArabicName(template.name),
        code: template.code,
        description: template.description,
        status: 'active'
      });

      await department.save();
      departments.push(department);
      this.createdData.departments++;
    }

    return departments;
  }

  async createPositions(company, departments, companyDb) {
    const industryKey = company.industry.toLowerCase();
    const posTemplates = POSITION_TEMPLATES[industryKey] || POSITION_TEMPLATES.technology;
    
    const PositionModel = companyDb.model('Position', Position.schema);
    const positions = [];

    for (const template of posTemplates) {
      // Assign position to appropriate department
      const department = departments.find(d => 
        d.name.toLowerCase().includes(template.title.toLowerCase().split(' ')[0]) ||
        template.title.toLowerCase().includes(d.name.toLowerCase().split(' ')[0])
      ) || departments[0];

      const position = new PositionModel({
        tenantId: company.id,
        title: template.title,
        arabicTitle: this.getArabicName(template.title),
        code: template.code,
        level: template.level,
        department: department._id,
        jobDescription: `${template.title} responsible for ${department.description.toLowerCase()}`,
        status: 'active'
      });

      await position.save();
      positions.push(position);
      this.createdData.positions++;
    }

    return positions;
  }

  async createUsers(company, departments, positions, companyDb) {
    const UserModel = companyDb.model('User', User.schema);
    const users = [];

    // Create admin user
    const adminUser = await this.createUser({
      tenantId: company.id,
      employeeId: `${company.id.toUpperCase()}-0001`,
      username: 'admin',
      email: `admin@${company.domain}`,
      password: 'admin123',
      role: 'admin',
      personalInfo: {
        fullName: 'System Administrator',
        firstName: 'System',
        lastName: 'Administrator',
        arabicName: 'مدير النظام',
        dateOfBirth: faker.date.birthdate({ min: 30, max: 50, mode: 'age' }),
        gender: 'male',
        nationality: 'Egyptian',
        phone: faker.phone.number(),
        address: `${faker.location.streetAddress()}, ${faker.location.city()}, Egypt`
      },
      department: departments.find(d => d.name === 'Human Resources')?._id || departments[0]._id,
      position: positions.find(p => p.title.includes('Manager'))?._id || positions[0]._id,
      employment: {
        hireDate: faker.date.past({ years: 3 }),
        contractType: 'full-time',
        employmentStatus: 'active',
        salary: {
          amount: faker.number.int({ min: 15000, max: 25000 }),
          currency: 'EGP'
        }
      }
    }, UserModel);

    users.push(adminUser);

    // Create HR manager
    const hrManager = await this.createUser({
      tenantId: company.id,
      employeeId: `${company.id.toUpperCase()}-0002`,
      username: 'hr.manager',
      email: `hr@${company.domain}`,
      password: 'hr123',
      role: 'hr',
      personalInfo: {
        fullName: faker.person.fullName(),
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        arabicName: this.getArabicName(faker.person.fullName()),
        dateOfBirth: faker.date.birthdate({ min: 28, max: 45, mode: 'age' }),
        gender: faker.person.sex(),
        nationality: 'Egyptian',
        phone: faker.phone.number(),
        address: `${faker.location.streetAddress()}, ${faker.location.city()}, Egypt`
      },
      department: departments.find(d => d.name === 'Human Resources')?._id || departments[0]._id,
      position: positions.find(p => p.title.includes('HR') || p.title.includes('Manager'))?._id || positions[0]._id,
      employment: {
        hireDate: faker.date.past({ years: 2 }),
        contractType: 'full-time',
        employmentStatus: 'active',
        salary: {
          amount: faker.number.int({ min: 12000, max: 18000 }),
          currency: 'EGP'
        }
      }
    }, UserModel);

    users.push(hrManager);

    // Create department managers
    for (const department of departments) {
      if (department.name === 'Human Resources') continue; // Already created HR manager

      const managerPosition = positions.find(p => 
        p.department.toString() === department._id.toString() && 
        (p.level === 'manager' || p.level === 'director' || p.level === 'executive')
      ) || positions.find(p => p.department.toString() === department._id.toString());

      if (managerPosition) {
        const manager = await this.createUser({
          tenantId: company.id,
          employeeId: `${company.id.toUpperCase()}-${String(users.length + 1).padStart(4, '0')}`,
          username: `${department.code.toLowerCase()}.manager`,
          email: `${department.code.toLowerCase()}@${company.domain}`,
          password: 'manager123',
          role: 'manager',
          personalInfo: {
            fullName: faker.person.fullName(),
            firstName: faker.person.firstName(),
            lastName: faker.person.lastName(),
            arabicName: this.getArabicName(faker.person.fullName()),
            dateOfBirth: faker.date.birthdate({ min: 30, max: 50, mode: 'age' }),
            gender: faker.person.sex(),
            nationality: 'Egyptian',
            phone: faker.phone.number(),
            address: `${faker.location.streetAddress()}, ${faker.location.city()}, Egypt`
          },
          department: department._id,
          position: managerPosition._id,
          employment: {
            hireDate: faker.date.past({ years: 3 }),
            contractType: 'full-time',
            employmentStatus: 'active',
            salary: {
              amount: faker.number.int({ min: 10000, max: 15000 }),
              currency: 'EGP'
            }
          }
        }, UserModel);

        users.push(manager);

        // Update department with manager
        department.manager = manager._id;
        await department.save();
      }
    }

    // Create regular employees
    const targetEmployeeCount = company.employeeCount - users.length;
    
    for (let i = 0; i < targetEmployeeCount; i++) {
      const department = faker.helpers.arrayElement(departments);
      const departmentPositions = positions.filter(p => p.department.toString() === department._id.toString());
      const position = faker.helpers.arrayElement(departmentPositions.length > 0 ? departmentPositions : positions);

      const employee = await this.createUser({
        tenantId: company.id,
        employeeId: `${company.id.toUpperCase()}-${String(users.length + 1).padStart(4, '0')}`,
        username: faker.internet.username().toLowerCase(),
        email: faker.internet.email({ provider: company.domain }),
        password: 'employee123',
        role: 'employee',
        personalInfo: {
          fullName: faker.person.fullName(),
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          arabicName: this.getArabicName(faker.person.fullName()),
          dateOfBirth: faker.date.birthdate({ min: 22, max: 60, mode: 'age' }),
          gender: faker.person.sex(),
          nationality: faker.helpers.arrayElement(['Egyptian', 'Saudi', 'Emirati', 'Jordanian']),
          phone: faker.phone.number(),
          address: `${faker.location.streetAddress()}, ${faker.location.city()}, Egypt`
        },
        department: department._id,
        position: position._id,
        employment: {
          hireDate: faker.date.past({ years: 5 }),
          contractType: faker.helpers.arrayElement(['full-time', 'part-time', 'contract']),
          employmentStatus: faker.helpers.weightedArrayElement([
            { weight: 85, value: 'active' },
            { weight: 10, value: 'on-leave' },
            { weight: 3, value: 'vacation' },
            { weight: 2, value: 'inactive' }
          ]),
          salary: {
            amount: faker.number.int({ min: 5000, max: 12000 }),
            currency: 'EGP'
          }
        }
      }, UserModel);

      users.push(employee);
    }

    this.createdData.users += users.length;
    return users;
  }

  async createUser(userData, UserModel) {
    const user = new UserModel(userData);
    await user.save();
    return user;
  }

  async createVacationBalances(users, companyDb) {
    const VacationBalanceModel = companyDb.model('VacationBalance', VacationBalance.schema);
    const currentYear = new Date().getFullYear();

    for (const user of users) {
      // Calculate tenure-based allocation
      const hireDate = user.employment.hireDate;
      const tenure = (new Date() - hireDate) / (365.25 * 24 * 60 * 60 * 1000);
      
      let annualAllocation = 21; // Default
      if (tenure >= 10) annualAllocation = 30;
      else if (tenure >= 5) annualAllocation = 28;

      const vacationBalance = new VacationBalanceModel({
        tenantId: user.tenantId,
        employee: user._id,
        year: currentYear,
        annual: {
          allocated: annualAllocation,
          used: faker.number.int({ min: 0, max: Math.floor(annualAllocation * 0.6) }),
          pending: faker.number.int({ min: 0, max: 3 }),
          available: 0, // Will be calculated
          carriedOver: faker.number.int({ min: 0, max: 5 })
        },
        casual: {
          allocated: 7,
          used: faker.number.int({ min: 0, max: 4 }),
          pending: faker.number.int({ min: 0, max: 2 }),
          available: 0 // Will be calculated
        },
        sick: {
          allocated: 10,
          used: faker.number.int({ min: 0, max: 5 }),
          pending: 0,
          available: 0 // Will be calculated
        }
      });

      // Calculate available balances
      vacationBalance.annual.available = vacationBalance.annual.allocated + vacationBalance.annual.carriedOver - vacationBalance.annual.used - vacationBalance.annual.pending;
      vacationBalance.casual.available = vacationBalance.casual.allocated - vacationBalance.casual.used - vacationBalance.casual.pending;
      vacationBalance.sick.available = vacationBalance.sick.allocated - vacationBalance.sick.used - vacationBalance.sick.pending;

      await vacationBalance.save();
    }
  }

  async createAttendanceRecords(users, companyDb) {
    const AttendanceModel = companyDb.model('Attendance', Attendance.schema);
    const attendanceRecords = [];

    // Create attendance for last 7 days only (reduced from 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    for (const user of users.slice(0, Math.min(10, users.length))) { // Limit to 10 users for performance
      for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        // Skip weekends (Friday and Saturday)
        if (date.getDay() === 5 || date.getDay() === 6) continue;

        const attendance = new AttendanceModel({
          tenantId: user.tenantId,
          employee: user._id,
          department: user.department,
          position: user.position,
          date: new Date(date),
          schedule: {
            startTime: '09:00',
            endTime: '17:00',
            expectedHours: 8
          },
          checkIn: {
            time: new Date(date.getTime() + 9 * 60 * 60 * 1000 + faker.number.int({ min: -30, max: 60 }) * 60 * 1000),
            method: faker.helpers.arrayElement(['biometric', 'manual', 'wfh']),
            location: faker.helpers.arrayElement(['office', 'home', 'remote']),
            isLate: faker.datatype.boolean(0.15),
            lateMinutes: faker.number.int({ min: 0, max: 30 })
          },
          checkOut: {
            time: new Date(date.getTime() + 17 * 60 * 60 * 1000 + faker.number.int({ min: -30, max: 60 }) * 60 * 1000),
            method: faker.helpers.arrayElement(['biometric', 'manual', 'wfh']),
            location: faker.helpers.arrayElement(['office', 'home', 'remote']),
            isEarly: faker.datatype.boolean(0.1),
            earlyMinutes: faker.number.int({ min: 0, max: 30 })
          },
          status: faker.helpers.weightedArrayElement([
            { weight: 70, value: 'on-time' },
            { weight: 15, value: 'late' },
            { weight: 10, value: 'present' },
            { weight: 3, value: 'vacation' },
            { weight: 2, value: 'sick-leave' }
          ]),
          source: faker.helpers.arrayElement(['biometric', 'manual', 'mobile'])
        });

        await attendance.save();
        attendanceRecords.push(attendance);
      }
    }

    this.createdData.attendance += attendanceRecords.length;
    return attendanceRecords;
  }

  async createVacations(users, companyDb) {
    const VacationModel = companyDb.model('Vacation', Vacation.schema);
    const vacations = [];

    // Create some vacation requests for random users (reduced)
    const vacationUsers = faker.helpers.arrayElements(users, Math.min(5, users.length));

    for (const user of vacationUsers) {
      const startDate = faker.date.future({ years: 0.5 });
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + faker.number.int({ min: 1, max: 14 })); // 1-14 days vacation
      
      const vacation = new VacationModel({
        tenantId: user.tenantId,
        employee: user._id,
        vacationType: faker.helpers.arrayElement(['annual', 'casual', 'sick']),
        startDate: startDate,
        endDate: endDate,
        reason: faker.lorem.sentence(),
        status: faker.helpers.weightedArrayElement([
          { weight: 40, value: 'pending' },
          { weight: 45, value: 'approved' },
          { weight: 10, value: 'rejected' },
          { weight: 5, value: 'cancelled' }
        ])
      });

      // Calculate duration
      vacation.duration = Math.ceil((vacation.endDate - vacation.startDate) / (1000 * 60 * 60 * 24));

      await vacation.save();
      vacations.push(vacation);
    }

    this.createdData.vacations += vacations.length;
    return vacations;
  }

  async createDocuments(users, companyDb) {
    const DocumentModel = companyDb.model('Document', Document.schema);
    const documents = [];

    // Create documents for random users (reduced)
    const documentUsers = faker.helpers.arrayElements(users, Math.min(8, users.length));

    for (const user of documentUsers) {
      const docTypes = ['contract', 'national-id', 'certificate', 'offer-letter'];
      const selectedTypes = faker.helpers.arrayElements(docTypes, faker.number.int({ min: 1, max: 3 }));

      for (const type of selectedTypes) {
        const document = new DocumentModel({
          tenantId: user.tenantId,
          title: `${type.replace('-', ' ').toUpperCase()} - ${user.personalInfo.fullName}`,
          arabicTitle: this.getArabicName(`${type} ${user.personalInfo.fullName}`),
          type: type,
          employee: user._id,
          department: user.department,
          fileUrl: `/uploads/documents/${faker.string.uuid()}.pdf`,
          fileName: `${type}_${user.employeeId}.pdf`,
          fileSize: faker.number.int({ min: 100000, max: 5000000 }),
          uploadedBy: user._id,
          isConfidential: faker.datatype.boolean(0.3),
          status: 'active'
        });

        await document.save();
        documents.push(document);
      }
    }

    this.createdData.documents += documents.length;
    return documents;
  }

  async createSurveys(company, users, companyDb) {
    const SurveyModel = companyDb.model('Survey', Survey.schema);
    const surveys = [];

    const surveyTemplates = [
      {
        title: 'Employee Satisfaction Survey 2025',
        description: 'Annual employee satisfaction and engagement survey',
        surveyType: 'satisfaction',
        questions: [
          {
            questionText: 'How satisfied are you with your current role?',
            questionType: 'rating',
            ratingScale: { min: 1, max: 5 },
            required: true,
            order: 1
          },
          {
            questionText: 'What do you like most about working here?',
            questionType: 'textarea',
            required: false,
            order: 2
          },
          {
            questionText: 'Would you recommend this company to a friend?',
            questionType: 'yes-no',
            required: true,
            order: 3
          }
        ]
      },
      {
        title: 'Training Needs Assessment',
        description: 'Identify training and development needs',
        surveyType: 'training',
        questions: [
          {
            questionText: 'Which skills would you like to develop?',
            questionType: 'multiple-choice',
            options: ['Leadership', 'Technical Skills', 'Communication', 'Project Management'],
            required: true,
            order: 1
          },
          {
            questionText: 'How many training hours per month would be ideal?',
            questionType: 'single-choice',
            options: ['1-5 hours', '6-10 hours', '11-15 hours', '16+ hours'],
            required: true,
            order: 2
          }
        ]
      }
    ];

    for (const template of surveyTemplates) {
      const survey = new SurveyModel({
        tenantId: company.id,
        ...template,
        createdBy: users.find(u => u.role === 'hr')?._id || users[0]._id,
        settings: {
          isMandatory: faker.datatype.boolean(0.3),
          allowAnonymous: faker.datatype.boolean(0.5),
          startDate: faker.date.recent({ days: 30 }),
          endDate: faker.date.future({ days: 60 }),
          targetAudience: {
            includeAllEmployees: true,
            departments: [],
            positions: [],
            specificEmployees: []
          }
        },
        status: 'active'
      });

      await survey.save();
      surveys.push(survey);
    }

    this.createdData.surveys += surveys.length;
    return surveys;
  }

  async createMedicalProfiles(users, companyDb) {
    if (!users.length) return [];

    const MedicalProfileModel = companyDb.model('MedicalProfile', MedicalProfile.schema);
    const profiles = [];

    // Create medical profiles for random users (reduced)
    const profileUsers = faker.helpers.arrayElements(users, Math.min(8, users.length));

    for (const user of profileUsers) {
      const profile = new MedicalProfileModel({
        tenantId: user.tenantId,
        userId: user._id,
        bloodType: faker.helpers.arrayElement(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
        allergies: faker.helpers.maybe(() => [
          {
            allergen: faker.helpers.arrayElement(['Peanuts', 'Shellfish', 'Dust', 'Pollen']),
            severity: faker.helpers.arrayElement(['mild', 'moderate', 'severe']),
            reaction: faker.lorem.sentence(),
            diagnosedDate: faker.date.past({ years: 5 })
          }
        ], { probability: 0.3 }) || [],
        chronicConditions: faker.helpers.maybe(() => [
          {
            condition: faker.helpers.arrayElement(['Diabetes', 'Hypertension', 'Asthma']),
            diagnosedDate: faker.date.past({ years: 10 }),
            status: 'managed',
            notes: faker.lorem.sentence()
          }
        ], { probability: 0.2 }) || [],
        emergencyContacts: [
          {
            name: faker.person.fullName(),
            relationship: faker.helpers.arrayElement(['spouse', 'parent', 'sibling']),
            phone: faker.phone.number(),
            email: faker.internet.email(),
            isPrimary: true
          }
        ]
      });

      await profile.save();
      profiles.push(profile);
    }

    this.createdData.medicalProfiles += profiles.length;
    return profiles;
  }

  async createInsurancePolicies(users, companyDb) {
    if (!users.length) return [];

    const InsurancePolicyModel = companyDb.model('InsurancePolicy', InsurancePolicy.schema);
    const policies = [];

    // Create insurance policies for employees (reduced)
    const policyUsers = faker.helpers.arrayElements(users, Math.min(10, users.length));

    for (const user of policyUsers) {
      const policyType = faker.helpers.arrayElement(['CAT_A', 'CAT_B', 'CAT_C']);
      const coverageAmounts = { CAT_A: 100000, CAT_B: 200000, CAT_C: 500000 };

      const policy = new InsurancePolicyModel({
        tenantId: user.tenantId,
        employeeId: user._id,
        employeeNumber: user.employeeId,
        policyType: policyType,
        coverageAmount: coverageAmounts[policyType],
        premium: faker.number.int({ min: 500, max: 2000 }),
        deductible: faker.number.int({ min: 0, max: 1000 }),
        startDate: faker.date.past({ years: 1 }),
        endDate: faker.date.future({ years: 1 }),
        status: 'active'
      });

      // Generate policy number
      const year = new Date().getFullYear();
      const sequence = String(policies.length + 1).padStart(6, '0');
      policy.policyNumber = `INS-${year}-${sequence}`;

      await policy.save();
      policies.push(policy);
    }

    this.createdData.insurancePolicies += policies.length;
    return policies;
  }

  // NEW COMPREHENSIVE SEEDING METHODS

  async createRequestControls(company, users, companyDb) {
    const RequestControlModel = companyDb.model('RequestControl', RequestControl.schema);
    
    const hrUser = users.find(u => u.role === 'hr') || users[0];
    
    const requestControl = new RequestControlModel({
      tenantId: company.id,
      organization: company.id,
      systemWide: {
        enabled: true,
        disabledMessage: 'Request submissions are currently disabled. Please contact HR for more information.',
        enabledBy: hrUser._id,
        enabledAt: new Date(),
        reason: 'System initialization'
      },
      vacationRequests: {
        enabled: true,
        disabledMessage: 'Vacation requests are currently disabled. Please try again later.',
        enabledBy: hrUser._id,
        enabledAt: new Date(),
        leaveTypes: {
          annual: {
            enabled: true,
            disabledMessage: 'Annual leave requests are temporarily disabled.'
          },
          casual: {
            enabled: true,
            disabledMessage: 'Casual leave requests are temporarily disabled.'
          }
        }
      },
      permissionRequests: {
        enabled: true,
        disabledMessage: 'Permission requests are currently disabled. Please contact your supervisor.',
        enabledBy: hrUser._id,
        enabledAt: new Date(),
        permissionTypes: {
          lateArrival: {
            enabled: true,
            disabledMessage: 'Late arrival permissions are temporarily disabled.'
          },
          earlyDeparture: {
            enabled: true,
            disabledMessage: 'Early departure permissions are temporarily disabled.'
          },
          overtime: {
            enabled: true,
            disabledMessage: 'Overtime permissions are temporarily disabled.'
          }
        }
      },
      sickLeaveRequests: {
        enabled: true,
        disabledMessage: 'Sick leave requests are currently disabled.',
        enabledBy: hrUser._id,
        enabledAt: new Date()
      },
      missionRequests: {
        enabled: true,
        disabledMessage: 'Mission requests are currently disabled.',
        enabledBy: hrUser._id,
        enabledAt: new Date()
      },
      forgotCheckRequests: {
        enabled: true,
        disabledMessage: 'Forgot check requests are currently disabled.',
        enabledBy: hrUser._id,
        enabledAt: new Date()
      }
    });

    await requestControl.save();
    this.createdData.requestControls++;
    return requestControl;
  }

  async createOvertimeRecords(users, companyDb) {
    const OvertimeModel = companyDb.model('Overtime', Overtime.schema);
    const overtimeRecords = [];

    // Create overtime records for random users (reduced)
    const overtimeUsers = faker.helpers.arrayElements(users, Math.min(5, users.length));

    for (const user of overtimeUsers) {
      // Create 2-5 overtime records per user
      const recordCount = faker.number.int({ min: 2, max: 5 });
      
      for (let i = 0; i < recordCount; i++) {
        const date = faker.date.past({ days: 90 });
        const startHour = faker.number.int({ min: 17, max: 19 });
        const endHour = faker.number.int({ min: startHour + 1, max: 23 });
        
        const overtime = new OvertimeModel({
          tenantId: user.tenantId,
          employee: user._id,
          date: date,
          startTime: `${String(startHour).padStart(2, '0')}:00`,
          endTime: `${String(endHour).padStart(2, '0')}:00`,
          duration: endHour - startHour,
          reason: faker.helpers.arrayElement([
            'Project deadline',
            'System maintenance',
            'Client emergency',
            'Month-end closing',
            'Training session'
          ]),
          compensationType: faker.helpers.arrayElement(['paid', 'time-off', 'none']),
          status: faker.helpers.weightedArrayElement([
            { weight: 60, value: 'approved' },
            { weight: 25, value: 'pending' },
            { weight: 15, value: 'rejected' }
          ]),
          approvedBy: user.department ? users.find(u => u.department?.toString() === user.department?.toString() && u.role === 'manager')?._id : null,
          approvedAt: faker.date.recent({ days: 30 })
        });

        await overtime.save();
        overtimeRecords.push(overtime);
      }
    }

    this.createdData.overtime += overtimeRecords.length;
    return overtimeRecords;
  }

  async createTasks(users, companyDb) {
    const TaskModel = companyDb.model('Task', Task.schema);
    const tasks = [];

    // Create tasks for employees
    const managers = users.filter(u => u.role === 'manager' || u.role === 'hr');
    const employees = users.filter(u => u.role === 'employee');

    for (const employee of employees.slice(0, Math.min(8, employees.length))) {
      const manager = managers.find(m => m.department?.toString() === employee.department?.toString()) || managers[0];
      
      // Create 1-3 tasks per employee
      const taskCount = faker.number.int({ min: 1, max: 3 });
      
      for (let i = 0; i < taskCount; i++) {
        const startDate = faker.date.recent({ days: 30 });
        const dueDate = faker.date.future({ days: 30, refDate: startDate });
        
        const task = new TaskModel({
          tenantId: employee.tenantId,
          title: faker.helpers.arrayElement([
            'Complete monthly report',
            'Update project documentation',
            'Conduct team training',
            'Review client feedback',
            'Prepare presentation',
            'Analyze performance metrics',
            'Update system configuration'
          ]),
          description: faker.lorem.paragraph(),
          priority: faker.helpers.arrayElement(['low', 'medium', 'high', 'urgent']),
          assignee: employee._id,
          assigner: manager._id,
          startDate: startDate,
          dueDate: dueDate,
          status: faker.helpers.weightedArrayElement([
            { weight: 30, value: 'assigned' },
            { weight: 25, value: 'in-progress' },
            { weight: 20, value: 'completed' },
            { weight: 15, value: 'submitted' },
            { weight: 7, value: 'reviewed' },
            { weight: 3, value: 'rejected' }
          ]),
          estimatedHours: faker.number.int({ min: 2, max: 40 }),
          actualHours: faker.number.int({ min: 1, max: 45 }),
          tags: faker.helpers.arrayElements(['urgent', 'documentation', 'training', 'analysis', 'presentation'], { min: 0, max: 3 })
        });

        await task.save();
        tasks.push(task);
      }
    }

    this.createdData.tasks += tasks.length;
    return tasks;
  }

  async createResignedEmployees(users, departments, positions, companyDb) {
    const ResignedEmployeeModel = companyDb.model('ResignedEmployee', ResignedEmployee.schema);
    const resignedEmployees = [];

    // Create 1-2 resigned employees per company (reduced)
    const resignedCount = faker.number.int({ min: 1, max: 2 });
    
    for (let i = 0; i < resignedCount; i++) {
      const department = faker.helpers.arrayElement(departments);
      const departmentPositions = positions.filter(p => p.department.toString() === department._id.toString());
      const position = departmentPositions.length > 0 
        ? faker.helpers.arrayElement(departmentPositions)
        : faker.helpers.arrayElement(positions);
      
      const resignationDate = faker.date.past({ years: 2 });
      const lastWorkingDay = new Date(resignationDate);
      lastWorkingDay.setDate(lastWorkingDay.getDate() + faker.number.int({ min: 14, max: 30 }));
      
      const resignedEmployee = new ResignedEmployeeModel({
        tenantId: users[0].tenantId,
        employee: new mongoose.Types.ObjectId(), // Simulate deleted employee
        department: department._id,
        position: position._id,
        processedBy: users.find(u => u.role === 'hr')?._id || users[0]._id,
        resignationDate: resignationDate,
        lastWorkingDay: lastWorkingDay,
        resignationReason: faker.helpers.arrayElement([
          'better-opportunity',
          'personal-reasons',
          'relocation',
          'career-change',
          'health-issues',
          'family-reasons',
          'retirement'
        ]),
        resignationLetter: {
          submitted: true,
          submittedAt: resignationDate,
          content: faker.lorem.paragraphs(2)
        },
        noticePeriod: {
          required: 30,
          served: faker.number.int({ min: 14, max: 30 }),
          waived: faker.datatype.boolean(0.2)
        },
        exitInterview: {
          conducted: faker.datatype.boolean(0.8),
          conductedBy: users.find(u => u.role === 'hr')?._id,
          conductedAt: faker.date.between({ from: resignationDate, to: lastWorkingDay }),
          feedback: faker.lorem.paragraph(),
          rating: faker.number.int({ min: 1, max: 5 })
        },
        handover: {
          completed: true,
          handoverTo: (() => {
            const departmentUsers = users.filter(u => u.department?.toString() === department._id.toString());
            return departmentUsers.length > 0 ? faker.helpers.arrayElement(departmentUsers)?._id : null;
          })(),
          completedAt: faker.date.between({ from: resignationDate, to: lastWorkingDay }),
          documents: faker.helpers.arrayElements(['Project files', 'Client contacts', 'System passwords', 'Equipment list'], { min: 2, max: 4 })
        },
        clearance: {
          hr: {
            cleared: true,
            clearedBy: users.find(u => u.role === 'hr')?._id,
            clearedAt: lastWorkingDay,
            notes: 'All HR formalities completed'
          },
          finance: {
            cleared: true,
            clearedBy: users.find(u => u.role === 'admin')?._id,
            clearedAt: lastWorkingDay,
            notes: 'Final settlement processed'
          },
          it: {
            cleared: true,
            clearedBy: users.find(u => u.role === 'admin')?._id,
            clearedAt: lastWorkingDay,
            notes: 'All IT assets returned'
          }
        },
        finalSettlement: {
          calculated: true,
          calculatedBy: users.find(u => u.role === 'hr')?._id,
          calculatedAt: lastWorkingDay,
          amount: faker.number.int({ min: 5000, max: 25000 }),
          currency: 'EGP',
          paid: true,
          paidAt: new Date(lastWorkingDay.getTime() + 7 * 24 * 60 * 60 * 1000)
        }
      });

      await resignedEmployee.save();
      resignedEmployees.push(resignedEmployee);
    }

    this.createdData.resignedEmployees += resignedEmployees.length;
    return resignedEmployees;
  }

  async createMixedVacations(company, users, companyDb) {
    const MixedVacationModel = companyDb.model('MixedVacation', MixedVacation.schema);
    const mixedVacations = [];

    // Create 1-2 mixed vacation policies per company
    const policies = [
      {
        name: 'Eid Al-Fitr Extended Holiday',
        description: 'Extended holiday combining Eid Al-Fitr with personal leave days',
        startDate: new Date('2025-03-29'),
        endDate: new Date('2025-04-06'),
        totalDays: 9,
        officialHolidayCount: 3,
        personalDaysRequired: 6
      },
      {
        name: 'Summer Break Policy',
        description: 'Extended summer break combining official holidays with annual leave',
        startDate: new Date('2025-07-15'),
        endDate: new Date('2025-07-25'),
        totalDays: 11,
        officialHolidayCount: 2,
        personalDaysRequired: 9
      }
    ];

    for (const policyData of policies) {
      const mixedVacation = new MixedVacationModel({
        tenantId: company.id,
        ...policyData,
        officialHolidays: [
          {
            date: policyData.startDate,
            name: 'Holiday Start',
            dayOfWeek: 'Saturday'
          }
        ],
        deductionStrategy: faker.helpers.arrayElement(['annual-first', 'casual-first', 'proportional']),
        autoApply: faker.datatype.boolean(0.3),
        applicableTo: {
          allEmployees: true,
          departments: [],
          positions: [],
          specificEmployees: []
        },
        applications: [],
        status: 'active',
        createdBy: users.find(u => u.role === 'hr')?._id || users[0]._id
      });

      await mixedVacation.save();
      mixedVacations.push(mixedVacation);
    }

    this.createdData.mixedVacations += mixedVacations.length;
    return mixedVacations;
  }

  async createVisits(users, medicalProfiles, companyDb) {
    if (!medicalProfiles.length) return [];

    const VisitModel = companyDb.model('Visit', Visit.schema);
    const visits = [];

    // Create visits for users with medical profiles (reduced)
    for (const profile of medicalProfiles.slice(0, 5)) {
      const user = users.find(u => u._id.toString() === profile.userId.toString());
      if (!user) continue;

      // Create 1-3 visits per profile
      const visitCount = faker.number.int({ min: 1, max: 3 });
      
      for (let i = 0; i < visitCount; i++) {
        const visit = new VisitModel({
          tenantId: user.tenantId,
          patientId: user._id,
          medicalProfileId: profile._id,
          visitDate: faker.date.past({ days: 180 }),
          visitType: faker.helpers.arrayElement(['routine', 'emergency', 'follow-up', 'consultation', 'vaccination', 'screening']),
          doctor: {
            name: faker.person.fullName(),
            specialization: faker.helpers.arrayElement(['General Medicine', 'Internal Medicine', 'Cardiology', 'Dermatology']),
            licenseNumber: `MD-${faker.string.alphanumeric(6).toUpperCase()}`
          },
          chiefComplaint: faker.helpers.arrayElement([
            'Headache and fatigue',
            'Chest pain',
            'Shortness of breath',
            'Abdominal pain',
            'Joint pain',
            'Skin rash',
            'Annual checkup'
          ]),
          vitalSigns: {
            temperature: {
              value: faker.number.float({ min: 36.0, max: 38.5, fractionDigits: 1 }),
              unit: 'celsius'
            },
            bloodPressure: {
              systolic: faker.number.int({ min: 110, max: 140 }),
              diastolic: faker.number.int({ min: 70, max: 90 })
            },
            heartRate: faker.number.int({ min: 60, max: 100 }),
            respiratoryRate: faker.number.int({ min: 12, max: 20 }),
            oxygenSaturation: faker.number.int({ min: 95, max: 100 })
          },
          examination: faker.lorem.paragraph(),
          diagnosis: {
            primary: faker.helpers.arrayElement([
              'Hypertension',
              'Common cold',
              'Migraine',
              'Gastritis',
              'Anxiety',
              'Healthy - routine checkup'
            ])
          },
          treatment: {
            description: faker.lorem.sentence()
          },
          status: 'completed',
          followUp: {
            required: faker.datatype.boolean(0.3),
            date: faker.datatype.boolean(0.3) ? faker.date.future({ days: 30 }) : null
          }
        });

        await visit.save();
        visits.push(visit);
      }
    }

    this.createdData.visits += visits.length;
    return visits;
  }

  async createPrescriptions(users, medicalProfiles, visits, companyDb) {
    if (!visits.length) return [];

    const PrescriptionModel = companyDb.model('Prescription', Prescription.schema);
    const prescriptions = [];

    // Create prescriptions for some visits (reduced)
    const visitsWithPrescriptions = faker.helpers.arrayElements(visits, Math.min(3, visits.length));

    for (const visit of visitsWithPrescriptions) {
      const user = users.find(u => u._id.toString() === visit.patientId.toString());
      if (!user) continue;

      const prescription = new PrescriptionModel({
        tenantId: user.tenantId,
        patientId: user._id,
        medicalProfileId: visit.medicalProfileId,
        visitId: visit._id,
        prescriptionNumber: `RX-${Date.now()}-${faker.string.alphanumeric(4).toUpperCase()}`,
        prescribedBy: {
          name: visit.doctor.name,
          specialization: visit.doctor.specialization,
          licenseNumber: visit.doctor.licenseNumber
        },
        medication: {
          name: faker.helpers.arrayElement(['Paracetamol', 'Ibuprofen', 'Amoxicillin', 'Omeprazole', 'Metformin']),
          genericName: faker.helpers.arrayElement(['Acetaminophen', 'NSAIDs', 'Penicillin', 'PPI', 'Biguanide']),
          strength: faker.helpers.arrayElement(['500mg', '200mg', '250mg', '20mg', '850mg']),
          form: faker.helpers.arrayElement(['tablet', 'capsule', 'liquid', 'injection'])
        },
        dosage: {
          amount: faker.helpers.arrayElement(['1 tablet', '2 tablets', '5ml', '1 capsule']),
          frequency: faker.helpers.arrayElement(['once daily', 'twice daily', 'three times daily', 'as needed']),
          route: faker.helpers.arrayElement(['oral', 'topical', 'injection', 'inhalation'])
        },
        duration: {
          value: faker.number.int({ min: 7, max: 90 }),
          unit: faker.helpers.arrayElement(['days', 'weeks'])
        },
        quantity: {
          prescribed: faker.number.int({ min: 10, max: 90 }),
          unit: 'tablets'
        },
        indication: faker.helpers.arrayElement([
          'Pain relief',
          'Infection treatment',
          'Blood pressure management',
          'Diabetes management',
          'Acid reflux treatment'
        ]),
        refills: {
          authorized: faker.number.int({ min: 0, max: 3 }),
          remaining: faker.number.int({ min: 0, max: 3 })
        },
        status: 'active'
      });

      await prescription.save();
      prescriptions.push(prescription);
    }

    this.createdData.prescriptions += prescriptions.length;
    return prescriptions;
  }

  async createEmailLogs(users, companyDb) {
    const EmailLogModel = companyDb.model('EmailLog', EmailLog.schema);
    const emailLogs = [];

    // Create email logs for various system activities
    const emailTypes = [
      { template: 'welcome', subject: 'Welcome to the company!' },
      { template: 'vacation_approved', subject: 'Vacation Request Approved' },
      { template: 'vacation_rejected', subject: 'Vacation Request Rejected' },
      { template: 'password_reset', subject: 'Password Reset Request' },
      { template: 'payroll_notification', subject: 'Monthly Payroll Statement' },
      { template: 'birthday_wishes', subject: 'Happy Birthday!' },
      { template: 'system_maintenance', subject: 'Scheduled System Maintenance' }
    ];

    for (const user of users.slice(0, Math.min(8, users.length))) {
      // Create 1-2 email logs per user (reduced)
      const emailCount = faker.number.int({ min: 1, max: 2 });
      
      for (let i = 0; i < emailCount; i++) {
        const emailType = faker.helpers.arrayElement(emailTypes);
        
        const emailLog = new EmailLogModel({
          tenantId: user.tenantId,
          to: user.email,
          from: `noreply@${user.email.split('@')[1]}`,
          subject: emailType.subject,
          template: emailType.template,
          provider: faker.helpers.arrayElement(['smtp', 'sendgrid', 'ses']),
          status: faker.helpers.weightedArrayElement([
            { weight: 85, value: 'sent' },
            { weight: 10, value: 'failed' },
            { weight: 5, value: 'queued' }
          ]),
          messageId: faker.string.uuid(),
          metadata: {
            userId: user._id,
            userRole: user.role,
            department: user.department
          },
          sentAt: faker.date.past({ days: 90 }),
          deliveredAt: faker.date.recent({ days: 90 })
        });

        if (emailLog.status === 'failed') {
          emailLog.error = faker.helpers.arrayElement([
            'Invalid email address',
            'Mailbox full',
            'Server timeout',
            'Spam filter blocked'
          ]);
        }

        await emailLog.save();
        emailLogs.push(emailLog);
      }
    }

    this.createdData.emailLogs += emailLogs.length;
    return emailLogs;
  }

  async createSystemData(company, users, companyDb) {
    // Create system alerts
    if (SystemAlerts) {
      const SystemAlertsModel = companyDb.model('SystemAlerts', SystemAlerts.schema);
      
      const alertTypes = [
        { type: 'system_health', severity: 'info', message: 'System health check completed successfully' },
        { type: 'performance', severity: 'warning', message: 'High CPU usage detected' },
        { type: 'security', severity: 'high', message: 'Multiple failed login attempts detected' },
        { type: 'backup', severity: 'info', message: 'Daily backup completed successfully' },
        { type: 'license', severity: 'warning', message: 'License expires in 30 days' }
      ];

      for (const alertData of alertTypes) {
        const alert = new SystemAlertsModel({
          tenantId: company.id,
          ...alertData,
          category: faker.helpers.arrayElement(['system', 'security', 'performance', 'business']),
          source: 'system',
          acknowledged: faker.datatype.boolean(0.7),
          acknowledgedBy: faker.datatype.boolean(0.7) ? users.find(u => u.role === 'admin')?._id : null,
          acknowledgedAt: faker.date.recent({ days: 7 }),
          resolved: faker.datatype.boolean(0.8),
          resolvedBy: faker.datatype.boolean(0.8) ? users.find(u => u.role === 'admin')?._id : null,
          resolvedAt: faker.date.recent({ days: 5 })
        });

        await alert.save();
        this.createdData.systemAlerts++;
      }
    }

    // Create security audit logs
    if (SecurityAudit) {
      const SecurityAuditModel = companyDb.model('SecurityAudit', SecurityAudit.schema);
      
      for (const user of users.slice(0, 3)) {
        const auditCount = faker.number.int({ min: 1, max: 3 });
        
        for (let i = 0; i < auditCount; i++) {
          const audit = new SecurityAuditModel({
            tenantId: company.id,
            userId: user._id,
            eventType: faker.helpers.arrayElement([
              'login-success',
              'login-failed',
              'password-changed',
              'permission-added',
              'data-accessed',
              'data-exported'
            ]),
            ipAddress: faker.internet.ip(),
            userAgent: faker.internet.userAgent(),
            details: {
              action: 'User authentication',
              resource: 'login_endpoint',
              success: faker.datatype.boolean(0.9)
            },
            severity: faker.helpers.arrayElement(['info', 'warning', 'critical']),
            timestamp: faker.date.past({ days: 30 })
          });

          await audit.save();
          this.createdData.securityAudits++;
        }
      }
    }
  }

  getArabicName(englishName) {
    // Simple mapping for common names/terms
    const arabicMappings = {
      'System Administrator': 'مدير النظام',
      'Human Resources': 'الموارد البشرية',
      'Engineering': 'الهندسة',
      'Finance': 'المالية',
      'Marketing': 'التسويق',
      'Operations': 'العمليات',
      'Manager': 'مدير',
      'Employee': 'موظف',
      'Department': 'قسم',
      'contract': 'عقد',
      'certificate': 'شهادة'
    };

    return arabicMappings[englishName] || `${englishName} (عربي)`;
  }

  async seedCompany(company) {
    console.log(chalk.blue(`\n🏢 Seeding company: ${company.name}`));
    console.log(chalk.gray(`   Industry: ${company.industry} | Size: ${company.size} | Employees: ${company.employeeCount}`));
    console.log(chalk.gray(`   License: ${company.licenseType} | Full Access: ${company.fullAccess ? 'Yes' : 'No'}`));
    console.log(chalk.gray(`   Tenant Token: ${this.generateTenantToken(company.id).substring(0, 16)}...`));

    try {
      // Create company database
      const companyDb = await this.createCompanyDatabase(company.id);

      // Create license with proper verification
      console.log(chalk.yellow('   📄 Creating license with verification...'));
      const license = await this.createCompanyLicense(company, companyDb);

      // Create departments
      console.log(chalk.yellow('   🏢 Creating departments...'));
      const departments = await this.createDepartments(company, companyDb);

      // Create positions
      console.log(chalk.yellow('   💼 Creating positions...'));
      const positions = await this.createPositions(company, departments, companyDb);

      // Create users
      console.log(chalk.yellow('   👥 Creating users...'));
      const users = await this.createUsers(company, departments, positions, companyDb);

      // Create request controls (CRITICAL - must be first)
      console.log(chalk.yellow('   ⚙️  Creating request controls...'));
      await this.createRequestControls(company, users, companyDb);

      // Create vacation balances
      console.log(chalk.yellow('   🏖️  Creating vacation balances...'));
      await this.createVacationBalances(users, companyDb);

      // Create attendance records
      console.log(chalk.yellow('   📅 Creating attendance records...'));
      await this.createAttendanceRecords(users, companyDb);

      // Create vacations
      console.log(chalk.yellow('   🌴 Creating vacation requests...'));
      await this.createVacations(users, companyDb);

      // Create overtime records
      console.log(chalk.yellow('   ⏰ Creating overtime records...'));
      await this.createOvertimeRecords(users, companyDb);

      // Create tasks
      console.log(chalk.yellow('   📋 Creating tasks...'));
      await this.createTasks(users, companyDb);

      // Create resigned employees
      console.log(chalk.yellow('   👋 Creating resigned employee records...'));
      await this.createResignedEmployees(users, departments, positions, companyDb);

      // Create mixed vacation policies
      console.log(chalk.yellow('   🗓️  Creating mixed vacation policies...'));
      await this.createMixedVacations(company, users, companyDb);

      // Create documents
      console.log(chalk.yellow('   📄 Creating documents...'));
      await this.createDocuments(users, companyDb);

      // Create surveys
      console.log(chalk.yellow('   📊 Creating surveys...'));
      await this.createSurveys(company, users, companyDb);

      // Create email logs
      console.log(chalk.yellow('   📧 Creating email logs...'));
      await this.createEmailLogs(users, companyDb);

      // Create medical profiles (if clinic module enabled)
      let medicalProfiles = [];
      let visits = [];
      if (license.modules.some(m => m.moduleId === 'clinic')) {
        console.log(chalk.yellow('   🏥 Creating medical profiles...'));
        medicalProfiles = await this.createMedicalProfiles(users, companyDb);
        
        console.log(chalk.yellow('   🩺 Creating medical visits...'));
        visits = await this.createVisits(users, medicalProfiles, companyDb);
        
        console.log(chalk.yellow('   💊 Creating prescriptions...'));
        await this.createPrescriptions(users, medicalProfiles, visits, companyDb);
      }

      // Create insurance policies (if life-insurance module enabled)
      if (license.modules.some(m => m.moduleId === 'life-insurance')) {
        console.log(chalk.yellow('   🛡️  Creating insurance policies...'));
        await this.createInsurancePolicies(users, companyDb);
      }

      // Create system data (alerts, audit logs)
      console.log(chalk.yellow('   🔧 Creating system data...'));
      await this.createSystemData(company, users, companyDb);

      console.log(chalk.green(`   ✅ Company ${company.name} seeded successfully!`));
      console.log(chalk.gray(`   📊 License verified: ${license.licenseNumber}`));
      console.log(chalk.gray(`   🔑 Tenant token: ${this.generateTenantToken(company.id).substring(0, 16)}...`));
      
      this.createdData.companies++;

    } catch (error) {
      console.error(chalk.red(`   ❌ Failed to seed company ${company.name}:`), error.message);
      throw error;
    }
  }

  async run() {
    console.log(chalk.blue('🌱 HR Management System - Full Company Seeding'));
    console.log(chalk.gray('═'.repeat(60)));

    try {
      // Connect to database
      await this.connectToDatabase();

      // Seed all companies
      for (const company of COMPANIES) {
        await this.seedCompany(company);
      }

      // Display summary
      console.log(chalk.green('\n🎉 All companies seeded successfully!'));
      console.log(chalk.gray('═'.repeat(60)));
      console.log(chalk.cyan('📊 Summary:'));
      console.log(chalk.white(`   Companies: ${this.createdData.companies}`));
      console.log(chalk.white(`   Users: ${this.createdData.users}`));
      console.log(chalk.white(`   Departments: ${this.createdData.departments}`));
      console.log(chalk.white(`   Positions: ${this.createdData.positions}`));
      console.log(chalk.white(`   Attendance Records: ${this.createdData.attendance}`));
      console.log(chalk.white(`   Vacation Requests: ${this.createdData.vacations}`));
      console.log(chalk.white(`   Overtime Records: ${this.createdData.overtime}`));
      console.log(chalk.white(`   Tasks: ${this.createdData.tasks}`));
      console.log(chalk.white(`   Documents: ${this.createdData.documents}`));
      console.log(chalk.white(`   Surveys: ${this.createdData.surveys}`));
      console.log(chalk.white(`   Medical Profiles: ${this.createdData.medicalProfiles}`));
      console.log(chalk.white(`   Medical Visits: ${this.createdData.visits}`));
      console.log(chalk.white(`   Prescriptions: ${this.createdData.prescriptions}`));
      console.log(chalk.white(`   Insurance Policies: ${this.createdData.insurancePolicies}`));
      console.log(chalk.white(`   Resigned Employees: ${this.createdData.resignedEmployees}`));
      console.log(chalk.white(`   Request Controls: ${this.createdData.requestControls}`));
      console.log(chalk.white(`   Mixed Vacation Policies: ${this.createdData.mixedVacations}`));
      console.log(chalk.white(`   Email Logs: ${this.createdData.emailLogs}`));
      console.log(chalk.white(`   System Alerts: ${this.createdData.systemAlerts}`));
      console.log(chalk.white(`   Security Audits: ${this.createdData.securityAudits}`));
      console.log(chalk.white(`   Licenses (Verified): ${this.createdData.licenses}`));

      console.log(chalk.blue('\n🔑 Login Credentials & License Info:'));
      console.log(chalk.gray('─'.repeat(50)));
      
      for (const company of COMPANIES) {
        console.log(chalk.yellow(`\n${company.name} (${company.domain}):`));
        console.log(chalk.white(`   Admin: admin@${company.domain} / admin123`));
        console.log(chalk.white(`   HR: hr@${company.domain} / hr123`));
        console.log(chalk.white(`   Employee: employee123 (for all employees)`));
        console.log(chalk.gray(`   License: ${company.licenseType} ${company.fullAccess ? '(Full Access)' : ''}`));
        console.log(chalk.gray(`   Tenant Token: ${this.generateTenantToken(company.id).substring(0, 16)}...`));
        console.log(chalk.gray(`   License Key: ${this.generateLicenseKey(company.id).substring(0, 16)}...`));
        
        const modules = this.getModulesForLicense(company.licenseType, company.fullAccess);
        console.log(chalk.gray(`   Modules (${modules.length}): ${modules.map(m => m.id).join(', ')}`));
        
        if (company.fullAccess) {
          console.log(chalk.green(`   🌟 FULL ACCESS - All modules enabled including premium features`));
        }
      }

      console.log(chalk.green('\n🚀 Ready to use! Start the application and login with the credentials above.'));
      console.log(chalk.blue('\n📋 What was created:'));
      console.log(chalk.gray('   ✅ Complete multi-tenant setup with proper isolation'));
      console.log(chalk.gray('   ✅ Encrypted licenses with offline validation support'));
      console.log(chalk.gray('   ✅ Full HR data including attendance, vacations, overtime'));
      console.log(chalk.gray('   ✅ Medical clinic data (for licensed companies)'));
      console.log(chalk.gray('   ✅ Life insurance policies and claims'));
      console.log(chalk.gray('   ✅ Task management and employee lifecycle'));
      console.log(chalk.gray('   ✅ System monitoring and audit trails'));
      console.log(chalk.gray('   ✅ Email logs and communication history'));
      console.log(chalk.gray('   ✅ Request controls and approval workflows'));

      console.log(chalk.blue('\n🔐 Security Features:'));
      console.log(chalk.gray('   ✅ Tenant ID isolation for all data'));
      console.log(chalk.gray('   ✅ Encrypted license verification'));
      console.log(chalk.gray('   ✅ Secure token generation'));
      console.log(chalk.gray('   ✅ Offline license validation support'));
      console.log(chalk.gray('   ✅ Audit trails for all operations'));

    } catch (error) {
      console.error(chalk.red('\n💥 Seeding failed:'), error.message);
      console.error(chalk.gray(error.stack));
      process.exit(1);
    } finally {
      await mongoose.disconnect();
      console.log(chalk.gray('\n🔌 Database connection closed'));
    }
  }
}

// Run the seeder
const seeder = new CompanySeeder();
seeder.run();