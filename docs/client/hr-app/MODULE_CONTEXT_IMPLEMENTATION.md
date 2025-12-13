# Module Context Implementation

This document describes the module context system implemented for dynamic module loading in the HR app.

## Overview

The module context system allows the HR app to:
1. Fetch enabled modules for the current tenant on login
2. Conditionally render routes and navigation based on module availability
3. Show appropriate fallback UI when modules are disabled
4. Provide hooks for checking module status throughout the app

## Components

### 1. ModuleContext (`src/contexts/ModuleContext.jsx`)

The main context that manages module state:

```javascript
import { useModules } from './contexts/ModuleContext';

const { enabledModules, isModuleEnabled, loading } = useModules();
```

**API:**
- `enabledModules`: Array of enabled module IDs (always includes 'hr-core')
- `loading`: Boolean indicating if modules are being fetched
- `error`: Error message if fetch failed
- `isModuleEnabled(moduleId)`: Check if a single module is enabled
- `areModulesEnabled(moduleIds)`: Check if all specified modules are enabled
- `isAnyModuleEnabled(moduleIds)`: Check if any specified module is enabled

### 2. ModuleGuard Component (`src/components/ModuleGuard.jsx`)

Conditionally renders content based on module availability:

```javascript
import ModuleGuard from './components/ModuleGuard';

<ModuleGuard moduleId="tasks">
  <TasksPage />
</ModuleGuard>
```

**Props:**
- `moduleId` (required): Module ID to check
- `children` (required): Content to render if module is enabled
- `fallback`: Custom fallback content if module is disabled
- `showDefaultFallback`: Show default "Module Not Available" message (default: true)

### 3. useModuleNavigation Hook (`src/hooks/useModuleNavigation.js`)

Utilities for filtering navigation items:

```javascript
import { useModuleNavigation } from './hooks/useModuleNavigation';

const { shouldShowItem, filterNavigationItems } = useModuleNavigation();
```

**API:**
- `getModuleForItem(itemId)`: Get module ID for a navigation item
- `shouldShowItem(itemId)`: Check if navigation item should be shown
- `isItemLocked(itemId)`: Check if navigation item should be locked
- `filterNavigationItems(items)`: Filter navigation array based on enabled modules

## Usage Examples

### Protecting a Route

```javascript
import ModuleGuard from './components/ModuleGuard';

<Route 
  path="tasks" 
  element={
    <ModuleGuard moduleId="tasks">
      <TasksPage />
    </ModuleGuard>
  } 
/>
```

### Conditional Rendering

```javascript
import { useModules } from './contexts/ModuleContext';

function MyComponent() {
  const { isModuleEnabled } = useModules();
  
  return (
    <div>
      {isModuleEnabled('email-service') && (
        <EmailSettings />
      )}
    </div>
  );
}
```

### Filtering Navigation

```javascript
import { useModuleNavigation } from './hooks/useModuleNavigation';

function Navigation() {
  const { filterNavigationItems } = useModuleNavigation();
  
  const allItems = [
    { id: 'dashboard', label: 'Dashboard', path: '/dashboard' },
    { id: 'tasks', label: 'Tasks', path: '/tasks' },
    { id: 'payroll', label: 'Payroll', path: '/payroll' },
  ];
  
  const visibleItems = filterNavigationItems(allItems);
  
  return (
    <nav>
      {visibleItems.map(item => (
        <NavItem key={item.id} {...item} />
      ))}
    </nav>
  );
}
```

### Custom Fallback

```javascript
<ModuleGuard 
  moduleId="tasks"
  fallback={
    <Box>
      <Typography>Tasks module is not available</Typography>
      <Button onClick={contactAdmin}>Contact Admin</Button>
    </Box>
  }
>
  <TasksPage />
</ModuleGuard>
```

## Module Mapping

The following navigation items are mapped to modules:

### Optional Modules
- `tasks` → tasks module
- `payroll` → payroll module
- `documents`, `hard-copies`, `templates` → documents module
- `reports`, `analytics` → reports module
- `notifications` → notifications module
- `clinic`, `medical-profiles`, `appointments`, `prescriptions` → clinic module
- `email-settings` → email-service module

### Core HR (Always Available)
- `dashboard`, `departments`, `positions`, `users`
- `attendance`, `missions`, `sick-leaves`, `permissions`, `overtime`
- `vacation-requests`, `requests`, `holidays`, `vacations`
- `roles`, `settings`, `security`, `backups`, `resigned`
- `announcements`, `events`, `surveys`

## API Integration

The ModuleContext fetches enabled modules from:

```
GET /api/v1/tenant/config
```

Expected response:
```json
{
  "success": true,
  "data": {
    "enabledModules": ["hr-core", "tasks", "email-service"]
  }
}
```

## Error Handling

If the module fetch fails:
1. An error is logged to the console
2. The system defaults to HR-Core only
3. The error is stored in context for display
4. Users can still access Core HR features

## Testing

To test module context:

1. **Enable a module:**
   - Login as tenant admin
   - Navigate to module settings
   - Enable a module (e.g., tasks)
   - Verify navigation item appears
   - Verify route is accessible

2. **Disable a module:**
   - Disable a module in settings
   - Verify navigation item is hidden
   - Verify route shows "Module Not Available" message

3. **Module fetch failure:**
   - Simulate API failure
   - Verify app defaults to HR-Core
   - Verify error is displayed appropriately

## Future Enhancements

1. **Real-time updates:** Use WebSocket to update modules without refresh
2. **Module permissions:** Check user permissions within modules
3. **Module dependencies:** Handle module dependencies automatically
4. **Module loading states:** Show loading indicators for lazy-loaded modules
5. **Module marketplace:** Browse and enable modules from marketplace
