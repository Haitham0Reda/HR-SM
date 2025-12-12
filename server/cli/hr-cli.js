#!/usr/bin/env node
/**
 * HR System CLI Tool
 * Uses commander for CLI framework and chalk for styling
 */
import { Command } from 'commander';
import chalk from 'chalk';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import User from '../modules/hr-core/users/models/user.model.js';
import Department from '../modules/hr-core/users/models/department.model.js';
import Attendance from '../modules/hr-core/attendance/models/attendance.model.js';
import Vacation from '../modules/hr-core/vacations/models/vacation.model.js';
import Mission from '../modules/hr-core/missions/models/mission.model.js';
import SickLeave from '../modules/hr-core/vacations/models/sickLeave.model.js';

const program = new Command();

// Connect to database
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log(chalk.green('✓ Connected to database'));
    } catch (error) {
        console.error(chalk.red('✗ Database connection failed:'), error.message);
        process.exit(1);
    }
};

// Disconnect from database
const disconnectDB = async () => {
    await mongoose.disconnect();
    console.log(chalk.gray('Database disconnected'));
};

program
    .name('hr-cli')
    .description(chalk.blue('HR Management System CLI Tool'))
    .version('1.0.0');

// User commands
program
    .command('users:list')
    .description('List all users')
    .option('-r, --role <role>', 'Filter by role')
    .option('-l, --limit <number>', 'Limit results', '10')
    .action(async (options) => {
        await connectDB();
        
        const query = options.role ? { role: options.role } : {};
        const users = await User.find(query)
            .limit(parseInt(options.limit))
            .select('firstName lastName email role status');
        
        console.log(chalk.yellow(`\nFound ${users.length} users:\n`));
        users.forEach(user => {
            const status = user.status === 'active' 
                ? chalk.green('●') 
                : chalk.red('●');
            console.log(`${status} ${chalk.bold(user.firstName + ' ' + user.lastName)} - ${user.email} (${chalk.cyan(user.role)})`);
        });
        
        await disconnectDB();
    });

program
    .command('users:create')
    .description('Create a new user')
    .requiredOption('-e, --email <email>', 'User email')
    .requiredOption('-f, --firstName <name>', 'First name')
    .requiredOption('-l, --lastName <name>', 'Last name')
    .requiredOption('-p, --password <password>', 'Password')
    .requiredOption('-r, --role <role>', 'Role (employee, manager, hr, admin)')
    .action(async (options) => {
        await connectDB();
        
        try {
            const user = await User.create({
                email: options.email,
                firstName: options.firstName,
                lastName: options.lastName,
                password: options.password,
                role: options.role
            });
            
            console.log(chalk.green('\n✓ User created successfully!'));
            console.log(chalk.gray(`ID: ${user._id}`));
            console.log(chalk.gray(`Email: ${user.email}`));
        } catch (error) {
            console.error(chalk.red('\n✗ Error creating user:'), error.message);
        }
        
        await disconnectDB();
    });

program
    .command('users:delete')
    .description('Delete a user by email')
    .requiredOption('-e, --email <email>', 'User email')
    .action(async (options) => {
        await connectDB();
        
        try {
            const user = await User.findOneAndDelete({ email: options.email });
            
            if (user) {
                console.log(chalk.green('\n✓ User deleted successfully!'));
                console.log(chalk.gray(`Deleted: ${user.firstName} ${user.lastName}`));
            } else {
                console.log(chalk.yellow('\n⚠ User not found'));
            }
        } catch (error) {
            console.error(chalk.red('\n✗ Error deleting user:'), error.message);
        }
        
        await disconnectDB();
    });

// Department commands
program
    .command('departments:list')
    .description('List all departments')
    .action(async () => {
        await connectDB();
        
        const departments = await Department.find()
            .populate('manager', 'firstName lastName');
        
        console.log(chalk.yellow(`\nFound ${departments.length} departments:\n`));
        departments.forEach(dept => {
            const manager = dept.manager 
                ? `${dept.manager.firstName} ${dept.manager.lastName}` 
                : 'No manager';
            console.log(`${chalk.bold(dept.name)} - ${chalk.gray(manager)}`);
        });
        
        await disconnectDB();
    });

// Attendance commands
program
    .command('attendance:stats')
    .description('Show attendance statistics')
    .option('-d, --days <number>', 'Number of days to analyze', '30')
    .action(async (options) => {
        await connectDB();
        
        const days = parseInt(options.days);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        
        const attendance = await Attendance.find({
            date: { $gte: startDate }
        });
        
        const stats = {
            total: attendance.length,
            present: attendance.filter(a => a.status === 'present').length,
            absent: attendance.filter(a => a.status === 'absent').length,
            late: attendance.filter(a => a.status === 'late').length
        };
        
        console.log(chalk.yellow(`\nAttendance Statistics (Last ${days} days):\n`));
        console.log(`${chalk.green('Present:')} ${stats.present}`);
        console.log(`${chalk.red('Absent:')} ${stats.absent}`);
        console.log(`${chalk.yellow('Late:')} ${stats.late}`);
        console.log(`${chalk.blue('Total Records:')} ${stats.total}`);
        
        await disconnectDB();
    });

// Leave commands
program
    .command('leaves:pending')
    .description('Show pending leave requests')
    .action(async () => {
        await connectDB();
        
        // Fetch from all leave types
        const vacations = await Vacation.find({ status: 'pending' }).populate('employee', 'personalInfo').sort({ createdAt: -1 });
        const missions = await Mission.find({ status: 'pending' }).populate('employee', 'personalInfo').sort({ createdAt: -1 });
        const sickLeaves = await SickLeave.find({ status: 'pending' }).populate('employee', 'personalInfo').sort({ createdAt: -1 });
        
        const leaves = [...vacations, ...missions, ...sickLeaves];
        
        console.log(chalk.yellow(`\nPending Leave Requests (${leaves.length}):\n`));
        leaves.forEach(leave => {
            const user = leave.employee?.personalInfo?.fullName || 'Unknown';
            const dates = `${leave.startDate.toLocaleDateString()} - ${leave.endDate.toLocaleDateString()}`;
            const type = leave.constructor.modelName;
            console.log(`${chalk.bold(user)} - ${chalk.cyan(type)} - ${dates}`);
            console.log(chalk.gray(`  Reason: ${(leave.reason || leave.purpose || 'N/A').substring(0, 60)}...`));
        });
        
        await disconnectDB();
    });

// Database commands
program
    .command('db:stats')
    .description('Show database statistics')
    .action(async () => {
        await connectDB();
        
        const userCount = await User.countDocuments();
        const deptCount = await Department.countDocuments();
        const attendanceCount = await Attendance.countDocuments();
        const vacationCount = await Vacation.countDocuments();
        const missionCount = await Mission.countDocuments();
        const sickLeaveCount = await SickLeave.countDocuments();
        const totalLeaves = vacationCount + missionCount + sickLeaveCount;
        
        console.log(chalk.yellow('\nDatabase Statistics:\n'));
        console.log(`${chalk.blue('Users:')} ${userCount}`);
        console.log(`${chalk.blue('Departments:')} ${deptCount}`);
        console.log(`${chalk.blue('Attendance Records:')} ${attendanceCount}`);
        console.log(`${chalk.blue('Vacations:')} ${vacationCount}`);
        console.log(`${chalk.blue('Missions:')} ${missionCount}`);
        console.log(`${chalk.blue('Sick Leaves:')} ${sickLeaveCount}`);
        console.log(`${chalk.blue('Total Leave Requests:')} ${totalLeaves}`);
        
        await disconnectDB();
    });

program.parse();
