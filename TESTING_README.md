# Testing & Report Generation

This document explains how to run tests and generate professional test reports for the HR-SM project.

## Quick Start

### Run Tests Only

```bash
npm test
```

### Generate Professional Test Report

```bash
npm run test:report
```

This will:

1. Run all tests (models, controllers, routes)
2. Generate a detailed professional report
3. Save two report files:
   - `TEST_REPORT_LATEST.md` - Always contains the latest report
   - `TEST_REPORT_YYYY-MM-DDTHH-MM-SS.md` - Timestamped report for history

## Report Features

The generated report includes:

### 📊 Executive Summary

- Total test suites and tests
- Pass/fail statistics
- Overall pass rate
- Visual progress bars

### 📈 Category Breakdown

- **Models** - Database model tests (32 suites, 255 tests)
- **Controllers** - Business logic tests (26 suites, 434 tests)
- **Routes** - API endpoint tests (25 suites, 413 tests)

### 📋 Detailed Results

- Test suite summary table
- Failed test details (if any)
- Performance metrics
- Execution time statistics

### 🔧 Test Environment Info

- Framework and configuration
- Timeout settings
- Cache status

## Report Output Example

```
============================================================
📊 TEST EXECUTION SUMMARY
============================================================
Status:       ✅ ALL TESTS PASSED
Test Suites:  83/83 passed
Tests:        1102/1102 passed (100.0%)
Skipped:      0
Duration:     76.31s
============================================================

📄 Reports saved to:
   - TEST_REPORT_2025-11-10T10-00-18.md
   - TEST_REPORT_LATEST.md
```

## Test Categories

### Models (255 tests)

Tests for all database models including:

- User authentication
- Survey management
- Attendance tracking
- Leave management
- Payroll processing
- Document management
- Security features
- And more...

### Controllers (434 tests)

Tests for all controller functions including:

- CRUD operations
- Business logic validation
- Error handling
- Data transformation
- Authorization checks

### Routes (413 tests)

Tests for all API endpoints including:

- Request validation
- Response formatting
- Authentication middleware
- Error responses
- Status codes

## Continuous Integration

The test report generator can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Run tests and generate report
  run: npm run test:report

- name: Upload test report
  uses: actions/upload-artifact@v3
  with:
    name: test-report
    path: TEST_REPORT_*.md
```

## Troubleshooting

### Tests Taking Too Long

- The MongoDB Memory Server initialization can take 30-60 seconds
- This is normal for the first run
- Subsequent runs use cached binaries

### Report Not Generated

- Check that `test-results.json` was created
- Ensure all dependencies are installed: `npm install`
- Check Node.js version (requires Node 18+)

## Files

- `generate-report.js` - Report generator script
- `test-results.json` - Raw test results (auto-generated)
- `TEST_REPORT_LATEST.md` - Latest report
- `TEST_REPORT_*.md` - Historical reports

## Notes

- Reports are automatically generated without modifying any test code
- The script runs all tests and captures results
- Reports include visual progress bars and detailed statistics
- Failed tests (if any) are highlighted with error details
- All reports are in Markdown format for easy viewing

---

**Happy Testing! 🎉**
