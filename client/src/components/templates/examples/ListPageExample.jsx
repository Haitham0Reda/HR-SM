/**
 * ListPage Template Example
 * 
 * Demonstrates how to use the ListPage template for creating list/index pages.
 */

import React, { useState } from 'react';
import ListPage from '../ListPage';
import { Chip, IconButton } from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  People as PeopleIcon,
} from '@mui/icons-material';

const ListPageExample = () => {
  const [items, setItems] = useState([
    { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin', status: 'Active' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'User', status: 'Active' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'User', status: 'Inactive' },
    { id: 4, name: 'Alice Williams', email: 'alice@example.com', role: 'Manager', status: 'Active' },
    { id: 5, name: 'Charlie Brown', email: 'charlie@example.com', role: 'User', status: 'Active' },
  ]);

  const [filteredItems, setFilteredItems] = useState(items);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [activeFilters, setActiveFilters] = useState({});

  // Define table columns
  const columns = [
    { id: 'name', label: 'Name', minWidth: 170 },
    { id: 'email', label: 'Email', minWidth: 200 },
    {
      id: 'role',
      label: 'Role',
      minWidth: 100,
      format: (value) => (
        <Chip
          label={value}
          size="small"
          color={value === 'Admin' ? 'primary' : 'default'}
        />
      ),
    },
    {
      id: 'status',
      label: 'Status',
      minWidth: 100,
      format: (value) => (
        <Chip
          label={value}
          size="small"
          color={value === 'Active' ? 'success' : 'default'}
        />
      ),
    },
    {
      id: 'actions',
      label: 'Actions',
      minWidth: 100,
      align: 'right',
      format: (value, item) => (
        <>
          <IconButton size="small" onClick={(e) => {
            e.stopPropagation();
            handleEdit(item);
          }}>
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={(e) => {
            e.stopPropagation();
            handleDelete(item);
          }}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </>
      ),
    },
  ];

  // Define filters
  const filters = [
    { key: 'role', label: 'Admin', value: 'Admin' },
    { key: 'role', label: 'Manager', value: 'Manager' },
    { key: 'role', label: 'User', value: 'User' },
    { key: 'status', label: 'Active Only', value: 'Active' },
    { key: 'status', label: 'Inactive Only', value: 'Inactive' },
  ];

  // Handle search
  const handleSearch = (searchValue) => {
    const filtered = items.filter(item =>
      item.name.toLowerCase().includes(searchValue.toLowerCase()) ||
      item.email.toLowerCase().includes(searchValue.toLowerCase())
    );
    setFilteredItems(filtered);
    setPage(0);
  };

  // Handle filter change
  const handleFilterChange = (filterKey, value) => {
    const newFilters = { ...activeFilters };
    
    if (value === null) {
      delete newFilters[filterKey];
    } else {
      newFilters[filterKey] = value;
    }
    
    setActiveFilters(newFilters);

    // Apply filters
    let filtered = items;
    Object.entries(newFilters).forEach(([key, val]) => {
      filtered = filtered.filter(item => item[key] === val);
    });
    
    setFilteredItems(filtered);
    setPage(0);
  };

  // Handle add new
  const handleAdd = () => {
    console.log('Add new item');
    // Navigate to create page or open modal
  };

  // Handle refresh
  const handleRefresh = () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      console.log('Data refreshed');
    }, 1000);
  };

  // Handle row click
  const handleRowClick = (item) => {
    console.log('Row clicked:', item);
    // Navigate to detail page
  };

  // Handle edit
  const handleEdit = (item) => {
    console.log('Edit item:', item);
    // Navigate to edit page or open modal
  };

  // Handle delete
  const handleDelete = (item) => {
    console.log('Delete item:', item);
    // Show confirmation dialog and delete
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  // Handle rows per page change
  const handleRowsPerPageChange = (newRowsPerPage) => {
    setRowsPerPage(newRowsPerPage);
    setPage(0);
  };

  // Paginate items
  const paginatedItems = filteredItems.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <ListPage
      title="Users"
      subtitle="Manage system users and their permissions"
      items={paginatedItems}
      columns={columns}
      loading={loading}
      searchPlaceholder="Search by name or email..."
      onSearch={handleSearch}
      filters={filters}
      activeFilters={activeFilters}
      onFilterChange={handleFilterChange}
      onAdd={handleAdd}
      onRefresh={handleRefresh}
      onRowClick={handleRowClick}
      pagination={true}
      page={page}
      rowsPerPage={rowsPerPage}
      totalCount={filteredItems.length}
      onPageChange={handlePageChange}
      onRowsPerPageChange={handleRowsPerPageChange}
      emptyMessage="No users found"
      emptyIcon={<PeopleIcon sx={{ fontSize: 48, color: 'text.disabled' }} />}
    />
  );
};

export default ListPageExample;
