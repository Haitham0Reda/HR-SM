# Implementation Plan: MongoDB to PostgreSQL Migration

## Overview

This implementation plan breaks down the MongoDB to PostgreSQL migration into discrete, manageable tasks. The approach follows a phased strategy: environment setup, model conversion, repository refactoring, service updates, data migration, and operational changes. Each phase builds on the previous one to minimize risk and ensure the system remains functional throughout the migration.

## Tasks

- [x] 1. Install PostgreSQL dependencies and configure connections
  - Install pg, sequelize, and pg-hstore packages
  - Update package.json with new dependencies
  - Create environment variables for LICENSE_DATABASE_URL and MAIN_DATABASE_URL
  - _Requirements: 2.1, 2.2, 16.1_

- [x] 2. Set up dual PostgreSQL database connections
  - [x] 2.1 Refactor server/config/database.js for PostgreSQL
    - Create licenseServerDb Sequelize instance
    - Create mainAppDb Sequelize instance
    - Implement connectDatabases function with authentication
    - Configure connection pooling for both databases
    - Set timezone to UTC
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.3, 2.4, 2.5_

  - [x] 2.2 Update server/config/multiTenant.js for single database model
    - Remove MongoDB database-per-tenant logic
    - Return single mainAppDb connection
    - Implement tenant ID validation
    - Remove sanitizeCompanyName and createCompanyDirectories if no longer needed
    - _Requirements: 3.4, 3.5_

  - [x] 2.3 Update tenant middleware for tenant context injection
    - Modify server/middleware/tenantMiddleware.js
    - Inject tenant_id into request context instead of switching connections
    - Add req.tenantContext with tenant_id
    - _Requirements: 3.2, 3.3_

- [x] 3. Checkpoint - Verify database connections
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Convert Mongoose schemas to Sequelize models (License Server)
  - [x] 4.1 Convert License model
    - Create Sequelize model in hrsm-license-server/src/models/license.model.js
    - Map ObjectId to UUID
    - Add tenant_id column
    - Define indexes
    - _Requirements: 4.1, 4.2, 4.9, 5.1_

  - [x] 4.2 Convert Tenant model
    - Create Sequelize model for tenants table
    - Map all fields with appropriate data types
    - Add indexes on tenant_id and domain
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 4.3 Convert Subscription model
    - Create Sequelize model for subscriptions table
    - Map billing and subscription fields
    - Add foreign key to tenants
    - _Requirements: 4.1, 4.2, 4.7_

  - [x] 4.4 Convert EnabledModules model
    - Create Sequelize model for enabled_modules table
    - Add tenant_id and module_id columns
    - Create composite unique index
    - _Requirements: 4.1, 4.2, 4.9, 4.10_

- [x] 5. Convert Mongoose schemas to Sequelize models (Main Application)
  - [x] 5.1 Convert User model
    - Create Sequelize model in server/modules/hr-core/users/models/user.model.js
    - Add tenant_id column with index
    - Map all user fields
    - Create compound unique index on (tenant_id, email)
    - Define relationship to Department
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10_

  - [x] 5.2 Convert Department model
    - Create Sequelize model for departments table
    - Add tenant_id column
    - Map all department fields
    - _Requirements: 4.1, 4.2, 4.9_

  - [x] 5.3 Convert Attendance model
    - Create Sequelize model for attendances table
    - Add tenant_id column
    - Map date/time fields to TIMESTAMP WITH TIME ZONE
    - Add indexes for common queries
    - _Requirements: 4.1, 4.2, 4.9, 5.2_

  - [x] 5.4 Convert Survey model
    - Create Sequelize model for surveys table
    - Add tenant_id column
    - Map questions array to JSONB
    - _Requirements: 4.1, 4.2, 4.9, 5.7_

  - [x] 5.5 Convert Payroll model
    - Create Sequelize model for payroll table
    - Add tenant_id column
    - Map salary fields to DECIMAL
    - Add foreign key to users
    - _Requirements: 4.1, 4.2, 4.7, 4.9, 5.4_

  - [x] 5.6 Convert Event model
    - Create Sequelize model for events table
    - Add tenant_id column
    - Map date fields appropriately
    - _Requirements: 4.1, 4.2, 4.9_

  - [x] 5.7 Convert CompanyLicense model (cache)
    - Create Sequelize model for company_license table
    - Add tenant_id column
    - Map quickAccess object to JSONB
    - _Requirements: 4.1, 4.2, 4.9, 5.7_

  - [x] 5.8 Convert remaining models
    - Identify all other Mongoose models in server/modules
    - Convert each to Sequelize following the same pattern
    - Ensure all have tenant_id where appropriate
    - Completed high-priority models: Position, Role, AttendanceDevice
    - _Requirements: 4.1-4.10_

