# Role Type Badge Visual Examples

## Badge Appearance

### System Role Badge (Red)
```
┌─────────────┐
│   System    │  ← Red background (light)
└─────────────┘     Red text
                    Red border
```

### Custom Role Badge (Green)
```
┌─────────────┐
│   Custom    │  ← Green background (light)
└─────────────┘     Green text
                    Green border
```

## Usage Examples

### 1. In Roles Table (RolesPage)

```
┌──────────────────────────────────────────────────────────────────────┐
│ Name          │ Display Name  │ Description  │ Permissions │ Type    │
├──────────────────────────────────────────────────────────────────────┤
│ admin         │ Administrator │ Full access  │     45      │ System  │ ← Red badge
│ hr            │ HR Manager    │ HR access    │     32      │ System  │ ← Red badge
│ custom-lead   │ Team Lead     │ Custom role  │     18      │ Custom  │ ← Green badge
└──────────────────────────────────────────────────────────────────────┘
```

### 2. In Role Detail View (RoleViewPage)

```
┌────────────────────────────────────────────────────────────┐
│  🔒  Administrator                                          │
│      System Role  admin                                    │ ← Badge in header
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ ROLE TYPE                                            │ │
│  │ System Role                                          │ │ ← Badge in card
│  └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

### 3. In Role Edit Form (RoleEditPage)

```
┌────────────────────────────────────────────────────────────┐
│  🔒  Edit Role  System Role                                │ ← Badge in header
│      Update role information and permissions               │
│                                                            │
│  ⚠️  This is a system role. You can modify permissions    │
│      but cannot change the role name.                     │
└────────────────────────────────────────────────────────────┘
```

## Color Specifications

### System Role (Red Theme)
- **Background:** `rgba(211, 47, 47, 0.1)` - 10% opacity red
- **Text Color:** `#d32f2f` - Material-UI error.main
- **Border:** `rgba(211, 47, 47, 0.3)` - 30% opacity red
- **Meaning:** Indicates protected/system-managed roles that cannot be deleted

### Custom Role (Green Theme)
- **Background:** `rgba(46, 125, 50, 0.1)` - 10% opacity green
- **Text Color:** `#2e7d32` - Material-UI success.main
- **Border:** `rgba(46, 125, 50, 0.3)` - 30% opacity green
- **Meaning:** Indicates user-created roles that can be modified or deleted

## Responsive Behavior

### Desktop (≥1024px)
- Font size: 0.8125rem (13px)
- Full label: "System" or "Custom"
- Standard padding

### Tablet (768px - 1023px)
- Font size: 0.8125rem (13px)
- Full label: "System" or "Custom"
- Standard padding

### Mobile (<768px)
- Font size: 0.7rem (11.2px)
- Full label: "System" or "Custom"
- Slightly reduced padding

## Accessibility

### Screen Reader Announcement
- System Role: "Role type: System Role"
- Custom Role: "Role type: Custom Role"

### Keyboard Navigation
- Badges inherit keyboard accessibility from MUI Chip
- Focusable when interactive
- Proper tab order in forms and tables

### Color Contrast
- System Role: Red text on light red background - WCAG AA compliant
- Custom Role: Green text on light green background - WCAG AA compliant
- Both combinations provide sufficient contrast for readability

## Design Rationale

### Why Red for System Roles?
- Red traditionally indicates "caution" or "stop"
- Signals to users that these roles are protected
- Prevents accidental deletion or modification
- Consistent with error/warning color schemes

### Why Green for Custom Roles?
- Green traditionally indicates "go" or "safe"
- Signals that these roles can be freely modified
- Indicates user-created content
- Consistent with success color schemes

### Why Badges Instead of Text?
- More visually distinctive
- Easier to scan in tables
- Consistent with modern UI patterns
- Better visual hierarchy
- Supports color-coding for quick identification
