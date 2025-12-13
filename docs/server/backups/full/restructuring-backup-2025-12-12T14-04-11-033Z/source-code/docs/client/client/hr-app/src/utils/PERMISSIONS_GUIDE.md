# Permission System Guide

## Overview

This document describes the permission system implementation for the HR Management System. The system provides fine-grained access control with comprehensive permissions organized into categories.

### Admin Role - Full System Control
- **Has ALL permissions by default** (unrestricted system access)
- **Can assign ANY permission to ANY role** (including custom roles)
- **Cannot have permissions restricted** (admin always has full access)
- Can create custom roles with any combination of permissions
- Total permissions available: 180+ across all categories

## Permission System Architecture

### Files Structure

```
client/src/
├── utils/
│   ├── permissions.js          # Permission constants and utilities
│   └── PERMISSIONS_GUIDE.md    # This documentation
├── hooks/
│   └── usePermissions.js       # Custom hook for permission checks
└── components/
    ├── PermissionGuard.js      # Component for permission-based rendering
    ├── RoleGuard.js            # Component for role-based rendering
    └── PermissionAssigner.js   # Admin component for assigning permissions
```

## Default Role Permissions

### Admin (180+ permissions)
- ALL system permissions
- Cannot be restricted or modified
- Full control over all features

### HR (98 permissions)
Comprehensive HR management including:
- Dashboard access
- Attendance management (11)
- Department management (6)
- Employee management (7)
- Document management (7)
- Leave permissions (6)
- Position management (6)
- Vacation management (6)
- Reports & analytics (21)
- Settings (3)
- Role management (3)
- Plus 22 additional permissions

### Manager (35 permissions)
Team and department management:
- View and approve team requests
- Attendance oversight
- Basic reporting
- Event management

### Employee (16 permissions)
Basic self-service:
- View own records
- Submit requests
- View announcements
- Respond to surveys

## Permission Categories

### 1. System Administration (Admin Only)
- `system.view-logs`
- `system.manage-database`
- `system.manage-security`
- `system.manage-integrations`

### 2. Backup Management
- `backups.view`, `backups.create`, `backups.restore`, `backups.delete`

### 3. ID Card Management
- `id-cards.view`, `id-cards.create`, `id-cards.edit`
- `id-cards.print`, `id-cards.batch-print`, `id-cards.manage-batches`

### 4. Attendance Management
- `attendance.list`, `attendance.create`, `attendance.edit`, `attendance.delete`
- `attendance.view`, `attendance.view-own`, `attendance.reports`
- `attendance.manage`, `attendance.approve-forget-check`
- `attendance.reject-forget-check`, `attendance.create-forget-check`

### 5. Department Management
- `departments.list`, `departments.create`, `departments.edit`
- `departments.delete`, `departments.view`, `departments.manage`

### 6. Employee Management
- `employees.list`, `employees.create`, `employees.edit`, `employees.delete`
- `employees.view`, `employees.copy-location`, `employees.print-credentials`
- `employees.reports`, `employees.employee-of-month`

### 7. Document Management
- `documents.view`, `documents.view-own`, `documents.upload`
- `documents.download`, `documents.approve`, `documents.bulk-upload`
- `documents.reports`, `documents.manage`, `documents.delete`

### 8. Leave Permissions
- `permissions.approve`, `permissions.create`, `permissions.edit`
- `permissions.delete`, `permissions.list`, `permissions.view`
- `permissions.view-own`, `permissions.reports`

### 9. Position Management
- `positions.list`, `positions.create`, `positions.edit`
- `positions.delete`, `positions.view`, `positions.manage`

### 10. Vacations & Leaves
- `vacations.*` (list, create, edit, delete, view, approve, reports)
- `leaves.*` (view, view-own, create, edit, delete, approve, manage-all)

### 11. Reports & Analytics
- Daily, weekly, department, employee attendance reports
- Sick leave, early/late departure reports
- Request reports (pending, permissions, vacations)
- Documentation, ID card, email logs
- Custom builder, audit logs, employee of month

