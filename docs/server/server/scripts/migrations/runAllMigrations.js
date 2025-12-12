/**
 * Master Migration Script
 * 
 * Runs all migration scripts in sequence:
 * 1. Backup Leave collection
 * 2. Migrate Missions
 * 3. Migrate SickLeaves
 * 4. Migrate Vacations
 * 5. Validate all migrations
 */

import backupLeaveCollection from './backupLeaveCollection.js';
import migrateMissions from './migrateMissions.js';
import migrateSickLeaves from './migrateSickLeaves.js';
import migrateVacations from './migrateVacations.js';
import validateMigration from './validateMigration.js';

async function runAllMigrations(dryRun = false) {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         LEAVE SYSTEM MIGRATION - MASTER SCRIPT            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log();
  
  if (dryRun) {
    console.log('🧪 DRY RUN MODE - No data will be written to database');
    console.log();
  }

  const results = {
    backup: null,
    missions: null,
    sickLeaves: null,
    vacations: null,
    validation: null,
    success: false
  };

  try {
    // Step 1: Backup Leave collection
    if (!dryRun) {
      console.log('\n' + '═'.repeat(60));
      console.log('STEP 1: BACKUP LEAVE COLLECTION');
      console.log('═'.repeat(60));
      await backupLeaveCollection();
      results.backup = { success: true };
      console.log('✅ Backup completed');
    } else {
      console.log('\n[DRY RUN] Skipping backup step');
      results.backup = { success: true, skipped: true };
    }

    // Step 2: Migrate Missions
    console.log('\n' + '═'.repeat(60));
    console.log('STEP 2: MIGRATE MISSIONS');
    console.log('═'.repeat(60));
    results.missions = await migrateMissions(dryRun);
    console.log(`✅ Mission migration completed: ${results.missions.migrated} migrated, ${results.missions.failed} failed`);

    // Step 3: Migrate SickLeaves
    console.log('\n' + '═'.repeat(60));
    console.log('STEP 3: MIGRATE SICK LEAVES');
    console.log('═'.repeat(60));
    results.sickLeaves = await migrateSickLeaves(dryRun);
    console.log(`✅ SickLeave migration completed: ${results.sickLeaves.migrated} migrated, ${results.sickLeaves.failed} failed`);

    // Step 4: Migrate Vacations
    console.log('\n' + '═'.repeat(60));
    console.log('STEP 4: MIGRATE VACATIONS');
    console.log('═'.repeat(60));
    results.vacations = await migrateVacations(dryRun);
    console.log(`✅ Vacation migration completed: ${results.vacations.migrated} migrated, ${results.vacations.failed} failed`);

    // Step 5: Validate migrations
    if (!dryRun) {
      console.log('\n' + '═'.repeat(60));
      console.log('STEP 5: VALIDATE MIGRATIONS');
      console.log('═'.repeat(60));
      results.validation = await validateMigration();
      console.log(`${results.validation.overall.passed ? '✅' : '❌'} Validation ${results.validation.overall.passed ? 'passed' : 'failed'}`);
    } else {
      console.log('\n[DRY RUN] Skipping validation step');
      results.validation = { overall: { passed: true }, skipped: true };
    }

    // Check overall success
    const hasFailures = 
      results.missions.failed > 0 ||
      results.sickLeaves.failed > 0 ||
      results.vacations.failed > 0 ||
      (results.validation && !results.validation.overall.passed);

    results.success = !hasFailures;

    // Print final summary
    console.log('\n' + '╔' + '═'.repeat(58) + '╗');
    console.log('║' + ' '.repeat(15) + 'MIGRATION SUMMARY' + ' '.repeat(26) + '║');
    console.log('╠' + '═'.repeat(58) + '╣');
    console.log(`║ Backup:      ${results.backup?.skipped ? 'SKIPPED (dry run)' : 'COMPLETED'}${' '.repeat(results.backup?.skipped ? 24 : 34)}║`);
    console.log(`║ Missions:    ${results.missions.migrated} migrated, ${results.missions.failed} failed, ${results.missions.skipped} skipped${' '.repeat(10)}║`);
    console.log(`║ SickLeaves:  ${results.sickLeaves.migrated} migrated, ${results.sickLeaves.failed} failed, ${results.sickLeaves.skipped} skipped${' '.repeat(10)}║`);
    console.log(`║ Vacations:   ${results.vacations.migrated} migrated, ${results.vacations.failed} failed, ${results.vacations.skipped} skipped${' '.repeat(10)}║`);
    console.log(`║ Validation:  ${results.validation?.skipped ? 'SKIPPED (dry run)' : (results.validation?.overall.passed ? 'PASSED' : 'FAILED')}${' '.repeat(results.validation?.skipped ? 24 : 35)}║`);
    console.log('╠' + '═'.repeat(58) + '╣');
    console.log(`║ Overall:     ${results.success ? '✅ SUCCESS' : '❌ FAILED'}${' '.repeat(results.success ? 33 : 34)}║`);
    console.log('╚' + '═'.repeat(58) + '╝');

    if (dryRun) {
      console.log('\n💡 This was a dry run. To perform actual migration, run without --dry-run flag');
    }

    return results;

  } catch (error) {
    console.error('\n❌ MIGRATION FAILED WITH ERROR:', error);
    results.success = false;
    throw error;
  }
}

// Run all migrations if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const dryRun = process.argv.includes('--dry-run');
  
  runAllMigrations(dryRun)
    .then((results) => {
      if (results.success) {
        console.log('\n✅ All migrations completed successfully');
        process.exit(0);
      } else {
        console.log('\n⚠️  Migrations completed with errors - please review above');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('\n❌ Migration process failed:', error);
      process.exit(1);
    });
}

export default runAllMigrations;
