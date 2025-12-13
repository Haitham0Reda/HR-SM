/**
 * Debug User Activity Service
 * This script debugs the getUserActivityTracking method to see why it's not returning data
 */

import companyLogService from '../services/companyLogService.js';
import fs from 'fs';
import path from 'path';

async function debugUserActivityService() {
    console.log('🔍 Debugging User Activity Service...\n');

    try {
        const tenantId = 'techcorp-solutions-d8f0689c';

        // Step 1: Check log files
        console.log('1. Checking log files...');
        const logFiles = await companyLogService.getCompanyLogFiles(tenantId);
        console.log('Log files found:', logFiles.length);
        
        logFiles.forEach(file => {
            console.log(`  - ${file.name} (${file.type}, ${file.size} bytes, ${file.date})`);
        });

        // Step 2: Check application log content
        console.log('\n2. Checking application log content...');
        const today = new Date().toISOString().split('T')[0];
        const appLogFile = logFiles.find(f => f.name.includes('application') && f.name.includes(today));
        
        if (appLogFile) {
            console.log(`Found today's application log: ${appLogFile.name}`);
            
            const content = await companyLogService.getLogFileContent(tenantId, appLogFile.name);
            console.log(`Log content length: ${content.length} characters`);
            
            const lines = content.split('\n').filter(line => line.trim());
            console.log(`Total lines: ${lines.length}`);
            
            let userActivityCount = 0;
            let sampleEntries = [];
            
            for (const line of lines) {
                try {
                    const logEntry = JSON.parse(line);
                    if (logEntry.eventType === 'user_activity') {
                        userActivityCount++;
                        if (sampleEntries.length < 3) {
                            sampleEntries.push(logEntry);
                        }
                    }
                } catch (e) {
                    // Skip invalid JSON
                }
            }
            
            console.log(`User activity entries found: ${userActivityCount}`);
            
            if (sampleEntries.length > 0) {
                console.log('\nSample user activity entries:');
                sampleEntries.forEach((entry, index) => {
                    console.log(`  ${index + 1}. ${entry.activityType} by ${entry.userName} at ${entry.timestamp}`);
                });
            }
        } else {
            console.log('No application log file found for today');
        }

        // Step 3: Test getUserActivityTracking method
        console.log('\n3. Testing getUserActivityTracking method...');
        const result = await companyLogService.getUserActivityTracking(tenantId, {
            days: 1,
            includeRealTime: true,
            limit: 100
        });
        
        console.log('Result summary:');
        console.log(`  - Total activities: ${result.totalActivities}`);
        console.log(`  - Users count: ${Object.keys(result.users).length}`);
        console.log(`  - Recent activities: ${result.recentActivities.length}`);
        console.log(`  - Activity types: ${Object.keys(result.activitySummary.byType).length}`);
        
        if (result.recentActivities.length > 0) {
            console.log('\nRecent activities:');
            result.recentActivities.slice(0, 3).forEach((activity, index) => {
                console.log(`  ${index + 1}. ${activity.activityType} by ${activity.userName} at ${activity.timestamp}`);
            });
        }

        // Step 4: Check date filtering
        console.log('\n4. Checking date filtering...');
        const cutoffDate = new Date(Date.now() - (1 * 24 * 60 * 60 * 1000));
        console.log(`Cutoff date (1 day ago): ${cutoffDate.toISOString()}`);
        
        if (appLogFile) {
            const fileDate = new Date(appLogFile.date);
            console.log(`Application log file date: ${fileDate.toISOString()}`);
            console.log(`File is within cutoff: ${fileDate >= cutoffDate}`);
        }

        console.log('\n🎉 Debug completed!');

    } catch (error) {
        console.error('❌ Debug failed:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Run the debug
debugUserActivityService();