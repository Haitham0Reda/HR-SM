# Requirements Document

## Introduction

This document outlines the requirements for transforming the existing Modular HRMS into a fully productized SaaS platform where every feature becomes a standalone, independently sellable product. The system must support both multi-tenant SaaS subscriptions and On-Premise licensed deployments with granular module-level licensing, usage limits, and commercial controls.

## Glossary

- **Core HR**: The base system module containing authentication, user management, roles, tenants, and audit logs. Always enabled and not sold separately.
- **Product Module**: A feature set that can be independently enabled, disabled, licensed, and sold (e.g., Attendance, Leave, Payroll).
- **License**: A digital authorization that grants access to specific Product Modules with defined limits and expiration dates.
- **Tenant**: An isolated customer instance in a multi-tenant SaaS deployment.
- **On-Premise Deployment**: A self-hosted installation where licensing is enforced via license files.
- **SaaS Deployment**: A cloud-hosted multi-tenant system where licensing is enforced via subscription management.
- **Module Limit**: Quantitative restrictions on module usage (e.g., max employees, storage, records).
- **License Validation**: The process of verifying that a license is valid, not expired, and within usage limits.
- **Upsell CTA**: Call-to-action prompts shown to users when attempting to access unlicensed features.

## Requirements

### Requirement 1

**User Story:** As a SaaS administrator, I want every feature to be independently licensable, so that I can sell modules as standalone products to different customer segments.

#### Acceptance Criteria

1. WHEN the system initializes THEN the System SHALL load all Product Modules with independent license status
2. WHEN a Product Module is disabled THEN the System SHALL prevent all API access to that module's endpoints
3. WHEN a Product Module is disabled THEN the System SHALL hide or lock all UI components related to that module
4. WHERE a Product Module has dependencies THEN the System SHALL enforce that dependent modules cannot be enabled without their required modules
5. WHEN Core HR is accessed THEN the System SHALL always allow access regardless of license status

### Requirement 2

**User Story:** As a product architect, I want each module to have a clear commercial definition, so that sales and marketing teams understand what they are selling.

#### Acceptance Criteria

1. WHEN a Product Module is registered THEN the System SHALL store its display name, business description, and target customer segment
2. WHEN a Product Module is registered THEN the System SHALL define its pricing tier mapping
3. WHEN a Product Module is registered THEN the System SHALL specify its feature limits and usage quotas
4. WHEN a Product Module is registered THEN the System SHALL declare all required and optional dependencies
5. WHEN module metadata is requested THEN the System SHALL return marketing-friendly descriptions suitable for pricing pages

### Requirement 3

**User Story:** As a backend developer, I want a centralized license validation system, so that all modules consistently enforce licensing rules.

#### Acceptance Criteria

1. WHEN an API request targets a Product Module THEN the System SHALL validate the license before processing the request
2. WHEN a license is expired THEN the System SHALL block access to all non-Core modules and return a clear error message
3. WHEN a license usage limit is exceeded THEN the System SHALL prevent further usage and return a limit-exceeded error
4. WHEN license validation fails THEN the System SHALL log the failure with tenant ID, module name, and reason
5. WHEN Core HR is accessed THEN the System SHALL bypass license validation

### Requirement 4

**User Story:** As a frontend developer, I want clear UI behavior rules for unlicensed modules, so that users understand what features are available.

#### Acceptance Criteria

1. WHEN a user navigates to an unlicensed module page THEN the System SHALL display a locked state with upgrade CTA
2. WHEN a user attempts to access an unlicensed feature THEN the System SHALL show a modal explaining the feature and pricing
3. WHEN the navigation menu is rendered THEN the System SHALL hide menu items for disabled modules
4. WHEN a module is licensed but approaching limits THEN the System SHALL display usage warnings
5. WHEN a module license expires THEN the System SHALL immediately update the UI to reflect the locked state

### Requirement 5

**User Story:** As an On-Premise customer, I want to use a license file to activate purchased modules, so that I can use the system without internet connectivity.

#### Acceptance Criteria

1. WHEN the System starts in On-Premise mode THEN the System SHALL load and validate the license file from the config directory
2. WHEN a license file is invalid or missing THEN the System SHALL disable all Product Modules and log a warning
3. WHEN a license file is updated THEN the System SHALL reload the license without requiring a system restart
4. WHEN the license file specifies employee limits THEN the System SHALL enforce those limits across all modules
5. WHEN the license expiry date is reached THEN the System SHALL disable all Product Modules except Core HR

### Requirement 6

**User Story:** As a SaaS customer, I want my subscription to automatically control which modules I can access, so that I only pay for what I use.

#### Acceptance Criteria

