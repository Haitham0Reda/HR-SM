/**
 * Unit Tests for Composite Components
 * 
 * Tests for StatCard, UserCard, FormSection, and DataGrid components
 * Validates core functionality, rendering, and user interactions
 * 
 * Note: ActionCard tests are in a separate file due to router dependencies
 */

import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { People } from '@mui/icons-material';

import StatCard from '../StatCard';
import UserCard from '../UserCard';
import FormSection from '../FormSection';
import DataGrid, { DataGridItem } from '../DataGrid';

// Helper to wrap components with necessary providers
const renderWithProviders = (component) => {
  const theme = createTheme();
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('StatCard Component', () => {
  afterEach(cleanup);

  it('should render with basic props', () => {
    renderWithProviders(
      <StatCard
        icon={<People />}
        label="Total Users"
        value={150}
      />
    );

    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
  });

  it('should render with trend indicator showing upward trend', () => {
    renderWithProviders(
      <StatCard
        icon={<People />}
        label="Active Users"
        value={120}
        trend={{ value: 15, direction: 'up' }}
      />
    );

    expect(screen.getByText('Active Users')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.getByText('15%')).toBeInTheDocument();
    expect(screen.getByText('vs last period')).toBeInTheDocument();
  });

  it('should render with trend indicator showing downward trend', () => {
    renderWithProviders(
      <StatCard
        icon={<People />}
        label="Pending Tasks"
        value={45}
        trend={{ value: 10, direction: 'down' }}
      />
    );

    expect(screen.getByText('Pending Tasks')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.getByText('10%')).toBeInTheDocument();
  });

  it('should render with different color variants', () => {
    const { rerender } = renderWithProviders(
      <StatCard
        icon={<People />}
        label="Test"
        value={100}
        color="success"
      />
    );

    expect(screen.getByText('Test')).toBeInTheDocument();

    rerender(
      <ThemeProvider theme={createTheme()}>
        <StatCard
          icon={<People />}
          label="Test"
          value={100}
          color="error"
        />
      </ThemeProvider>
    );

    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('should render string and number values correctly', () => {
    const { rerender } = renderWithProviders(
      <StatCard
        icon={<People />}
        label="Count"
        value={42}
      />
    );

    expect(screen.getByText('42')).toBeInTheDocument();

    rerender(
      <ThemeProvider theme={createTheme()}>
        <StatCard
          icon={<People />}
          label="Status"
          value="Active"
        />
      </ThemeProvider>
    );

    expect(screen.getByText('Active')).toBeInTheDocument();
  });
});

describe('UserCard Component', () => {
  afterEach(cleanup);

  const mockUser = {
    id: '1',
    name: 'John Doe',
    email: 'john.doe@example.com',
    role: 'admin',
    status: 'active',
  };

  it('should render user information correctly', () => {
    renderWithProviders(
      <UserCard user={mockUser} />
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
    expect(screen.getByText('admin')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
  });

  it('should render user initials when no avatar is provided', () => {
    renderWithProviders(
      <UserCard user={mockUser} />
    );

    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('should call onView when view button is clicked', () => {
    const handleView = jest.fn();

    renderWithProviders(
      <UserCard user={mockUser} onView={handleView} />
    );

    const viewButton = screen.getByLabelText('View Details');
    fireEvent.click(viewButton);

    expect(handleView).toHaveBeenCalledTimes(1);
    expect(handleView).toHaveBeenCalledWith(mockUser);
  });

  it('should call onEdit when edit button is clicked', () => {
    const handleEdit = jest.fn();

    renderWithProviders(
      <UserCard user={mockUser} onEdit={handleEdit} />
    );

    const editButton = screen.getByLabelText('Edit User');
    fireEvent.click(editButton);

    expect(handleEdit).toHaveBeenCalledTimes(1);
    expect(handleEdit).toHaveBeenCalledWith(mockUser);
  });

  it('should call onDelete when delete button is clicked', () => {
    const handleDelete = jest.fn();

    renderWithProviders(
      <UserCard user={mockUser} onDelete={handleDelete} />
    );

    const deleteButton = screen.getByLabelText('Delete User');
    fireEvent.click(deleteButton);

    expect(handleDelete).toHaveBeenCalledTimes(1);
    expect(handleDelete).toHaveBeenCalledWith(mockUser);
  });

  it('should render different role colors correctly', () => {
    const roles = ['admin', 'manager', 'employee', 'hr'];

    roles.forEach((role) => {
      const { unmount } = renderWithProviders(
        <UserCard user={{ ...mockUser, role }} />
      );

      expect(screen.getByText(role)).toBeInTheDocument();
      unmount();
    });
  });

  it('should render different status colors correctly', () => {
    const statuses = ['active', 'inactive', 'pending'];

    statuses.forEach((status) => {
      const { unmount } = renderWithProviders(
        <UserCard user={{ ...mockUser, status }} />
      );

      expect(screen.getByText(status)).toBeInTheDocument();
      unmount();
    });
  });

  it('should handle single-word names for initials', () => {
    renderWithProviders(
      <UserCard user={{ ...mockUser, name: 'Admin' }} />
    );

    expect(screen.getByText('AD')).toBeInTheDocument();
  });
});

describe('FormSection Component', () => {
  afterEach(cleanup);

  it('should render with title and children', () => {
    renderWithProviders(
      <FormSection title="Personal Information">
        <input type="text" placeholder="Name" />
        <input type="email" placeholder="Email" />
      </FormSection>
    );

    expect(screen.getByText('Personal Information')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
  });

  it('should render with optional description', () => {
    renderWithProviders(
      <FormSection
        title="Account Settings"
        description="Configure your account preferences"
      >
        <input type="text" />
      </FormSection>
    );

    expect(screen.getByText('Account Settings')).toBeInTheDocument();
    expect(screen.getByText('Configure your account preferences')).toBeInTheDocument();
  });

  it('should render without divider when divider prop is false', () => {
    const { container } = renderWithProviders(
      <FormSection title="Test Section" divider={false}>
        <input type="text" />
      </FormSection>
    );

    expect(screen.getByText('Test Section')).toBeInTheDocument();
    // Divider should not be present
    const dividers = container.querySelectorAll('hr');
    expect(dividers.length).toBe(0);
  });

  it('should render with divider by default', () => {
    const { container } = renderWithProviders(
      <FormSection title="Test Section">
        <input type="text" />
      </FormSection>
    );

    expect(screen.getByText('Test Section')).toBeInTheDocument();
    // Divider should be present
    const dividers = container.querySelectorAll('hr');
    expect(dividers.length).toBeGreaterThan(0);
  });
});

describe('DataGrid Component', () => {
  afterEach(cleanup);

  it('should render children in grid layout', () => {
    renderWithProviders(
      <DataGrid>
        <DataGridItem>
          <div>Item 1</div>
        </DataGridItem>
        <DataGridItem>
          <div>Item 2</div>
        </DataGridItem>
        <DataGridItem>
          <div>Item 3</div>
        </DataGridItem>
      </DataGrid>
    );

    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
    expect(screen.getByText('Item 3')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    renderWithProviders(
      <DataGrid loading={true}>
        <DataGridItem>
          <div>Item 1</div>
        </DataGridItem>
      </DataGrid>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Item 1')).not.toBeInTheDocument();
  });

  it('should show empty state with default message', () => {
    renderWithProviders(
      <DataGrid empty={true} />
    );

    expect(screen.getByText('No data available')).toBeInTheDocument();
    expect(screen.getByText('There are no items to display at this time.')).toBeInTheDocument();
  });

  it('should show empty state with custom message', () => {
    renderWithProviders(
      <DataGrid empty={true} emptyMessage="No users found" />
    );

    expect(screen.getByText('No users found')).toBeInTheDocument();
  });

  it('should show empty state when children is empty array', () => {
    renderWithProviders(
      <DataGrid>
        {[]}
      </DataGrid>
    );

    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('should render with custom spacing', () => {
    renderWithProviders(
      <DataGrid spacing={5}>
        <DataGridItem>
          <div>Item 1</div>
        </DataGridItem>
      </DataGrid>
    );

    expect(screen.getByText('Item 1')).toBeInTheDocument();
  });
});

describe('DataGridItem Component', () => {
  afterEach(cleanup);

  it('should render with default medium size', () => {
    renderWithProviders(
      <DataGrid>
        <DataGridItem>
          <div>Content</div>
        </DataGridItem>
      </DataGrid>
    );

    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('should render with small size', () => {
    renderWithProviders(
      <DataGrid>
        <DataGridItem size="small">
          <div>Small Item</div>
        </DataGridItem>
      </DataGrid>
    );

    expect(screen.getByText('Small Item')).toBeInTheDocument();
  });

  it('should render with large size', () => {
    renderWithProviders(
      <DataGrid>
        <DataGridItem size="large">
          <div>Large Item</div>
        </DataGridItem>
      </DataGrid>
    );

    expect(screen.getByText('Large Item')).toBeInTheDocument();
  });

  it('should render with full size', () => {
    renderWithProviders(
      <DataGrid>
        <DataGridItem size="full">
          <div>Full Width Item</div>
        </DataGridItem>
      </DataGrid>
    );

    expect(screen.getByText('Full Width Item')).toBeInTheDocument();
  });
});
