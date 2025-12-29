/**
 * Custom test reporter for E2E tests
 */

// Test validation structure
describe('E2E Test Reporter', () => {
    it('should have reporter class available', () => {
        expect(typeof E2ETestReporter).to.equal('function');
    });
});

import fs from 'fs';
import path from 'path';

class E2ETestReporter {
    constructor() {
        this.results = {
            startTime: null,
            endTime: null,
            duration: 0,
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            skippedTests: 0,
            suites: [],
            failures: [],
            performance: {
                pageLoadTimes: [],
                apiResponseTimes: [],
                networkRequests: []
            },
            coverage: {
                statements: 0,
                branches: 0,
                functions: 0,
                lines: 0
            },
            environment: {
                browser: null,
                viewport: null,
                baseUrl: null,
                nodeVersion: process.version,
                cypressVersion: null
            }
        };

        this.reportDir = 'e2e/reports';
        this.ensureReportDirectory();
    }

    ensureReportDirectory() {
        if (!fs.existsSync(this.reportDir)) {
            fs.mkdirSync(this.reportDir, { recursive: true });
        }
    }

    onRunStart(config) {
        this.results.startTime = new Date();
        this.results.environment.browser = config.browser?.name || 'unknown';
        this.results.environment.viewport = `${config.viewportWidth}x${config.viewportHeight}`;
        this.results.environment.baseUrl = config.baseUrl;

        // Starting E2E test run
    }

    onRunEnd(results) {
        this.results.endTime = new Date();
        this.results.duration = this.results.endTime - this.results.startTime;

        // Process Cypress results
        if (results.runs) {
            results.runs.forEach(run => {
                run.tests.forEach(test => {
                    this.results.totalTests++;

                    if (test.state === 'passed') {
                        this.results.passedTests++;
                    } else if (test.state === 'failed') {
                        this.results.failedTests++;
                        this.results.failures.push({
                            title: test.title,
                            fullTitle: test.fullTitle,
                            error: test.displayError,
                            stack: test.err?.stack,
                            screenshot: test.screenshots?.[0]?.path,
                            video: run.video
                        });
                    } else {
                        this.results.skippedTests++;
                    }
                });
            });
        }

        this.generateReports();
        // E2E test run completed
    }

    onTestStart(test) {
        // Starting test
    }

    onTestEnd(test) {
        const status = test.state === 'passed' ? '✅' : test.state === 'failed' ? '❌' : '⏭️';
        // Test completed with status

        // Collect performance data
        if (test.performance) {
            this.results.performance.pageLoadTimes.push({
                test: test.title,
                time: test.performance.pageLoad
            });

            this.results.performance.apiResponseTimes.push({
                test: test.title,
                time: test.performance.apiResponse
            });
        }
    }

    addPerformanceMetric(metric) {
        switch (metric.type) {
            case 'pageLoad':
                this.results.performance.pageLoadTimes.push(metric);
                break;
            case 'apiResponse':
                this.results.performance.apiResponseTimes.push(metric);
                break;
            case 'networkRequest':
                this.results.performance.networkRequests.push(metric);
                break;
        }
    }

    generateReports() {
        // Generate JSON report
        this.generateJSONReport();

        // Generate HTML report
        this.generateHTMLReport();

        // Generate JUnit XML report
        this.generateJUnitReport();

        // Generate performance report
        this.generatePerformanceReport();

        // Generate summary report
        this.generateSummaryReport();
    }

    generateJSONReport() {
        const reportPath = path.join(this.reportDir, 'e2e-results.json');
        fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
        // JSON report generated
    }

    generateHTMLReport() {
        const htmlContent = this.generateHTMLContent();
        const reportPath = path.join(this.reportDir, 'e2e-report.html');
        fs.writeFileSync(reportPath, htmlContent);
        // HTML report generated
    }

