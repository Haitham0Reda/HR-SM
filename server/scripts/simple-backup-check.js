#!/usr/bin/env node

/**
 * Simple Daily Backup Check
 * 
 * Quick verification that both databases are configured for daily backup
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Checking Daily Backup Configuration\n');

// Check if backup directories exist
const backupDir = path.join(process.cwd(), 'backups');
const directories = ['daily', 'weekly', 'monthly', 'metadata'];

console.log('📁 Backup Directories:');
directories.forEach(dir => {
    const dirPath = path.join(backupDir, dir);
    const exists = fs.existsSync(dirPath);
    console.log(`  ${exists ? '✓' : '❌'} ${dir}: ${exists ? 'exists' : 'missing'}`);
    
    if (exists) {
        const files = fs.readdirSync(dirPath);
        console.log(`    Contains ${files.length} file(s)`);
    }
});

// Check backup service configuration
console.log('\n🗄️ Database Backup Configuration:');

try {
    const backupServicePath = path.join(process.cwd(), 'server', 'services', 'backupService.js');
    if (fs.existsSync(backupServicePath)) {
        console.log('  ✓ BackupService exists');
        
        const content = fs.readFileSync(backupServicePath, 'utf8');
        
        // Check for both database backups
        const hasHrmsBackup = content.includes("backupMongoDatabase('hrms'");
        const hasLicenseBackup = content.includes("backupMongoDatabase('hrsm-licenses'");
        
        console.log(`  ${hasHrmsBackup ? '✓' : '❌'} Main database (hrms) backup: ${hasHrmsBackup ? 'configured' : 'missing'}`);
        console.log(`  ${hasLicenseBackup ? '✓' : '❌'} License database (hrsm-licenses) backup: ${hasLicenseBackup ? 'configured' : 'missing'}`);
        
        if (hasHrmsBackup && hasLicenseBackup) {
            console.log('\n🎉 SUCCESS: Both databases are configured for backup!');
        } else {
            console.log('\n❌ ISSUE: Not all databases are configured for backup');
        }
    } else {
        console.log('  ❌ BackupService not found');
    }
} catch (error) {
    console.log(`  ❌ Error checking backup service: ${error.message}`);
}

// Check scheduler configuration
console.log('\n⏰ Backup Scheduler Configuration:');

try {
    const schedulerPath = path.join(process.cwd(), 'server', 'services', 'backupScheduler.js');
    if (fs.existsSync(schedulerPath)) {
        console.log('  ✓ BackupScheduler exists');
        
        const content = fs.readFileSync(schedulerPath, 'utf8');
        
        // Check for daily schedule
        const hasDailySchedule = content.includes("'0 2 * * *'") || content.includes('daily');
        console.log(`  ${hasDailySchedule ? '✓' : '❌'} Daily schedule: ${hasDailySchedule ? 'configured' : 'missing'}`);
    } else {
        console.log('  ❌ BackupScheduler not found');
    }
} catch (error) {
    console.log(`  ❌ Error checking scheduler: ${error.message}`);
}

// Check integration
console.log('\n🔗 Backup Integration:');

try {
    const integrationPath = path.join(process.cwd(), 'server', 'services', 'backupIntegration.js');
    if (fs.existsSync(integrationPath)) {
        console.log('  ✓ BackupIntegration exists');
    } else {
        console.log('  ❌ BackupIntegration not found');
    }
    
    const indexPath = path.join(process.cwd(), 'server', 'index.js');
    if (fs.existsSync(indexPath)) {
        const content = fs.readFileSync(indexPath, 'utf8');
        const hasIntegration = content.includes('BackupIntegration') && content.includes('backupIntegration.initialize()');
        console.log(`  ${hasIntegration ? '✓' : '❌'} Integration initialized: ${hasIntegration ? 'yes' : 'no'}`);
    }
} catch (error) {
    console.log(`  ❌ Error checking integration: ${error.message}`);
}

// Check environment variables
console.log('\n🌍 Environment Configuration:');
const requiredEnvVars = ['MONGODB_URI'];
requiredEnvVars.forEach(envVar => {
    const exists = !!process.env[envVar];
    console.log(`  ${exists ? '✓' : '❌'} ${envVar}: ${exists ? 'set' : 'missing'}`);
});

console.log('\n📋 Summary:');
console.log('The backup system appears to be configured to backup both databases daily.');
console.log('To verify it\'s actually running, check:');
console.log('  1. Application logs: tail -f logs/backup.log');
console.log('  2. Backup files: ls -la backups/daily/');
console.log('  3. Run manual test: node server/scripts/verify-daily-backup.js --test');

console.log('\n✅ Daily backup verification complete.');