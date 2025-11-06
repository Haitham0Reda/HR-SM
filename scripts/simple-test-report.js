#!/usr/bin/env node

/**
 * Simple script to run tests and extract coverage data
 */

import { spawn } from 'child_process';

function runTests() {
    return new Promise((resolve) => {
        const child = spawn('node', [
            '--experimental-vm-modules', 
            'node_modules/jest/bin/jest.js', 
            '--coverage'
        ], { stdio: 'pipe' });
        
        let output = '';
        
        child.stdout.on('data', (data) => {
            output += data.toString();
            process.stdout.write(data.toString());
        });
        
        child.stderr.on('data', (data) => {
            process.stderr.write(data.toString());
        });
        
        child.on('close', (code) => {
            // Even if tests fail coverage thresholds, we still want to extract the data
            resolve(output);
        });
    });
}

async function main() {
    try {
        console.log('Running tests with coverage...\n');
        const output = await runTests();
        
        // Extract coverage summary
        const lines = output.split('\n');
        console.log('\n=== COVERAGE SUMMARY ===');
        
        for (const line of lines) {
            if (line.includes('Statements') || line.includes('Branches') || 
                line.includes('Functions') || line.includes('Lines') ||
                line.includes('Coverage summary')) {
                console.log(line);
            }
        }
        
        console.log('\n=== MISSING TESTS ===');
        console.log('Refer to Missing_Test_Files_Report.md for a list of files that need tests to achieve 100% coverage.');
        console.log('Total files requiring tests: 107 files');
        console.log('- Controllers: 25 files');
        console.log('- Models: 30 files');
        console.log('- Middleware: 28 files');
        console.log('- Routes: 24 files');
        
    } catch (error) {
        console.error('Error running tests:', error.message);
        process.exit(1);
    }
}

main();