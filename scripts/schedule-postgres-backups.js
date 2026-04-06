/**
 * PostgreSQL Backup Scheduler
 * 
 * Schedules automated backups for PostgreSQL databases
 * Supports daily, weekly, and monthly backup schedules
 * 
 * Usage:
 *   node scripts/schedule-postgres-backups.js [options]
 * 
 * Options:
 *   --schedule=TYPE    Backup schedule (daily/weekly/monthly, default: daily)
 *   --time=HH:MM       Time to run backup (default: 02:00)
 *   --retention=DAYS   Days to retain backups (default: 30)
 *   --both             Backup both databases (default)
 *   --license-only     Backup license server only
 *   --main-only        Backup main application only
 *   --encrypt          Enable encryption
 *   --test             Run test backup immediately
 */

const cron = require('node-cron');
const path = require('path');
const fs = require('fs').promises;

// Parse command line arguments
const args = process.argv.slice(2).reduce((acc, arg) => {
  if (arg.startsWith('--')) {
    const [key, value] = arg.substring(2).split('=');
    acc[key] = value || true;
  }
  return acc;
}, {});

// Configuration
const config = {
  schedule: args.schedule || 'daily',
  time: args.time || '02:00',
  retention: parseInt(args.retention) || 30,
  backupBoth: !args['license-only'] && !args['main-only'],
  backupLicense: args['license-only'] || !args['main-only'],
  backupMain: args['main-only'] || !args['license-only'],
  encrypt: args.encrypt || false,
  backupDir: path.join(process.cwd(), 'backups', 'scheduled')
};

/**
 * Get cron expression for schedule
 */
function getCronExpression(schedule, time) {
  const [hour, minute] = time.split(':');
  
  const expressions = {
    daily: `${minute} ${hour} * * *`,           // Every day at specified time
    weekly: `${minute} ${hour} * * 0`,          // Every Sunday at specified time
    monthly: `${minute} ${hour} 1 * *`,         // 1st of every month at specified time
    hourly: `0 * * * *`,                        // Every hour
    '6hours': `0 */6 * * *`                     // Every 6 hours
  };

  return expressions[schedule] || expressions.daily;
}

/**
 * Perform scheduled backup
 */
async function performScheduledBackup() {
  console.log('\n' + '='.repeat(60));
  console.log(`Scheduled Backup - ${new Date().toISOString()}`);
  console.log('='.repeat(60) + '\n');

  try {
    // Ensure backup directory exists
    await fs.mkdir(config.backupDir, { recursive: true });

    // Import backup service
    const { default: postgresBackupService } = await import('../server/modules/hr-core/backup/services/postgresBackup.service.js');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const results = {};

    // Backup configuration
    const backupConfig = {
      settings: {
        encryption: config.encrypt ? {
          enabled: true,
          algorithm: 'aes-256-cbc',
          encryptionKey: process.env.BACKUP_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex')
        } : { enabled: false }
      }
    };

    // Backup license server
    if (config.backupLicense) {
      console.log('📦 Backing up License Server...');
      results.license = await postgresBackupService.performDatabaseBackup(
        backupConfig,
        config.backupDir,
        timestamp,
        { database: 'license' }
      );
      console.log(`✓ License Server backup complete: ${results.license.backupFile}`);
      console.log(`  Size: ${(results.license.compressedSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  Compression: ${results.license.compressionRatio}x`);
      console.log();
    }

    // Backup main application
    if (config.backupMain) {
      console.log('📦 Backing up Main Application...');
      results.main = await postgresBackupService.performDatabaseBackup(
        backupConfig,
        config.backupDir,
        timestamp,
        { database: 'main' }
      );
      console.log(`✓ Main Application backup complete: ${results.main.backupFile}`);
      console.log(`  Size: ${(results.main.compressedSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  Compression: ${results.main.compressionRatio}x`);
      console.log();
    }

    // Cleanup old backups
    console.log(`🧹 Cleaning up backups older than ${config.retention} days...`);
    const cleanup = await postgresBackupService.cleanupOldBackups(
      config.backupDir,
      config.retention
    );
    console.log(`✓ Deleted ${cleanup.deletedCount} old backups`);
    console.log(`  Freed: ${(cleanup.freedSpace / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Remaining: ${cleanup.remainingBackups} backups`);
    console.log();

    // Summary
    console.log('='.repeat(60));
    console.log('✅ Scheduled Backup Complete');
    console.log('='.repeat(60));
    
    const totalSize = (results.license?.compressedSize || 0) + (results.main?.compressedSize || 0);
    console.log(`Total Backup Size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Backup Directory: ${config.backupDir}`);
    console.log(`Next Backup: ${getNextBackupTime(config.schedule, config.time)}`);
    console.log('='.repeat(60) + '\n');

    return results;

  } catch (error) {
    console.error('\n❌ Scheduled backup failed:', error.message);
    console.error(error.stack);
    
    // Send alert (implement your alerting mechanism)
    await sendBackupAlert('Backup Failed', error.message);
    
    throw error;
  }
}

