# API Endpoints Reference

## Base URL

- Development: `http://localhost:5000/api`
- Production: Configure via `REACT_APP_API_URL` environment variable

## Modular Routes (v1)

### HR Core Module

Base Path: `/api/v1/hr-core`

#### Authentication

- `POST /api/v1/hr-core/auth/register` - Register new user
- `POST /api/v1/hr-core/auth/login` - User login
- `GET /api/v1/hr-core/auth/me` - Get current user (requires auth)
- `POST /api/v1/hr-core/auth/logout` - User logout (requires auth)

#### Users

- User management endpoints under `/api/v1/hr-core/users`

#### Tenant

- Tenant management endpoints under `/api/v1/hr-core/tenant`
- `GET /api/v1/hr-core/tenant/modules` - Get enabled modules

### Tasks Module

Base Path: `/api/v1/tasks`

#### Tasks

- `GET /api/v1/tasks/tasks` - Get all tasks
- `GET /api/v1/tasks/tasks/:id` - Get task by ID
- `POST /api/v1/tasks/tasks` - Create new task
- `PUT /api/v1/tasks/tasks/:id` - Update task
- `PATCH /api/v1/tasks/tasks/:id/status` - Update task status
- `DELETE /api/v1/tasks/tasks/:id` - Delete task

#### Task Reports

- `GET /api/v1/tasks/reports/task/:taskId` - Get task reports
- `POST /api/v1/tasks/reports/task/:taskId` - Create/update task report
- `PATCH /api/v1/tasks/reports/:reportId/review` - Review task report

## Legacy Routes

### Authentication & User Management

- `POST /api/auth/forgot-password` - Request password reset
- `GET /api/auth/verify-reset-token/:token` - Verify reset token
- `POST /api/auth/reset-password/:token` - Reset password
- `/api/users` - User management

### HR Core Features

- `/api/departments` - Department management
- `/api/positions` - Position management
- `/api/dashboard` - Dashboard data
- `/api/analytics` - Analytics data

### Attendance & Time

- `/api/attendance` - Attendance records
- `/api/attendance-devices` - Attendance device management
- `/api/forget-check` - Forget check requests

### Leave Management

- `/api/missions` - Mission requests
- `/api/mixed-vacations` - Mixed vacation requests
- `/api/permission-requests` - Permission requests
- `/api/vacations` - Vacation management
- `/api/sick-leaves` - Sick leave management
- `/api/overtime` - Overtime management

### Documents

- `/api/documents` - Document management
- `/api/document-templates` - Document templates
- `/api/hardcopies` - Hardcopy management

### Payroll

- `/api/payroll` - Payroll management

### Communication

- `/api/announcements` - Announcements
- `/api/notifications` - Notifications
- `/api/surveys` - Surveys

### Events & Holidays

- `/api/events` - Events
- `/api/holidays` - Holidays

### Reports & Requests

- `/api/reports` - Reports
- `/api/requests` - General requests

### Security & Permissions

- `/api/permissions` - Permission management
- `/api/permission-audits` - Permission audit logs
- `/api/security-audits` - Security audit logs
- `/api/security-settings` - Security settings
- `/api/roles` - Role management

### System Management

- `/api/backups` - Backup management
- `/api/backup-executions` - Backup execution logs
- `/api/theme` - Theme settings
- `/api/feature-flags` - Feature flag management
- `/api/resigned-employees` - Resigned employee records

## Common Response Format

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error message",
  "error": "Detailed error (development only)"
}
```

## Authentication

Most endpoints require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

The token is automatically added by the axios interceptor when stored in localStorage.

## Troubleshooting

### Fetch Not Working

1. Check that axios is configured with the correct base URL
2. Verify the token is stored in localStorage
3. Check browser console for CORS errors
4. Verify the server is running on the correct port
5. Check that the route exists in the server

### Common Issues

- **404 Not Found**: Route doesn't exist or is registered after 404 handler
- **401 Unauthorized**: Token is missing or invalid
- **403 Forbidden**: User doesn't have permission
- **CORS Error**: Server CORS configuration doesn't allow the client origin
