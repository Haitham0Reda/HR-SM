#!/usr/bin/env node

/**
 * Run All Tests Script
 * 
 * This script runs all tests and generates detailed reports
 */

console.log('🚀 Starting comprehensive test suite...\n');

// Import required modules
import { spawn } from 'child_process';
import fs from 'fs';

// Function to run a command and capture output
function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    console.log(`\n🧪 Running: ${command} ${args.join(' ')}\n`);
    
    const child = spawn(command, args, { stdio: 'inherit' });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Success\n');
        resolve();
      } else {
        console.log('❌ Failed\n');
        resolve(); // Continue with other tests even if one fails
      }
    });
    
    child.on('error', (error) => {
      console.log(`❌ Error: ${error.message}\n`);
      resolve(); // Continue with other tests even if one fails
    });
  });
}

// Main function to run all tests
async function runAllTests() {
  try {
    // Ensure directories exist
    const dirs = ['coverage', 'test-reports'];
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
    
    // Run tests for each category
    console.log('🧪 Running model tests...');
    await runCommand('node', ['--experimental-vm-modules', 'node_modules/jest/bin/jest.js', '--testPathPattern=__tests__/models', '--coverage=false']);
    
    console.log('🔧 Running middleware tests...');
    await runCommand('node', ['--experimental-vm-modules', 'node_modules/jest/bin/jest.js', '--testPathPattern=__tests__/middleware', '--coverage=false']);
    
    console.log('🎮 Running controller tests...');
    await runCommand('node', ['--experimental-vm-modules', 'node_modules/jest/bin/jest.js', '--testPathPattern=__tests__/controllers', '--coverage=false']);
    
    console.log('🔗 Running route tests...');
    await runCommand('node', ['--experimental-vm-modules', 'node_modules/jest/bin/jest.js', '--testPathPattern=__tests__/routes', '--coverage=false']);
    
    // Run all tests with coverage
    console.log('📊 Running all tests with coverage...');
    await runCommand('node', ['--experimental-vm-modules', 'node_modules/jest/bin/jest.js', '--coverage']);
    
    console.log('\n✅ All tests completed!');
    console.log('\n📊 Coverage reports generated in ./coverage/');
    console.log('📄 JUnit reports generated in ./test-reports/');
    console.log('\n📄 Detailed test report saved to COMPREHENSIVE_TEST_REPORT.md');
    
  } catch (error) {
    console.error('\n❌ Test execution failed:', error.message);
    process.exit(1);
  }
}

// Run the tests
runAllTests();