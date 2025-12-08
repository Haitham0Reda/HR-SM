# Implementation Plan

- [x] 1. Set up module configuration system

  - Create module.config.js schema and validation
  - Define commercial metadata structure for all modules
  - Implement module registry with pricing tiers
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 1.1 Write property test for module registration completeness

  - **Property 6: Module Registration Completeness**
  - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**

- [x] 1.2 Write property test for marketing metadata quality

  - **Property 7: Marketing Metadata Quality**
  - **Validates: Requirements 2.5**

- [x] 2. Implement core license data models

  - Create License model for SaaS (MongoDB schema)
  - Create UsageTracking model with compound indexes
  - Create LicenseAudit model for compliance logging
  - Implement license file schema for On-Premise deployments
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 2.1 Write unit tests for license model validation

  - Test schema validation rules
  - Test index creation
  - Test model methods
  - _Requirements: 3.1, 3.2_

- [x] 3. Build license validator service

  - Implement validateModuleAccess() method with caching
  - Implement checkLimit() method for usage enforcement
  - Add license expiration checking logic
  - Implement Core HR bypass logic
  - Add audit logging to all validation operations
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ]\* 3.1 Write property test for Core HR always accessible

  - **Property 5: Core HR Always Accessible**
  - **Validates: Requirements 1.5, 3.5**

- [ ]\* 3.2 Write property test for expired license blocking

  - **Property 9: Expired License Blocking**
  - **Validates: Requirements 3.2**

- [ ]\* 3.3 Write property test for usage limit enforcement

  - **Property 10: Usage Limit Enforcement**
  - **Validates: Requirements 3.3**

- [ ]\* 3.4 Write property test for validation failure logging

  - **Property 11: Validation Failure Logging**
  - **Validates: Requirements 3.4**

- [ ]\* 3.5 Write property test for license validation before processing

  - **Property 8: License Validation Before Processing**
  - **Validates: Requirements 3.1**

- [x] 4. Create usage tracking system

  - Implement UsageTracker service with batch updates
  - Add trackUsage() method for recording metrics
  - Implement getUsage() method for reporting
  - Add warning threshold detection (80%)
  - Implement limit blocking logic
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ]\* 4.1 Write property test for usage metric tracking

  - **Property 20: Usage Metric Tracking**
  - **Validates: Requirements 7.1**

- [ ]\* 4.2 Write property test for warning threshold triggering

  - **Property 21: Warning Threshold Triggering**
  - **Validates: Requirements 7.2**

- [ ]\* 4.3 Write property test for usage blocking on limit exceeded

  - **Property 22: Usage Blocking on Limit Exceeded**
  - **Validates: Requirements 7.3**

- [ ]\* 4.4 Write property test for usage report completeness

  - **Property 23: Usage Report Completeness**
  - **Validates: Requirements 7.4**

- [x] 5. Implement license validation middleware

  - Create requireModuleLicense() middleware
  - Add license info attachment to request object
  - Implement error responses with upgrade URLs
  - Add rate limiting for validation endpoints
  - Integrate with existing module routes
  - _Requirements: 1.2, 3.1, 3.2, 3.3_

- [ ]\* 5.1 Write property test for disabled module API blocking

  - **Property 2: Disabled Module API Blocking**
  - **Validates: Requirements 1.2**

- [ ]\* 5.2 Write unit tests for middleware error responses

  - Test 403 responses for unlicensed modules
  - Test 429 responses for limit exceeded
  - Test error message format
  - _Requirements: 3.2, 3.3_

- [x] 6. Build On-Premise license file system

  - Implement license file loader with validation
  - Add digital signature verification
  - Implement hot-reload on file changes
  - Add fallback to cached license (24-hour grace period)
  - Create license file generator utility
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ]\* 6.1 Write property test for invalid license handling

  - **Property 16: Invalid License Handling**
  - **Validates: Requirements 5.2**

- [ ]\* 6.2 Write property test for employee limit enforcement from file

  - **Property 17: Employee Limit Enforcement from File**
  - **Validates: Requirements 5.4**

