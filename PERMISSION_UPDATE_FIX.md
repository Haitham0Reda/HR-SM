# Permission Update Fix - Time Field Handling

## Issue
Permission update (PUT) requests were failing with validation errors:
```
Validation failed: time.scheduled: Path `time.scheduled` is required.
time.requested: Path `time.requested` is required.
```

## Root Cause
The `updatePermissionRequest` controller was directly using `req.body` without processing the time field like the create function does. When the frontend sends a single time string (e.g., "10:30"), the backend expects a time object with `scheduled` and `requested` fields.

## Solution
Updated the `updatePermissionRequest` function in `server/modules/hr-core/requests/controllers/permissionRequest.controller.js` to handle time field transformation similar to the create function.

### Key Changes

#### 1. Time Field Processing
```javascript
// Handle time fields - support multiple formats (same as create)
if (req.body.time && typeof req.body.time === 'object') {
    // Time object provided directly
    updateData.time = {
        scheduled: req.body.time.scheduled || oldPermission.time?.scheduled || '09:00',
        requested: req.body.time.requested || oldPermission.time?.requested || '17:00',
        duration: req.body.time.duration || req.body.duration || 0
    };
} else if (req.body.time && typeof req.body.time === 'string') {
    // Single time string from frontend form
    const requestedTime = req.body.time;
    let scheduledTime = oldPermission.time?.scheduled || '09:00';
    
    updateData.time = {
        scheduled: scheduledTime,
        requested: requestedTime,
        duration: req.body.duration || oldPermission.time?.duration || 0
    };
}
```

#### 2. Preserve Existing Data
- Uses existing `scheduled` time if not provided
- Preserves existing `duration` if not updated
- Makes intelligent assumptions based on permission type

#### 3. Consistent Response Format
```javascript
res.json({
    success: true,
    data: permission
});
```

#### 4. Better Error Handling
```javascript
res.status(400).json({ 
    success: false,
    message: err.message,
    details: err.errors ? Object.keys(err.errors).map(key => ({
        field: key,
        message: err.errors[key].message
    })) : null
});
```

## Test Results

### ✅ Update with Time String (Frontend Format)
```json
{
  "permissionType": "late-arrival",
  "time": "10:30",
  "reason": "Updated reason"
}
```
**Result:** ✅ Updated successfully - `09:00 → 10:30`

### ✅ Update with Time Object (API Format)
```json
{
  "permissionType": "early-departure",
  "time": {
    "scheduled": "17:00",
    "requested": "15:00", 
    "duration": 2
  }
}
```
**Result:** ✅ Updated successfully - `17:00 → 15:00` (2h duration)

### ✅ Update without Reason (Optional Field)
```json
{
  "permissionType": "overtime",
  "time": "20:00"
}
```
**Result:** ✅ Updated successfully - `17:00 → 20:00` (no reason)

## Benefits

1. **Frontend Compatibility**: Works with single time string from forms
2. **API Flexibility**: Supports both string and object time formats
3. **Data Preservation**: Maintains existing scheduled times when appropriate
4. **Optional Reason**: Supports optional reason field updates
5. **Consistent Responses**: Matches create function response format

## Frontend Impact
- ✅ **Edit Form**: Now works without validation errors
- ✅ **Time Display**: Properly handles time object conversion
- ✅ **Optional Reason**: Can update without providing reason
- ✅ **Error Handling**: Better error messages for debugging

## URLs
- **Edit Form**: `http://localhost:3000/company/test-company/permissions/{id}/edit`
- **Permissions List**: `http://localhost:3000/company/test-company/permissions`

The permission update functionality now works seamlessly with both frontend forms and direct API calls.