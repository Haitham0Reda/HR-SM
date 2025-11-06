#!/usr/bin/env node

/**
 * Comprehensive Test Runner
 * 
 * This script runs all tests and generates detailed reports
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

// Function to run a command and capture output
function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { ...options, stdio: 'inherit' });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
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
    
    // Run all tests with coverage
    console.log('🧪 Running all tests with coverage...\n');
    await runCommand('npm', ['test', '--', '--coverage', '--verbose']);
    
    console.log('\n✅ All tests completed successfully!');
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
    
  } catch (error) {
    console.error('\n❌ Test execution failed:', error.message);
    process.exit(1);
  }
}

// Run the test report generation
generateTestReport();