#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs';
import chalk from 'chalk';
import yargs from 'yargs';

console.log(chalk.cyanBright('\n🔍 Running Tests & Generating Report...\n'));

const argv = yargs(process.argv.slice(2))
    .option('json', { type: 'boolean', desc: 'Generate JSON report instead of Markdown' })
    .option('no-save', { type: 'boolean', desc: 'Do not write output files' })
    .option('verbose', { type: 'boolean', desc: 'Show full Jest output in console' })
    .help()
    .parse();

const startTime = Date.now();
const jsonPath = 'jest-results.json';

// Run Jest in JSON mode
console.log(chalk.yellow('⚡ Running tests (Jest JSON mode)...\n'));

try {
    execSync(`npx jest --json --outputFile=${jsonPath} --runInBand`, {
        stdio: argv.verbose ? 'inherit' : 'pipe',
        encoding: 'utf8',
    });
} catch (error) {
    // Jest will exit with non-zero code if tests fail, but we still want to generate the report
}

// Read Jest JSON results
let reportData = null;
try {
    const raw = fs.readFileSync(jsonPath, 'utf8');
    reportData = JSON.parse(raw);
} catch {
    console.error(chalk.red('❌ Failed to parse Jest JSON output.'));
    process.exit(1);
}

const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);

// Extract key metrics
const totalSuites = reportData.numTotalTestSuites || 0;
const passedSuites = reportData.numPassedTestSuites || 0;
const failedSuites = reportData.numFailedTestSuites || 0;

const totalTests = reportData.numTotalTests || 0;
const passedTests = reportData.numPassedTests || 0;
const failedTests = reportData.numFailedTests || 0;
const skippedTests = reportData.numPendingTests || 0;

const passRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : '0.0';

const hasFailures = failedTests > 0 || failedSuites > 0;
const statusEmoji = !hasFailures ? '✅' : '❌';
const statusText = !hasFailures ? 'ALL TESTS PASSED' : `${failedTests} TEST(S) FAILED, ${failedSuites} SUITE(S) FAILED`;

const timestamp = new Date().toISOString();
const reportDate = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
});

// Progress bar
const filled = '█'.repeat(Math.floor(passRate / 5));
const empty = '░'.repeat(20 - Math.floor(passRate / 5));
const progressBar = `Tests: [${filled}${empty}] ${passRate}%`;

// Markdown Report
const markdownReport = `# Test Execution Report

**Generated:** ${reportDate}  
**Status:** ${statusEmoji} ${statusText}

---

## 📊 Test Summary

| Metric | Value |
|--------|-------|
| **Total Test Suites** | ${totalSuites} |
| **Passed Suites** | ${passedSuites} |
| **Failed Suites** | ${failedSuites} |
| **Total Tests** | ${totalTests} |
| **Passed Tests** | ${passedTests} |
| **Failed Tests** | ${failedTests} |
| **Skipped Tests** | ${skippedTests} |
| **Pass Rate** | ${passRate}% |
| **Execution Time** | ${executionTime}s |

---

## 📈 Progress Bar

\`\`\`
${progressBar}
\`\`\`

---

${hasFailures ? `## ⚠️ Action Required

${failedTests} test(s) failed, ${failedSuites} suite(s) failed. Please review the test output above for details.

` : `## ✅ Success

All tests passed successfully!

`}---

*Report generated in ${executionTime}s*
`;

// Save reports (if not disabled)
if (!argv.noSave) {
    const reportFile = `TEST_REPORT_${timestamp.replace(/[:.]/g, '-').substring(0, 19)}.md`;
    fs.writeFileSync(reportFile, markdownReport);
    fs.writeFileSync('TEST_REPORT_LATEST.md', markdownReport);
    if (argv.json) fs.writeFileSync('TEST_REPORT_LATEST.json', JSON.stringify(reportData, null, 2));

    console.log(chalk.gray('\n' + '='.repeat(50)));
    console.log(chalk.cyan('📊 TEST RESULTS SUMMARY'));
    console.log(chalk.gray('='.repeat(50)));
    console.log(`Suites: ${chalk.green(passedSuites)}/${totalSuites} passed`);
    console.log(`Tests:  ${chalk.green(passedTests)}/${totalTests} passed (${passRate}%)`);
    console.log(`Skipped: ${chalk.yellow(skippedTests)}`);
    console.log(`Time:   ${chalk.cyan(executionTime + 's')}`);
    console.log(chalk.gray('='.repeat(50)));
    console.log(`\n📄 Reports saved to: ${chalk.green(reportFile)} and ${chalk.green('TEST_REPORT_LATEST.md')}`);
    if (argv.json) console.log(`📄 JSON: ${chalk.green('TEST_REPORT_LATEST.json')}\n`);
}

// Exit with correct code
if (hasFailures) {
    console.log(chalk.redBright(`❌ ${failedTests} test(s) failed, ${failedSuites} suite(s) failed\n`));
    process.exit(1);
} else {
    console.log(chalk.greenBright('✅ All tests passed!\n'));
    process.exit(0);
}
