import React from 'react';
import DashboardPage from './DashboardPage';
import { Card, CardContent, Typography, Box } from '@mui/material';
import { People, AttachMoney, TrendingUp, Assessment, Event, CheckCircle } from '@mui/icons-material';

export default {
  title: 'Page Templates/DashboardPage',
  component: DashboardPage,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

// Sample stats
const sampleStats = [
  {
    id: 'users',
    icon: <People />,
    label: 'Total Users',
    value: '1,234',
    trend: { value: 12.5, direction: 'up' },
    color: 'primary',
  },
  {
    id: 'revenue',
    icon: <AttachMoney />,
    label: 'Revenue',
    value: '$45,678',
    trend: { value: 8.3, direction: 'up' },
    color: 'success',
  },
  {
    id: 'sessions',
    icon: <TrendingUp />,
    label: 'Active Sessions',
    value: '567',
    trend: { value: 3.2, direction: 'down' },
    color: 'warning',
  },
  {
    id: 'reports',
    icon: <Assessment />,
    label: 'Reports',
    value: '89',
    trend: { value: 15.7, direction: 'up' },
    color: 'info',
  },
];

// Sample widgets
const sampleWidgets = [
  {
    id: 'recent-activity',
    size: 'medium',
    content: (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Recent Activity
          </Typography>
          <Typography variant="body2" color="text.secondary">
            View recent user activity and system events.
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Last updated: 5 minutes ago
            </Typography>
          </Box>
        </CardContent>
      </Card>
    ),
  },
  {
    id: 'quick-actions',
    size: 'medium',
    content: (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Quick Actions
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Frequently used actions and shortcuts.
          </Typography>
        </CardContent>
      </Card>
    ),
  },
  {
    id: 'analytics',
    size: 'large',
    content: (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Analytics Overview
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Key metrics and performance indicators.
          </Typography>
        </CardContent>
      </Card>
    ),
  },
];

// Basic dashboard
export const Basic = () => (
  <DashboardPage
    title="Dashboard"
    subtitle="Welcome back! Here's what's happening today."
    stats={sampleStats}
    widgets={sampleWidgets}
  />
);

// Only stats
export const OnlyStats = () => (
  <DashboardPage
    title="Dashboard"
    subtitle="Key metrics at a glance"
    stats={sampleStats}
    widgets={[]}
  />
);

// Only widgets
export const OnlyWidgets = () => (
  <DashboardPage
    title="Dashboard"
    subtitle="Dashboard widgets"
    stats={[]}
    widgets={sampleWidgets}
    showStats={false}
  />
);

// Loading state
export const Loading = () => (
  <DashboardPage
    title="Dashboard"
    subtitle="Loading dashboard data..."
    stats={[]}
    widgets={[]}
    loading={true}
  />
);

// Error state
export const Error = () => (
  <DashboardPage
    title="Dashboard"
    subtitle="Error loading dashboard"
    stats={[]}
    widgets={[]}
    error="Failed to load dashboard data. Please try again."
  />
);

// Empty state
export const Empty = () => (
  <DashboardPage
    title="Dashboard"
    subtitle="No data available"
    stats={[]}
    widgets={[]}
    emptyMessage="No dashboard data available. Configure your dashboard to get started."
  />
);

// With actions
export const WithActions = () => (
  <DashboardPage
    title="Dashboard"
    subtitle="Manage your dashboard"
    stats={sampleStats}
    widgets={sampleWidgets}
    onRefresh={() => alert('Refreshing dashboard...')}
    onSettings={() => alert('Opening settings...')}
  />
);

// HR Dashboard example
export const HRDashboard = () => {
  const hrStats = [
    {
      id: 'employees',
      icon: <People />,
      label: 'Total Employees',
      value: '1,234',
      trend: { value: 5.2, direction: 'up' },
      color: 'primary',
    },
    {
      id: 'present',
      icon: <CheckCircle />,
      label: 'Present Today',
      value: '1,187',
      trend: { value: 2.1, direction: 'up' },
      color: 'success',
    },
    {
      id: 'leaves',
      icon: <Event />,
      label: 'On Leave',
      value: '47',
      trend: { value: 12.3, direction: 'down' },
      color: 'warning',
    },
    {
      id: 'payroll',
      icon: <AttachMoney />,
      label: 'Payroll This Month',
      value: '$456K',
      trend: { value: 3.5, direction: 'up' },
      color: 'info',
    },
  ];

  const hrWidgets = [
    {
      id: 'attendance',
      size: 'medium',
      content: (
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Today's Attendance
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Typography variant="h3" color="success.main">
                96.2%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                1,187 out of 1,234 employees present
              </Typography>
            </Box>
          </CardContent>
        </Card>
      ),
    },
    {
      id: 'pending-approvals',
      size: 'medium',
      content: (
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Pending Approvals
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Typography variant="h3" color="warning.main">
                23
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Leave requests awaiting approval
              </Typography>
            </Box>
          </CardContent>
        </Card>
      ),
    },
    {
      id: 'recent-hires',
      size: 'medium',
      content: (
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent Hires
            </Typography>
            <Typography variant="body2" color="text.secondary">
              5 new employees joined this month
            </Typography>
          </CardContent>
        </Card>
      ),
    },
    {
      id: 'upcoming-events',
      size: 'medium',
      content: (
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Upcoming Events
            </Typography>
            <Typography variant="body2" color="text.secondary">
              3 company events scheduled this week
            </Typography>
          </CardContent>
        </Card>
      ),
    },
  ];

  return (
    <DashboardPage
      title="HR Dashboard"
      subtitle="Human Resources Management Overview"
      stats={hrStats}
      widgets={hrWidgets}
      onRefresh={() => alert('Refreshing dashboard...')}
      onSettings={() => alert('Opening settings...')}
    />
  );
};

// Complete example
export const CompleteExample = () => {
  const completeStats = [
    {
      id: 'users',
      icon: <People />,
      label: 'Total Users',
      value: '1,234',
      trend: { value: 12.5, direction: 'up' },
      color: 'primary',
      size: 'small',
    },
    {
      id: 'revenue',
      icon: <AttachMoney />,
      label: 'Revenue',
      value: '$45,678',
      trend: { value: 8.3, direction: 'up' },
      color: 'success',
      size: 'small',
    },
    {
      id: 'sessions',
      icon: <TrendingUp />,
      label: 'Active Sessions',
      value: '567',
      trend: { value: 3.2, direction: 'down' },
      color: 'warning',
      size: 'small',
    },
    {
      id: 'reports',
      icon: <Assessment />,
      label: 'Reports',
      value: '89',
      trend: { value: 15.7, direction: 'up' },
      color: 'info',
      size: 'small',
    },
  ];

  const completeWidgets = [
    {
      id: 'chart',
      size: 'large',
      content: (
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Performance Chart
            </Typography>
            <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Chart visualization would go here
              </Typography>
            </Box>
          </CardContent>
        </Card>
      ),
    },
    {
      id: 'activity',
      size: 'medium',
      content: (
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent Activity
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Latest system activities and user actions
            </Typography>
          </CardContent>
        </Card>
      ),
    },
    {
      id: 'tasks',
      size: 'medium',
      content: (
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Pending Tasks
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Tasks requiring your attention
            </Typography>
          </CardContent>
        </Card>
      ),
    },
    {
      id: 'notifications',
      size: 'medium',
      content: (
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Notifications
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Recent notifications and alerts
            </Typography>
          </CardContent>
        </Card>
      ),
    },
  ];

  return (
    <DashboardPage
      title="Dashboard"
      subtitle="Welcome back! Here's your overview for today."
      stats={completeStats}
      widgets={completeWidgets}
      onRefresh={() => alert('Refreshing dashboard...')}
      onSettings={() => alert('Opening settings...')}
    />
  );
};
