/**
 * PostgreSQL Backup Restoration Script
 * 
 * Restores PostgreSQL databases from backup files
 * 
 * Usage:
 *   node scripts/restore-postgres-backup.js <backup-file> [options]
 * 
 * Options:
 *   --database=NAME    Database to restore ('main' or 'license', default: auto-detect)
 *   --drop-existing    Drop existing database objects before restore
 *   --verbose          Show detailed output
 *   --verify           Verify backup before restoring
 * 
 * Examples:
 *   node scripts/restore-postgres-backup.js backups/database-main_app-20260406.dump.gz
 *   node scripts/restore-postgres-backup.js backups/database-license_server-20260406.dump.gz --database=license
 *   node scripts/restore-postgres-backup.js backups/database-main_app-20260406.dump.gz --drop-existing --verbose
 */

const path = require('path');
const fs = require('fs').promises;

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length === 0 || args[0].startsWith('--')) {
  console.error('Error: Backup file path is required');
  console.log('\nUsage: node scripts/restore-postgres-backup.js <backup-file> [options]');
  console.log('\nOptions:');
  console.log('  --database=NAME    Database to restore (main/license, default: auto-detect)');
  console.log('  --drop-existing    Drop existing database objects before restore');
  console.log('  --verbose          Show detailed output');
  console.log('  --verify           Verify backup before restoring');
  process.exit(1);
}

const backupFile = args[0];
const options = args.slice(1).reduce((acc, arg) => {
  if (arg.startsWith('--')) {
    const [key, value] = arg.substring(2).split('=');
    acc[key] = value || true;
  }
  return acc;
}, {});

/**
 * Main restore function
 */
async function restoreBackup() {
  console.log('\n' + '='.repeat(60));
  console.log('PostgreSQL Backup Restoration');
  console.log('='.repeat(60) + '\n');

  try {
    // Check if backup file exists
    await fs.access(backupFile);
    console.log(`✓ Backup file found: ${backupFile}\n`);

    // Auto-detect database from filename if not specified
    let database = options.database;
    if (!database) {
      if (backupFile.includes('license')) {
        database = 'license';
      } else if (backupFile.includes('main')) {
        database = 'main';
      } else {
        console.error('Error: Could not auto-detect database. Please specify --database=main or --database=license');
        process.exit(1);
      }
    }

    console.log(`Target Database: ${database === 'license' ? 'License Server' : 'Main Application'}`);
    console.log(`Drop Existing: ${options['drop-existing'] ? 'Yes' : 'No'}`);
    console.log(`Verbose: ${options.verbose ? 'Yes' : 'No'}`);
    console.log();

    // Confirm restoration
    if (!options.force) {
      console.log('⚠️  WARNING: This will restore the database from backup.');
      console.log('   All current data in the database will be replaced!');
      console.log();
      console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...');
      
      await new Promise(resolve => setTimeout(resolve, 5000));
      console.log();
    }

    // Import the backup service
    const { default: postgresBackupService } = await import('../server/modules/hr-core/backup/services/postgresBackup.service.js');

    // Verify backup if requested
    if (options.verify) {
      console.log('🔍 Verifying backup integrity...');
      // Note: Would need checksum from metadata file
      console.log('   (Checksum verification requires metadata file)');
      console.log();
    }

    // Perform restoration
    console.log('🔄 Starting database restoration...\n');

    const result = await postgresBackupService.restoreDatabase(backupFile, {
      database,
      dropExisting: options['drop-existing'] || false,
      verbose: options.verbose || false
    });

    console.log('\n' + '='.repeat(60));
    console.log('✅ RESTORATION COMPLETE');
    console.log('='.repeat(60));
    console.log(`Database: ${result.database}`);
    console.log(`Restored From: ${result.restoredFrom}`);
    console.log(`Status: ${result.message}`);
    console.log('='.repeat(60) + '\n');

    console.log('Next Steps:');
    console.log('1. Verify application functionality');
    console.log('2. Check data integrity');
    console.log('3. Test critical features');
    console.log('4. Monitor for errors\n');

  } catch (error) {
    console.error('\n❌ Restoration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run restoration
restoreBackup().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
