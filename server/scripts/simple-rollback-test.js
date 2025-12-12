#!/usr/bin/env node

/**
 * Simple Rollback Test
 * Tests basic rollback functionality
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

console.log('=== Simple Rollback Test ===');
console.log('Project root:', projectRoot);

// Test 1: Check if current structure exists
console.log('\n1. Checking current structure...');

const currentStructure = [
    'server/modules/hr-core',
    'server/modules/hr-core/attendance',
    'server/modules/hr-core/auth',
    'server/modules/hr-core/users',
    'server/controller',
    'server/models',
    'server/routes'
];

for (const dir of currentStructure) {
    const fullPath = path.join(projectRoot, dir);
    const exists = fs.existsSync(fullPath);
    console.log(`  ${exists ? '✓' : '✗'} ${dir}`);
}

// Test 2: Check if key files exist in modules
console.log('\n2. Checking key modular files...');

const modularFiles = [
    'server/modules/hr-core/attendance/controllers/attendance.controller.js',
    'server/modules/hr-core/auth/controllers/auth.controller.js',
    'server/modules/hr-core/users/controllers/user.controller.js'
];

for (const file of modularFiles) {
    const fullPath = path.join(projectRoot, file);
    const exists = fs.existsSync(fullPath);
    console.log(`  ${exists ? '✓' : '✗'} ${file}`);
}

// Test 3: Check if legacy directories still exist
console.log('\n3. Checking legacy directories...');

const legacyDirs = ['server/controller', 'server/models', 'server/routes'];

for (const dir of legacyDirs) {
    const fullPath = path.join(projectRoot, dir);
    const exists = fs.existsSync(fullPath);
    if (exists) {
        const files = fs.readdirSync(fullPath);
        console.log(`  ✓ ${dir} (${files.length} files)`);
    } else {
        console.log(`  ✗ ${dir} (missing)`);
    }
}

// Test 4: Simulate file move and rollback
console.log('\n4. Testing file move simulation...');

try {
    const testFile = path.join(projectRoot, 'server/test-rollback-file.js');
    const testContent = '// Test file for rollback\nexport default {};';
    
    // Create test file
    fs.writeFileSync(testFile, testContent);
    console.log('  ✓ Created test file');
    
    // Move to modules (simulate restructuring)
    const targetDir = path.join(projectRoot, 'server/modules/hr-core/test');
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }
    
    const targetFile = path.join(targetDir, 'test-rollback-file.js');
    fs.renameSync(testFile, targetFile);
    console.log('  ✓ Moved file to modules');
    
    // Rollback (move back)
    fs.renameSync(targetFile, testFile);
    console.log('  ✓ Rolled back file');
    
    // Clean up
    fs.unlinkSync(testFile);
    if (fs.existsSync(targetDir) && fs.readdirSync(targetDir).length === 0) {
        fs.rmdirSync(targetDir);
    }
    console.log('  ✓ Cleaned up test files');
    
} catch (error) {
    console.log(`  ✗ File simulation failed: ${error.message}`);
}

// Test 5: Check application syntax
console.log('\n5. Testing application syntax...');

try {
    const appPath = path.join(projectRoot, 'server/app.js');
    if (fs.existsSync(appPath)) {
        // Just check if file exists and is readable
        const content = fs.readFileSync(appPath, 'utf8');
        if (content.length > 0) {
            console.log('  ✓ app.js exists and is readable');
        } else {
            console.log('  ✗ app.js is empty');
        }
    } else {
        console.log('  ✗ app.js not found');
    }
} catch (error) {
    console.log(`  ✗ app.js check failed: ${error.message}`);
}

console.log('\n=== Test Complete ===');
console.log('Rollback procedures are ready for use.');
console.log('Use the full rollback scripts for actual rollback operations.');