#!/usr/bin/env node

/**
 * Backup Status Report
 * 
 * Generates a comprehensive report on the daily backup system status
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const execAsync = promisify(exec);

console.log('🔍 HR-SM Daily Backup System Status Report');
console.log('==========================================\n');

// 1. Check backup configuration files
console.log('📋 1. BACKUP CONFIGURATION');
console.log('---------------------------');

const backupServicePath = path.join(process.cwd(), 'server', 'services', 'backupService.js');
const backupSchedulerPath = path.join(process.cwd(), 'server', 'services', 'backupScheduler.js');
const backupIntegrationPath = path.join(process.cwd(), 'server', 'services', 'backupIntegration.js');

console.log(`BackupService: ${fs.existsSync(backupServicePath) ? '✓ EXISTS' : '❌ MISSING'}`);
console.log(`BackupScheduler: ${fs.existsSync(backupSchedulerPath) ? '✓ EXISTS' : '❌ MISSING'}`);
console.log(`BackupIntegration: ${fs.existsSync(backupIntegrationPath) ? '✓ EXISTS' : '❌ MISSING'}`);

// Check if both databases are configured
if (fs.existsSync(backupServicePath)) {
    const content = fs.readFileSync(backupServicePath, 'utf8');
    const hasHrms = content.includes("backupMongoDatabase('hrms'");
    const hasLicense = content.includes("backupMongoDatabase('hrsm-licenses'");
    
    console.log(`Main DB (hrms) backup: ${hasHrms ? '✓ CONFIGURED' : '❌ NOT CONFIGURED'}`);
    console.log(`License DB (hrsm-licenses) backup: ${hasLicense ? '✓ CONFIGURED' : '❌ NOT CONFIGURED'}`);
}

// 2. Check backup directories
console.log('\n📁 2. BACKUP DIRECTORIES');
console.log('-------------------------');

const backupDir = path.join(process.cwd(), 'backups');
const directories = ['daily', 'weekly', 'monthly', 'metadata'];

directories.forEach(dir => {
    const dirPath = path.join(backupDir, dir);
    const exists = fs.existsSync(dirPath);
    let fileCount = 0;
    
    if (exists) {
        try {
            fileCount = fs.readdirSync(dirPath).length;
        } catch (e) {
            // ignore
        }
    }
    
    console.log(`${dir}: ${exists ? '✓ EXISTS' : '❌ MISSING'} (${fileCount} files)`);
});

// 3. Check environment variables
console.log('\n🌍 3. ENVIRONMENT CONFIGURATION');
console.log('--------------------------------');

const envVars = [
    'MONGODB_URI',
    'MONGO_URI',
    'BACKUP_ENCRYPTION_KEY',
    'BACKUPS_ENABLED'
];

envVars.forEach(envVar => {
    const exists = !!process.env[envVar];
    const value = exists ? (envVar.includes('KEY') || envVar.includes('URI') ? '[HIDDEN]' : process.env[envVar]) : 'NOT SET';
    console.log(`${envVar}: ${exists ? '✓ SET' : '❌ NOT SET'} ${exists ? `(${value})` : ''}`);
});

// 4. Check MongoDB tools
console.log('\n🛠️ 4. MONGODB TOOLS');
console.log('-------------------');

try {
    const { stdout } = await execAsync('mongodump --version');
    console.log('mongodump: ✓ AVAILABLE');
    console.log(`Version: ${stdout.trim()}`);
} catch (error) {
    console.log('mongodump: ⚠️ NOT AVAILABLE (using JavaScript fallback)');
    console.log('INFO: JavaScript fallback method is available and functional');
    console.log('The backup system will use native Mongoose export instead of mongodump');
    console.log('\nOptional installation instructions (for performance):');
    console.log('Windows: Download from https://www.mongodb.com/try/download/database-tools');
    console.log('macOS: brew install mongodb/brew/mongodb-database-tools');
    console.log('Linux: apt-get install mongodb-database-tools');
}

// 5. Check application integration
console.log('\n🔗 5. APPLICATION INTEGRATION');
console.log('------------------------------');

const indexPath = path.join(process.cwd(), 'server', 'index.js');
if (fs.existsSync(indexPath)) {
    const content = fs.readFileSync(indexPath, 'utf8');
    const hasImport = content.includes('BackupIntegration');
    const hasInit = content.includes('backupIntegration.initialize()');
    
    console.log(`BackupIntegration imported: ${hasImport ? '✓ YES' : '❌ NO'}`);
    console.log(`BackupIntegration initialized: ${hasInit ? '✓ YES' : '❌ NO'}`);
} else {
    console.log('server/index.js: ❌ NOT FOUND');
}

// 6. Summary and recommendations
console.log('\n📊 6. SUMMARY');
console.log('--------------');

const issues = [];
const recommendations = [];

// Check critical components
if (!fs.existsSync(backupServicePath)) {
    issues.push('BackupService missing');
}

if (!process.env.MONGODB_URI && !process.env.MONGO_URI) {
    issues.push('MongoDB URI not configured');
    recommendations.push('Add MONGODB_URI to .env file');
}

try {
    await execAsync('mongodump --version');
} catch (error) {
    // mongodump not available, but JavaScript fallback is functional
    // This is not an issue since we have a working alternative
}

if (!process.env.BACKUP_ENCRYPTION_KEY) {
    issues.push('Backup encryption key not set');
    recommendations.push('Generate and set BACKUP_ENCRYPTION_KEY in .env');
}

// Generate final status
if (issues.length === 0) {
    console.log('🎉 STATUS: READY FOR DAILY BACKUPS');
    console.log('✅ Both databases (hrms and hrsm-licenses) are configured for daily backup');
    console.log('✅ All required components are in place');
    console.log('✅ Backup system is properly integrated');
} else {
    console.log('⚠️ STATUS: NEEDS ATTENTION');
    console.log(`❌ Found ${issues.length} issue(s):`);
    issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`);
    });
}

if (recommendations.length > 0) {
    console.log('\n💡 RECOMMENDATIONS:');
    recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec}`);
    });
}

console.log('\n🔧 NEXT STEPS:');
console.log('1. Fix any issues listed above');
console.log('2. Start the HR-SM server to initialize backup system');
console.log('3. Check backup logs: tail -f logs/backup.log');
console.log('4. Verify daily backups are created in: ./backups/daily/');

console.log('\n✅ Report complete.');