    generateHTMLContent() {
        const passRate = ((this.results.passedTests / this.results.totalTests) * 100).toFixed(1);
        const avgPageLoad = this.calculateAverage(this.results.performance.pageLoadTimes.map(p => p.time));
        const avgApiResponse = this.calculateAverage(this.results.performance.apiResponseTimes.map(p => p.time));

        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>E2E Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .stat-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .stat-value { font-size: 2em; font-weight: bold; margin-bottom: 5px; }
        .stat-label { color: #666; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .skipped { color: #ffc107; }
        .section { margin-bottom: 30px; }
        .section h2 { border-bottom: 2px solid #007bff; padding-bottom: 10px; }
        .failure { background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px; padding: 15px; margin-bottom: 10px; }
        .failure-title { font-weight: bold; color: #721c24; }
        .failure-error { font-family: monospace; background: #fff; padding: 10px; border-radius: 4px; margin-top: 10px; }
        .performance-table { width: 100%; border-collapse: collapse; }
        .performance-table th, .performance-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .performance-table th { background-color: #f2f2f2; }
        .environment { background: #e9ecef; padding: 15px; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>E2E Test Report</h1>
            <p>Generated on ${this.results.endTime?.toLocaleString()}</p>
        </div>
        
        <div class="stats">
            <div class="stat-card">
                <div class="stat-value">${this.results.totalTests}</div>
                <div class="stat-label">Total Tests</div>
            </div>
            <div class="stat-card">
                <div class="stat-value passed">${this.results.passedTests}</div>
                <div class="stat-label">Passed</div>
            </div>
            <div class="stat-card">
                <div class="stat-value failed">${this.results.failedTests}</div>
                <div class="stat-label">Failed</div>
            </div>
            <div class="stat-card">
                <div class="stat-value skipped">${this.results.skippedTests}</div>
                <div class="stat-label">Skipped</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${passRate}%</div>
                <div class="stat-label">Pass Rate</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${(this.results.duration / 1000).toFixed(1)}s</div>
                <div class="stat-label">Duration</div>
            </div>
        </div>
        
        <div class="section">
            <h2>Environment</h2>
            <div class="environment">
                <p><strong>Browser:</strong> ${this.results.environment.browser}</p>
                <p><strong>Viewport:</strong> ${this.results.environment.viewport}</p>
                <p><strong>Base URL:</strong> ${this.results.environment.baseUrl}</p>
                <p><strong>Node Version:</strong> ${this.results.environment.nodeVersion}</p>
            </div>
        </div>
        
        ${this.results.failures.length > 0 ? `
        <div class="section">
            <h2>Failed Tests</h2>
            ${this.results.failures.map(failure => `
                <div class="failure">
                    <div class="failure-title">${failure.fullTitle}</div>
                    <div class="failure-error">${failure.error}</div>
                    ${failure.screenshot ? `<p><strong>Screenshot:</strong> ${failure.screenshot}</p>` : ''}
                </div>
            `).join('')}
        </div>
        ` : ''}
        
        <div class="section">
            <h2>Performance Metrics</h2>
            <table class="performance-table">
                <thead>
                    <tr>
                        <th>Metric</th>
                        <th>Average</th>
                        <th>Min</th>
                        <th>Max</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Page Load Time</td>
                        <td>${avgPageLoad.toFixed(0)}ms</td>
                        <td>${Math.min(...this.results.performance.pageLoadTimes.map(p => p.time)).toFixed(0)}ms</td>
                        <td>${Math.max(...this.results.performance.pageLoadTimes.map(p => p.time)).toFixed(0)}ms</td>
                    </tr>
                    <tr>
                        <td>API Response Time</td>
                        <td>${avgApiResponse.toFixed(0)}ms</td>
                        <td>${Math.min(...this.results.performance.apiResponseTimes.map(p => p.time)).toFixed(0)}ms</td>
                        <td>${Math.max(...this.results.performance.apiResponseTimes.map(p => p.time)).toFixed(0)}ms</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</body>
</html>`;
    }

    generateJUnitReport() {
        const xml = this.generateJUnitXML();
        const reportPath = path.join(this.reportDir, 'junit-results.xml');
        fs.writeFileSync(reportPath, xml);
        // JUnit report generated
    }

    generateJUnitXML() {
        const testsuites = `
<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="E2E Tests" tests="${this.results.totalTests}" failures="${this.results.failedTests}" time="${(this.results.duration / 1000).toFixed(3)}">
  <testsuite name="E2E Test Suite" tests="${this.results.totalTests}" failures="${this.results.failedTests}" time="${(this.results.duration / 1000).toFixed(3)}">
    ${this.results.failures.map(failure => `
    <testcase name="${failure.title}" classname="${failure.fullTitle}" time="0">
      <failure message="${failure.error}" type="AssertionError">
        ${failure.stack || failure.error}
      </failure>
    </testcase>
    `).join('')}
  </testsuite>
</testsuites>`;

        return testsuites;
    }

    generatePerformanceReport() {
        const performanceData = {
            summary: {
                avgPageLoadTime: this.calculateAverage(this.results.performance.pageLoadTimes.map(p => p.time)),
                avgApiResponseTime: this.calculateAverage(this.results.performance.apiResponseTimes.map(p => p.time)),
                totalNetworkRequests: this.results.performance.networkRequests.length
            },
            details: {
                pageLoadTimes: this.results.performance.pageLoadTimes,
                apiResponseTimes: this.results.performance.apiResponseTimes,
                networkRequests: this.results.performance.networkRequests
            },
            thresholds: {
                pageLoadTime: 5000,
                apiResponseTime: 2000
            }
        };

        const reportPath = path.join(this.reportDir, 'performance-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(performanceData, null, 2));
        // Performance report generated
    }

    generateSummaryReport() {
        const summary = {
            timestamp: this.results.endTime?.toISOString(),
            duration: this.results.duration,
            totalTests: this.results.totalTests,
            passedTests: this.results.passedTests,
            failedTests: this.results.failedTests,
            skippedTests: this.results.skippedTests,
            passRate: ((this.results.passedTests / this.results.totalTests) * 100).toFixed(1),
            environment: this.results.environment,
            status: this.results.failedTests === 0 ? 'PASSED' : 'FAILED'
        };

        const reportPath = path.join(this.reportDir, 'summary.json');
        fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2));
        // Summary report generated

        // Also log summary to console
        // E2E Test Summary
        // Status, Total Tests, Passed, Failed, Skipped, Pass Rate, Duration
    }

    calculateAverage(numbers) {
        if (numbers.length === 0) return 0;
        return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    }

    // Method to be called from Cypress tests
    static recordPerformanceMetric(type, data) {
        // This would be called from within tests to record performance data
        if (global.e2eReporter) {
            global.e2eReporter.addPerformanceMetric({ type, ...data });
        }
    }
}

// Export for use in Cypress configuration
export default E2ETestReporter;

// Create global instance
global.e2eReporter = new E2ETestReporter();