### 12. Settings
- `settings.view`, `settings.edit`, `settings.reminder-view`
- `settings.security`, `settings.backup`, `settings.system`

### 13. Roles & Permissions
- `roles.view`, `roles.create`, `roles.edit`, `roles.delete`
- `roles.list`, `roles.assign`

### 14. User Management
- `users.view`, `users.create`, `users.edit`, `users.delete`
- `users.manage-roles`, `users.manage-permissions`
- `users.activate`, `users.deactivate`

### 15. Payroll
- `payroll.view`, `payroll.view-own`, `payroll.create`
- `payroll.edit`, `payroll.delete`, `payroll.process`, `payroll.approve`

### 16. Announcements
- `announcements.view`, `announcements.create`, `announcements.edit`
- `announcements.delete`, `announcements.publish`

### 17. Events
- `events.view`, `events.create`, `events.edit`
- `events.delete`, `events.manage-attendees`

### 18. Surveys
- `surveys.view`, `surveys.create`, `surveys.edit`, `surveys.delete`
- `surveys.respond`, `surveys.view-responses`, `surveys.publish`

### 19. Notifications
- `notifications.view-own`, `notifications.create`
- `notifications.manage-all`, `notifications.send`

### 20. Templates
- `templates.view`, `templates.create`, `templates.edit`, `templates.delete`

### 21. Request Controls
- `request-controls.view`, `request-controls.manage`

### 22. Audit Logs
- `audit.view`, `audit.export`, `audit.delete`

## Usage Examples

### 1. Using the usePermissions Hook

```javascript
import { usePermissions } from '../hooks/usePermissions';

function MyComponent() {
    const { 
        can, 
        canAny, 
        canAll, 
        isAdmin, 
        canAssignPermissions,
        allAvailablePermissions 
    } = usePermissions();

    // Check single permission
    if (can('employees.create')) {
        // Show create employee button
    }

    // Check if user is admin
    if (isAdmin) {
        // Show admin panel
    }

    // Check if user can assign permissions
    if (canAssignPermissions) {
        // Show permission assignment UI
    }

    // Get all available permissions (admin only)
    console.log(allAvailablePermissions); // Array of all permissions

    return <div>...</div>;
}
```

### 2. Using PermissionAssigner Component (Admin Only)

```javascript
import PermissionAssigner from '../components/PermissionAssigner';

function RoleEditor() {
    const [selectedPermissions, setSelectedPermissions] = useState([]);

    return (
        <PermissionAssigner
            selectedPermissions={selectedPermissions}
            onChange={setSelectedPermissions}
            role="hr" // Role being edited
            disabled={false}
        />
    );
}
```

### 3. Admin Permission Assignment

```javascript
import { 
    getAllAvailablePermissions, 
    canAssignPermissions,
    canRoleHaveCustomPermissions 
} from '../utils/permissions';

function AdminPanel() {
    const user = { role: 'admin' };

    // Check if user can assign permissions
    if (canAssignPermissions(user)) {
        // Get all available permissions
        const allPerms = getAllAvailablePermissions();
        console.log(`${allPerms.length} permissions available`);

        // Check if a role can be customized
        if (canRoleHaveCustomPermissions('hr')) {
            // Allow customization
        }

        // Admin role cannot be customized
        if (!canRoleHaveCustomPermissions('admin')) {
            console.log('Admin role cannot be modified');
        }
    }
}
```

### 4. Creating Custom Roles (Admin)

```javascript
import { roleService } from '../services';
import { getAllAvailablePermissions } from '../utils/permissions';

async function createCustomRole() {
    const allPermissions = getAllAvailablePermissions();

    // Admin can select any permissions for the new role
    const customPermissions = [
        'employees.view',
        'employees.edit',
        'reports.view',
        'reports.export'
    ];

    const newRole = await roleService.create({
        name: 'custom-role',
        displayName: 'Custom Role',
        description: 'Custom role with specific permissions',
        permissions: customPermissions
    });

    return newRole;
}
```

### 5. Protecting Admin-Only Features

