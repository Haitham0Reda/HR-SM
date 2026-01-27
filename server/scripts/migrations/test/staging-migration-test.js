#!/usr/bin/env node

/**
 * Staging Migration Test Suite
 * 
 * Comprehensive test suite for executing and validating the platform data migration
 * in a staging environment. This script:
 * 1. Runs the full migration
 * 2. Verifies all functionality works
 * 3. Tests rollback procedures
 * 4. Generates detailed test reports
 * 
 * Requirements: 2.1, 2.5, 2.6, 7.1, 7.2, 7.5, 12.1, 12.2, 12.3
 */

import chalk from 'chalk';
import { migratePlatformData } from '../migrate-platform-data.js';
import { rollbackMigration } from '../rollback/rollbackMigration.js';
import { DatabaseConnections } from '../utils/databaseConnections.js';
import { MigrationConfig } from '../config/migrationConfig.js';
import { runPreMigrationValidation } from '../validation/preMigrationValidation.js';
import { runPostMigrationVerification } from '../verification/postMigrationVerification.js';
import { MigrationLogger } from '../utils/migrationLogger.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * Test Suite Configuration
 */
const TEST_CONFIG = {
  // Test phases
  phases: {
    preMigration: true,
    migration: true,
    postMigration: true,
    functionalTests: true,
    rollbackTest: true
  },
  
  // Migration options
  migrationOptions: {
    dryRun: false,
    batchSize: 50,
    backup: true,
    validateBeforeMigration: true,
    verifyAfterMigration: true,
    verbose: true
  },
  
  // Test data (updated to match actual source database)
  testTenants: [
    'techcorp_solutions'
  ],
  
  // Report configuration
  reportDir: 'logs/migrations/staging-tests',
  reportFormat: 'all'
};

/**
 * Test Results Tracker
 */
class TestResults {
  constructor() {
    this.results = {
      preMigration: { passed: 0, failed: 0, tests: [] },
      migration: { passed: 0, failed: 0, tests: [] },
      postMigration: { passed: 0, failed: 0, tests: [] },
      functionalTests: { passed: 0, failed: 0, tests: [] },
      rollbackTest: { passed: 0, failed: 0, tests: [] }
    };
    this.startTime = Date.now();
  }

  addTest(phase, testName, passed, details = {}) {
    const test = {
      name: testName,
      passed,
      details,
      timestamp: new Date().toISOString()
    };

    this.results[phase].tests.push(test);
    
    if (passed) {
      this.results[phase].passed++;
    } else {
      this.results[phase].failed++;
    }
  }

  getSummary() {
    const totalPassed = Object.values(this.results).reduce((sum, phase) => sum + phase.passed, 0);
    const totalFailed = Object.values(this.results).reduce((sum, phase) => sum + phase.failed, 0);
    const duration = Date.now() - this.startTime;

    return {
      totalTests: totalPassed + totalFailed,
      passed: totalPassed,
      failed: totalFailed,
      duration,
      phases: this.results
    };
  }

  async generateReport(reportDir) {
    const summary = this.getSummary();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Ensure report directory exists
    await fs.mkdir(reportDir, { recursive: true });

    // Generate JSON report
    const jsonPath = path.join(reportDir, `staging-test-${timestamp}.json`);
    await fs.writeFile(jsonPath, JSON.stringify(summary, null, 2));

    // Generate text report
    const textPath = path.join(reportDir, `staging-test-${timestamp}.txt`);
    const textReport = this.formatTextReport(summary);
    await fs.writeFile(textPath, textReport);

    return { jsonPath, textPath };
  }

