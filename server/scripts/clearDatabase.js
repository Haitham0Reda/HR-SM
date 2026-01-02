#!/usr/bin/env node
/**
 * Database Cleanup Script
 * Deletes all data from the HR Management System database
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from root directory
dotenv.config({ path: path.join(__dirname, '../../.env') });
import connectDB from '../config/database.js';

// HR Core Models
import User from '../modules/hr-core/users/models/user.model.js';
import Department from '../modules/hr-core/users/models/department.model.js';
import Position from '../modules/hr-core/users/models/position.model.js';
import Role from '../modules/hr-core/users/models/role.model.js';

// Attendance Models
import Attendance from '../modules/hr-core/attendance/models/attendance.model.js';
import ForgetCheck from '../modules/hr-core/attendance/models/forgetCheck.model.js';

// Holiday Models
import Holiday from '../modules/hr-core/holidays/models/holiday.model.js';

// Vacation Models
import Vacation from '../modules/hr-core/vacations/models/vacation.model.js';
import SickLeave from '../modules/hr-core/vacations/models/sickLeave.model.js';
import MixedVacation from '../modules/hr-core/vacations/models/mixedVacation.model.js';
import VacationBalance from '../modules/hr-core/vacations/models/vacationBalance.model.js';

// Mission Models
import Mission from '../modules/hr-core/missions/models/mission.model.js';

// Request Models
import Request from '../modules/hr-core/requests/models/request.model.js';
import Permission from '../modules/hr-core/requests/models/permission.model.js';
import RequestControl from '../modules/hr-core/requests/models/requestControl.model.js';

// Document Models
import Document from '../modules/documents/models/document.model.js';
import DocumentTemplate from '../modules/documents/models/documentTemplate.model.js';
import Hardcopy from '../modules/documents/models/hardcopy.model.js';

// Event Models
import Event from '../modules/events/models/event.model.js';

// Announcement Models
import Announcement from '../modules/announcements/models/announcement.model.js';

// Notification Models
import Notification from '../modules/notifications/models/notification.model.js';

// Payroll Models
import Payroll from '../modules/payroll/models/payroll.model.js';

// Report Models
import Report from '../modules/reports/models/report.model.js';
import ReportConfig from '../modules/reports/models/reportConfig.model.js';
import ReportExecution from '../modules/reports/models/reportExecution.model.js';
import ReportExport from '../modules/reports/models/reportExport.model.js';

// Survey Models
import Survey from '../modules/surveys/models/survey.model.js';
import SurveyNotification from '../modules/surveys/models/surveyNotification.model.js';

// Dashboard Models
import DashboardConfig from '../modules/dashboard/models/dashboardConfig.model.js';

// Theme Models
import ThemeConfig from '../modules/theme/models/themeConfig.model.js';

// Platform Models
import Company from '../platform/models/Company.js';
import PlatformUser from '../platform/models/PlatformUser.js';
import Tenant from '../platform/tenants/models/Tenant.js';

// Platform System Models
import License from '../platform/system/models/license.model.js';
import LicenseAudit from '../platform/system/models/licenseAudit.model.js';
import UsageTracking from '../platform/system/models/usageTracking.model.js';
import SecurityAudit from '../platform/system/models/securityAudit.model.js';
import SecuritySettings from '../platform/system/models/securitySettings.model.js';
import PermissionAudit from '../platform/system/models/permissionAudit.model.js';

// Additional Platform Models (if they exist)
let Permissions;
try {
    const permissionsModule = await import('../platform/system/models/permissions.model.js');
    Permissions = permissionsModule.default;
} catch (error) {
    console.log(chalk.yellow('⚠️  Permissions model not found, skipping...'));
}

const clearDatabase = async () => {
    try {
        console.log(chalk.blue('🔌 Connecting to database...'));
        await connectDB();
        console.log(chalk.green('✅ Database connected'));

        console.log(chalk.red('\n🗑️  CLEARING ALL DATABASE DATA...'));
        console.log(chalk.yellow('⚠️  This action cannot be undone!\n'));

        // Get counts before deletion for reporting
        const counts = {};
        
        // Core HR Models
        counts.users = await User.countDocuments();
        counts.departments = await Department.countDocuments();
        counts.positions = await Position.countDocuments();
        counts.roles = await Role.countDocuments();
        
        // Attendance
        counts.attendance = await Attendance.countDocuments();
        counts.forgetChecks = await ForgetCheck.countDocuments();
        
        // Holidays
        counts.holidays = await Holiday.countDocuments();
        
        // Vacations
        counts.vacations = await Vacation.countDocuments();
        counts.sickLeaves = await SickLeave.countDocuments();
        counts.mixedVacations = await MixedVacation.countDocuments();
        counts.vacationBalances = await VacationBalance.countDocuments();
        
        // Missions
        counts.missions = await Mission.countDocuments();
        
        // Requests
        counts.requests = await Request.countDocuments();
        counts.permissions = await Permission.countDocuments();
        counts.requestControls = await RequestControl.countDocuments();
        
        // Documents
        counts.documents = await Document.countDocuments();
        counts.documentTemplates = await DocumentTemplate.countDocuments();
        counts.hardcopies = await Hardcopy.countDocuments();
        
        // Events
        counts.events = await Event.countDocuments();
        
        // Announcements
        counts.announcements = await Announcement.countDocuments();
        
        // Notifications
        counts.notifications = await Notification.countDocuments();
        
        // Payroll
        counts.payrolls = await Payroll.countDocuments();
        
        // Reports
        counts.reports = await Report.countDocuments();
        counts.reportConfigs = await ReportConfig.countDocuments();
        counts.reportExecutions = await ReportExecution.countDocuments();
        counts.reportExports = await ReportExport.countDocuments();
        
        // Surveys
        counts.surveys = await Survey.countDocuments();
        counts.surveyNotifications = await SurveyNotification.countDocuments();
        
        // Dashboard
        counts.dashboardConfigs = await DashboardConfig.countDocuments();
        
        // Theme
        counts.themeConfigs = await ThemeConfig.countDocuments();
        
        // Platform models
        counts.companies = await Company.countDocuments();
        counts.platformUsers = await PlatformUser.countDocuments();
        counts.tenants = await Tenant.countDocuments();
        counts.licenses = await License.countDocuments();
        counts.licenseAudits = await LicenseAudit.countDocuments();
        counts.usageTracking = await UsageTracking.countDocuments();
        counts.securityAudits = await SecurityAudit.countDocuments();
        counts.securitySettings = await SecuritySettings.countDocuments();
        counts.permissionAudits = await PermissionAudit.countDocuments();
        if (Permissions) counts.permissions = await Permissions.countDocuments();

        // Calculate total records
        const totalRecords = Object.values(counts).reduce((sum, count) => sum + count, 0);
        
        console.log(chalk.cyan('📊 Current database statistics:'));
        console.log(chalk.gray('─'.repeat(40)));
        
        // Display counts in organized groups
        console.log(chalk.blue('\n👥 Users & Organization:'));
        console.log(`   Users: ${counts.users}`);
        console.log(`   Departments: ${counts.departments}`);
        console.log(`   Positions: ${counts.positions}`);
        console.log(`   Roles: ${counts.roles}`);
        
        console.log(chalk.blue('\n📅 Attendance & Time:'));
        console.log(`   Attendance Records: ${counts.attendance}`);
        console.log(`   Forget Checks: ${counts.forgetChecks}`);
        console.log(`   Holidays: ${counts.holidays}`);
        
        console.log(chalk.blue('\n🏖️  Leave Management:'));
        console.log(`   Vacations: ${counts.vacations}`);
        console.log(`   Sick Leaves: ${counts.sickLeaves}`);
        console.log(`   Mixed Vacations: ${counts.mixedVacations}`);
        console.log(`   Vacation Balances: ${counts.vacationBalances}`);
        console.log(`   Missions: ${counts.missions}`);
        
        console.log(chalk.blue('\n📋 Requests & Permissions:'));
        console.log(`   Requests: ${counts.requests}`);
        console.log(`   Permissions: ${counts.permissions}`);
        console.log(`   Request Controls: ${counts.requestControls}`);
        
        console.log(chalk.blue('\n📄 Documents & Communication:'));
        console.log(`   Documents: ${counts.documents}`);
        console.log(`   Document Templates: ${counts.documentTemplates}`);
        console.log(`   Hardcopies: ${counts.hardcopies}`);
        console.log(`   Events: ${counts.events}`);
        console.log(`   Announcements: ${counts.announcements}`);
        console.log(`   Notifications: ${counts.notifications}`);
        
        console.log(chalk.blue('\n💰 Payroll & Reports:'));
        console.log(`   Payrolls: ${counts.payrolls}`);
        console.log(`   Reports: ${counts.reports}`);
        console.log(`   Report Configs: ${counts.reportConfigs}`);
        console.log(`   Report Executions: ${counts.reportExecutions}`);
        console.log(`   Report Exports: ${counts.reportExports}`);
        
        console.log(chalk.blue('\n📊 Surveys & Configuration:'));
        console.log(`   Surveys: ${counts.surveys}`);
        console.log(`   Survey Notifications: ${counts.surveyNotifications}`);
        console.log(`   Dashboard Configs: ${counts.dashboardConfigs}`);
        console.log(`   Theme Configs: ${counts.themeConfigs}`);
        
        if (Tenant || License || PlatformUser || Company) {
            console.log(chalk.blue('\n🏢 Platform Management:'));
            console.log(`   Companies: ${counts.companies}`);
            console.log(`   Platform Users: ${counts.platformUsers}`);
            console.log(`   Tenants: ${counts.tenants}`);
            console.log(`   Licenses: ${counts.licenses}`);
            console.log(`   License Audits: ${counts.licenseAudits}`);
            console.log(`   Usage Tracking: ${counts.usageTracking}`);
            console.log(`   Security Audits: ${counts.securityAudits}`);
            console.log(`   Security Settings: ${counts.securitySettings}`);
            console.log(`   Permission Audits: ${counts.permissionAudits}`);
            if (Permissions) console.log(`   Permissions: ${counts.permissions}`);
        }
        
        console.log(chalk.gray('\n─'.repeat(40)));
        console.log(chalk.bold(`📊 Total Records: ${totalRecords}`));
        
        if (totalRecords === 0) {
            console.log(chalk.yellow('\n✨ Database is already empty!'));
            process.exit(0);
        }

        console.log(chalk.red('\n🚨 PROCEEDING WITH DATA DELETION...'));
        
        // Delete all data
        console.log(chalk.yellow('\n🗑️  Deleting data...'));
        
        // Core HR Models
        await User.deleteMany({});
        await Department.deleteMany({});
        await Position.deleteMany({});
        await Role.deleteMany({});
        
        // Attendance
        await Attendance.deleteMany({});
        await ForgetCheck.deleteMany({});
        
        // Holidays
        await Holiday.deleteMany({});
        
        // Vacations
        await Vacation.deleteMany({});
        await SickLeave.deleteMany({});
        await MixedVacation.deleteMany({});
        await VacationBalance.deleteMany({});
        
        // Missions
        await Mission.deleteMany({});
        
        // Requests
        await Request.deleteMany({});
        await Permission.deleteMany({});
        await RequestControl.deleteMany({});
        
        // Documents
        await Document.deleteMany({});
        await DocumentTemplate.deleteMany({});
        await Hardcopy.deleteMany({});
        
        // Events
        await Event.deleteMany({});
        
        // Announcements
        await Announcement.deleteMany({});
        
        // Notifications
        await Notification.deleteMany({});
        
        // Payroll
        await Payroll.deleteMany({});
        
        // Reports
        await Report.deleteMany({});
        await ReportConfig.deleteMany({});
        await ReportExecution.deleteMany({});
        await ReportExport.deleteMany({});
        
        // Surveys
        await Survey.deleteMany({});
        await SurveyNotification.deleteMany({});
        
        // Dashboard
        await DashboardConfig.deleteMany({});
        
        // Theme
        await ThemeConfig.deleteMany({});
        
        // Platform models
        await Company.deleteMany({});
        await PlatformUser.deleteMany({});
        await Tenant.deleteMany({});
        await License.deleteMany({});
        await LicenseAudit.deleteMany({});
        await UsageTracking.deleteMany({});
        await SecurityAudit.deleteMany({});
        await SecuritySettings.deleteMany({});
        await PermissionAudit.deleteMany({});
        if (Permissions) await Permissions.deleteMany({});

        console.log(chalk.green('\n✅ ALL DATA SUCCESSFULLY DELETED!'));
        console.log(chalk.gray(`📊 Removed ${totalRecords} total records`));
        
        console.log(chalk.blue('\n💡 Next steps:'));
        console.log('   • Run seed script to populate with test data: npm run seed');
        console.log('   • Or start fresh with your own data');
        
        console.log(chalk.green('\n🎉 Database cleanup completed successfully!'));
        
        process.exit(0);
    } catch (error) {
        console.error(chalk.red('\n❌ Error clearing database:'), error.message);
        console.error(chalk.gray(error.stack));
        process.exit(1);
    }
};

// Run the cleanup
clearDatabase();