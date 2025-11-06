import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

// Function to run a command and wait for it to complete
function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`Running: ${command} ${args.join(' ')}`);
    
    const process = spawn(command, args, { 
      stdio: 'inherit',
      ...options
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });
    
    process.on('error', (error) => {
      reject(error);
    });
  });
}

// Function to ensure directories exist
function ensureDirectories() {
  const dirs = ['test-reports', 'coverage'];
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

// Main function
async function main() {
  try {
    console.log('Starting comprehensive test suite...\n');
    
    // Ensure required directories exist
    ensureDirectories();
    
    // Run all tests with coverage and JUnit reporting
    console.log('1. Running all tests with coverage...\n');
    await runCommand('npx', ['jest', '--coverage', '--ci']);
    
    // Generate detailed report
    console.log('\n2. Generating detailed test report...\n');
    await runCommand('node', ['scripts/generate-test-report.js']);
    
    // Print success message
    console.log('\n=== COMPREHENSIVE TEST SUITE COMPLETED ===');
    console.log('Reports generated in:');
    console.log('- test-reports/TEST_REPORT.md (Markdown summary)');
    console.log('- test-reports/jest-junit.xml (JUnit XML format)');
    console.log('- coverage/ (Detailed coverage reports in HTML, JSON, etc.)');
    
  } catch (error) {
    console.error('Error running test suite:', error);
    process.exit(1);
  }
}

// Run the script
main();