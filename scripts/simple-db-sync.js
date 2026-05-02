/**
 * Simple PostgreSQL Table Sync
 * Creates all tables without importing models explicitly
 */

import chalk from 'chalk';
import { licenseServerDb, mainAppDb, connectDatabases } from '../server/config/database.js';

async function main() {
  console.log(chalk.bold.cyan('\n🗄️  PostgreSQL Simple Table Sync\n'));
  
  try {
    // Connect to databases
    await connectDatabases();
    
    const args = process.argv.slice(2);
    const force = args.includes('--force');
    const alter = args.includes('--alter');
    
    if (force) {
      console.log(chalk.red.bold('\n⚠️  WARNING: --force flag detected!'));
      console.log(chalk.red('   This will DROP all existing tables and recreate them.'));
      console.log(chalk.red('   ALL DATA WILL BE LOST!\n'));
    }
    
    console.log(chalk.yellow(`\n🔄 Syncing tables (force: ${force}, alter: ${alter})...\n`));
    
    // Sync License Server Database
    console.log(chalk.bold('License Server Database:'));
    await licenseServerDb.sync({ force, alter });
    console.log(chalk.green('  ✓ Tables synced\n'));
    
    // Sync Main Application Database
    console.log(chalk.bold('Main Application Database:'));
    await mainAppDb.sync({ force, alter });
    console.log(chalk.green('  ✓ Tables synced\n'));
    
    // Get tables
    console.log(chalk.yellow('📊 Fetching created tables...\n'));
    
    const [licenseResults] = await licenseServerDb.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    
    const [mainResults] = await mainAppDb.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    
    console.log(chalk.bold.cyan('='.repeat(80)));
    console.log(chalk.bold.cyan('POSTGRESQL TABLES'));
    console.log(chalk.bold.cyan('='.repeat(80) + '\n'));
    
    console.log(chalk.bold('License Server Database:'));
    console.log(chalk.gray('─'.repeat(80)));
    if (licenseResults.length > 0) {
      licenseResults.forEach(r => {
        console.log(chalk.green(`  ✓ ${r.table_name}`));
      });
      console.log(chalk.gray(`\n  Total: ${licenseResults.length} tables\n`));
    } else {
      console.log(chalk.yellow('  (no tables found)\n'));
    }
    
    console.log(chalk.bold('Main Application Database:'));
    console.log(chalk.gray('─'.repeat(80)));
    if (mainResults.length > 0) {
      mainResults.forEach(r => {
        console.log(chalk.green(`  ✓ ${r.table_name}`));
      });
      console.log(chalk.gray(`\n  Total: ${mainResults.length} tables\n`));
    } else {
      console.log(chalk.yellow('  (no tables found)\n'));
    }
    
    console.log(chalk.bold.green('\n✅ Table sync completed successfully!\n'));
    
    await licenseServerDb.close();
    await mainAppDb.close();
    
    process.exit(0);
  } catch (error) {
    console.error(chalk.red('\n❌ Table sync failed:'), error.message);
    console.error(chalk.gray(error.stack));
    
    try {
      await licenseServerDb.close();
      await mainAppDb.close();
    } catch (closeError) {
      // Ignore
    }
    
    process.exit(1);
  }
}

console.log(chalk.gray('Usage: npm run db:sync:simple [--force] [--alter]'));
console.log(chalk.gray('  --force: Drop and recreate all tables (DESTRUCTIVE!)'));
console.log(chalk.gray('  --alter: Alter existing tables to match models\n'));

main();
