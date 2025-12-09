import React from 'react';
import DataTable from './DataTable';
import { Chip, Avatar, IconButton } from '@mui/material';
import { Edit, Delete, Visibility } from '@mui/icons-material';

export default {
  title: 'Base Components/DataTable',
  component: DataTable,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

// Sample data
const sampleUsers = [
  { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin', status: 'active' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'User', status: 'active' },
  { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'User', status: 'inactive' },
  { id: 4, name: 'Alice Williams', email: 'alice@example.com', role: 'Manager', status: 'active' },
  { id: 5, name: 'Charlie Brown', email: 'charlie@example.com', role: 'User', status: 'pending' },
];

// Basic table
export const Basic = () => {
  const columns = [
    { id: 'name', label: 'Name' },
    { id: 'email', label: 'Email' },
    { id: 'role', label: 'Role' },
    { id: 'status', label: 'Status' },
  ];

  return <DataTable columns={columns} data={sampleUsers} />;
};

// With custom rendering
export const WithCustomRendering = () => {
  const columns = [
    {
      id: 'name',
      label: 'User',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Avatar>{row.name.charAt(0)}</Avatar>
          <div>
            <div style={{ fontWeight: 600 }}>{row.name}</div>
            <div style={{ fontSize: '0.875rem', color: '#6c757d' }}>{row.email}</div>
          </div>
        </div>
      ),
    },
    { id: 'role', label: 'Role' },
    {
      id: 'status',
      label: 'Status',
      render: (row) => {
        const colorMap = {
          active: 'success',
          inactive: 'default',
          pending: 'warning',
        };
        return (
          <Chip
            label={row.status}
            color={colorMap[row.status]}
            size="small"
          />
        );
      },
    },
  ];

  return <DataTable columns={columns} data={sampleUsers} />;
};

// With actions
export const WithActions = () => {
  const columns = [
    { id: 'name', label: 'Name' },
    { id: 'email', label: 'Email' },
    { id: 'role', label: 'Role' },
    {
      id: 'status',
      label: 'Status',
      render: (row) => (
        <Chip
          label={row.status}
          color={row.status === 'active' ? 'success' : 'default'}
          size="small"
        />
      ),
    },
    {
      id: 'actions',
      label: 'Actions',
      sortable: false,
      align: 'right',
      render: (row) => (
        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
          <IconButton size="small" onClick={() => alert(`View ${row.name}`)}>
            <Visibility fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={() => alert(`Edit ${row.name}`)}>
            <Edit fontSize="small" />
          </IconButton>
          <IconButton size="small" color="error" onClick={() => alert(`Delete ${row.name}`)}>
            <Delete fontSize="small" />
          </IconButton>
        </div>
      ),
    },
  ];

  return <DataTable columns={columns} data={sampleUsers} />;
};

// Loading state
export const Loading = () => {
  const columns = [
    { id: 'name', label: 'Name' },
    { id: 'email', label: 'Email' },
    { id: 'role', label: 'Role' },
  ];

  return <DataTable columns={columns} data={[]} loading={true} />;
};

// Empty state
export const Empty = () => {
  const columns = [
    { id: 'name', label: 'Name' },
    { id: 'email', label: 'Email' },
    { id: 'role', label: 'Role' },
  ];

  return (
    <DataTable
      columns={columns}
      data={[]}
      emptyMessage="No users found. Add a user to get started."
    />
  );
};

// With alignment
export const WithAlignment = () => {
  const columns = [
    { id: 'name', label: 'Name', align: 'left' },
    { id: 'email', label: 'Email', align: 'left' },
    { id: 'role', label: 'Role', align: 'center' },
    { id: 'status', label: 'Status', align: 'right' },
  ];

  return <DataTable columns={columns} data={sampleUsers} />;
};

// Sortable table
export const Sortable = () => {
  const columns = [
    { id: 'name', label: 'Name' },
    { id: 'email', label: 'Email' },
    { id: 'role', label: 'Role' },
    { id: 'status', label: 'Status' },
  ];

  const handleSort = (columnId, order) => {
    console.log(`Sorting by ${columnId} in ${order} order`);
  };

  return (
    <DataTable
      columns={columns}
      data={sampleUsers}
      sortable={true}
      onSort={handleSort}
    />
  );
};

// Non-sortable table
export const NonSortable = () => {
  const columns = [
    { id: 'name', label: 'Name' },
    { id: 'email', label: 'Email' },
    { id: 'role', label: 'Role' },
    { id: 'status', label: 'Status' },
  ];

  return <DataTable columns={columns} data={sampleUsers} sortable={false} />;
};

// Large dataset
export const LargeDataset = () => {
  const largeData = Array.from({ length: 50 }, (_, i) => ({
    id: i + 1,
    name: `User ${i + 1}`,
    email: `user${i + 1}@example.com`,
    role: ['Admin', 'User', 'Manager'][i % 3],
    status: ['active', 'inactive', 'pending'][i % 3],
  }));

  const columns = [
    { id: 'id', label: 'ID', align: 'center' },
    { id: 'name', label: 'Name' },
    { id: 'email', label: 'Email' },
    { id: 'role', label: 'Role' },
    {
      id: 'status',
      label: 'Status',
      render: (row) => (
        <Chip
          label={row.status}
          color={row.status === 'active' ? 'success' : row.status === 'pending' ? 'warning' : 'default'}
          size="small"
        />
      ),
    },
  ];

  return <DataTable columns={columns} data={largeData} />;
};

// Complex table
export const Complex = () => {
  const columns = [
    {
      id: 'user',
      label: 'User',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Avatar sx={{ bgcolor: 'primary.main' }}>
            {row.name.split(' ').map(n => n[0]).join('')}
          </Avatar>
          <div>
            <div style={{ fontWeight: 600 }}>{row.name}</div>
            <div style={{ fontSize: '0.875rem', color: '#6c757d' }}>{row.email}</div>
          </div>
        </div>
      ),
    },
    {
      id: 'role',
      label: 'Role',
      align: 'center',
      render: (row) => (
        <Chip
          label={row.role}
          color="primary"
          variant="outlined"
          size="small"
        />
      ),
    },
    {
      id: 'status',
      label: 'Status',
      align: 'center',
      render: (row) => {
        const config = {
          active: { color: 'success', label: 'Active' },
          inactive: { color: 'default', label: 'Inactive' },
          pending: { color: 'warning', label: 'Pending' },
        };
        const { color, label } = config[row.status];
        return <Chip label={label} color={color} size="small" />;
      },
    },
    {
      id: 'actions',
      label: 'Actions',
      sortable: false,
      align: 'right',
      render: (row) => (
        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
          <IconButton
            size="small"
            color="primary"
            onClick={() => alert(`View ${row.name}`)}
          >
            <Visibility fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            color="info"
            onClick={() => alert(`Edit ${row.name}`)}
          >
            <Edit fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            onClick={() => alert(`Delete ${row.name}`)}
          >
            <Delete fontSize="small" />
          </IconButton>
        </div>
      ),
    },
  ];

  return <DataTable columns={columns} data={sampleUsers} />;
};
