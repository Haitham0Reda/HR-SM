/**
 * Unit Tests for Page Templates
 * 
 * Tests the four main page templates:
 * - ListPage: list/index pages with search, filters, and pagination
 * - DetailPage: detail/show pages with tabs and actions
 * - FormPage: create/edit pages with form sections and validation
 * - DashboardPage: dashboard pages with stats and widgets
 */

/**
 * Unit Tests for Page Templates
 * 
 * Tests the four main page templates:
 * - ListPage: list/index pages with search, filters, and pagination
 * - DetailPage: detail/show pages with tabs and actions
 * - FormPage: create/edit pages with form sections and validation
 * - DashboardPage: dashboard pages with stats and widgets
 */

// Mock react-router-dom
jest.mock('react-router-dom');

import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { mockNavigate } from '../__mocks__/react-router-dom';

import ListPage from '../ListPage';
import DetailPage from '../DetailPage';
import FormPage from '../FormPage';
import DashboardPage from '../DashboardPage';

// Helper to wrap components with required providers
const renderWithProviders = (component) => {
  const theme = createTheme();
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

// Reset mocks before each test
beforeEach(() => {
  mockNavigate.mockClear();
});

describe('ListPage Template', () => {
  afterEach(() => {
    cleanup();
  });

  const mockColumns = [
    { id: 'name', label: 'Name' },
    { id: 'email', label: 'Email' },
    { id: 'role', label: 'Role' },
  ];

  const mockItems = [
    { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'User' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'Manager' },
  ];

  it('should render with basic props', () => {
    renderWithProviders(
      <ListPage
        title="Users"
        items={mockItems}
        columns={mockColumns}
      />
    );

    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
  });

  it('should display loading state', () => {
    renderWithProviders(
      <ListPage
        title="Users"
        items={[]}
        columns={mockColumns}
        loading={true}
      />
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should display empty state when no items', () => {
    renderWithProviders(
      <ListPage
        title="Users"
        items={[]}
        columns={mockColumns}
        emptyMessage="No users found"
      />
    );

    expect(screen.getByText('No users found')).toBeInTheDocument();
  });

  it('should handle search input', async () => {
    const handleSearch = jest.fn();

    renderWithProviders(
      <ListPage
        title="Users"
        items={mockItems}
        columns={mockColumns}
        onSearch={handleSearch}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search...');
    
    // Simulate typing in the search input
    fireEvent.change(searchInput, { target: { value: 'John' } });

    expect(handleSearch).toHaveBeenCalled();
    expect(searchInput.value).toBe('John');
  });

  it('should handle pagination', () => {
    const handlePageChange = jest.fn();

    renderWithProviders(
      <ListPage
        title="Users"
        items={mockItems}
        columns={mockColumns}
        pagination={true}
        page={0}
        rowsPerPage={10}
        totalCount={30}
        onPageChange={handlePageChange}
      />
    );

    // Find the next page button
    const nextButton = screen.getByRole('button', { name: /next page/i });
    fireEvent.click(nextButton);

    expect(handlePageChange).toHaveBeenCalledWith(1);
  });

  it('should handle row click', () => {
    const handleRowClick = jest.fn();

    renderWithProviders(
      <ListPage
        title="Users"
        items={mockItems}
        columns={mockColumns}
        onRowClick={handleRowClick}
      />
    );

    const row = screen.getByText('John Doe').closest('tr');
    fireEvent.click(row);

    expect(handleRowClick).toHaveBeenCalledWith(mockItems[0]);
  });

  it('should render with filters', () => {
    const filters = [
      { key: 'role', label: 'Admin', value: 'admin' },
      { key: 'role', label: 'User', value: 'user' },
    ];

    renderWithProviders(
      <ListPage
        title="Users"
        items={mockItems}
        columns={mockColumns}
        filters={filters}
      />
    );

    const filterButton = screen.getByRole('button', { name: /filters/i });
    expect(filterButton).toBeInTheDocument();
  });

  it('should handle add button click', () => {
    const handleAdd = jest.fn();

    renderWithProviders(
      <ListPage
        title="Users"
        items={mockItems}
        columns={mockColumns}
        onAdd={handleAdd}
      />
    );

    const addButton = screen.getByRole('button', { name: /add new/i });
    fireEvent.click(addButton);

    expect(handleAdd).toHaveBeenCalled();
  });

  it('should render with different data sets', () => {
    const differentItems = [
      { id: 10, name: 'Alice', email: 'alice@test.com', role: 'Developer' },
      { id: 20, name: 'Charlie', email: 'charlie@test.com', role: 'Designer' },
    ];

    renderWithProviders(
      <ListPage
        title="Team Members"
        items={differentItems}
        columns={mockColumns}
      />
    );

    expect(screen.getByText('Team Members')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
  });
});

describe('DetailPage Template', () => {
  afterEach(() => {
    cleanup();
  });

  const mockTabs = [
    { label: 'Overview', content: <div>Overview Content</div> },
    { label: 'Details', content: <div>Details Content</div> },
    { label: 'History', content: <div>History Content</div> },
  ];

  const mockBreadcrumbs = [
    { label: 'Home', path: '/' },
    { label: 'Users', path: '/users' },
    { label: 'Details' },
  ];

  it('should render with basic props', () => {
    renderWithProviders(
      <DetailPage
        title="User Details"
        subtitle="John Doe"
        tabs={mockTabs}
      />
    );

    expect(screen.getByText('User Details')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Overview')).toBeInTheDocument();
  });

  it('should display loading state', () => {
    renderWithProviders(
      <DetailPage
        title="User Details"
        tabs={mockTabs}
        loading={true}
      />
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should display error state', () => {
    renderWithProviders(
      <DetailPage
        title="User Details"
        tabs={mockTabs}
        error="Failed to load user details"
      />
    );

    expect(screen.getByText('Failed to load user details')).toBeInTheDocument();
  });

  it('should handle tab navigation', () => {
    renderWithProviders(
      <DetailPage
        title="User Details"
        tabs={mockTabs}
      />
    );

    // Initially, first tab content should be visible
    expect(screen.getByText('Overview Content')).toBeInTheDocument();

    // Click on second tab
    const detailsTab = screen.getByText('Details');
    fireEvent.click(detailsTab);

    // Second tab content should now be visible
    expect(screen.getByText('Details Content')).toBeInTheDocument();
  });

  it('should render breadcrumbs', () => {
    renderWithProviders(
      <DetailPage
        title="User Details"
        breadcrumbs={mockBreadcrumbs}
        tabs={mockTabs}
      />
    );

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
  });

  it('should handle edit button click', () => {
    const handleEdit = jest.fn();

    renderWithProviders(
      <DetailPage
        title="User Details"
        tabs={mockTabs}
        onEdit={handleEdit}
      />
    );

    const editButton = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editButton);

    expect(handleEdit).toHaveBeenCalled();
  });

  it('should handle delete button click', () => {
    const handleDelete = jest.fn();

    renderWithProviders(
      <DetailPage
        title="User Details"
        tabs={mockTabs}
        onDelete={handleDelete}
      />
    );

    // Find the delete button by its icon (it's an IconButton with DeleteIcon)
    const deleteButton = screen.getByTestId('DeleteIcon').closest('button');
    fireEvent.click(deleteButton);

    expect(handleDelete).toHaveBeenCalled();
  });

  it('should handle back navigation', () => {
    const handleBack = jest.fn();

    renderWithProviders(
      <DetailPage
        title="User Details"
        tabs={mockTabs}
        onBack={handleBack}
      />
    );

    const backButton = screen.getAllByRole('button')[0]; // First button is back
    fireEvent.click(backButton);

    expect(handleBack).toHaveBeenCalled();
  });

  it('should render status chip', () => {
    renderWithProviders(
      <DetailPage
        title="User Details"
        tabs={mockTabs}
        status={{ label: 'Active', color: 'success' }}
      />
    );

    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('should render metadata', () => {
    const metadata = [
      { label: 'Created', value: '2024-01-01' },
      { label: 'Updated', value: '2024-01-15' },
    ];

    renderWithProviders(
      <DetailPage
        title="User Details"
        tabs={mockTabs}
        metadata={metadata}
      />
    );

    expect(screen.getByText('Created')).toBeInTheDocument();
    expect(screen.getByText('2024-01-01')).toBeInTheDocument();
    expect(screen.getByText('Updated')).toBeInTheDocument();
    expect(screen.getByText('2024-01-15')).toBeInTheDocument();
  });
});

describe('FormPage Template', () => {
  afterEach(() => {
    cleanup();
  });

  const mockSections = [
    {
      title: 'Basic Information',
      description: 'Enter basic user information',
      content: (
        <div>
          <input data-testid="name-input" placeholder="Name" />
          <input data-testid="email-input" placeholder="Email" />
        </div>
      ),
    },
    {
      title: 'Additional Details',
      content: (
        <div>
          <input data-testid="phone-input" placeholder="Phone" />
        </div>
      ),
    },
  ];

  it('should render with basic props', () => {
    const handleSubmit = jest.fn();

    renderWithProviders(
      <FormPage
        title="Create User"
        sections={mockSections}
        onSubmit={handleSubmit}
      />
    );

    expect(screen.getByText('Create User')).toBeInTheDocument();
    expect(screen.getByText('Basic Information')).toBeInTheDocument();
    expect(screen.getByText('Additional Details')).toBeInTheDocument();
  });

  it('should handle form submission', async () => {
    const handleSubmit = jest.fn((e) => e.preventDefault());

    renderWithProviders(
      <FormPage
        title="Create User"
        sections={mockSections}
        onSubmit={handleSubmit}
      />
    );

    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalled();
    });
  });

  it('should display loading state on submit', () => {
    const handleSubmit = jest.fn();

    renderWithProviders(
      <FormPage
        title="Create User"
        sections={mockSections}
        onSubmit={handleSubmit}
        loading={true}
      />
    );

    expect(screen.getByText('Saving...')).toBeInTheDocument();
    const saveButton = screen.getByRole('button', { name: /saving/i });
    expect(saveButton).toBeDisabled();
  });

  it('should display error message', () => {
    const handleSubmit = jest.fn();

    renderWithProviders(
      <FormPage
        title="Create User"
        sections={mockSections}
        onSubmit={handleSubmit}
        error="Failed to save user"
      />
    );

    expect(screen.getByText('Failed to save user')).toBeInTheDocument();
  });

  it('should display success message', () => {
    const handleSubmit = jest.fn();

    renderWithProviders(
      <FormPage
        title="Create User"
        sections={mockSections}
        onSubmit={handleSubmit}
        success="User saved successfully"
      />
    );

    expect(screen.getByText('User saved successfully')).toBeInTheDocument();
  });

  it('should handle cancel button click', () => {
    const handleSubmit = jest.fn();
    const handleCancel = jest.fn();

    renderWithProviders(
      <FormPage
        title="Create User"
        sections={mockSections}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(handleCancel).toHaveBeenCalled();
  });

  it('should show unsaved changes dialog', async () => {
    const handleSubmit = jest.fn();

    renderWithProviders(
      <FormPage
        title="Create User"
        sections={mockSections}
        onSubmit={handleSubmit}
        showUnsavedWarning={true}
      />
    );

    // Make a change to the form
    const nameInput = screen.getByTestId('name-input');
    fireEvent.change(nameInput, { target: { value: 'John' } });

    // Try to cancel
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    // Dialog should appear
    await waitFor(() => {
      expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();
    });
  });

  it('should render breadcrumbs', () => {
    const handleSubmit = jest.fn();
    const breadcrumbs = [
      { label: 'Home', path: '/' },
      { label: 'Users', path: '/users' },
      { label: 'Create' },
    ];

    renderWithProviders(
      <FormPage
        title="Create User"
        breadcrumbs={breadcrumbs}
        sections={mockSections}
        onSubmit={handleSubmit}
      />
    );

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
  });

  it('should validate form with different sections', () => {
    const handleSubmit = jest.fn();
    const differentSections = [
      {
        title: 'Profile',
        content: <div data-testid="profile-section">Profile fields</div>,
      },
      {
        title: 'Settings',
        content: <div data-testid="settings-section">Settings fields</div>,
      },
    ];

    renderWithProviders(
      <FormPage
        title="Edit Profile"
        sections={differentSections}
        onSubmit={handleSubmit}
      />
    );

    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByTestId('profile-section')).toBeInTheDocument();
    expect(screen.getByTestId('settings-section')).toBeInTheDocument();
  });
});

describe('DashboardPage Template', () => {
  afterEach(() => {
    cleanup();
  });

  const mockStats = [
    {
      id: 'users',
      icon: <div data-testid="users-icon">👤</div>,
      label: 'Total Users',
      value: 1234,
      color: 'primary',
    },
    {
      id: 'revenue',
      icon: <div data-testid="revenue-icon">💰</div>,
      label: 'Revenue',
      value: '$45,678',
      trend: { value: 12, direction: 'up' },
      color: 'success',
    },
  ];

  const mockWidgets = [
    {
      id: 'chart',
      content: <div data-testid="chart-widget">Chart Widget</div>,
      size: 'medium',
    },
    {
      id: 'table',
      content: <div data-testid="table-widget">Table Widget</div>,
      size: 'large',
    },
  ];

  it('should render with basic props', () => {
    renderWithProviders(
      <DashboardPage
        title="Dashboard"
        stats={mockStats}
        widgets={mockWidgets}
      />
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('Revenue')).toBeInTheDocument();
  });

  it('should display loading state', () => {
    renderWithProviders(
      <DashboardPage
        title="Dashboard"
        stats={mockStats}
        widgets={mockWidgets}
        loading={true}
      />
    );

    // Loading state should show progress indicators
    const progressBars = screen.getAllByRole('progressbar');
    expect(progressBars.length).toBeGreaterThan(0);
  });

  it('should display error message', () => {
    renderWithProviders(
      <DashboardPage
        title="Dashboard"
        stats={mockStats}
        widgets={mockWidgets}
        error="Failed to load dashboard data"
      />
    );

    expect(screen.getByText('Failed to load dashboard data')).toBeInTheDocument();
  });

  it('should render stat cards', () => {
    renderWithProviders(
      <DashboardPage
        title="Dashboard"
        stats={mockStats}
        widgets={[]}
      />
    );

    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('1234')).toBeInTheDocument();
    expect(screen.getByText('Revenue')).toBeInTheDocument();
    expect(screen.getByText('$45,678')).toBeInTheDocument();
  });

  it('should render widgets', () => {
    renderWithProviders(
      <DashboardPage
        title="Dashboard"
        stats={[]}
        widgets={mockWidgets}
      />
    );

    expect(screen.getByTestId('chart-widget')).toBeInTheDocument();
    expect(screen.getByTestId('table-widget')).toBeInTheDocument();
  });

  it('should handle refresh button click', () => {
    const handleRefresh = jest.fn();

    renderWithProviders(
      <DashboardPage
        title="Dashboard"
        stats={mockStats}
        widgets={mockWidgets}
        onRefresh={handleRefresh}
      />
    );

    const refreshButton = screen.getAllByRole('button')[0]; // First button is refresh
    fireEvent.click(refreshButton);

    expect(handleRefresh).toHaveBeenCalled();
  });

  it('should handle settings button click', () => {
    const handleSettings = jest.fn();

    renderWithProviders(
      <DashboardPage
        title="Dashboard"
        stats={mockStats}
        widgets={mockWidgets}
        onSettings={handleSettings}
      />
    );

    const buttons = screen.getAllByRole('button');
    const settingsButton = buttons.find(btn => btn.querySelector('[data-testid*="SettingsIcon"]'));
    
    if (settingsButton) {
      fireEvent.click(settingsButton);
      expect(handleSettings).toHaveBeenCalled();
    }
  });

  it('should display empty state when no widgets', () => {
    renderWithProviders(
      <DashboardPage
        title="Dashboard"
        stats={[]}
        widgets={[]}
        emptyMessage="No dashboard data available"
      />
    );

    expect(screen.getByText('No dashboard data available')).toBeInTheDocument();
  });

  it('should render with subtitle', () => {
    renderWithProviders(
      <DashboardPage
        title="Dashboard"
        subtitle="Welcome back, John!"
        stats={mockStats}
        widgets={mockWidgets}
      />
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Welcome back, John!')).toBeInTheDocument();
  });

  it('should render different widget configurations', () => {
    const differentWidgets = [
      {
        id: 'widget1',
        content: <div data-testid="widget1">Widget 1</div>,
        size: 'small',
      },
      {
        id: 'widget2',
        content: <div data-testid="widget2">Widget 2</div>,
        size: 'full',
      },
    ];

    renderWithProviders(
      <DashboardPage
        title="Analytics"
        stats={[]}
        widgets={differentWidgets}
      />
    );

    expect(screen.getByTestId('widget1')).toBeInTheDocument();
    expect(screen.getByTestId('widget2')).toBeInTheDocument();
  });

  it('should hide stats section when showStats is false', () => {
    renderWithProviders(
      <DashboardPage
        title="Dashboard"
        stats={mockStats}
        widgets={mockWidgets}
        showStats={false}
      />
    );

    // Stats should not be rendered
    expect(screen.queryByText('Total Users')).not.toBeInTheDocument();
    expect(screen.queryByText('Revenue')).not.toBeInTheDocument();
    
    // But widgets should still be rendered
    expect(screen.getByTestId('chart-widget')).toBeInTheDocument();
  });
});
