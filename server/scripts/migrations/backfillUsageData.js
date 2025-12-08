#!/usr/bin/env node
/**
 * Migration Script: Backfill Usage Data
 * 
 * This script creates initial usage tracking records for existing tenants
 * based on their current system usage.
 * 
 * It calculates:
 * - Employee count from User collection
 * - Storage usage from uploaded files
 * - API call estimates (if available from logs)
 * - Module-specific usage metrics
 * 
 * Usage:
 *   node server/scripts/migrations/backfillUsageData.js [options]
 * 
 * Options:
 *   --months <months>    Number of historical months to backfill (default: 1)
 *   --dry-run            Preview changes without applying them
 */

import mongoose from 'mongoose';
import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import License, { MODULES } from '../../models/license.model.js';
import UsageTracking from '../../models/usageTracking.model.js';
import User from '../../models/user.model.js';
import logger from '../../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
const program = new Command();
program
    .option('--months <months>', 'Number of historical months to backfill', '1')
    .option('--dry-run', 'Preview changes without applying them', false)
    .parse(process.argv);

const options = program.opts();

/**
 * Connect to MongoDB
 */
async function connectDB() {
    try {
        const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/hrms';
        await mongoose.connect(mongoURI);
        console.log('✓ Connected to MongoDB');
    } catch (error) {
        console.error('✗ MongoDB connection error:', error.message);
        process.exit(1);
    }
}

/**
 * Calculate employee count
 */
async function calculateEmployeeCount() {
    try {
        return await User.countDocuments({ isActive: true });
    } catch (error) {
        logger.warn('Failed to count employees', { error: error.message });
        return 0;
    }
}

/**
 * Calculate storage usage from uploads directory
 */
async function calculateStorageUsage() {
    const uploadDirs = [
        path.join(__dirname, '../../../uploads'),
        path.join(__dirname, '../../../server/uploads')
    ];

    let totalSize = 0;

    for (const uploadDir of uploadDirs) {
        try {
            if (fs.existsSync(uploadDir)) {
                totalSize += await getDirectorySize(uploadDir);
            }
        } catch (error) {
            logger.warn('Failed to calculate storage for directory', {
                directory: uploadDir,
                error: error.message
            });
        }
    }

    return totalSize;
}

/**
 * Recursively calculate directory size
 */
async function getDirectorySize(dirPath) {
    let totalSize = 0;

    try {
        const files = fs.readdirSync(dirPath);

        for (const file of files) {
            const filePath = path.join(dirPath, file);
            const stats = fs.statSync(filePath);

            if (stats.isDirectory()) {
                totalSize += await getDirectorySize(filePath);
            } else {
                totalSize += stats.size;
            }
        }
    } catch (error) {
        logger.warn('Error reading directory', { dirPath, error: error.message });
    }

    return totalSize;
}

/**
 * Calculate module-specific usage
 */
async function calculateModuleUsage(moduleKey) {
    const usage = {
        employees: 0,
        storage: 0,
        apiCalls: 0,
        records: 0
    };

    try {
        switch (moduleKey) {
            case MODULES.ATTENDANCE:
                // Count attendance records
                const Attendance = mongoose.model('Attendance');
                usage.records = await Attendance.countDocuments();
                usage.employees = await User.countDocuments({ isActive: true });
                break;

            case MODULES.LEAVE:
                // Count leave records (vacation, sick leave, mission)
                const Vacation = mongoose.model('Vacation');
                const SickLeave = mongoose.model('SickLeave');
                const Mission = mongoose.model('Mission');
                
                const vacationCount = await Vacation.countDocuments();
                const sickLeaveCount = await SickLeave.countDocuments();
                const missionCount = await Mission.countDocuments();
                
                usage.records = vacationCount + sickLeaveCount + missionCount;
                usage.employees = await User.countDocuments({ isActive: true });
                break;

            case MODULES.PAYROLL:
                // Count payroll records
                const Payroll = mongoose.model('Payroll');
                usage.records = await Payroll.countDocuments();
                usage.employees = await User.countDocuments({ isActive: true });
                break;

            case MODULES.DOCUMENTS:
                // Count documents and calculate storage
                const Document = mongoose.model('Document');
                usage.records = await Document.countDocuments();
                usage.employees = await User.countDocuments({ isActive: true });
                
                // Estimate storage for documents
                const docDir = path.join(__dirname, '../../../uploads/documents');
                if (fs.existsSync(docDir)) {
                    usage.storage = await getDirectorySize(docDir);
                }
                break;

            case MODULES.COMMUNICATION:
                // Count announcements and notifications
                const Announcement = mongoose.model('Announcement');
                const Notification = mongoose.model('Notification');
                
                const announcementCount = await Announcement.countDocuments();
                const notificationCount = await Notification.countDocuments();
                
                usage.records = announcementCount + notificationCount;
                usage.employees = await User.countDocuments({ isActive: true });
                break;

            case MODULES.REPORTING:
                // Count reports
                const Report = mongoose.model('Report');
                usage.records = await Report.countDocuments();
                usage.employees = await User.countDocuments({ isActive: true });
                break;

            case MODULES.TASKS:
                // Count tasks
                const Task = mongoose.model('Task');
                usage.records = await Task.countDocuments();
                usage.employees = await User.countDocuments({ isActive: true });
                break;

            case MODULES.HR_CORE:
                // Core HR usage
                usage.employees = await User.countDocuments({ isActive: true });
                usage.storage = await calculateStorageUsage();
                break;

            default:
                logger.warn('Unknown module for usage calculation', { moduleKey });
        }
    } catch (error) {
        logger.warn('Failed to calculate module usage', {
            moduleKey,
            error: error.message
        });
    }

    return usage;
}

