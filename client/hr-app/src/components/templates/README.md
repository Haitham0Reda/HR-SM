# Page Templates

This directory contains reusable page templates that provide consistent layouts and functionality across the HR Management Dashboard application.

## Available Templates

### 1. ListPage

A template for list/index pages with search, filters, and pagination.

**Features:**
- Search functionality
- Filter options with active filter display
- Pagination controls
- Loading and empty states
- Responsive table layout
- Row click handlers
- Action buttons (Add, Refresh)

**Usage:**
```jsx
import ListPage from './components/templates/ListPage';

<ListPage
  title="Users"
  subtitle="Manage system users"
  items={users}
  columns={columns}
  onSearch={handleSearch}
  onAdd={handleAdd}
  loading={loading}
/>
```

**Example:** See `examples/ListPageExample.jsx`

---

### 2. DetailPage

A template for detail/show pages with header actions and tabbed content.

**Features:**
- Breadcrumb navigation
- Header with title, subtitle, and status
- Metadata display
- Action buttons (Edit, Delete, Back)
- Tabbed content sections
- Loading and error states

**Usage:**
```jsx
import DetailPage from './components/templates/DetailPage';

<DetailPage
  title="User Details"
  subtitle="John Doe"
  breadcrumbs={breadcrumbs}
  tabs={tabs}
  onEdit={handleEdit}
  loading={loading}
/>
```

**Example:** See `examples/DetailPageExample.jsx`

---

### 3. FormPage

A template for create/edit pages with form sections and validation.

**Features:**
- Form sections with titles and descriptions
- Save/cancel actions
- Loading states on submit
- Error and success alerts
- Unsaved changes warning
- Breadcrumb navigation

**Usage:**
```jsx
import FormPage from './components/templates/FormPage';

<FormPage
  title="Create User"
  sections={sections}
  onSubmit={handleSubmit}
  onCancel={handleCancel}
  loading={loading}
/>
```

**Example:** See `examples/FormPageExample.jsx`

---

### 4. DashboardPage

A template for dashboard pages with stat cards, widgets, and responsive grid layout.

**Features:**
- Stat cards for key metrics with trend indicators
- Widget grid with responsive sizing
- Loading and empty states
- Refresh and settings actions
- Customizable spacing
- Support for different widget sizes (small, medium, large, full)

**Usage:**
```jsx
import DashboardPage from './components/templates/DashboardPage';

<DashboardPage
  title="Dashboard"
  subtitle="Welcome back!"
  stats={stats}
  widgets={widgets}
  onRefresh={handleRefresh}
  loading={loading}
/>
```

**Stats Configuration:**
```jsx
const stats = [
  {
    id: 'total-users',
    icon: <PeopleIcon />,
    label: 'Total Users',
    value: '1,234',
    trend: {
      value: 12,
      direction: 'up',
    },
    color: 'primary',
    size: 'small',
  },
];
```

**Widgets Configuration:**
```jsx
const widgets = [
  {
    id: 'recent-activity',
    content: <RecentActivityWidget />,
    size: 'large',
  },
  {
    id: 'quick-action',
    content: <ActionCard {...actionProps} />,
    size: 'medium',
  },
];
```

**Example:** See `examples/DashboardPageExample.jsx`

---

## Common Props

All templates share some common props:

- `title` (string, required): Page title
- `subtitle` (string, optional): Page subtitle or description
- `loading` (boolean, optional): Loading state
- `error` (string, optional): Error message to display
- `actions` (node, optional): Custom action buttons

## Layout Integration

All page templates are designed to work within the `DashboardLayout` component, which provides:
- Collapsible sidebar navigation
- Top navigation bar with user profile and notifications
- Theme toggle
- Responsive behavior

## Responsive Design

All templates are fully responsive and adapt to different screen sizes:
- **Mobile (<600px)**: Single column layout, overlay navigation
- **Tablet (600-960px)**: Adjusted grid layouts, collapsible sidebar
- **Desktop (>960px)**: Full grid layouts, expanded sidebar

## Widget Sizes

When using the DashboardPage template, widgets can be sized using the following options:

- `small`: 3 columns on desktop, 2 on tablet, 1 on mobile
- `medium`: 4 columns on desktop, 2 on tablet, 1 on mobile
- `large`: 6 columns on desktop, full width on tablet/mobile
- `full`: Full width on all screen sizes

## Best Practices

1. **Consistent Spacing**: Use the spacing values from `designTokens` for consistent margins and padding
2. **Loading States**: Always provide loading states for async operations
3. **Empty States**: Provide meaningful empty state messages and icons
4. **Error Handling**: Display user-friendly error messages
5. **Accessibility**: Ensure all interactive elements are keyboard accessible
6. **Responsive**: Test templates on different screen sizes

## Examples

Each template has a corresponding example file in the `examples/` directory that demonstrates:
- Complete implementation
- Common use cases
- Event handlers
- Data formatting
- Integration with other components

To run examples:
1. Import the example component
2. Add it to your routing configuration
3. Navigate to the route to see the template in action

## Extending Templates

To create a custom template:

1. Follow the existing template structure
2. Use design tokens for styling consistency
3. Implement responsive behavior
4. Add loading and empty states
5. Create a comprehensive example
6. Document props and usage

## Related Components

Templates use these composite components:
- `StatCard`: For displaying statistics
- `ActionCard`: For quick action cards
- `DataGrid`: For responsive grid layouts
- `UserCard`: For user information display

See the `components/composite/` directory for more information.
