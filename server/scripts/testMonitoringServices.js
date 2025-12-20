/**
 * Test script for monitoring services
 * Tests alert generation, performance monitoring, and anomaly detection
 */

import alertGenerationService, { ALERT_SEVERITY, ALERT_TYPES } from '../services/alertGeneration.service.js';
import performanceMonitoringService, { PERFORMANCE_METRICS } from '../services/performanceMonitoring.service.js';
import anomalyDetectionService from '../services/anomalyDetection.service.js';
import monitoringIntegrationService from '../services/monitoringIntegration.service.js';

async function testAlertGeneration() {
    console.log('\n=== Testing Alert Generation Service ===');
    
    try {
        // Test basic alert generation
        const alert = await alertGenerationService.generateAlert({
            severity: ALERT_SEVERITY.HIGH,
            type: ALERT_TYPES.SECURITY_BREACH,
            title: 'Test Security Alert',
            message: 'This is a test security alert',
            source: 'test_script',
            tenantId: 'test-tenant-123',
            metadata: {
                testData: 'test value',
                timestamp: new Date().toISOString()
            }
        });
        
        console.log('✓ Alert generated successfully:', alert.id);
        console.log('  - Severity:', alert.severity);
        console.log('  - Type:', alert.type);
        console.log('  - Title:', alert.title);
        
        // Test alert statistics
        const stats = alertGenerationService.getAlertStats();
        console.log('✓ Alert statistics:', stats);
        
        return true;
    } catch (error) {
        console.error('✗ Alert generation test failed:', error.message);
        return false;
    }
}

async function testPerformanceMonitoring() {
    console.log('\n=== Testing Performance Monitoring Service ===');
    
    try {
        // Test metric recording
        await performanceMonitoringService.recordMetric(
            PERFORMANCE_METRICS.API_RESPONSE_TIME,
            1500,
            { endpoint: '/api/test', method: 'GET' }
        );
        console.log('✓ API response time metric recorded');
        
        await performanceMonitoringService.recordMetric(
            PERFORMANCE_METRICS.MEMORY_USAGE,
            0.75
        );
        console.log('✓ Memory usage metric recorded');
        
        await performanceMonitoringService.recordMetric(
            PERFORMANCE_METRICS.CPU_USAGE,
            0.65
        );
        console.log('✓ CPU usage metric recorded');
        
        // Test performance status
        const status = performanceMonitoringService.getPerformanceStatus();
        console.log('✓ Performance status retrieved:');
        console.log('  - Health State:', status.healthState);
        console.log('  - Backpressure Active:', status.backpressureActive);
        console.log('  - Metrics Count:', Object.keys(status.metrics).length);
        
        // Test threshold setting
        performanceMonitoringService.setThreshold(
            PERFORMANCE_METRICS.API_RESPONSE_TIME,
            1000, // warning
            3000  // critical
        );
        console.log('✓ Custom threshold set for API response time');
        
        return true;
    } catch (error) {
        console.error('✗ Performance monitoring test failed:', error.message);
        return false;
    }
}

async function testAnomalyDetection() {
    console.log('\n=== Testing Anomaly Detection Service ===');
    
    try {
        // Test detection status
        const status = anomalyDetectionService.getDetectionStatus();
        console.log('✓ Anomaly detection status:', status);
        
        // Test adding a custom detection rule
        anomalyDetectionService.addDetectionRule({
            id: 'test_custom_rule',
            type: 'test_anomaly',
            algorithm: 'statistical',
            parameters: {
                threshold: 2,
                windowSize: 30,
                minSamples: 5
            },
            severity: ALERT_SEVERITY.MEDIUM,
            responses: ['alert']
        });
        console.log('✓ Custom detection rule added');
        
        // Test getting recent anomalies
        const recentAnomalies = anomalyDetectionService.getRecentAnomalies(10);
        console.log('✓ Recent anomalies retrieved:', recentAnomalies.length);
        
        // Remove test rule
        const removed = anomalyDetectionService.removeDetectionRule('test_custom_rule');
        console.log('✓ Test rule removed:', removed);
        
        return true;
    } catch (error) {
        console.error('✗ Anomaly detection test failed:', error.message);
        return false;
    }
}

