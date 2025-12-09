# Common Components Library

Professional, reusable React components for the HR-SM application.

## Components

### Layout Components

#### `PageContainer`
Consistent page layout with header, breadcrumbs, and actions.

```jsx
<PageContainer
  title="Users Management"
  subtitle="Manage system users and permissions"
  breadcrumbs={[
    { label: 'Home', href: '/' },
    { label: 'Users' }
  ]}
  actions={<Button>Add User</Button>}
>
  {/* Page content */}
</PageContainer>
```

#### `StyledCard`
Enhanced card component with header, footer, and actions.

```jsx
<StyledCard
  title="User Details"
  subtitle="View and edit user information"
  action={<IconButton><EditIcon /></IconButton>}
  footer={<Button>Save Changes</Button>}
>
  {/* Card content */}
</StyledCard>
```

### Data Display

#### `DataTable`
Professional data table with sorting, actions, and empty states.

```jsx
<DataTable
  columns={columns}
  data={data}
  onEdit={handleEdit}
  onDelete={handleDelete}
  onView={handleView}
  emptyMessage="No data available"
/>
```

#### `StatsCard`
Dashboard statistics card with icon and trend indicator.

```jsx
<StatsCard
  title="Total Users"
  value="1,234"
  icon={PersonIcon}
  color="primary"
  trend="up"
  trendValue="+12%"
  subtitle="Active users"
/>
```

#### `StatusChip`
Color-coded status indicator chip.

```jsx
<StatusChip status="active" />
<StatusChip status="pending" label="In Review" />
```

### User Input

#### `SearchBar`
Enhanced search input with icon.

```jsx
<SearchBar
  value={searchTerm}
  onChange={(e) => setSearchTerm(e.target.value)}
  placeholder="Search users..."
/>
```

#### `FilterBar`
Multi-filter bar with clear functionality.

```jsx
<FilterBar
  filters={[
    { name: 'role', label: 'Role', type: 'select', options: [...] },
    { name: 'status', label: 'Status', type: 'select', options: [...] }
  ]}
  activeFilters={filters}
  onFilterChange={handleFilterChange}
  onClearFilters={handleClearFilters}
/>
```

### Feedback

#### `Loading`
Professional loading spinner with message.

```jsx
<Loading message="Loading data..." fullScreen />
```

#### `EmptyState`
Empty state UI with icon and action.

```jsx
<EmptyState
  icon={InboxIcon}
  title="No users found"
  description="Get started by adding your first user"
  actionLabel="Add User"
  onAction={handleAddUser}
/>
```

#### `ConfirmDialog`
Confirmation dialog with icon and actions.

```jsx
<ConfirmDialog
  open={open}
  title="Delete User"
  message="Are you sure you want to delete this user?"
  onConfirm={handleConfirm}
  onCancel={handleCancel}
  confirmColor="error"
/>
```

### Actions

#### `ActionMenu`
Dropdown menu for table row actions.

```jsx
<ActionMenu
  actions={[
    { label: 'Edit', icon: <EditIcon />, onClick: handleEdit },
    { label: 'Delete', icon: <DeleteIcon />, onClick: handleDelete, color: 'error.main', divider: true }
  ]}
/>
```

## Design System

### Colors
- Primary: #2563eb (Blue)
- Secondary: #7c3aed (Purple)
- Success: #10b981 (Green)
- Error: #ef4444 (Red)
- Warning: #f59e0b (Amber)
- Info: #3b82f6 (Blue)

### Typography
- Font Family: Inter, Roboto, Helvetica, Arial
- Weights: 300, 400, 500, 600, 700, 800

### Spacing
- Base: 8px
- Scale: 0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10

### Border Radius
- Small: 8px
- Medium: 12px
- Large: 16px

### Shadows
- Level 1: Subtle
- Level 2: Default
- Level 3: Elevated
- Level 4: High

## Best Practices

1. **Consistency**: Use these components across the application for consistent UI
2. **Accessibility**: All components include proper ARIA labels and keyboard navigation
3. **Responsiveness**: Components adapt to different screen sizes
4. **Dark Mode**: Full support for light and dark themes
5. **Performance**: Optimized with React.memo and proper prop types
