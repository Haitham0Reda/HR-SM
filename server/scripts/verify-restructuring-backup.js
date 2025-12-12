/**
 * Verify Restructuring Backup
 * 
 * This script verifies the integrity and completeness of the 
 * restructuring backup created before physical file moves.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createReadStream } from 'fs';
import { createHash } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class BackupVerifier {
    constructor(backupPath) {
        this.backupPath = backupPath;
    }

    async verify() {
        console.log('🔍 Verifying restructuring backup...\n');
        
        try {
            // Check if backup directory exists
            await this.checkBackupExists();
            
            // Verify manifest
            const manifest = await this.verifyManifest();
            
            // Verify checksums
            await this.verifyChecksums();
            
            // Verify components
            await this.verifyComponents();
            
            console.log('\n✅ Backup verification completed successfully!');
            console.log('🎯 Backup is valid and ready for use in rollback scenarios');
            
            return { success: true, manifest };
            
        } catch (error) {
            console.error('\n❌ Backup verification failed:', error.message);
            throw error;
        }
    }

    async checkBackupExists() {
        console.log('📁 Checking backup directory...');
        
        try {
            const stats = await fs.stat(this.backupPath);
            if (!stats.isDirectory()) {
                throw new Error('Backup path is not a directory');
            }
            console.log(`   ✅ Backup directory exists: ${this.backupPath}`);
        } catch (error) {
            throw new Error(`Backup directory not found: ${this.backupPath}`);
        }
    }

    async verifyManifest() {
        console.log('\n📋 Verifying backup manifest...');
        
        const manifestPath = path.join(this.backupPath, 'backup-manifest.json');
        
        try {
            const manifestContent = await fs.readFile(manifestPath, 'utf8');
            const manifest = JSON.parse(manifestContent);
            
            console.log(`   ✅ Manifest found and valid`);
            console.log(`   📅 Created: ${manifest.createdAt}`);
            console.log(`   🎯 Purpose: ${manifest.purpose}`);
            console.log(`   📦 Version: ${manifest.version}`);
            console.log(`   🖥️ Node: ${manifest.environment.nodeVersion}`);
            
            // Verify required fields
            const requiredFields = ['backupName', 'timestamp', 'createdAt', 'purpose', 'components'];
            for (const field of requiredFields) {
                if (!manifest[field]) {
                    throw new Error(`Missing required field in manifest: ${field}`);
                }
            }
            
            return manifest;
            
        } catch (error) {
            throw new Error(`Manifest verification failed: ${error.message}`);
        }
    }

    async verifyChecksums() {
        console.log('\n🔐 Verifying file checksums...');
        
        const checksumPath = path.join(this.backupPath, 'checksums.json');
        
        try {
            const checksumContent = await fs.readFile(checksumPath, 'utf8');
            const expectedChecksums = JSON.parse(checksumContent);
            
            console.log(`   📊 Found ${Object.keys(expectedChecksums).length} checksums to verify`);
            
            for (const [filename, expectedHash] of Object.entries(expectedChecksums)) {
                const filePath = path.join(this.backupPath, filename);
                const actualHash = await this.calculateFileHash(filePath);
                
                if (actualHash !== expectedHash) {
                    throw new Error(`Checksum mismatch for ${filename}`);
                }
                
                console.log(`   ✅ ${filename}: ${actualHash.substring(0, 16)}...`);
            }
            
        } catch (error) {
            throw new Error(`Checksum verification failed: ${error.message}`);
        }
    }

    async calculateFileHash(filePath) {
        return new Promise((resolve, reject) => {
            const hash = createHash('sha256');
            const stream = createReadStream(filePath);
            
            stream.on('data', data => hash.update(data));
            stream.on('end', () => resolve(hash.digest('hex')));
            stream.on('error', reject);
        });
    }

    async verifyComponents() {
        console.log('\n🧩 Verifying backup components...');
        
        const expectedComponents = [
            'source-code.tar.gz',
            'database-dump.json',
            'configuration',
            'dependencies',
            'backup-manifest.json',
            'checksums.json'
        ];
        
        for (const component of expectedComponents) {
            const componentPath = path.join(this.backupPath, component);
            
            try {
                const stats = await fs.stat(componentPath);
                
                if (component.endsWith('.tar.gz') || component.endsWith('.json')) {
                    if (!stats.isFile()) {
                        throw new Error(`${component} should be a file`);
                    }
                    const sizeKB = (stats.size / 1024).toFixed(2);
                    console.log(`   ✅ ${component}: ${sizeKB} KB`);
                } else {
                    if (!stats.isDirectory()) {
                        throw new Error(`${component} should be a directory`);
                    }
                    const files = await fs.readdir(componentPath);
                    console.log(`   ✅ ${component}/: ${files.length} files`);
                }
                
            } catch (error) {
                if (component === 'database-dump.json') {
                    console.log(`   ⚠️ ${component}: Not found (database backup may have been skipped)`);
                } else {
                    throw new Error(`Component verification failed for ${component}: ${error.message}`);
                }
            }
        }
    }

    static async findLatestBackup() {
        const backupsDir = path.resolve(__dirname, '../backups/full');
        
        try {
            const entries = await fs.readdir(backupsDir, { withFileTypes: true });
            const backupDirs = entries
                .filter(entry => entry.isDirectory() && entry.name.startsWith('restructuring-backup-'))
                .map(entry => ({
                    name: entry.name,
                    path: path.join(backupsDir, entry.name)
                }))
                .sort((a, b) => b.name.localeCompare(a.name)); // Sort by name (timestamp) descending
            
            if (backupDirs.length === 0) {
                throw new Error('No restructuring backups found');
            }
            
            return backupDirs[0].path;
            
        } catch (error) {
            throw new Error(`Could not find backup directory: ${error.message}`);
        }
    }
}

// Main execution
const main = async () => {
    try {
        let backupPath = process.argv[2];
        
        if (!backupPath) {
            console.log('🔍 No backup path provided, searching for latest backup...');
            backupPath = await BackupVerifier.findLatestBackup();
            console.log(`📁 Found latest backup: ${path.basename(backupPath)}\n`);
        }
        
        const verifier = new BackupVerifier(backupPath);
        const result = await verifier.verify();
        
        console.log('\n🎉 Backup verification completed successfully!');
        console.log('\n📊 Verification Summary:');
        console.log(`   Backup Path: ${backupPath}`);
        console.log(`   Backup Name: ${result.manifest.backupName}`);
        console.log(`   Created: ${result.manifest.createdAt}`);
        console.log(`   Status: ✅ Valid and complete`);
        console.log('\n🔄 Ready for physical file restructuring');
        
        process.exit(0);
        
    } catch (error) {
        console.error('\n❌ Backup verification failed:', error.message);
        process.exit(1);
    }
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export default BackupVerifier;