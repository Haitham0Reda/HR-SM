# Model Update Guide: Adding tenantId Field

## Overview

This guide explains how to add the `tenantId` field to all tenant-scoped models in the HR-SM system to support multi-tenancy.

## Requirements

- All tenant-scoped models MUST have a `tenantId` field
- The `tenantId` field MUST be required
- Compound indexes MUST be created for performance and tenant isolation
- Unique constraints MUST be scoped to tenantId

## Step-by-Step Process

### 1. Add tenantId Field to Schema

Add the following field definition at the beginning of your schema (right after the opening brace):

```javascript
const yourSchema = new mongoose.Schema({
    tenantId: {
        type: String,
        required: [true, 'Tenant ID is required'],
        index: true,
        trim: true
    },
    // ... rest of your fields
});
```

### 2. Update Unique Indexes

If your model has unique fields (like email, username, code), you need to make them unique per tenant by creating compound indexes:

**Before:**
```javascript
email: {
    type: String,
    required: true,
    unique: true  // ❌ This makes it unique globally
}
```

**After:**
```javascript
email: {
    type: String,
    required: true
    // Remove unique: true from here
}

// Add compound index at the end of the file (before export)
yourSchema.index({ tenantId: 1, email: 1 }, { unique: true });
```

### 3. Add Compound Indexes for Performance

Add compound indexes for common query patterns. These should be added at the end of the schema definition, before the export statement:

```javascript
// Compound indexes for tenant isolation and performance
yourSchema.index({ tenantId: 1, status: 1 });
yourSchema.index({ tenantId: 1, createdAt: 1 });
yourSchema.index({ tenantId: 1, employee: 1, date: 1 }, { unique: true });

export default mongoose.model('YourModel', yourSchema);
```

## Model-Specific Index Requirements

### User Model
```javascript
userSchema.index({ tenantId: 1, email: 1 }, { unique: true });
userSchema.index({ tenantId: 1, username: 1 }, { unique: true });
userSchema.index({ tenantId: 1, employeeId: 1 }, { unique: true, sparse: true });
userSchema.index({ tenantId: 1, role: 1 });
userSchema.index({ tenantId: 1, department: 1 });
userSchema.index({ tenantId: 1, status: 1 });
```

### Department Model
```javascript
departmentSchema.index({ tenantId: 1, name: 1 }, { unique: true });
departmentSchema.index({ tenantId: 1, code: 1 }, { unique: true, sparse: true });
departmentSchema.index({ tenantId: 1, parentDepartment: 1 });
departmentSchema.index({ tenantId: 1, manager: 1 });
```

### Attendance Model
```javascript
attendanceSchema.index({ tenantId: 1, employee: 1, date: 1 }, { unique: true });
attendanceSchema.index({ tenantId: 1, department: 1, date: 1 });
attendanceSchema.index({ tenantId: 1, status: 1 });
attendanceSchema.index({ tenantId: 1, date: 1 });
```

### Request Model
```javascript
requestSchema.index({ tenantId: 1, employee: 1, type: 1 });
requestSchema.index({ tenantId: 1, status: 1 });
requestSchema.index({ tenantId: 1, requestedAt: 1 });
```

### Vacation Model
```javascript
vacationSchema.index({ tenantId: 1, employee: 1, startDate: 1 });
vacationSchema.index({ tenantId: 1, status: 1 });
vacationSchema.index({ tenantId: 1, vacationType: 1 });
```

### Task Model (Already Updated)
```javascript
taskSchema.index({ tenantId: 1, assignedTo: 1, status: 1 });
taskSchema.index({ tenantId: 1, dueDate: 1 });
taskSchema.index({ tenantId: 1, priority: 1 });
```

## Complete List of Models to Update

### HR-Core Models (Priority 1)
- [x] task.model.js (already has tenantId)
- [x] taskReport.model.js (already has tenantId)
- [ ] user.model.js
- [ ] department.model.js
- [ ] position.model.js
- [ ] attendance.model.js
- [ ] attendanceDevice.model.js
- [ ] request.model.js
- [ ] holiday.model.js
- [ ] mission.model.js
- [ ] vacation.model.js
- [ ] mixedVacation.model.js
- [ ] vacationBalance.model.js
- [ ] overtime.model.js
- [ ] forgetCheck.model.js

### Optional Module Models (Priority 2)
- [ ] document.model.js
- [ ] documentTemplate.model.js
- [ ] event.model.js
- [ ] notification.model.js
- [ ] payroll.model.js
- [ ] permission.model.js
- [ ] permissionAudit.model.js
- [ ] report.model.js
- [ ] reportConfig.model.js
- [ ] reportExecution.model.js
- [ ] reportExport.model.js
- [ ] resignedEmployee.model.js
- [ ] role.model.js
- [ ] survey.model.js
- [ ] surveyNotification.model.js
- [ ] sickLeave.model.js
- [ ] backup.model.js
- [ ] backupExecution.model.js
- [ ] dashboardConfig.model.js
- [ ] themeConfig.model.js
- [ ] securitySettings.model.js
- [ ] securityAudit.model.js
- [ ] announcement.model.js
- [ ] hardcopy.model.js
- [ ] idCard.model.js
- [ ] idCardBatch.model.js
- [ ] requestControl.model.js
- [ ] organization.model.js

### Platform Models (DO NOT ADD tenantId)
- [ ] Tenant.js (platform model)
- [ ] PlatformUser.js (platform model)
- [ ] Plan.js (platform model)
- [x] licenseAudit.model.js (already has tenantId)
- [x] usageTracking.model.js (already has tenantId)

## Testing After Updates

After updating models, you should:

1. **Run the data migration** to add tenantId to existing records:
   ```bash
   node server/scripts/migrations/001_add_tenant_id.js
   ```

2. **Test model creation**:
   ```javascript
   const user = await User.create({
       tenantId: 'default_tenant',
       email: 'test@example.com',
       // ... other fields
   });
   ```

3. **Test unique constraints**:
   ```javascript
   // Should succeed - different tenants
   await User.create({ tenantId: 'tenant1', email: 'test@example.com' });
   await User.create({ tenantId: 'tenant2', email: 'test@example.com' });
   
   // Should fail - same tenant, same email
   await User.create({ tenantId: 'tenant1', email: 'test@example.com' });
   ```

4. **Test queries with tenantId**:
   ```javascript
   const users = await User.find({ tenantId: 'tenant1' });
   ```

## Common Pitfalls

1. **Forgetting to remove global unique constraints**: If you keep `unique: true` on a field AND add a compound index, you'll have conflicts.

2. **Not using sparse indexes**: For optional unique fields (like employeeId), use `{ sparse: true }` in the index options.

3. **Incorrect index order**: Always put `tenantId` first in compound indexes for optimal query performance.

4. **Missing required validation**: Always include `required: [true, 'Tenant ID is required']` for the tenantId field.

## Verification

After updating all models, run the verification script:

```bash
node server/scripts/migrations/test_001_migration.js
```

This will verify that:
- All documents have tenantId
- Compound indexes exist
- Queries use the correct indexes
- Unique constraints work per tenant
