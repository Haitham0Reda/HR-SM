/**
 * Debug script to understand why recentActivities is empty
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import companyLogService from '../services/companyLogService.js';

dotenv.config();

const TENANT_ID = 'techcorp-solutions-d8f0689c';

async function debugRecentActivities() {
    try {
        console.log('Debugging recent activities...\n');
        
        // Connect to database
        console.log('Connecting to database...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✓ Connected to database\n');
        
        // Get log files
        console.log('1. Getting log files...');
        const logFiles = await companyLogService.getCompanyLogFiles(TENANT_ID);
        console.log(`Found ${logFiles.length} log files:`);
        logFiles.forEach(file => {
            console.log(`- ${file.name} (${file.date}) - ${file.sizeMB}MB`);
        });
        
        // Get a sample of log file content
        if (logFiles.length > 0) {
            console.log('\n2. Reading log file content...');
            const content = await companyLogService.getLogFileContent(TENANT_ID, logFiles[0].name);
            const lines = content.split('\n').filter(line => line.trim());
            
            console.log(`Total lines in log file: ${lines.length}`);
            
            let userActivityCount = 0;
            let sampleActivities = [];
            
            for (const line of lines) {
                try {
                    const logEntry = JSON.parse(line);
                    if (logEntry.eventType === 'user_activity') {
                        userActivityCount++;
                        if (sampleActivities.length < 3) {
                            sampleActivities.push(logEntry);
                        }
                    }
                } catch (parseError) {
                    // Skip invalid JSON lines
                }
            }
            
            console.log(`\nFound ${userActivityCount} user activity entries`);
            console.log('\nSample user activities:');
            sampleActivities.forEach((activity, index) => {
                console.log(`\nActivity ${index + 1}:`);
                console.log(`- Event Type: ${activity.eventType}`);
                console.log(`- Activity Type: ${activity.activityType}`);
                console.log(`- User: ${activity.userName} (${activity.userEmail})`);
                console.log(`- Timestamp: ${activity.timestamp}`);
                console.log(`- Internal Path: ${activity.internalPath}`);
            });
        }
        
        // Test the getUserActivityTracking method directly
        console.log('\n3. Testing getUserActivityTracking method...');
        const userActivities = await companyLogService.getUserActivityTracking(TENANT_ID, {
            days: 1,
            includeRealTime: true,
            limit: 10
        });
        
        console.log(`\nResults from getUserActivityTracking:`);
        console.log(`- Total activities: ${userActivities.totalActivities}`);
        console.log(`- Users count: ${Object.keys(userActivities.users).length}`);
        console.log(`- Recent activities count: ${userActivities.recentActivities.length}`);
        
        if (userActivities.recentActivities.length > 0) {
            console.log('\nFirst recent activity:');
            console.log(JSON.stringify(userActivities.recentActivities[0], null, 2));
        } else {
            console.log('\n❌ No recent activities found - this is the issue!');
        }
        
    } catch (error) {
        console.error('❌ Debug failed:', error.message);
        console.error(error.stack);
    } finally {
        await mongoose.disconnect();
        console.log('\n✓ Disconnected from database');
    }
}

debugRecentActivities();