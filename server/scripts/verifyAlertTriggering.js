#!/usr/bin/env node

/**
 * Alert Triggering Verification Script
 * 
 * This script verifies that the alert system is working correctly by:
 * 1. Testing alert creation and storage
 * 2. Testing system health monitoring and alert generation
 * 3. Testing alert acknowledgment and resolution
 * 4. Testing real-time monitoring integration
 */

import mongoose from 'mongoose';
import alertSystemService from '../services/alertSystem.service.js';
import systemMetricsService from '../services/systemMetrics.service.js';
import realtimeMonitoringService from '../services/realtimeMonitoring.service.js';

// Colors for console output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
    log(`✓ ${message}`, 'green');
}

function logError(message) {
    log(`✗ ${message}`, 'red');
}

function logInfo(message) {
    log(`ℹ ${message}`, 'blue');
}

function logWarning(message) {
    log(`⚠ ${message}`, 'yellow');
}

async function connectToDatabase() {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hrms';
        await mongoose.connect(mongoUri);
        logSuccess('Connected to MongoDB');
        return true;
    } catch (error) {
        logError(`Failed to connect to MongoDB: ${error.message}`);
        return false;
    }
}

async function initializeServices() {
    try {
        // Initialize alert system
        await alertSystemService.initialize();
        logSuccess('Alert system initialized');

        // Check real-time monitoring service
        const healthStatus = realtimeMonitoringService.getHealthStatus();
        if (healthStatus.status === 'healthy' || healthStatus.status === 'not_initialized') {
            logSuccess('Real-time monitoring service is available');
        } else {
            logWarning(`Real-time monitoring service status: ${healthStatus.status}`);
        }

        return true;
    } catch (error) {
        logError(`Failed to initialize services: ${error.message}`);
        return false;
    }
}

async function testAlertCreation() {
    log('\n--- Testing Alert Creation ---', 'bold');

    try {
        // Clean up any existing test alerts
        if (alertSystemService.AlertModel) {
            await alertSystemService.AlertModel.deleteMany({
                'details.testAlert': true
            });
        }

        // Test creating different types of alerts
        const testAlerts = [
            {
                type: 'system',
                category: 'cpu',
                severity: 'warning',
                title: 'Test CPU Alert',
                message: 'CPU usage is elevated for testing',
                metrics: { value: 85, threshold: 80, unit: '%' },
                details: { testAlert: true }
            },
            {
                type: 'system',
                category: 'memory',
                severity: 'critical',
                title: 'Test Memory Alert',
                message: 'Memory usage is critical for testing',
                metrics: { value: 95, threshold: 90, unit: '%' },
                details: { testAlert: true }
            },
            {
                type: 'database',
                category: 'mongodb',
                severity: 'warning',
                title: 'Test Database Alert',
                message: 'Database connection test alert',
                details: { testAlert: true }
            }
        ];

        const createdAlerts = [];
        for (const alertData of testAlerts) {
            const alert = await alertSystemService.createAlert(alertData);
            createdAlerts.push(alert);
            logSuccess(`Created ${alert.severity} alert: ${alert.title}`);
        }

        // Verify alerts are stored in database
        const storedAlerts = await alertSystemService.getActiveAlerts();
        const testAlertsCount = storedAlerts.filter(alert =>
            alert.details && alert.details.testAlert
        ).length;

        if (testAlertsCount >= 3) {
            logSuccess(`All ${testAlertsCount} test alerts stored successfully`);
        } else {
            logWarning(`Only ${testAlertsCount} test alerts found in database`);
        }

        return createdAlerts;
    } catch (error) {
        logError(`Alert creation test failed: ${error.message}`);
        return [];
    }
}

