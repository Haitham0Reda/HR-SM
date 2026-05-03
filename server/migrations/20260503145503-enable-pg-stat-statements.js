/**
 * Migration: Enable pg_stat_statements Extension
 * 
 * This migration enables the pg_stat_statements extension which tracks
 * execution statistics of all SQL statements executed by the server.
 * 
 * Benefits:
 * - Identify slow queries
 * - Track query execution frequency
 * - Monitor query performance over time
 * - Optimize database performance
 * 
 * Note: This extension requires superuser privileges or the pg_stat_statements
 * extension to be available in the PostgreSQL installation.
 */

export async function up(queryInterface, Sequelize) {
  console.log('Enabling pg_stat_statements extension...');

  try {
    await queryInterface.sequelize.query(
      'CREATE EXTENSION IF NOT EXISTS pg_stat_statements;'
    );
    console.log('✓ pg_stat_statements extension enabled successfully');
    
    // Verify the extension is installed
    const [results] = await queryInterface.sequelize.query(
      "SELECT * FROM pg_extension WHERE extname = 'pg_stat_statements';"
    );
    
    if (results.length > 0) {
      console.log('✓ pg_stat_statements extension verified');
    } else {
      console.warn('⚠️  pg_stat_statements extension may not be properly installed');
    }
  } catch (error) {
    console.error('✗ Failed to enable pg_stat_statements:', error.message);
    console.warn('⚠️  This extension requires superuser privileges or may not be available in your PostgreSQL installation');
    console.warn('⚠️  You can manually enable it by running: CREATE EXTENSION IF NOT EXISTS pg_stat_statements;');
    // Don't throw - allow migration to continue even if extension fails
  }
}

export async function down(queryInterface, Sequelize) {
  console.log('Disabling pg_stat_statements extension...');

  try {
    await queryInterface.sequelize.query(
      'DROP EXTENSION IF EXISTS pg_stat_statements;'
    );
    console.log('✓ pg_stat_statements extension disabled successfully');
  } catch (error) {
    console.error('✗ Failed to disable pg_stat_statements:', error.message);
    // Don't throw - allow migration to continue even if extension removal fails
  }
}
