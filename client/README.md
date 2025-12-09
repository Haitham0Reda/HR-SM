# HRMS Client Applications

This directory contains the frontend applications for the HRMS platform.

## Structure

```
client/
├── hr-app/              # Tenant Application (HR Users)
├── platform-admin/      # Platform Administration
└── shared/              # Shared components and utilities
```

## Applications

### HR App (`hr-app/`)
The main HR application used by company employees, managers, and HR staff.
- **Authentication**: Tenant JWT
- **API Namespace**: `/api/v1/*`
- **Users**: Employees, Managers, HR Staff, Company Admins

### Platform Admin (`platform-admin/`)
The platform administration dashboard for system owners.
- **Authentication**: Platform JWT
- **API Namespace**: `/api/platform/*`
- **Users**: Super Admins, Support, Operations

### Shared (`shared/`)
Shared UI components, utilities, and constants used by both applications.

## Development

### Start HR App
```bash
npm run start:hr
```

### Start Platform Admin
```bash
npm run start:platform
```

### Build All Applications
```bash
npm run build:all
```

### Install Dependencies
```bash
npm run install:all
```

## Architecture

The frontend follows a multi-app architecture where:
1. Each app has its own authentication context
2. Each app has its own routing
3. Shared components are imported from the `shared/` directory
4. Apps are built and deployed independently
