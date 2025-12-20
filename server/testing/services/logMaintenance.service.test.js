/**
 * Log Maintenance Service Tests
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import logMaintenanceService from '../../services/logMaintenance.service.js';

describe('LogMaintenanceService', () => {
    
    beforeEach(async () => {
        // Initialize the service
        await logMaintenanceService.initialize();
    });
    
    test('should initialize successfully', async () => {
        const result = await logMaintenanceService.initialize();
        expect(result).toBeUndefined(); // No return value expected
    });
    
    test('should get maintenance statistics', () => {
        const result = logMaintenanceService.getMaintenanceStats();
        
        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.data.isRunning).toBeDefined();
        expect(typeof result.data.isRunning).toBe('boolean');
    });
    
    test('should get log directory statistics', async () => {
        const result = await logMaintenanceService.getLogDirectoryStats();
        
        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.data.totalFiles).toBeDefined();
        expect(result.data.totalSize).toBeDefined();
        expect(result.data.compressedFiles).toBeDefined();
        expect(typeof result.data.totalFiles).toBe('number');
        expect(typeof result.data.totalSize).toBe('number');
    });
    
    test('should get company-specific log statistics', async () => {
        const testCompanyId = 'test-company';
        const result = await logMaintenanceService.getLogDirectoryStats(testCompanyId);
        
        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.data.totalFiles).toBeDefined();
        expect(result.data.totalSize).toBeDefined();
    });
    
    test('should parse file sizes correctly', () => {
        const service = logMaintenanceService;
        
        // Test parseFileSize method (accessing private method for testing)
        expect(service.parseFileSize('1024')).toBe(1024);
        expect(service.parseFileSize('1k')).toBe(1024);
        expect(service.parseFileSize('1m')).toBe(1024 * 1024);
        expect(service.parseFileSize('1g')).toBe(1024 * 1024 * 1024);
    });
    
    test('should identify log files correctly', () => {
        const service = logMaintenanceService;
        
        expect(service.isLogFile('application.log')).toBe(true);
        expect(service.isLogFile('error.json')).toBe(true);
        expect(service.isLogFile('audit-2023-12-01.txt')).toBe(true);
        expect(service.isLogFile('config.js')).toBe(false);
        expect(service.isLogFile('readme.md')).toBe(false);
    });
    
    test('should run maintenance with dry run option', async () => {
        const result = await logMaintenanceService.runMaintenance({ dryRun: true });
        
        expect(result.success).toBe(true);
        expect(result.report).toBeDefined();
        expect(result.report.filesProcessed).toBeDefined();
        expect(result.report.filesDeleted).toBeDefined();
        expect(result.report.bytesCompressed).toBeDefined();
        expect(typeof result.report.filesProcessed).toBe('number');
    });
    
    test('should generate maintenance report', () => {
        const service = logMaintenanceService;
        const report = service.generateMaintenanceReport();
        
        expect(report).toBeDefined();
        expect(report.filesProcessed).toBeDefined();
        expect(report.bytesCompressed).toBeDefined();
        expect(report.filesDeleted).toBeDefined();
        expect(report.errors).toBeDefined();
        expect(Array.isArray(report.errors)).toBe(true);
    });
    
    test('should handle maintenance when already running', async () => {
        // Start maintenance
        const firstRun = logMaintenanceService.runMaintenance({ dryRun: true });
        
        // Try to start again while running
        try {
            await logMaintenanceService.runMaintenance({ dryRun: true });
            expect(true).toBe(false); // Should not reach here
        } catch (error) {
            expect(error.message).toBe('Maintenance is already running');
        }
        
        // Wait for first run to complete
        await firstRun;
    });
});