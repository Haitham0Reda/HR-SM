# Mission Not Showing in "My Missions" Tab - Diagnostic Guide

## Quick Diagnosis Steps

### 1. Run the Diagnostic Tool
Open `debug-new-mission-issue.html` in your browser and click "Run Full Diagnostic". This will:
- Check if missions exist in the database
- Verify user ID matching
- Analyze recent missions
- Identify the root cause

### 2. Check Browser Console
1. Open the missions page in your HR app
2. Open browser developer tools (F12)
3. Look for console logs starting with 🔍 (the frontend has extensive debugging)
4. Or run the script in `quick-mission-diagnostic.js` in the console

### 3. Common Issues and Solutions

#### Issue 1: Mission Created with Wrong Employee ID
**Symptoms:** Mission exists but employee field is null or points to different user
**Solution:** 
```javascript
// Check the mission creation API call
// Ensure employee field is set to current user's ID
{
  "employee": "current_user_id_here",
  "location": "Mission Location",
  // ... other fields
}
```

#### Issue 2: User ID Type Mismatch
**Symptoms:** Mission exists, employee ID looks correct, but string comparison fails
**Solution:** The frontend already handles this with both strict and string comparison:
```javascript
return missionUserId === currentUserId || String(missionUserId) === String(currentUserId);
```

#### Issue 3: Authentication/Token Issues
**Symptoms:** API calls fail or return wrong user data
**Solution:** 
- Clear localStorage and login again
- Check token expiration
- Verify tenant isolation

#### Issue 4: Frontend Filtering Bug
**Symptoms:** API returns correct data but UI shows "No missions found"
**Solution:** Check browser console for React errors or filtering logic issues

### 4. Manual Verification Steps

#### Check Database Directly
```javascript
// In browser console on missions page
fetch('http://localhost:5000/api/v1/missions', {
    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
})
.then(r => r.json())
.then(data => console.log('Raw missions:', data));
```

#### Check Current User
```javascript
// In browser console
const token = localStorage.getItem('token');
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('Current user ID:', payload._id);
```

#### Create Test Mission
Use `create-test-mission.html` or the diagnostic tool to create a test mission and verify it appears.

### 5. Debug Files Available

- `debug-new-mission-issue.html` - Comprehensive diagnostic tool
- `quick-mission-diagnostic.js` - Browser console script
- `debug-mission-data.html` - Mission data structure analysis
- `auto-debug-missions.html` - Automatic mission debugging
- `test-mission-debug.html` - Complete mission flow testing

### 6. Expected Behavior

When working correctly:
1. Mission is created with `employee` field set to current user's ID
2. API returns the mission in the missions list
3. Frontend filters missions where `mission.employee._id` or `mission.employee` matches current user ID
4. Mission appears in "My Missions" tab

### 7. Troubleshooting Checklist

- [ ] Mission exists in database (check with diagnostic tool)
- [ ] Mission has correct employee ID assigned
- [ ] User is logged in with valid token
- [ ] No browser console errors
- [ ] Frontend filtering logic is working
- [ ] Page refresh doesn't help
- [ ] Other users' missions are visible (if you have admin access)

### 8. Next Steps

If the diagnostic tool shows:
- **No missions found:** Mission creation failed
- **Mission exists but wrong employee:** Fix mission assignment
- **Mission exists with correct employee but not showing:** Frontend issue
- **API errors:** Authentication or server issue

Run the diagnostic tool first, then follow the specific guidance based on the results.