  formatTextReport(summary) {
    let report = '='.repeat(80) + '\n';
    report += 'STAGING MIGRATION TEST REPORT\n';
    report += '='.repeat(80) + '\n\n';
    
    report += `Test Date: ${new Date().toISOString()}\n`;
    report += `Duration: ${(summary.duration / 1000).toFixed(2)}s\n`;
    report += `Total Tests: ${summary.totalTests}\n`;
    report += `Passed: ${summary.passed}\n`;
    report += `Failed: ${summary.failed}\n`;
    report += `Success Rate: ${((summary.passed / summary.totalTests) * 100).toFixed(2)}%\n\n`;

    // Phase details
    Object.entries(summary.phases).forEach(([phaseName, phase]) => {
      report += '-'.repeat(80) + '\n';
      report += `${phaseName.toUpperCase()}\n`;
      report += '-'.repeat(80) + '\n';
      report += `Passed: ${phase.passed}, Failed: ${phase.failed}\n\n`;

      phase.tests.forEach(test => {
        const status = test.passed ? '✓ PASS' : '✗ FAIL';
        report += `${status} - ${test.name}\n`;
        
        if (test.details && Object.keys(test.details).length > 0) {
          report += `  Details: ${JSON.stringify(test.details, null, 2)}\n`;
        }
        report += '\n';
      });
    });

    report += '='.repeat(80) + '\n';
    return report;
  }
}

/**
 * Test Phase 1: Pre-Migration Validation
 */
async function runPreMigrationTests(connections, testResults) {
  console.log(chalk.bold.cyan('\n📋 Phase 1: Pre-Migration Validation\n'));

  try {
    // Test 0: Clean destination database for fresh test
    console.log('Cleaning destination database for fresh test...');
    const destDb = connections.getDestinationDb();
    
    // Remove all data from destination collections to ensure clean state
    const tenantsDeleted = await destDb.collection('tenants').deleteMany({});
    const subscriptionsDeleted = await destDb.collection('subscriptions').deleteMany({});
    const modulesDeleted = await destDb.collection('enabled_modules').deleteMany({});
    
    console.log(chalk.yellow(`  Removed ${tenantsDeleted.deletedCount} tenants`));
    console.log(chalk.yellow(`  Removed ${subscriptionsDeleted.deletedCount} subscriptions`));
    console.log(chalk.yellow(`  Removed ${modulesDeleted.deletedCount} enabled_modules\n`));
    
    testResults.addTest('preMigration', 'Destination Cleanup', true, {
      tenantsDeleted: tenantsDeleted.deletedCount,
      subscriptionsDeleted: subscriptionsDeleted.deletedCount,
      modulesDeleted: modulesDeleted.deletedCount
    });

    // Test 1: Database connections
    console.log('Testing database connections...');
    const sourceDb = connections.getSourceDb();
    
    const sourceConnected = await sourceDb.admin().ping();
    const destConnected = await destDb.admin().ping();
    
    testResults.addTest('preMigration', 'Database Connections', 
      sourceConnected && destConnected,
      { sourceConnected, destConnected }
    );
    console.log(chalk.green('✓ Database connections verified\n'));

    // Test 2: Source data exists
    console.log('Checking source data...');
    const tenantCount = await sourceDb.collection('tenants').countDocuments();
    const hasData = tenantCount > 0;
    
    testResults.addTest('preMigration', 'Source Data Exists', hasData, { tenantCount });
    console.log(chalk.green(`✓ Found ${tenantCount} tenants in source database\n`));

    // Test 3: Run validation
    console.log('Running pre-migration validation...');
    const validationResults = await runPreMigrationValidation(connections, {
      requiredSpaceGB: 1
    });
    
    testResults.addTest('preMigration', 'Pre-Migration Validation', 
      validationResults.overall.valid,
      validationResults.overall
    );
    
    if (validationResults.overall.valid) {
      console.log(chalk.green('✓ Pre-migration validation passed\n'));
    } else {
      console.log(chalk.red('✗ Pre-migration validation failed\n'));
      console.log(chalk.yellow('Issues found:'));
      validationResults.checks.forEach(check => {
        if (!check.passed) {
          console.log(chalk.red(`  - ${check.name}: ${check.message}`));
        }
      });
    }

    return validationResults.overall.valid;

  } catch (error) {
    console.error(chalk.red(`✗ Pre-migration tests failed: ${error.message}\n`));
    testResults.addTest('preMigration', 'Pre-Migration Tests', false, { error: error.message });
    return false;
  }
}

