/**
 * Global Teardown for PostgreSQL Tests
 * 
 * Runs once after all tests
 */

module.exports = async () => {
  console.log('\n🧹 Cleaning up after test suite...\n');

  // Optional: Drop test databases
  // Uncomment if you want to drop test databases after tests
  /*
  const { Sequelize } = require('sequelize');
  
  try {
    const postgres = new Sequelize('postgresql://localhost:5432/postgres', {
      logging: false
    });

    await postgres.authenticate();

    // Drop test databases
    await postgres.query('DROP DATABASE IF EXISTS hrsm_test');
    await postgres.query('DROP DATABASE IF EXISTS hrsm_license_test');
    
    await postgres.close();

    console.log('✓ Test databases dropped');
  } catch (error) {
    console.error('❌ Failed to drop test databases:', error.message);
  }
  */

  console.log('\n✅ Global teardown complete\n');
};
