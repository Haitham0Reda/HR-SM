#!/usr/bin/env node
// scripts/testLicenseFileSystem.js
/**
 * Test script for On-Premise license file system
 * 
 * This script tests the license file generation, loading, and validation
 */

import fs from 'fs';
import path from 'path';
import {
    generateTrialLicense,
    generateEnterpriseLicense,
    saveLicenseFile,
    extendLicense,
    enableModule,
    disableModule
} from '../utils/licenseFileGenerator.js';
import {
    parseLicenseFile,
    verifyLicenseSignature,
    isLicenseExpired
} from '../config/licenseFileSchema.js';

const TEST_SECRET_KEY = 'test-secret-key-for-testing-only';
const TEST_OUTPUT_DIR = './test-licenses';

console.log('🧪 Testing On-Premise License File System\n');

// Ensure test directory exists
if (!fs.existsSync(TEST_OUTPUT_DIR)) {
    fs.mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
}

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`✅ ${name}`);
        testsPassed++;
    } catch (error) {
        console.error(`❌ ${name}`);
        console.error(`   Error: ${error.message}`);
        testsFailed++;
    }
}

// Test 1: Generate Trial License
console.log('Test 1: Generate Trial License');
let trialLicense;
test('Generate trial license', () => {
    trialLicense = generateTrialLicense('test-company-1', 'Test Company 1', TEST_SECRET_KEY);
    if (!trialLicense) throw new Error('Failed to generate trial license');
    if (!trialLicense.licenseKey) throw new Error('License key missing');
    if (!trialLicense.signature) throw new Error('Signature missing');
});

// Test 2: Verify Signature
console.log('\nTest 2: Verify Signature');
test('Verify trial license signature', () => {
    const isValid = verifyLicenseSignature(trialLicense, TEST_SECRET_KEY);
    if (!isValid) throw new Error('Signature verification failed');
});

// Test 3: Save License File
console.log('\nTest 3: Save License File');
const trialLicensePath = path.join(TEST_OUTPUT_DIR, 'trial-license.json');
test('Save trial license to file', () => {
    const saved = saveLicenseFile(trialLicense, trialLicensePath);
    if (!saved) throw new Error('Failed to save license file');
    if (!fs.existsSync(trialLicensePath)) throw new Error('License file not found after save');
});

// Test 4: Load and Parse License File
console.log('\nTest 4: Load and Parse License File');
test('Load and parse license file', () => {
    const fileContent = fs.readFileSync(trialLicensePath, 'utf8');
    const parseResult = parseLicenseFile(fileContent, TEST_SECRET_KEY);
    if (!parseResult.valid) throw new Error(`Parse failed: ${parseResult.errors.join(', ')}`);
    if (!parseResult.data) throw new Error('No data returned from parse');
});

// Test 5: Generate Enterprise License
console.log('\nTest 5: Generate Enterprise License');
let enterpriseLicense;
test('Generate enterprise license', () => {
    enterpriseLicense = generateEnterpriseLicense('test-company-2', 'Test Company 2', TEST_SECRET_KEY);
    if (!enterpriseLicense) throw new Error('Failed to generate enterprise license');

    // Verify all modules are enabled
    const enabledModules = Object.entries(enterpriseLicense.modules)
        .filter(([key, config]) => config.enabled);
    if (enabledModules.length !== 8) throw new Error('Not all modules enabled in enterprise license');
});

// Test 6: Extend License
console.log('\nTest 6: Extend License');
test('Extend license expiration', () => {
    const originalExpiration = new Date(trialLicense.expiresAt);
    const extendedLicense = extendLicense(trialLicense, 90, TEST_SECRET_KEY);
    const newExpiration = new Date(extendedLicense.expiresAt);

    const daysDiff = Math.round((newExpiration - originalExpiration) / (1000 * 60 * 60 * 24));
    if (daysDiff !== 90) throw new Error(`Expected 90 days extension, got ${daysDiff}`);

    // Verify new signature
    const isValid = verifyLicenseSignature(extendedLicense, TEST_SECRET_KEY);
    if (!isValid) throw new Error('Extended license signature invalid');
});