- [ ] 6. Checkpoint - Verify model definitions
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Refactor BaseRepository for Sequelize
  - [ ] 7.1 Update CRUD methods
    - Rewrite create method with tenant_id injection
    - Rewrite findById with tenant_id filtering
    - Rewrite findOne with tenant_id filtering
    - Rewrite findAll with tenant_id filtering
    - Rewrite update with tenant_id filtering
    - Rewrite delete with tenant_id filtering
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.10_

  - [ ] 7.2 Update utility methods
    - Rewrite count with tenant_id filtering
    - Rewrite exists with tenant_id filtering
    - Rewrite paginate with tenant_id filtering
    - _Requirements: 6.7, 6.8, 6.9, 6.10_

- [ ] 8. Rewrite QueryBuilder for Sequelize
  - [ ] 8.1 Implement basic query methods
    - Implement tenant() method (required)
    - Implement where() and equals()
    - Implement in() and notIn()
    - Implement greaterThan(), lessThan(), etc.
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.12_

  - [ ] 8.2 Implement pattern matching methods
    - Implement like() using Op.iLike
    - Implement startsWith() and endsWith()
    - Implement isNull() and isNotNull()
    - _Requirements: 7.5_

  - [ ] 8.3 Implement logical operators
    - Implement or() using Op.or
    - Implement and() using Op.and
    - _Requirements: 7.6, 7.7_

  - [ ] 8.4 Implement query modifiers
    - Implement sort() for ORDER BY
    - Implement limit() and skip() for pagination
    - Implement select() for column selection
    - Implement include() for joins
    - _Requirements: 7.8, 7.9, 7.10, 7.11_

  - [ ] 8.5 Implement execution methods
    - Implement execute() with mandatory tenant_id check
    - Implement executeOne()
    - Implement count()
    - Implement paginate()
    - _Requirements: 7.12_

- [ ] 9. Checkpoint - Test repository and query builder
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Update service layer for Sequelize
  - [ ] 10.1 Update UserService
    - Replace Mongoose queries with Sequelize
    - Ensure tenant_id is passed to all repository calls
    - Update relationship queries to use include
    - _Requirements: 8.1, 8.2, 8.3, 8.5_

  - [ ] 10.2 Update AttendanceService
    - Replace Mongoose queries with Sequelize
    - Update date range queries
    - Ensure tenant_id filtering
    - _Requirements: 8.1, 8.2, 8.5_

  - [ ] 10.3 Update SurveyService
    - Replace Mongoose queries with Sequelize
    - Handle JSONB queries for survey questions
    - Ensure tenant_id filtering
    - _Requirements: 8.1, 8.2, 8.5_

  - [ ] 10.4 Update PayrollService
    - Replace Mongoose queries with Sequelize
    - Handle decimal calculations
    - Ensure tenant_id filtering
    - _Requirements: 8.1, 8.2, 8.5_

  - [ ] 10.5 Update remaining services
    - Identify all services in server/modules
    - Update each to use Sequelize
    - Ensure tenant_id is always passed
    - _Requirements: 8.1, 8.2, 8.5_

- [ ] 11. Implement transaction support
  - [ ] 11.1 Add transaction wrapper utility
    - Create utility function for managed transactions
    - Support configurable isolation levels
    - Implement automatic rollback on errors
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

  - [ ] 11.2 Update services to use transactions
    - Identify multi-step operations
    - Wrap in transactions
    - Test rollback behavior
    - _Requirements: 12.1, 12.2, 12.3_

