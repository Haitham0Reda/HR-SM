# Staging Environment Manual Testing Checklist

## Overview

This checklist ensures comprehensive manual testing of the PostgreSQL migration in the staging environment. Complete all sections before approving for production deployment.

**Tester Name**: ___________________  
**Date**: ___________________  
**Environment**: Staging  
**Build Version**: ___________________

---

## 1. Authentication & Authorization

### User Login
- [ ] Login with valid credentials succeeds
- [ ] Login with invalid credentials fails with appropriate error
- [ ] JWT token is generated correctly
- [ ] Token expiration works as expected
- [ ] Logout clears session properly

### Role-Based Access Control
- [ ] Admin can access admin-only features
- [ ] Manager can access manager features
- [ ] Employee has restricted access
- [ ] Unauthorized access attempts are blocked
- [ ] Role changes take effect immediately

### Tenant Isolation
- [ ] Users can only see their tenant's data
- [ ] Cross-tenant access is blocked
- [ ] Tenant switching works (if applicable)
- [ ] Tenant ID is correctly extracted from token/header

**Notes**: _______________________________________________

---

## 2. User Management

### Create User
- [ ] Create new user with all required fields
- [ ] Email validation works
- [ ] Duplicate email is rejected
- [ ] Password requirements enforced
- [ ] User appears in user list immediately
- [ ] User receives welcome email (if applicable)

### Read/View Users
- [ ] List all users in tenant
- [ ] View user profile details
- [ ] Search users by name
- [ ] Search users by email
- [ ] Filter users by role
- [ ] Filter users by department
- [ ] Pagination works correctly
- [ ] Sort by different columns works

### Update User
- [ ] Update user profile information
- [ ] Update user role
- [ ] Update user department
- [ ] Deactivate user
- [ ] Reactivate user
- [ ] Changes reflect immediately
- [ ] Audit log records changes (if applicable)

### Delete User
- [ ] Delete user (soft delete)
- [ ] Deleted user doesn't appear in lists
- [ ] Deleted user data is preserved
- [ ] Cannot delete user with dependencies (if applicable)

**Notes**: _______________________________________________

---

## 3. Department Management

- [ ] Create new department
- [ ] View department list
- [ ] Update department details
- [ ] Delete department
- [ ] Assign users to department
- [ ] View users in department
- [ ] Department hierarchy works (if applicable)

**Notes**: _______________________________________________

---

## 4. Attendance Management

### Clock In/Out
- [ ] Employee can clock in
- [ ] Clock in records correct timestamp
- [ ] Employee can clock out
- [ ] Clock out records correct timestamp
- [ ] Cannot clock in twice without clock out
- [ ] Manual clock in/out by admin works

### View Attendance
- [ ] View own attendance records
- [ ] Manager can view team attendance
- [ ] Admin can view all attendance
- [ ] Filter by date range
- [ ] Filter by employee
- [ ] Export attendance report

### Attendance Reports
- [ ] Generate daily attendance report
- [ ] Generate weekly attendance report
- [ ] Generate monthly attendance report
- [ ] Report shows correct calculations
- [ ] Report export works (PDF/Excel)

**Notes**: _______________________________________________

---

## 5. Vacation Management

- [ ] Employee can request vacation
- [ ] Manager receives vacation request notification
- [ ] Manager can approve vacation request
- [ ] Manager can reject vacation request
- [ ] Employee sees vacation status
- [ ] Vacation balance is updated correctly
- [ ] Cannot request vacation with insufficient balance
- [ ] View vacation calendar

**Notes**: _______________________________________________

---

## 6. Overtime Management

- [ ] Employee can submit overtime request
- [ ] Manager can approve overtime
- [ ] Manager can reject overtime
- [ ] Overtime hours calculated correctly
- [ ] Overtime compensation calculated correctly
- [ ] View overtime reports

**Notes**: _______________________________________________

---

## 7. Payroll Management

- [ ] View payroll records
- [ ] Calculate payroll for period
- [ ] Payroll calculations are accurate
- [ ] Deductions applied correctly
- [ ] Bonuses applied correctly
- [ ] Generate payroll report
- [ ] Export payroll data
- [ ] Payroll history accessible

