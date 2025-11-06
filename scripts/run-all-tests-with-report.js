#!/usr/bin/env node

/**
 * Script to run all tests and generate comprehensive coverage reports
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

// Function to run a command and capture output
function runCommand(command, args) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, { stdio: 'pipe' });
        
        let stdout = '';
        let stderr = '';
        
        child.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        
        child.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        
        child.on('close', (code) => {
            if (code === 0) {
                resolve({ stdout, stderr, code });
            } else {
                reject(new Error(`Command failed with code ${code}: ${stderr}`));
            }
        });
    });
}

// Function to parse coverage data
function parseCoverageData(output) {
    const lines = output.split('\n');
    const coverageData = {};
    
    for (const line of lines) {
        if (line.includes('Statements') || line.includes('Branches') || 
            line.includes('Functions') || line.includes('Lines')) {
            const match = line.match(/(\w+):\s+([\d.]+)%\s+\((\d+)\/(\d+)\)/);
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
    
    return coverageData;
}

// Function to generate markdown report
function generateReport(coverageData, timestamp) {
    return `# Test Coverage Report

## Generated on: ${timestamp}

## Coverage Summary

| Metric | Percentage | Covered | Total |
|--------|------------|---------|-------|
| Statements | ${coverageData.statements?.percentage || 0}% | ${coverageData.statements?.covered || 0} | ${coverageData.statements?.total || 0} |
| Branches | ${coverageData.branches?.percentage || 0}% | ${coverageData.branches?.covered || 0} | ${coverageData.branches?.total || 0} |
| Functions | ${coverageData.functions?.percentage || 0}% | ${coverageData.functions?.covered || 0} | ${coverageData.functions?.total || 0} |
| Lines | ${coverageData.lines?.percentage || 0}% | ${coverageData.lines?.covered || 0} | ${coverageData.lines?.total || 0} |

## Coverage Goal: 100%

### Progress:
- Statements: ${coverageData.statements?.percentage || 0}% (${(100 - (coverageData.statements?.percentage || 0)).toFixed(2)}% to go)
- Branches: ${coverageData.branches?.percentage || 0}% (${(100 - (coverageData.branches?.percentage || 0)).toFixed(2)}% to go)
- Functions: ${coverageData.functions?.percentage || 0}% (${(100 - (coverageData.functions?.percentage || 0)).toFixed(2)}% to go)
- Lines: ${coverageData.lines?.percentage || 0}% (${(100 - (coverageData.lines?.percentage || 0)).toFixed(2)}% to go)

## Next Steps

Based on the current coverage, you need to create tests for approximately ${107 - Object.keys(coverageData).length} more files to achieve 100% coverage.

Refer to the Missing_Test_Files_Report.md for a detailed list of files that need tests.
`;
}

async function main() {
    try {
        console.log('Running all tests with coverage...\n');
        
        // Run tests with coverage
        const result = await runCommand('node', [
            '--experimental-vm-modules', 
            'node_modules/jest/bin/jest.js', 
            '--coverage',
            '--verbose'
        ]);
        
        console.log('Test execution completed.\n');
        
        // Parse coverage data
        const coverageData = parseCoverageData(result.stdout);
        const timestamp = new Date().toISOString();
        
        // Generate report
        const report = generateReport(coverageData, timestamp);
        
        // Write report to file
        const reportPath = path.join(process.cwd(), 'TEST_COVERAGE_REPORT.md');
        fs.writeFileSync(reportPath, report);
        
        console.log(`Coverage report generated: ${reportPath}`);
        
        // Display summary
        console.log('\n=== COVERAGE SUMMARY ===');
        console.log(`Statements: ${coverageData.statements?.percentage || 0}% (${coverageData.statements?.covered || 0}/${coverageData.statements?.total || 0})`);
        console.log(`Branches: ${coverageData.branches?.percentage || 0}% (${coverageData.branches?.covered || 0}/${coverageData.branches?.total || 0})`);
        console.log(`Functions: ${coverageData.functions?.percentage || 0}% (${coverageData.functions?.covered || 0}/${coverageData.functions?.total || 0})`);
        console.log(`Lines: ${coverageData.lines?.percentage || 0}% (${coverageData.lines?.covered || 0}/${coverageData.lines?.total || 0})`);
        
        // Check if we have 100% coverage
        const allCoverage = Object.values(coverageData).map(d => d.percentage);
        const avgCoverage = allCoverage.reduce((sum, val) => sum + val, 0) / allCoverage.length;
        
        console.log(`\nAverage Coverage: ${avgCoverage.toFixed(2)}%`);
        
        if (avgCoverage >= 95) {
            console.log('🎉 Excellent coverage! Almost at 100%');
        } else if (avgCoverage >= 80) {
            console.log('✅ Good coverage. Keep going!');
        } else if (avgCoverage >= 50) {
            console.log('🏃 Coverage is improving. Keep adding tests!');
        } else {
            console.log('📚 Coverage needs significant improvement. Refer to Missing_Test_Files_Report.md');
        }
        
    } catch (error) {
        console.error('Error running tests:', error.message);
        process.exit(1);
    }
}

// Run the script
main();