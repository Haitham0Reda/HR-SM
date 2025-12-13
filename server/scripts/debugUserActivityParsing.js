/**
 * Debug User Activity Parsing
 * This script simulates the getUserActivityTracking logic without database dependencies
 */

import fs from 'fs';
import path from 'path';

async function debugUserActivityParsing() {
    console.log('🔍 Debugging User Activity Parsing Logic...\n');

    try {
        const tenantId = 'techcorp-solutions-d8f0689c';
        const companyName = 'TechCorp Solutions';
        const days = 1;

        // Step 1: Simulate the directory path logic
        console.log('1. Simulating directory path logic...');
        const sanitizedName = companyName
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');
        
        console.log(`Company name: "${companyName}"`);
        console.log(`Sanitized name: "${sanitizedName}"`);
        
        const baseLogsDir = path.join(process.cwd(), 'logs');
        const companyLogsDir = path.join(baseLogsDir, 'companies');
        const companyDir = path.join(companyLogsDir, sanitizedName);
        
        console.log(`Expected directory: ${companyDir}`);
        console.log(`Directory exists: ${fs.existsSync(companyDir)}`);

        if (!fs.existsSync(companyDir)) {
            console.log('❌ Directory not found!');
            return;
        }

        // Step 2: Get log files
        console.log('\n2. Getting log files...');
        const files = fs.readdirSync(companyDir);
        console.log(`Files found: ${files.length}`);
        
        const logFiles = [];
        for (const file of files) {
            const filePath = path.join(companyDir, file);
            const stats = fs.statSync(filePath);
            
            const logFile = {
                name: file,
                size: stats.size,
                modified: stats.mtime,
                type: file.includes('application') ? 'application' : 
                      file.includes('error') ? 'error' : 
                      file.includes('audit') ? 'audit' : 'unknown',
                path: filePath,
                date: file.match(/(\d{4}-\d{2}-\d{2})/)?.[1] || '1970-01-01'
            };
            
            logFiles.push(logFile);
            console.log(`  - ${file} (${logFile.type}, ${logFile.size} bytes, date: ${logFile.date})`);
        }

        // Step 3: Filter for recent application logs
        console.log('\n3. Filtering for recent application logs...');
        const cutoffDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
        console.log(`Cutoff date: ${cutoffDate.toISOString()}`);
        
        const recentAppLogs = logFiles.filter(file => {
            const isApplication = file.type === 'application';
            const fileDate = new Date(file.date);
            const isRecent = fileDate >= cutoffDate;
            
            console.log(`  ${file.name}: application=${isApplication}, fileDate=${file.date}, recent=${isRecent}`);
            return isApplication && isRecent;
        });
        
        console.log(`Recent application logs: ${recentAppLogs.length}`);

        // Step 4: Process each log file (simulate getUserActivityTracking logic)
        console.log('\n4. Processing log files...');
        
        const userActivities = {
            tenantId,
            companyName,
            period: `${days} days`,
            totalActivities: 0,
            users: {},
            recentActivities: [],
            activitySummary: {
                byType: {},
                byUser: {},
                byHour: {},
                byDay: {}
            }
        };

        for (const file of recentAppLogs) {
            console.log(`\nProcessing ${file.name}...`);
            
            try {
                const content = fs.readFileSync(file.path, 'utf8');
                const lines = content.split('\n').filter(line => line.trim());
                console.log(`  Total lines: ${lines.length}`);
                
                let fileActivities = 0;
                let parseErrors = 0;
                
                for (const line of lines) {
                    try {
                        const logEntry = JSON.parse(line);
                        
                        // Check if it's a user activity entry
                        if (logEntry.eventType === 'user_activity') {
                            const entryTime = new Date(logEntry.timestamp);
                            const isRecent = entryTime >= cutoffDate;
                            
                            console.log(`    Found activity: ${logEntry.activityType} at ${logEntry.timestamp}, recent: ${isRecent}`);
                            
                            if (isRecent) {
                                fileActivities++;
                                userActivities.totalActivities++;
                                
                                // Add to recent activities
                                userActivities.recentActivities.push({
                                    userId: logEntry.userId,
                                    userEmail: logEntry.userEmail,
                                    userName: logEntry.userName,
                                    activityType: logEntry.activityType,
                                    internalPath: logEntry.internalPath,
                                    method: logEntry.method,
                                    timestamp: logEntry.timestamp,
                                    ip: logEntry.ip,
                                    userAgent: logEntry.userAgent
                                });
                                
                                // Update summary
                                userActivities.activitySummary.byType[logEntry.activityType] = 
                                    (userActivities.activitySummary.byType[logEntry.activityType] || 0) + 1;
                            }
                        }
                    } catch (parseError) {
                        parseErrors++;
                    }
                }
                
                console.log(`  Activities found: ${fileActivities}`);
                console.log(`  Parse errors: ${parseErrors}`);
                
            } catch (fileError) {
                console.error(`  Error reading file: ${fileError.message}`);
            }
        }

        // Step 5: Show results
        console.log('\n5. Final results...');
        console.log(`Total activities: ${userActivities.totalActivities}`);
        console.log(`Recent activities: ${userActivities.recentActivities.length}`);
        console.log(`Activity types: ${Object.keys(userActivities.activitySummary.byType).length}`);
        
        if (userActivities.recentActivities.length > 0) {
            console.log('\nSample activities:');
            userActivities.recentActivities.slice(0, 5).forEach((activity, index) => {
                console.log(`  ${index + 1}. ${activity.activityType} by ${activity.userName} at ${activity.timestamp}`);
            });
        }

        console.log('\n🎉 Debug completed!');

    } catch (error) {
        console.error('❌ Debug failed:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Run the debug
debugUserActivityParsing();