/**
 * Database Connection Test Script
 * 
 * Tests connectivity to both PostgreSQL databases:
 * 1. License Server Database (hrsm-licenses)
 * 2. Main Application Database (hrsm_platform)
 * 
 * This script verifies:
 * - Database authentication
 * - Connection pool configuration
 * - Health check functionality
 * - Graceful error handling
 */

import { connectDatabases, checkDatabaseHealth, licenseServerDb, mainAppDb } from '../config/database.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// ANSI color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    blue: '\x1b[34m'
};

/**
 * Print formatted header
 */
function printHeader(title) {
    console.log('\n' + colors.bright + colors.cyan + '='.repeat(70) + colors.reset);
    console.log(colors.bright + colors.cyan + title.toUpperCase() + colors.reset);
    console.log(colors.bright + colors.cyan + '='.repeat(70) + colors.reset + '\n');
}

/**
 * Print success message
 */
function printSuccess(message) {
    console.log(colors.green + '✓ ' + message + colors.reset);
}

/**
 * Print error message
 */
function printError(message) {
    console.log(colors.red + '✗ ' + message + colors.reset);
}

/**
 * Print info message
 */
function printInfo(message) {
    console.log(colors.blue + 'ℹ ' + message + colors.reset);
}

/**
 * Print warning message
 */
function printWarning(message) {
    console.log(colors.yellow + '⚠ ' + message + colors.reset);
}

/**
 * Test basic database connection
 */
async function testBasicConnection() {
    printHeader('Test 1: Basic Database Connection');

    try {
        await connectDatabases();
        printSuccess('Both databases connected successfully');
        return true;
    } catch (error) {
        printError(`Connection failed: ${error.message}`);
        return false;
    }
}

/**
 * Test database authentication
 */
async function testAuthentication() {
    printHeader('Test 2: Database Authentication');

    let licenseServerAuth = false;
    let mainAppAuth = false;

    // Test License Server Database
    try {
        await licenseServerDb.authenticate();
        printSuccess('License Server Database authenticated');
        licenseServerAuth = true;
    } catch (error) {
        printError(`License Server authentication failed: ${error.message}`);
    }

    // Test Main Application Database
    try {
        await mainAppDb.authenticate();
        printSuccess('Main Application Database authenticated');
        mainAppAuth = true;
    } catch (error) {
        printError(`Main Application authentication failed: ${error.message}`);
    }

    return licenseServerAuth && mainAppAuth;
}

/**
 * Test connection pool configuration
 */
async function testConnectionPool() {
    printHeader('Test 3: Connection Pool Configuration');

    try {
        // License Server Database Pool
        printInfo('License Server Database Pool:');
        console.log(`  Max connections: ${licenseServerDb.config.pool.max}`);
        console.log(`  Min connections: ${licenseServerDb.config.pool.min}`);
        console.log(`  Acquire timeout: ${licenseServerDb.config.pool.acquire}ms`);
        console.log(`  Idle timeout: ${licenseServerDb.config.pool.idle}ms`);
        
        // Main Application Database Pool
        printInfo('\nMain Application Database Pool:');
        console.log(`  Max connections: ${mainAppDb.config.pool.max}`);
        console.log(`  Min connections: ${mainAppDb.config.pool.min}`);
        console.log(`  Acquire timeout: ${mainAppDb.config.pool.acquire}ms`);
        console.log(`  Idle timeout: ${mainAppDb.config.pool.idle}ms`);

        printSuccess('Connection pool configuration verified');
        return true;
    } catch (error) {
        printError(`Pool configuration check failed: ${error.message}`);
        return false;
    }
}

/**
 * Test database health check
 */