- [ ]\* 6.3 Write unit tests for license file operations

  - Test file loading and parsing
  - Test invalid file handling
  - Test hot-reload functionality
  - _Requirements: 5.1, 5.3_

- [x] 7. Implement module dependency resolution

  - Create dependency graph resolver
  - Add circular dependency detection
  - Implement transitive dependency resolution
  - Add validation for module activation
  - _Requirements: 1.4, 8.2, 8.5_

- [ ]\* 7.1 Write property test for dependency enforcement

  - **Property 4: Dependency Enforcement**
  - **Validates: Requirements 1.4**

- [ ]\* 7.2 Write property test for optional integration graceful degradation

  - **Property 26: Optional Integration Graceful Degradation**
  - **Validates: Requirements 8.5**

- [ ]\* 7.3 Write unit tests for circular dependency detection

  - Test simple circular dependencies
  - Test complex dependency chains
  - _Requirements: 1.4_

- [x] 8. Create SaaS subscription management

  - Implement subscription creation with module activation
  - Add subscription upgrade/downgrade logic
  - Implement trial period handling
  - Add subscription expiration handling
  - Create subscription status API endpoints
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ]\* 8.1 Write property test for subscription module activation

  - **Property 18: Subscription Module Activation**
  - **Validates: Requirements 6.1**

- [ ]\* 8.2 Write property test for subscription expiration handling

  - **Property 19: Subscription Expiration Handling**
  - **Validates: Requirements 6.4**

- [ ]\* 8.3 Write unit tests for subscription lifecycle

  - Test subscription creation
  - Test upgrade flow
  - Test downgrade with data preservation
  - Test trial period
  - _Requirements: 6.1, 6.2, 6.3, 6.5_

- [x] 9. Build audit logging system

  - Implement audit log creation for all validation events
  - Add structured logging with required fields
  - Implement audit log query API with filtering
  - Add high-priority logging for violations
  - Create change tracking for license modifications
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ]\* 9.1 Write property test for audit log entry completeness

  - **Property 32: Audit Log Entry Completeness**
  - **Validates: Requirements 10.1**

- [ ]\* 9.2 Write property test for usage limit check logging

  - **Property 33: Usage Limit Check Logging**
  - **Validates: Requirements 10.2**

- [ ]\* 9.3 Write property test for violation high-priority logging

  - **Property 34: Violation High-Priority Logging**
  - **Validates: Requirements 10.3**

- [ ]\* 9.4 Write property test for audit log query filtering

  - **Property 35: Audit Log Query Filtering**
  - **Validates: Requirements 10.4**

- [ ]\* 9.5 Write property test for license modification change tracking

  - **Property 36: License Modification Change Tracking**
  - **Validates: Requirements 10.5**

- [x] 10. Checkpoint - Ensure all backend tests pass

  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Create React License Context

  - Implement LicenseProvider with state management
  - Add isModuleEnabled() hook
  - Add getModuleLicense() hook
  - Add isApproachingLimit() hook
  - Implement license data fetching and caching
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ]\* 11.1 Write property test for module license status independence

  - **Property 1: Module License Status Independence**
  - **Validates: Requirements 1.1**

- [ ]\* 11.2 Write unit tests for license context hooks

  - Test isModuleEnabled with various states
  - Test license data caching
  - Test context updates
  - _Requirements: 1.1, 4.1_

- [x] 12. Build locked feature UI components

  - Create LockedFeature overlay component
  - Create LockedPage component with upgrade CTA
  - Create UpgradeModal component
  - Add accessibility support (WCAG 2.1 AA)
  - Add theme support (light/dark mode)
  - _Requirements: 4.1, 4.2, 13.4_

- [x] 12.1 Write property test for disabled module UI hiding

  - **Property 3: Disabled Module UI Hiding**
  - **Validates: Requirements 1.3**

- [x] 12.2 Write property test for unlicensed feature UI feedback

  - **Property 12: Unlicensed Feature UI Feedback**
  - **Validates: Requirements 4.1, 4.2**

- [x] 12.3 Write property test for error page theme support

  - **Property 45: Error Page Theme Support**
  - **Validates: Requirements 13.4**

