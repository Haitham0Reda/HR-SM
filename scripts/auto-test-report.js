#!/usr/bin/env node

/**
 * Script to automatically run tests and generate/update test reports
 * This script runs tests with coverage and automatically updates the FINAL_TESTING_REPORT.md
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

function runTests() {
    return new Promise((resolve) => {
        console.log('🔍 Running tests with coverage...\n');
        
        const child = spawn('node', [
            '--experimental-vm-modules', 
            'node_modules/jest/bin/jest.js', 
            '--coverage',
            '--verbose'
        ], { stdio: 'pipe' });
        
        let stdout = '';
        let stderr = '';
        
        child.stdout.on('data', (data) => {
            stdout += data.toString();
            process.stdout.write(data.toString());
        });
        
        child.stderr.on('data', (data) => {
            stderr += data.toString();
            process.stderr.write(data.toString());
        });
        
        child.on('close', (code) => {
            resolve({ stdout, stderr, code });
        });
    });
}

function parseCoverageData(output) {
    const lines = output.split('\n');
    const coverageData = {};
    
    // Extract coverage summary from the coverage summary section
    let inCoverageSummary = false;
    for (const line of lines) {
        // Check for coverage summary start
        if (line.trim() === '=============================== Coverage summary ===============================') {
            inCoverageSummary = true;
            continue;
        }
        
        // Check for coverage summary end
        if (line.trim() === '================================================================================' && inCoverageSummary) {
            inCoverageSummary = false;
            continue;
        }
        
        // Extract coverage data when in coverage summary section
        if (inCoverageSummary) {
            // Updated regex to handle leading spaces and different spacing
            const match = line.match(/\s*(\w+)\s*:\s*([\d.]+)%\s*\((\d+)\/(\d+)\)/);
            if (match) {
                const [, type, percentage, covered, total] = match;
                coverageData[type.toLowerCase()] = {
                    percentage: parseFloat(percentage),
                    covered: parseInt(covered),
                    total: parseInt(total)
                };
            }
        }
    }
    
    // Extract test results from the final summary
    let testSuites = { passed: 0, total: 0 };
    let tests = { passed: 0, total: 0 };
    
    // Look for the test summary lines from the end of the output
    // These lines are usually near the end of the output
    for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i];
        
        // Look for test suites line
        if (line.includes('Test Suites:')) {
            const suiteMatch = line.match(/Test Suites:\s+(?:(\d+)\s+failed,\s+)?(\d+)\s+passed,\s+(\d+)\s+total/);
            if (suiteMatch) {
                const failed = suiteMatch[1] ? parseInt(suiteMatch[1]) : 0;
                const passed = parseInt(suiteMatch[2]);
                const total = parseInt(suiteMatch[3]);
                testSuites = {
                    passed: passed,
                    total: total
                };
            }
            break;
        }
    }
    
    // Look for tests line
    for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i];
        
        // Look for tests line
        if (line.includes('Tests:')) {
            const testMatch = line.match(/Tests:\s+(?:(\d+)\s+failed,\s+)?(\d+)\s+passed,\s+(\d+)\s+total/);
            if (testMatch) {
                const failed = testMatch[1] ? parseInt(testMatch[1]) : 0;
                const passed = parseInt(testMatch[2]);
                const total = parseInt(testMatch[3]);
                tests = {
                    passed: passed,
                    total: total
                };
            }
            break;
        }
    }
    
    return { coverageData, testSuites, tests };
}

function generateReportContent(coverageData, testSuites, tests) {
    const timestamp = new Date().toISOString();
    const timestampFormatted = new Date().toLocaleString();
    
    return `# Final Testing Report

## Executive Summary

This report summarizes the comprehensive testing infrastructure setup and progress for the HR-SM application. We have successfully established a robust testing framework with Jest, MongoDB Memory Server, and Supertest, and have implemented a strategic plan to achieve 100% code coverage.

## Test Results (Updated: ${timestampFormatted})

| Metric | Status |
|--------|--------|
| Test Suites | ${testSuites.passed} passed, ${testSuites.total} total |
| Tests | ${tests.passed} passed, ${tests.total} total |

## Current Coverage Statistics

| Metric | Percentage | Covered | Total |
|--------|------------|---------|-------|
| Statements | ${coverageData.statements?.percentage || 0}% | ${coverageData.statements?.covered || 0} | ${coverageData.statements?.total || 0} |
| Branches | ${coverageData.branches?.percentage || 0}% | ${coverageData.branches?.covered || 0} | ${coverageData.branches?.total || 0} |
| Functions | ${coverageData.functions?.percentage || 0}% | ${coverageData.functions?.covered || 0} | ${coverageData.functions?.total || 0} |
| Lines | ${coverageData.lines?.percentage || 0}% | ${coverageData.lines?.covered || 0} | ${coverageData.lines?.total || 0} |

## Progress Toward 100% Coverage

| Metric | Progress | Remaining |
|--------|----------|-----------|
| Statements | ${coverageData.statements?.percentage || 0}% | ${(100 - (coverageData.statements?.percentage || 0)).toFixed(2)}% |
| Branches | ${coverageData.branches?.percentage || 0}% | ${(100 - (coverageData.branches?.percentage || 0)).toFixed(2)}% |
| Functions | ${coverageData.functions?.percentage || 0}% | ${(100 - (coverageData.functions?.percentage || 0)).toFixed(2)}% |
| Lines | ${coverageData.lines?.percentage || 0}% | ${(100 - (coverageData.lines?.percentage || 0)).toFixed(2)}% |

## Detailed Component Coverage

This section shows the current coverage status of different component types in the application.

## Tools and Scripts

The testing infrastructure includes several useful scripts:

1. **Test Template Generator**
   \`node scripts/generate-test-template.js <type> <filename>\`
   Generates complete test templates for any component.

2. **Component Test Generator**
   \`node scripts/generate-component-tests.js <component-type> <component-name>\`
   Simplified interface for generating tests for specific components.

3. **Auto Test Report**
   \`npm run test:report\` or \`node scripts/auto-test-report.js\`
   Runs all tests and automatically updates this report.

## Next Steps

1. Continue implementing tests for the remaining components
2. Run tests regularly to maintain code quality
3. Monitor coverage progress toward 100% goal
4. Update documentation as tests are added

## Report Generation

This report was automatically generated on ${timestampFormatted} (UTC: ${timestamp})

For manual report generation, run:
\`npm run test:report\` or \`node scripts/auto-test-report.js\`
`;
}

async function main() {
    try {
        // Run tests
        const result = await runTests();
        
        // Parse coverage data
        const { coverageData, testSuites, tests } = parseCoverageData(result.stdout);
        
        // Generate report content
        const reportContent = generateReportContent(coverageData, testSuites, tests);
        
        // Write report to file
        const reportPath = path.join(process.cwd(), 'FINAL_TESTING_REPORT.md');
        fs.writeFileSync(reportPath, reportContent);
        
        console.log(`\n✅ Test report updated: ${reportPath}`);
        
        // Show summary
        console.log('\n📊 Test Summary:');
        console.log(`   Test Suites: ${testSuites.passed} passed, ${testSuites.total} total`);
        console.log(`   Tests: ${tests.passed} passed, ${tests.total} total`);
        console.log(`   Statements: ${coverageData.statements?.percentage || 0}% (${coverageData.statements?.covered || 0}/${coverageData.statements?.total || 0})`);
        console.log(`   Branches: ${coverageData.branches?.percentage || 0}% (${coverageData.branches?.covered || 0}/${coverageData.branches?.total || 0})`);
        console.log(`   Functions: ${coverageData.functions?.percentage || 0}% (${coverageData.functions?.covered || 0}/${coverageData.functions?.total || 0})`);
        console.log(`   Lines: ${coverageData.lines?.percentage || 0}% (${coverageData.lines?.covered || 0}/${coverageData.lines?.total || 0})`);
        
        // Exit with the same code as the tests
        process.exit(result.code);
        
    } catch (error) {
        console.error('❌ Error running tests:', error.message);
        process.exit(1);
    }
}

// Run the script
main();