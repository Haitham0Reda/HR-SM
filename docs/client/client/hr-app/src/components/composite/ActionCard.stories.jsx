import React from 'react';
import ActionCard from './ActionCard';
import { Add, People, Assessment, Event, Settings, Notifications } from '@mui/icons-material';

export default {
  title: 'Composite Components/ActionCard',
  component: ActionCard,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

// Basic action card
export const Basic = () => (
  <div style={{ width: '350px' }}>
    <ActionCard
      id="add-user"
      title="Add New User"
      icon={<Add />}
      description="Create a new user account and assign roles and permissions."
      buttonText="Add User"
      buttonColor="primary"
      route="/users/new"
    />
  </div>
);

// With badge
export const WithBadge = () => (
  <div style={{ width: '350px' }}>
    <ActionCard
      id="pending-approvals"
      title="Pending Approvals"
      icon={<Assessment />}
      description="Review and approve pending leave requests and time-off applications."
      buttonText="View Approvals"
      buttonColor="warning"
      route="/approvals"
      badge="23 New"
    />
  </div>
);

// Different colors
export const DifferentColors = () => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
    <ActionCard
      id="add-user"
      title="Add New User"
      icon={<Add />}
      description="Create a new user account with roles and permissions."
      buttonText="Add User"
      buttonColor="primary"
      route="/users/new"
    />
    <ActionCard
      id="manage-users"
      title="Manage Users"
      icon={<People />}
      description="View, edit, and manage all user accounts in the system."
      buttonText="Manage Users"
      buttonColor="secondary"
      route="/users"
    />
    <ActionCard
      id="view-reports"
      title="View Reports"
      icon={<Assessment />}
      description="Access detailed reports and analytics about your organization."
      buttonText="View Reports"
      buttonColor="info"
      route="/reports"
    />
    <ActionCard
      id="schedule-event"
      title="Schedule Event"
      icon={<Event />}
      description="Create and schedule new events for your team."
      buttonText="Schedule"
      buttonColor="success"
      route="/events/new"
    />
  </div>
);

// Dashboard quick actions
export const DashboardQuickActions = () => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
    <ActionCard
      id="add-employee"
      title="Add Employee"
      icon={<Add />}
      description="Onboard a new employee and set up their profile."
      buttonText="Add Employee"
      buttonColor="primary"
      route="/employees/new"
      badge="Quick Action"
    />
    <ActionCard
      id="approve-leaves"
      title="Approve Leaves"
      icon={<Assessment />}
      description="Review and approve pending leave requests from your team."
      buttonText="Review Requests"
      buttonColor="warning"
      route="/leaves/pending"
      badge="12 Pending"
    />
    <ActionCard
      id="view-attendance"
      title="View Attendance"
      icon={<People />}
      description="Check today's attendance and track employee presence."
      buttonText="View Attendance"
      buttonColor="info"
      route="/attendance"
    />
    <ActionCard
      id="schedule-meeting"
      title="Schedule Meeting"
      icon={<Event />}
      description="Set up a new meeting or event for your team."
      buttonText="Schedule"
      buttonColor="success"
      route="/meetings/new"
    />
    <ActionCard
      id="system-settings"
      title="System Settings"
      icon={<Settings />}
      description="Configure system preferences and application settings."
      buttonText="Open Settings"
      buttonColor="secondary"
      route="/settings"
    />
    <ActionCard
      id="notifications"
      title="Notifications"
      icon={<Notifications />}
      description="View and manage your notification preferences."
      buttonText="View Notifications"
      buttonColor="info"
      route="/notifications"
      badge="5 New"
    />
  </div>
);

// With custom click handler
export const WithCustomClickHandler = () => (
  <div style={{ width: '350px' }}>
    <ActionCard
      id="custom-action"
      title="Custom Action"
      icon={<Settings />}
      description="This card uses a custom click handler instead of navigation."
      buttonText="Click Me"
      buttonColor="primary"
      onClick={() => alert('Custom action triggered!')}
    />
  </div>
);

// Responsive grid
export const ResponsiveGrid = () => (
  <div style={{ 
    display: 'grid', 
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
    gap: '24px',
    maxWidth: '1200px'
  }}>
    <ActionCard
      id="action-1"
      title="Quick Action 1"
      icon={<Add />}
      description="Perform a quick action with this card."
      buttonText="Action 1"
      buttonColor="primary"
      route="/action1"
    />
    <ActionCard
      id="action-2"
      title="Quick Action 2"
      icon={<People />}
      description="Another quick action for your workflow."
      buttonText="Action 2"
      buttonColor="secondary"
      route="/action2"
      badge="New"
    />
    <ActionCard
      id="action-3"
      title="Quick Action 3"
      icon={<Assessment />}
      description="Access important features quickly."
      buttonText="Action 3"
      buttonColor="info"
      route="/action3"
    />
  </div>
);

// Long descriptions
export const LongDescriptions = () => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
    <ActionCard
      id="detailed-action"
      title="Detailed Action Card"
      icon={<Assessment />}
      description="This action card has a longer description to demonstrate how the component handles more text content. The description provides detailed information about what the action does and why the user might want to perform it."
      buttonText="Learn More"
      buttonColor="primary"
      route="/details"
    />
    <ActionCard
      id="another-detailed"
      title="Another Detailed Card"
      icon={<Event />}
      description="Action cards can contain substantial amounts of descriptive text while maintaining a clean and organized appearance. The layout automatically adjusts to accommodate the content."
      buttonText="Get Started"
      buttonColor="success"
      route="/start"
      badge="Popular"
    />
  </div>
);
