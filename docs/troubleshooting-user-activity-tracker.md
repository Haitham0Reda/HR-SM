# Troubleshooting User Activity Tracker

## Current Status
The User Activity Tracker page has been implemented but may not be working as expected. Here's a step-by-step troubleshooting guide.

## Changes Made to Fix Issues

### 1. Fixed PrivateRoute Role Checking
**Issue**: The role hierarchy was backwards, preventing admin users from accessing admin-only pages.

**Fix Applied**: Updated `client/hr-app/src/routes/PrivateRoute.jsx` with proper role hierarchy:
```javascript
const roleHierarchy = {
    'platform_admin': 5,
    'admin': 4,
    'hr': 3,
    'manager': 2,
    'employee': 1
};
```

### 2. Fixed Company Routing in Sidebar
**Issue**: Sidebar was using old `/app/` routes instead of new company-based routes.

**Fix Applied**: Updated `client/hr-app/src/components/DashboardSidebar.jsx`:
- Added `useCompanyRouting` hook
- Changed href from `/app/user-activity-tracker` to `getCompanyRoute('/user-activity-tracker')`

### 3. Created Simple Test Component
**Issue**: Complex component might have dependency issues.

**Fix Applied**: Created `UserActivityTrackerSimple.jsx` for testing basic functionality.

### 4. Temporarily Removed PrivateRoute Wrapper
**Issue**: PrivateRoute might be blocking access.

**Fix Applied**: Temporarily removed PrivateRoute wrapper to test direct access.

## Testing Steps

### Step 1: Check Basic Access
1. **Login as admin user**
2. **Navigate to User Activity Tracker** via sidebar menu
3. **Expected Result**: Should see "User Activity Tracker (Test Version)" page

### Step 2: Check Browser Console
1. **Open browser developer tools** (F12)
2. **Check Console tab** for any errors
3. **Look for**:
   - React errors or warnings
   - Network request failures
   - Authentication issues

### Step 3: Verify User Role
1. **Check the debug information** on the test page
2. **Verify user role** is 'admin' or 'platform_admin'
3. **If role is wrong**: Check user authentication and role assignment

### Step 4: Test API Endpoints
1. **Open browser console**
2. **Run**: `debugUserActivityTracker()`
3. **Check API responses** for any 401/403/404 errors

### Step 5: Check Network Tab
1. **Open Network tab** in developer tools
2. **Navigate to User Activity Tracker**
3. **Look for**:
   - Failed API requests
   - 404 errors for component files
   - Authentication failures

## Common Issues & Solutions

### Issue 1: "Access Denied" Message
**Symptoms**: Page shows "Access denied. This page is only available to admin users."

**Possible Causes**:
- User role is not 'admin' or 'platform_admin'
- User authentication is not working properly
- Role checking logic is incorrect

**Solutions**:
1. Check user role in debug information
2. Verify user is properly authenticated
3. Check PrivateRoute role hierarchy

### Issue 2: Page Not Loading / Blank Screen
**Symptoms**: Navigation to page results in blank screen or loading spinner

**Possible Causes**:
- Component import/export issues
- React compilation errors
- Route configuration problems

**Solutions**:
1. Check browser console for React errors
2. Verify component imports in CompanyRouter
3. Check route path matches sidebar link

### Issue 3: Sidebar Link Not Working
**Symptoms**: Clicking sidebar link doesn't navigate to page

**Possible Causes**:
- Incorrect href in sidebar
- Company routing not working
- Route not defined in CompanyRouter

**Solutions**:
1. Check sidebar href uses `getCompanyRoute()`
2. Verify route exists in CompanyRouter
3. Test direct URL navigation

### Issue 4: API Errors
**Symptoms**: Page loads but shows API errors or no data

**Possible Causes**:
- Backend server not running
- API endpoints not implemented
- Authentication token issues

**Solutions**:
1. Verify backend server is running
2. Check API endpoint implementations
3. Test API calls with proper authentication

## Debug Commands

### Browser Console Commands:
```javascript
// Check authentication
localStorage.getItem('token')

// Check current user
// (This depends on your auth context implementation)

// Test API endpoint
fetch('/api/company-logs/techcorp-solutions-d8f0689c/real-time-sessions', {
    headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
    }
}).then(r => r.json()).then(console.log)

// Run debug utility
debugUserActivityTracker()
```

## Quick Fixes to Try

### Fix 1: Restore Original Component
If simple version works, restore the full component:
```javascript
// In CompanyRouter.jsx
import UserActivityTracker from '../../pages/admin/UserActivityTracker';
```

### Fix 2: Add Back PrivateRoute
If access control is needed:
```javascript
<Route path="user-activity-tracker" element={
    <PrivateRoute requiredRole="admin">
        <UserActivityTracker />
    </PrivateRoute>
} />
```

### Fix 3: Check User Role Assignment
Ensure test user has admin role:
```sql
-- If using database
UPDATE users SET role = 'admin' WHERE email = 'admin@techcorp.com';
```

## Expected Working State

### Successful Navigation:
1. **Sidebar shows** "User Activity Tracker" menu item
2. **Clicking menu item** navigates to `/company/techcorp-solutions/user-activity-tracker`
3. **Page displays** User Activity Tracker interface
4. **No console errors** in browser developer tools
5. **API calls succeed** (may show empty data initially)

### Debug Information Should Show:
```
User Role: admin
User Email: admin@techcorp.com
Tenant ID: techcorp-solutions-d8f0689c
Company Name: TechCorp Solutions
Current URL: /company/techcorp-solutions/user-activity-tracker
```

## Next Steps After Fixing

1. **Restore full component** once basic access works
2. **Test API endpoints** with proper authentication
3. **Verify real-time updates** work correctly
4. **Test filtering and search** functionality
5. **Check performance** with larger datasets

---

**Status**: 🔧 **TROUBLESHOOTING** - Follow steps above to identify and resolve issues