```javascript
import { usePermissions } from '../hooks/usePermissions';
import PermissionGuard from '../components/PermissionGuard';

function SettingsPage() {
    const { isAdmin } = usePermissions();

    return (
        <div>
            <h1>Settings</h1>

            {/* Show to all with permission */}
            <PermissionGuard permission="settings.view">
                <GeneralSettings />
            </PermissionGuard>

            {/* Admin only */}
            {isAdmin && (
                <div>
                    <h2>System Administration</h2>
                    <SystemSettings />
                    <DatabaseManagement />
                    <SecuritySettings />
                </div>
            )}

            {/* Permission assignment (admin only) */}
            <PermissionGuard permission="roles.assign">
                <RoleManagement />
            </PermissionGuard>
        </div>
    );
}
```

## Best Practices

### For Admins

1. **Use predefined roles when possible**
   - Start with default roles (HR, Manager, Employee)
   - Only create custom roles when necessary

2. **Group related permissions**
   - Use permission categories as a guide
   - Keep roles focused and logical

3. **Document custom roles**
   - Add clear descriptions
   - Explain why specific permissions were chosen

4. **Regular permission audits**
   - Review role permissions periodically
   - Remove unnecessary permissions
   - Update as business needs change

5. **Test permission changes**
   - Test with a test user before applying to production
   - Verify all features work as expected

### For Developers

1. **Always check permissions on both client and server**
   - Client checks improve UX
   - Server checks ensure security

2. **Use specific permission checks**
   - Prefer `can('employees.create')` over `isHR`
   - Makes code maintainable as permissions evolve

3. **Provide meaningful feedback**
   - Show "No access" messages
   - Guide users to request access

4. **Cache permission checks**
   - Use `usePermissions` hook (memoized)
   - Avoid redundant checks in loops

5. **Handle admin role specially**
   - Admin always has access
   - Don't show permission assignment for admin role

## API Integration

### Fetching User Permissions

```javascript
import { authService } from '../services';

// Get current user with permissions
const user = await authService.getProfile();
console.log(user.permissions); // Array of permission strings
```

### Updating Role Permissions (Admin Only)

```javascript
import { roleService } from '../services';

// Update role permissions
await roleService.update(roleId, {
    permissions: ['employees.view', 'employees.edit', ...]
});
```

### Checking Permissions Server-Side

```javascript
// Server should validate permissions
POST /api/employees
Headers: { Authorization: 'Bearer <token>' }

// Server checks if user has 'employees.create' permission
// Returns 403 if unauthorized
```

## Testing

```javascript
import { render, screen } from '@testing-library/react';
import { usePermissions } from '../hooks/usePermissions';

jest.mock('../hooks/usePermissions');

test('admin sees all features', () => {
    usePermissions.mockReturnValue({
        isAdmin: true,
        can: () => true,
        canAssignPermissions: true
    });

    render(<AdminPanel />);
    expect(screen.getByText('System Administration')).toBeInTheDocument();
});

test('non-admin cannot assign permissions', () => {
    usePermissions.mockReturnValue({
        isAdmin: false,
        canAssignPermissions: false
    });

    render(<RoleEditor />);
    expect(screen.queryByText('Assign Permissions')).not.toBeInTheDocument();
});
```

## Syncing with Server

The permission definitions should match the server-side permissions in:
- `server/seed.js` - Role definitions with permissions
- `server/models/permission.system.js` - System permissions (if exists)
- `server/middleware/auth.js` - Permission checking middleware

When updating permissions:
1. Update `client/src/utils/permissions.js` - Add to ALL_PERMISSIONS
2. Update `server/seed.js` - Add to appropriate role
3. Run seed script to update database
4. Test both client and server permission checks
5. Update documentation

## Security Notes

1. **Never trust client-side permission checks alone**
   - Always validate on server
   - Client checks are for UX only

2. **Admin role is special**
   - Cannot be restricted
   - Always has full access
   - Handle carefully in code

3. **Permission changes require re-login**
   - User must log out and back in
   - Or implement real-time permission updates

4. **Audit permission changes**
   - Log all permission assignments
   - Track who changed what and when
   - Use `audit.view` permission to review logs
