# Modular HR Management System Architecture

## Overview

This document describes the modular architecture of the HR Management System, designed to support both SaaS (multi-tenant) and On-Premise (single-tenant) deployments from the same codebase.

## Core Architecture Principles

### 1. Modular Monolith Architecture

The system follows a modular monolith architecture where each specialization feature is implemented as an independent module that can be enabled or disabled per client via feature flags.

### 2. Single Codebase, Multiple Deployment Models

- **SaaS Mode**: Multi-tenant database with subscription-based module enablement
- **On-Prem Mode**: Single tenant with license file/key controlling enabled modules, employee limits, and expiry date

### 3. Feature Flag System

All modules (except HR Core) can be enabled/disabled dynamically:

- Environment variables for development/testing
- License files for On-Premise deployments
- Database configuration for SaaS deployments

## Module Structure

### Base (Required) Module – HR Core

This module is always enabled and includes:

- Authentication with JWT
- User and role management
- Employee profiles
- Departments and positions
- Audit logging
- Company / tenant settings

### Sellable Modules

All modules work independently and can be sold individually:

1. Attendance & Time Tracking
2. Leave & Permission Management
3. Payroll Management
4. Document Management
5. Communication & Notifications
6. Reporting & Analytics
7. Task & Work Reporting System

## Task & Work Reporting Module

### Data Models

#### Task Model

```javascript
{
  title: String,
  description: String,
  priority: Enum['low', 'medium', 'high', 'urgent'],
  assignee: ObjectId (User),
  assigner: ObjectId (User),
  startDate: Date,
  dueDate: Date,
  status: Enum['assigned', 'in-progress', 'submitted', 'reviewed', 'completed', 'rejected'],
  tenantId: String
}
```

#### TaskReport Model

```javascript
{
  taskId: ObjectId (Task),
  reportText: String,
  timeSpent: Number, // in minutes
  files: [{
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    mimeType: String
  }],
  status: Enum['draft', 'submitted', 'approved', 'rejected'],
  reviewComments: String,
  submittedAt: Date,
  reviewedAt: Date,
  reviewedBy: ObjectId (User),
  tenantId: String
}
```

### Task Status Lifecycle

```
Assigned → In Progress → Submitted → Reviewed → Completed / Rejected
                            ↑              ↓
                            └── Rejected --┘
```

### API Endpoints

#### Task Management

- `GET /api/tasks` - Get all tasks for current user
- `POST /api/tasks` - Create new task (Manager+)
- `GET /api/tasks/:id` - Get task by ID
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `PUT /api/tasks/:id/status` - Update task status

#### Task Reports

- `GET /api/tasks/:id/reports` - Get task reports
- `POST /api/tasks/:id/reports` - Create/update task report
- `POST /api/tasks/:id/reports/submit` - Submit task report
- `POST /api/tasks/:id/reports/review` - Review task report (Manager+)
- `POST /api/tasks/:id/reports/upload` - Upload file for report
- `GET /api/tasks/files/:fileId` - Download report file

## Deployment Models

### SaaS Mode

- Multi-tenant database architecture
- Subscription-based module enablement
- Centralized management
- Automatic updates

### On-Premise Mode

- Single tenant deployment
- License file/key validation
- Controlled module enablement
- Employee count limits
- Expiration dates

## Feature Flag Implementation

### Backend

The feature flag system is implemented in `server/services/featureFlag.service.js`:

1. **Environment Variables**: For development/testing
2. **License Files**: For On-Premise deployments
3. **Middleware Protection**: Routes are protected by feature flag middleware

### Frontend

The frontend checks feature availability through:

1. API calls to `/api/feature-flags`
2. Conditional rendering based on feature availability
3. Route protection

## Security & Access Control

### Role-Based Access Control (RBAC)

Roles with decreasing permissions:

1. **Admin**: Full system access
2. **HR**: HR-related functions
3. **Manager**: Team management
4. **Employee**: Personal functions

### Module Gating

Both backend (middleware) and frontend (UI/route visibility) enforce module access restrictions.

## File Storage

### Task Report Files

- Secure file uploads with size and type limits
- Stored separately from general document storage
- Access control enforced per tenant and user roles

## Notifications

The system sends notifications (email + in-app) for:

- Task assignment
- Task submission
- Task approval or rejection

## Testing Strategy

- High test coverage for models, controllers, and routes
- Unit tests for business logic
- Integration tests for API endpoints
- End-to-end tests for critical user flows

## Scalability Considerations

- Database indexing for efficient querying
- Pagination for large datasets
- Caching strategies for frequently accessed data
- Horizontal scaling support

## Accessibility

- WCAG 2.1 AA compliance
- Keyboard navigation support
- Screen reader compatibility
- Color contrast adherence

## Folder Structure

```
server/
├── models/
│   ├── task.model.js
│   └── taskReport.model.js
├── controller/
│   └── task.controller.js
├── routes/
│   └── task.routes.js
├── services/
│   └── featureFlag.service.js
├── middleware/
│   └── featureFlag.middleware.js
└── config/
    └── license.json

client/
├── pages/
│   └── tasks/
│       ├── TasksPage.jsx
│       └── TaskDetailsPage.jsx
├── components/
│   └── tasks/
│       ├── TaskList.jsx
│       ├── TaskForm.jsx
│       ├── TaskReportForm.jsx
│       └── TaskReviewForm.jsx
├── services/
│   └── task.service.js
└── utils/
    └── featureFlags.js
```

## Future Enhancements

1. **Advanced Analytics**: Integration with BI tools
2. **Mobile App**: Native mobile application
3. **AI Features**: Intelligent task assignment and performance insights
4. **Third-party Integrations**: Slack, Microsoft Teams, Google Workspace
5. **Custom Workflows**: Configurable approval processes