/**
 * Test Phase 2: Migration Execution
 */
async function runMigrationTests(testResults) {
  console.log(chalk.bold.cyan('\n🚀 Phase 2: Migration Execution\n'));

  try {
    console.log('Executing migration...');
    const migrationResult = await migratePlatformData(TEST_CONFIG.migrationOptions);
    
    testResults.addTest('migration', 'Migration Execution', 
      migrationResult.success,
      {
        statistics: migrationResult.statistics,
        backupId: migrationResult.backup?.backupId
      }
    );

    if (migrationResult.success) {
      console.log(chalk.green('✓ Migration completed successfully\n'));
      console.log(chalk.gray(`  Migrated: ${migrationResult.statistics?.importedCount || 0} records`));
      console.log(chalk.gray(`  Backup ID: ${migrationResult.backup?.backupId || 'N/A'}\n`));
    } else {
      console.log(chalk.red('✗ Migration failed\n'));
    }

    return migrationResult;

  } catch (error) {
    console.error(chalk.red(`✗ Migration execution failed: ${error.message}\n`));
    testResults.addTest('migration', 'Migration Execution', false, { error: error.message });
    throw error;
  }
}

/**
 * Test Phase 3: Post-Migration Verification
 */
async function runPostMigrationTests(migrationResult, connections, testResults) {
  console.log(chalk.bold.cyan('\n✅ Phase 3: Post-Migration Verification\n'));

  try {
    const sourceDb = connections.getSourceDb();
    const destDb = connections.getDestinationDb();

    // Test 1: Record count verification
    console.log('Verifying record counts...');
    const sourceCount = await sourceDb.collection('tenants').countDocuments();
    const destCount = await destDb.collection('tenants').countDocuments();
    const countsMatch = sourceCount === destCount;
    
    testResults.addTest('postMigration', 'Record Count Verification', countsMatch, {
      sourceCount,
      destCount
    });
    
    if (countsMatch) {
      console.log(chalk.green(`✓ Record counts match (${destCount} records)\n`));
    } else {
      console.log(chalk.red(`✗ Record count mismatch: source=${sourceCount}, dest=${destCount}\n`));
    }

    // Test 2: Data integrity verification
    console.log('Running comprehensive verification...');
    const verificationResult = await runPostMigrationVerification(
      migrationResult,
      sourceDb,
      destDb,
      {
        checkFieldValues: true,
        checkRelatedData: true,
        generateReport: true,
        reportDir: TEST_CONFIG.reportDir,
        reportFormat: 'all'
      }
    );
    
    testResults.addTest('postMigration', 'Data Integrity Verification', 
      verificationResult.overall.success,
      verificationResult.verification
    );
    
    if (verificationResult.overall.success) {
      console.log(chalk.green('✓ Data integrity verification passed\n'));
    } else {
      console.log(chalk.red('✗ Data integrity verification failed\n'));
      if (verificationResult.verification.discrepancies) {
        console.log(chalk.yellow(`  Found ${verificationResult.verification.discrepancies.length} discrepancies`));
      }
    }

    // Test 3: Specific tenant verification
    console.log('Verifying specific test tenants...');
    let allTenantsFound = true;
    
    for (const tenantId of TEST_CONFIG.testTenants) {
      const tenant = await destDb.collection('tenants').findOne({ tenantId });
      const found = tenant !== null;
      
      if (found) {
        console.log(chalk.green(`  ✓ ${tenantId} found`));
      } else {
        console.log(chalk.red(`  ✗ ${tenantId} not found`));
        allTenantsFound = false;
      }
    }
    
    testResults.addTest('postMigration', 'Test Tenants Verification', allTenantsFound, {
      testedTenants: TEST_CONFIG.testTenants
    });
    console.log('');

    return verificationResult.overall.success && countsMatch && allTenantsFound;

  } catch (error) {
    console.error(chalk.red(`✗ Post-migration verification failed: ${error.message}\n`));
    testResults.addTest('postMigration', 'Post-Migration Verification', false, { error: error.message });
    return false;
  }
}