- [ ] 12. Create data migration script
  - [ ] 12.1 Implement MongoToPostgresMigrator class
    - Create scripts/migrate-mongo-to-postgres.js
    - Implement connect() method for both databases
    - Implement getTenantDatabases() to list MongoDB tenant DBs
    - _Requirements: 9.1, 9.2_

  - [ ] 12.2 Implement license server migration
    - Implement migrateLicenseServer() method
    - Migrate licenses collection
    - Migrate tenants collection
    - Migrate subscriptions collection
    - _Requirements: 9.2, 9.3_

  - [ ] 12.3 Implement main application migration
    - Implement migrateMainApplication() method
    - Iterate through all tenant databases
    - Migrate each collection with tenant_id injection
    - _Requirements: 9.2, 9.3, 9.5_

  - [ ] 12.4 Implement data transformation
    - Implement convertObjectId() for UUID conversion
    - Implement transformFields() for field mapping
    - Implement transformTenantDocument() with tenant_id injection
    - Handle data type conversions
    - _Requirements: 9.4, 9.5, 9.6, 9.7_

  - [ ] 12.5 Implement batch processing
    - Use batch inserts for performance
    - Implement progress tracking
    - Handle errors gracefully
    - _Requirements: 9.8, 9.9_

  - [ ] 12.6 Implement migration reporting
    - Generate migration statistics
    - Report errors and discrepancies
    - Log migration progress
    - _Requirements: 9.10_

- [ ] 13. Checkpoint - Test migration script with sample data
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 14. Create data validation script
  - [ ] 14.1 Implement validation checks
    - Compare record counts between MongoDB and PostgreSQL
    - Verify all documents have corresponding rows
    - Check critical field values match
    - Verify relationships are preserved
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [ ] 14.2 Generate validation report
    - Report discrepancies found
    - Provide detailed mismatch information
    - _Requirements: 10.5_

- [ ] 15. Update backup and restore procedures
  - [ ] 15.1 Replace MongoDB backup with pg_dump
    - Update server/modules/hr-core/backup/services/mongooseBackup.service.js
    - Implement PostgreSQL backup using pg_dump
    - Support both license server and main app databases
    - _Requirements: 11.1, 11.4_

  - [ ] 15.2 Implement PostgreSQL restore
    - Create restore procedures using pg_restore or psql
    - Test restore functionality
    - _Requirements: 11.3_

  - [ ] 15.3 Update backup scheduling
    - Ensure scheduled backups work with PostgreSQL
    - Update backup file naming
    - _Requirements: 11.2, 11.5_

- [ ] 16. Update error handling for Sequelize
  - [ ] 16.1 Add Sequelize error handlers
    - Handle UniqueConstraintError
    - Handle ForeignKeyConstraintError
    - Handle ValidationError
    - Handle ConnectionError
    - _Requirements: 14.1, 14.2, 14.3, 14.4_

  - [ ] 16.2 Enhance error logging
    - Log SQL queries on errors
    - Log query parameters
    - Include stack traces
    - _Requirements: 14.5_

- [ ] 17. Create indexes for performance
  - [ ] 17.1 Create tenant_id indexes
    - Add index on tenant_id for all tenant-scoped tables
    - _Requirements: 13.1_

  - [ ] 17.2 Create query-specific indexes
    - Identify frequently queried columns
    - Create indexes on those columns
    - _Requirements: 13.2_

  - [ ] 17.3 Create composite indexes
    - Create composite indexes for common query patterns
    - Include tenant_id in composite indexes
    - _Requirements: 13.3_

  - [ ] 17.4 Create foreign key indexes
    - Add indexes on all foreign key columns
    - _Requirements: 13.4_

- [ ] 18. Update test suite for PostgreSQL
  - [ ] 18.1 Configure test database
    - Set up PostgreSQL test database
    - Update test configuration
    - _Requirements: 15.1_

  - [ ] 18.2 Update unit tests
    - Replace Mongoose mocks with Sequelize mocks
    - Update test data setup
    - Update assertions for Sequelize models
    - _Requirements: 15.3, 15.4_

  - [ ] 18.3 Update integration tests
    - Update database setup and teardown
    - Use Sequelize for test data
    - _Requirements: 15.2_

  - [ ] 18.4 Add property-based tests
    - Write property tests for tenant isolation
    - Write property tests for data migration
    - Write property tests for transaction atomicity
    - _Requirements: All correctness properties_