- [x] 13. Implement usage warning components

  - Create UsageWarningBanner component
  - Add severity levels (warning, critical)
  - Implement dismissible warnings with persistence
  - Add real-time usage updates
  - _Requirements: 4.4, 12.3, 12.4_

- [ ]\* 13.1 Write property test for usage warning display

  - **Property 14: Usage Warning Display**
  - **Validates: Requirements 4.4**

- [ ]\* 13.2 Write property test for 30-day warning state

  - **Property 41: 30-Day Warning State**
  - **Validates: Requirements 12.3**

- [ ]\* 13.3 Write property test for 7-day critical state

  - **Property 42: 7-Day Critical State**
  - **Validates: Requirements 12.4**

- [ ] 14. Create navigation menu filtering

  - Implement conditional menu item rendering
  - Add license-based menu filtering
  - Create locked menu item indicators
  - Update navigation components across the app
  - _Requirements: 4.3_

- [ ]\* 14.1 Write property test for menu filtering by license

  - **Property 13: Menu Filtering by License**
  - **Validates: Requirements 4.3**

- [ ] 15. Build pricing page

  - Create PricingPage component with responsive layout
  - Create ModuleCard component for each product
  - Create PricingTierComparison component
  - Add SaaS vs On-Premise pricing toggle
  - Display module dependencies clearly
  - Add upsell CTAs throughout
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [ ]\* 15.1 Write property test for pricing display completeness

  - **Property 37: Pricing Display Completeness**
  - **Validates: Requirements 11.2**

- [ ]\* 15.2 Write property test for dependency indication in UI

  - **Property 38: Dependency Indication in UI**
  - **Validates: Requirements 11.3**

- [ ]\* 15.3 Write property test for upsell CTA presence

  - **Property 39: Upsell CTA Presence**
  - **Validates: Requirements 11.5**

- [ ] 16. Implement pricing calculation system

  - Create pricing calculator service
  - Implement tier-based pricing logic
  - Add bundle discount calculations
  - Implement add-on feature pricing
  - Create quote generation API
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ]\* 16.1 Write property test for pricing tier completeness

  - **Property 27: Pricing Tier Completeness**
  - **Validates: Requirements 9.1**

- [ ]\* 16.2 Write property test for tier limits mapping

  - **Property 28: Tier Limits Mapping**
  - **Validates: Requirements 9.2**

- [ ]\* 16.3 Write property test for quote generation accuracy

  - **Property 29: Quote Generation Accuracy**
  - **Validates: Requirements 9.3**

- [ ]\* 16.4 Write property test for bundle discount application

  - **Property 30: Bundle Discount Application**
  - **Validates: Requirements 9.4**

- [ ]\* 16.5 Write property test for add-on feature listing

  - **Property 31: Add-on Feature Listing**
  - **Validates: Requirements 9.5**

- [ ] 17. Create license status dashboard

  - Create LicenseStatusPage component
  - Display all enabled modules with status
  - Show license expiration dates prominently
  - Implement warning/critical state highlighting
  - Add renewal action buttons
  - Show usage metrics per module
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ]\* 17.1 Write property test for license expiration date display

  - **Property 40: License Expiration Date Display**
  - **Validates: Requirements 12.2**

- [ ]\* 17.2 Write property test for renewal action availability

  - **Property 43: Renewal Action Availability**
  - **Validates: Requirements 12.5**

- [ ] 18. Build error pages

  - Create 404 NotFound page with friendly messaging
  - Create 500 ServerError page with error reference ID
  - Implement role-aware navigation
  - Add theme support (light/dark mode)
  - Ensure WCAG 2.1 AA accessibility compliance
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [ ]\* 18.1 Write property test for error page role-aware navigation

  - **Property 44: Error Page Role-Aware Navigation**
  - **Validates: Requirements 13.3**

- [ ]\* 18.2 Write unit tests for error page rendering

  - Test 404 page content
  - Test 500 page content
  - Test navigation links
  - _Requirements: 13.1, 13.2_

