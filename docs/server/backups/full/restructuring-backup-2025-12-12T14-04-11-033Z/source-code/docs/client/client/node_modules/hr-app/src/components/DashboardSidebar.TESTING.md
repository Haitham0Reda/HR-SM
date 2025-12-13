# DashboardSidebar License Filtering - Testing Guide

## Overview
The DashboardSidebar component now implements license-based menu filtering. Menu items are conditionally rendered based on module license status.

## Implementation Details

### Changes Made
1. **Imported useLicense hook** from LicenseContext
2. **Added LockIcon** import for visual indication
3. **Created module mapping function** (`getModuleKeyForMenuItem`) that maps menu item IDs to module keys
4. **Created filtering functions**:
   - `shouldShowMenuItem(itemId)` - Determines if a menu item should be rendered
   - `isMenuItemLocked(itemId)` - Determines if a menu item should be locked (shown but disabled)
5. **Updated DashboardSidebarPageItem** component to support `locked` prop
6. **Applied filtering** to all menu items across all user roles (employee, HR, admin, id-card-admin)

### Module Mapping
Menu items are mapped to modules as follows:
- **attendance** module: attendance, my-attendance, forget-checks
- **leave** module: missions, sick-leaves, doctor-review-queue, permissions, overtime, vacation-requests
- **payroll** module: payroll
- **documents** module: documents, hard-copies, templates
- **communication** module: announcements, events, surveys
- **reporting** module: reports, analytics
- **tasks** module: tasks
- **Core HR** (always enabled): dashboard, departments, positions, users, my-requests, requests, holidays, dashboard-edit, roles, settings, theme-editor, security, backups, resigned

## Manual Testing Instructions

### Test Scenario 1: All Modules Enabled
1. Configure license with all modules enabled
2. Log in as HR or Admin user
3. Verify all menu items are visible and clickable
4. Verify no lock icons are displayed

### Test Scenario 2: Some Modules Disabled
1. Configure license with only `attendance` and `tasks` modules enabled
2. Log in as HR user
3. **Expected Results**:
   - ✅ Core HR items visible and clickable (Dashboard, Departments, Positions, Users)
   - ✅ Attendance Management visible and clickable
   - ✅ Tasks visible and clickable
   - ✅ Leave-related items visible with lock icon (Missions, Sick Leaves, Permissions, Overtime, Vacation Requests)
   - ✅ Payroll visible with lock icon
   - ✅ Documents visible with lock icon
   - ✅ Communication items visible with lock icon
   - ✅ Reporting items visible with lock icon

### Test Scenario 3: Locked Item Behavior
1. Configure license with `payroll` module disabled
2. Log in as HR user
3. Navigate to sidebar
4. Locate "Payroll" menu item
5. **Expected Results**:
   - ✅ Item is visible in the menu
   - ✅ Lock icon is displayed next to the item
   - ✅ Item has reduced opacity (0.6)
   - ✅ Clicking the item does nothing (navigation is prevented)
   - ✅ Hover effect is disabled

### Test Scenario 4: Core HR Always Accessible
1. Configure license with ALL modules disabled (except hr-core)
2. Log in as any user
3. **Expected Results**:
   - ✅ Dashboard is visible and clickable
   - ✅ Departments is visible and clickable
   - ✅ Positions is visible and clickable
   - ✅ Users is visible and clickable
   - ✅ All other items are visible with lock icons

### Test Scenario 5: Different User Roles
Test with different user roles to ensure filtering works correctly:
- **Employee**: Should see limited menu items based on role + license
- **HR**: Should see HR-specific items + license filtering
- **Admin**: Should see all admin items + license filtering
- **ID Card Admin**: Should see only documents + license filtering

## Visual Indicators

### Unlocked (Enabled) Module
- Full opacity
- No lock icon
- Clickable
- Hover effect active

### Locked (Disabled) Module
- Reduced opacity (0.6)
- Lock icon displayed on the right
- Not clickable (cursor: not-allowed)
- No hover effect
- Navigation prevented

## Code Verification

Run diagnostics to ensure no syntax errors:
```bash
npm run lint
```

Check TypeScript/JSX compilation:
```bash
npm run build
```

## Integration Points

The menu filtering integrates with:
1. **LicenseContext** - Provides `isModuleEnabled()` function
2. **Module Constants** - Uses module keys from `server/shared/constants/modules.js`
3. **DashboardSidebarPageItem** - Enhanced with `locked` prop support

## Notes
- Core HR functionality is ALWAYS accessible regardless of license status
- Menu items are hidden by default if module is not enabled (can be changed to show locked state)
- Lock icon provides clear visual feedback to users
- Disabled styling prevents confusion about clickability
