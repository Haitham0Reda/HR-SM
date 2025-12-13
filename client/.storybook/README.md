# Storybook for HR Management Platform

This Storybook instance showcases all components from both the HR Application and Platform Administration interfaces, providing a unified design system and component library.

## Running Storybook

To start Storybook in development mode from the root:

```bash
npm run client
# or
npm run dev
```

Or from the client directory:

```bash
npm run storybook
```

This will start Storybook on `http://localhost:6006`

## Applications Included

### HR Application (`hr-app`)
- Employee management components
- Dashboard widgets and templates
- Form components and validation
- License management components
- Common UI components (buttons, cards, tables)

### Platform Administration (`platform-admin`)
- Multi-tenant management components
- Company administration interfaces
- Platform-level configuration components
- Modern theme system with gradient support

## Building Storybook

To build a static version of Storybook:

```bash
npm run build-storybook
```

The static files will be generated in the `storybook-static` directory.

## Story Organization

Stories are organized into the following categories:

### Base Components
- **Button** - Standardized button component with variants, sizes, and states
- **TextField** - Text input fields with validation and helper text
- **Card** - Container component for grouped content
- **Chip** - Small status indicators and tags
- **Select** - Dropdown selection component
- **Modal** - Dialog component for overlays
- **Tabs** - Tabbed navigation component
- **DataTable** - Table component with sorting and filtering

### Composite Components
- **StatCard** - Statistics display cards with trends
- **ActionCard** - Quick action cards with icons and CTAs
- **UserCard** - User profile cards with actions
- **FormSection** - Form field grouping component

### Page Templates
- **ListPage** - Template for list/index pages with search and filters
- **DetailPage** - Template for detail/show pages with tabs
- **FormPage** - Template for create/edit pages with validation
- **DashboardPage** - Template for dashboard pages with widgets

## Theme Support

All stories are wrapped with the `ThemeConfigProvider` which provides:
- Light and dark mode support
- Design tokens access
- Consistent styling across all components

You can switch between light and dark backgrounds using the Storybook toolbar.

## Adding New Stories

To add a new story:

1. Create a `.stories.jsx` file next to your component
2. Import the component and any dependencies
3. Define the story metadata using the default export
4. Create story variations using named exports

Example:

```jsx
import React from 'react';
import MyComponent from './MyComponent';

export default {
  title: 'Category/MyComponent',
  component: MyComponent,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export const Default = {
  args: {
    prop1: 'value1',
    prop2: 'value2',
  },
};

export const Variant = () => (
  <MyComponent prop1="different" prop2="values" />
);
```

## Documentation

Each component story includes:
- Interactive controls for props
- Auto-generated documentation from PropTypes
- Multiple usage examples
- Different states and variants

Use the "Docs" tab in Storybook to view the full documentation for each component.
