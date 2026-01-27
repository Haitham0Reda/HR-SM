# Requirements Document

## Introduction

This document specifies the requirements for migrating platform metadata (tenant information, subscriptions, and module configurations) from the main application database (`hrsm_platform`) to the license server database (`hrsm-licenses`). This migration establishes proper separation of concerns between platform control (license server) and business data (main application).

## Glossary

- **License_Server**: The standalone service (port 4000) that manages licenses, tenant metadata, and platform control
- **Main_Backend**: The primary HRMS application (port 5000) that handles HR business operations
- **Platform_Metadata**: Tenant information, subscriptions, enabled modules, and billing data
- **Business_Data**: HR operational data (users, attendances, surveys, payroll) scoped by tenantId
- **Tenant**: A company/organization using the HRMS platform
- **Module**: A feature set that can be enabled/disabled per tenant (e.g., surveys, payroll, attendance)
- **License_Cache**: A local copy of license data stored in the main database for performance optimization

## Requirements

### Requirement 1: Database Schema Migration

**User Story:** As a platform architect, I want tenant metadata stored in the license server database, so that platform control is properly separated from business data.

#### Acceptance Criteria

1. WHEN the migration is complete, THE License_Server database SHALL contain a tenants collection with all tenant metadata
2. WHEN the migration is complete, THE License_Server database SHALL contain a subscriptions collection with billing information
3. WHEN the migration is complete, THE License_Server database SHALL contain an enabled_modules collection with feature flags per tenant
4. WHEN querying tenant data, THE License_Server SHALL retrieve it from the hrsm-licenses database
5. WHEN the migration is complete, THE Main_Backend database SHALL NOT contain the tenants collection (except cached license data)

### Requirement 2: Data Migration Script

**User Story:** As a database administrator, I want an automated migration script, so that I can safely move tenant data without data loss.

#### Acceptance Criteria

1. WHEN the migration script runs, THE System SHALL export all tenant records from hrsm_platform database
2. WHEN exporting tenant data, THE System SHALL validate data integrity before proceeding
3. WHEN importing to hrsm-licenses, THE System SHALL preserve all tenant metadata fields
4. WHEN the migration encounters errors, THE System SHALL log detailed error information and halt execution
5. WHEN the migration completes successfully, THE System SHALL generate a verification report comparing source and destination data
6. IF the migration fails, THEN THE System SHALL provide a rollback mechanism to restore original state

### Requirement 3: License Server API Endpoints

**User Story:** As a backend developer, I want REST API endpoints on the license server, so that the main application can query tenant metadata.

#### Acceptance Criteria

1. WHEN a GET request is made to /api/tenants, THE License_Server SHALL return a list of all tenants
2. WHEN a GET request is made to /api/tenants/:tenantId, THE License_Server SHALL return detailed tenant information
3. WHEN a POST request is made to /api/tenants, THE License_Server SHALL create a new tenant record
4. WHEN a PUT request is made to /api/tenants/:tenantId, THE License_Server SHALL update tenant information
5. WHEN a DELETE request is made to /api/tenants/:tenantId, THE License_Server SHALL remove the tenant record
6. WHEN a GET request is made to /api/tenants/:tenantId/modules, THE License_Server SHALL return enabled modules for that tenant
7. WHEN a POST request is made to /api/tenants/:tenantId/modules/:moduleId, THE License_Server SHALL enable the specified module
8. WHEN a DELETE request is made to /api/tenants/:tenantId/modules/:moduleId, THE License_Server SHALL disable the specified module
9. WHEN any API request fails authentication, THE License_Server SHALL return a 401 status code
10. WHEN any API request fails authorization, THE License_Server SHALL return a 403 status code

### Requirement 4: Main Backend Integration

**User Story:** As a backend developer, I want the main application to query tenant data from the license server, so that it uses the correct data source.

#### Acceptance Criteria

1. WHEN the main backend needs tenant information, THE System SHALL query the License_Server API instead of the local database
2. WHEN the main backend validates module access, THE System SHALL check enabled modules via the License_Server API
3. WHEN the main backend checks subscription status, THE System SHALL query the License_Server API
4. WHEN the License_Server API is unavailable, THE System SHALL fall back to cached license data in the company_license collection
5. WHEN cached license data is used, THE System SHALL log a warning indicating fallback mode
6. WHEN the License_Server API returns an error, THE System SHALL handle it gracefully and return appropriate error messages

### Requirement 5: License Cache Synchronization

**User Story:** As a system administrator, I want license data cached locally for performance, so that the main application can validate licenses quickly without constant API calls.

#### Acceptance Criteria