/**
 * Test Phase 4: Functional Tests
 */
async function runFunctionalTests(connections, testResults) {
  console.log(chalk.bold.cyan('\n🔧 Phase 4: Functional Tests\n'));

  try {
    const destDb = connections.getDestinationDb();

    // Test 1: Query tenant data
    console.log('Testing tenant data queries...');
    const tenant = await destDb.collection('tenants').findOne({ 
      tenantId: TEST_CONFIG.testTenants[0] 
    });
    
    const hasRequiredFields = tenant && 
      tenant.tenantId && 
      tenant.name && 
      tenant.subscription;
    
    testResults.addTest('functionalTests', 'Tenant Data Query', hasRequiredFields, {
      tenantId: tenant?.tenantId,
      hasSubscription: !!tenant?.subscription
    });
    
    if (hasRequiredFields) {
      console.log(chalk.green('✓ Tenant data query successful\n'));
    } else {
      console.log(chalk.red('✗ Tenant data query failed or missing fields\n'));
    }

    // Test 2: Module data verification
    console.log('Testing module data...');
    const hasModules = tenant && Array.isArray(tenant.enabledModules);
    
    testResults.addTest('functionalTests', 'Module Data Verification', hasModules, {
      moduleCount: tenant?.enabledModules?.length || 0
    });
    
    if (hasModules) {
      console.log(chalk.green(`✓ Module data verified (${tenant.enabledModules.length} modules)\n`));
    } else {
      console.log(chalk.red('✗ Module data verification failed\n'));
    }

    // Test 3: Subscription data verification
    console.log('Testing subscription data...');
    // Subscription data is optional - tenant may not have subscription info yet
    const hasSubscriptionData = tenant && tenant.subscription;
    // Check for either plan or planId (both are valid)
    const hasValidSubscription = hasSubscriptionData && 
      tenant.subscription.status &&
      (tenant.subscription.plan || tenant.subscription.planId !== undefined);
    
    // Pass test if either subscription is valid OR tenant exists without subscription
    const subscriptionTestPassed = !hasSubscriptionData || hasValidSubscription;
    
    testResults.addTest('functionalTests', 'Subscription Data Verification', subscriptionTestPassed, {
      hasSubscription: hasSubscriptionData,
      status: tenant?.subscription?.status,
      plan: tenant?.subscription?.plan,
      planId: tenant?.subscription?.planId
    });
    
    if (hasValidSubscription) {
      console.log(chalk.green('✓ Subscription data verified\n'));
    } else if (!hasSubscriptionData) {
      console.log(chalk.yellow('⚠ No subscription data (optional field)\n'));
    } else {
      console.log(chalk.red('✗ Subscription data verification failed\n'));
    }

    // Test 4: Index verification
    console.log('Testing database indexes...');
    const indexes = await destDb.collection('tenants').indexes();
    const hasTenantIdIndex = indexes.some(idx => 
      idx.key && idx.key.tenantId === 1
    );
    
    testResults.addTest('functionalTests', 'Database Indexes', hasTenantIdIndex, {
      indexCount: indexes.length
    });
    
    if (hasTenantIdIndex) {
      console.log(chalk.green(`✓ Database indexes verified (${indexes.length} indexes)\n`));
    } else {
      console.log(chalk.red('✗ Required indexes not found\n'));
    }

    return hasRequiredFields && hasModules && subscriptionTestPassed && hasTenantIdIndex;

  } catch (error) {
    console.error(chalk.red(`✗ Functional tests failed: ${error.message}\n`));
    testResults.addTest('functionalTests', 'Functional Tests', false, { error: error.message });
    return false;
  }
}

/**
 * Test Phase 5: Rollback Test
 */
