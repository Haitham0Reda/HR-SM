/**
 * Global Setup for PostgreSQL Tests
 * 
 * Runs once before all tests
 */

const { Sequelize } = require('sequelize');

module.exports = async () => {
  console.log('\n🚀 Starting PostgreSQL test suite...\n');

  const testDbUrl = process.env.TEST_DATABASE_URL || 'postgresql://localhost:5432/hrsm_test';
  const licenseDbUrl = process.env.TEST_LICENSE_DATABASE_URL || 'postgresql://localhost:5432/hrsm_license_test';

  try {
    // Create test databases if they don't exist
    const postgres = new Sequelize('postgresql://localhost:5432/postgres', {
      logging: false
    });

    await postgres.authenticate();

    // Create main test database
    try {
      await postgres.query('CREATE DATABASE hrsm_test');
      console.log('✓ Created main test database');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  Main test database already exists');
      } else {
        throw error;
      }
    }

    // Create license test database
    try {
      await postgres.query('CREATE DATABASE hrsm_license_test');
      console.log('✓ Created license test database');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  License test database already exists');
      } else {
        throw error;
      }
    }

    await postgres.close();

    console.log('\n✅ Global setup complete\n');
  } catch (error) {
    console.error('\n❌ Global setup failed:', error.message);
    throw error;
  }
};