async function testHealthCheck() {
    printHeader('Test 4: Database Health Check');

    try {
        const health = await checkDatabaseHealth();

        printInfo('License Server Database:');
        console.log(`  Status: ${health.licenseServer.status}`);
        if (health.licenseServer.status === 'healthy') {
            console.log(`  Host: ${health.licenseServer.host}`);
            console.log(`  Database: ${health.licenseServer.database}`);
            console.log(`  Pool size: ${health.licenseServer.poolSize}`);
            console.log(`  Available connections: ${health.licenseServer.poolAvailable}`);
        } else {
            console.log(`  Error: ${health.licenseServer.error}`);
        }

        printInfo('\nMain Application Database:');
        console.log(`  Status: ${health.mainApp.status}`);
        if (health.mainApp.status === 'healthy') {
            console.log(`  Host: ${health.mainApp.host}`);
            console.log(`  Database: ${health.mainApp.database}`);
            console.log(`  Pool size: ${health.mainApp.poolSize}`);
            console.log(`  Available connections: ${health.mainApp.poolAvailable}`);
        } else {
            console.log(`  Error: ${health.mainApp.error}`);
        }

        printInfo(`\nOverall Status: ${health.overall}`);

        if (health.overall === 'healthy') {
            printSuccess('Health check passed');
            return true;
        } else {
            printError('Health check failed');
            return false;
        }
    } catch (error) {
        printError(`Health check failed: ${error.message}`);
        return false;
    }
}

/**
 * Test simple query execution
 */
async function testQueryExecution() {
    printHeader('Test 5: Query Execution');

    let licenseServerQuery = false;
    let mainAppQuery = false;

    // Test License Server Database query
    try {
        const [results] = await licenseServerDb.query('SELECT NOW() as current_time, version() as pg_version');
        printSuccess('License Server Database query executed');
        console.log(`  Current time: ${results[0].current_time}`);
        console.log(`  PostgreSQL version: ${results[0].pg_version.split(' ')[0]} ${results[0].pg_version.split(' ')[1]}`);
        licenseServerQuery = true;
    } catch (error) {
        printError(`License Server query failed: ${error.message}`);
    }

    // Test Main Application Database query
    try {
        const [results] = await mainAppDb.query('SELECT NOW() as current_time, version() as pg_version');
        printSuccess('Main Application Database query executed');
        console.log(`  Current time: ${results[0].current_time}`);
        console.log(`  PostgreSQL version: ${results[0].pg_version.split(' ')[0]} ${results[0].pg_version.split(' ')[1]}`);
        mainAppQuery = true;
    } catch (error) {
        printError(`Main Application query failed: ${error.message}`);
    }

    return licenseServerQuery && mainAppQuery;
}

/**
 * Test timezone configuration
 */
async function testTimezoneConfiguration() {
    printHeader('Test 6: Timezone Configuration');

    try {
        // Check License Server Database timezone
        const [licenseResults] = await licenseServerDb.query("SHOW timezone");
        printInfo(`License Server Database timezone: ${licenseResults[0].TimeZone}`);

        // Check Main Application Database timezone
        const [mainResults] = await mainAppDb.query("SHOW timezone");
        printInfo(`Main Application Database timezone: ${mainResults[0].TimeZone}`);

        // Verify both are using UTC
        const licenseIsUTC = licenseResults[0].TimeZone === 'UTC' || licenseResults[0].TimeZone === 'Etc/UTC';
        const mainIsUTC = mainResults[0].TimeZone === 'UTC' || mainResults[0].TimeZone === 'Etc/UTC';

        if (licenseIsUTC && mainIsUTC) {
            printSuccess('Both databases configured for UTC timezone');
            return true;
        } else {
            printWarning('Databases not configured for UTC timezone');
            return false;
        }
    } catch (error) {
        printError(`Timezone check failed: ${error.message}`);
        return false;
    }
}

/**
 * Test environment variable configuration
 */