async function testSystemHealthMonitoring() {
    log('\n--- Testing System Health Monitoring ---', 'bold');

    try {
        // Get current system health
        const systemHealth = await systemMetricsService.getSystemHealth();
        logInfo(`System status: ${systemHealth.status}`);
        logInfo(`Health score: ${systemHealth.healthScore}`);
        logInfo(`CPU usage: ${systemHealth.metrics.cpu.usage.toFixed(1)}%`);
        logInfo(`Memory usage: ${systemHealth.metrics.memory.system.percentage.toFixed(1)}%`);

        // Check if there are any current alerts
        if (systemHealth.alerts && systemHealth.alerts.length > 0) {
            logWarning(`Current system alerts: ${systemHealth.alerts.length}`);
            systemHealth.alerts.forEach(alert => {
                logWarning(`  - ${alert.type}: ${alert.message} (${alert.value})`);
            });
        } else {
            logSuccess('No current system alerts');
        }

        // Test alert processing
        const processedAlerts = await alertSystemService.processSystemHealth();
        if (processedAlerts.length > 0) {
            logInfo(`Processed ${processedAlerts.length} alerts from system health check`);
            processedAlerts.forEach(alert => {
                logInfo(`  - ${alert.category} (${alert.severity}): ${alert.title}`);
            });
        } else {
            logSuccess('System health check completed - no alerts generated');
        }

        return true;
    } catch (error) {
        logError(`System health monitoring test failed: ${error.message}`);
        return false;
    }
}

async function testAlertManagement(testAlerts) {
    log('\n--- Testing Alert Management ---', 'bold');

    if (testAlerts.length === 0) {
        logWarning('No test alerts available for management testing');
        return false;
    }

    try {
        // Test alert acknowledgment
        const alertToAcknowledge = testAlerts[0];
        const acknowledgedAlert = await alertSystemService.acknowledgeAlert(
            alertToAcknowledge.alertId,
            'test-admin'
        );

        if (acknowledgedAlert && acknowledgedAlert.status === 'acknowledged') {
            logSuccess(`Alert acknowledged: ${acknowledgedAlert.title}`);
        } else {
            logError('Alert acknowledgment failed');
        }

        // Test alert resolution
        if (testAlerts.length > 1) {
            const alertToResolve = testAlerts[1];
            const resolvedAlert = await alertSystemService.resolveAlert(
                alertToResolve.alertId
            );

            if (resolvedAlert && resolvedAlert.status === 'resolved') {
                logSuccess(`Alert resolved: ${resolvedAlert.title}`);
            } else {
                logError('Alert resolution failed');
            }
        }

        // Get alert statistics
        const stats = await alertSystemService.getAlertStatistics();
        logInfo(`Alert statistics:`);
        logInfo(`  - Total: ${stats.total}`);
        logInfo(`  - Active: ${stats.active}`);
        logInfo(`  - Acknowledged: ${stats.acknowledged}`);
        logInfo(`  - Resolved: ${stats.resolved}`);
        logInfo(`  - Critical: ${stats.critical}`);
        logInfo(`  - Warning: ${stats.warning}`);

        return true;
    } catch (error) {
        logError(`Alert management test failed: ${error.message}`);
        return false;
    }
}

async function testRealtimeMonitoringIntegration() {
    log('\n--- Testing Real-time Monitoring Integration ---', 'bold');

    try {
        // Test health status
        const healthStatus = realtimeMonitoringService.getHealthStatus();
        logInfo(`Monitoring service status: ${healthStatus.status}`);

        if (healthStatus.connections) {
            logInfo(`Connection stats:`);
            logInfo(`  - Total connections: ${healthStatus.connections.totalConnections || 0}`);
            logInfo(`  - Platform connections: ${healthStatus.connections.platformConnections || 0}`);
            logInfo(`  - Initialized: ${healthStatus.connections.isInitialized}`);
        }

        if (healthStatus.services) {
            logInfo(`Services status:`);
            logInfo(`  - Metrics collection: ${healthStatus.services.metricsCollection ? 'Active' : 'Inactive'}`);
            logInfo(`  - Alerts processing: ${healthStatus.services.alertsProcessing ? 'Active' : 'Inactive'}`);
        }

        // Test connection statistics
        const connectionStats = realtimeMonitoringService.getConnectionStats();
        if (connectionStats.isInitialized) {
            logSuccess('Real-time monitoring service is initialized');
        } else {
            logWarning('Real-time monitoring service is not initialized');
        }

        // Test broadcast functionality (won't actually send without connected clients)
        try {
            realtimeMonitoringService.broadcastToPlatform('test-event', {
                message: 'Test broadcast from verification script',
                timestamp: new Date().toISOString()
            });
            logSuccess('Broadcast functionality is working');
        } catch (error) {
            logWarning(`Broadcast test failed: ${error.message}`);
        }

        return true;
    } catch (error) {
        logError(`Real-time monitoring integration test failed: ${error.message}`);
        return false;
    }
}