**Notes**: _______________________________________________

---

## 8. Survey Management

### Create Survey
- [ ] Create new survey
- [ ] Add multiple question types
- [ ] Set survey deadline
- [ ] Assign survey to users/departments
- [ ] Preview survey before publishing
- [ ] Publish survey

### Take Survey
- [ ] Employee can view assigned surveys
- [ ] Employee can submit survey responses
- [ ] Cannot submit survey twice
- [ ] Survey responses saved correctly
- [ ] Survey deadline enforced

### Survey Results
- [ ] View survey results
- [ ] Results show correct statistics
- [ ] Export survey results
- [ ] Anonymous surveys maintain anonymity

**Notes**: _______________________________________________

---

## 9. Event Management

- [ ] Create new event
- [ ] View event calendar
- [ ] Update event details
- [ ] Delete event
- [ ] RSVP to event
- [ ] View event attendees
- [ ] Event notifications sent
- [ ] Recurring events work (if applicable)

**Notes**: _______________________________________________

---

## 10. Position Management

- [ ] Create new position
- [ ] View position list
- [ ] Update position details
- [ ] Delete position
- [ ] Assign users to position
- [ ] View users in position

**Notes**: _______________________________________________

---

## 11. License Validation

### License Server Communication
- [ ] Main app connects to license server
- [ ] License validation API responds
- [ ] Valid license returns correct data
- [ ] Invalid license is rejected
- [ ] Expired license is detected

### Module Access Control
- [ ] Enabled modules are accessible
- [ ] Disabled modules are blocked
- [ ] Module list is accurate
- [ ] Module changes take effect immediately

### Cache Functionality
- [ ] License data is cached in main app
- [ ] Cache is used when license server unavailable
- [ ] Cache expires after 24 hours
- [ ] Cache refresh works correctly
- [ ] Stale cache is detected

### License Endpoints
- [ ] GET /api/license/validate works
- [ ] GET /api/license/modules works
- [ ] GET /api/license/cache works
- [ ] POST /api/license/refresh works
- [ ] Error responses are appropriate

**Notes**: _______________________________________________

---

## 12. Multi-Tenancy Verification

### Data Isolation
- [ ] Tenant A cannot see Tenant B's users
- [ ] Tenant A cannot see Tenant B's attendance
- [ ] Tenant A cannot see Tenant B's payroll
- [ ] Tenant A cannot see Tenant B's surveys
- [ ] All queries include tenant_id filter

### Cross-Tenant Access Prevention
- [ ] Cannot access other tenant's data via API
- [ ] Cannot access other tenant's data via URL manipulation
- [ ] Cannot access other tenant's data via direct database query
- [ ] Tenant ID validation works

### Tenant Switching (if applicable)
- [ ] Switch between tenants works
- [ ] Data updates after tenant switch
- [ ] Permissions update after tenant switch

**Notes**: _______________________________________________

---

## 13. Performance Testing

### Page Load Times
- [ ] Dashboard loads in < 2 seconds
- [ ] User list loads in < 2 seconds
- [ ] Attendance list loads in < 2 seconds
- [ ] Reports generate in < 5 seconds

### API Response Times
- [ ] GET requests respond in < 500ms
- [ ] POST requests respond in < 1000ms
- [ ] PUT requests respond in < 1000ms
- [ ] DELETE requests respond in < 500ms

### Large Dataset Handling
- [ ] List with 1000+ records loads properly
- [ ] Pagination works with large datasets
- [ ] Search works with large datasets
- [ ] Export works with large datasets

### Connection Pool
- [ ] Connection pool is stable
- [ ] No connection leaks detected
- [ ] Pool size is appropriate
- [ ] Connection errors handled gracefully

**Notes**: _______________________________________________

---

## 14. Error Handling

### Validation Errors
- [ ] Required field errors shown
- [ ] Format validation errors shown
- [ ] Unique constraint errors shown
- [ ] Foreign key errors shown

