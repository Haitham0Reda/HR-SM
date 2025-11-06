/**
 * Script to run all API tests and generate comprehensive reports
 * 
 * Run with: node server/testing/run-all-api-tests.js
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const testScripts = [
    { name: 'Basic Route Tests (No Auth)', command: 'node', args: ['server/testing/test-routes.js'] },
    { name: 'Authenticated Route Tests', command: 'node', args: ['server/testing/test-authenticated-routes.js'] },
    { name: 'Comprehensive Route Tests', command: 'node', args: ['server/testing/test-all-routes.js'] }
];

const reportsDir = path.join(process.cwd(), 'test-reports');
if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir);
}

async function runTestScript(testScript, index) {
    return new Promise((resolve) => {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`  Running: ${testScript.name}`);
        console.log(`${'='.repeat(60)}`);
        
        const startTime = Date.now();
        const outputFile = path.join(reportsDir, `test-output-${index + 1}.txt`);
        const outputStream = fs.createWriteStream(outputFile);
        
        const child = spawn(testScript.command, testScript.args, { cwd: process.cwd() });
        
        child.stdout.pipe(process.stdout);
        child.stderr.pipe(process.stderr);
        child.stdout.pipe(outputStream);
        child.stderr.pipe(outputStream);
        
        child.on('close', (code) => {
            const endTime = Date.now();
            const duration = ((endTime - startTime) / 1000).toFixed(2);
            console.log(`\n${testScript.name} completed in ${duration} seconds with exit code ${code}`);
            console.log(`Output saved to: ${outputFile}`);
            resolve({ name: testScript.name, code, duration, outputFile });
        });
    });
}

async function runAllTests() {
    console.log(`${'='.repeat(60)}`);
    console.log(`  HR-SM API COMPREHENSIVE TESTING SUITE`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Test Reports Directory: ${reportsDir}`);
    console.log(`Time: ${new Date().toLocaleString()}\n`);
    
    const results = [];
    
    for (let i = 0; i < testScripts.length; i++) {
        const result = await runTestScript(testScripts[i], i);
        results.push(result);
    }
    
    // Generate summary report
    console.log(`\n${'='.repeat(60)}`);
    console.log(`  TEST SUITE SUMMARY`);
    console.log(`${'='.repeat(60)}`);
    
    results.forEach((result, index) => {
        console.log(`${index + 1}. ${result.name}`);
        console.log(`   Status: ${result.code === 0 ? '✅ PASSED' : '❌ FAILED'}`);
        console.log(`   Duration: ${result.duration} seconds`);
        console.log(`   Report: ${result.outputFile}\n`);
    });
    
    console.log(`All test reports saved in: ${reportsDir}`);
    console.log(`Comprehensive analysis available in: API_TEST_COMPREHENSIVE_SUMMARY.md`);
}

// Run all tests
runAllTests().catch(console.error);