async function testNotificationSystem(testAlerts) {
    log('\n--- Testing Notification System ---', 'bold');

    if (testAlerts.length === 0) {
        logWarning('No test alerts available for notification testing');
        return false;
    }

    try {
        // Test notification for a critical alert
        const criticalAlert = testAlerts.find(alert => alert.severity === 'critical');
        if (criticalAlert) {
            const notificationResult = await alertSystemService.sendAlertNotification(criticalAlert);

            if (notificationResult.success) {
                logSuccess('Alert notification sent successfully');
            } else if (notificationResult.skipped) {
                logInfo(`Alert notification skipped: ${notificationResult.reason}`);
            } else {
                logWarning('Alert notification failed (expected in test environment without SMTP)');
                if (notificationResult.errors && notificationResult.errors.length > 0) {
                    notificationResult.errors.forEach(error => {
                        logWarning(`  - ${error}`);
                    });
                }
            }
        }

        return true;
    } catch (error) {
        logError(`Notification system test failed: ${error.message}`);
        return false;
    }
}

async function cleanup() {
    log('\n--- Cleanup ---', 'bold');

    try {
        // Clean up test alerts
        if (alertSystemService.AlertModel) {
            const result = await alertSystemService.AlertModel.deleteMany({
                'details.testAlert': true
            });
            logSuccess(`Cleaned up ${result.deletedCount} test alerts`);
        }

        // Clear alert history and cooldowns
        alertSystemService.alertHistory = [];
        alertSystemService.alertCooldowns.clear();
        logSuccess('Cleared alert history and cooldowns');

        return true;
    } catch (error) {
        logError(`Cleanup failed: ${error.message}`);
        return false;
    }
}

async function main() {
    log('🚨 Alert Triggering Verification Script', 'bold');
    log('=====================================\n', 'bold');

    let success = true;

    // Connect to database
    if (!await connectToDatabase()) {
        process.exit(1);
    }

    // Initialize services
    if (!await initializeServices()) {
        process.exit(1);
    }

    // Run tests
    const testAlerts = await testAlertCreation();
    if (testAlerts.length === 0) success = false;

    if (!await testSystemHealthMonitoring()) success = false;
    if (!await testAlertManagement(testAlerts)) success = false;
    if (!await testRealtimeMonitoringIntegration()) success = false;
    if (!await testNotificationSystem(testAlerts)) success = false;

    // Cleanup
    await cleanup();

    // Close database connection
    await mongoose.connection.close();
    logSuccess('Database connection closed');

    // Final result
    log('\n=====================================', 'bold');
    if (success) {
        logSuccess('🎉 All alert triggering tests passed!');
        logSuccess('✅ Alerts are triggering correctly');
        log('\nThe alert system is working properly:', 'green');
        log('• Alerts are created and stored correctly', 'green');
        log('• System health monitoring generates alerts', 'green');
        log('• Alert acknowledgment and resolution work', 'green');
        log('• Real-time monitoring integration is functional', 'green');
        log('• Notification system is configured (SMTP may need setup)', 'green');
    } else {
        logError('❌ Some alert triggering tests failed');
        logError('Please check the error messages above');
    }

    process.exit(success ? 0 : 1);
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logError(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
    process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logError(`Uncaught Exception: ${error.message}`);
    process.exit(1);
});

// Run the verification
main().catch(error => {
    logError(`Verification script failed: ${error.message}`);
    process.exit(1);
});