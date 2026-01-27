#!/usr/bin/env node

/**
 * Migration CLI Tool
 * 
 * Enhanced command-line interface for running platform data migration
 * with comprehensive argument parsing, progress display, and dry-run support.
 * 
 * Requirements: 2.1
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from root .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../../..');
dotenv.config({ path: path.join(rootDir, '.env') });

import { Command } from 'commander';
import chalk from 'chalk';
import readline from 'readline';
import { migratePlatformData } from '../migrate-platform-data.js';
import { MigrationLogger } from '../utils/migrationLogger.js';
import { MigrationConfig } from '../config/migrationConfig.js';
import { DatabaseConnections } from '../utils/databaseConnections.js';
import { getTenantCount } from '../export/exportTenants.js';
import { runPreMigrationValidation, formatValidationResults } from '../validation/preMigrationValidation.js';
import { runPostMigrationVerification, formatVerificationSummary } from '../verification/postMigrationVerification.js';

/**
 * CLI Progress Display
 * Provides visual feedback during migration execution
 */
class MigrationProgress {
  constructor() {
    this.currentStep = 0;
    this.totalSteps = 7;
    this.steps = [
      'Connecting to databases',
      'Validating connections',
      'Creating backup',
      'Exporting tenant data',
      'Validating exported data',
      'Importing tenant data',
      'Verifying migration'
    ];
  }

  start(step) {
    this.currentStep++;
    const stepText = `[${this.currentStep}/${this.totalSteps}] ${step}`;
    process.stdout.write(`${chalk.blue('⏳')} ${stepText}...`);
  }

  succeed(message) {
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
    const stepText = message || this.steps[this.currentStep - 1];
    console.log(`${chalk.green('✓')} [${this.currentStep}/${this.totalSteps}] ${stepText}`);
  }

  fail(message) {
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
    const stepText = message || this.steps[this.currentStep - 1];
    console.log(`${chalk.red('✗')} [${this.currentStep}/${this.totalSteps}] ${stepText}`);
  }

  warn(message) {
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
    console.log(`${chalk.yellow('⚠')} ${message}`);
  }

  info(message) {
    console.log(`${chalk.blue('ℹ')} ${message}`);
  }

  stop() {
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
  }
}

/**
 * Parse and validate CLI arguments
 */
function setupCLI() {
  const program = new Command();

  program
    .name('migrate-platform-data')
    .description('Migrate tenant metadata from hrsm_platform to hrsm-licenses database')
    .version('1.0.0')
    .option('-d, --dry-run', 'Run migration without making changes (preview mode)')
    .option('-b, --batch-size <number>', 'Number of records to process per batch', '100')
    .option('--no-backup', 'Skip backup creation before migration')
    .option('--no-validation', 'Skip pre-migration validation')
    .option('--skip-validation', 'Skip pre-migration validation (alias)')
    .option('--no-verification', 'Skip post-migration verification')
    .option('-y, --yes', 'Skip confirmation prompts (non-interactive mode)')
    .option('-v, --verbose', 'Enable verbose logging')
    .option('--source-db <name>', 'Source database name (default: from env)')
    .option('--dest-db <name>', 'Destination database name (default: from env)')
    .option('--progress', 'Display progress indicators (default: true)', true)
    .helpOption('-h, --help', 'Display help information');

  program.parse(process.argv);

  return program.opts();
}

/**
 * Display migration summary before execution
 */
async function displayMigrationSummary(options, connections) {
  console.log(chalk.bold.cyan('\n📋 Migration Summary\n'));
  console.log(chalk.gray('─'.repeat(60)));

  // Database information
  console.log(chalk.bold('Databases:'));
  console.log(`  Source:      ${chalk.yellow(options.sourceDb || process.env.MONGODB_DATABASE || 'hrsm_platform')}`);
  console.log(`  Destination: ${chalk.yellow(options.destDb || process.env.LICENSE_DB_NAME || 'hrsm-licenses')}`);

  // Get tenant count from source
  try {
    const sourceDb = connections.getSourceDb();
    const tenantCount = await getTenantCount(sourceDb);
    console.log(`\n${chalk.bold('Data to migrate:')}`);
    console.log(`  Tenants: ${chalk.yellow(tenantCount)} records`);
  } catch (error) {
    console.log(`\n${chalk.bold('Data to migrate:')}`);
    console.log(`  ${chalk.red('Unable to count tenants (connection issue)')}`);
  }

  // Migration options
  console.log(`\n${chalk.bold('Options:')}`);
  console.log(`  Mode:        ${options.dryRun ? chalk.yellow('DRY RUN (no changes)') : chalk.green('LIVE MIGRATION')}`);
  console.log(`  Batch size:  ${chalk.yellow(options.batchSize)}`);
  console.log(`  Backup:      ${options.backup ? chalk.green('Enabled') : chalk.red('Disabled')}`);
  console.log(`  Validation:  ${options.validation ? chalk.green('Enabled') : chalk.red('Disabled')}`);
  console.log(`  Verification: ${options.verification ? chalk.green('Enabled') : chalk.red('Disabled')}`);

  console.log(chalk.gray('─'.repeat(60)));
}