// Test 7: Enable Module
console.log('\nTest 7: Enable Module');
test('Enable a disabled module', () => {
    // Start with trial license where payroll is enabled
    const updatedLicense = disableModule(trialLicense, 'payroll', TEST_SECRET_KEY);

    // Now enable it
    const enabledLicense = enableModule(
        updatedLicense,
        'payroll',
        'business',
        { employees: 100, apiCalls: 25000 },
        TEST_SECRET_KEY
    );

    if (!enabledLicense.modules.payroll.enabled) {
        throw new Error('Module not enabled');
    }

    // Verify signature
    const isValid = verifyLicenseSignature(enabledLicense, TEST_SECRET_KEY);
    if (!isValid) throw new Error('Enabled license signature invalid');
});

// Test 8: Disable Module
console.log('\nTest 8: Disable Module');
test('Disable an enabled module', () => {
    const disabledLicense = disableModule(trialLicense, 'attendance', TEST_SECRET_KEY);

    if (disabledLicense.modules.attendance.enabled) {
        throw new Error('Module still enabled');
    }

    // Verify signature
    const isValid = verifyLicenseSignature(disabledLicense, TEST_SECRET_KEY);
    if (!isValid) throw new Error('Disabled license signature invalid');
});

// Test 9: Check Expiration
console.log('\nTest 9: Check Expiration');
test('Check license expiration', () => {
    const expired = isLicenseExpired(trialLicense);
    if (expired) throw new Error('Trial license should not be expired');

    // Create an expired license
    const expiredLicense = {
        ...trialLicense,
        expiresAt: '2020-01-01'
    };

    const isExpired = isLicenseExpired(expiredLicense);
    if (!isExpired) throw new Error('Expired license not detected');
});

// Test 10: Invalid Signature Detection
console.log('\nTest 10: Invalid Signature Detection');
test('Detect tampered license', () => {
    const tamperedLicense = {
        ...trialLicense,
        companyName: 'Hacked Company'
    };

    const isValid = verifyLicenseSignature(tamperedLicense, TEST_SECRET_KEY);
    if (isValid) throw new Error('Tampered license passed verification');
});

// Test 11: Module Limits
console.log('\nTest 11: Module Limits');
test('Verify module limits structure', () => {
    const attendanceModule = trialLicense.modules.attendance;
    if (!attendanceModule) throw new Error('Attendance module not found');
    if (!attendanceModule.limits) throw new Error('Limits not defined');
    if (typeof attendanceModule.limits.employees !== 'number') {
        throw new Error('Employee limit not a number');
    }
});

// Test 12: License Key Format
console.log('\nTest 12: License Key Format');
test('Verify license key format', () => {
    const keyPattern = /^HRMS-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
    if (!keyPattern.test(trialLicense.licenseKey)) {
        throw new Error(`Invalid license key format: ${trialLicense.licenseKey}`);
    }
});

// Cleanup
console.log('\n🧹 Cleaning up test files...');
try {
    if (fs.existsSync(TEST_OUTPUT_DIR)) {
        fs.rmSync(TEST_OUTPUT_DIR, { recursive: true, force: true });
    }
    console.log('✅ Cleanup complete');
} catch (error) {
    console.error('❌ Cleanup failed:', error.message);
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('Test Summary:');
console.log(`  Passed: ${testsPassed}`);
console.log(`  Failed: ${testsFailed}`);
console.log(`  Total:  ${testsPassed + testsFailed}`);
console.log('='.repeat(60));

if (testsFailed > 0) {
    console.log('\n❌ Some tests failed');
    process.exit(1);
} else {
    console.log('\n✅ All tests passed!');
    process.exit(0);
}