### Database Errors
- [ ] Connection errors handled gracefully
- [ ] Timeout errors handled gracefully
- [ ] Constraint violation errors shown appropriately
- [ ] Transaction errors handled correctly

### Application Errors
- [ ] 404 errors shown for missing resources
- [ ] 403 errors shown for unauthorized access
- [ ] 500 errors logged and shown appropriately
- [ ] Error messages are user-friendly

**Notes**: _______________________________________________

---

## 15. Data Integrity

### Relationships
- [ ] User-Department relationship works
- [ ] User-Position relationship works
- [ ] Attendance-User relationship works
- [ ] Payroll-User relationship works
- [ ] Foreign keys enforced

### Cascading Operations
- [ ] Deleting department updates users (if applicable)
- [ ] Deleting user handles related records appropriately
- [ ] Cascade deletes work as expected

### Data Consistency
- [ ] No orphaned records
- [ ] No duplicate records
- [ ] All required fields populated
- [ ] Data types are correct

**Notes**: _______________________________________________

---

## 16. Backup & Restore

- [ ] Backup script runs successfully
- [ ] Backup file is created
- [ ] Backup file size is reasonable
- [ ] Restore script runs successfully
- [ ] Restored data is complete
- [ ] Restored data is accurate

**Notes**: _______________________________________________

---

## 17. Monitoring & Logging

### Performance Monitoring
- [ ] Slow query logging works
- [ ] Query statistics accessible
- [ ] Connection pool status visible
- [ ] Performance metrics accurate

### Error Logging
- [ ] Errors are logged with details
- [ ] SQL queries logged on errors
- [ ] Stack traces captured
- [ ] Log levels work correctly

### Monitoring Endpoints
- [ ] GET /api/monitoring/health works
- [ ] GET /api/monitoring/pool-status works
- [ ] GET /api/monitoring/slow-queries works
- [ ] GET /api/monitoring/stats works

**Notes**: _______________________________________________

---

## 18. Security

### SQL Injection Prevention
- [ ] Parameterized queries used everywhere
- [ ] No raw SQL with user input
- [ ] Input validation works

### Authentication Security
- [ ] Passwords are hashed
- [ ] Tokens are secure
- [ ] Session management secure

### Authorization Security
- [ ] Role checks enforced
- [ ] Tenant isolation enforced
- [ ] API endpoints protected

**Notes**: _______________________________________________

---

## 19. Regression Testing

### Previously Working Features
- [ ] All features from MongoDB version still work
- [ ] No functionality lost
- [ ] No performance degradation
- [ ] No new bugs introduced

### API Compatibility
- [ ] Request formats unchanged
- [ ] Response formats unchanged
- [ ] Error formats unchanged
- [ ] Status codes unchanged

**Notes**: _______________________________________________

---

## 20. Edge Cases

- [ ] Empty result sets handled
- [ ] Null values handled
- [ ] Very long strings handled
- [ ] Special characters handled
- [ ] Concurrent operations handled
- [ ] Race conditions prevented
- [ ] Deadlocks prevented

**Notes**: _______________________________________________

---

## Summary

### Test Results
- **Total Tests**: _____
- **Passed**: _____
- **Failed**: _____
- **Blocked**: _____
- **Pass Rate**: _____%

### Critical Issues Found
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### Non-Critical Issues Found
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### Performance Observations
_______________________________________________
_______________________________________________
_______________________________________________

### Recommendations
_______________________________________________
_______________________________________________
_______________________________________________

### Sign-Off

**Ready for Production?**: [ ] YES  [ ] NO  [ ] WITH FIXES

**Tester Signature**: ___________________  
**Date**: ___________________

**QA Lead Approval**: ___________________  
**Date**: ___________________

**Technical Lead Approval**: ___________________  
**Date**: ___________________

---

## Next Steps

If all tests pass:
1. Document any minor issues for future fixes
2. Get stakeholder approval
3. Schedule production migration
4. Prepare production migration plan
5. Ensure rollback plan is ready

If critical issues found:
1. Document all issues in detail
2. Prioritize fixes
3. Fix critical issues
4. Re-run staging migration
5. Re-test all affected areas
