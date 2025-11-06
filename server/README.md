# HR-SM Server API Testing

## Overview

This directory contains comprehensive testing scripts for the HR-SM (Human Resources System Management) API. The testing suite includes multiple approaches to evaluate API functionality, authentication, and performance.

**Note**: All testing scripts have been moved to the [testing](file:///D:/work/HR-SM/server/testing) directory. Please refer to [testing/README.md](file:///D:/work/HR-SM/server/testing/README.md) for detailed documentation.

## Test Scripts Location

All test scripts are now located in the [testing](file:///D:/work/HR-SM/server/testing) directory:
- [testing/test-routes.js](file:///D:/work/HR-SM/server/testing/test-routes.js) - Basic route testing
- [testing/test-authenticated-routes.js](file:///D:/work/HR-SM/server/testing/test-authenticated-routes.js) - Authenticated route testing
- [testing/test-all-routes.js](file:///D:/work/HR-SM/server/testing/test-all-routes.js) - Comprehensive testing with reports
- [testing/run-all-api-tests.js](file:///D:/work/HR-SM/server/testing/run-all-api-tests.js) - All tests runner

## Documentation

For detailed documentation on running tests, please see:
- [testing/README.md](file:///D:/work/HR-SM/server/testing/README.md) - Complete testing documentation
- [API_TEST_COMPREHENSIVE_SUMMARY.md](file:///D:/work/HR-SM/API_TEST_COMPREHENSIVE_SUMMARY.md) - Test results summary

## Test Categories

The comprehensive testing script categorizes endpoints by functionality:

1. **User Management** - `/api/users`
2. **School Management** - `/api/schools`
3. **Department Management** - `/api/departments`
4. **Position Management** - `/api/positions`
5. **Announcements** - `/api/announcements`
6. **Attendance** - `/api/attendance`
7. **Leave Management** - `/api/leaves`
8. **Permissions** - `/api/permissions`
9. **Payroll** - `/api/payrolls`
10. **Documents** - `/api/documents`
11. **Document Templates** - `/api/document-templates`
12. **Events** - `/api/events`
13. **Holidays** - `/api/holidays`
14. **Notifications** - `/api/notifications`
15. **Requests** - `/api/requests`
16. **Reports** - `/api/reports`
17. **Backups** - `/api/backups`
18. **Analytics** - `/api/analytics`
19. **Mixed Vacations** - `/api/mixed-vacations`
20. **Resigned Employees** - `/api/resigned-employees`
21. **Security** - `/api/security`
22. **Surveys** - `/api/surveys`

## Common Issues Identified

### Route Parameter Conflicts
Several endpoints experience conflicts between named routes and ID-based routes:
- `/api/users/profile` conflicts with `/api/users/:id`
- `/api/announcements/active` conflicts with `/api/announcements/:id`
- Similar issues exist in notifications, requests, security, and analytics routes

### Missing Endpoints
- Holiday management routes (`/api/holidays`)
- Some analytics endpoints (`/api/analytics/*`)
- Some permission endpoints (`/api/permissions`)

### Validation Issues
- User registration requires additional field validation
- Announcement creation requires proper targetAudience format
- Attendance creation requires employee field

## Recommendations

1. **Fix Route Conflicts**: Reorganize route structure to separate named routes from ID-based routes
2. **Implement Missing Endpoints**: Complete holiday, analytics, and permission routes
3. **Improve Validation**: Add proper validation for all POST/PUT operations
4. **Enhance Permission System**: Debug and fix permission checking middleware

## Contributing

To add new tests:
1. Add test functions in `test-all-routes.js`
2. Update the test categories documentation
3. Ensure new tests follow the existing pattern
4. Verify markdown report generation works correctly

## License

This testing suite is part of the HR-SM project and follows the same license terms.