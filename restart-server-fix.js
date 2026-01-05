/**
 * Server Restart Script for Department Fix
 * 
 * This script helps restart the server after applying the department creation fixes
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🔧 Restarting server with department creation fixes...\n');

// Kill any existing server processes
console.log('1. Stopping existing server processes...');

// For Windows
if (process.platform === 'win32') {
    spawn('taskkill', ['/f', '/im', 'node.exe'], { stdio: 'inherit' });
} else {
    // For Unix-like systems
    spawn('pkill', ['-f', 'node.*server'], { stdio: 'inherit' });
}

// Wait a moment for processes to stop
setTimeout(() => {
    console.log('2. Starting server with updated routes...');
    
    // Start the server
    const serverProcess = spawn('npm', ['start'], {
        stdio: 'inherit',
        cwd: process.cwd()
    });
    
    serverProcess.on('error', (error) => {
        console.error('❌ Failed to start server:', error);
    });
    
    serverProcess.on('close', (code) => {
        console.log(`Server process exited with code ${code}`);
    });
    
    console.log('✅ Server restart initiated');
    console.log('\n📋 Changes Applied:');
    console.log('   ✅ Fixed route conflicts');
    console.log('   ✅ Updated middleware chain');
    console.log('   ✅ Added proper validation');
    console.log('   ✅ Improved error handling');
    console.log('   ✅ Enhanced frontend validation');
    console.log('\n🌐 Test the fix at: http://localhost:3000/departments');
    console.log('🔧 Debug tool: Open debug-department-creation.html in browser');
    
}, 2000);