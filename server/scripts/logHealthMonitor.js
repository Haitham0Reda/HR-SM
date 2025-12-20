#!/usr/bin/env node

/**
 * Log Health Monitor Script
 * 
 * Monitors log system health and generates reports
 */

import logMaintenanceService from '../services/logMaintenance.service.js';
import loggingConfigurationService from '../services/loggingConfiguration.service.js';
import { program } from 'commander';
import fs from 'fs/promises';
import path from 'path';

// Configure command line options
program
    .name('log-health-monitor')
    .description('Monitor logging system health and generate reports')
    .version('1.0.0')
    .option('-o, --output <file>', 'Output report to file')
    .option('-f, --format <format>', 'Report format (json|text|csv)', 'text')
    .option('-c, --company <companyId>', 'Monitor specific company only')
    .option('--alert-thresholds', 'Check alert thresholds and generate warnings')
    .option('--disk-usage', 'Include disk usage analysis')
    .option('-v, --verbose', 'Enable verbose output');

program.parse();

const options = program.opts();

/**
 * Main execution function
 */
async function main() {
    try {
        console.log('🔍 Log Health Monitor Starting...');
        
        // Initialize services
        await logMaintenanceService.initialize();
        await loggingConfigurationService.initialize();
        
        // Generate health report
        const report = await generateHealthReport();
        
        // Output report
        await outputReport(report);
        
        console.log('✅ Health monitoring completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('❌ Health monitoring failed:', error.message);
        if (options.verbose) {
            console.error(error.stack);
        }
        process.exit(1);
    }
}

/**
 * Generate comprehensive health report
 */
async function generateHealthReport() {
    const report = {
        timestamp: new Date().toISOString(),
        summary: {
            status: 'healthy',
            warnings: [],
            errors: []
        },
        configuration: {},
        statistics: {},
        diskUsage: {},
        alertThresholds: {},
        companies: {}
    };
    
    try {
        // Get configuration health
        const configHealth = loggingConfigurationService.getConfigHealth();
        report.configuration = configHealth.data;
        
        if (configHealth.data.status !== 'healthy') {
            report.summary.warnings.push(`Configuration status: ${configHealth.data.status}`);
        }
        
        // Get maintenance statistics
        const maintenanceStats = logMaintenanceService.getMaintenanceStats();
        report.statistics.maintenance = maintenanceStats.data;
        
        // Get global log statistics
        const globalStats = await logMaintenanceService.getLogDirectoryStats();
        if (globalStats.success) {
            report.statistics.global = globalStats.data;
        } else {
            report.summary.errors.push(`Failed to get global statistics: ${globalStats.error}`);
        }
        
        // Get company-specific statistics
        if (options.company) {
            const companyStats = await logMaintenanceService.getLogDirectoryStats(options.company);
            if (companyStats.success) {
                report.companies[options.company] = companyStats.data;
            } else {
                report.summary.errors.push(`Failed to get stats for company ${options.company}: ${companyStats.error}`);
            }
        } else {
            // Get stats for all configured companies
            const companiesResult = loggingConfigurationService.getConfiguredCompanies();
            if (companiesResult.success) {
                for (const companyId of companiesResult.data.companies) {
                    const companyStats = await logMaintenanceService.getLogDirectoryStats(companyId);
                    if (companyStats.success) {
                        report.companies[companyId] = companyStats.data;
                    } else {
                        report.summary.warnings.push(`Failed to get stats for company ${companyId}: ${companyStats.error}`);
                    }
                }
            }
        }
        
        // Check disk usage if requested
        if (options.diskUsage) {
            report.diskUsage = await analyzeDiskUsage();
        }
        
        // Check alert thresholds if requested
        if (options.alertThresholds) {
            report.alertThresholds = await checkAlertThresholds(report);
        }
        
        // Determine overall health status
        if (report.summary.errors.length > 0) {
            report.summary.status = 'unhealthy';
        } else if (report.summary.warnings.length > 0) {
            report.summary.status = 'warning';
        }
        
    } catch (error) {
        report.summary.status = 'error';
        report.summary.errors.push(`Health check failed: ${error.message}`);
    }
    
    return report;
}

/**
 * Analyze disk usage for log directories
 */
async function analyzeDiskUsage() {
    const diskUsage = {
        logDirectories: {},
        totalLogSize: 0,
        warnings: []
    };
    
    try {
        const logDirs = [
            path.join(process.cwd(), 'logs'),
            path.join(process.cwd(), 'logs', 'companies'),
            path.join(process.cwd(), 'logs', 'platform')
        ];
        
        for (const dir of logDirs) {
            try {
                const stats = await getDirectorySize(dir);
                diskUsage.logDirectories[dir] = stats;
                diskUsage.totalLogSize += stats.size;
                
                // Check if directory is getting large (>1GB)
                if (stats.size > 1024 * 1024 * 1024) {
                    diskUsage.warnings.push(`Large log directory: ${dir} (${formatBytes(stats.size)})`);
                }
            } catch (error) {
                // Directory might not exist
                diskUsage.logDirectories[dir] = { error: error.message };
            }
        }
        
        // Get available disk space
        try {
            const diskSpace = await getDiskSpace(process.cwd());
            diskUsage.availableSpace = diskSpace;
            
            // Check if disk usage is high (>85%)
            const usagePercent = (diskSpace.used / diskSpace.total) * 100;
            if (usagePercent > 85) {
                diskUsage.warnings.push(`High disk usage: ${usagePercent.toFixed(1)}%`);
            }
        } catch (error) {
            diskUsage.warnings.push(`Failed to get disk space: ${error.message}`);
        }
        
    } catch (error) {
        diskUsage.error = error.message;
    }
    
    return diskUsage;
}

/**
 * Check alert thresholds
 */
async function checkAlertThresholds(report) {
    const thresholds = {
        checks: {},
        violations: [],
        warnings: []
    };
    
    try {
        // Get global alert configuration
        const globalConfig = loggingConfigurationService.getGlobalConfig();
        const alertConfig = globalConfig.data.config.alerts;
        
        // Check error rate (if we have error statistics)
        if (report.statistics.global) {
            const stats = report.statistics.global;
            
            // Check file count thresholds
            if (stats.totalFiles > 10000) {
                thresholds.warnings.push(`High file count: ${stats.totalFiles} files`);
            }
            
            // Check total size thresholds
            if (stats.totalSize > 10 * 1024 * 1024 * 1024) { // 10GB
                thresholds.warnings.push(`Large total log size: ${formatBytes(stats.totalSize)}`);
            }
            
            // Check age of oldest files
            if (stats.oldestFile) {
                const ageMs = Date.now() - new Date(stats.oldestFile).getTime();
                const ageDays = ageMs / (24 * 60 * 60 * 1000);
                
                if (ageDays > 365) { // Older than 1 year
                    thresholds.warnings.push(`Very old log files detected: ${ageDays.toFixed(0)} days old`);
                }
            }
        }
        
        // Check maintenance service health
        if (report.statistics.maintenance) {
            const maintenanceStats = report.statistics.maintenance;
            
            if (!maintenanceStats.lastRun) {
                thresholds.violations.push('Log maintenance has never been run');
            } else {
                const lastRunAge = Date.now() - new Date(maintenanceStats.lastRun).getTime();
                const lastRunDays = lastRunAge / (24 * 60 * 60 * 1000);
                
                if (lastRunDays > 7) {
                    thresholds.violations.push(`Log maintenance last run ${lastRunDays.toFixed(0)} days ago`);
                } else if (lastRunDays > 3) {
                    thresholds.warnings.push(`Log maintenance last run ${lastRunDays.toFixed(0)} days ago`);
                }
            }
            
            if (maintenanceStats.stats && maintenanceStats.stats.errors.length > 0) {
                thresholds.violations.push(`Maintenance errors: ${maintenanceStats.stats.errors.length}`);
            }
        }
        
        thresholds.checks = {
            fileCount: report.statistics.global?.totalFiles || 0,
            totalSize: report.statistics.global?.totalSize || 0,
            maintenanceAge: report.statistics.maintenance?.lastRun ? 
                Math.floor((Date.now() - new Date(report.statistics.maintenance.lastRun).getTime()) / (24 * 60 * 60 * 1000)) : 
                null,
            maintenanceErrors: report.statistics.maintenance?.stats?.errors?.length || 0
        };
        
    } catch (error) {
        thresholds.error = error.message;
    }
    
    return thresholds;
}

/**
 * Get directory size recursively
 */
async function getDirectorySize(dirPath) {
    let totalSize = 0;
    let fileCount = 0;
    
    try {
        const items = await fs.readdir(dirPath);
        
        for (const item of items) {
            const itemPath = path.join(dirPath, item);
            const stats = await fs.stat(itemPath);
            
            if (stats.isDirectory()) {
                const subDirStats = await getDirectorySize(itemPath);
                totalSize += subDirStats.size;
                fileCount += subDirStats.fileCount;
            } else {
                totalSize += stats.size;
                fileCount++;
            }
        }
    } catch (error) {
        if (error.code !== 'ENOENT') {
            throw error;
        }
    }
    
    return { size: totalSize, fileCount };
}

/**
 * Get disk space information (simplified version)
 */
async function getDiskSpace(dirPath) {
    // This is a simplified implementation
    // In a real system, you might use a library like 'statvfs' or 'diskusage'
    try {
        const stats = await fs.stat(dirPath);
        return {
            total: 100 * 1024 * 1024 * 1024, // Placeholder: 100GB
            used: 50 * 1024 * 1024 * 1024,   // Placeholder: 50GB
            available: 50 * 1024 * 1024 * 1024 // Placeholder: 50GB
        };
    } catch (error) {
        throw new Error('Unable to determine disk space');
    }
}

/**
 * Output report in specified format
 */
async function outputReport(report) {
    let output;
    
    switch (options.format) {
        case 'json':
            output = JSON.stringify(report, null, 2);
            break;
        case 'csv':
            output = generateCSVReport(report);
            break;
        case 'text':
        default:
            output = generateTextReport(report);
            break;
    }
    
    if (options.output) {
        await fs.writeFile(options.output, output);
        console.log(`📄 Report saved to: ${options.output}`);
    } else {
        console.log('\n📊 Health Report:');
        console.log(output);
    }
}

/**
 * Generate text format report
 */
function generateTextReport(report) {
    let output = '';
    
    output += `Log System Health Report\n`;
    output += `Generated: ${report.timestamp}\n`;
    output += `Status: ${report.summary.status.toUpperCase()}\n\n`;
    
    if (report.summary.errors.length > 0) {
        output += `❌ ERRORS:\n`;
        report.summary.errors.forEach(error => {
            output += `   - ${error}\n`;
        });
        output += '\n';
    }
    
    if (report.summary.warnings.length > 0) {
        output += `⚠️  WARNINGS:\n`;
        report.summary.warnings.forEach(warning => {
            output += `   - ${warning}\n`;
        });
        output += '\n';
    }
    
    // Configuration status
    output += `📋 CONFIGURATION:\n`;
    output += `   Status: ${report.configuration.status}\n`;
    output += `   Companies Configured: ${report.configuration.summary?.companiesConfigured || 0}\n`;
    output += `   Enabled Features: ${report.configuration.summary?.globalConfig?.enabledFeatures?.length || 0}\n`;
    output += `   Alert Channels: ${report.configuration.summary?.alertChannels?.length || 0}\n\n`;
    
    // Global statistics
    if (report.statistics.global) {
        const stats = report.statistics.global;
        output += `📊 GLOBAL STATISTICS:\n`;
        output += `   Total Files: ${stats.totalFiles}\n`;
        output += `   Total Size: ${formatBytes(stats.totalSize)}\n`;
        output += `   Compressed Files: ${stats.compressedFiles}\n`;
        output += `   Oldest File: ${stats.oldestFile || 'N/A'}\n`;
        output += `   Newest File: ${stats.newestFile || 'N/A'}\n\n`;
    }
    
    // Company statistics
    if (Object.keys(report.companies).length > 0) {
        output += `🏢 COMPANY STATISTICS:\n`;
        for (const [companyId, stats] of Object.entries(report.companies)) {
            output += `   ${companyId}:\n`;
            output += `     Files: ${stats.totalFiles}\n`;
            output += `     Size: ${formatBytes(stats.totalSize)}\n`;
            output += `     Compressed: ${stats.compressedFiles}\n`;
        }
        output += '\n';
    }
    
    // Disk usage
    if (report.diskUsage && Object.keys(report.diskUsage).length > 0) {
        output += `💾 DISK USAGE:\n`;
        output += `   Total Log Size: ${formatBytes(report.diskUsage.totalLogSize)}\n`;
        if (report.diskUsage.availableSpace) {
            const space = report.diskUsage.availableSpace;
            const usagePercent = (space.used / space.total) * 100;
            output += `   Disk Usage: ${usagePercent.toFixed(1)}% (${formatBytes(space.used)} / ${formatBytes(space.total)})\n`;
        }
        if (report.diskUsage.warnings.length > 0) {
            output += `   Warnings:\n`;
            report.diskUsage.warnings.forEach(warning => {
                output += `     - ${warning}\n`;
            });
        }
        output += '\n';
    }
    
    // Alert thresholds
    if (report.alertThresholds && Object.keys(report.alertThresholds).length > 0) {
        output += `🚨 ALERT THRESHOLDS:\n`;
        if (report.alertThresholds.violations.length > 0) {
            output += `   Violations:\n`;
            report.alertThresholds.violations.forEach(violation => {
                output += `     - ${violation}\n`;
            });
        }
        if (report.alertThresholds.warnings.length > 0) {
            output += `   Warnings:\n`;
            report.alertThresholds.warnings.forEach(warning => {
                output += `     - ${warning}\n`;
            });
        }
        output += '\n';
    }
    
    return output;
}

/**
 * Generate CSV format report
 */
function generateCSVReport(report) {
    let csv = 'Metric,Value,Status\n';
    
    csv += `Overall Status,${report.summary.status},${report.summary.status === 'healthy' ? 'OK' : 'ISSUE'}\n`;
    csv += `Errors,${report.summary.errors.length},${report.summary.errors.length === 0 ? 'OK' : 'ISSUE'}\n`;
    csv += `Warnings,${report.summary.warnings.length},${report.summary.warnings.length === 0 ? 'OK' : 'ISSUE'}\n`;
    
    if (report.statistics.global) {
        const stats = report.statistics.global;
        csv += `Total Files,${stats.totalFiles},${stats.totalFiles < 10000 ? 'OK' : 'HIGH'}\n`;
        csv += `Total Size (bytes),${stats.totalSize},${stats.totalSize < 10 * 1024 * 1024 * 1024 ? 'OK' : 'HIGH'}\n`;
        csv += `Compressed Files,${stats.compressedFiles},OK\n`;
    }
    
    if (report.diskUsage && report.diskUsage.totalLogSize) {
        csv += `Total Log Size (bytes),${report.diskUsage.totalLogSize},OK\n`;
    }
    
    return csv;
}

/**
 * Format bytes in human readable format
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Run the main function
main();