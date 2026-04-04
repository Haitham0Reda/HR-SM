# Requirements Document

## Introduction

This document specifies the requirements for migrating the HR-SM (Human Resources Management System) from MongoDB to PostgreSQL. The migration involves converting all data persistence, retrieval, and management operations from a document-oriented database model to a relational database model while preserving the multi-tenancy architecture and the two-database architecture (license server database and main application database). The current system uses MongoDB with Mongoose ODM and a custom QueryBuilder for data operations. The target system will use PostgreSQL with Sequelize ORM, maintaining tenant isolation through a `tenant_id` column rather than separate databases per tenant.

Both the license server database (hrsm-licenses) and the main application database (hrsm_platform) will be migrated to PostgreSQL, and the license validation communication between them will be preserved.

## Glossary

- **HR-SM**: Human Resources Management System - the application being migrated
- **MongoDB**: Current document-oriented NoSQL database system
- **PostgreSQL**: Target relational database management system (RDBMS)
- **Mongoose**: Current Object Document Mapper (ODM) for MongoDB
- **Sequelize**: Target Object-Relational Mapper (ORM) for PostgreSQL
- **Multi_Tenancy**: Architecture pattern where multiple tenants (companies) share the same application instance
- **Tenant**: A company or organization using the HR-SM system
- **Tenant_ID**: Column used to isolate tenant data in PostgreSQL tables
- **Schema_Migration**: Process of converting MongoDB schemas to PostgreSQL table definitions
- **Data_Migration**: Process of transferring existing data from MongoDB to PostgreSQL
- **BaseRepository**: Abstract repository class providing CRUD operations
- **QueryBuilder**: Custom query abstraction layer for MongoDB operations
- **ORM_Model**: Sequelize model definition representing a database table
- **License_Server_Database**: PostgreSQL database (hrsm-licenses) that stores license information and validates tenant licenses
- **Main_Application_Database**: PostgreSQL database (hrsm_platform) that stores HR business data for all tenants
- **License_Validation**: Process where the main application queries the license server database to verify tenant licenses and enabled modules

## Requirements

### Requirement 1: PostgreSQL Database Setup

**User Story:** As a database administrator, I want PostgreSQL installed and configured with two separate databases, so that the license server and main application maintain their architectural separation.

#### Acceptance Criteria

1. WHEN PostgreSQL is installed, THE System SHALL use PostgreSQL version 14 or higher
2. WHEN databases are created, THE System SHALL create two separate PostgreSQL databases: hrsm-licenses and hrsm_platform
3. WHEN the license server database is created, THE System SHALL store license information, tenant metadata, and validation records
4. WHEN the main application database is created, THE System SHALL store HR business data for all tenants
5. WHEN database connections are configured, THE System SHALL use separate connection pools for each database
6. WHEN environment variables are set, THE System SHALL use LICENSE_DATABASE_URL for license server and MAIN_DATABASE_URL for main application
7. WHEN the application starts, THE System SHALL verify connectivity to both PostgreSQL databases before accepting requests

### Requirement 2: ORM Installation and Configuration

**User Story:** As a backend developer, I want Sequelize ORM installed, so that the application can interact with PostgreSQL using an ORM pattern.

#### Acceptance Criteria

1. WHEN dependencies are installed, THE System SHALL include the pg PostgreSQL driver
2. WHEN dependencies are installed, THE System SHALL include Sequelize ORM version 6 or higher
3. WHEN the ORM is configured, THE System SHALL establish connection to PostgreSQL
4. WHEN the ORM initializes, THE System SHALL support transaction management
5. WHEN the ORM is configured, THE System SHALL use UTC timezone for all timestamp operations

### Requirement 3: Multi-Tenancy Architecture Adaptation

**User Story:** As a system architect, I want tenant isolation using a tenant_id column, so that all tenant data resides in a single PostgreSQL database with proper isolation.

#### Acceptance Criteria

1. WHEN tables are created, THE System SHALL include a tenant_id column in all tenant-scoped tables
2. WHEN queries are executed, THE System SHALL automatically filter by tenant_id for tenant-scoped data
3. WHEN data is inserted, THE System SHALL automatically include tenant_id for tenant-scoped records
4. WHEN the multi-tenant configuration is updated, THE System SHALL remove MongoDB database-per-tenant logic
5. WHEN connections are managed, THE System SHALL use a single PostgreSQL connection pool for all tenants

### Requirement 4: Mongoose Schema to Sequelize Model Conversion

**User Story:** As a backend developer, I want all Mongoose schemas converted to Sequelize models, so that the application can define database tables using the ORM.

#### Acceptance Criteria

