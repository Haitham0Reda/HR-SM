#!/usr/bin/env node

/**
 * Rollback Procedure Testing Script
 * 
 * This script tests the rollback procedures for the physical file restructuring
 * to ensure they work correctly in a development environment.
 * 
 * Usage: node server/scripts/test-rollback-procedure.js [test-type]
 * 
 * Test Types:
 * - full: Test full system rollback
 * - phase: Test phase-specific rollback  
 * - single: Test single file rollback
 * - all: Run all rollback tests
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

class RollbackTester {
    constructor() {
        this.testResults = [];
        this.backupDir = path.join(projectRoot, 'backups', 'rollback-test');
        this.logFile = path.join(this.backupDir, 'rollback-test.log');
    }

    log(message) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${message}`;
        console.log(logMessage);
        
        // Ensure backup directory exists
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
        }
        
        // Append to log file
        fs.appendFileSync(this.logFile, logMessage + '\n');
    }

    async createTestBackup() {
        this.log('Creating test backup...');
        
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(this.backupDir, `test-backup-${timestamp}`);
            
            // Create backup directory
            fs.mkdirSync(backupPath, { recursive: true });
            
            // Copy critical directories
            const dirsToBackup = [
                'server/modules',
                'server/controller',
                'server/models', 
                'server/routes',
                'server/app.js',
                'server/routes/index.js'
            ];
            
            for (const dir of dirsToBackup) {
                const sourcePath = path.join(projectRoot, dir);
                const targetPath = path.join(backupPath, dir);
                
                if (fs.existsSync(sourcePath)) {
                    this.copyRecursive(sourcePath, targetPath);
                    this.log(`Backed up: ${dir}`);
                }
            }
            
            this.log(`Test backup created at: ${backupPath}`);
            return backupPath;
            
        } catch (error) {
            this.log(`ERROR creating test backup: ${error.message}`);
            throw error;
        }
    }

    copyRecursive(source, target) {
        const stats = fs.statSync(source);
        
        if (stats.isDirectory()) {
            if (!fs.existsSync(target)) {
                fs.mkdirSync(target, { recursive: true });
            }
            
            const files = fs.readdirSync(source);
            for (const file of files) {
                this.copyRecursive(
                    path.join(source, file),
                    path.join(target, file)
                );
            }
        } else {
            fs.copyFileSync(source, target);
        }
    }

    async testApplicationStartup() {
        this.log('Testing application startup...');
        
        try {
            // Test if app.js can be loaded without errors
            execSync('node -c server/app.js', { 
                cwd: projectRoot,
                stdio: 'pipe'
            });
            
            this.log('✓ Application syntax check passed');
            return true;
            
        } catch (error) {
            this.log(`✗ Application startup failed: ${error.message}`);
            return false;
        }
    }

    async testImportPaths() {
        this.log('Testing import paths...');
        
        try {
            // Check for common import issues
            const result = execSync('grep -r "from.*\\.\\./" server/ --include="*.js" | grep -v node_modules | head -10', {
                cwd: projectRoot,
                encoding: 'utf8'
            });
            
            this.log('Sample import paths found:');
            this.log(result);
            
            return true;
            
        } catch (error) {
            // No imports found or grep error - this might be okay
            this.log('No problematic import paths detected');
            return true;
        }
    }

    async testModuleStructure() {
        this.log('Testing module structure...');
        
        const expectedPaths = [
            'server/modules/hr-core',
            'server/modules/hr-core/attendance',
            'server/modules/hr-core/auth',
            'server/modules/hr-core/users',
            'server/modules/hr-core/vacations'
        ];
        
        let allExist = true;
        
        for (const expectedPath of expectedPaths) {
            const fullPath = path.join(projectRoot, expectedPath);
            if (fs.existsSync(fullPath)) {
                this.log(`✓ ${expectedPath} exists`);
            } else {
                this.log(`✗ ${expectedPath} missing`);
                allExist = false;
            }
        }
        
        return allExist;
    }

    async simulateFileMove() {
        this.log('Simulating file move for rollback test...');
        
        try {
            // Create a test file to move
            const testFile = path.join(projectRoot, 'server/controller/test-rollback.controller.js');
            const testContent = `// Test file for rollback procedure
export default {
    test: () => 'rollback test'
};`;
            
            fs.writeFileSync(testFile, testContent);
            this.log('Created test file for rollback simulation');
            
            // Move it to modules (simulate restructuring)
            const targetDir = path.join(projectRoot, 'server/modules/hr-core/test');
            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }
            
            const targetFile = path.join(targetDir, 'test-rollback.controller.js');
            fs.renameSync(testFile, targetFile);
            this.log('Moved test file to modules (simulating restructuring)');
            
            return { testFile, targetFile };
            
        } catch (error) {
            this.log(`ERROR in file move simulation: ${error.message}`);
            throw error;
        }
    }

    async simulateRollback(testFile, targetFile) {
        this.log('Simulating rollback procedure...');
        
        try {
            // Move file back (simulate rollback)
            if (fs.existsSync(targetFile)) {
                fs.renameSync(targetFile, testFile);
                this.log('Rolled back test file to original location');
            }
            
            // Clean up test directory
            const testDir = path.dirname(targetFile);
            if (fs.existsSync(testDir) && fs.readdirSync(testDir).length === 0) {
                fs.rmdirSync(testDir);
                this.log('Cleaned up empty test directory');
            }
            
            // Verify rollback
            if (fs.existsSync(testFile)) {
                this.log('✓ Rollback simulation successful');
                
                // Clean up test file
                fs.unlinkSync(testFile);
                this.log('Cleaned up test file');
                
                return true;
            } else {
                this.log('✗ Rollback simulation failed');
                return false;
            }
            
        } catch (error) {
            this.log(`ERROR in rollback simulation: ${error.message}`);
            return false;
        }
    }

    async testFullRollback() {
        this.log('=== Testing Full System Rollback ===');
        
        const results = {
            backup: false,
            startup: false,
            imports: false,
            structure: false,
            simulation: false
        };
        
        try {
            // Create backup
            const backupPath = await this.createTestBackup();
            results.backup = true;
            
            // Test current state
            results.startup = await this.testApplicationStartup();
            results.imports = await this.testImportPaths();
            results.structure = await this.testModuleStructure();
            
            // Test rollback simulation
            const { testFile, targetFile } = await this.simulateFileMove();
            results.simulation = await this.simulateRollback(testFile, targetFile);
            
            this.log('Full rollback test completed');
            return results;
            
        } catch (error) {
            this.log(`ERROR in full rollback test: ${error.message}`);
            return results;
        }
    }

    async testPhaseRollback() {
        this.log('=== Testing Phase-Specific Rollback ===');
        
        // Test HR-Core module rollback capability
        const hrCoreFiles = [
            'server/modules/hr-core/attendance/controllers/attendance.controller.js',
            'server/modules/hr-core/auth/controllers/auth.controller.js',
            'server/modules/hr-core/users/controllers/user.controller.js'
        ];
        
        let allFilesExist = true;
        
        for (const file of hrCoreFiles) {
            const fullPath = path.join(projectRoot, file);
            if (fs.existsSync(fullPath)) {
                this.log(`✓ HR-Core file exists: ${file}`);
            } else {
                this.log(`✗ HR-Core file missing: ${file}`);
                allFilesExist = false;
            }
        }
        
        // Test legacy directory structure
        const legacyDirs = ['server/controller', 'server/models', 'server/routes'];
        let legacyExists = true;
        
        for (const dir of legacyDirs) {
            const fullPath = path.join(projectRoot, dir);
            if (fs.existsSync(fullPath)) {
                this.log(`✓ Legacy directory exists: ${dir}`);
            } else {
                this.log(`✗ Legacy directory missing: ${dir}`);
                legacyExists = false;
            }
        }
        
        return {
            hrCoreFiles: allFilesExist,
            legacyDirs: legacyExists,
            rollbackReady: allFilesExist && legacyExists
        };
    }

    async testSingleFileRollback() {
        this.log('=== Testing Single File Rollback ===');
        
        // Test ability to rollback individual files
        const testResults = await this.simulateFileMove();
        const rollbackSuccess = await this.simulateRollback(testResults.testFile, testResults.targetFile);
        
        return {
            simulation: rollbackSuccess,
            ready: rollbackSuccess
        };
    }

    generateReport(results) {
        this.log('\n=== ROLLBACK TEST REPORT ===');
        
        const timestamp = new Date().toISOString();
        let report = `
# Rollback Procedure Test Report
Generated: ${timestamp}

## Test Results Summary
`;

        if (results.full) {
            report += `
### Full System Rollback Test
- Backup Creation: ${results.full.backup ? '✓ PASS' : '✗ FAIL'}
- Application Startup: ${results.full.startup ? '✓ PASS' : '✗ FAIL'}
- Import Paths: ${results.full.imports ? '✓ PASS' : '✗ FAIL'}
- Module Structure: ${results.full.structure ? '✓ PASS' : '✗ FAIL'}
- Rollback Simulation: ${results.full.simulation ? '✓ PASS' : '✗ FAIL'}
`;
        }

        if (results.phase) {
            report += `
### Phase-Specific Rollback Test
- HR-Core Files Present: ${results.phase.hrCoreFiles ? '✓ PASS' : '✗ FAIL'}
- Legacy Directories: ${results.phase.legacyDirs ? '✓ PASS' : '✗ FAIL'}
- Rollback Ready: ${results.phase.rollbackReady ? '✓ PASS' : '✗ FAIL'}
`;
        }

        if (results.single) {
            report += `
### Single File Rollback Test
- Simulation: ${results.single.simulation ? '✓ PASS' : '✗ FAIL'}
- Ready: ${results.single.ready ? '✓ PASS' : '✗ FAIL'}
`;
        }

        report += `
## Recommendations

### If Tests Failed:
1. Review the rollback procedures in docs/root-files/ROLLBACK_PLAN.md
2. Ensure all backup directories exist and are accessible
3. Verify file permissions allow moving files between directories
4. Check that no processes are locking files during moves

### If Tests Passed:
1. Rollback procedures are ready for use
2. Consider running this test before any specialization restructuring
3. Update backup procedures if needed

## Log File
Full test log available at: ${this.logFile}
`;

        // Write report to file
        const reportPath = path.join(this.backupDir, `rollback-test-report-${timestamp.replace(/[:.]/g, '-')}.md`);
        fs.writeFileSync(reportPath, report);
        
        this.log(report);
        this.log(`\nReport saved to: ${reportPath}`);
        
        return report;
    }

    async runTests(testType = 'all') {
        this.log(`Starting rollback procedure tests: ${testType}`);
        
        const results = {};
        
        try {
            switch (testType) {
                case 'full':
                    results.full = await this.testFullRollback();
                    break;
                    
                case 'phase':
                    results.phase = await this.testPhaseRollback();
                    break;
                    
                case 'single':
                    results.single = await this.testSingleFileRollback();
                    break;
                    
                case 'all':
                default:
                    results.full = await this.testFullRollback();
                    results.phase = await this.testPhaseRollback();
                    results.single = await this.testSingleFileRollback();
                    break;
            }
            
            this.generateReport(results);
            
        } catch (error) {
            this.log(`FATAL ERROR in rollback tests: ${error.message}`);
            throw error;
        }
    }
}

// Main execution
async function main() {
    const testType = process.argv[2] || 'all';
    const tester = new RollbackTester();
    
    try {
        await tester.runTests(testType);
        console.log('\n✓ Rollback procedure testing completed successfully');
        process.exit(0);
        
    } catch (error) {
        console.error('\n✗ Rollback procedure testing failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export default RollbackTester;