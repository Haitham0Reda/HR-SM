/**
 * Test Company Logger
 * This script tests if the company logger is writing to files correctly
 */

import { getLoggerForTenant } from '../utils/companyLogger.js';
import fs from 'fs';
import path from 'path';

async function testCompanyLogger() {
    console.log('🧪 Testing Company Logger...\n');

    try {
        const tenantId = 'techcorp-solutions-d8f0689c';
        const companyName = 'TechCorp Solutions';

        // Step 1: Get company logger
        console.log('1. Getting company logger...');
        const logger = getLoggerForTenant(tenantId, companyName);
        console.log('✅ Company logger created');

        // Step 2: Test different log levels
        console.log('\n2. Testing different log levels...');
        
        logger.info('Test info message', { 
            testType: 'company_logger_test',
            timestamp: new Date().toISOString()
        });
        
        logger.warn('Test warning message', { 
            testType: 'company_logger_test',
            timestamp: new Date().toISOString()
        });
        
        logger.error('Test error message', { 
            testType: 'company_logger_test',
            timestamp: new Date().toISOString()
        });
        
        logger.audit('Test audit message', { 
            testType: 'company_logger_test',
            timestamp: new Date().toISOString()
        });

        // Test user activity logging
        logger.info('User activity tracked', {
            eventType: 'user_activity',
            activityType: 'test_activity',
            userId: 'test-user-123',
            userEmail: 'test@example.com',
            userName: 'Test User',
            userRole: 'admin',
            method: 'GET',
            internalPath: '/test',
            fullUrl: '/api/v1/test',
            timestamp: new Date().toISOString()
        });

        console.log('✅ Log messages sent');

        // Step 3: Wait for logs to be written
        console.log('\n3. Waiting for logs to be written...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Step 4: Check if log files exist and have content
        console.log('\n4. Checking log files...');
        
        const logDir = path.join(process.cwd(), 'logs', 'companies', 'techcorp_solutions');
        const today = new Date().toISOString().split('T')[0];
        const logFiles = [
            `${today}-application.log`,
            `${today}-error.log`,
            `${today}-audit.log`
        ];

        console.log('Log directory:', logDir);
        
        if (fs.existsSync(logDir)) {
            console.log('✅ Log directory exists');
            
            const files = fs.readdirSync(logDir);
            console.log('Files in directory:', files);
            
            for (const logFile of logFiles) {
                const logPath = path.join(logDir, logFile);
                if (fs.existsSync(logPath)) {
                    const content = fs.readFileSync(logPath, 'utf8');
                    console.log(`✅ ${logFile} exists (${content.length} bytes)`);
                    
                    if (content.length > 0) {
                        console.log(`📝 ${logFile} content preview:`);
                        const lines = content.split('\n').filter(line => line.trim());
                        lines.slice(0, 3).forEach(line => {
                            console.log(`   ${line.substring(0, 100)}${line.length > 100 ? '...' : ''}`);
                        });
                        if (lines.length > 3) {
                            console.log(`   ... and ${lines.length - 3} more lines`);
                        }
                    } else {
                        console.log(`⚠️  ${logFile} is empty`);
                    }
                } else {
                    console.log(`❌ ${logFile} does not exist`);
                }
            }
        } else {
            console.log('❌ Log directory does not exist');
        }

        console.log('\n🎉 Company logger test completed!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Run the test
testCompanyLogger();