1. WHEN a Mongoose schema exists, THE System SHALL create an equivalent Sequelize model definition
2. WHEN defining models, THE System SHALL map MongoDB data types to appropriate PostgreSQL data types
3. WHEN defining models, THE System SHALL convert Mongoose enum fields to PostgreSQL enum types or check constraints
4. WHEN defining models, THE System SHALL convert Mongoose default values to PostgreSQL default constraints
5. WHEN defining models, THE System SHALL convert Mongoose required fields to PostgreSQL NOT NULL constraints
6. WHEN defining models, THE System SHALL convert Mongoose unique constraints to PostgreSQL unique indexes
7. WHEN defining models, THE System SHALL convert Mongoose ref relationships to PostgreSQL foreign key constraints
8. WHEN defining models, THE System SHALL convert Mongoose timestamps to PostgreSQL createdAt and updatedAt columns
9. WHEN defining models, THE System SHALL add tenant_id column with appropriate index to all tenant-scoped models
10. WHEN compound indexes exist in Mongoose, THE System SHALL create equivalent composite indexes in PostgreSQL

### Requirement 5: Data Type Mapping

**User Story:** As a data engineer, I want MongoDB data types correctly mapped to PostgreSQL types, so that data integrity is maintained during migration.

#### Acceptance Criteria

1. WHEN mapping ObjectId fields, THE System SHALL use UUID or BIGINT type in PostgreSQL
2. WHEN mapping Date fields, THE System SHALL use TIMESTAMP WITH TIME ZONE in PostgreSQL
3. WHEN mapping String fields, THE System SHALL use VARCHAR or TEXT in PostgreSQL based on length requirements
4. WHEN mapping Number fields, THE System SHALL use INTEGER, BIGINT, or DECIMAL in PostgreSQL based on value range
5. WHEN mapping Boolean fields, THE System SHALL use BOOLEAN in PostgreSQL
6. WHEN mapping Array fields, THE System SHALL use ARRAY type or JSONB in PostgreSQL
7. WHEN mapping Mixed/Object fields, THE System SHALL use JSONB in PostgreSQL
8. WHEN mapping embedded documents, THE System SHALL use JSONB or normalize to separate tables based on query patterns

### Requirement 6: BaseRepository Refactoring

**User Story:** As a backend developer, I want the BaseRepository updated for Sequelize, so that CRUD operations work with PostgreSQL.

#### Acceptance Criteria

1. WHEN create operations are called, THE BaseRepository SHALL use Sequelize create method with tenant_id filtering
2. WHEN findById operations are called, THE BaseRepository SHALL use Sequelize findByPk with tenant_id filtering
3. WHEN findOne operations are called, THE BaseRepository SHALL use Sequelize findOne with tenant_id filtering
4. WHEN find operations are called, THE BaseRepository SHALL use Sequelize findAll with tenant_id filtering
5. WHEN update operations are called, THE BaseRepository SHALL use Sequelize update with tenant_id filtering
6. WHEN delete operations are called, THE BaseRepository SHALL use Sequelize destroy with tenant_id filtering
7. WHEN count operations are called, THE BaseRepository SHALL use Sequelize count with tenant_id filtering
8. WHEN exists operations are called, THE BaseRepository SHALL use Sequelize findOne with tenant_id filtering
9. WHEN paginate operations are called, THE BaseRepository SHALL use Sequelize limit and offset with tenant_id filtering
10. WHEN any repository method is called, THE System SHALL ensure tenant_id is included in WHERE clauses

### Requirement 7: QueryBuilder Replacement

**User Story:** As a backend developer, I want the QueryBuilder replaced with SQL-compatible query building, so that complex queries work with PostgreSQL.

#### Acceptance Criteria

1. WHEN where clauses are built, THE QueryBuilder SHALL generate SQL WHERE conditions instead of MongoDB query objects
2. WHEN equality comparisons are used, THE QueryBuilder SHALL generate SQL = operator
3. WHEN in clauses are used, THE QueryBuilder SHALL generate SQL IN operator
4. WHEN range comparisons are used, THE QueryBuilder SHALL generate SQL >, <, >=, <= operators
5. WHEN regex patterns are used, THE QueryBuilder SHALL generate SQL LIKE or ILIKE operators
6. WHEN OR conditions are used, THE QueryBuilder SHALL generate SQL OR clauses
7. WHEN AND conditions are used, THE QueryBuilder SHALL generate SQL AND clauses
8. WHEN sorting is specified, THE QueryBuilder SHALL generate SQL ORDER BY clauses
9. WHEN pagination is specified, THE QueryBuilder SHALL generate SQL LIMIT and OFFSET clauses
10. WHEN field selection is specified, THE QueryBuilder SHALL generate SQL SELECT with specific columns
11. WHEN joins are needed, THE QueryBuilder SHALL generate SQL JOIN clauses for relationships
12. WHEN tenant filtering is needed, THE QueryBuilder SHALL automatically include tenant_id in WHERE clauses

