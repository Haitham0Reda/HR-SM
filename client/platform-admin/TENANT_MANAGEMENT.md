# Platform Tenant Management

This document describes the tenant management functionality in the Platform Admin interface.

## Overview

The tenant management system allows platform administrators to:
- View all tenants with comprehensive statistics
- Create new tenants with full provisioning
- Edit tenant details and configuration
- Suspend/reactivate tenants
- Monitor tenant usage and limits

## Features

### Dashboard Statistics
- Total tenants count
- Active, trial, suspended, and cancelled tenant counts
- Real-time status overview

### Tenant List
- Comprehensive tenant information display
- Tenant ID, name, domain, status
- Subscription status and expiration
- User count vs limits
- Industry and creation date
- Quick action buttons (view, edit, suspend/reactivate)

### Tenant Creation
- Complete tenant provisioning workflow
- Basic information (name, domain, deployment mode)
- Admin user account creation
- Contact information
- Resource limits configuration
- Industry and company size selection

### Tenant Details
- Multi-tab interface with:
  - General information (editable)
  - Configuration settings
  - Usage statistics and limits
  - Enabled modules list

## API Integration

The tenant management interface integrates with the following backend APIs:

### Endpoints Used
- `GET /api/platform/tenants` - List all tenants
- `GET /api/platform/tenants/stats` - Get tenant statistics
- `GET /api/platform/tenants/:id` - Get tenant details
- `POST /api/platform/tenants` - Create new tenant
- `PATCH /api/platform/tenants/:id` - Update tenant
- `POST /api/platform/tenants/:id/suspend` - Suspend tenant
- `POST /api/platform/tenants/:id/reactivate` - Reactivate tenant
- `GET /api/platform/tenants/:id/limits` - Check tenant limits
- `PATCH /api/platform/tenants/:id/usage` - Update tenant usage

### Data Structure

Tenants include the following key information:
- `tenantId` - Unique identifier
- `name` - Company/organization name
- `domain` - Custom domain (optional)
- `status` - active, suspended, trial, cancelled
- `deploymentMode` - saas or on-premise
- `subscription` - Plan and billing information
- `limits` - Resource limits (users, storage, API calls)
- `usage` - Current usage statistics
- `contactInfo` - Admin contact details
- `metadata` - Industry, company size, notes
- `enabledModules` - List of active modules

## Sample Data

To populate the system with sample tenants for testing:

```bash
npm run seed-platform-tenants
```

This creates 5 sample tenants with varied:
- Industries (Technology, Manufacturing, Healthcare, Finance)
- Company sizes (1-10 to 1000+ employees)
- Deployment modes (SaaS and On-premise)
- Statuses (Active, Trial, Suspended)
- Resource limits and usage patterns

## Usage Instructions

### Creating a New Tenant

1. Click "Create Tenant" button
2. Fill in basic information:
   - Company name (required)
   - Domain (optional for on-premise)
   - Deployment mode
   - Industry
3. Set up admin user account:
   - First and last name (required)
   - Email address (required)
   - Password (required, min 8 characters)
4. Add contact information
5. Configure resource limits
6. Click "Create Tenant"

### Managing Existing Tenants

1. **View Details**: Click the eye icon to see comprehensive tenant information
2. **Edit Tenant**: Click the edit icon or "Edit" button in details view
3. **Suspend Tenant**: Click the block icon for active tenants
4. **Reactivate Tenant**: Click the check icon for suspended tenants

### Monitoring Usage

The usage tab in tenant details shows:
- Current user count vs limit
- Storage usage in GB
- API calls for current month
- Usage trends and limit warnings

## Security Notes

- All tenant operations require platform admin authentication
- Tenant suspension immediately blocks API access
- Admin user passwords are securely hashed
- Tenant data is isolated per deployment
- Resource limits are enforced at the API level

## Troubleshooting

### Common Issues

1. **Tenant creation fails**: Check admin email uniqueness and password requirements
2. **Statistics not loading**: Verify platform API connectivity
3. **Suspension not working**: Ensure tenant is in active status
4. **Usage data missing**: Run usage update scripts or check tenant provisioning

### Error Messages

- "Tenant with ID not found" - Invalid tenant ID or deleted tenant
- "Admin email already exists" - Email conflict during creation
- "Only suspended tenants can be reactivated" - Status validation error
- "Failed to load tenants" - API connectivity or authentication issue