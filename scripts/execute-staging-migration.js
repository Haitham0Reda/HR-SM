#!/usr/bin/env node

/**
 * Staging Migration Execution Script
 * 
 * This script orchestrates the complete staging environment migration from MongoDB to PostgreSQL.
 * It runs all migration steps, validates results, and generates a comprehensive report.
 * 
 * Usage:
 *   node scripts/execute-staging-migration.js [options]
 * 
 * Options:
 *   --skip-backup       Skip MongoDB backup (NOT RECOMMENDED)
 *   --skip-tests        Skip automated tests
 *   --skip-validation   Skip data validation
 *   --dry-run          Simulate migration without making changes
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class StagingMigrationExecutor {
  constructor(options = {}) {
    this.options = {
      skipBackup: options.skipBackup || false,
      skipTests: options.skipTests || false,
      skipValidation: options.skipValidation || false,
      dryRun: options.dryRun || false
    };

    this.results = {
      startTime: new Date(),
      endTime: null,
      steps: [],
      errors: [],
      warnings: [],
      success: false
    };

    this.logFile = `staging-migration-${Date.now()}.log`;
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    
    console.log(logMessage);
    fs.appendFileSync(this.logFile, logMessage + '\n');
  }

  logStep(stepName, status, details = '') {
    this.results.steps.push({
      name: stepName,
      status,
      details,
      timestamp: new Date()
    });

    const icon = status === 'SUCCESS' ? '✓' : status === 'FAILED' ? '✗' : '⚠';
    this.log(`${icon} ${stepName}: ${status}${details ? ' - ' + details : ''}`, status === 'FAILED' ? 'ERROR' : 'INFO');
  }

  async executeCommand(command, description) {
    this.log(`Executing: ${description}`);
    
    if (this.options.dryRun) {
      this.log(`[DRY RUN] Would execute: ${command}`, 'INFO');
      return { stdout: '', stderr: '', success: true };
    }

    try {
      const output = execSync(command, {
        encoding: 'utf8',
        stdio: 'pipe',
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      });
      
      return { stdout: output, stderr: '', success: true };
    } catch (error) {
      return {
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
        success: false,
        error
      };
    }
  }

  async checkPrerequisites() {
    this.log('=== Step 1: Checking Prerequisites ===');

    // Check Node.js version
    const nodeVersion = process.version;
    this.log(`Node.js version: ${nodeVersion}`);
    
    if (parseInt(nodeVersion.slice(1).split('.')[0]) < 14) {
      this.logStep('Node.js Version Check', 'FAILED', 'Node.js 14+ required');
      return false;
    }
    this.logStep('Node.js Version Check', 'SUCCESS');

    // Check PostgreSQL
    const pgCheck = await this.executeCommand('psql --version', 'Check PostgreSQL');
    if (!pgCheck.success) {
      this.logStep('PostgreSQL Check', 'FAILED', 'PostgreSQL not found');
      return false;
    }
    this.logStep('PostgreSQL Check', 'SUCCESS', pgCheck.stdout.trim());

    // Check MongoDB
    const mongoCheck = await this.executeCommand('mongosh --version', 'Check MongoDB');
    if (!mongoCheck.success) {
      this.logStep('MongoDB Check', 'FAILED', 'MongoDB not found');
      return false;
    }
    this.logStep('MongoDB Check', 'SUCCESS');

    // Check environment variables
    const requiredEnvVars = [
      'LICENSE_DATABASE_URL',
      'MAIN_DATABASE_URL',
      'MONGODB_URI'
    ];

    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        this.logStep('Environment Variables', 'FAILED', `Missing ${envVar}`);
        return false;
      }
    }
    this.logStep('Environment Variables', 'SUCCESS');

    // Check migration scripts exist
    const requiredScripts = [
      'scripts/migrate-mongo-to-postgres.js',
      'scripts/validate-migration.js',
      'scripts/create-performance-indexes.js'
    ];

    for (const script of requiredScripts) {
      if (!fs.existsSync(script)) {
        this.logStep('Migration Scripts', 'FAILED', `Missing ${script}`);
        return false;
      }
    }
    this.logStep('Migration Scripts', 'SUCCESS');

    return true;
  }

  async backupMongoDB() {
    if (this.options.skipBackup) {
      this.log('=== Step 2: Backup MongoDB (SKIPPED) ===');
      this.results.warnings.push('MongoDB backup was skipped');
      return true;
    }

    this.log('=== Step 2: Backup MongoDB ===');

    const backupDir = `backups/staging-mongo-${Date.now()}`;
    const command = `mongodump --uri="${process.env.MONGODB_URI}" --out="${backupDir}"`;

    const result = await this.executeCommand(command, 'Backup MongoDB');
    
    if (!result.success) {
      this.logStep('MongoDB Backup', 'FAILED', result.stderr);
      return false;
    }

    this.logStep('MongoDB Backup', 'SUCCESS', `Saved to ${backupDir}`);
    return true;
  }

  async createPostgreSQLDatabases() {
    this.log('=== Step 3: Create PostgreSQL Databases ===');

    // Check if databases already exist
    const checkCmd = `psql "${process.env.MAIN_DATABASE_URL}" -c "SELECT 1"`;
    const checkResult = await this.executeCommand(checkCmd, 'Check database exists');

    if (checkResult.success) {
      this.logStep('PostgreSQL Databases', 'SUCCESS', 'Databases already exist');
      return true;
    }

    this.log('Databases need to be created manually. Please run:');
    this.log('  CREATE DATABASE "hrsm-licenses";');
    this.log('  CREATE DATABASE "hrsm_platform";');
    
    this.logStep('PostgreSQL Databases', 'WARNING', 'Manual creation required');
    return true;
  }

  async runDatabaseMigrations() {
    this.log('=== Step 4: Run Database Migrations ===');

    const migrations = [
      { file: 'migrations/001-create-license-tables.sql', db: 'LICENSE_DATABASE_URL' },
      { file: 'migrations/002-create-main-tables.sql', db: 'MAIN_DATABASE_URL' },
      { file: 'migrations/003-create-indexes.sql', db: 'MAIN_DATABASE_URL' }
    ];

    for (const migration of migrations) {
      if (!fs.existsSync(migration.file)) {
        this.log(`Migration file not found: ${migration.file}`, 'WARNING');
        continue;
      }

      const command = `psql "${process.env[migration.db]}" -f "${migration.file}"`;
      const result = await this.executeCommand(command, `Run ${migration.file}`);

      if (!result.success) {
        this.logStep(`Migration: ${migration.file}`, 'FAILED', result.stderr);
        return false;
      }

      this.logStep(`Migration: ${migration.file}`, 'SUCCESS');
    }

    return true;
  }

  async runDataMigration() {
    this.log('=== Step 5: Run Data Migration ===');
    this.log('This may take several hours depending on data size...');

    const command = 'node scripts/migrate-mongo-to-postgres.js';
    const result = await this.executeCommand(command, 'Migrate data from MongoDB to PostgreSQL');

    if (!result.success) {
      this.logStep('Data Migration', 'FAILED', result.stderr);
      this.results.errors.push({
        step: 'Data Migration',
        error: result.stderr
      });
      return false;
    }

    // Parse migration output for statistics
    const stats = this.parseMigrationOutput(result.stdout);
    this.logStep('Data Migration', 'SUCCESS', `Migrated ${stats.totalRecords} records`);
    
    return true;
  }

  parseMigrationOutput(output) {
    // Extract statistics from migration output
    const stats = {
      totalRecords: 0,
      collections: 0,
      errors: 0
    };

    const totalMatch = output.match(/Migrated:\s*(\d+)/);
    if (totalMatch) {
      stats.totalRecords = parseInt(totalMatch[1]);
    }

    return stats;
  }

  async validateMigration() {
    if (this.options.skipValidation) {
      this.log('=== Step 6: Validate Migration (SKIPPED) ===');
      this.results.warnings.push('Migration validation was skipped');
      return true;
    }

    this.log('=== Step 6: Validate Migration ===');

    const command = 'node scripts/validate-migration.js';
    const result = await this.executeCommand(command, 'Validate migrated data');

    if (!result.success) {
      this.logStep('Data Validation', 'FAILED', result.stderr);
      this.results.errors.push({
        step: 'Data Validation',
        error: result.stderr
      });
      return false;
    }

    // Check if validation found discrepancies
    if (result.stdout.includes('discrepancies found') || result.stdout.includes('FAIL')) {
      this.logStep('Data Validation', 'FAILED', 'Discrepancies found');
      this.results.errors.push({
        step: 'Data Validation',
        error: 'Data discrepancies detected'
      });
      return false;
    }

    this.logStep('Data Validation', 'SUCCESS');
    return true;
  }

  async createPerformanceIndexes() {
    this.log('=== Step 7: Create Performance Indexes ===');

    const command = 'node scripts/create-performance-indexes.js';
    const result = await this.executeCommand(command, 'Create performance indexes');

    if (!result.success) {
      this.logStep('Performance Indexes', 'FAILED', result.stderr);
      return false;
    }

    this.logStep('Performance Indexes', 'SUCCESS');
    return true;
  }

  async runTests() {
    if (this.options.skipTests) {
      this.log('=== Step 8: Run Tests (SKIPPED) ===');
      this.results.warnings.push('Automated tests were skipped');
      return true;
    }

    this.log('=== Step 8: Run Automated Tests ===');

    // Run unit tests
    this.log('Running unit tests...');
    const unitTests = await this.executeCommand('npm test', 'Run unit tests');
    
    if (!unitTests.success) {
      this.logStep('Unit Tests', 'FAILED', 'Some tests failed');
      this.results.errors.push({
        step: 'Unit Tests',
        error: 'Test failures detected'
      });
      return false;
    }
    this.logStep('Unit Tests', 'SUCCESS');

    // Run integration tests
    this.log('Running integration tests...');
    const integrationTests = await this.executeCommand('npm run test:integration', 'Run integration tests');
    
    if (!integrationTests.success) {
      this.logStep('Integration Tests', 'FAILED', 'Some tests failed');
      this.results.errors.push({
        step: 'Integration Tests',
        error: 'Test failures detected'
      });
      return false;
    }
    this.logStep('Integration Tests', 'SUCCESS');

    return true;
  }

  async verifyLicenseValidation() {
    this.log('=== Step 9: Verify License Validation ===');

    // This would require the application to be running
    // For now, we'll just check that the license validation test passes
    
    const command = 'npm test -- test/integration/license-validation.postgres.test.js';
    const result = await this.executeCommand(command, 'Test license validation');

    if (!result.success) {
      this.logStep('License Validation', 'FAILED', result.stderr);
      return false;
    }

    this.logStep('License Validation', 'SUCCESS');
    return true;
  }

  async testPerformance() {
    this.log('=== Step 10: Test Performance ===');

    const command = 'node scripts/verify-postgresql-functionality.js --performance';
    const result = await this.executeCommand(command, 'Run performance tests');

    if (!result.success) {
      this.logStep('Performance Tests', 'WARNING', 'Some performance issues detected');
      this.results.warnings.push('Performance tests showed issues');
      return true; // Don't fail on performance warnings
    }

    this.logStep('Performance Tests', 'SUCCESS');
    return true;
  }

  generateReport() {
    this.results.endTime = new Date();
    const duration = (this.results.endTime - this.results.startTime) / 1000 / 60; // minutes

    const report = `
# Staging Migration Execution Report

## Summary
- **Start Time**: ${this.results.startTime.toISOString()}
- **End Time**: ${this.results.endTime.toISOString()}
- **Duration**: ${duration.toFixed(2)} minutes
- **Status**: ${this.results.success ? '✅ SUCCESS' : '❌ FAILED'}
- **Errors**: ${this.results.errors.length}
- **Warnings**: ${this.results.warnings.length}

## Execution Steps

${this.results.steps.map(step => {
  const icon = step.status === 'SUCCESS' ? '✅' : step.status === 'FAILED' ? '❌' : '⚠️';
  return `${icon} **${step.name}**: ${step.status}${step.details ? ` - ${step.details}` : ''}`;
}).join('\n')}

## Errors

${this.results.errors.length === 0 ? 'No errors encountered.' : this.results.errors.map((err, i) => `
${i + 1}. **${err.step}**
   \`\`\`
   ${err.error}
   \`\`\`
`).join('\n')}

## Warnings

${this.results.warnings.length === 0 ? 'No warnings.' : this.results.warnings.map((warn, i) => `${i + 1}. ${warn}`).join('\n')}

## Next Steps

${this.results.success ? `
✅ Staging migration completed successfully!

**Recommended Actions:**
1. Review the full log file: ${this.logFile}
2. Perform manual functional testing using staging-test-checklist.md
3. Monitor application performance for 24-48 hours
4. Document any issues or observations
5. Get stakeholder approval for production migration
6. Schedule production migration window

**Manual Testing Required:**
- Complete the checklist in staging-test-checklist.md
- Test all critical user workflows
- Verify multi-tenancy isolation
- Test license validation flows
- Verify backup and restore procedures

` : `
❌ Staging migration encountered errors.

**Required Actions:**
1. Review errors above and in log file: ${this.logFile}
2. Fix identified issues
3. Re-run migration: node scripts/execute-staging-migration.js
4. If issues persist, consult POSTGRESQL_TROUBLESHOOTING.md
5. Consider rollback if issues are critical

**Rollback Procedure:**
If you need to rollback to MongoDB:
\`\`\`bash
node scripts/test-rollback-procedures.js --execute
node scripts/verify-rollback-success.js
\`\`\`
`}

## Log File

Full execution log: ${this.logFile}

---
Generated: ${new Date().toISOString()}
`;

    const reportFile = `staging-migration-report-${Date.now()}.md`;
    fs.writeFileSync(reportFile, report);

    this.log(`\n${'='.repeat(80)}`);
    this.log(report);
    this.log(`${'='.repeat(80)}\n`);
    this.log(`Report saved to: ${reportFile}`);

    return reportFile;
  }

  async execute() {
    try {
      this.log('╔════════════════════════════════════════════════════════════════╗');
      this.log('║   STAGING ENVIRONMENT MIGRATION EXECUTION                      ║');
      this.log('║   MongoDB → PostgreSQL                                         ║');
      this.log('╚════════════════════════════════════════════════════════════════╝');
      this.log('');

      if (this.options.dryRun) {
        this.log('⚠️  DRY RUN MODE - No changes will be made', 'WARNING');
      }

      // Execute migration steps
      const steps = [
        { name: 'Prerequisites', fn: () => this.checkPrerequisites() },
        { name: 'Backup', fn: () => this.backupMongoDB() },
        { name: 'Create Databases', fn: () => this.createPostgreSQLDatabases() },
        { name: 'Database Migrations', fn: () => this.runDatabaseMigrations() },
        { name: 'Data Migration', fn: () => this.runDataMigration() },
        { name: 'Validation', fn: () => this.validateMigration() },
        { name: 'Performance Indexes', fn: () => this.createPerformanceIndexes() },
        { name: 'Tests', fn: () => this.runTests() },
        { name: 'License Validation', fn: () => this.verifyLicenseValidation() },
        { name: 'Performance', fn: () => this.testPerformance() }
      ];

      for (const step of steps) {
        const success = await step.fn();
        
        if (!success) {
          this.log(`\n❌ Migration failed at step: ${step.name}`, 'ERROR');
          this.results.success = false;
          break;
        }
      }

      if (this.results.errors.length === 0) {
        this.results.success = true;
        this.log('\n✅ Staging migration completed successfully!', 'INFO');
      }

      // Generate report
      const reportFile = this.generateReport();

      return {
        success: this.results.success,
        reportFile,
        logFile: this.logFile
      };

    } catch (error) {
      this.log(`Fatal error: ${error.message}`, 'ERROR');
      this.results.success = false;
      this.results.errors.push({
        step: 'Execution',
        error: error.message
      });
      
      this.generateReport();
      throw error;
    }
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    skipBackup: args.includes('--skip-backup'),
    skipTests: args.includes('--skip-tests'),
    skipValidation: args.includes('--skip-validation'),
    dryRun: args.includes('--dry-run')
  };

  const executor = new StagingMigrationExecutor(options);
  
  executor.execute()
    .then(result => {
      console.log(`\nExecution complete. Report: ${result.reportFile}`);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Execution failed:', error);
      process.exit(1);
    });
}

module.exports = StagingMigrationExecutor;
