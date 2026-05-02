/**
 * Database Configuration - License Server
 * PostgreSQL/Sequelize configuration for the license server database
 */

import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import winston from 'winston';

dotenv.config();

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'license-server-db' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// License Server Database Configuration
// Supports both full URL (LICENSE_DATABASE_URL) and individual components
let dbConfig = {};

const licenseUrl = process.env.LICENSE_DATABASE_URL;
if (licenseUrl) {
  // Parse URL: postgresql://user:pass@host:port/db
  try {
    const url = new URL(licenseUrl);
    dbConfig = {
      host: url.hostname,
      port: parseInt(url.port) || 5432,
      username: url.username,
      password: url.password,
      database: url.pathname.slice(1), // remove leading /
      dialect: 'postgres',
      pool: { max: 15, min: 3, acquire: 30000, idle: 10000 },
      define: { timestamps: true, underscored: true, freezeTableName: true },
      timezone: '+00:00',
      logging: process.env.NODE_ENV === 'production' ? false : (msg) => logger.debug(msg)
    };
  } catch (e) {
    console.warn('Failed to parse LICENSE_DATABASE_URL, falling back to component env vars');
  }
}

// Fallback to individual environment variables if URL not provided
if (!dbConfig.database) {
  dbConfig = {
    database: process.env.LICENSE_DB_NAME || 'hrsm_licenses',
    username: process.env.LICENSE_DB_USER || 'postgres',
    password: process.env.LICENSE_DB_PASSWORD || 'postgres',
    host: process.env.LICENSE_DB_HOST || 'localhost',
    port: parseInt(process.env.LICENSE_DB_PORT || '5432'),
    dialect: 'postgres',
    pool: { max: 15, min: 3, acquire: 30000, idle: 10000 },
    define: { timestamps: true, underscored: true, freezeTableName: true },
    timezone: '+00:00',
    logging: process.env.NODE_ENV === 'production' ? false : (msg) => logger.debug(msg)
  };
}

// Create Sequelize instance for License Server
export const licenseServerDb = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  dbConfig
);

// Test connection
export async function testConnection() {
  try {
    await licenseServerDb.authenticate();
    logger.info('✅ License Server PostgreSQL connection established successfully');
    return true;
  } catch (error) {
    logger.error('❌ Unable to connect to License Server PostgreSQL:', error);
    throw error;
  }
}

// Initialize database with retry logic
export async function initializeDatabase(retries = 5, delay = 5000) {
  for (let i = 0; i < retries; i++) {
    try {
      await testConnection();
      
      // Sync models (only in development)
      if (process.env.NODE_ENV !== 'production') {
        await licenseServerDb.sync({ alter: false });
        logger.info('✅ Database models synchronized');
      }
      
      return true;
    } catch (error) {
      logger.error(`❌ Database connection attempt ${i + 1} failed:`, error.message);
      
      if (i === retries - 1) {
        logger.error('❌ All database connection attempts failed');
        throw error;
      }
      
      logger.info(`⏳ Retrying database connection in ${delay / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 1.5; // Exponential backoff
    }
  }
}

// Graceful shutdown
export async function closeDatabase() {
  try {
    await licenseServerDb.close();
    logger.info('✅ License Server PostgreSQL connection closed');
  } catch (error) {
    logger.error('❌ Error closing database connection:', error);
    throw error;
  }
}

// Export default
export default licenseServerDb;
