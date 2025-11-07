#!/usr/bin/env node

/**
 * Enhanced Test Reporting Script
 * Runs tests with coverage and generates multiple report formats
 * Supports historical tracking, notifications, and advanced reporting
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { program } from 'commander';

// Configure command line options
program
    .option('--silent', 'Run tests silently')
    .option('--no-markdown', 'Skip markdown report generation')
    .option('--html', 'Generate HTML report')
    .option('--badge', 'Generate coverage badge')
    .option('--json', 'Generate JSON report')
    .option('--threshold <percentage>', 'Set coverage threshold', '80')
    .option('--watch', 'Run in watch mode')
    .option('--notify', 'Send notifications (requires SLACK_WEBHOOK_URL)')
    .parse(process.argv);

const options = program.opts();

// Function to run tests
function runTests() {
    return new Promise((resolve) => {
        if (!options.silent) {
            console.log('🔍 Running tests with coverage...\n');
        }
        
        const jestArgs = [
            '--experimental-vm-modules', 
            'node_modules/jest/bin/jest.js', 
            '--coverage',
            '--verbose'
        ];
        
        if (options.watch) {
            jestArgs.push('--watch');
        }
        
        const child = spawn('node', jestArgs, { stdio: 'pipe' });
        
        let stdout = '';
        let stderr = '';
        
        child.stdout.on('data', (data) => {
            stdout += data.toString();
            if (!options.silent) {
                process.stdout.write(data.toString());
            }
        });
        
        child.stderr.on('data', (data) => {
            stderr += data.toString();
            if (!options.silent) {
                process.stderr.write(data.toString());
            }
        });
        
        child.on('close', (code) => {
            resolve({ stdout, stderr, code });
        });
    });
}

// Function to get coverage data from JSON file
function getCoverageFromJson() {
    try {
        const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
        if (fs.existsSync(coveragePath)) {
            const coverageSummary = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
            return coverageSummary.total;
        }
    } catch (error) {
        console.log('DEBUG: Could not read coverage JSON file:', error.message);
    }
    return null;
}

// Function to parse coverage data from stdout
function parseCoverageData(output) {
    const lines = output.split('\n');
    const coverageData = {};
    
    // Try multiple patterns to extract coverage data
    for (const line of lines) {
        // Pattern 1: Standard Jest output
        const match1 = line.match(/(\w+):\s+([\d.]+)%\s+\((\d+)\/(\d+)\)/);
        if (match1) {
            const [, type, percentage, covered, total] = match1;
            coverageData[type.toLowerCase()] = {
                percentage: parseFloat(percentage),
                covered: parseInt(covered),
                total: parseInt(total)
            };
            continue;
        }
        
        // Pattern 2: Alternative format
        const match2 = line.match(/\s*(\w+)\s*:\s*([\d.]+)%\s*\(\s*(\d+)\/(\d+)\s*\)/);
        if (match2) {
            const [, type, percentage, covered, total] = match2;
            coverageData[type.toLowerCase()] = {
                percentage: parseFloat(percentage),
                covered: parseInt(covered),
                total: parseInt(total)
            };
        }
    }
    
    return coverageData;
}

// Function to parse test results
function parseTestResults(output) {
    const lines = output.split('\n');
    let testSuites = { passed: 0, failed: 0, total: 0 };
    let tests = { passed: 0, failed: 0, total: 0 };

    for (const line of lines) {
        // Pattern for test suites
        const suiteMatch = line.match(/Test Suites:\s+(\d+)\s+passed(?:,\s+(\d+)\s+failed)?,\s+(\d+)\s+total/);
        if (suiteMatch) {
            testSuites.passed = parseInt(suiteMatch[1]);
            testSuites.failed = suiteMatch[2] ? parseInt(suiteMatch[2]) : 0;
            testSuites.total = parseInt(suiteMatch[3]);
        }

        // Pattern for tests
        const testMatch = line.match(/Tests:\s+(\d+)\s+passed(?:,\s+(\d+)\s+failed)?,\s+(\d+)\s+total/);
        if (testMatch) {
            tests.passed = parseInt(testMatch[1]);
            tests.failed = testMatch[2] ? parseInt(testMatch[2]) : 0;
            tests.total = parseInt(testMatch[3]);
        }
    }

    return { testSuites, tests };
}

// Function to check coverage against threshold
function checkCoverageThreshold(coverageData, threshold) {
    const issues = [];
    const metrics = ['statements', 'branches', 'functions', 'lines'];
    
    for (const metric of metrics) {
        if (coverageData[metric]?.percentage < threshold) {
            issues.push({
                metric,
                current: coverageData[metric].percentage,
                required: threshold
            });
        }
    }
    
    return issues;
}

// Historical data management
function getHistoricalData() {
    const historyPath = path.join(process.cwd(), 'test-history.json');
    let history = [];
    
    if (fs.existsSync(historyPath)) {
        try {
            history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
        } catch (error) {
            console.log('Could not read history file');
        }
    }
    
    return history;
}

function saveHistoricalData(coverageData, testSuites, tests) {
    const historyPath = path.join(process.cwd(), 'test-history.json');
    const history = getHistoricalData();
    
    history.push({
        timestamp: new Date().toISOString(),
        coverage: coverageData,
        testSuites,
        tests
    });
    
    // Keep only last 30 runs
    const trimmedHistory = history.slice(-30);
    
    fs.writeFileSync(historyPath, JSON.stringify(trimmedHistory, null, 2));
}

function generateTrendAnalysis(history) {
    if (history.length < 2) return '';
    
    const current = history[history.length - 1];
    const previous = history[history.length - 2];
    
    let trendText = '## Coverage Trends\n\n';
    trendText += '| Metric | Previous | Current | Change |\n';
    trendText += '|--------|----------|---------|--------|\n';
    
    const metrics = ['statements', 'branches', 'functions', 'lines'];
    metrics.forEach(metric => {
        const prevValue = previous.coverage[metric]?.percentage || 0;
        const currValue = current.coverage[metric]?.percentage || 0;
        const change = currValue - prevValue;
        const trend = change > 0 ? '📈' : change < 0 ? '📉' : '➡️';
        
        trendText += `| ${metric} | ${prevValue}% | ${currValue}% | ${trend} ${change > 0 ? '+' : ''}${change.toFixed(2)}% |\n`;
    });
    
    return trendText;
}

// Report generation functions
function generateMarkdownReport(coverageData, testSuites, tests, history = []) {
    const timestamp = new Date().toISOString();
    const timestampFormatted = new Date().toLocaleString();
    const trendAnalysis = generateTrendAnalysis(history);

    return `# Test Coverage Report

## Executive Summary

Comprehensive test coverage report for the application. Tracking progress toward 100% coverage across all metrics.

## Test Results (Updated: ${timestampFormatted})

| Metric | Status |
|--------|--------|
| Test Suites | ${testSuites.passed} passed, ${testSuites.failed} failed, ${testSuites.total} total |
| Tests | ${tests.passed} passed, ${tests.failed} failed, ${tests.total} total |

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

${trendAnalysis}

## Coverage Analysis

### Current Status:
- **Overall Coverage**: ${((coverageData.statements?.percentage + coverageData.branches?.percentage + coverageData.functions?.percentage + coverageData.lines?.percentage) / 4).toFixed(2)}%
- **Test Success Rate**: ${((tests.passed / tests.total) * 100).toFixed(2)}%
- **Suite Success Rate**: ${((testSuites.passed / testSuites.total) * 100).toFixed(2)}%

### Recommendations:
${coverageData.statements?.percentage < 80 ? '- Focus on increasing statement coverage by adding more test cases\n' : ''}\
${coverageData.branches?.percentage < 80 ? '- Add tests for conditional branches and edge cases\n' : ''}\
${coverageData.functions?.percentage < 80 ? '- Ensure all functions have at least one test case\n' : ''}\
${coverageData.lines?.percentage < 80 ? '- Cover all code paths to improve line coverage\n' : ''}

## Next Steps

1. Continue implementing tests for uncovered code
2. Run tests regularly to maintain code quality
3. Monitor coverage progress toward 100% goal
4. Update test cases for new features

## Report Generation

This report was automatically generated on ${timestampFormatted} (UTC: ${timestamp})

For manual report generation, run:
\`node scripts/test-report.js\`
`;
}

function generateHTMLReport(coverageData, testSuites, tests, history = []) {
    const timestamp = new Date().toLocaleString();
    const trendAnalysis = generateTrendAnalysis(history);
    
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Coverage Report</title>
    <style>
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            margin: 0; 
            padding: 20px; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #2c3e50 0%, #3498db 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 2.5em;
        }
        .header .timestamp {
            opacity: 0.8;
            margin-top: 10px;
        }
        .summary {
            background: #f8f9fa;
            padding: 30px;
            border-bottom: 1px solid #e9ecef;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        .summary-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
        }
        .summary-card h3 {
            margin: 0 0 10px 0;
            color: #2c3e50;
        }
        .summary-card .value {
            font-size: 2em;
            font-weight: bold;
            margin: 10px 0;
        }
        .summary-card.pass .value { color: #27ae60; }
        .summary-card.fail .value { color: #e74c3c; }
        .coverage-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 30px 0;
            padding: 0 30px;
        }
        .coverage-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
            border-left: 4px solid #3498db;
        }
        .coverage-card h3 {
            margin: 0 0 15px 0;
            color: #2c3e50;
        }
        .progress-bar {
            background: #ecf0f1;
            border-radius: 10px;
            height: 20px;
            margin: 15px 0;
            overflow: hidden;
        }
        .progress-fill {
            background: linear-gradient(90deg, #27ae60, #2ecc71);
            height: 100%;
            border-radius: 10px;
            text-align: center;
            color: white;
            font-size: 12px;
            line-height: 20px;
            font-weight: bold;
            transition: width 0.5s ease;
        }
        .coverage-stats {
            font-size: 0.9em;
            color: #7f8c8d;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 30px 0;
        }
        th, td {
            padding: 12px 15px;
            text-align: left;
            border-bottom: 1px solid #e9ecef;
        }
        th {
            background: #f8f9fa;
            font-weight: 600;
            color: #2c3e50;
        }
        tr:hover {
            background: #f8f9fa;
        }
        .trend-up { color: #27ae60; }
        .trend-down { color: #e74c3c; }
        .trend-neutral { color: #f39c12; }
        .section {
            padding: 30px;
            border-bottom: 1px solid #e9ecef;
        }
        .section:last-child {
            border-bottom: none;
        }
        .section h2 {
            color: #2c3e50;
            margin-bottom: 20px;
            border-left: 4px solid #3498db;
            padding-left: 15px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 Test Coverage Report</h1>
            <div class="timestamp">Generated: ${timestamp}</div>
        </div>

        <div class="section">
            <h2>Executive Summary</h2>
            <div class="summary-grid">
                <div class="summary-card ${testSuites.failed > 0 ? 'fail' : 'pass'}">
                    <h3>Test Suites</h3>
                    <div class="value">${testSuites.passed}/${testSuites.total}</div>
                    <div class="status">${testSuites.failed > 0 ? `${testSuites.failed} failed` : 'All passed'}</div>
                </div>
                <div class="summary-card ${tests.failed > 0 ? 'fail' : 'pass'}">
                    <h3>Tests</h3>
                    <div class="value">${tests.passed}/${tests.total}</div>
                    <div class="status">${tests.failed > 0 ? `${tests.failed} failed` : 'All passed'}</div>
                </div>
            </div>
        </div>

        <div class="section">
            <h2>Coverage Overview</h2>
            <div class="coverage-grid">
                ${['statements', 'branches', 'functions', 'lines'].map(metric => {
                    const data = coverageData[metric] || { percentage: 0, covered: 0, total: 0 };
                    return `
                    <div class="coverage-card">
                        <h3>${metric.charAt(0).toUpperCase() + metric.slice(1)}</h3>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${data.percentage}%">${data.percentage}%</div>
                        </div>
                        <div class="coverage-stats">${data.covered} / ${data.total}</div>
                    </div>
                    `;
                }).join('')}
            </div>
        </div>

        ${trendAnalysis ? `
        <div class="section">
            <h2>Coverage Trends</h2>
            <table>
                <tr>
                    <th>Metric</th>
                    <th>Previous</th>
                    <th>Current</th>
                    <th>Change</th>
                </tr>
                ${(() => {
                    const current = history[history.length - 1];
                    const previous = history[history.length - 2];
                    const metrics = ['statements', 'branches', 'functions', 'lines'];
                    return metrics.map(metric => {
                        const prevValue = previous.coverage[metric]?.percentage || 0;
                        const currValue = current.coverage[metric]?.percentage || 0;
                        const change = currValue - prevValue;
                        const trendClass = change > 0 ? 'trend-up' : change < 0 ? 'trend-down' : 'trend-neutral';
                        const trendIcon = change > 0 ? '📈' : change < 0 ? '📉' : '➡️';
                        return `
                        <tr>
                            <td>${metric.charAt(0).toUpperCase() + metric.slice(1)}</td>
                            <td>${prevValue}%</td>
                            <td>${currValue}%</td>
                            <td class="${trendClass}">${trendIcon} ${change > 0 ? '+' : ''}${change.toFixed(2)}%</td>
                        </tr>
                        `;
                    }).join('');
                })()}
            </table>
        </div>
        ` : ''}

        <div class="section">
            <h2>Detailed Metrics</h2>
            <table>
                <tr>
                    <th>Metric</th>
                    <th>Coverage</th>
                    <th>Progress</th>
                    <th>Remaining</th>
                </tr>
                ${['statements', 'branches', 'functions', 'lines'].map(metric => {
                    const data = coverageData[metric] || { percentage: 0, covered: 0, total: 0 };
                    const remaining = 100 - data.percentage;
                    return `
                    <tr>
                        <td>${metric.charAt(0).toUpperCase() + metric.slice(1)}</td>
                        <td><strong>${data.percentage}%</strong></td>
                        <td>${data.covered}/${data.total}</td>
                        <td>${remaining.toFixed(1)}%</td>
                    </tr>
                    `;
                }).join('')}
            </table>
        </div>
    </div>
</body>
</html>`;

    const htmlPath = path.join(process.cwd(), 'coverage-report.html');
    fs.writeFileSync(htmlPath, htmlContent);
    return htmlPath;
}

function generateCoverageBadge(coverageData, outputPath = 'coverage-badge.svg') {
    const overallCoverage = coverageData.statements?.percentage || 0;
    
    let color = 'e05d44'; // red
    if (overallCoverage >= 90) color = '4c1'; // bright green
    else if (overallCoverage >= 80) color = '97ca00'; // green
    else if (overallCoverage >= 70) color = 'a4a61d'; // yellow-green
    else if (overallCoverage >= 60) color = 'dfb317'; // yellow
    else if (overallCoverage >= 50) color = 'fe7d37'; // orange

    const badgeSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="125" height="20">
    <linearGradient id="b" x2="0" y2="100%">
        <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
        <stop offset="1" stop-opacity=".1"/>
    </linearGradient>
    <mask id="a">
        <rect width="125" height="20" rx="3" fill="#fff"/>
    </mask>
    <g mask="url(#a)">
        <path fill="#555" d="M0 0h65v20H0z"/>
        <path fill="#${color}" d="M65 0h60v20H65z"/>
        <path fill="url(#b)" d="M0 0h125v20H0z"/>
    </g>
    <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
        <text x="32.5" y="15" fill="#010101" fill-opacity=".3">coverage</text>
        <text x="32.5" y="14">coverage</text>
        <text x="95" y="15" fill="#010101" fill-opacity=".3">${overallCoverage}%</text>
        <text x="95" y="14">${overallCoverage}%</text>
    </g>
</svg>`;

    fs.writeFileSync(path.join(process.cwd(), outputPath), badgeSvg);
    return outputPath;
}

function generateJSONReport(coverageData, testSuites, tests) {
    const report = {
        timestamp: new Date().toISOString(),
        summary: {
            testSuites,
            tests
        },
        coverage: coverageData,
        overallCoverage: coverageData.statements?.percentage || 0
    };
    
    const jsonPath = path.join(process.cwd(), 'test-report.json');
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    return jsonPath;
}

// Notification function (optional)
async function sendNotification(coverageData, testSuites, tests, threshold) {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) {
        console.log('⚠️  SLACK_WEBHOOK_URL not set, skipping notification');
        return;
    }

    const issues = checkCoverageThreshold(coverageData, threshold);
    const hasFailures = testSuites.failed > 0 || tests.failed > 0;
    const overallCoverage = coverageData.statements?.percentage || 0;
    
    const message = {
        text: `Test Results - ${new Date().toLocaleString()}`,
        blocks: [
            {
                type: "header",
                text: { 
                    type: "plain_text", 
                    text: `🧪 Test Execution ${hasFailures ? "Failed" : "Complete"}`
                }
            },
            {
                type: "section",
                fields: [
                    { 
                        type: "mrkdwn", 
                        text: `*Test Suites*\n${testSuites.passed} passed, ${testSuites.failed} failed, ${testSuites.total} total` 
                    },
                    { 
                        type: "mrkdwn", 
                        text: `*Tests*\n${tests.passed} passed, ${tests.failed} failed, ${tests.total} total` 
                    }
                ]
            },
            {
                type: "section",
                fields: [
                    { type: "mrkdwn", text: `*Statements*\n${coverageData.statements?.percentage || 0}%` },
                    { type: "mrkdwn", text: `*Branches*\n${coverageData.branches?.percentage || 0}%` },
                    { type: "mrkdwn", text: `*Functions*\n${coverageData.functions?.percentage || 0}%` },
                    { type: "mrkdwn", text: `*Lines*\n${coverageData.lines?.percentage || 0}%` }
                ]
            }
        ]
    };

    if (hasFailures || issues.length > 0) {
        message.blocks.push({
            type: "section",
            text: { 
                type: "mrkdwn", 
                text: `⚠️ *Issues Found:*\n${hasFailures ? '• Test failures detected\n' : ''}${issues.map(issue => `• ${issue.metric} coverage below threshold (${issue.current}% < ${issue.required}%)`).join('\n')}` 
            }
        });
    }

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(message)
        });
        
        if (!options.silent && response.ok) {
            console.log('📤 Notification sent successfully');
        }
    } catch (error) {
        console.log('Failed to send notification:', error.message);
    }
}

// Error reporting
function generateErrorReport(error) {
    const timestamp = new Date().toISOString();
    const timestampFormatted = new Date().toLocaleString();
    
    const errorReport = `# Test Execution Error Report

## Error Details

- **Timestamp**: ${timestampFormatted}
- **Error Message**: ${error.message}
- **Stack Trace**: ${error.stack || 'No stack trace available'}

## Troubleshooting Steps

1. Ensure all dependencies are installed: \`npm install\`
2. Check if the server is running and accessible
3. Verify MongoDB connection settings
4. Confirm test files exist in the \`__tests__\` directory

## Report Generation

This error report was automatically generated on ${timestampFormatted} (UTC: ${timestamp})
`;
    
    const reportPath = path.join(process.cwd(), 'TEST_COVERAGE_REPORT.md');
    fs.writeFileSync(reportPath, errorReport);
    console.log(`\n❌ Error report generated: ${reportPath}`);
}

// Main function
async function main() {
    try {
        const result = await runTests();
        
        let coverageData = {};
        let testSuites = { passed: 0, failed: 0, total: 0 };
        let tests = { passed: 0, failed: 0, total: 0 };

        // Try multiple methods to get coverage data
        const combinedOutput = result.stdout + result.stderr;
        coverageData = getCoverageFromJson() || parseCoverageData(combinedOutput);
        
        if (Object.keys(coverageData).length === 0) {
            console.log('⚠️ Could not parse coverage data, using fallback values');
            coverageData = {
                statements: { percentage: 0, covered: 0, total: 0 },
                branches: { percentage: 0, covered: 0, total: 0 },
                functions: { percentage: 0, covered: 0, total: 0 },
                lines: { percentage: 0, covered: 0, total: 0 }
            };
        }

        const testResults = parseTestResults(combinedOutput);
        testSuites = testResults.testSuites;
        tests = testResults.tests;

        // Save historical data
        const history = getHistoricalData();
        saveHistoricalData(coverageData, testSuites, tests);
        const updatedHistory = getHistoricalData();
        
        // Generate markdown report
        if (options.markdown) {
            const reportContent = generateMarkdownReport(coverageData, testSuites, tests, updatedHistory);
            const reportPath = path.join(process.cwd(), 'TEST_COVERAGE_REPORT.md');
            fs.writeFileSync(reportPath, reportContent);
            
            if (!options.silent) {
                console.log(`\n✅ Markdown report generated: ${reportPath}`);
            }
        }

        // Generate HTML report if requested
        if (options.html) {
            const htmlPath = generateHTMLReport(coverageData, testSuites, tests, updatedHistory);
            if (!options.silent) {
                console.log(`📊 HTML report generated: ${htmlPath}`);
            }
        }

        // Generate badge if requested
        if (options.badge) {
            const badgePath = generateCoverageBadge(coverageData);
            if (!options.silent) {
                console.log(`🛡️ Coverage badge generated: ${badgePath}`);
            }
        }

        // Generate JSON report if requested
        if (options.json) {
            const jsonPath = generateJSONReport(coverageData, testSuites, tests);
            if (!options.silent) {
                console.log(`📄 JSON report generated: ${jsonPath}`);
            }
        }

        // Display summary
        if (!options.silent) {
            console.log('\n📊 Test Summary:');
            console.log(`   Test Suites: ${testSuites.passed} passed, ${testSuites.failed} failed, ${testSuites.total} total`);
            console.log(`   Tests: ${tests.passed} passed, ${tests.failed} failed, ${tests.total} total`);
            console.log(`   Statements: ${coverageData.statements?.percentage || 0}% (${coverageData.statements?.covered || 0}/${coverageData.statements?.total || 0})`);
            console.log(`   Branches: ${coverageData.branches?.percentage || 0}% (${coverageData.branches?.covered || 0}/${coverageData.branches?.total || 0})`);
            console.log(`   Functions: ${coverageData.functions?.percentage || 0}% (${coverageData.functions?.covered || 0}/${coverageData.functions?.total || 0})`);
            console.log(`   Lines: ${coverageData.lines?.percentage || 0}% (${coverageData.lines?.covered || 0}/${coverageData.lines?.total || 0})`);
            
            // Calculate overall coverage
            const allCoverage = Object.values(coverageData).map(d => d.percentage);
            const avgCoverage = allCoverage.reduce((sum, val) => sum + val, 0) / allCoverage.length;
            
            console.log(`\n🎯 Overall Coverage: ${avgCoverage.toFixed(2)}%`);
            
            if (avgCoverage >= 95) {
                console.log('🎉 Excellent coverage! Almost at 100%');
            } else if (avgCoverage >= 80) {
                console.log('✅ Good coverage. Keep going!');
            } else if (avgCoverage >= 50) {
                console.log('🏃 Coverage is improving. Keep adding tests!');
            } else {
                console.log('📚 Coverage needs significant improvement.');
            }
        }
        
        // Check coverage threshold
        const threshold = parseInt(options.threshold);
        const issues = checkCoverageThreshold(coverageData, threshold);
        if (issues.length > 0) {
            console.log(`\n⚠️  Coverage below threshold (${threshold}%):`);
            issues.forEach(issue => {
                console.log(`   ${issue.metric}: ${issue.current}% (required: ${issue.required}%)`);
            });
        }

        // Send notifications if requested
        if (options.notify) {
            await sendNotification(coverageData, testSuites, tests, threshold);
        }
        
        // Exit with the same code as the tests
        process.exit(result.code);
        
    } catch (error) {
        console.error('❌ Error running tests:', error.message);
        generateErrorReport(error);
        process.exit(1);
    }
}

// Run the script
main();