import React from 'react';
import ListPage from './ListPage';
import { Chip, IconButton } from '@mui/material';
import { Edit, Delete, Visibility } from '@mui/icons-material';

export default {
  title: 'Page Templates/ListPage',
  component: ListPage,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

// Sample data
const sampleUsers = Array.from({ length: 25 }, (_, i) => ({
  id: i + 1,
  name: `User ${i + 1}`,
  email: `user${i + 1}@example.com`,
  role: ['Admin', 'Manager', 'Employee'][i % 3],
  status: ['active', 'inactive', 'pending'][i % 3],
  joinDate: new Date(2024, i % 12, (i % 28) + 1).toLocaleDateString(),
}));

const columns = [
  { id: 'name', label: 'Name' },
  { id: 'email', label: 'Email' },
  {
    id: 'role',
    label: 'Role',
    format: (value) => (
      <Chip label={value} color="primary" size="small" variant="outlined" />
    ),
  },
  {
    id: 'status',
    label: 'Status',
    format: (value) => {
      const colorMap = { active: 'success', inactive: 'default', pending: 'warning' };
      return <Chip label={value} color={colorMap[value]} size="small" />;
    },
  },
  { id: 'joinDate', label: 'Join Date' },
];

// Basic list page
export const Basic = () => (
  <ListPage
    title="Users"
    subtitle="Manage all users in the system"
    items={sampleUsers}
    columns={columns}
    totalCount={sampleUsers.length}
    onAdd={() => alert('Add new user')}
    onRowClick={(item) => alert(`View ${item.name}`)}
  />
);

// With search
export const WithSearch = () => (
  <ListPage
    title="Users"
    subtitle="Search and filter users"
    items={sampleUsers}
    columns={columns}
    totalCount={sampleUsers.length}
    searchPlaceholder="Search users..."
    onSearch={(value) => console.log('Search:', value)}
    onAdd={() => alert('Add new user')}
  />
);

// With filters
export const WithFilters = () => (
  <ListPage
    title="Users"
    subtitle="Filter users by role and status"
    items={sampleUsers}
    columns={columns}
    totalCount={sampleUsers.length}
    filters={[
      { key: 'role', label: 'Admin', value: 'admin' },
      { key: 'role', label: 'Manager', value: 'manager' },
      { key: 'role', label: 'Employee', value: 'employee' },
      { key: 'status', label: 'Active', value: 'active' },
      { key: 'status', label: 'Inactive', value: 'inactive' },
    ]}
    activeFilters={{}}
    onFilterChange={(key, value) => console.log('Filter:', key, value)}
    onAdd={() => alert('Add new user')}
  />
);

// Loading state
export const Loading = () => (
  <ListPage
    title="Users"
    subtitle="Loading users..."
    items={[]}
    columns={columns}
    loading={true}
    totalCount={0}
  />
);

// Empty state
export const Empty = () => (
  <ListPage
    title="Users"
    subtitle="No users found"
    items={[]}
    columns={columns}
    totalCount={0}
    emptyMessage="No users found. Add a user to get started."
    onAdd={() => alert('Add new user')}
  />
);

// With actions column
export const WithActionsColumn = () => {
  const columnsWithActions = [
    ...columns,
    {
      id: 'actions',
      label: 'Actions',
      align: 'right',
      format: (value, item) => (
        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); alert(`View ${item.name}`); }}>
            <Visibility fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); alert(`Edit ${item.name}`); }}>
            <Edit fontSize="small" />
          </IconButton>
          <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); alert(`Delete ${item.name}`); }}>
            <Delete fontSize="small" />
          </IconButton>
        </div>
      ),
    },
  ];

  return (
    <ListPage
      title="Users"
      subtitle="Manage users with actions"
      items={sampleUsers}
      columns={columnsWithActions}
      totalCount={sampleUsers.length}
      onAdd={() => alert('Add new user')}
    />
  );
};

// With pagination
export const WithPagination = () => (
  <ListPage
    title="Users"
    subtitle="Paginated user list"
    items={sampleUsers.slice(0, 10)}
    columns={columns}
    pagination={true}
    page={0}
    rowsPerPage={10}
    totalCount={sampleUsers.length}
    onPageChange={(page) => console.log('Page:', page)}
    onRowsPerPageChange={(rows) => console.log('Rows per page:', rows)}
    onAdd={() => alert('Add new user')}
  />
);

// Complete example
export const CompleteExample = () => (
  <ListPage
    title="Users"
    subtitle="Complete user management interface"
    items={sampleUsers.slice(0, 10)}
    columns={columns}
    searchPlaceholder="Search by name or email..."
    onSearch={(value) => console.log('Search:', value)}
    filters={[
      { key: 'role', label: 'Admin', value: 'admin' },
      { key: 'role', label: 'Manager', value: 'manager' },
      { key: 'status', label: 'Active', value: 'active' },
    ]}
    activeFilters={{ role: 'admin' }}
    onFilterChange={(key, value) => console.log('Filter:', key, value)}
    pagination={true}
    page={0}
    rowsPerPage={10}
    totalCount={sampleUsers.length}
    onPageChange={(page) => console.log('Page:', page)}
    onRowsPerPageChange={(rows) => console.log('Rows per page:', rows)}
    onAdd={() => alert('Add new user')}
    onRefresh={() => alert('Refresh data')}
    onRowClick={(item) => alert(`View ${item.name}`)}
  />
);
