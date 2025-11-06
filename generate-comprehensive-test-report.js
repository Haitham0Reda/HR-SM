#!/usr/bin/env node

/**
 * Comprehensive Test Report Generator
 * 
 * This script runs all tests and generates detailed reports for models, controllers, middleware, and routes
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

// Function to run a command and capture output
function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    let output = '';
    const child = spawn(command, args, { ...options, stdio: ['pipe', 'pipe', 'pipe'] });
    
    child.stdout.on('data', (data) => {
      output += data.toString();
      process.stdout.write(data);
    });
    
    child.stderr.on('data', (data) => {
      output += data.toString();
      process.stderr.write(data);
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(`Command failed with exit code ${code}: ${output}`));
      }
    });
    
    child.on('error', (error) => {
      reject(error);
    });
  });
}

// Function to generate test report
async function generateTestReport() {
  console.log('🚀 Starting comprehensive test suite...\n');
  
  try {
    // Ensure directories exist
    const dirs = ['coverage', 'test-reports'];
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
    
    // Run tests for each category
    console.log('🧪 Running model tests...\n');
    try {
      await runCommand('npm', ['test', '--', '--testPathPattern=__tests__/models', '--coverage=false']);
      console.log('✅ Model tests completed\n');
    } catch (error) {
      console.log('❌ Model tests failed:\n', error.message);
    }
    
    console.log('🔧 Running middleware tests...\n');
    try {
      await runCommand('npm', ['test', '--', '--testPathPattern=__tests__/middleware', '--coverage=false']);
      console.log('✅ Middleware tests completed\n');
    } catch (error) {
      console.log('❌ Middleware tests failed:\n', error.message);
    }
    
    console.log('🎮 Running controller tests...\n');
    try {
      await runCommand('npm', ['test', '--', '--testPathPattern=__tests__/controllers', '--coverage=false']);
      console.log('✅ Controller tests completed\n');
    } catch (error) {
      console.log('❌ Controller tests failed:\n', error.message);
    }
    
    console.log('🔗 Running route tests...\n');
    try {
      await runCommand('npm', ['test', '--', '--testPathPattern=__tests__/routes', '--coverage=false']);
      console.log('✅ Route tests completed\n');
    } catch (error) {
      console.log('❌ Route tests failed:\n', error.message);
    }
    
    // Run all tests with coverage
    console.log('📊 Running all tests with coverage...\n');
    try {
      await runCommand('npm', ['test', '--', '--coverage', '--verbose']);
      console.log('\n✅ All tests completed successfully!');
    } catch (error) {
      console.log('\n⚠️  Some tests failed, but coverage report generated');
    }
    
    console.log('\n📊 Coverage reports generated in ./coverage/');
    console.log('📄 JUnit reports generated in ./test-reports/');
    
    // Check if coverage directory exists and show summary
    if (fs.existsSync('./coverage/coverage-summary.json')) {
      const summary = JSON.parse(fs.readFileSync('./coverage/coverage-summary.json', 'utf8'));
      console.log('\n📈 Coverage Summary:');
      console.log(`   Statements: ${summary.total.statements.pct}%`);
      console.log(`   Branches: ${summary.total.branches.pct}%`);
      console.log(`   Functions: ${summary.total.functions.pct}%`);
      console.log(`   Lines: ${summary.total.lines.pct}%`);
    }
    
    // Generate a summary report
    generateSummaryReport();
    
  } catch (error) {
    console.error('\n❌ Test execution failed:', error.message);
    process.exit(1);
  }
}

// Function to generate a summary report
function generateSummaryReport() {
  const report = `
# Comprehensive Test Report

## Summary

This report provides an overview of the testing coverage for the HR-SM application.

## Test Categories

1. **Models** - Data models and their validation
2. **Controllers** - Business logic and request handling
3. **Middleware** - Authentication, authorization, and request processing
4. **Routes** - API endpoints and their integration

## Test Files Created

- \`__tests__/models/user.model.test.js\` - User model tests
- \`__tests__/middleware/auth.middleware.test.js\` - Authentication middleware tests
- \`__tests__/controllers/user.controller.test.js\` - User controller tests
- \`__tests__/routes/user.routes.test.js\` - User routes tests

## How to Run Tests

\`\`\`bash
# Run all tests
npm test

# Run specific test categories
npm run test:models
npm run test:controllers
npm run test:middleware
npm run test:routes

# Run tests with coverage
npm run test:coverage

# Run this comprehensive report
node generate-comprehensive-test-report.js
\`\`\`

## Coverage Reports

Coverage reports are generated in the \`coverage/\` directory:
- HTML report: \`coverage/lcov-report/index.html\`
- JSON summary: \`coverage/coverage-summary.json\`
- LCOV data: \`coverage/lcov.info\`

## JUnit Reports

JUnit XML reports are generated in the \`test-reports/\` directory for CI/CD integration.
`;

  fs.writeFileSync('COMPREHENSIVE_TEST_REPORT.md', report);
  console.log('\n📄 Detailed test report saved to COMPREHENSIVE_TEST_REPORT.md');
}

// Run the test report generation
generateTestReport();