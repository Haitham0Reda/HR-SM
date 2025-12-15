# Frontend Debugging Steps - Announcements & Notifications

## 🎯 Current Status
- ✅ **Backend APIs working** (all return 401 = requires auth)
- ✅ **Sample data in database** (3 announcements, 6 notifications)
- ⚠️ **Frontend not showing data** (debugging needed)

## 🔧 Debug Tools Added

### 1. API Debugger Component
**Access:** Navigate to `/company/{your-company}/debug/api`

**Features:**
- Test authentication status
- Test announcement and notification services
- Test direct API calls
- View detailed responses and errors

### 2. Enhanced Console Logging
**Added to:**
- `AnnouncementsPage.jsx` - fetchAnnouncements function
- `DashboardHeader.jsx` - fetchNotifications function

**Console messages to look for:**
- 🔍 Fetching announcements/notifications...
- 📡 Service response: [data]
- 📊 Processed data: [array]
- 📈 Data length: [number]
- ❌ Error details: [error info]

## 🚀 Step-by-Step Debugging

### Step 1: Open Browser Developer Tools
1. **Press F12** or right-click → Inspect
2. **Go to Console tab**
3. **Clear console** (click trash icon)

### Step 2: Test Authentication
1. **Navigate to:** `/company/{your-company}/debug/api`
2. **Click "Check Auth Status"**
3. **Expected results:**
   - ✅ `hasToken: true` or `hasTenantToken: true`
   - ❌ Both false = **Login required**

### Step 3: Test API Services
1. **In API Debugger, click:**
   - "Test Announcements Service"
   - "Test Notifications Service"

2. **Expected results:**
   - ✅ **SUCCESS with data array** = Services working
   - ❌ **ERROR with 401** = Authentication issue
   - ❌ **ERROR with 403** = License issue
   - ❌ **ERROR with 404** = Route issue

### Step 4: Check Console Logs
1. **Navigate to announcements page**
2. **Watch console for messages:**
   ```
   🔍 Fetching announcements...
   📡 Service response: [object/array]
   📊 Processed data: [array]
   📈 Data length: 3
   📝 First announcement: {title: "Welcome...", ...}
   ```

3. **If you see errors:**
   ```
   ❌ Error fetching announcements: [error message]
   📋 Error details: {message, status, data}
   ```

### Step 5: Check Network Tab
1. **Go to Network tab in DevTools**
2. **Refresh the page**
3. **Look for API calls:**
   - `GET /api/v1/announcements`
   - `GET /api/v1/notifications`

4. **Click on each request to see:**
   - **Status:** Should be 200 OK
   - **Response:** Should contain data array
   - **Headers:** Should include Authorization header

## 🔍 Common Issues & Solutions

### Issue 1: No API Calls Made
**Symptoms:** No network requests in Network tab
**Causes:**
- Component not mounting
- useEffect not running
- Service not being called

**Solution:** Check component lifecycle and useEffect dependencies

### Issue 2: 401 Unauthorized
**Symptoms:** API calls return 401
**Causes:**
- No token in localStorage
- Token expired
- Token not being sent in headers

**Solutions:**
```javascript
// Check tokens
console.log('Token:', localStorage.getItem('token'));
console.log('Tenant Token:', localStorage.getItem('tenant_token'));

// Re-login if needed
localStorage.clear();
// Navigate to login page
```

### Issue 3: 200 OK but Empty Data
**Symptoms:** API returns 200 but empty array
**Causes:**
- Tenant ID mismatch
- Data filtered out
- Wrong query parameters

**Solution:** Check tenant ID and data filtering logic

### Issue 4: Data Received but Not Displayed
**Symptoms:** Console shows data but UI is empty
**Causes:**
- Component state not updating
- Rendering logic issues
- Data structure mismatch

**Solution:** Check component state and rendering logic

## 📊 Expected Debug Output

### Successful Announcements Fetch:
```
🔍 Fetching announcements...
📡 Service response: [{title: "Welcome...", content: "...", ...}, ...]
📊 Processed data: [{title: "Welcome...", content: "...", ...}, ...]
📈 Data length: 3
📝 First announcement: {title: "Welcome to the New HR System", type: "general", ...}
```

### Successful Notifications Fetch:
```
🔔 Fetching notifications...
📡 Notification response: [{title: "Welcome...", message: "...", ...}, ...]
📊 Processed notifications: [{title: "Welcome...", message: "...", ...}, ...]
📈 Notifications length: 6
🔔 Unread notifications: [{title: "Welcome...", isRead: false, ...}, ...]
```

### Authentication Error:
```
❌ Error fetching announcements: Not authorized, token failed
📋 Error details: {message: "Not authorized, token failed", status: 401, data: {...}}
```

## 🎯 Next Actions

1. **Use the API Debugger** at `/company/{your-company}/debug/api`
2. **Check console logs** when navigating to announcements
3. **Verify authentication** status and tokens
4. **Test API services** individually
5. **Check Network tab** for actual HTTP requests

## 📞 Quick Test Commands

**In browser console:**
```javascript
// Test localStorage
console.log('Tokens:', {
  token: localStorage.getItem('token'),
  tenantToken: localStorage.getItem('tenant_token')
});

// Test API directly
fetch('/api/v1/announcements', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  }
}).then(r => r.json()).then(console.log).catch(console.error);
```

The enhanced logging and debug tools will help identify exactly where the issue is in the frontend data flow!