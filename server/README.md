# HR-SM Server API Documentation

## Overview

The HR-SM backend is built with Node.js, Express.js, and MongoDB, providing a comprehensive RESTful API for human resources management.

## Base URL

```
Development: http://localhost:5000/api
Production: https://your-domain.com/api
```

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

### Authentication Endpoints

#### Login

```http
POST /api/users/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "user@example.com",
    "role": "employee"
  }
}
```

#### Register

```http
POST /api/users/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "user@example.com",
  "password": "password123",
  "role": "employee"
}
```

## API Endpoints

### Users

#### Get All Users

```http
GET /api/users
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (number): Page number for pagination
- `limit` (number): Items per page
- `search` (string): Search by name or email
- `role` (string): Filter by role
- `department` (string): Filter by department ID

#### Get User by ID

```http
GET /api/users/:id
Authorization: Bearer <token>
```

#### Create User

```http
POST /api/users
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "password": "password123",
  "role": "employee",
  "department": "507f1f77bcf86cd799439011",
  "position": "507f1f77bcf86cd799439012"
}
```

#### Update User

```http
PUT /api/users/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Jane Smith Updated",
  "department": "507f1f77bcf86cd799439013"
}
```

#### Delete User

```http
DELETE /api/users/:id
Authorization: Bearer <token>
```

#### Bulk Create Users

```http
POST /api/users/bulk-create
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <excel_file>
```

### Departments

#### Get All Departments

```http
GET /api/departments
Authorization: Bearer <token>
```

#### Create Department

```http
POST /api/departments
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Engineering",
  "description": "Software development team",
  "manager": "507f1f77bcf86cd799439011"
}
```

### Positions

#### Get All Positions

```http
GET /api/positions
Authorization: Bearer <token>
```

#### Create Position

```http
POST /api/positions
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Senior Developer",
  "description": "Lead development projects",
  "department": "507f1f77bcf86cd799439011"
}
```

### Attendance

#### Check In

```http
POST /api/attendance/check-in
Authorization: Bearer <token>
Content-Type: application/json

{
  "location": "Office",
  "notes": "On time"
}
```

#### Check Out

```http
POST /api/attendance/check-out
Authorization: Bearer <token>
Content-Type: application/json

{
  "notes": "Completed tasks"
}
```

#### Get Attendance Records

```http
GET /api/attendance
Authorization: Bearer <token>
```

**Query Parameters:**
- `userId` (string): Filter by user ID
- `startDate` (date): Start date for range
- `endDate` (date): End date for range
- `status` (string): Filter by status

### Leave Management

#### Create Leave Request

```http
POST /api/leaves
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "annual",
  "startDate": "2024-12-10",
  "endDate": "2024-12-15",
  "reason": "Family vacation",
  "halfDay": false
}
```

**Leave Types:**
- `annual`: Annual leave
- `casual`: Casual leave
- `sick`: Sick leave

#### Get Leave Requests

```http
GET /api/leaves
Authorization: Bearer <token>
```

**Query Parameters:**
- `userId` (string): Filter by user ID
- `status` (string): pending, approved, rejected
- `type` (string): Leave type

#### Approve/Reject Leave

```http
PUT /api/leaves/:id/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "approved",
  "comments": "Approved for vacation"
}
```

### Permissions

#### Create Permission Request

```http
POST /api/permissions
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "late_arrival",
  "date": "2024-12-05",
  "duration": 30,
  "reason": "Doctor appointment"
}
```

**Permission Types:**
- `late_arrival`: Late arrival
- `early_departure`: Early departure
- `overtime`: Overtime work
- `mission`: Business mission

#### Get Permission Requests

```http
GET /api/permissions
Authorization: Bearer <token>
```

### Payroll

#### Get Payroll Records

```http
GET /api/payroll
Authorization: Bearer <token>
```

**Query Parameters:**
- `userId` (string): Filter by user ID
- `month` (number): Month (1-12)
- `year` (number): Year

#### Process Payroll

```http
POST /api/payroll/process
Authorization: Bearer <token>
Content-Type: application/json

{
  "month": 12,
  "year": 2024,
  "users": ["507f1f77bcf86cd799439011"]
}
```

### Documents

#### Upload Document

```http
POST /api/documents
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <document_file>
category: "contract"
confidential: true
```

#### Get Documents

```http
GET /api/documents
Authorization: Bearer <token>
```

#### Download Document

```http
GET /api/documents/:id/download
Authorization: Bearer <token>
```

### Notifications

#### Get Notifications

```http
GET /api/notifications
Authorization: Bearer <token>
```

**Query Parameters:**
- `read` (boolean): Filter by read status
- `type` (string): Filter by notification type

#### Mark as Read

```http
PUT /api/notifications/:id/read
Authorization: Bearer <token>
```

### Reports

#### Generate Attendance Report

```http
POST /api/reports/attendance
Authorization: Bearer <token>
Content-Type: application/json

{
  "startDate": "2024-12-01",
  "endDate": "2024-12-31",
  "department": "507f1f77bcf86cd799439011"
}
```

#### Generate Payroll Report

```http
POST /api/reports/payroll
Authorization: Bearer <token>
Content-Type: application/json

{
  "month": 12,
  "year": 2024
}
```

## Response Format

### Success Response

```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Operation successful"
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message",
  "details": { /* additional error details */ }
}
```

## Status Codes

- `200 OK`: Successful GET request
- `201 Created`: Successful POST request
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

## Rate Limiting

API requests are limited to:
- **100 requests per minute** for authenticated users
- **20 requests per minute** for unauthenticated users

## Pagination

List endpoints support pagination:

```http
GET /api/users?page=1&limit=20
```

**Response:**
```json
{
  "success": true,
  "data": [ /* items */ ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

## Role-Based Access Control

### Roles

- **admin**: Full system access
- **hr**: HR management functions
- **manager**: Team management functions
- **employee**: Basic employee functions

### Permission Matrix

| Endpoint | Admin | HR | Manager | Employee |
|----------|-------|----|---------| ---------|
| Users (CRUD) | ✅ | ✅ | ❌ | ❌ |
| Departments | ✅ | ✅ | ✅ | ❌ |
| Attendance | ✅ | ✅ | ✅ | ✅ |
| Leave Approval | ✅ | ✅ | ✅ | ❌ |
| Payroll | ✅ | ✅ | ❌ | ❌ |
| Reports | ✅ | ✅ | ✅ | ❌ |

## Webhooks

Configure webhooks for real-time notifications:

```http
POST /api/webhooks
Authorization: Bearer <token>
Content-Type: application/json

{
  "url": "https://your-app.com/webhook",
  "events": ["leave.created", "attendance.checked_in"],
  "secret": "your_webhook_secret"
}
```

## Testing

Use the provided Postman collection for API testing:

```bash
# Import collection
postman-collection.json
```

## Error Handling

All errors follow a consistent format:

```json
{
  "success": false,
  "error": "Validation error",
  "details": {
    "field": "email",
    "message": "Email is required"
  }
}
```

## Support

For API support:
- GitHub Issues: [github.com/your-repo/issues](https://github.com/your-repo/issues)
- Email: api-support@hr-sm.com
- Documentation: [docs.hr-sm.com](https://docs.hr-sm.com)

**Last Updated**: December 4, 2024
