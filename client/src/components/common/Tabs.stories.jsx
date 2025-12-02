import React from 'react';
import Tabs from './Tabs';
import { Typography, Box } from '@mui/material';
import { Home, Person, Settings, Notifications } from '@mui/icons-material';

export default {
  title: 'Base Components/Tabs',
  component: Tabs,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

// Basic tabs
export const Basic = () => {
  const tabs = [
    {
      label: 'Tab 1',
      content: (
        <Typography>
          This is the content for Tab 1. It can contain any React components.
        </Typography>
      ),
    },
    {
      label: 'Tab 2',
      content: (
        <Typography>
          This is the content for Tab 2. Each tab can have different content.
        </Typography>
      ),
    },
    {
      label: 'Tab 3',
      content: (
        <Typography>
          This is the content for Tab 3. Tabs are great for organizing related content.
        </Typography>
      ),
    },
  ];

  return <Tabs tabs={tabs} />;
};

// With icons
export const WithIcons = () => {
  const tabs = [
    {
      label: 'Home',
      icon: <Home />,
      content: (
        <Box>
          <Typography variant="h6" gutterBottom>
            Home Tab
          </Typography>
          <Typography>
            Welcome to the home tab. This tab includes an icon for better visual identification.
          </Typography>
        </Box>
      ),
    },
    {
      label: 'Profile',
      icon: <Person />,
      content: (
        <Box>
          <Typography variant="h6" gutterBottom>
            Profile Tab
          </Typography>
          <Typography>
            View and edit your profile information here.
          </Typography>
        </Box>
      ),
    },
    {
      label: 'Settings',
      icon: <Settings />,
      content: (
        <Box>
          <Typography variant="h6" gutterBottom>
            Settings Tab
          </Typography>
          <Typography>
            Configure your application settings.
          </Typography>
        </Box>
      ),
    },
    {
      label: 'Notifications',
      icon: <Notifications />,
      content: (
        <Box>
          <Typography variant="h6" gutterBottom>
            Notifications Tab
          </Typography>
          <Typography>
            Manage your notification preferences.
          </Typography>
        </Box>
      ),
    },
  ];

  return <Tabs tabs={tabs} />;
};

// Disabled tab
export const WithDisabledTab = () => {
  const tabs = [
    {
      label: 'Active Tab 1',
      content: <Typography>This tab is active and can be clicked.</Typography>,
    },
    {
      label: 'Disabled Tab',
      content: <Typography>This content won't be shown.</Typography>,
      disabled: true,
    },
    {
      label: 'Active Tab 2',
      content: <Typography>This tab is also active.</Typography>,
    },
  ];

  return <Tabs tabs={tabs} />;
};

// Scrollable tabs
export const Scrollable = () => {
  const tabs = Array.from({ length: 10 }, (_, i) => ({
    label: `Tab ${i + 1}`,
    content: (
      <Typography>
        Content for Tab {i + 1}. When there are many tabs, they become scrollable.
      </Typography>
    ),
  }));

  return <Tabs tabs={tabs} variant="scrollable" />;
};

// Full width tabs
export const FullWidth = () => {
  const tabs = [
    {
      label: 'Overview',
      content: (
        <Box>
          <Typography variant="h6" gutterBottom>
            Overview
          </Typography>
          <Typography>
            Full width tabs distribute evenly across the available space.
          </Typography>
        </Box>
      ),
    },
    {
      label: 'Details',
      content: (
        <Box>
          <Typography variant="h6" gutterBottom>
            Details
          </Typography>
          <Typography>
            Each tab takes up equal width.
          </Typography>
        </Box>
      ),
    },
    {
      label: 'History',
      content: (
        <Box>
          <Typography variant="h6" gutterBottom>
            History
          </Typography>
          <Typography>
            This works well with a small number of tabs.
          </Typography>
        </Box>
      ),
    },
  ];

  return <Tabs tabs={tabs} variant="fullWidth" />;
};

// Vertical tabs
export const Vertical = () => {
  const tabs = [
    {
      label: 'Personal Info',
      icon: <Person />,
      content: (
        <Box>
          <Typography variant="h6" gutterBottom>
            Personal Information
          </Typography>
          <Typography paragraph>
            Manage your personal information including name, email, and contact details.
          </Typography>
          <Typography>
            Vertical tabs are useful for settings pages or when you have many options.
          </Typography>
        </Box>
      ),
    },
    {
      label: 'Account Settings',
      icon: <Settings />,
      content: (
        <Box>
          <Typography variant="h6" gutterBottom>
            Account Settings
          </Typography>
          <Typography>
            Configure your account preferences and security settings.
          </Typography>
        </Box>
      ),
    },
    {
      label: 'Notifications',
      icon: <Notifications />,
      content: (
        <Box>
          <Typography variant="h6" gutterBottom>
            Notification Preferences
          </Typography>
          <Typography>
            Choose how and when you want to receive notifications.
          </Typography>
        </Box>
      ),
    },
  ];

  return <Tabs tabs={tabs} orientation="vertical" />;
};

// Rich content
export const RichContent = () => {
  const tabs = [
    {
      label: 'Dashboard',
      icon: <Home />,
      content: (
        <Box>
          <Typography variant="h5" gutterBottom>
            Dashboard Overview
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, mt: 3 }}>
            <Box sx={{ p: 2, bgcolor: 'primary.light', borderRadius: 2, color: 'white' }}>
              <Typography variant="h4">1,234</Typography>
              <Typography variant="body2">Total Users</Typography>
            </Box>
            <Box sx={{ p: 2, bgcolor: 'success.light', borderRadius: 2, color: 'white' }}>
              <Typography variant="h4">567</Typography>
              <Typography variant="body2">Active Sessions</Typography>
            </Box>
            <Box sx={{ p: 2, bgcolor: 'info.light', borderRadius: 2, color: 'white' }}>
              <Typography variant="h4">89</Typography>
              <Typography variant="body2">New Today</Typography>
            </Box>
          </Box>
        </Box>
      ),
    },
    {
      label: 'Analytics',
      content: (
        <Box>
          <Typography variant="h5" gutterBottom>
            Analytics
          </Typography>
          <Typography paragraph>
            View detailed analytics and insights about your application usage.
          </Typography>
          <Box sx={{ p: 3, bgcolor: 'background.default', borderRadius: 2, mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Chart placeholder - Analytics data would be displayed here
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      label: 'Reports',
      content: (
        <Box>
          <Typography variant="h5" gutterBottom>
            Reports
          </Typography>
          <Typography paragraph>
            Generate and download various reports.
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 2 }}>
            <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Typography variant="subtitle2">Monthly Report</Typography>
              <Typography variant="caption" color="text.secondary">
                Last generated: Dec 1, 2025
              </Typography>
            </Box>
            <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Typography variant="subtitle2">Quarterly Report</Typography>
              <Typography variant="caption" color="text.secondary">
                Last generated: Oct 1, 2025
              </Typography>
            </Box>
          </Box>
        </Box>
      ),
    },
  ];

  return <Tabs tabs={tabs} />;
};
