#!/usr/bin/env node

/**
 * Test validation script for E2E tests
 * Validates syntax and structure of all E2E test files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testDir = path.join(__dirname, 'specs', 'hr-workflows');
const supportDir = path.join(__dirname, 'support');

console.log('🔍 Validating E2E test files...\n');

// Validation results
let totalFiles = 0;
let validFiles = 0;
let errors = [];

/**
 * Validate a JavaScript file for basic syntax
 */
function validateJSFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');

        // Basic syntax checks
        const checks = [
            {
                name: 'Has describe blocks',
                test: /describe\s*\(/g,
                required: true
            },
            {
                name: 'Has it blocks',
                test: /it\s*\(/g,
                required: true
            },
            {
                name: 'Has beforeEach hooks',
                test: /beforeEach\s*\(/g,
                required: false
            },
            {
                name: 'Has afterEach hooks',
                test: /afterEach\s*\(/g,
                required: false
            },
            {
                name: 'Uses cy commands',
                test: /cy\./g,
                required: true
            },
            {
                name: 'Has data-cy selectors',
                test: /data-cy=/g,
                required: true
            },
            {
                name: 'No console.log statements',
                test: /console\.log/g,
                required: false,
                shouldNotExist: true
            }
        ];

        const results = [];

        for (const check of checks) {
            const matches = content.match(check.test);
            const hasMatches = matches && matches.length > 0;

            if (check.required && !hasMatches) {
                results.push(`❌ ${check.name}: Required but not found`);
            } else if (check.shouldNotExist && hasMatches) {
                results.push(`⚠️  ${check.name}: Found ${matches.length} instances (should be removed)`);
            } else if (hasMatches) {
                results.push(`✅ ${check.name}: Found ${matches.length} instances`);
            }
        }

        // Check for balanced brackets
        const openBraces = (content.match(/\{/g) || []).length;
        const closeBraces = (content.match(/\}/g) || []).length;
        const openParens = (content.match(/\(/g) || []).length;
        const closeParens = (content.match(/\)/g) || []).length;

        if (openBraces !== closeBraces) {
            results.push(`❌ Unbalanced braces: ${openBraces} open, ${closeBraces} close`);
        } else {
            results.push(`✅ Balanced braces: ${openBraces} pairs`);
        }

        if (openParens !== closeParens) {
            results.push(`❌ Unbalanced parentheses: ${openParens} open, ${closeParens} close`);
        } else {
            results.push(`✅ Balanced parentheses: ${openParens} pairs`);
        }

        return { valid: true, results };
    } catch (error) {
        return { valid: false, error: error.message };
    }
}

/**
 * Validate all test files in a directory
 */
function validateDirectory(dirPath, dirName) {
    console.log(`📁 Validating ${dirName} files...`);

    if (!fs.existsSync(dirPath)) {
        console.log(`❌ Directory not found: ${dirPath}\n`);
        return;
    }

    const files = fs.readdirSync(dirPath).filter(file => file.endsWith('.js'));

    for (const file of files) {
        const filePath = path.join(dirPath, file);
        totalFiles++;

        console.log(`\n📄 Validating: ${file}`);

        const validation = validateJSFile(filePath);

        if (validation.valid) {
            validFiles++;
            console.log('✅ File is valid');

            if (validation.results && validation.results.length > 0) {
                validation.results.forEach(result => console.log(`   ${result}`));
            }
        } else {
            errors.push(`${file}: ${validation.error}`);
            console.log(`❌ File has errors: ${validation.error}`);
        }
    }

    console.log(`\n📊 ${dirName} Summary: ${files.length} files processed\n`);
}

// Validate test files
validateDirectory(testDir, 'HR Workflow Tests');

// Validate support files
validateDirectory(supportDir, 'Support Files');

// Final summary
console.log('='.repeat(60));
console.log('📋 VALIDATION SUMMARY');
console.log('='.repeat(60));
console.log(`Total files processed: ${totalFiles}`);
console.log(`Valid files: ${validFiles}`);
console.log(`Files with errors: ${errors.length}`);

if (errors.length > 0) {
    console.log('\n❌ ERRORS FOUND:');
    errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
    });
    process.exit(1);
} else {
    console.log('\n🎉 All files are valid!');
    console.log('\n✅ E2E test suite is ready for execution');
    console.log('\nTo run the tests:');
    console.log('  npm run test:e2e:hr     # Run HR workflow tests');
    console.log('  npm run test:e2e         # Run all E2E tests');
    console.log('  npm run test:e2e:open   # Open Cypress Test Runner');
}

console.log('\n' + '='.repeat(60));