#!/usr/bin/env node

/**
 * PostgreSQL Monitoring Setup Script
 * 
 * Sets up PostgreSQL monitoring extensions and views
 * Configures pg_stat_statements for query performance tracking
 */

const { Client } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const databases = [
  {
    name: 'License Server',
    url: process.env.LICENSE_DATABASE_URL
  },
  {
    name: 'Main Application',
    url: process.env.MAIN_DATABASE_URL
  }
];

/**
 * Set up monitoring for a database
 */
async function setupMonitoring(dbName, connectionUrl) {
  const client = new Client({ connectionString: connectionUrl });

  try {
    await client.connect();
    console.log(`\n✓ Connected to ${dbName} database`);

    // Enable pg_stat_statements extension for query performance tracking
    console.log('  Setting up pg_stat_statements extension...');
    try {
      await client.query('CREATE EXTENSION IF NOT EXISTS pg_stat_statements;');
      console.log('  ✓ pg_stat_statements extension enabled');
    } catch (error) {
      if (error.message.includes('permission denied')) {
        console.log('  ⚠ Warning: Insufficient permissions to create extension');
        console.log('    Run as superuser: CREATE EXTENSION IF NOT EXISTS pg_stat_statements;');
      } else {
        throw error;
      }
    }

    // Create monitoring views
    console.log('  Creating monitoring views...');

    // View: Slow queries
    await client.query(`
      CREATE OR REPLACE VIEW slow_queries AS
      SELECT 
        query,
        calls,
        total_exec_time,
        mean_exec_time,
        max_exec_time,
        stddev_exec_time,
        rows
      FROM pg_stat_statements
      WHERE mean_exec_time > 1000  -- queries slower than 1 second
      ORDER BY mean_exec_time DESC
      LIMIT 50;
    `);
    console.log('  ✓ slow_queries view created');

    // View: Most frequent queries
    await client.query(`
      CREATE OR REPLACE VIEW frequent_queries AS
      SELECT 
        query,
        calls,
        total_exec_time,
        mean_exec_time,
        rows
      FROM pg_stat_statements
      ORDER BY calls DESC
      LIMIT 50;
    `);
    console.log('  ✓ frequent_queries view created');

    // View: Connection statistics
    await client.query(`
      CREATE OR REPLACE VIEW connection_stats AS
      SELECT 
        datname as database,
        numbackends as active_connections,
        xact_commit as transactions_committed,
        xact_rollback as transactions_rolled_back,
        blks_read as blocks_read,
        blks_hit as blocks_hit,
        tup_returned as tuples_returned,
        tup_fetched as tuples_fetched,
        tup_inserted as tuples_inserted,
        tup_updated as tuples_updated,
        tup_deleted as tuples_deleted,
        conflicts,
        temp_files,
        temp_bytes,
        deadlocks,
        blk_read_time,
        blk_write_time,
        stats_reset
      FROM pg_stat_database
      WHERE datname = current_database();
    `);
    console.log('  ✓ connection_stats view created');

    // View: Table statistics
    await client.query(`
      CREATE OR REPLACE VIEW table_stats AS
      SELECT 
        schemaname,
        tablename,
        seq_scan as sequential_scans,
        seq_tup_read as sequential_tuples_read,
        idx_scan as index_scans,
        idx_tup_fetch as index_tuples_fetched,
        n_tup_ins as tuples_inserted,
        n_tup_upd as tuples_updated,
        n_tup_del as tuples_deleted,
        n_tup_hot_upd as hot_updates,
        n_live_tup as live_tuples,
        n_dead_tup as dead_tuples,
        last_vacuum,
        last_autovacuum,
        last_analyze,
        last_autoanalyze
      FROM pg_stat_user_tables
      ORDER BY seq_scan + idx_scan DESC
      LIMIT 50;
    `);
    console.log('  ✓ table_stats view created');

    // View: Index usage
    await client.query(`
      CREATE OR REPLACE VIEW index_usage AS
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_scan as index_scans,
        idx_tup_read as tuples_read,
        idx_tup_fetch as tuples_fetched,
        pg_size_pretty(pg_relation_size(indexrelid)) as index_size
      FROM pg_stat_user_indexes
      ORDER BY idx_scan DESC;
    `);
    console.log('  ✓ index_usage view created');

    // View: Unused indexes
    await client.query(`
      CREATE OR REPLACE VIEW unused_indexes AS
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_scan as index_scans,
        pg_size_pretty(pg_relation_size(indexrelid)) as index_size
      FROM pg_stat_user_indexes
      WHERE idx_scan = 0
        AND indexrelname NOT LIKE '%_pkey'
      ORDER BY pg_relation_size(indexrelid) DESC;
    `);
    console.log('  ✓ unused_indexes view created');

    // View: Lock monitoring
    await client.query(`
      CREATE OR REPLACE VIEW lock_monitoring AS
      SELECT 
        pg_stat_activity.pid,
        pg_stat_activity.usename,
        pg_stat_activity.application_name,
        pg_stat_activity.client_addr,
        pg_stat_activity.state,
        pg_stat_activity.query,
        pg_locks.locktype,
        pg_locks.mode,
        pg_locks.granted
      FROM pg_stat_activity
      JOIN pg_locks ON pg_stat_activity.pid = pg_locks.pid
      WHERE pg_stat_activity.state != 'idle'
      ORDER BY pg_stat_activity.query_start;
    `);
    console.log('  ✓ lock_monitoring view created');

    // View: Blocking queries
    await client.query(`
      CREATE OR REPLACE VIEW blocking_queries AS
      SELECT 
        blocked_locks.pid AS blocked_pid,
        blocked_activity.usename AS blocked_user,
        blocking_locks.pid AS blocking_pid,
        blocking_activity.usename AS blocking_user,
        blocked_activity.query AS blocked_statement,
        blocking_activity.query AS blocking_statement,
        blocked_activity.application_name AS blocked_application
      FROM pg_catalog.pg_locks blocked_locks
      JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
      JOIN pg_catalog.pg_locks blocking_locks 
        ON blocking_locks.locktype = blocked_locks.locktype
        AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
        AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
        AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
        AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
        AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
        AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
        AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
        AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
        AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
        AND blocking_locks.pid != blocked_locks.pid
      JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
      WHERE NOT blocked_locks.granted;
    `);
    console.log('  ✓ blocking_queries view created');

    // Configure PostgreSQL settings for better monitoring
    console.log('  Configuring PostgreSQL settings...');
    
    // Note: These settings require superuser privileges and server restart
    console.log('  ⚠ Note: The following settings should be added to postgresql.conf:');
    console.log('    shared_preload_libraries = \'pg_stat_statements\'');
    console.log('    pg_stat_statements.track = all');
    console.log('    pg_stat_statements.max = 10000');
    console.log('    track_io_timing = on');
    console.log('    track_functions = all');
    console.log('    log_min_duration_statement = 1000  # Log queries slower than 1 second');
    console.log('    log_line_prefix = \'%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h \'');
    console.log('    log_checkpoints = on');
    console.log('    log_connections = on');
    console.log('    log_disconnections = on');
    console.log('    log_lock_waits = on');
    console.log('    log_temp_files = 0');

    console.log(`\n✓ Monitoring setup completed for ${dbName}`);
  } catch (error) {
    console.error(`\n✗ Error setting up monitoring for ${dbName}:`, error.message);
    throw error;
  } finally {
    await client.end();
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('='.repeat(60));
  console.log('PostgreSQL Monitoring Setup');
  console.log('='.repeat(60));

  for (const db of databases) {
    try {
      await setupMonitoring(db.name, db.url);
    } catch (error) {
      console.error(`Failed to set up monitoring for ${db.name}`);
      // Continue with other databases
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Setup Complete');
  console.log('='.repeat(60));
  console.log('\nMonitoring views created:');
  console.log('  - slow_queries: Queries with mean execution time > 1 second');
  console.log('  - frequent_queries: Most frequently executed queries');
  console.log('  - connection_stats: Database connection statistics');
  console.log('  - table_stats: Table access statistics');
  console.log('  - index_usage: Index usage statistics');
  console.log('  - unused_indexes: Indexes that are never used');
  console.log('  - lock_monitoring: Current lock information');
  console.log('  - blocking_queries: Queries that are blocking others');
  console.log('\nQuery examples:');
  console.log('  SELECT * FROM slow_queries;');
  console.log('  SELECT * FROM frequent_queries;');
  console.log('  SELECT * FROM connection_stats;');
  console.log('  SELECT * FROM unused_indexes;');
  console.log('\nAPI endpoints available:');
  console.log('  GET  /api/monitoring/health');
  console.log('  GET  /api/monitoring/metrics');
  console.log('  GET  /api/monitoring/slow-queries');
  console.log('  GET  /api/monitoring/connection-pools');
  console.log('  GET  /api/monitoring/query-stats');
  console.log('  POST /api/monitoring/reset-metrics');
}

// Run if called directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('\n✗ Setup failed:', error);
      process.exit(1);
    });
}

module.exports = { setupMonitoring };
