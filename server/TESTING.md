# API Route Testing Guide

This directory contains comprehensive testing tools for all HR-SM API routes.

## 📁 Testing Files

### 1. `test-routes.rest` - REST Client File

Interactive API testing using REST Client VSCode extension or similar tools.

**Features:**

- ✅ All 23 route modules covered
- ✅ 100+ endpoint examples
- ✅ Request/response examples
- ✅ Variable support for IDs and tokens

**How to Use:**

1. **Install REST Client Extension** (VSCode):

   - Search for "REST Client" by Huachao Mao
   - Install the extension

2. **Update Variables**:

   ```rest
   @baseUrl = http://localhost:5000
   @token = your-jwt-token-here
   ```

3. **Run Tests**:

   - Click "Send Request" above any request
   - Or use `Ctrl+Alt+R` / `Cmd+Alt+R`

4. **View Responses**:
   - Responses appear in a new panel
   - Status codes, headers, and body shown

### 2. `test-routes.js` - Automated Test Script

Automated testing script using Node.js native fetch API.

**Features:**

- ✅ Automated test execution
- ✅ Color-coded console output
- ✅ Pass/fail statistics
- ✅ Error logging
- ✅ Exit codes for CI/CD

**How to Use:**

1. **Start the Server**:

   ```bash
   npm run server
   # or
   node server/index.js
   ```

2. **Run Tests** (in another terminal):

   ```bash
   node server/test-routes.js
   ```

3. **With Custom URL**:

   ```bash
   BASE_URL=http://localhost:3000 node server/test-routes.js
   ```

4. **Output Example**:

   ```
   ========================================
     HR-SM API ROUTE TESTING
   ========================================

   [ROOT ENDPOINT]
   ✓ PASS GET    /                                                  [200]

   [USER ROUTES]
   ✓ PASS POST   /api/users/register                                [201]
   ✓ PASS POST   /api/users/login                                   [200]
   ✓ PASS GET    /api/users                                         [200]

   ========================================
     TEST SUMMARY
   ========================================
   Total Tests:    30
   Passed:         28
   Failed:         2
   Pass Rate:      93.33%
   ========================================
   ```

## 📋 Test Coverage

### Routes Tested (23 modules):

1. ✅ **User Routes** (`/api/users`)

   - Register, Login, Profile, Update, Logout

2. ✅ **Announcement Routes** (`/api/announcements`)

   - CRUD operations, targeting

3. ✅ **Analytics Routes** (`/api/analytics`)

   - HR dashboard, attendance, leave, payroll analytics

4. ✅ **Attendance Routes** (`/api/attendance`)

   - Check-in/out, records management

5. ✅ **Backup Routes** (`/api/backups`)

   - Configuration, execution, history

6. ✅ **Department Routes** (`/api/departments`)

   - CRUD operations

7. ✅ **Document Routes** (`/api/documents`)

   - Upload, manage employee documents

8. ✅ **Document Template Routes** (`/api/document-templates`)

   - Template management

9. ✅ **Event Routes** (`/api/events`)

   - Calendar events

10. ✅ **Holiday Routes** (`/api/holidays`)

    - Holiday management, suggestions

11. ✅ **Leave Routes** (`/api/leaves`)

    - Leave requests, approvals

12. ✅ **Mixed Vacation Routes** (`/api/mixed-vacations`)

    - Policy creation, testing, application

13. ✅ **Notification Routes** (`/api/notifications`)

    - User notifications

14. ✅ **Payroll Routes** (`/api/payrolls`)

    - Salary management

15. ✅ **Permission Routes** (`/api/permissions`)

    - Permission requests, approvals

16. ✅ **Position Routes** (`/api/positions`)

    - Job positions

17. ✅ **Report Routes** (`/api/reports`)

    - Custom reports, execution, export

18. ✅ **Request Routes** (`/api/requests`)

    - General requests

19. ✅ **Resigned Employee Routes** (`/api/resigned-employees`)

    - Resignation management, letters

20. ✅ **School Routes** (`/api/schools`)

    - Campus management

21. ✅ **Security Settings Routes** (`/api/security/settings`)

    - 2FA, IP whitelist, password policies

22. ✅ **Security Audit Routes** (`/api/security/audit`)

    - Audit logs, failed logins

23. ✅ **Survey Routes** (`/api/surveys`)
    - Survey creation, responses, analytics

## 🔧 Prerequisites

### For REST Client (.rest file):

- VSCode with REST Client extension
- Server running on configured port
- Valid authentication token

### For Automated Tests (.js file):

- Node.js v18+ (for native fetch API)
- Server running
- MongoDB connected

## 💡 Tips

### Getting Authentication Token:

1. **Via REST Client**:

   - Send POST request to `/api/users/login`
   - Copy token from response cookie
   - Update `@token` variable

2. **Via Automated Script**:
   - Token is extracted automatically from login response
   - Check console output for token value

### Common Issues:

**401 Unauthorized**:

- Token expired or invalid
- Login again to get fresh token

**404 Not Found**:

- Check if route exists in `server/index.js`
- Verify endpoint spelling

**500 Internal Server Error**:

- Check server logs
- Verify MongoDB connection
- Check for missing required fields

## 🚀 CI/CD Integration

Add to your CI pipeline:

```yaml
# .github/workflows/test.yml
- name: Test API Routes
  run: |
    npm run server &
    sleep 5
    node server/test-routes.js
```

## 📊 Extending Tests

### Adding New Route Tests:

**In test-routes.rest**:

```rest
### Get new endpoint
GET {{baseUrl}}/api/new-endpoint
Cookie: token={{token}}
```

**In test-routes.js**:

```javascript
result = await makeRequest("GET", "/api/new-endpoint");
logTest("NewModule", "GET", "/api/new-endpoint", result);
result.ok ? passed++ : failed++;
```

## 📝 Notes

- Replace placeholder IDs ({{employeeId}}, {{surveyId}}, etc.) with actual values
- Some routes require specific roles (Admin/HR)
- File upload routes need multipart/form-data
- Automated script tests GET endpoints primarily (safe operations)
- For POST/PUT/DELETE testing, use the .rest file manually

---

**Happy Testing! 🎉**