/**
 * Generate period strings for backfill
 */
function generatePeriods(months) {
    const periods = [];
    const now = new Date();

    for (let i = 0; i < months; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        periods.push(`${year}-${month}`);
    }

    return periods;
}

/**
 * Backfill usage data for a license
 */
async function backfillLicenseUsage(license, periods, dryRun = false) {
    const results = [];

    for (const period of periods) {
        console.log(`  Processing period: ${period}`);

        for (const module of license.modules) {
            if (!module.enabled) {
                continue; // Skip disabled modules
            }

            // Check if usage tracking already exists
            const existing = await UsageTracking.findOne({
                tenantId: license.tenantId,
                moduleKey: module.key,
                period
            });

            if (existing) {
                console.log(`    ⚠️  ${module.key}: Usage tracking already exists, skipping`);
                continue;
            }

            // Calculate usage for this module
            const usage = await calculateModuleUsage(module.key);

            const usageData = {
                tenantId: license.tenantId,
                moduleKey: module.key,
                period,
                usage,
                limits: module.limits || {}
            };

            if (dryRun) {
                console.log(`    🔍 ${module.key}: Would create usage tracking`);
                console.log(`       Usage: ${JSON.stringify(usage)}`);
                results.push({ period, module: module.key, action: 'would-create', usage });
            } else {
                await UsageTracking.create(usageData);
                console.log(`    ✓ ${module.key}: Created usage tracking`);
                console.log(`       Employees: ${usage.employees}, Records: ${usage.records}, Storage: ${formatBytes(usage.storage)}`);
                results.push({ period, module: module.key, action: 'created', usage });
            }
        }
    }

    return results;
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Main migration function
 */
async function migrate() {
    console.log('🔄 Usage Data Backfill Migration\n');
    console.log('Configuration:');
    console.log(`  Months to backfill: ${options.months}`);
    console.log(`  Dry Run: ${options.dryRun ? 'Yes' : 'No'}\n`);

    try {
        await connectDB();

        // Get all licenses
        const licenses = await License.find({});

        if (licenses.length === 0) {
            console.log('⚠️  No licenses found. Run generateInitialLicenses.js first.');
            return;
        }

        console.log(`Found ${licenses.length} license(s)\n`);

        // Generate periods to backfill
        const periods = generatePeriods(parseInt(options.months));
        console.log(`Backfilling periods: ${periods.join(', ')}\n`);

        let totalCreated = 0;

        for (const license of licenses) {
            console.log(`Processing license ${license._id}...`);

            const results = await backfillLicenseUsage(license, periods, options.dryRun);
            const created = results.filter(r => r.action === 'created' || r.action === 'would-create').length;
            totalCreated += created;

            console.log(`  Summary: ${created} usage tracking record(s) ${options.dryRun ? 'would be created' : 'created'}\n`);
        }

        console.log('✅ Migration completed successfully!');
        console.log(`   Total usage tracking records ${options.dryRun ? 'to create' : 'created'}: ${totalCreated}`);

        if (options.dryRun) {
            console.log('\n⚠️  This was a dry run. No changes were made.');
            console.log('   Run without --dry-run to apply changes.');
        }

    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        if (error.stack) {
            console.error('\nStack trace:');
            console.error(error.stack);
        }
        process.exit(1);
    } finally {
        if (mongoose.connection.readyState === 1) {
            await mongoose.disconnect();
            console.log('\n✓ Disconnected from MongoDB');
        }
    }
}

// Run migration
migrate().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
});