1. WHEN license data is retrieved from the License_Server, THE Main_Backend SHALL cache it in the company_license collection
2. WHEN cached license data is older than 6 hours, THE Main_Backend SHALL refresh it from the License_Server
3. WHEN a tenant's modules are updated, THE License_Server SHALL invalidate the cache for that tenant
4. WHEN cache invalidation occurs, THE Main_Backend SHALL fetch fresh data on the next request
5. WHEN the cache refresh fails, THE Main_Backend SHALL continue using stale cache data and log the failure

### Requirement 6: Backward Compatibility

**User Story:** As a DevOps engineer, I want a phased migration approach, so that the system remains operational during the transition.

#### Acceptance Criteria

1. WHILE the migration is in progress, THE System SHALL support reading tenant data from both databases
2. WHEN tenant data exists in both databases, THE System SHALL prioritize data from the License_Server
3. WHEN the migration is complete, THE System SHALL remove backward compatibility code
4. WHEN a rollback is needed, THE System SHALL restore the original data access patterns
5. WHEN operating in compatibility mode, THE System SHALL log which data source is being used

### Requirement 7: Data Validation and Integrity

**User Story:** As a quality assurance engineer, I want automated validation of migrated data, so that I can verify the migration was successful.

#### Acceptance Criteria

1. WHEN the migration completes, THE System SHALL verify that all tenant records exist in the License_Server database
2. WHEN validating migrated data, THE System SHALL compare record counts between source and destination
3. WHEN validating migrated data, THE System SHALL verify that all required fields are populated
4. WHEN data inconsistencies are detected, THE System SHALL generate a detailed report of discrepancies
5. WHEN validation passes, THE System SHALL generate a success report with migration statistics

### Requirement 8: Security and Access Control

**User Story:** As a security engineer, I want tenant metadata protected in the license server, so that the main application cannot modify platform control data.

#### Acceptance Criteria

1. WHEN the Main_Backend queries tenant data, THE License_Server SHALL authenticate the request using API keys
2. WHEN the Main_Backend attempts to modify tenant data, THE License_Server SHALL reject the request with a 403 status
3. WHEN platform admin operations occur, THE License_Server SHALL require elevated permissions
4. WHEN API keys are invalid or expired, THE License_Server SHALL reject requests with appropriate error messages
5. WHEN sensitive tenant data is transmitted, THE System SHALL use encrypted connections (HTTPS)

### Requirement 9: Monitoring and Logging

**User Story:** As a system administrator, I want comprehensive logging of the migration process, so that I can troubleshoot issues and audit the migration.

#### Acceptance Criteria

1. WHEN the migration starts, THE System SHALL log the start time and configuration parameters
2. WHEN each tenant record is migrated, THE System SHALL log the tenantId and migration status
3. WHEN errors occur during migration, THE System SHALL log detailed error messages with stack traces
4. WHEN the migration completes, THE System SHALL log summary statistics (total records, successes, failures)
5. WHEN the License_Server API is called, THE System SHALL log request details for audit purposes
6. WHEN cache operations occur, THE System SHALL log cache hits, misses, and refresh operations

### Requirement 10: Performance Optimization

**User Story:** As a performance engineer, I want the license cache to minimize API calls, so that the system maintains acceptable response times.

#### Acceptance Criteria

1. WHEN validating licenses, THE Main_Backend SHALL use cached data if available and fresh
2. WHEN cache data is fresh (less than 6 hours old), THE System SHALL NOT make API calls to the License_Server
3. WHEN multiple requests need the same tenant data, THE System SHALL batch API calls to the License_Server
4. WHEN the License_Server responds, THE System SHALL cache the response for subsequent requests
5. WHEN cache operations complete, THE System SHALL complete within 50 milliseconds

### Requirement 11: Documentation and Training

**User Story:** As a developer, I want updated documentation, so that I understand the new architecture and data flow.

#### Acceptance Criteria

1. WHEN the migration is complete, THE System SHALL provide updated architecture diagrams showing data flow
2. WHEN developers need to query tenant data, THE Documentation SHALL provide code examples using the License_Server API
3. WHEN troubleshooting issues, THE Documentation SHALL provide a troubleshooting guide for common problems
4. WHEN the API changes, THE Documentation SHALL include updated API reference documentation
5. WHEN onboarding new developers, THE Documentation SHALL explain the separation of platform vs business data

### Requirement 12: Rollback and Recovery

**User Story:** As a DevOps engineer, I want a rollback plan, so that I can revert the migration if critical issues arise.

#### Acceptance Criteria

1. WHEN a rollback is initiated, THE System SHALL restore tenant data to the hrsm_platform database
2. WHEN rolling back, THE System SHALL revert application code to query the original database
3. WHEN a rollback completes, THE System SHALL verify that the original functionality is restored
4. WHEN rollback is needed, THE System SHALL complete within 30 minutes
5. IF rollback fails, THEN THE System SHALL provide manual recovery instructions
