#!/usr/bin/env node

/**
 * Setup Backup Tools
 * 
 * This script helps set up the required tools for database backup functionality
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

class BackupToolsSetup {
    constructor() {
        this.platform = process.platform;
    }

    async setup() {
        console.log(chalk.blue('🔧 Setting up Backup Tools\n'));

        try {
            // Check if mongodump is already available
            await this.checkMongodump();

            // If not available, provide installation instructions
            await this.provideMongodumpInstructions();

            // Verify backup directories
            await this.setupBackupDirectories();

            // Create backup encryption key if missing
            await this.setupEncryptionKey();

            console.log(chalk.green('\n✅ Backup tools setup complete!'));

        } catch (error) {
            console.error(chalk.red('\n❌ Setup failed:'), error.message);
            process.exit(1);
        }
    }

    async checkMongodump() {
        console.log(chalk.blue('1. Checking mongodump availability...'));

        try {
            const { stdout } = await execAsync('mongodump --version');
            console.log(chalk.green('   ✓ mongodump is already installed'));
            console.log(chalk.cyan(`   Version: ${stdout.trim()}`));
            return true;
        } catch (error) {
            console.log(chalk.red('   ❌ mongodump is not installed'));
            return false;
        }
    }

    async provideMongodumpInstructions() {
        console.log(chalk.blue('\n2. MongoDB Database Tools Installation Instructions:'));
        
        console.log(chalk.yellow('\n   mongodump is required for database backups.'));
        console.log(chalk.cyan('   Please install MongoDB Database Tools:'));
        
        if (this.platform === 'win32') {
            console.log(chalk.cyan('\n   For Windows:'));
            console.log(chalk.cyan('   1. Download from: https://www.mongodb.com/try/download/database-tools'));
            console.log(chalk.cyan('   2. Extract the ZIP file'));
            console.log(chalk.cyan('   3. Add the bin directory to your PATH environment variable'));
            console.log(chalk.cyan('   4. Or install via Chocolatey: choco install mongodb-database-tools'));
        } else if (this.platform === 'darwin') {
            console.log(chalk.cyan('\n   For macOS:'));
            console.log(chalk.cyan('   brew install mongodb/brew/mongodb-database-tools'));
        } else {
            console.log(chalk.cyan('\n   For Linux (Ubuntu/Debian):'));
            console.log(chalk.cyan('   wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -'));
            console.log(chalk.cyan('   echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list'));
            console.log(chalk.cyan('   sudo apt-get update'));
            console.log(chalk.cyan('   sudo apt-get install -y mongodb-database-tools'));
        }

        console.log(chalk.yellow('\n   After installation, restart your terminal and run this script again.'));
    }

    async setupBackupDirectories() {
        console.log(chalk.blue('\n3. Setting up backup directories...'));

        const backupDir = path.join(process.cwd(), 'backups');
        const directories = ['daily', 'weekly', 'monthly', 'metadata', 'temp'];

        directories.forEach(dir => {
            const dirPath = path.join(backupDir, dir);
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
                console.log(chalk.green(`   ✓ Created ${dir} directory`));
            } else {
                console.log(chalk.cyan(`   ✓ ${dir} directory already exists`));
            }
        });

        // Create logs directory
        const logsDir = path.join(process.cwd(), 'logs');
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
            console.log(chalk.green('   ✓ Created logs directory'));
        } else {
            console.log(chalk.cyan('   ✓ logs directory already exists'));
        }
    }

    async setupEncryptionKey() {
        console.log(chalk.blue('\n4. Setting up backup encryption...'));

        const envPath = path.join(process.cwd(), '.env');
        
        if (!fs.existsSync(envPath)) {
            console.log(chalk.yellow('   ⚠ .env file not found, creating one...'));
            fs.writeFileSync(envPath, '# HR-SM Environment Configuration\n');
        }

        const envContent = fs.readFileSync(envPath, 'utf8');
        
        if (!envContent.includes('BACKUP_ENCRYPTION_KEY')) {
            console.log(chalk.yellow('   ⚠ BACKUP_ENCRYPTION_KEY not found, generating one...'));
            
            // Generate a random 32-byte key
            const crypto = await import('crypto');
            const encryptionKey = crypto.randomBytes(32).toString('hex');
            
            const newEnvContent = envContent + `\n# Backup Configuration\nBACKUP_ENCRYPTION_KEY=${encryptionKey}\nBACKUPS_ENABLED=true\n`;
            fs.writeFileSync(envPath, newEnvContent);
            
            console.log(chalk.green('   ✓ Generated and added BACKUP_ENCRYPTION_KEY to .env'));
            console.log(chalk.yellow('   ⚠ Keep this key secure! It\'s needed to decrypt backups.'));
        } else {
            console.log(chalk.cyan('   ✓ BACKUP_ENCRYPTION_KEY already configured'));
        }

        // Check other backup-related environment variables
        const requiredVars = ['MONGODB_URI', 'MONGO_URI'];
        const hasMongoUri = requiredVars.some(varName => envContent.includes(varName));
        
        if (hasMongoUri) {
            console.log(chalk.green('   ✓ MongoDB URI configured'));
        } else {
            console.log(chalk.red('   ❌ MongoDB URI not configured'));
            console.log(chalk.yellow('   Please add MONGODB_URI to your .env file'));
        }
    }

    async createTestScript() {
        console.log(chalk.blue('\n5. Creating backup test script...'));

        const testScript = `#!/usr/bin/env node

/**
 * Quick Backup Test
 * Run this to test if backup functionality is working
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function testBackup() {
    console.log('Testing backup functionality...');
    
    try {
        // Test mongodump
        await execAsync('mongodump --version');
        console.log('✓ mongodump is available');
        
        // Test backup service
        const { BackupService } = await import('../services/backupService.js');
        console.log('✓ BackupService can be imported');
        
        console.log('\\n🎉 Backup system is ready!');
        console.log('To run a full backup test: node server/scripts/test-backup-functionality.js');
        
    } catch (error) {
        console.error('❌ Backup test failed:', error.message);
        process.exit(1);
    }
}

testBackup();
`;

        const testScriptPath = path.join(process.cwd(), 'server', 'scripts', 'quick-backup-test.js');
        fs.writeFileSync(testScriptPath, testScript);
        console.log(chalk.green('   ✓ Created quick backup test script'));
        console.log(chalk.cyan('   Run: node server/scripts/quick-backup-test.js'));
    }
}

// Main execution
async function main() {
    const setup = new BackupToolsSetup();
    await setup.setup();
    await setup.createTestScript();
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        console.error(chalk.red('Setup failed:'), error);
        process.exit(1);
    });
}