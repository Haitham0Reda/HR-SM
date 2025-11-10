# HR-SM Style Guide

## 🎨 Design System

### Color Palette

#### Primary Colors
- **Primary Blue**: `#2563eb` - Main brand color, buttons, links
- **Secondary Purple**: `#7c3aed` - Accents, secondary actions

#### Semantic Colors
- **Success Green**: `#10b981` - Success states, positive actions
- **Error Red**: `#ef4444` - Errors, destructive actions
- **Warning Amber**: `#f59e0b` - Warnings, caution states
- **Info Blue**: `#3b82f6` - Information, neutral actions

#### Neutral Colors
- **Light Mode**:
  - Background: `#f8fafc`
  - Paper: `#ffffff`
  - Text Primary: `#0f172a`
  - Text Secondary: `#64748b`
  - Divider: `#e2e8f0`

- **Dark Mode**:
  - Background: `#0f172a`
  - Paper: `#1e293b`
  - Text Primary: `#f1f5f9`
  - Text Secondary: `#94a3b8`
  - Divider: `#334155`

### Typography

#### Font Family
```css
font-family: 'Inter', 'Roboto', 'Helvetica', 'Arial', sans-serif;
```

#### Font Weights
- Light: 300
- Regular: 400
- Medium: 500
- Semibold: 600
- Bold: 700
- Extrabold: 800

#### Type Scale
- H1: 2.5rem (40px) - Bold
- H2: 2rem (32px) - Bold
- H3: 1.75rem (28px) - Semibold
- H4: 1.5rem (24px) - Semibold
- H5: 1.25rem (20px) - Semibold
- H6: 1rem (16px) - Semibold
- Body1: 1rem (16px) - Regular
- Body2: 0.875rem (14px) - Regular
- Caption: 0.75rem (12px) - Regular

### Spacing

Base unit: **8px**

Scale:
- 0.5 = 4px
- 1 = 8px
- 1.5 = 12px
- 2 = 16px
- 2.5 = 20px
- 3 = 24px
- 4 = 32px
- 5 = 40px
- 6 = 48px

### Border Radius

- Small: 8px (buttons, inputs)
- Medium: 12px (cards, dialogs)
- Large: 16px (large cards)
- XLarge: 24px (hero sections)

### Shadows

```css
/* Level 1 - Subtle */
box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);

/* Level 2 - Default */
box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);

/* Level 3 - Elevated */
box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);

/* Level 4 - High */
box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
```

### Transitions

```css
/* Fast - Hover states */
transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);

/* Normal - Default */
transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);

/* Slow - Complex animations */
transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
```

## 📐 Layout Guidelines

### Page Structure

```jsx
<PageContainer
  title="Page Title"
  subtitle="Page description"
  breadcrumbs={[...]}
  actions={<Button>Action</Button>}
>
  {/* Page content */}
</PageContainer>
```

### Grid System

Use Material-UI Grid with 12-column layout:
- Mobile (xs): 12 columns
- Tablet (sm): 6 columns
- Desktop (md): 4 columns
- Large (lg): 3 columns

### Responsive Padding

```jsx
sx={{
  p: { xs: 2, sm: 3, md: 4 }
}}
```

## 🎯 Component Usage

### Buttons

```jsx
// Primary action
<Button variant="contained" size="large">
  Primary Action
</Button>

// Secondary action
<Button variant="outlined" size="large">
  Secondary Action
</Button>

// Tertiary action
<Button variant="text" size="medium">
  Tertiary Action
</Button>
```

### Cards

```jsx
<StyledCard
  title="Card Title"
  subtitle="Card description"
  action={<IconButton><MoreVertIcon /></IconButton>}
>
  {/* Content */}
</StyledCard>
```

### Forms

```jsx
<TextField
  fullWidth
  label="Field Label"
  helperText="Helper text"
  sx={{
    '& .MuiOutlinedInput-root': {
      backgroundColor: 'background.default',
    },
  }}
/>
```

### Tables

```jsx
<DataTable
  columns={columns}
  data={data}
  onEdit={handleEdit}
  onDelete={handleDelete}
  emptyMessage="No data available"
/>
```

## ♿ Accessibility

### ARIA Labels

Always include ARIA labels for interactive elements:

```jsx
<IconButton aria-label="Delete user">
  <DeleteIcon />
</IconButton>
```

### Keyboard Navigation

- Tab: Navigate between elements
- Enter/Space: Activate buttons
- Escape: Close dialogs/menus
- Arrow keys: Navigate lists/menus

### Focus States

All interactive elements have visible focus indicators:

```css
*:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}
```

## 🎭 Animation Guidelines

### Hover Effects

```jsx
sx={{
  transition: 'all 0.2s',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: 4,
  },
}}
```

### Loading States

Use the Loading component with appropriate messages:

```jsx
<Loading message="Loading users..." />
```

### Empty States

Use EmptyState component for no-data scenarios:

```jsx
<EmptyState
  icon={InboxIcon}
  title="No data found"
  description="Get started by adding your first item"
  actionLabel="Add Item"
  onAction={handleAdd}
/>
```

## 📱 Responsive Design

### Breakpoints

- xs: 0px (mobile)
- sm: 600px (tablet)
- md: 900px (desktop)
- lg: 1200px (large desktop)
- xl: 1536px (extra large)

### Mobile-First Approach

Always design for mobile first, then enhance for larger screens:

```jsx
sx={{
  fontSize: { xs: '1rem', md: '1.25rem' },
  p: { xs: 2, sm: 3, md: 4 },
}}
```

## 🌓 Dark Mode

All components support dark mode automatically through the theme system.

### Testing Dark Mode

Toggle between light and dark modes using the theme switcher in the header.

## 📝 Code Style

### Component Structure

```jsx
import React from 'react';
import { Box, Typography } from '@mui/material';
import PropTypes from 'prop-types';

const ComponentName = ({ prop1, prop2 }) => {
  return (
    <Box>
      <Typography>{prop1}</Typography>
    </Box>
  );
};

ComponentName.propTypes = {
  prop1: PropTypes.string.isRequired,
  prop2: PropTypes.number,
};

export default ComponentName;
```

### Naming Conventions

- Components: PascalCase (e.g., `UserCard`)
- Files: PascalCase for components (e.g., `UserCard.jsx`)
- Functions: camelCase (e.g., `handleSubmit`)
- Constants: UPPER_SNAKE_CASE (e.g., `API_URL`)

## 🚀 Performance

### Optimization Tips

1. Use React.memo for expensive components
2. Implement proper key props in lists
3. Lazy load routes and heavy components
4. Optimize images and assets
5. Use proper loading states

## 📚 Resources

- [Material-UI Documentation](https://mui.com/)
- [Inter Font](https://fonts.google.com/specimen/Inter)
- [React Best Practices](https://react.dev/)
