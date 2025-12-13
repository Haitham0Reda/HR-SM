/**
 * Debug Log Files
 * This script directly reads and analyzes log files without database dependencies
 */

import fs from 'fs';
import path from 'path';

async function debugLogFiles() {
    console.log('🔍 Debugging Log Files Directly...\n');

    try {
        // Step 1: Check log directory
        const logDir = path.join(process.cwd(), 'logs', 'companies', 'techcorp_solutions');
        console.log('1. Checking log directory...');
        console.log(`Log directory: ${logDir}`);
        
        if (!fs.existsSync(logDir)) {
            console.log('❌ Log directory does not exist');
            return;
        }
        
        const files = fs.readdirSync(logDir);
        console.log(`Files found: ${files.length}`);
        files.forEach(file => {
            const filePath = path.join(logDir, file);
            const stats = fs.statSync(filePath);
            console.log(`  - ${file} (${stats.size} bytes, modified: ${stats.mtime.toISOString()})`);
        });

        // Step 2: Read application log
        console.log('\n2. Reading application log...');
        const today = new Date().toISOString().split('T')[0];
        const appLogFile = `${today}-application.log`;
        const appLogPath = path.join(logDir, appLogFile);
        
        if (!fs.existsSync(appLogPath)) {
            console.log(`❌ Application log file not found: ${appLogFile}`);
            return;
        }
        
        const content = fs.readFileSync(appLogPath, 'utf8');
        console.log(`✅ Application log read successfully (${content.length} characters)`);
        
        // Step 3: Parse log entries
        console.log('\n3. Parsing log entries...');
        const lines = content.split('\n').filter(line => line.trim());
        console.log(`Total lines: ${lines.length}`);
        
        let totalEntries = 0;
        let userActivityEntries = 0;
        let sampleUserActivities = [];
        let parseErrors = 0;
        
        for (const line of lines) {
            try {
                const logEntry = JSON.parse(line);
                totalEntries++;
                
                if (logEntry.eventType === 'user_activity') {
                    userActivityEntries++;
                    if (sampleUserActivities.length < 5) {
                        sampleUserActivities.push(logEntry);
                    }
                }
            } catch (e) {
                parseErrors++;
            }
        }
        
        console.log(`✅ Parsed entries: ${totalEntries}`);
        console.log(`📊 User activity entries: ${userActivityEntries}`);
        console.log(`⚠️  Parse errors: ${parseErrors}`);
        
        // Step 4: Show sample user activities
        if (sampleUserActivities.length > 0) {
            console.log('\n4. Sample user activities:');
            sampleUserActivities.forEach((entry, index) => {
                console.log(`\n  ${index + 1}. Activity Entry:`);
                console.log(`     Type: ${entry.activityType}`);
                console.log(`     User: ${entry.userName} (${entry.userEmail})`);
                console.log(`     Path: ${entry.internalPath}`);
                console.log(`     Method: ${entry.method}`);
                console.log(`     Timestamp: ${entry.timestamp}`);
                console.log(`     Event Type: ${entry.eventType}`);
            });
        } else {
            console.log('\n4. No user activity entries found');
        }

        // Step 5: Check timestamp format and filtering
        console.log('\n5. Checking timestamp filtering...');
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
        console.log(`Current time: ${now.toISOString()}`);
        console.log(`One day ago: ${oneDayAgo.toISOString()}`);
        
        let recentActivities = 0;
        for (const entry of sampleUserActivities) {
            const entryTime = new Date(entry.timestamp);
            const isRecent = entryTime >= oneDayAgo;
            console.log(`  - ${entry.timestamp} -> ${isRecent ? 'RECENT' : 'OLD'}`);
            if (isRecent) recentActivities++;
        }
        
        console.log(`Recent activities (within 1 day): ${recentActivities}`);

        console.log('\n🎉 Debug completed!');

    } catch (error) {
        console.error('❌ Debug failed:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Run the debug
debugLogFiles();