/**
 * Get next backup time
 */
function getNextBackupTime(schedule, time) {
  const now = new Date();
  const [hour, minute] = time.split(':').map(Number);
  
  const next = new Date(now);
  next.setHours(hour, minute, 0, 0);
  
  if (schedule === 'daily') {
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }
  } else if (schedule === 'weekly') {
    next.setDate(next.getDate() + (7 - next.getDay()));
    if (next <= now) {
      next.setDate(next.getDate() + 7);
    }
  } else if (schedule === 'monthly') {
    next.setMonth(next.getMonth() + 1, 1);
    if (next <= now) {
      next.setMonth(next.getMonth() + 1);
    }
  }
  
  return next.toISOString();
}

/**
 * Send backup alert (placeholder)
 */
async function sendBackupAlert(subject, message) {
  // Implement your alerting mechanism here
  // Examples: Email, Slack, SMS, etc.
  console.log(`📧 Alert: ${subject} - ${message}`);
}

/**
 * Start backup scheduler
 */
async function startScheduler() {
  console.log('\n' + '='.repeat(60));
  console.log('PostgreSQL Backup Scheduler');
  console.log('='.repeat(60));
  console.log(`Schedule: ${config.schedule}`);
  console.log(`Time: ${config.time}`);
  console.log(`Retention: ${config.retention} days`);
  console.log(`Databases: ${config.backupBoth ? 'Both' : config.backupLicense ? 'License Only' : 'Main Only'}`);
  console.log(`Encryption: ${config.encrypt ? 'Enabled' : 'Disabled'}`);
  console.log(`Backup Directory: ${config.backupDir}`);
  console.log('='.repeat(60) + '\n');

  // Test backup if requested
  if (args.test) {
    console.log('🧪 Running test backup...\n');
    await performScheduledBackup();
    console.log('\n✅ Test backup completed successfully!\n');
    process.exit(0);
  }

  // Get cron expression
  const cronExpression = getCronExpression(config.schedule, config.time);
  console.log(`Cron Expression: ${cronExpression}`);
  console.log(`Next Backup: ${getNextBackupTime(config.schedule, config.time)}\n`);

  // Validate cron expression
  if (!cron.validate(cronExpression)) {
    console.error('❌ Invalid cron expression');
    process.exit(1);
  }

  // Schedule backup
  const task = cron.schedule(cronExpression, async () => {
    await performScheduledBackup();
  });

  console.log('✅ Backup scheduler started');
  console.log('   Press Ctrl+C to stop\n');

  // Keep process running
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Stopping backup scheduler...');
    task.stop();
    console.log('✅ Backup scheduler stopped\n');
    process.exit(0);
  });
}

// Run scheduler
if (require.main === module) {
  startScheduler().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = {
  performScheduledBackup,
  getCronExpression,
  getNextBackupTime
};