async function testEnvironmentVariables() {
    printHeader('Test 7: Environment Variables');

    const requiredVars = [
        'LICENSE_DATABASE_URL',
        'MAIN_DATABASE_URL',
        'JWT_SECRET',
        'NODE_ENV'
    ];

    let allPresent = true;

    for (const varName of requiredVars) {
        if (process.env[varName]) {
            printSuccess(`${varName} is set`);
        } else {
            printError(`${varName} is missing`);
            allPresent = false;
        }
    }

    // Check optional but recommended variables
    const optionalVars = [
        'PG_MAX_POOL_SIZE',
        'PG_MIN_POOL_SIZE',
        'PG_CONNECTION_TIMEOUT',
        'PG_IDLE_TIMEOUT'
    ];

    printInfo('\nOptional configuration variables:');
    for (const varName of optionalVars) {
        if (process.env[varName]) {
            console.log(`  ${varName}: ${process.env[varName]}`);
        } else {
            console.log(`  ${varName}: using default`);
        }
    }

    return allPresent;
}

/**
 * Run all tests
 */
async function runAllTests() {
    console.log(colors.bright + '\n🔍 PostgreSQL Database Connection Test Suite\n' + colors.reset);
    console.log('Testing connections to:');
    console.log(`  1. License Server Database: ${process.env.LICENSE_DATABASE_URL ? '✓ configured' : '✗ not configured'}`);
    console.log(`  2. Main Application Database: ${process.env.MAIN_DATABASE_URL ? '✓ configured' : '✗ not configured'}`);

    const results = {
        basicConnection: false,
        authentication: false,
        connectionPool: false,
        healthCheck: false,
        queryExecution: false,
        timezoneConfig: false,
        environmentVars: false
    };

    try {
        // Test 1: Basic Connection
        results.basicConnection = await testBasicConnection();

        // Test 2: Authentication
        results.authentication = await testAuthentication();

        // Test 3: Connection Pool
        results.connectionPool = await testConnectionPool();

        // Test 4: Health Check
        results.healthCheck = await testHealthCheck();

        // Test 5: Query Execution
        results.queryExecution = await testQueryExecution();

        // Test 6: Timezone Configuration
        results.timezoneConfig = await testTimezoneConfiguration();

        // Test 7: Environment Variables
        results.environmentVars = await testEnvironmentVariables();

    } catch (error) {
        printError(`Test suite error: ${error.message}`);
    }

    // Print summary
    printHeader('Test Summary');

    const tests = [
        { name: 'Basic Connection', result: results.basicConnection },
        { name: 'Authentication', result: results.authentication },
        { name: 'Connection Pool', result: results.connectionPool },
        { name: 'Health Check', result: results.healthCheck },
        { name: 'Query Execution', result: results.queryExecution },
        { name: 'Timezone Configuration', result: results.timezoneConfig },
        { name: 'Environment Variables', result: results.environmentVars }
    ];

    let passedCount = 0;
    let failedCount = 0;

    tests.forEach(test => {
        if (test.result) {
            printSuccess(`${test.name}: PASSED`);
            passedCount++;
        } else {
            printError(`${test.name}: FAILED`);
            failedCount++;
        }
    });

    console.log('\n' + colors.bright + `Total: ${tests.length} tests` + colors.reset);
    console.log(colors.green + `Passed: ${passedCount}` + colors.reset);
    console.log(colors.red + `Failed: ${failedCount}` + colors.reset);

    const allPassed = failedCount === 0;

    if (allPassed) {
        console.log('\n' + colors.bright + colors.green + '✓ All tests passed! Database connections are working correctly.' + colors.reset + '\n');
    } else {
        console.log('\n' + colors.bright + colors.red + '✗ Some tests failed. Please check the configuration and try again.' + colors.reset + '\n');
    }

    // Close connections
    try {
        await licenseServerDb.close();
        await mainAppDb.close();
        printInfo('Database connections closed');
    } catch (error) {
        printWarning(`Error closing connections: ${error.message}`);
    }

    return allPassed;
}

// Run tests if executed directly
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check if this module is being run directly
const isMainModule = process.argv[1] && (
    process.argv[1] === __filename ||
    process.argv[1].endsWith('testDatabaseConnections.js')
);

if (isMainModule) {
    runAllTests()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error(colors.red + '\n✗ Fatal error:', error.message + colors.reset);
            console.error(error.stack);
            process.exit(1);
        });
}

export { runAllTests, testBasicConnection, testAuthentication, testHealthCheck };
