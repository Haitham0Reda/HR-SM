# Frontend Debugging Guide - Announcements & Notifications Not Showing

## Current Status ✅

**Backend APIs are working correctly:**
- ✅ `/api/v1/announcements` → 401 Unauthorized (requires auth)
- ✅ `/api/v1/notifications` → 401 Unauthorized (requires auth)
- ✅ Sample data exists in database (3 announcements, 6 notifications)

**Issue:** Frontend is not displaying the data despite APIs working.

## Debugging Steps

### 1. Check Browser Network Tab 🔍

**Open browser developer tools and check:**

1. **Go to Network tab**
2. **Refresh the page or navigate to announcements/notifications**
3. **Look for API calls to:**
   - `GET /api/v1/announcements`
   - `GET /api/v1/notifications`

**Expected Results:**
- ✅ **200 OK** with data = Frontend auth working, data should display
- ❌ **401 Unauthorized** = Frontend authentication issue
- ❌ **403 Forbidden** = License validation issue
- ❌ **404 Not Found** = Route registration issue (should be fixed)

### 2. Check Authentication Status 🔐

**In browser console, check:**
```javascript
// Check if token exists
localStorage.getItem('token')
localStorage.getItem('tenant_token')

// Check if user is logged in
// (Look for user data in React DevTools or console)
```

**If no token:**
- User needs to log in again
- Check login functionality

### 3. Check Frontend Service Calls 📞

**Components to check:**

#### AnnouncementsPage.jsx
- Location: `client/hr-app/src/pages/announcements/AnnouncementsPage.jsx`
- Function: `fetchAnnouncements()`
- Service: `announcementService.getAll()`

#### DashboardHeader.jsx (Notifications)
- Location: `client/hr-app/src/components/DashboardHeader.jsx`
- Function: `fetchNotifications()`
- Service: `notificationService.getAll()`

### 4. Common Frontend Issues & Solutions

#### Issue 1: Authentication Headers Missing
**Symptoms:** API calls return 401
**Solution:** Check `client/hr-app/src/services/api.js`
```javascript
// Should automatically add token
const tenantToken = localStorage.getItem('tenant_token') || localStorage.getItem('token');
if (tenantToken) {
    config.headers.Authorization = `Bearer ${tenantToken}`;
}
```

#### Issue 2: Wrong API Base URL
**Symptoms:** Network errors or 404s
**Check:** `client/hr-app/src/services/api.js`
```javascript
baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1'
```

#### Issue 3: Data Processing Issues
**Symptoms:** API returns data but components show empty
**Check:** Data processing in components
```javascript
// AnnouncementsPage.jsx - check data processing
let data = [];
if (Array.isArray(serviceResponse)) {
    data = serviceResponse;
} else if (serviceResponse && Array.isArray(serviceResponse.data)) {
    data = serviceResponse.data;
}
```

#### Issue 4: Tenant ID Mismatch
**Symptoms:** API returns empty arrays
**Check:** User's tenant ID matches data in database
```javascript
// In browser console
console.log('User tenant:', user.tenantId);
// Should match tenant ID in database
```

### 5. Quick Frontend Fixes

#### Fix 1: Force Refresh Authentication
```javascript
// In browser console
localStorage.removeItem('token');
localStorage.removeItem('tenant_token');
// Then log in again
```

#### Fix 2: Check Component State
```javascript
// Add console.logs to components
console.log('Announcements data:', announcements);
console.log('Notifications data:', notifications);
```

#### Fix 3: Verify Service Responses
```javascript
// In AnnouncementsPage.jsx fetchAnnouncements()
const serviceResponse = await announcementService.getAll();
console.log('Service response:', serviceResponse);
```

### 6. Testing Frontend API Calls

**Open browser console and test directly:**

```javascript
// Test announcement service
import announcementService from './services/announcement.service';
announcementService.getAll().then(console.log).catch(console.error);

// Test notification service  
import notificationService from './services/notification.service';
notificationService.getAll().then(console.log).catch(console.error);
```

### 7. Expected Data Structure

#### Announcements Response:
```json
[
  {
    "_id": "...",
    "title": "Welcome to the New HR System",
    "content": "...",
    "type": "general",
    "priority": "high",
    "isActive": true,
    "createdAt": "2025-12-15T...",
    "createdBy": "..."
  }
]
```

#### Notifications Response:
```json
[
  {
    "_id": "...",
    "title": "Welcome to HR System", 
    "message": "...",
    "type": "custom",
    "isRead": false,
    "recipient": "...",
    "createdAt": "2025-12-15T..."
  }
]
```

## Troubleshooting Checklist

- [ ] **Server is running** on http://localhost:5000
- [ ] **Frontend is running** on http://localhost:3000  
- [ ] **User is logged in** (check localStorage for token)
- [ ] **Network tab shows API calls** being made
- [ ] **API calls return 200 OK** with data
- [ ] **Components are processing data** correctly
- [ ] **No JavaScript errors** in console
- [ ] **React components are re-rendering** when data loads

## Next Steps

1. **Check browser Network tab** for API call status
2. **Verify authentication** tokens exist
3. **Test API calls** directly in browser console
4. **Add console.logs** to components for debugging
5. **Check for JavaScript errors** in console

## Sample Data Available

✅ **3 Announcements created:**
- Welcome to the New HR System (general, high priority)
- Holiday Schedule Update (policy, medium priority)  
- System Maintenance Notice (maintenance, high priority)

✅ **6 Notifications created:**
- Welcome messages for each user
- Announcement notifications for each user

The data exists and APIs work - the issue is in frontend data fetching or display logic.