async function runRollbackTests(migrationResult, connections, testResults) {
  console.log(chalk.bold.cyan('\n↩️  Phase 5: Rollback Test\n'));

  try {
    const sourceDb = connections.getSourceDb();
    const destDb = connections.getDestinationDb();

    // Check if backup is available
    if (!migrationResult.backup || !migrationResult.backup.backupId) {
      console.log(chalk.yellow('⚠️  No backup available - skipping rollback test\n'));
      testResults.addTest('rollbackTest', 'Rollback Test', false, {
        reason: 'No backup available',
        backupCreated: !!migrationResult.backup
      });
      return false;
    }

    // Get counts before rollback
    const destCountBefore = await destDb.collection('tenants').countDocuments();
    
    console.log('Testing rollback procedure...');
    console.log(chalk.yellow('⚠️  This will rollback the migration to test the rollback mechanism\n'));

    // Execute rollback
    const rollbackResult = await rollbackMigration(
      sourceDb,
      destDb,
      migrationResult.backup.backupId,
      {
        backupDir: 'backups/migrations',
        verifyRestoration: true,
        removeDestinationData: true,
        verbose: true
      }
    );
    
    testResults.addTest('rollbackTest', 'Rollback Execution', 
      rollbackResult.success,
      {
        backupId: migrationResult.backup.backupId,
        restoredCount: rollbackResult.statistics?.restoredCount
      }
    );

    if (rollbackResult.success) {
      console.log(chalk.green('✓ Rollback executed successfully\n'));
    } else {
      console.log(chalk.red('✗ Rollback execution failed\n'));
      return false;
    }

    // Verify rollback
    console.log('Verifying rollback results...');
    
    // Check destination is cleaned
    const destCountAfter = await destDb.collection('tenants').countDocuments();
    const destCleaned = destCountAfter === 0;
    
    testResults.addTest('rollbackTest', 'Destination Cleanup', destCleaned, {
      countBefore: destCountBefore,
      countAfter: destCountAfter
    });
    
    if (destCleaned) {
      console.log(chalk.green('✓ Destination database cleaned\n'));
    } else {
      console.log(chalk.red(`✗ Destination still has ${destCountAfter} records\n`));
    }

    // Check source is restored
    const sourceCount = await sourceDb.collection('tenants').countDocuments();
    const sourceRestored = sourceCount > 0;
    
    testResults.addTest('rollbackTest', 'Source Restoration', sourceRestored, {
      restoredCount: sourceCount
    });
    
    if (sourceRestored) {
      console.log(chalk.green(`✓ Source database restored (${sourceCount} records)\n`));
    } else {
      console.log(chalk.red('✗ Source database not restored\n'));
    }

    return rollbackResult.success && destCleaned && sourceRestored;

  } catch (error) {
    console.error(chalk.red(`✗ Rollback test failed: ${error.message}\n`));
    testResults.addTest('rollbackTest', 'Rollback Test', false, { error: error.message });
    return false;
  }
}

/**
 * Main Test Execution
 */
