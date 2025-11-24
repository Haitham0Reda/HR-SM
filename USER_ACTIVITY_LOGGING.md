# User Activity Logging Guide

This guide explains the enhanced user activity logging system that tracks detailed information about user logins and actions.

## What's Logged

### 1. Authentication Events

#### Successful Login

```json
{
  "level": "info",
  "message": "User logged in successfully",
  "event": "LOGIN_SUCCESS",
  "userId": "507f1f77bcf86cd799439011",
  "username": "john.doe",
  "email": "john.doe@example.com",
  "role": "employee",
  "department": "IT Department",
  "position": "Software Developer",
  "school": "School of Engineering",
  "ip": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "timestamp": "2025-11-24T12:03:47.123Z"
}
```

#### Failed Login Attempts

```json
{
  "level": "warn",
  "message": "Failed login attempt",
  "event": "LOGIN_FAILED",
  "email": "john.doe@example.com",
  "reason": "Invalid password",
  "ip": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "timestamp": "2025-11-24T12:03:47.123Z"
}
```

#### Unauthorized Access

```json
{
  "level": "warn",
  "message": "Unauthorized access attempt",
  "event": "UNAUTHORIZED_ACCESS",
  "reason": "No token provided",
  "path": "/api/users/profile",
  "method": "GET",
  "ip": "192.168.1.100",
  "timestamp": "2025-11-24T12:03:47.123Z"
}
```

### 2. User Actions (Authenticated Requests)

Every action by an authenticated user is logged with full context:

```json
{
  "level": "info",
  "message": "User action",
  "userId": "507f1f77bcf86cd799439011",
  "username": "john.doe",
  "email": "john.doe@example.com",
  "role": "hr",
  "department": "Human Resources",
  "position": "HR Manager",
  "action": "POST /api/leaves",
  "method": "POST",
  "path": "/api/leaves",
  "statusCode": 201,
  "requestData": {
    "leaveType": "annual",
    "startDate": "2025-12-01",
    "endDate": "2025-12-05"
  },
  "ip": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "timestamp": "2025-11-24T12:03:47.123Z"
}
```

### 3. Access Control Events

When users try to access resources they don't have permission for:

```json
{
  "level": "warn",
  "message": "Access control event",
  "event": "ACCESS_DENIED",
  "userId": "507f1f77bcf86cd799439011",
  "username": "john.doe",
  "email": "john.doe@example.com",
  "role": "employee",
  "requiredRoles": ["hr", "admin"],
  "userRole": "employee",
  "reason": "Insufficient permissions",
  "path": "/api/users",
  "method": "GET",
  "ip": "192.168.1.100",
  "timestamp": "2025-11-24T12:03:47.123Z"
}
```

## Features

### Automatic Logging

- ✅ All login attempts (successful and failed)
- ✅ All authenticated user actions
- ✅ Access denied events
- ✅ Token expiration events
- ✅ Unauthorized access attempts

### User Context

Every log includes:

- User ID, username, email
- User role (employee, admin, hr, manager, etc.)
- Department and position (if available)
- School affiliation

### Request Details

- HTTP method and path
- Response status code
- IP address
- User agent (browser/device info)
- Request body (sanitized - passwords removed)
- Query parameters

### Security

- Passwords are automatically removed from logs
- Tokens are excluded
- Sensitive fields are sanitized

## Viewing User Activity

### View Today's Activity

```bash
# Windows CMD
type logs\2025-11-24-application.log

# PowerShell
Get-Content logs\2025-11-24-application.log
```

### Filter by User

```bash
# PowerShell - Find all actions by a specific user
Get-Content logs\2025-11-24-application.log | Select-String "john.doe"

# PowerShell - Find all actions by user ID
Get-Content logs\2025-11-24-application.log | Select-String "507f1f77bcf86cd799439011"
```

### Filter by Event Type

```bash
# PowerShell - Find all login attempts
Get-Content logs\2025-11-24-application.log | Select-String "LOGIN"

# PowerShell - Find all failed logins
Get-Content logs\2025-11-24-application.log | Select-String "LOGIN_FAILED"

# PowerShell - Find all access denied events
Get-Content logs\2025-11-24-application.log | Select-String "ACCESS_DENIED"
```

### Watch Logs in Real-Time

```bash
# PowerShell - Watch logs as they happen
Get-Content logs\2025-11-24-application.log -Wait -Tail 50
```

## Using in Your Code

### Log Authentication Events

```javascript
import { logAuthEvent } from "../middleware/activityLogger.js";

// In your controller
export const logout = async (req, res) => {
  logAuthEvent("LOGOUT", req.user, req);
  // ... logout logic
};
```

### Log Data Modifications

```javascript
import { logDataModification } from "../middleware/activityLogger.js";

export const updateEmployee = async (req, res) => {
  const employee = await Employee.findByIdAndUpdate(req.params.id, req.body);

  logDataModification("UPDATE", "Employee", employee._id, req.user, {
    fields: Object.keys(req.body),
  });

  res.json(employee);
};
```

### Log Custom Access Control

```javascript
import { logAccessControl } from "../middleware/activityLogger.js";

export const viewSalary = async (req, res) => {
  if (!canViewSalary(req.user)) {
    logAccessControl("SALARY_ACCESS_DENIED", req.user, req, {
      targetUserId: req.params.id,
    });
    return res.status(403).json({ message: "Cannot view salary" });
  }
  // ... view salary logic
};
```

## Example Log Analysis

### Find Suspicious Activity

```bash
# Multiple failed login attempts from same IP
Get-Content logs\*.log | Select-String "LOGIN_FAILED" | Select-String "192.168.1.100"

# Access denied events for a specific user
Get-Content logs\*.log | Select-String "ACCESS_DENIED" | Select-String "john.doe"

# All admin actions
Get-Content logs\*.log | Select-String '"role":"admin"'
```

### Track User Journey

```bash
# All actions by a specific user today
Get-Content logs\2025-11-24-application.log | Select-String "john.doe@example.com"
```

### Monitor Specific Resources

```bash
# All leave requests
Get-Content logs\*.log | Select-String "/api/leaves"

# All user modifications
Get-Content logs\*.log | Select-String "POST /api/users"
```

## Log Levels

- **info** - Normal operations (logins, user actions)
- **warn** - Failed attempts, access denied, token issues
- **error** - Server errors, exceptions

## Privacy & Compliance

### What's NOT Logged

- Passwords (automatically removed)
- Authentication tokens
- Credit card numbers
- Other sensitive PII (can be configured)

### Retention

- Application logs: 14 days
- Error logs: 30 days
- Old logs are automatically compressed
- Logs are automatically deleted after retention period

## Troubleshooting

### No user information in logs?

- Check that the user is authenticated (has valid token)
- Verify the `protect` middleware is applied to the route
- Ensure `logUserActivity` middleware is loaded in server/index.js

### Logs too verbose?

- Adjust LOG_LEVEL in .env (error, warn, info, debug)
- Filter specific routes if needed

### Need more detail?

- Add custom logging in your controllers
- Use the helper functions (logAuthEvent, logDataModification, logAccessControl)

## Best Practices

1. **Review logs regularly** for security incidents
2. **Monitor failed login attempts** - may indicate brute force attacks
3. **Track access denied events** - may indicate privilege escalation attempts
4. **Archive important logs** before they're deleted
5. **Use log analysis tools** for large-scale monitoring
6. **Set up alerts** for critical events (multiple failed logins, etc.)

## Integration with Security Audit

The logging system works alongside the existing security audit system:

- Logs provide detailed real-time information
- Security audit provides historical analysis
- Both systems complement each other for comprehensive monitoring
