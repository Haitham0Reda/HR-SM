# Delete Test Insurance Policies

This solution provides multiple ways to delete the 3 test insurance policies from your system.

## What are Test Policies?

Test policies are identified by:
- Policy numbers starting with `POL-2024-` (like POL-2024-001, POL-2024-002, POL-2024-003)
- Policies with "N/A" employee information
- Policies that appear to be test data

## Solution Options

### Option 1: Use the Web Interface (Recommended)

1. Navigate to the Insurance Policies page: `http://localhost:3000/company/techcorp_solutions/insurance/policies`
2. Look for the new **bulk delete** button (trash can with sweep icon) in the top toolbar
3. Click the bulk delete button
4. Confirm the deletion when prompted
5. The system will automatically identify and delete test policies

### Option 2: Use the API Endpoint

You can make a direct API call to the bulk delete endpoint:

```bash
DELETE /api/v1/life-insurance/policies/bulk-delete-test
```

### Option 3: Run the Script

Use the provided script to delete test policies:

```bash
npm run delete-test-policies
```

Or run the script directly:

```bash
node scripts/delete-test-policies.js
```

## What Happens During Deletion

1. **Soft Delete**: Policies are not permanently deleted but marked as "cancelled"
2. **History Tracking**: A history entry is added showing when and why the policy was deleted
3. **Safety Checks**: The system checks for active claims before deletion
4. **Batch Processing**: Multiple test policies are processed in a single operation

## Files Modified

### Backend Changes:
- `server/modules/life-insurance/controllers/insuranceController.js` - Added `bulkDeleteTestPolicies` function
- `server/modules/life-insurance/routes/insuranceRoutes.js` - Added bulk delete route
- `client/hr-app/src/services/insurance.service.js` - Added bulk delete service method

### Frontend Changes:
- `client/hr-app/src/hooks/useInsurance.js` - Added `bulkDeleteTestPolicies` hook
- `client/hr-app/src/components/insurance/PolicyList.jsx` - Added bulk delete button

### Scripts:
- `scripts/delete-test-policies.js` - Database script for direct deletion
- `scripts/delete-test-policies-api.js` - API-based deletion script

## Safety Features

- **Confirmation Dialog**: Users must confirm before deletion
- **Admin Only**: Only admin users can perform bulk deletions
- **Active Claims Check**: Policies with active claims cannot be deleted
- **Audit Trail**: All deletions are logged with timestamps and user information
- **Soft Delete**: Policies are marked as cancelled, not permanently removed

## Testing

After deletion, you should see:
- Test policies no longer appear in the active policies list
- Policies are marked with "Cancelled" status if you view all policies
- Success notification confirming the number of deleted policies

## Rollback

If you need to restore deleted policies, you can:
1. Update the policy status from "cancelled" back to "active" in the database
2. Or restore from a database backup if available

## Notes

- The bulk delete function specifically targets test policies to avoid accidentally deleting real data
- The system will show how many policies were deleted and any errors encountered
- This is a one-time cleanup operation - once test policies are deleted, the bulk delete button will show "No test policies found"