### Requirement 8: Service Layer Updates

**User Story:** As a backend developer, I want service layer code updated for Sequelize, so that business logic works with the new ORM.

#### Acceptance Criteria

1. WHEN services call repository methods, THE System SHALL use Sequelize-compatible method signatures
2. WHEN services perform transactions, THE System SHALL use Sequelize transaction API
3. WHEN services query relationships, THE System SHALL use Sequelize include option for eager loading
4. WHEN services handle errors, THE System SHALL catch and process Sequelize-specific errors
5. WHEN services pass tenant context, THE System SHALL ensure tenant_id is provided to all repository calls

### Requirement 9: Data Migration Script

**User Story:** As a database administrator, I want an automated data migration script, so that existing MongoDB data can be transferred to PostgreSQL without data loss.

#### Acceptance Criteria

1. WHEN the migration script runs, THE System SHALL connect to both MongoDB and PostgreSQL databases
2. WHEN migrating collections, THE System SHALL iterate through each MongoDB collection
3. WHEN migrating documents, THE System SHALL map MongoDB documents to PostgreSQL table rows
4. WHEN migrating data, THE System SHALL convert MongoDB ObjectIds to PostgreSQL UUIDs or integers
5. WHEN migrating data, THE System SHALL embed tenant_id in all tenant-scoped records
6. WHEN migrating data, THE System SHALL handle data type conversions according to the mapping rules
7. WHEN migrating data, THE System SHALL preserve all field values and relationships
8. WHEN migrating data, THE System SHALL use batch inserts for performance
9. WHEN migration encounters errors, THE System SHALL log detailed error information and continue with remaining data
10. WHEN migration completes, THE System SHALL generate a report showing records migrated per collection

### Requirement 10: Data Migration Validation

**User Story:** As a quality assurance engineer, I want automated validation of migrated data, so that I can verify migration accuracy.

#### Acceptance Criteria

1. WHEN migration completes, THE System SHALL compare record counts between MongoDB and PostgreSQL
2. WHEN validating data, THE System SHALL verify that all MongoDB documents have corresponding PostgreSQL rows
3. WHEN validating data, THE System SHALL check that critical fields match between source and destination
4. WHEN validating data, THE System SHALL verify that relationships are preserved
5. WHEN validation finds discrepancies, THE System SHALL generate a detailed report of mismatches

### Requirement 11: Backup and Restore Adaptation

**User Story:** As a system administrator, I want backup and restore procedures updated for PostgreSQL, so that data protection continues to work.

#### Acceptance Criteria

1. WHEN backups are created, THE System SHALL use pg_dump command for PostgreSQL backups
2. WHEN backups are scheduled, THE System SHALL support automated backup scheduling
3. WHEN restores are performed, THE System SHALL use pg_restore or psql command
4. WHEN backup scripts run, THE System SHALL remove MongoDB-specific backup logic
5. WHEN backup files are created, THE System SHALL include timestamp and tenant information in filenames

### Requirement 12: Transaction Management

**User Story:** As a backend developer, I want proper transaction support, so that multi-step operations maintain data consistency.

#### Acceptance Criteria

1. WHEN transactions are started, THE System SHALL use Sequelize managed transactions
2. WHEN operations within a transaction succeed, THE System SHALL commit the transaction
3. WHEN operations within a transaction fail, THE System SHALL rollback the transaction
4. WHEN nested transactions are needed, THE System SHALL use Sequelize savepoints
5. WHEN transaction isolation is required, THE System SHALL support configurable isolation levels

### Requirement 13: Index and Performance Optimization

**User Story:** As a database administrator, I want appropriate indexes created, so that query performance is optimized.

#### Acceptance Criteria

1. WHEN tables are created, THE System SHALL create indexes on tenant_id columns
2. WHEN tables are created, THE System SHALL create indexes on frequently queried columns
3. WHEN compound queries are common, THE System SHALL create composite indexes
4. WHEN foreign keys are defined, THE System SHALL create indexes on foreign key columns
5. WHEN full-text search is needed, THE System SHALL create GIN or GiST indexes on text columns

### Requirement 14: Error Handling and Logging

**User Story:** As a backend developer, I want PostgreSQL-specific error handling, so that errors are properly caught and logged.

#### Acceptance Criteria

