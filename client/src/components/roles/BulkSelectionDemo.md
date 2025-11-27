# Bulk Selection Features - Visual Demo

## Component Hierarchy

```
RoleEditPage
├── Permission Count Card (Real-time)
│   └── "15 / 87" display
├── Bulk Action Buttons
│   ├── [Select All Permissions]
│   └── [Clear All 🗙]
└── Permission Categories
    ├── PermissionCategoryAccordion (User Management)
    │   ├── Header
    │   │   ├── [☑] Select All Checkbox
    │   │   ├── "User Management" Label
    │   │   └── [3/6] Count Chip
    │   └── Details (Expanded)
    │       ├── [☑] users.view
    │       ├── [☑] users.create
    │       ├── [☑] users.edit
    │       ├── [☐] users.delete
    │       ├── [☐] users.manage-roles
    │       └── [☐] users.manage-permissions
    ├── PermissionCategoryAccordion (Documents)
    │   └── ...
    └── PermissionCategoryAccordion (Reports)
        └── ...
```

## User Interaction Examples

### Example 1: Select All in Category

**Before:**
```
┌─────────────────────────────────────────────┐
│ ☐ User Management              [0/6] ▼     │
└─────────────────────────────────────────────┘
```

**User clicks category checkbox**

**After:**
```
┌─────────────────────────────────────────────┐
│ ☑ User Management              [6/6] ▼     │
│                                             │
│   ☑ users.view                              │
│   ☑ users.create                            │
│   ☑ users.edit                              │
│   ☑ users.delete                            │
│   ☑ users.manage-roles                      │
│   ☑ users.manage-permissions                │
└─────────────────────────────────────────────┘
```

### Example 2: Indeterminate State

**User selects 3 out of 6 permissions:**
```
┌─────────────────────────────────────────────┐
│ ☑ User Management              [3/6] ▼     │
│ (indeterminate)                             │
│                                             │
│   ☑ users.view                              │
│   ☑ users.create                            │
│   ☑ users.edit                              │
│   ☐ users.delete                            │
│   ☐ users.manage-roles                      │
│   ☐ users.manage-permissions                │
└─────────────────────────────────────────────┘
```

### Example 3: Select All Permissions

**Before:**
```
┌─────────────────────────┐
│ Selected Permissions    │
│                         │
│        0 / 87           │
└─────────────────────────┘

[Select All Permissions]  [Clear All] (disabled)
```

**User clicks "Select All Permissions"**

**After:**
```
┌─────────────────────────┐
│ Selected Permissions    │
│                         │
│        87 / 87          │
└─────────────────────────┘

[Select All Permissions] (disabled)  [Clear All]

✓ Selected all 87 permissions (notification)
```

### Example 4: Clear All

**Before:**
```
┌─────────────────────────┐
│ Selected Permissions    │
│                         │
│        15 / 87          │
└─────────────────────────┘

☑ User Management              [6/6]
☑ Documents                    [5/8]
☑ Reports                      [4/4]
```

**User clicks "Clear All"**

**After:**
```
┌─────────────────────────┐
│ Selected Permissions    │
│                         │
│        0 / 87           │
└─────────────────────────┘

☐ User Management              [0/6]
☐ Documents                    [0/8]
☐ Reports                      [0/4]

ℹ All permissions cleared (notification)
```

## Visual States

### Chip Badge Colors

**No Selection:**
```
[0/6]  ← Outlined, default color
```

**Partial Selection:**
```
[3/6]  ← Filled, primary color
```

**Full Selection:**
```
[6/6]  ← Filled, primary color
```

### Checkbox States

**Unchecked:**
```
☐  All permissions deselected
```

**Checked:**
```
☑  All permissions selected
```

**Indeterminate:**
```
☑  Some permissions selected
(dash/minus icon in checkbox)
```

### Button States

**Enabled:**
```
[Select All Permissions]  ← Blue outline, clickable
[Clear All 🗙]            ← Gray outline, clickable
```

**Disabled:**
```
[Select All Permissions]  ← Gray, not clickable
[Clear All 🗙]            ← Gray, not clickable
```