/**
 * Confirm migration execution with user
 */
async function confirmMigration(options) {
  if (options.yes) {
    return true;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    const question = options.dryRun 
      ? 'Proceed with dry-run migration? (y/N): '
      : chalk.yellow('⚠️  Proceed with LIVE migration? This will modify the database. (y/N): ');
    
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * Display migration results
 */
function displayResults(result, options) {
  console.log('\n');
  console.log(chalk.gray('─'.repeat(60)));
  
  if (result.success) {
    console.log(chalk.bold.green('✓ Migration completed successfully!\n'));
  } else {
    console.log(chalk.bold.red('✗ Migration completed with issues\n'));
  }

  // Display statistics
  if (result.statistics) {
    console.log(chalk.bold('Statistics:'));
    console.log(`  Total records:   ${chalk.yellow(result.statistics.totalRecords || 0)}`);
    
    if (!options.dryRun) {
      console.log(`  Imported:        ${chalk.green(result.statistics.importedCount || 0)}`);
      console.log(`  Skipped:         ${chalk.yellow(result.statistics.skippedCount || 0)}`);
      console.log(`  Failed:          ${chalk.red(result.statistics.failedCount || 0)}`);
    }
  }

  // Display verification results
  if (result.verification && !options.dryRun) {
    console.log(`\n${chalk.bold('Verification:')}`);
    if (result.verification.valid) {
      console.log(`  Status: ${chalk.green('PASSED')}`);
      console.log(`  Source count:      ${chalk.yellow(result.verification.statistics.sourceCount)}`);
      console.log(`  Destination count: ${chalk.yellow(result.verification.statistics.destinationCount)}`);
    } else {
      console.log(`  Status: ${chalk.red('FAILED')}`);
      console.log(`  Discrepancies: ${chalk.red(result.verification.discrepancies.length)}`);
    }
  }

  // Display report location
  if (result.report && result.report.files) {
    console.log(`\n${chalk.bold('Reports generated:')}`);
    Object.entries(result.report.files).forEach(([format, filepath]) => {
      console.log(`  ${format.toUpperCase()}: ${chalk.cyan(filepath)}`);
    });
  }

  console.log(chalk.gray('─'.repeat(60)));
  console.log('');
}

/**
 * Main CLI execution
 */
async function main() {
  const logger = new MigrationLogger();
  let connections = null;
  let options = null; // Declare options at function scope

  try {
    // Parse CLI arguments
    options = setupCLI();

    // Display header
    console.log(chalk.bold.cyan('\n🚀 Platform Data Migration Tool\n'));

    // Validate batch size
    const batchSize = parseInt(options.batchSize, 10);
    if (isNaN(batchSize) || batchSize < 1) {
      console.error(chalk.red('Error: Batch size must be a positive number'));
      process.exit(1);
    }
    options.batchSize = batchSize;

    // Create progress display
    const progress = options.progress ? new MigrationProgress() : null;

    // Step 1: Connect to databases for summary
    if (progress) {
      progress.start('Connecting to databases');
    } else {
      console.log('Connecting to databases...');
    }

    try {
      const config = new MigrationConfig({
        sourceDatabase: options.sourceDb || process.env.MONGODB_URI,
        destinationDatabase: options.destDb || process.env.LICENSE_SERVER_MONGODB_URI
      });
      connections = new DatabaseConnections(config);
      await connections.connect();
      
      if (progress) {
        progress.succeed('Connected to databases');
      } else {
        console.log(chalk.green('✓ Connected to databases'));
      }
    } catch (error) {
      if (progress) {
        progress.fail('Failed to connect to databases');
      }
      console.error(chalk.red(`\nError: ${error.message}`));
      console.error(chalk.gray('Please check your database configuration and try again.'));
      process.exit(1);
    }

    // Display migration summary
    await displayMigrationSummary(options, connections);

    // Confirm migration
    const confirmed = await confirmMigration(options);
    if (!confirmed) {
      console.log(chalk.yellow('\nMigration cancelled by user.'));
      await connections.disconnect();
      process.exit(0);
    }

    // Close connections before migration (migration will create its own)
    await connections.disconnect();
    connections = null;

    console.log(''); // Add spacing

    // Run pre-migration validation
    if (!options.skipValidation) {
      console.log(chalk.bold.cyan('Running pre-migration validation...\n'));
      
      // Reconnect for validation
      const config = new MigrationConfig({
        sourceDatabase: options.sourceDb || process.env.MONGODB_URI,
        destinationDatabase: options.destDb || process.env.LICENSE_SERVER_MONGODB_URI
      });
      connections = new DatabaseConnections(config);
      await connections.connect();
      
      const validationResults = await runPreMigrationValidation(connections, {
        requiredSpaceGB: 1
      });
      
      // Display validation results
      console.log(formatValidationResults(validationResults));
      
      if (!validationResults.overall.valid) {
        console.error(chalk.bold.red('\n✗ Pre-migration validation failed!'));
        console.error(chalk.red('Please fix the issues above before running the migration.'));
        await connections.disconnect();
        process.exit(1);
      }
      
      console.log(chalk.bold.green('✓ Pre-migration validation passed!\n'));
      
      // Close connections again
      await connections.disconnect();
      connections = null;
    } else {
      console.log(chalk.yellow('⚠️  Skipping pre-migration validation (--skip-validation flag)\n'));
    }

    // Prepare migration options
    const migrationOptions = {
      dryRun: options.dryRun,
      batchSize: options.batchSize,
      backup: options.backup,
      validateBeforeMigration: options.validation,
      verifyAfterMigration: options.verification,
      sourceDatabase: options.sourceDb,
      destinationDatabase: options.destDb,
      verbose: options.verbose
    };

    // Execute migration with progress tracking
    let result;
    
    if (progress) {
      // Use progress indicators
      result = await migratePlatformData(migrationOptions);
    } else {
      // Use standard logging
      result = await migratePlatformData(migrationOptions);
    }

    // Run post-migration verification
    if (!options.dryRun && options.verification) {
      console.log(chalk.bold.cyan('\nRunning post-migration verification...\n'));
      
      // Reconnect for verification
      const config = new MigrationConfig({
        sourceDatabase: options.sourceDb || process.env.MONGODB_URI,
        destinationDatabase: options.destDb || process.env.LICENSE_SERVER_MONGODB_URI
      });
      connections = new DatabaseConnections(config);
      await connections.connect();
      
      const verificationResult = await runPostMigrationVerification(
        result,
        connections.getSourceDb(),
        connections.getDestinationDb(),
        {
          checkFieldValues: true,
          checkRelatedData: true,
          generateReport: true,
          reportDir: 'logs/migrations/reports',
          reportFormat: 'all'
        }
      );
      
      // Display verification summary
      console.log(formatVerificationSummary(verificationResult));
      
      // Update result with verification
      result.verification = verificationResult.verification;
      result.report = verificationResult.report;
      result.success = verificationResult.overall.success;
      
      await connections.disconnect();
      connections = null;
    } else if (options.dryRun) {
      console.log(chalk.yellow('\n⚠️  Skipping post-migration verification (dry-run mode)\n'));
    } else {
      console.log(chalk.yellow('\n⚠️  Skipping post-migration verification (--no-verification flag)\n'));
    }

    // Display results
    displayResults(result, options);

    // Exit with appropriate code
    process.exit(result.success ? 0 : 1);

  } catch (error) {
    console.log(''); // Add spacing
    console.error(chalk.bold.red('\n✗ Migration failed\n'));
    console.error(chalk.red(`Error: ${error.message}`));
    
    if (options && options.verbose && error.stack) {
      console.error(chalk.gray('\nStack trace:'));
      console.error(chalk.gray(error.stack));
    }

    // Display recovery instructions for critical errors
    if (error.name === 'CriticalMigrationError') {
      console.error(chalk.bold.yellow('\n⚠️  Critical Error - Manual Intervention Required\n'));
      console.error(chalk.yellow('The migration and automatic rollback both failed.'));
      console.error(chalk.yellow('Please check the logs and contact your database administrator.'));
      
      if (error.details && error.details.backupId) {
        console.error(chalk.yellow(`\nBackup ID: ${error.details.backupId}`));
        console.error(chalk.yellow('You may need to manually restore from this backup.'));
      }
    }

    process.exit(1);
  } finally {
    // Cleanup connections if still open
    if (connections) {
      try {
        await connections.disconnect();
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }
}

// Execute CLI
main();
