/**
 * PostgreSQL Test Configuration
 * 
 * Sets up test database and configuration for running tests with PostgreSQL
 */

const { Sequelize } = require('sequelize');
const path = require('path');

// Test database configuration
const TEST_CONFIG = {
  database: process.env.TEST_DATABASE_URL || 'postgresql://localhost:5432/hrsm_test',
  licenseDatabase: process.env.TEST_LICENSE_DATABASE_URL || 'postgresql://localhost:5432/hrsm_license_test',
  options: {
    logging: false, // Disable logging during tests
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    dialectOptions: {
      // Use a statement timeout for tests
      statement_timeout: 10000 // 10 seconds
    }
  }
};

// Sequelize instances
let mainDb = null;
let licenseDb = null;

/**
 * Initialize test databases
 */
async function initializeTestDatabases() {
  console.log('🔧 Initializing test databases...');

  try {
    // Create main database connection
    mainDb = new Sequelize(TEST_CONFIG.database, TEST_CONFIG.options);
    await mainDb.authenticate();
    console.log('✓ Connected to main test database');

    // Create license database connection
    licenseDb = new Sequelize(TEST_CONFIG.licenseDatabase, TEST_CONFIG.options);
    await licenseDb.authenticate();
    console.log('✓ Connected to license test database');

    return { mainDb, licenseDb };
  } catch (error) {
    console.error('❌ Failed to initialize test databases:', error.message);
    throw error;
  }
}

/**
 * Sync all models (create tables)
 */
async function syncModels(force = false) {
  console.log(`🔄 Syncing models (force: ${force})...`);

  try {
    // Sync main database models
    await mainDb.sync({ force });
    console.log('✓ Main database models synced');

    // Sync license database models
    await licenseDb.sync({ force });
    console.log('✓ License database models synced');
  } catch (error) {
    console.error('❌ Failed to sync models:', error.message);
    throw error;
  }
}

/**
 * Clean all tables (truncate)
 */
async function cleanAllTables() {
  console.log('🧹 Cleaning all tables...');

  try {
    // Get all table names from main database
    const [mainTables] = await mainDb.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public'
    `);

    // Truncate all tables in main database
    for (const { tablename } of mainTables) {
      await mainDb.query(`TRUNCATE TABLE "${tablename}" CASCADE`);
    }
    console.log(`✓ Cleaned ${mainTables.length} tables in main database`);

    // Get all table names from license database
    const [licenseTables] = await licenseDb.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public'
    `);

    // Truncate all tables in license database
    for (const { tablename } of licenseTables) {
      await licenseDb.query(`TRUNCATE TABLE "${tablename}" CASCADE`);
    }
    console.log(`✓ Cleaned ${licenseTables.length} tables in license database`);
  } catch (error) {
    console.error('❌ Failed to clean tables:', error.message);
    throw error;
  }
}

/**
 * Close database connections
 */
async function closeDatabases() {
  console.log('🔌 Closing database connections...');

  try {
    if (mainDb) {
      await mainDb.close();
      console.log('✓ Main database connection closed');
    }

    if (licenseDb) {
      await licenseDb.close();
      console.log('✓ License database connection closed');
    }
  } catch (error) {
    console.error('❌ Failed to close databases:', error.message);
    throw error;
  }
}

/**
 * Create test tenant
 */
async function createTestTenant(tenantData = {}) {
  const defaultTenant = {
    tenant_id: 'test-tenant-001',
    name: 'Test Tenant',
    domain: 'test.example.com',
    status: 'active',
    ...tenantData
  };

  // Import Tenant model
  const { default: Tenant } = await import('../../server/platform/tenants/models/Tenant.sequelize.js');
  
  return await Tenant.create(defaultTenant);
}

/**
 * Create test user
 */
async function createTestUser(tenantId, userData = {}) {
  const defaultUser = {
    tenant_id: tenantId,
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
    role: 'user',
    status: 'active',
    ...userData
  };

  // Import User model
  const { default: User } = await import('../../server/modules/hr-core/users/models/user.model.js');
  
  return await User.create(defaultUser);
}

/**
 * Setup test data
 */
async function setupTestData() {
  console.log('📦 Setting up test data...');

  try {
    // Create test tenant
    const tenant = await createTestTenant();
    console.log(`✓ Created test tenant: ${tenant.tenant_id}`);

    // Create test users
    const user1 = await createTestUser(tenant.tenant_id, {
      username: 'user1',
      email: 'user1@example.com'
    });
    const user2 = await createTestUser(tenant.tenant_id, {
      username: 'user2',
      email: 'user2@example.com'
    });
    console.log(`✓ Created ${2} test users`);

    return { tenant, users: [user1, user2] };
  } catch (error) {
    console.error('❌ Failed to setup test data:', error.message);
    throw error;
  }
}

/**
 * Get database instances
 */
function getDatabases() {
  return { mainDb, licenseDb };
}

/**
 * Execute in transaction (for test isolation)
 */
async function executeInTransaction(callback) {
  const transaction = await mainDb.transaction();
  
  try {
    const result = await callback(transaction);
    await transaction.commit();
    return result;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

module.exports = {
  TEST_CONFIG,
  initializeTestDatabases,
  syncModels,
  cleanAllTables,
  closeDatabases,
  createTestTenant,
  createTestUser,
  setupTestData,
  getDatabases,
  executeInTransaction
};