- [ ] 19. Integrate license middleware with existing routes

  - Add requireModuleLicense to attendance routes
  - Add requireModuleLicense to leave routes
  - Add requireModuleLicense to payroll routes
  - Add requireModuleLicense to documents routes
  - Add requireModuleLicense to communication routes
  - Add requireModuleLicense to reporting routes
  - Add requireModuleLicense to tasks routes
  - Ensure Core HR routes bypass validation
  - _Requirements: 1.2, 3.1_

- [ ]\* 19.1 Write property test for module isolation

  - **Property 25: Module Isolation**
  - **Validates: Requirements 8.3**

- [ ] 20. Implement real-time license updates

  - Add WebSocket support for license changes
  - Implement license expiration real-time UI updates
  - Add usage limit real-time updates
  - Create notification system for license events
  - _Requirements: 4.5_

- [ ]\* 20.1 Write property test for real-time license expiration UI update

  - **Property 15: Real-time License Expiration UI Update**
  - **Validates: Requirements 4.5**

- [ ] 21. Create license management API endpoints

  - POST /api/v1/licenses - Create/update license
  - GET /api/v1/licenses/:tenantId - Get license details
  - GET /api/v1/licenses/:tenantId/usage - Get usage metrics
  - GET /api/v1/licenses/audit - Query audit logs
  - POST /api/v1/licenses/:tenantId/modules/:moduleKey/activate - Activate module
  - POST /api/v1/licenses/:tenantId/modules/:moduleKey/deactivate - Deactivate module
  - _Requirements: 1.1, 7.4, 10.4_

- [ ]\* 21.1 Write integration tests for license API endpoints

  - Test license CRUD operations
  - Test usage reporting
  - Test audit log queries
  - Test module activation/deactivation
  - _Requirements: 1.1, 7.4, 10.4_

- [ ] 22. Implement module config files for all modules

  - Create module.config.js for Attendance module
  - Create module.config.js for Leave module
  - Create module.config.js for Payroll module
  - Create module.config.js for Documents module
  - Create module.config.js for Communication module
  - Create module.config.js for Reporting module
  - Create module.config.js for Tasks module
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 23. Add performance optimizations

  - Implement Redis caching for license validation (5-minute TTL)
  - Add batch processing for usage tracking (60-second intervals)
  - Implement database indexes for common queries
  - Add React.memo to license-dependent components
  - Implement lazy loading for module UI components
  - _Requirements: Performance Considerations_

- [ ]\* 23.1 Write performance tests for license validation caching

  - Test cache hit rates
  - Test cache invalidation
  - Test concurrent access
  - _Requirements: Performance Considerations_

- [ ] 24. Checkpoint - Ensure all tests pass

  - Ensure all tests pass, ask the user if questions arise.

- [ ] 25. Create migration scripts

  - Create script to generate initial licenses for existing tenants
  - Create script to migrate existing feature flags to new system
  - Create script to backfill usage tracking data
  - Create script to generate On-Premise license files
  - _Requirements: Backward Compatibility_

- [ ]\* 25.1 Write unit tests for migration scripts

  - Test license generation
  - Test feature flag migration
  - Test data preservation
  - _Requirements: Backward Compatibility_

- [ ] 26. Add monitoring and alerting

  - Implement license validation metrics collection
  - Add usage limit warning alerts
  - Create license expiration alerts (30-day, 7-day)
  - Build license validation dashboard
  - Add error rate monitoring
  - _Requirements: Monitoring & Observability_

- [ ] 27. Create administrator documentation

  - Write license management guide
  - Document On-Premise license file format
  - Create troubleshooting guide
  - Document API endpoints
  - Create usage reporting guide
  - _Requirements: Implementation Phases_

- [ ] 28. Create sales enablement materials

  - Document pricing tiers and limits
  - Create module comparison matrix
  - Write product descriptions for each module
  - Create bundle discount guidelines
  - Document upgrade paths
  - _Requirements: 2.5, 9.1, 9.2, 9.3, 9.4_

- [ ] 29. Final checkpoint - Complete system validation
  - Run full test suite (unit, property, integration)
  - Verify all modules properly licensed
  - Test SaaS subscription flows end-to-end
  - Test On-Premise license flows end-to-end
  - Verify audit logging completeness
  - Test UI/UX across all license states
  - Ensure all tests pass, ask the user if questions arise.