1. WHEN a tenant subscription is created THEN the System SHALL activate only the subscribed Product Modules
2. WHEN a tenant upgrades their subscription THEN the System SHALL immediately enable the newly purchased modules
3. WHEN a tenant downgrades their subscription THEN the System SHALL disable removed modules and preserve their data
4. WHEN a tenant subscription expires THEN the System SHALL disable all Product Modules except Core HR
5. WHEN a tenant is within a trial period THEN the System SHALL enable all modules with trial limits

### Requirement 7

**User Story:** As a system administrator, I want to monitor module usage and limits, so that I can proactively manage licensing and prevent service disruptions.

#### Acceptance Criteria

1. WHEN a Product Module is used THEN the System SHALL track usage metrics against defined limits
2. WHEN usage approaches 80% of a limit THEN the System SHALL send warning notifications to administrators
3. WHEN usage exceeds a limit THEN the System SHALL block further usage and log the event
4. WHEN an administrator requests usage reports THEN the System SHALL provide detailed metrics per module and tenant
5. WHEN license validation occurs THEN the System SHALL record the validation result in audit logs

### Requirement 8

**User Story:** As a developer, I want modules to be completely independent, so that I can develop, test, and deploy them without affecting other modules.

#### Acceptance Criteria

1. WHEN a Product Module is developed THEN the Module SHALL contain its own routes, models, controllers, and services
2. WHEN a Product Module needs data from another module THEN the Module SHALL use only defined integration APIs
3. WHEN a Product Module is disabled THEN the System SHALL continue functioning normally for all other enabled modules
4. WHEN a Product Module is removed from the codebase THEN the System SHALL detect the missing module and handle it gracefully
5. WHEN a Product Module has optional integrations THEN the Module SHALL function without those integrations if they are disabled

### Requirement 9

**User Story:** As a sales team member, I want clear pricing tier definitions for each module, so that I can create accurate quotes for customers.

#### Acceptance Criteria

1. WHEN a Product Module is configured THEN the System SHALL define pricing tiers (Starter, Professional, Enterprise)
2. WHEN a pricing tier is selected THEN the System SHALL specify included limits for that tier
3. WHEN a customer requests a quote THEN the System SHALL generate pricing based on selected modules and tiers
4. WHEN modules have bundle discounts THEN the System SHALL apply discounts when multiple modules are purchased together
5. WHEN a module has add-on features THEN the System SHALL list those features with separate pricing

### Requirement 10

**User Story:** As a compliance officer, I want all license checks and usage tracking to be auditable, so that we can demonstrate compliance with licensing agreements.

#### Acceptance Criteria

1. WHEN a license validation occurs THEN the System SHALL create an audit log entry with timestamp, tenant, module, and result
2. WHEN usage limits are checked THEN the System SHALL log the current usage and limit values
3. WHEN a license violation is detected THEN the System SHALL create a high-priority audit event
4. WHEN audit logs are queried THEN the System SHALL provide filtering by tenant, module, date range, and event type
5. WHEN a license is modified THEN the System SHALL record the change with before and after values

### Requirement 11

**User Story:** As a potential customer, I want to view a clear pricing page showing all available modules, so that I can understand what features are available and make informed purchasing decisions.

#### Acceptance Criteria

1. WHEN a user visits the pricing page THEN the System SHALL display all Product Modules as independent purchasable products
2. WHEN pricing information is displayed THEN the System SHALL show both monthly SaaS pricing and one-time On-Premise pricing
3. WHEN module dependencies are present THEN the System SHALL clearly indicate which modules require Core HR or other modules
4. WHEN pricing tiers are displayed THEN the System SHALL allow comparison between Starter, Business, and Enterprise plans
5. WHEN a user views an unlicensed module THEN the System SHALL display upsell CTAs with links to the pricing page

### Requirement 12

**User Story:** As a system administrator, I want to view license and subscription status, so that I can proactively manage renewals and avoid service disruptions.

#### Acceptance Criteria

1. WHEN an administrator accesses the license status page THEN the System SHALL display all enabled modules with their license status
2. WHEN a license expiration date exists THEN the System SHALL display the expiration date prominently
3. WHEN a license expires within 30 days THEN the System SHALL highlight the module with a warning state
4. WHEN a license expires within 7 days THEN the System SHALL highlight the module with a critical state
5. WHEN license renewal is needed THEN the System SHALL provide clear contact and renewal action buttons

### Requirement 13

**User Story:** As a user, I want to see friendly and helpful error pages when something goes wrong, so that I understand what happened and know how to proceed.

#### Acceptance Criteria

1. WHEN a user navigates to a non-existent route THEN the System SHALL display a 404 page with friendly messaging and navigation options
2. WHEN a server error occurs THEN the System SHALL display a 500 page with a calm professional message and error reference ID
3. WHEN an error page is displayed THEN the System SHALL provide role-aware navigation back to appropriate pages
4. WHEN an error page is rendered THEN the System SHALL support both light and dark mode themes
5. WHEN error pages are displayed THEN the System SHALL meet WCAG 2.1 AA accessibility standards
