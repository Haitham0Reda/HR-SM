import React from 'react';
import StatCard from './StatCard';
import { People, AttachMoney, TrendingUp, Assessment, Event, CheckCircle } from '@mui/icons-material';

export default {
  title: 'Composite Components/StatCard',
  component: StatCard,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

// Basic stat card
export const Basic = () => (
  <div style={{ width: '300px' }}>
    <StatCard
      icon={<People />}
      label="Total Users"
      value="1,234"
      color="primary"
    />
  </div>
);

// With positive trend
export const WithPositiveTrend = () => (
  <div style={{ width: '300px' }}>
    <StatCard
      icon={<AttachMoney />}
      label="Revenue"
      value="$45,678"
      trend={{ value: 12.5, direction: 'up' }}
      color="success"
    />
  </div>
);

// With negative trend
export const WithNegativeTrend = () => (
  <div style={{ width: '300px' }}>
    <StatCard
      icon={<TrendingUp />}
      label="Active Sessions"
      value="567"
      trend={{ value: 8.3, direction: 'down' }}
      color="warning"
    />
  </div>
);

// Different colors
export const DifferentColors = () => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '24px' }}>
    <StatCard
      icon={<People />}
      label="Total Users"
      value="1,234"
      color="primary"
    />
    <StatCard
      icon={<AttachMoney />}
      label="Revenue"
      value="$45,678"
      color="success"
    />
    <StatCard
      icon={<Assessment />}
      label="Reports"
      value="89"
      color="info"
    />
    <StatCard
      icon={<Event />}
      label="Events"
      value="23"
      color="warning"
    />
    <StatCard
      icon={<CheckCircle />}
      label="Completed"
      value="456"
      color="secondary"
    />
  </div>
);

// Dashboard example
export const DashboardExample = () => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
    <StatCard
      icon={<People />}
      label="Total Employees"
      value="1,234"
      trend={{ value: 5.2, direction: 'up' }}
      color="primary"
    />
    <StatCard
      icon={<CheckCircle />}
      label="Active Today"
      value="987"
      trend={{ value: 2.1, direction: 'up' }}
      color="success"
    />
    <StatCard
      icon={<Event />}
      label="Leave Requests"
      value="45"
      trend={{ value: 12.3, direction: 'down' }}
      color="warning"
    />
    <StatCard
      icon={<Assessment />}
      label="Reports Generated"
      value="156"
      trend={{ value: 8.7, direction: 'up' }}
      color="info"
    />
  </div>
);

// Large numbers
export const LargeNumbers = () => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
    <StatCard
      icon={<People />}
      label="Total Users"
      value="1.2M"
      trend={{ value: 15.3, direction: 'up' }}
      color="primary"
    />
    <StatCard
      icon={<AttachMoney />}
      label="Annual Revenue"
      value="$12.5M"
      trend={{ value: 23.7, direction: 'up' }}
      color="success"
    />
    <StatCard
      icon={<Assessment />}
      label="Page Views"
      value="45.8K"
      trend={{ value: 5.2, direction: 'down' }}
      color="info"
    />
  </div>
);

// Without trends
export const WithoutTrends = () => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '24px' }}>
    <StatCard
      icon={<People />}
      label="Total Users"
      value="1,234"
      color="primary"
    />
    <StatCard
      icon={<Event />}
      label="Upcoming Events"
      value="12"
      color="warning"
    />
    <StatCard
      icon={<CheckCircle />}
      label="Completed Tasks"
      value="89"
      color="success"
    />
  </div>
);

// Responsive grid
export const ResponsiveGrid = () => (
  <div style={{ 
    display: 'grid', 
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
    gap: '24px',
    maxWidth: '1200px'
  }}>
    <StatCard
      icon={<People />}
      label="Total Employees"
      value="1,234"
      trend={{ value: 5.2, direction: 'up' }}
      color="primary"
    />
    <StatCard
      icon={<CheckCircle />}
      label="Present Today"
      value="1,187"
      trend={{ value: 2.1, direction: 'up' }}
      color="success"
    />
    <StatCard
      icon={<Event />}
      label="On Leave"
      value="47"
      trend={{ value: 12.3, direction: 'down' }}
      color="warning"
    />
    <StatCard
      icon={<AttachMoney />}
      label="Payroll This Month"
      value="$456K"
      trend={{ value: 3.5, direction: 'up' }}
      color="info"
    />
    <StatCard
      icon={<Assessment />}
      label="Pending Approvals"
      value="23"
      trend={{ value: 15.7, direction: 'down' }}
      color="error"
    />
    <StatCard
      icon={<TrendingUp />}
      label="Performance Score"
      value="94%"
      trend={{ value: 4.2, direction: 'up' }}
      color="success"
    />
  </div>
);