1. WHEN unique constraint violations occur, THE System SHALL catch and handle Sequelize UniqueConstraintError
2. WHEN foreign key violations occur, THE System SHALL catch and handle Sequelize ForeignKeyConstraintError
3. WHEN validation errors occur, THE System SHALL catch and handle Sequelize ValidationError
4. WHEN connection errors occur, THE System SHALL catch and handle Sequelize ConnectionError
5. WHEN errors are logged, THE System SHALL include SQL query and parameters for debugging

### Requirement 15: Testing Updates

**User Story:** As a quality assurance engineer, I want tests updated for PostgreSQL, so that the test suite validates the new database implementation.

#### Acceptance Criteria

1. WHEN unit tests run, THE System SHALL use an in-memory PostgreSQL database or test database
2. WHEN integration tests run, THE System SHALL set up and tear down test data in PostgreSQL
3. WHEN tests check database state, THE System SHALL use Sequelize queries instead of MongoDB queries
4. WHEN tests mock database operations, THE System SHALL mock Sequelize methods instead of Mongoose methods
5. WHEN test data is seeded, THE System SHALL use Sequelize seeders or raw SQL inserts

### Requirement 16: Configuration Management

**User Story:** As a DevOps engineer, I want database configuration centralized, so that environment-specific settings are manageable.

#### Acceptance Criteria

1. WHEN the application starts, THE System SHALL read database configuration from environment variables
2. WHEN multiple environments exist, THE System SHALL support different configurations per environment
3. WHEN connection pooling is configured, THE System SHALL allow customization of pool size and timeout
4. WHEN SSL is required, THE System SHALL support SSL connection configuration
5. WHEN database credentials change, THE System SHALL allow updates without code changes

### Requirement 17: Migration Rollback Plan

**User Story:** As a DevOps engineer, I want a rollback plan, so that the system can revert to MongoDB if critical issues arise.

#### Acceptance Criteria

1. WHEN rollback is initiated, THE System SHALL restore MongoDB connection configuration
2. WHEN rollback is initiated, THE System SHALL revert code to use Mongoose models
3. WHEN rollback is initiated, THE System SHALL restore MongoDB-specific query logic
4. WHEN rollback completes, THE System SHALL verify that MongoDB functionality is restored
5. IF rollback is needed, THEN THE System SHALL complete within 2 hours

### Requirement 18: Documentation Updates

**User Story:** As a developer, I want updated documentation, so that I understand the new PostgreSQL architecture.

#### Acceptance Criteria

1. WHEN migration is complete, THE Documentation SHALL include updated database schema diagrams
2. WHEN migration is complete, THE Documentation SHALL include Sequelize model definitions reference
3. WHEN migration is complete, THE Documentation SHALL include data migration runbook
4. WHEN migration is complete, THE Documentation SHALL include PostgreSQL backup and restore procedures
5. WHEN migration is complete, THE Documentation SHALL include troubleshooting guide for common PostgreSQL issues

### Requirement 19: Performance Monitoring

**User Story:** As a system administrator, I want query performance monitoring, so that slow queries can be identified and optimized.

#### Acceptance Criteria

1. WHEN queries execute, THE System SHALL log query execution time for queries exceeding threshold
2. WHEN slow queries are detected, THE System SHALL log the SQL query and parameters
3. WHEN performance metrics are collected, THE System SHALL track connection pool utilization
4. WHEN performance issues occur, THE System SHALL provide query analysis tools
5. WHEN monitoring is enabled, THE System SHALL support integration with PostgreSQL monitoring tools

### Requirement 20: Security and Access Control

**User Story:** As a security engineer, I want database security properly configured, so that data access is controlled and audited.

#### Acceptance Criteria

1. WHEN database connections are established, THE System SHALL use encrypted connections (SSL/TLS)
2. WHEN database users are created, THE System SHALL follow principle of least privilege
3. WHEN sensitive data is stored, THE System SHALL support column-level encryption where needed
4. WHEN audit logging is required, THE System SHALL log data access and modifications
5. WHEN SQL injection risks exist, THE System SHALL use parameterized queries exclusively

### Requirement 21: License Validation Between Databases

**User Story:** As a system architect, I want the main application to validate licenses against the license server database, so that the two-database architecture and license validation flow are preserved after migration.

#### Acceptance Criteria

1. WHEN the main application needs to validate a license, THE System SHALL query the license server PostgreSQL database
2. WHEN license validation occurs, THE System SHALL use the existing license server API endpoints
3. WHEN the license server responds, THE System SHALL cache the validation result in the main application database
4. WHEN tenant modules are checked, THE System SHALL query enabled modules from the license server database
5. WHEN the license server database is unavailable, THE System SHALL fall back to cached license data in the main application database
6. WHEN both databases are migrated to PostgreSQL, THE System SHALL maintain the same license validation logic and API contracts
7. WHEN license data is updated in the license server database, THE System SHALL invalidate cached data in the main application database