## Hover Effects

### Category Header
```
Normal:     Background: transparent
Hover:      Background: light gray (action.hover)
```

### Permission Item
```
Normal:     Background: transparent
Hover:      Background: light gray (action.hover)
            Transition: 0.2s smooth
```

### Checkbox
```
Normal:     Border: gray
Hover:      Border: primary color
Checked:    Background: primary color
```

## Tooltips

### Category Select All
```
Hover over checkbox:
┌─────────────────┐
│ Select all      │  ← When unchecked
└─────────────────┘

┌─────────────────┐
│ Deselect all    │  ← When checked
└─────────────────┘
```

### Individual Permission
```
Hover over permission:
┌──────────────────────────────┐
│ View users                   │
│                              │
│ Allows viewing user profiles │
│ and basic information        │
└──────────────────────────────┘
```

## Responsive Behavior

### Desktop (1024px+)
```
┌────────────────────────────────────────────────────┐
│ Permissions                    ┌─────────────────┐ │
│                                │ Selected        │ │
│                                │ Permissions     │ │
│                                │                 │ │
│                                │    15 / 87      │ │
│                                └─────────────────┘ │
│                                                    │
│ [Select All]  [Clear All]                         │
│                                                    │
│ ☑ User Management                        [6/6] ▼  │
│ ☐ Documents                              [0/8] ▼  │
└────────────────────────────────────────────────────┘
```

### Tablet (768px+)
```
┌──────────────────────────────────┐
│ Permissions                      │
│                                  │
│ ┌─────────────────┐              │
│ │ Selected        │              │
│ │ Permissions     │              │
│ │    15 / 87      │              │
│ └─────────────────┘              │
│                                  │
│ [Select All]  [Clear All]        │
│                                  │
│ ☑ User Management      [6/6] ▼   │
└──────────────────────────────────┘
```

## Animation & Transitions

### Accordion Expand/Collapse
```
Duration: 300ms
Easing: ease-in-out
```

### Checkbox State Change
```
Duration: 150ms
Easing: ease
```

### Background Hover
```
Duration: 200ms
Easing: ease
Property: background-color
```

### Chip Color Change
```
Duration: 200ms
Easing: ease
Property: background-color, border-color
```

## Accessibility Features

### Keyboard Navigation
```
Tab       → Move to next interactive element
Shift+Tab → Move to previous interactive element
Space     → Toggle checkbox
Enter     → Expand/collapse accordion
```

### Screen Reader Announcements
```
"Select all checkbox, unchecked"
"User Management, 3 of 6 permissions selected"
"users.view checkbox, checked, View users"
"Selected all 87 permissions" (notification)
```

### Focus Indicators
```
Focused element: Blue outline (2px)
Visible on keyboard navigation
Removed on mouse click
```

## Performance Optimizations

### Memoized Calculations
```javascript
// Count only recalculated when permissions change
const selectedCount = useMemo(() => {
  return permissions.filter(p => 
    selectedPermissions.includes(p)
  ).length;
}, [permissions, selectedPermissions]);
```

### Efficient State Updates
```javascript
// Single state update for bulk operations
setRoleData(prev => ({
  ...prev,
  permissions: newPermissions
}));
```

### Conditional Rendering
```javascript
// Only render categories with selected permissions in view mode
if (selectedInCategory.length === 0) {
  return null;
}
```

## Error Handling

### Validation
```
No permissions selected:
┌────────────────────────────────────┐
│ ⚠ At least one permission must be │
│   selected                         │
└────────────────────────────────────┘
```

### API Errors
```
Failed to save:
┌────────────────────────────────────┐
│ ✕ Failed to save role              │
│   Please try again                 │
└────────────────────────────────────┘
```

## Summary

The bulk selection implementation provides:
- ✅ Intuitive category-level selection
- ✅ Global select/clear all operations
- ✅ Real-time visual feedback
- ✅ Smooth animations and transitions
- ✅ Accessible keyboard navigation
- ✅ Clear visual states and indicators
- ✅ Responsive design
- ✅ Performance optimizations
