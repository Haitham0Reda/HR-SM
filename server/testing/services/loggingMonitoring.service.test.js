/**
 * Logging Monitoring Service Tests
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import loggingMonitoringService from '../../services/loggingMonitoring.service.js';

describe('LoggingMonitoringService', () => {
    
    beforeEach(async () => {
        // Initialize the service
        await loggingMonitoringService.initialize();
        
        // Stop monitoring if it's running
        if (loggingMonitoringService.isMonitoring) {
            loggingMonitoringService.stopMonitoring();
        }
    });
    
    afterEach(() => {
        // Clean up - stop monitoring if running
        if (loggingMonitoringService.isMonitoring) {
            loggingMonitoringService.stopMonitoring();
        }
    });
    
    test('should initialize successfully', async () => {
        const result = await loggingMonitoringService.initialize();
        expect(result).toBeUndefined(); // No return value expected
    });
    
    test('should get monitoring status', () => {
        const result = loggingMonitoringService.getMonitoringStatus();
        
        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.data.isMonitoring).toBeDefined();
        expect(typeof result.data.isMonitoring).toBe('boolean');
        expect(result.data.metrics).toBeDefined();
        expect(result.data.thresholds).toBeDefined();
    });
    
    test('should start monitoring', async () => {
        await loggingMonitoringService.startMonitoring(1000); // 1 second interval for testing
        
        const status = loggingMonitoringService.getMonitoringStatus();
        expect(status.data.isMonitoring).toBe(true);
    });
    
    test('should stop monitoring', async () => {
        await loggingMonitoringService.startMonitoring(1000);
        loggingMonitoringService.stopMonitoring();
        
        const status = loggingMonitoringService.getMonitoringStatus();
        expect(status.data.isMonitoring).toBe(false);
    });
    
    test('should prevent starting monitoring when already running', async () => {
        await loggingMonitoringService.startMonitoring(1000);
        
        try {
            await loggingMonitoringService.startMonitoring(1000);
            expect(true).toBe(false); // Should not reach here
        } catch (error) {
            expect(error.message).toBe('Monitoring is already running');
        }
    });
    
    test('should update thresholds', () => {
        const newThresholds = {
            logVolumePerMinute: 5000,
            errorRatePercent: 10
        };
        
        const result = loggingMonitoringService.updateThresholds(newThresholds);
        
        expect(result.success).toBe(true);
        expect(result.data.logVolumePerMinute).toBe(5000);
        expect(result.data.errorRatePercent).toBe(10);
    });
    
    test('should get dashboard data', () => {
        const result = loggingMonitoringService.getDashboardData();
        
        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.data.timestamp).toBeDefined();
        expect(result.data.status).toBeDefined();
        expect(result.data.systemHealth).toBeDefined();
        expect(result.data.alerts).toBeDefined();
    });
    
    test('should handle alert cooldowns', () => {
        // Test that the service has the cooldown functionality
        // Since these are private methods, we'll test indirectly through the monitoring status
        const status = loggingMonitoringService.getMonitoringStatus();
        
        expect(status.data.activeCooldowns).toBeDefined();
        expect(typeof status.data.activeCooldowns).toBe('number');
        expect(status.data.activeCooldowns).toBeGreaterThanOrEqual(0);
    });
    
    test('should emit monitoring events', (done) => {
        let eventReceived = false;
        
        loggingMonitoringService.once('monitoring:started', (data) => {
            expect(data.intervalMs).toBeDefined();
            eventReceived = true;
        });
        
        loggingMonitoringService.startMonitoring(1000).then(() => {
            // Give a small delay for event to be emitted
            setTimeout(() => {
                expect(eventReceived).toBe(true);
                done();
            }, 100);
        });
    });
    
    test('should perform monitoring cycle', async () => {
        let cycleCompleted = false;
        
        loggingMonitoringService.once('monitoring:cycle:completed', (data) => {
            expect(data.duration).toBeDefined();
            expect(data.timestamp).toBeDefined();
            cycleCompleted = true;
        });
        
        await loggingMonitoringService.performMonitoringCycle();
        
        expect(cycleCompleted).toBe(true);
    });
});