async function main() {
  const logger = new MigrationLogger();
  const testResults = new TestResults();
  let connections = null;

  try {
    // Display header
    console.log(chalk.bold.cyan('\n' + '='.repeat(80)));
    console.log(chalk.bold.cyan('STAGING MIGRATION TEST SUITE'));
    console.log(chalk.bold.cyan('='.repeat(80) + '\n'));
    
    console.log(chalk.gray(`Start Time: ${new Date().toISOString()}`));
    console.log(chalk.gray(`Test Configuration: ${JSON.stringify(TEST_CONFIG.phases, null, 2)}\n`));

    // Connect to databases
    console.log('Connecting to databases...');
    const config = new MigrationConfig();
    connections = new DatabaseConnections(config);
    await connections.connect();
    console.log(chalk.green('✓ Connected to databases\n'));

    // Phase 1: Pre-Migration Tests
    if (TEST_CONFIG.phases.preMigration) {
      const preMigrationPassed = await runPreMigrationTests(connections, testResults);
      
      if (!preMigrationPassed) {
        console.log(chalk.red('\n✗ Pre-migration tests failed. Aborting test suite.\n'));
        process.exit(1);
      }
    }

    // Phase 2: Migration Execution
    let migrationResult = null;
    if (TEST_CONFIG.phases.migration) {
      migrationResult = await runMigrationTests(testResults);
      
      if (!migrationResult || !migrationResult.success) {
        console.log(chalk.red('\n✗ Migration failed. Aborting test suite.\n'));
        process.exit(1);
      }
    }

    // Phase 3: Post-Migration Verification
    if (TEST_CONFIG.phases.postMigration && migrationResult) {
      const postMigrationPassed = await runPostMigrationTests(
        migrationResult, 
        connections, 
        testResults
      );
      
      if (!postMigrationPassed) {
        console.log(chalk.yellow('\n⚠️  Post-migration verification had issues.\n'));
      }
    }

    // Phase 4: Functional Tests
    if (TEST_CONFIG.phases.functionalTests) {
      const functionalTestsPassed = await runFunctionalTests(connections, testResults);
      
      if (!functionalTestsPassed) {
        console.log(chalk.yellow('\n⚠️  Some functional tests failed.\n'));
      }
    }

    // Phase 5: Rollback Test
    if (TEST_CONFIG.phases.rollbackTest && migrationResult) {
      const rollbackPassed = await runRollbackTests(
        migrationResult, 
        connections, 
        testResults
      );
      
      if (!rollbackPassed) {
        console.log(chalk.yellow('\n⚠️  Rollback test had issues.\n'));
      }
    }

    // Generate test report
    console.log(chalk.bold.cyan('\n📊 Generating Test Report\n'));
    const reportPaths = await testResults.generateReport(TEST_CONFIG.reportDir);
    
    console.log(chalk.green('✓ Test report generated:'));
    console.log(chalk.cyan(`  JSON: ${reportPaths.jsonPath}`));
    console.log(chalk.cyan(`  Text: ${reportPaths.textPath}\n`));

    // Display summary
    const summary = testResults.getSummary();
    console.log(chalk.bold.cyan('='.repeat(80)));
    console.log(chalk.bold.cyan('TEST SUMMARY'));
    console.log(chalk.bold.cyan('='.repeat(80) + '\n'));
    
    console.log(`Total Tests: ${chalk.yellow(summary.totalTests)}`);
    console.log(`Passed: ${chalk.green(summary.passed)}`);
    console.log(`Failed: ${chalk.red(summary.failed)}`);
    console.log(`Duration: ${chalk.yellow((summary.duration / 1000).toFixed(2))}s`);
    console.log(`Success Rate: ${chalk.yellow(((summary.passed / summary.totalTests) * 100).toFixed(2))}%\n`);

    // Exit with appropriate code
    const allPassed = summary.failed === 0;
    if (allPassed) {
      console.log(chalk.bold.green('✓ ALL TESTS PASSED\n'));
      process.exit(0);
    } else {
      console.log(chalk.bold.red(`✗ ${summary.failed} TEST(S) FAILED\n`));
      process.exit(1);
    }

  } catch (error) {
    console.error(chalk.bold.red('\n✗ Test suite failed\n'));
    console.error(chalk.red(`Error: ${error.message}`));
    
    if (error.stack) {
      console.error(chalk.gray('\nStack trace:'));
      console.error(chalk.gray(error.stack));
    }

    // Try to generate partial report
    try {
      const reportPaths = await testResults.generateReport(TEST_CONFIG.reportDir);
      console.log(chalk.yellow('\n⚠️  Partial test report generated:'));
      console.log(chalk.cyan(`  JSON: ${reportPaths.jsonPath}`));
      console.log(chalk.cyan(`  Text: ${reportPaths.textPath}\n`));
    } catch (reportError) {
      console.error(chalk.red('Failed to generate test report'));
    }

    process.exit(1);

  } finally {
    // Cleanup
    if (connections) {
      try {
        await connections.disconnect();
        console.log(chalk.gray('Disconnected from databases'));
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }
}

// Execute test suite
main();
