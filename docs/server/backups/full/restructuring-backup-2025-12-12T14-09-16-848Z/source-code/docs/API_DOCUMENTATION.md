# HRMS API Documentation

## Base URL

```
http://localhost:5000/api/v1
```

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

---

## HR Core Module

### Authentication

#### POST /hr-core/auth/register

Register a new user (first user or admin creating users)

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "role": "Employee",
  "tenantId": "company-123",
  "companyName": "Acme Corp"
}
```

#### POST /hr-core/auth/login

Login to get JWT token

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "tenantId": "company-123"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "user": { ... },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### GET /hr-core/auth/me

Get current user profile (requires auth)

#### POST /hr-core/auth/logout

Logout (requires auth)

---

### Users

#### GET /hr-core/users

Get all users (HR/Admin only)

**Query Parameters:**

- `role`: Filter by role
- `status`: Filter by status
- `department`: Filter by department
- `search`: Search by name, email, or employee ID
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

#### GET /hr-core/users/:id

Get single user

#### POST /hr-core/users

Create new user (HR/Admin only)

**Request Body:**

```json
{
  "email": "employee@example.com",
  "password": "SecurePass123!",
  "firstName": "Jane",
  "lastName": "Smith",
  "role": "Employee",
  "department": "60d5ec49f1b2c72b8c8e4f1a",
  "position": "60d5ec49f1b2c72b8c8e4f1b",
  "manager": "60d5ec49f1b2c72b8c8e4f1c",
  "employeeId": "EMP001",
  "hireDate": "2024-01-15"
}
```

#### PUT /hr-core/users/:id

Update user (HR/Admin only)

#### DELETE /hr-core/users/:id

Deactivate user (Admin only)

#### GET /hr-core/users/:id/subordinates

Get user's subordinates

---

### Tenant Configuration

#### GET /hr-core/tenant/config

Get tenant configuration

#### PUT /hr-core/tenant/config

Update tenant configuration (Admin only)

#### GET /hr-core/tenant/modules

Get enabled modules

#### POST /hr-core/tenant/modules/:moduleName/enable

Enable a module (Admin only)

#### POST /hr-core/tenant/modules/:moduleName/disable

Disable a module (Admin only)

---

## Tasks Module

### Tasks

#### POST /tasks/tasks

Create a new task (Manager/HR/Admin only)

**Request Body:**

```json
{
  "title": "Implement user authentication",
  "description": "Implement JWT-based authentication system with role-based access control",
  "priority": "high",
  "assignedTo": "60d5ec49f1b2c72b8c8e4f1a",
  "startDate": "2024-12-08",
  "dueDate": "2024-12-15",
  "tags": ["backend", "security"]
}
```

#### GET /tasks/tasks

Get tasks (filtered by role)

**Query Parameters:**

- `status`: Filter by status (assigned, in-progress, submitted, completed, rejected)
- `priority`: Filter by priority (low, medium, high, urgent)
- `assignedTo`: Filter by assignee
- `assignedBy`: Filter by assigner
- `page`: Page number
- `limit`: Items per page

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "60d5ec49f1b2c72b8c8e4f1a",
      "title": "Implement user authentication",
      "description": "...",
      "status": "in-progress",
      "priority": "high",
      "assignedTo": { ... },
      "assignedBy": { ... },
      "startDate": "2024-12-08",
      "dueDate": "2024-12-15"
    }
  ],
  "pagination": {
    "total": 25,
    "page": 1,
    "pages": 2
  }
}
```

#### GET /tasks/tasks/:id

Get single task

#### PUT /tasks/tasks/:id

Update task (Manager/HR/Admin only)

#### PATCH /tasks/tasks/:id/status

Update task status (Employee only)

**Request Body:**

```json
{
  "status": "in-progress"
}
```

**Valid Status Transitions:**

- assigned → in-progress
- in-progress → submitted
- rejected → in-progress

#### DELETE /tasks/tasks/:id

Delete task (Manager/HR/Admin only)

#### GET /tasks/tasks/analytics

Get task analytics

**Query Parameters:**

- `userId`: Filter by user
- `startDate`: Start date
- `endDate`: End date

**Response:**

```json
{
  "success": true,
  "data": {
    "statusDistribution": [
      { "_id": "completed", "count": 15 },
      { "_id": "in-progress", "count": 8 }
    ],
    "priorityDistribution": [...],
    "completionRate": { "total": 50, "completed": 35 },
    "avgCompletionTime": 432000000
  }
}
```

---

### Task Reports

#### POST /tasks/reports/task/:taskId

Submit task report (Employee only)

**Request:** Multipart form data

- `reportText`: Report description (min 50 characters)
- `timeSpent`: JSON string `{"hours": 5, "minutes": 30}`
- `files`: File uploads (max 5 files, 10MB each)

**Example using FormData:**

```javascript
const formData = new FormData();
formData.append("reportText", "Completed authentication implementation...");
formData.append("timeSpent", JSON.stringify({ hours: 8, minutes: 0 }));
formData.append("files", file1);
formData.append("files", file2);
```

#### GET /tasks/reports/task/:taskId

Get all reports for a task

#### GET /tasks/reports/:id

Get single report

#### PATCH /tasks/reports/:id/review

Review report (Manager/HR/Admin only)

**Request Body:**

```json
{
  "action": "approve",
  "comments": "Great work! Well documented."
}
```

Actions: `approve` or `reject`

#### GET /tasks/reports/:reportId/files/:fileId

Download report file

#### GET /tasks/reports/analytics

Get report analytics

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "success": false,
  "message": "Error description"
}
```

**Common HTTP Status Codes:**

- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized (not authenticated)
- `403`: Forbidden (insufficient permissions or module disabled)
- `404`: Not Found
- `500`: Internal Server Error

---

## Module Access Control

If a module is disabled, requests to that module's endpoints will return:

```json
{
  "success": false,
  "message": "Module 'tasks' is not enabled for your organization"
}
```

Status Code: `403`

---

## Role-Based Access

**Role Hierarchy:**

1. Employee (level 1)
2. Manager (level 2)
3. HR (level 3)
4. Admin (level 4)

Higher roles inherit permissions from lower roles.

**Example Access Matrix:**

| Endpoint       | Employee | Manager | HR  | Admin |
| -------------- | -------- | ------- | --- | ----- |
| View own tasks | ✓        | ✓       | ✓   | ✓     |
| Create tasks   | ✗        | ✓       | ✓   | ✓     |
| View all users | ✗        | ✗       | ✓   | ✓     |
| Manage modules | ✗        | ✗       | ✗   | ✓     |

---

## Testing with cURL

### Login

```bash
curl -X POST http://localhost:5000/api/v1/hr-core/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123",
    "tenantId": "company-123"
  }'
```

### Create Task

```bash
curl -X POST http://localhost:5000/api/v1/tasks/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Test Task",
    "description": "This is a test task",
    "priority": "medium",
    "assignedTo": "USER_ID",
    "startDate": "2024-12-08",
    "dueDate": "2024-12-15"
  }'
```

### Submit Report with Files

```bash
curl -X POST http://localhost:5000/api/v1/tasks/reports/task/TASK_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "reportText=Completed the task successfully..." \
  -F 'timeSpent={"hours":5,"minutes":30}' \
  -F "files=@/path/to/file1.pdf" \
  -F "files=@/path/to/file2.png"
```
