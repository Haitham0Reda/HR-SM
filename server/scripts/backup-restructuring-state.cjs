#!/usr/bin/env node

/**
 * Backup Current Working State for Restructuring
 * 
 * Creates a comprehensive backup before physical file restructuring
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔄 Starting comprehensive backup for physical restructuring...\n');

async function createBackup() {
    const backupDir = path.resolve(__dirname, '../backups/full');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `restructuring-backup-${timestamp}`;
    const backupPath = path.join(backupDir, backupName);
    
    console.log('📁 Creating backup directory...');
    await fs.mkdir(backupPath, { recursive: true });
    console.log(`   Created: ${backupPath}`);
    
    // Analyze system state
    console.log('\n🔍 Analyzing current system state...');
    const systemState = await analyzeSystemState();
    
    // Create manifest
    console.log('\n📋 Creating backup manifest...');
    const manifest = {
        backupName,
        timestamp,
        createdAt: new Date().toISOString(),
        purpose: 'Pre-restructuring backup of working system state',
        version: await getProjectVersion(),
        environment: {
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch
        },
        components: {
            sourceCode: true,
            configuration: true,
            dependencies: true,
            documentation: true
        },
        systemState
    };
    
    await fs.writeFile(
        path.join(backupPath, 'backup-manifest.json'),
        JSON.stringify(manifest, null, 2)
    );
    console.log(`   Manifest saved - Legacy files: ${systemState.fileStructure.legacyFileCount}`);
    
    // Create backups
    console.log('\n💾 Creating source code backup...');
    await backupSourceCode(backupPath);
    
    console.log('\n⚙️ Creating configuration backup...');
    await backupConfiguration(backupPath);
    
    console.log('\n📦 Creating dependencies backup...');
    await backupDependencies(backupPath);
    
    return { success: true, backupPath, backupName, manifest };
}

async function getProjectVersion() {
    try {
        const packageJson = JSON.parse(
            await fs.readFile(path.resolve(__dirname, '../../package.json'), 'utf8')
        );
        return packageJson.version;
    } catch (error) {
        return 'unknown';
    }
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
        legacyDirectories: {},
        moduleDirectories: []
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
        structure.moduleDirectories = modules;
        
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

async function backupSourceCode(backupPath) {
    const sourceBackupPath = path.join(backupPath, 'source-code');
    await fs.mkdir(sourceBackupPath, { recursive: true });
    
    const rootPath = path.resolve(__dirname, '../../');
    
    // Backup critical directories
    const dirsToBackup = [
        { src: 'server', exclude: ['node_modules', 'uploads', 'logs', 'backups'] },
        { src: 'client', exclude: ['node_modules', 'build', 'dist'] },
        { src: 'docs', exclude: [] },
        { src: 'scripts', exclude: [] },
        { src: 'config', exclude: [] },
        { src: '.kiro', exclude: [] }
    ];
    
    for (const { src, exclude } of dirsToBackup) {
        const sourcePath = path.join(rootPath, src);
        const targetPath = path.join(sourceBackupPath, src);
        
        try {
            await copyDirectorySelective(sourcePath, targetPath, exclude);
            const fileCount = await countFilesRecursively(targetPath);
            console.log(`   Backed up: ${src}/ (${fileCount} files)`);
        } catch (error) {
            console.log(`   ⚠️ Could not backup ${src}: ${error.message}`);
        }
    }
    
    // Backup root files
    const filesToBackup = [
        'package.json',
        'package-lock.json', 
        'README.md',
        'jest.config.js',
        'babel.config.js',
        'eslint.config.js'
    ];
    
    let backedUpFiles = 0;
    for (const file of filesToBackup) {
        try {
            const sourcePath = path.join(rootPath, file);
            const targetPath = path.join(sourceBackupPath, file);
            await fs.copyFile(sourcePath, targetPath);
            backedUpFiles++;
        } catch (error) {
            // File doesn't exist, skip
        }
    }
    console.log(`   Backed up: ${backedUpFiles} root files`);
}

async function copyDirectorySelective(source, target, excludeDirs = []) {
    await fs.mkdir(target, { recursive: true });
    
    const items = await fs.readdir(source, { withFileTypes: true });
    
    for (const item of items) {
        if (excludeDirs.includes(item.name)) {
            continue;
        }
        
        const sourcePath = path.join(source, item.name);
        const targetPath = path.join(target, item.name);
        
        if (item.isDirectory()) {
            await copyDirectorySelective(sourcePath, targetPath, excludeDirs);
        } else {
            await fs.copyFile(sourcePath, targetPath);
        }
    }
}

async function backupConfiguration(backupPath) {
    const configBackupPath = path.join(backupPath, 'configuration');
    await fs.mkdir(configBackupPath, { recursive: true });
    
    const rootPath = path.resolve(__dirname, '../../');
    const configFiles = [
        'package.json',
        'package-lock.json',
        'jest.config.js',
        'babel.config.js',
        'eslint.config.js'
    ];
    
    let backedUpConfigs = 0;
    for (const configFile of configFiles) {
        try {
            const sourcePath = path.join(rootPath, configFile);
            const targetPath = path.join(configBackupPath, path.basename(configFile));
            await fs.copyFile(sourcePath, targetPath);
            backedUpConfigs++;
        } catch (error) {
            // File doesn't exist, skip
        }
    }
    console.log(`   Backed up: ${backedUpConfigs} configuration files`);
}

async function backupDependencies(backupPath) {
    const depsBackupPath = path.join(backupPath, 'dependencies');
    await fs.mkdir(depsBackupPath, { recursive: true });
    
    const rootPath = path.resolve(__dirname, '../../');
    
    try {
        // Copy package files
        await fs.copyFile(
            path.join(rootPath, 'package.json'),
            path.join(depsBackupPath, 'package.json')
        );
        await fs.copyFile(
            path.join(rootPath, 'package-lock.json'),
            path.join(depsBackupPath, 'package-lock.json')
        );
        
        // Create dependency analysis
        const packageJson = JSON.parse(
            await fs.readFile(path.join(rootPath, 'package.json'), 'utf8')
        );
        
        const depsList = {
            dependencies: packageJson.dependencies || {},
            devDependencies: packageJson.devDependencies || {},
            optionalDependencies: packageJson.optionalDependencies || {},
            overrides: packageJson.overrides || {}
        };
        
        await fs.writeFile(
            path.join(depsBackupPath, 'dependencies-analysis.json'),
            JSON.stringify(depsList, null, 2)
        );
        
        const totalDeps = Object.keys(depsList.dependencies).length + 
                         Object.keys(depsList.devDependencies).length;
        console.log(`   Backed up: ${totalDeps} total dependencies`);
        
    } catch (error) {
        console.log(`   ⚠️ Dependencies backup failed: ${error.message}`);
    }
}

// Main execution
async function main() {
    try {
        const result = await createBackup();
        
        console.log('\n🎉 Backup creation completed successfully!');
        console.log('\n📊 Backup Summary:');
        console.log(`   Name: ${result.backupName}`);
        console.log(`   Location: ${result.backupPath}`);
        console.log(`   Legacy files: ${result.manifest.systemState.fileStructure.legacyFileCount}`);
        console.log(`   Module files: ${result.manifest.systemState.fileStructure.moduleFileCount}`);
        console.log(`   Git status: ${result.manifest.systemState.gitStatus.status}`);
        console.log(`   Components: Source code, Configuration, Dependencies`);
        console.log('\n✅ System is ready for physical file restructuring');
        
        return result;
        
    } catch (error) {
        console.error('\n❌ Backup creation failed:', error.message);
        console.error(error.stack);
        throw error;
    }
}

// Execute
main()
    .then(() => {
        console.log('\n🏁 Backup script completed successfully');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n💥 Backup script failed:', error.message);
        process.exit(1);
    });