async function testMonitoringIntegration() {
    console.log('\n=== Testing Monitoring Integration Service ===');
    
    try {
        // Test integrated health check
        const healthCheck = await monitoringIntegrationService.performIntegratedHealthCheck();
        console.log('✓ Integrated health check completed');
        console.log('  - Timestamp:', healthCheck.timestamp);
        console.log('  - Performance Health:', healthCheck.performanceStatus.healthState);
        console.log('  - Anomaly Detection Running:', healthCheck.anomalyStatus.isRunning);
        
        // Test monitoring status
        const monitoringStatus = monitoringIntegrationService.getMonitoringStatus();
        console.log('✓ Monitoring status retrieved:');
        console.log('  - Initialized:', monitoringStatus.isInitialized);
        console.log('  - System Health:', monitoringStatus.monitoringState.systemHealth);
        console.log('  - Backpressure Active:', monitoringStatus.monitoringState.backpressureActive);
        
        return true;
    } catch (error) {
        console.error('✗ Monitoring integration test failed:', error.message);
        return false;
    }
}

async function testHighLoadScenario() {
    console.log('\n=== Testing High Load Scenario ===');
    
    try {
        // Simulate high memory usage to trigger backpressure
        await performanceMonitoringService.recordMetric(
            PERFORMANCE_METRICS.MEMORY_USAGE,
            0.87 // Above backpressure threshold
        );
        console.log('✓ High memory usage recorded (should trigger backpressure)');
        
        // Wait a moment for processing
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if backpressure was activated
        const status = performanceMonitoringService.getPerformanceStatus();
        console.log('✓ Backpressure status:', status.backpressureActive);
        
        // Simulate critical CPU usage
        await performanceMonitoringService.recordMetric(
            PERFORMANCE_METRICS.CPU_USAGE,
            0.96 // Critical threshold
        );
        console.log('✓ Critical CPU usage recorded (should generate alert)');
        
        return true;
    } catch (error) {
        console.error('✗ High load scenario test failed:', error.message);
        return false;
    }
}

async function runAllTests() {
    console.log('Starting Monitoring Services Test Suite...');
    console.log('=====================================');
    
    const results = {
        alertGeneration: false,
        performanceMonitoring: false,
        anomalyDetection: false,
        monitoringIntegration: false,
        highLoadScenario: false
    };
    
    // Run all tests
    results.alertGeneration = await testAlertGeneration();
    results.performanceMonitoring = await testPerformanceMonitoring();
    results.anomalyDetection = await testAnomalyDetection();
    results.monitoringIntegration = await testMonitoringIntegration();
    results.highLoadScenario = await testHighLoadScenario();
    
    // Summary
    console.log('\n=== Test Results Summary ===');
    const passed = Object.values(results).filter(r => r).length;
    const total = Object.keys(results).length;
    
    for (const [test, result] of Object.entries(results)) {
        console.log(`${result ? '✓' : '✗'} ${test}: ${result ? 'PASSED' : 'FAILED'}`);
    }
    
    console.log(`\nOverall: ${passed}/${total} tests passed`);
    
    if (passed === total) {
        console.log('🎉 All monitoring services are working correctly!');
    } else {
        console.log('⚠️  Some tests failed. Please check the implementation.');
    }
    
    // Cleanup
    setTimeout(() => {
        console.log('\nCleaning up services...');
        performanceMonitoringService.shutdown();
        anomalyDetectionService.shutdown();
        monitoringIntegrationService.shutdown();
        process.exit(passed === total ? 0 : 1);
    }, 2000);
}

// Run the tests
runAllTests().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
});