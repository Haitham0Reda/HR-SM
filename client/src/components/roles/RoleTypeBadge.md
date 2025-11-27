# RoleTypeBadge Component

## Overview

The `RoleTypeBadge` component is a reusable badge that displays the role type (System vs Custom) with consistent styling across all role management views.

## Purpose

This component ensures visual consistency when displaying role types throughout the application. It provides:
- Consistent color coding (red for system roles, green for custom roles)
- Accessible labels for screen readers
- Flexible sizing and styling options
- Centralized styling logic for easy maintenance

## Usage

### Basic Usage

```jsx
import RoleTypeBadge from '../../components/roles/RoleTypeBadge';

// Display a system role badge
<RoleTypeBadge isSystemRole={true} />

// Display a custom role badge
<RoleTypeBadge isSystemRole={false} />
```

### With Options

```jsx
// Medium size badge
<RoleTypeBadge isSystemRole={true} size="medium" />

// Badge with icon
<RoleTypeBadge isSystemRole={false} showIcon={true} />

// Outlined variant
<RoleTypeBadge isSystemRole={true} variant="outlined" />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isSystemRole` | `boolean` | - | **Required.** Whether the role is a system role |
| `size` | `'small' \| 'medium'` | `'small'` | Size of the badge |
| `showIcon` | `boolean` | `false` | Whether to show an icon in the badge |
| `variant` | `'filled' \| 'outlined'` | `'filled'` | Visual variant of the badge |

## Color Scheme

### System Roles (Red)
- Background: `alpha('#d32f2f', 0.1)` (light red)
- Text: `error.main` (red)
- Border: `alpha('#d32f2f', 0.3)` (medium red)

### Custom Roles (Green)
- Background: `alpha('#2e7d32', 0.1)` (light green)
- Text: `success.main` (green)
- Border: `alpha('#2e7d32', 0.3)` (medium green)

## Accessibility

The component includes:
- Proper ARIA labels (`aria-label`) that describe the role type
- Semantic HTML structure
- Sufficient color contrast for WCAG AA compliance
- Keyboard accessible (inherits from MUI Chip)

## Where It's Used

1. **RolesPage** (Table View)
   - In the "Type" column of the roles table
   - Shows "System" or "Custom" for each role

2. **RoleViewPage** (Detail View)
   - In the page header next to the role name
   - In the "Role Type" metadata card

3. **RoleEditPage** (Edit Form)
   - In the page header when editing an existing role
   - Helps users identify if they're editing a system or custom role

## Examples

### In a Table
```jsx
<TableCell align="center">
    <RoleTypeBadge isSystemRole={role.isSystemRole} />
</TableCell>
```

### In a Header
```jsx
<Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
    <Typography variant="h4">Role Name</Typography>
    <RoleTypeBadge isSystemRole={true} size="medium" />
</Box>
```

### In a Card
```jsx
<Card>
    <CardContent>
        <Typography variant="caption">ROLE TYPE</Typography>
        <RoleTypeBadge isSystemRole={false} size="medium" />
    </CardContent>
</Card>
```

## Design Decisions

1. **Color Choice**: Red for system roles indicates "caution" (cannot be deleted), green for custom roles indicates "safe to modify"

2. **Consistent Sizing**: Small size by default to fit in tables, medium size available for headers and cards

3. **Icon Support**: Optional icons provide additional visual distinction when needed

4. **Variant Support**: Outlined variant available for use on colored backgrounds

## Maintenance

To update the color scheme globally:
1. Edit the `colors` object in `RoleTypeBadge.jsx`
2. All instances across the app will update automatically

To add new variants:
1. Add the variant to the props
2. Add styling logic in the `sx` prop
3. Update this documentation