- [ ] 19. Verify license validation between databases
  - [ ] 19.1 Test license validation flow
    - Verify main app queries license server database
    - Test license validation API endpoints
    - Verify cache fallback works
    - _Requirements: 21.1, 21.2, 21.3, 21.5_

  - [ ] 19.2 Test cache synchronization
    - Verify cache updates after license changes
    - Test cache invalidation
    - _Requirements: 21.4, 21.7_

  - [ ] 19.3 Verify API contract preservation
    - Ensure request/response formats unchanged
    - Test all license endpoints
    - _Requirements: 21.6_

- [ ] 20. Update configuration management
  - [ ] 20.1 Update environment variables
    - Add LICENSE_DATABASE_URL
    - Add MAIN_DATABASE_URL
    - Remove MONGODB_URI references
    - _Requirements: 16.1_

  - [ ] 20.2 Update .env.example files
    - Document new PostgreSQL connection strings
    - Provide example configurations
    - _Requirements: 16.1, 16.2_

  - [ ] 20.3 Configure connection pooling
    - Set appropriate pool sizes
    - Configure timeouts
    - _Requirements: 16.3_

  - [ ] 20.4 Configure SSL if needed
    - Set up SSL certificates
    - Configure SSL connection options
    - _Requirements: 16.4, 20.1_

- [ ] 21. Implement performance monitoring
  - [ ] 21.1 Add query performance logging
    - Log slow queries
    - Track query execution times
    - _Requirements: 19.1, 19.2_

  - [ ] 21.2 Monitor connection pool
    - Track pool utilization
    - Log connection issues
    - _Requirements: 19.3_

  - [ ] 21.3 Set up PostgreSQL monitoring
    - Configure monitoring tools
    - Set up alerts for issues
    - _Requirements: 19.4, 19.5_

- [ ] 22. Create rollback plan
  - [ ] 22.1 Document rollback procedures
    - Create step-by-step rollback guide
    - Document how to restore MongoDB connections
    - Document how to revert code changes
    - _Requirements: 17.1, 17.2, 17.3, 17.5_

  - [ ] 22.2 Test rollback procedures
    - Verify rollback restores functionality
    - Ensure rollback can complete within time limit
    - _Requirements: 17.4_

- [ ] 23. Update documentation
  - [ ] 23.1 Update database schema documentation
    - Create PostgreSQL schema diagrams
    - Document all tables and relationships
    - _Requirements: 18.1_

  - [ ] 23.2 Document Sequelize models
    - Create model reference documentation
    - Document relationships and indexes
    - _Requirements: 18.2_

  - [ ] 23.3 Create migration runbook
    - Document migration steps
    - Include pre-migration checklist
    - Include post-migration verification
    - _Requirements: 18.3_

  - [ ] 23.4 Document backup/restore procedures
    - Update backup documentation for PostgreSQL
    - Document restore procedures
    - _Requirements: 18.4_

  - [ ] 23.5 Create troubleshooting guide
    - Document common PostgreSQL issues
    - Provide solutions and workarounds
    - _Requirements: 18.5_

