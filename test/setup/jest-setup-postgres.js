/**
 * Jest Setup for PostgreSQL Tests
 * 
 * Runs before each test file
 */

const {
  initializeTestDatabases,
  syncModels,
  cleanAllTables,
  closeDatabases
} = require('./postgres-test-config');

// Global test timeout
jest.setTimeout(30000);

// Setup before all tests in a file
beforeAll(async () => {
  // Initialize databases
  await initializeTestDatabases();
  
  // Sync models (create tables)
  await syncModels(false); // Don't force drop
});

// Cleanup before each test
beforeEach(async () => {
  // Clean all tables before each test for isolation
  await cleanAllTables();
});

// Cleanup after all tests in a file
afterAll(async () => {
  // Close database connections
  await closeDatabases();
});

// Global error handler
process.on('unhandledRejection', (error) => {
  console.error('Unhandled Promise Rejection:', error);
});
