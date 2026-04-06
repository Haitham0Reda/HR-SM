/**
 * Run SQL Migration Script
 * 
 * Executes SQL migration files against PostgreSQL database
 */

import { Sequelize } from 'sequelize';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration(migrationFile) {
  const mainDbUrl = process.env.MAIN_DATABASE_URL || 'postgresql://localhost:5432/hrsm_main_app';
  
  console.log(`\n🚀 Running migration: ${migrationFile}\n`);
  
  try {
    // Parse the connection URL
    const url = new URL(mainDbUrl);
    const config = {
      host: url.hostname,
      port: url.port || 5432,
      database: url.pathname.slice(1), // Remove leading slash
      username: url.username,
      password: String(url.password), // Ensure password is a string
      dialect: 'postgres',
      logging: false
    };
    
    console.log(`Connecting to: ${config.username}@${config.host}:${config.port}/${config.database}\n`);
    
    // Connect to PostgreSQL
    const sequelize = new Sequelize(config);
    
    await sequelize.authenticate();
    console.log('✓ Connected to PostgreSQL\n');
    
    // Read migration file
    const migrationPath = path.join(path.dirname(__dirname), migrationFile);
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute migration
    console.log('Executing migration...\n');
    await sequelize.query(sql);
    
    console.log('✅ Migration completed successfully!\n');
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Get migration file from command line or use default
const migrationFile = process.argv[2] || 'migrations/005-create-legacy-models-tables.sql';

runMigration(migrationFile);
