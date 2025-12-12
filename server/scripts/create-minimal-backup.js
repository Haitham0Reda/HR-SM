#!/usr/bin/env node

/**
 * Minimal Backup for Physical Restructuring
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

console.log('🔄 Creating minimal backup for physical restructuring...');

async function createMinimalBackup() {
    const backupDir = path.resolve(__dirname, '../backups/full');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `minimal-backup-${timestamp}`;
    const backupPath = path.join(backupDir, backupName);
    
    console.log('📁 Creating backup directory...');
    await fs.mkdir(backupPath, { recursive: true });
    console.log(`   Created: ${backupPath}`);
    
    // Analyze current system state
    console.log('🔍 Analyzing current system state...');
    const systemState = await analyzeSystemState();
    
    // Create manifest
    const manifest = {
        backupName,
        timestamp,
        createdAt: new Date().toISOString(),
        purpose: 'Minimal pre-restructuring backup - state capture only',
        type: 'minimal',
        systemState
    };
    
    await fs.writeFile(
        path.join(backupPath, 'backup-manifest.json'),
        JSON.stringify(manifest, null, 2)
    );
    console.log(`✅ Manifest saved - Legacy files: ${systemState.fileStructure.legacyFileCount}`);
    
    return { success: true, backupPath, backupName, manifest };
}

async function analyzeSystemState() {
    const fileStructure = await analyzeFileStructure();
    const gitStatus = getGitStatus();
    
    console.log(`   Legacy files: ${fileStructure.legacyFileCount}`);
    console.log(`   Module files: ${fileStructure.moduleFileCount}`);
    console.log(`   Git status: ${gitStatus.status}`);
    
    return { fileStructure, gitStatus };
}

async function analyzeFileStructure() {
    const structure = {
        legacyFileCount: 0,
        moduleFileCount: 0,
        legacyDirectories: {}
    };

    // Check legacy directories
    const legacyDirs = [
        'server/controller',
        'server/models', 
        'server/routes',
        'server/services'
    ];
    
    for (const dir of legacyDirs) {
        try {
            const fullPath = path.resolve(__dirname, '../../', dir);
            const files = await fs.readdir(fullPath);
            const jsFiles = files.filter(f => f.endsWith('.js'));
            
            structure.legacyFileCount += jsFiles.length;
            structure.legacyDirectories[dir] = jsFiles;
        } catch (error) {
            structure.legacyDirectories[dir] = [];
        }
    }

    // Check module directories
    try {
        const modulesPath = path.resolve(__dirname, '../modules');
        const modules = await fs.readdir(modulesPath);
        
        for (const module of modules) {
            const modulePath = path.join(modulesPath, module);
            const moduleFiles = await countFilesRecursively(modulePath);
            structure.moduleFileCount += moduleFiles;
        }
    } catch (error) {
        // Modules directory doesn't exist
    }

    return structure;
}

async function countFilesRecursively(dirPath) {
    let count = 0;
    try {
        const items = await fs.readdir(dirPath, { withFileTypes: true });
        for (const item of items) {
            if (item.isDirectory()) {
                count += await countFilesRecursively(path.join(dirPath, item.name));
            } else if (item.name.endsWith('.js')) {
                count++;
            }
        }
    } catch (error) {
        // Directory doesn't exist or can't be read
    }
    return count;
}

function getGitStatus() {
    try {
        const rootPath = path.resolve(__dirname, '../../');
        
        const status = execSync('git status --porcelain', { 
            encoding: 'utf8',
            cwd: rootPath
        });
        
        const branch = execSync('git branch --show-current', { 
            encoding: 'utf8',
            cwd: rootPath
        });
        
        const commit = execSync('git rev-parse HEAD', { 
            encoding: 'utf8',
            cwd: rootPath
        });
        
        return {
            status: status.trim() ? 'dirty' : 'clean',
            branch: branch.trim(),
            commit: commit.trim().substring(0, 8),
            changeCount: status.trim() ? status.trim().split('\n').length : 0
        };
    } catch (error) {
        return { status: 'unknown', error: error.message };
    }
}

// Main execution
async function main() {
    try {
        const result = await createMinimalBackup();
        
        console.log('🎉 Minimal backup creation completed successfully!');
        console.log('📊 Backup Summary:');
        console.log(`   Name: ${result.backupName}`);
        console.log(`   Location: ${result.backupPath}`);
        console.log(`   Legacy files: ${result.manifest.systemState.fileStructure.legacyFileCount}`);
        console.log(`   Module files: ${result.manifest.systemState.fileStructure.moduleFileCount}`);
        console.log(`   Git status: ${result.manifest.systemState.gitStatus.status}`);
        console.log('✅ System state captured - ready for physical file restructuring');
        
        return result;
        
    } catch (error) {
        console.error('❌ Minimal backup creation failed:', error.message);
        throw error;
    }
}

// Execute
main()
    .then(() => {
        console.log('🏁 Minimal backup script completed successfully');
        process.exit(0);
    })
    .catch(error => {
        console.error('💥 Minimal backup script failed:', error.message);
        process.exit(1);
    });