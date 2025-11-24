# Quick Guide: Viewing User Activity Logs

## Common Commands

### View Today's Logs

```bash
# View all activity
type logs\2025-11-24-application.log

# View only errors
type logs\2025-11-24-error.log
```

### Find Specific User Activity

```bash
# PowerShell - All actions by email
Get-Content logs\2025-11-24-application.log | Select-String "john.doe@example.com"

# PowerShell - All actions by username
Get-Content logs\2025-11-24-application.log | Select-String '"username":"john.doe"'
```

### Track Login Activity

```bash
# All successful logins today
Get-Content logs\2025-11-24-application.log | Select-String "LOGIN_SUCCESS"

# All failed login attempts
Get-Content logs\2025-11-24-application.log | Select-String "LOGIN_FAILED"

# Failed logins for specific email
Get-Content logs\2025-11-24-application.log | Select-String "LOGIN_FAILED" | Select-String "john.doe@example.com"
```

### Monitor Access Denials

```bash
# All access denied events
Get-Content logs\2025-11-24-application.log | Select-String "ACCESS_DENIED"

# Unauthorized access attempts
Get-Content logs\2025-11-24-application.log | Select-String "UNAUTHORIZED_ACCESS"
```

### Watch Live Activity

```bash
# PowerShell - Real-time log monitoring
Get-Content logs\2025-11-24-application.log -Wait -Tail 50
```

### Search Across Multiple Days

```bash
# PowerShell - Search all logs
Get-Content logs\*.log | Select-String "john.doe@example.com"

# Search last 7 days
Get-ChildItem logs\*-application.log | Sort-Object LastWriteTime -Descending | Select-Object -First 7 | Get-Content | Select-String "LOGIN"
```

## What You'll See

### Login Success

```
{"level":"info","message":"User logged in successfully","event":"LOGIN_SUCCESS","userId":"...","username":"john.doe","email":"john.doe@example.com","role":"employee","department":"IT","position":"Developer","ip":"::ffff:127.0.0.1","timestamp":"2025-11-24T12:03:47.123Z"}
```

### Failed Login

```
{"level":"warn","message":"Failed login attempt","event":"LOGIN_FAILED","email":"john.doe@example.com","reason":"Invalid password","ip":"::ffff:127.0.0.1","timestamp":"2025-11-24T12:03:47.123Z"}
```

### User Action

```
{"level":"info","message":"User action","userId":"...","username":"john.doe","email":"john.doe@example.com","role":"hr","action":"POST /api/leaves","method":"POST","path":"/api/leaves","statusCode":201,"requestData":{"leaveType":"annual"},"ip":"::ffff:127.0.0.1","timestamp":"2025-11-24T12:03:47.123Z"}
```

## Tips

1. **Use Select-String** (PowerShell) for filtering - it's faster than grep on Windows
2. **Pipe multiple filters** to narrow down results
3. **Use -Wait** flag to monitor logs in real-time
4. **Check both application.log and error.log** for complete picture
5. **Logs are in JSON format** - can be parsed with tools like jq or imported into log analysis software

## Security Monitoring

### Detect Brute Force Attacks

```bash
# Count failed logins by IP
Get-Content logs\*.log | Select-String "LOGIN_FAILED" | Select-String "192.168.1.100" | Measure-Object
```

### Track Admin Actions

```bash
# All actions by admin users
Get-Content logs\2025-11-24-application.log | Select-String '"role":"admin"'
```

### Monitor Sensitive Operations

```bash
# User deletions
Get-Content logs\*.log | Select-String "DELETE /api/users"

# Permission changes
Get-Content logs\*.log | Select-String "/api/permissions"
```
