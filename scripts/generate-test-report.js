import fs from 'fs';
import path from 'path';

// Function to read and parse JUnit XML report
function parseJUnitReport(xmlPath) {
  try {
    const xmlContent = fs.readFileSync(xmlPath, 'utf8');
    
    // Simple XML parsing using regex (for demonstration)
    // In a real application, you'd use a proper XML parser
    const testsMatch = xmlContent.match(/tests="(\d+)"/);
    const failuresMatch = xmlContent.match(/failures="(\d+)"/);
    const errorsMatch = xmlContent.match(/errors="(\d+)"/);
    
    const tests = testsMatch ? parseInt(testsMatch[1]) : 0;
    const failures = failuresMatch ? parseInt(failuresMatch[1]) : 0;
    const errors = errorsMatch ? parseInt(errorsMatch[1]) : 0;
    const passed = tests - failures - errors;
    
    return {
      total: tests,
      passed,
      failed: failures,
      errors,
      successRate: tests > 0 ? ((passed / tests) * 100).toFixed(2) : 0
    };
  } catch (error) {
    console.error('Error parsing JUnit report:', error);
    return null;
  }
}

// Function to read and parse coverage report
function parseCoverageReport(coveragePath) {
  try {
    const coverageSummary = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
    
    return {
      lines: coverageSummary.total.lines.pct,
      statements: coverageSummary.total.statements.pct,
      functions: coverageSummary.total.functions.pct,
      branches: coverageSummary.total.branches.pct
    };
  } catch (error) {
    console.error('Error parsing coverage report:', error);
    return null;
  }
}

// Function to generate markdown report
function generateMarkdownReport(testResults, coverageResults) {
  const timestamp = new Date().toISOString();
  
  let report = `# Test Report
Generated on: ${timestamp}

## Test Results Summary

| Metric | Count |
|--------|-------|
| Total Tests | ${testResults?.total || 0} |
| Passed | ${testResults?.passed || 0} |
| Failed | ${testResults?.failed || 0} |
| Errors | ${testResults?.errors || 0} |
| Success Rate | ${testResults?.successRate || 0}% |

## Code Coverage Summary

| Metric | Percentage |
|--------|------------|
| Lines | ${coverageResults?.lines || 0}% |
| Statements | ${coverageResults?.statements || 0}% |
| Functions | ${coverageResults?.functions || 0}% |
| Branches | ${coverageResults?.branches || 0}% |

## Detailed Breakdown by Test Type

### Models
- Status: Not yet implemented
- Coverage: N/A

### Controllers
- Status: Partially implemented
- Coverage: N/A

### Middleware
- Status: Partially implemented
- Coverage: N/A

### Routes
- Status: Partially implemented
- Coverage: N/A

---

*Report generated automatically by HR-SM Test Report Generator*
`;

  return report;
}

// Main function
function main() {
  console.log('Generating test report...');
  
  // Paths to report files
  const junitReportPath = path.join('test-reports', 'jest-junit.xml');
  const coverageReportPath = path.join('coverage', 'coverage-summary.json');
  
  // Parse reports
  const testResults = parseJUnitReport(junitReportPath);
  const coverageResults = parseCoverageReport(coverageReportPath);
  
  // Generate markdown report
  const markdownReport = generateMarkdownReport(testResults, coverageResults);
  
  // Write report to file
  const reportPath = path.join('test-reports', 'TEST_REPORT.md');
  fs.writeFileSync(reportPath, markdownReport);
  
  console.log(`Test report generated successfully: ${reportPath}`);
  
  // Print summary to console
  console.log('\n=== TEST REPORT SUMMARY ===');
  console.log(`Total Tests: ${testResults?.total || 0}`);
  console.log(`Passed: ${testResults?.passed || 0}`);
  console.log(`Failed: ${testResults?.failed || 0}`);
  console.log(`Success Rate: ${testResults?.successRate || 0}%`);
  console.log(`Code Coverage - Lines: ${coverageResults?.lines || 0}%`);
}

// Run the script
main();