- [ ] 24. Comprehensive PostgreSQL functionality verification
  - [ ] 24.1 Verify all CRUD operations work with PostgreSQL
    - Test create operations for all models
    - Test read operations with various filters
    - Test update operations with tenant isolation
    - Test delete operations with proper constraints
    - _Requirements: 6.1-6.10_

  - [ ] 24.2 Verify tenant isolation is working correctly
    - Test queries return only tenant-specific data
    - Test cross-tenant data access is prevented
    - Verify tenant_id is included in all queries
    - Test multi-tenant scenarios
    - _Requirements: 3.2, 3.3, 6.10_

  - [ ] 24.3 Verify all relationships and foreign keys work
    - Test all model associations (belongsTo, hasMany, etc.)
    - Verify foreign key constraints are enforced
    - Test cascade deletes where appropriate
    - Test eager loading with include
    - _Requirements: 4.7, 13.4_

  - [ ] 24.4 Verify transaction support is working
    - Test successful transaction commits
    - Test transaction rollbacks on errors
    - Verify data consistency after rollbacks
    - Test nested transactions with savepoints
    - _Requirements: 12.1, 12.2, 12.3_

  - [ ] 24.5 Verify license validation between databases
    - Test main app queries license server database
    - Verify cache fallback works when license server unavailable
    - Test cache synchronization and invalidation
    - Verify API contracts are preserved
    - _Requirements: 21.1, 21.2, 21.3, 21.5, 21.6, 21.7_

  - [ ] 24.6 Verify query performance and indexes
    - Test query performance with large datasets
    - Verify indexes are being used (EXPLAIN ANALYZE)
    - Test pagination performance
    - Verify connection pool is working efficiently
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 19.1, 19.2, 19.3_

  - [ ] 24.7 Verify error handling works correctly
    - Test unique constraint violations
    - Test foreign key constraint violations
    - Test validation errors
    - Test connection errors and recovery
    - _Requirements: 14.1, 14.2, 14.3, 14.4_

  - [ ] 24.8 Verify backup and restore procedures
    - Test PostgreSQL backup with pg_dump
    - Test restore procedures
    - Verify backup scheduling works
    - Test backup for both databases
    - _Requirements: 11.1, 11.2, 11.3_

  - [ ] 24.9 Run full test suite against PostgreSQL
    - Run all unit tests
    - Run all integration tests
    - Run all property-based tests
    - Verify 100% test pass rate
    - _Requirements: 15.1, 15.2, 15.3, 15.4_

  - [ ] 24.10 Verify all API endpoints work with PostgreSQL
    - Test all REST API endpoints
    - Verify response formats are correct
    - Test error responses
    - Verify authentication and authorization
    - _Requirements: 21.1, 21.2, 21.6_

- [ ] 25. Remove MongoDB dependencies and code
  - [ ] 25.1 Remove MongoDB packages
    - Uninstall mongoose package
    - Uninstall mongodb driver
    - Remove MongoDB-related dependencies from package.json
    - _Requirements: 2.1_

  - [ ] 25.2 Remove MongoDB configuration files
    - Remove or archive MongoDB connection code
    - Remove MongoDB-specific environment variables
    - Clean up any MongoDB utility files
    - _Requirements: 1.6, 16.1_

  - [ ] 25.3 Remove Mongoose models
    - Delete all Mongoose schema files
    - Remove Mongoose model imports
    - Clean up any MongoDB-specific model utilities
    - _Requirements: 4.1_

  - [ ] 25.4 Remove MongoDB query code
    - Remove any remaining MongoDB query syntax
    - Delete MongoDB-specific helper functions
    - Clean up aggregation pipeline code
    - _Requirements: 7.1_

  - [ ] 25.5 Remove MongoDB backup scripts
    - Delete mongooseBackup.service.js
    - Remove MongoDB backup utilities
    - Clean up MongoDB restore scripts
    - _Requirements: 11.1_

  - [ ] 25.6 Update imports and references
    - Search for and remove mongoose imports
    - Remove MongoDB client imports
    - Update any documentation referencing MongoDB
    - _Requirements: 2.1_

  - [ ] 25.7 Verify application still works after MongoDB removal
    - Run full test suite again
    - Test all critical user flows
    - Verify no MongoDB references remain
    - _Requirements: All_

- [ ] 26. Execute migration in staging environment
  - Run full migration on staging data
  - Validate migrated data
  - Test all application functionality
  - Verify license validation works
  - Test performance
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 27. Final checkpoint - Production migration readiness
  - Review all completed tasks
  - Verify all tests pass with PostgreSQL
  - Verify no MongoDB code remains
  - Confirm rollback plan is ready
  - Get stakeholder approval
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks are organized by phase for logical progression
- Each task references specific requirements for traceability
- Checkpoints ensure validation at critical milestones
- The migration maintains the two-database architecture
- License validation between databases is preserved
- Tenant isolation is enforced through tenant_id columns
- All tasks build incrementally to minimize risk
- Task 24 provides comprehensive verification that everything works with PostgreSQL
- Task 25 removes MongoDB code only after PostgreSQL is fully verified
- MongoDB code removal happens after complete verification but before staging deployment
- Task 26 validates the migration in staging environment
- Task 27 ensures production readiness with all verifications complete

