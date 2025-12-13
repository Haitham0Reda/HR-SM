/**
 * Test Log File Reading
 * This script tests if the log file reading methods work correctly
 */

import fs from 'fs';
import path from 'path';

async function testLogFileReading() {
    console.log('🧪 Testing Log File Reading...\n');

    try {
        const tenantId = 'techcorp-solutions-d8f0689c';
        const logDir = path.join(process.cwd(), 'logs', 'companies', 'techcorp_solutions');
        const today = new Date().toISOString().split('T')[0];
        const appLogFile = `${today}-application.log`;
        const appLogPath = path.join(logDir, appLogFile);

        // Step 1: Direct file reading
        console.log('1. Direct file reading...');
        if (fs.existsSync(appLogPath)) {
            const content = fs.readFileSync(appLogPath, 'utf8');
            console.log(`✅ File read directly: ${content.length} characters`);
            
            const lines = content.split('\n').filter(line => line.trim());
            console.log(`Total lines: ${lines.length}`);
            
            let userActivityCount = 0;
            for (const line of lines) {
                try {
                    const logEntry = JSON.parse(line);
                    if (logEntry.eventType === 'user_activity') {
                        userActivityCount++;
                    }
                } catch (e) {
                    // Skip invalid JSON
                }
            }
            console.log(`User activity entries: ${userActivityCount}`);
        } else {
            console.log('❌ Log file not found');
            return;
        }

        // Step 2: Simulate the companyLogService logic
        console.log('\n2. Simulating companyLogService logic...');
        
        // Simulate getCompanyLogFiles
        const files = fs.readdirSync(logDir);
        const logFiles = files
            .filter(file => file.endsWith('.log'))
            .map(file => {
                const filePath = path.join(logDir, file);
                const stats = fs.statSync(filePath);
                return {
                    name: file,
                    path: filePath,
                    size: stats.size,
                    date: file.includes(today) ? today : '2025-12-12', // Simplified date extraction
                    type: file.includes('application') ? 'application' : 
                          file.includes('error') ? 'error' : 
                          file.includes('audit') ? 'audit' : 'unknown',
                    modified: stats.mtime
                };
            });
        
        console.log(`Found ${logFiles.length} log files:`);
        logFiles.forEach(file => {
            console.log(`  - ${file.name} (${file.type}, ${file.size} bytes, date: ${file.date})`);
        });

        // Step 3: Filter for application logs within date range
        console.log('\n3. Filtering for recent application logs...');
        const cutoffDate = new Date(Date.now() - (1 * 24 * 60 * 60 * 1000));
        console.log(`Cutoff date: ${cutoffDate.toISOString()}`);
        
        const recentAppLogs = logFiles.filter(file => {
            const isApplication = file.type === 'application';
            const isRecent = new Date(file.date) >= cutoffDate;
            console.log(`  ${file.name}: application=${isApplication}, recent=${isRecent} (${file.date})`);
            return isApplication && isRecent;
        });
        
        console.log(`Recent application logs: ${recentAppLogs.length}`);

        // Step 4: Process each log file
        console.log('\n4. Processing log files...');
        let totalActivities = 0;
        
        for (const file of recentAppLogs) {
            console.log(`Processing ${file.name}...`);
            
            const content = fs.readFileSync(file.path, 'utf8');
            const lines = content.split('\n').filter(line => line.trim());
            
            let fileActivities = 0;
            for (const line of lines) {
                try {
                    const logEntry = JSON.parse(line);
                    
                    if (logEntry.eventType === 'user_activity') {
                        const entryTime = new Date(logEntry.timestamp);
                        const isRecent = entryTime >= cutoffDate;
                        
                        if (isRecent) {
                            fileActivities++;
                            totalActivities++;
                            
                            if (fileActivities <= 3) {
                                console.log(`    Activity: ${logEntry.activityType} by ${logEntry.userName} at ${logEntry.timestamp}`);
                            }
                        }
                    }
                } catch (e) {
                    // Skip invalid JSON
                }
            }
            
            console.log(`  Found ${fileActivities} activities in ${file.name}`);
        }
        
        console.log(`\n📊 Total activities found: ${totalActivities}`);

        console.log('\n🎉 Test completed!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Run the test
testLogFileReading();