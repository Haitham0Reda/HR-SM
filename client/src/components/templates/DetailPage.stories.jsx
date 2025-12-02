import React from 'react';
import DetailPage from './DetailPage';
import { Typography, Box, Chip, Stack } from '@mui/material';
import { Person, Settings, History, Security } from '@mui/icons-material';

export default {
  title: 'Page Templates/DetailPage',
  component: DetailPage,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

// Sample tabs
const sampleTabs = [
  {
    label: 'Overview',
    icon: <Person />,
    content: (
      <Box>
        <Typography variant="h6" gutterBottom>
          User Overview
        </Typography>
        <Typography paragraph>
          This is the overview tab containing general information about the user.
        </Typography>
        <Stack spacing={2}>
          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              Full Name
            </Typography>
            <Typography>John Doe</Typography>
          </Box>
          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              Email
            </Typography>
            <Typography>john.doe@example.com</Typography>
          </Box>
          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              Phone
            </Typography>
            <Typography>+1 (555) 123-4567</Typography>
          </Box>
        </Stack>
      </Box>
    ),
  },
  {
    label: 'Settings',
    icon: <Settings />,
    content: (
      <Box>
        <Typography variant="h6" gutterBottom>
          User Settings
        </Typography>
        <Typography>
          Configure user preferences and settings here.
        </Typography>
      </Box>
    ),
  },
  {
    label: 'History',
    icon: <History />,
    content: (
      <Box>
        <Typography variant="h6" gutterBottom>
          Activity History
        </Typography>
        <Typography>
          View user activity and history logs.
        </Typography>
      </Box>
    ),
  },
];

// Basic detail page
export const Basic = () => (
  <DetailPage
    title="User Details"
    subtitle="John Doe"
    tabs={sampleTabs}
    onEdit={() => alert('Edit user')}
    onDelete={() => alert('Delete user')}
  />
);

// With breadcrumbs
export const WithBreadcrumbs = () => (
  <DetailPage
    title="User Details"
    subtitle="John Doe"
    breadcrumbs={[
      { label: 'Home', path: '/' },
      { label: 'Users', path: '/users' },
      { label: 'Details' },
    ]}
    tabs={sampleTabs}
    onEdit={() => alert('Edit user')}
  />
);

// With status
export const WithStatus = () => (
  <DetailPage
    title="User Details"
    subtitle="John Doe"
    status={{ label: 'Active', color: 'success' }}
    tabs={sampleTabs}
    onEdit={() => alert('Edit user')}
    onDelete={() => alert('Delete user')}
  />
);

// With metadata
export const WithMetadata = () => (
  <DetailPage
    title="User Details"
    subtitle="John Doe"
    status={{ label: 'Active', color: 'success' }}
    metadata={[
      { label: 'Employee ID', value: 'EMP-001' },
      { label: 'Department', value: 'Engineering' },
      { label: 'Join Date', value: 'Jan 15, 2024' },
      { label: 'Location', value: 'San Francisco, CA' },
    ]}
    tabs={sampleTabs}
    onEdit={() => alert('Edit user')}
  />
);

// Loading state
export const Loading = () => (
  <DetailPage
    title="User Details"
    subtitle="Loading..."
    tabs={sampleTabs}
    loading={true}
  />
);

// Error state
export const Error = () => (
  <DetailPage
    title="User Details"
    subtitle="Error loading user"
    tabs={sampleTabs}
    error="Failed to load user details. Please try again."
  />
);

// Without actions
export const WithoutActions = () => (
  <DetailPage
    title="User Details"
    subtitle="John Doe (Read-only)"
    tabs={sampleTabs}
  />
);

// With custom header content
export const WithCustomHeaderContent = () => (
  <DetailPage
    title="User Details"
    subtitle="John Doe"
    status={{ label: 'Active', color: 'success' }}
    headerContent={
      <Stack direction="row" spacing={1} flexWrap="wrap">
        <Chip label="Admin" color="error" size="small" />
        <Chip label="Verified" color="success" size="small" variant="outlined" />
        <Chip label="Premium" color="primary" size="small" variant="outlined" />
      </Stack>
    }
    tabs={sampleTabs}
    onEdit={() => alert('Edit user')}
  />
);

// Complete example
export const CompleteExample = () => (
  <DetailPage
    title="User Details"
    subtitle="John Doe - Senior Software Engineer"
    breadcrumbs={[
      { label: 'Dashboard', path: '/' },
      { label: 'Users', path: '/users' },
      { label: 'John Doe' },
    ]}
    status={{ label: 'Active', color: 'success' }}
    metadata={[
      { label: 'Employee ID', value: 'EMP-001' },
      { label: 'Department', value: 'Engineering' },
      { label: 'Position', value: 'Senior Software Engineer' },
      { label: 'Join Date', value: 'January 15, 2024' },
      { label: 'Location', value: 'San Francisco, CA' },
      { label: 'Reports To', value: 'Jane Smith' },
    ]}
    headerContent={
      <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 2 }}>
        <Chip label="Admin Access" color="error" size="small" />
        <Chip label="Email Verified" color="success" size="small" variant="outlined" />
        <Chip label="2FA Enabled" color="info" size="small" variant="outlined" />
      </Stack>
    }
    tabs={[
      {
        label: 'Overview',
        icon: <Person />,
        content: (
          <Box>
            <Typography variant="h6" gutterBottom>
              Personal Information
            </Typography>
            <Stack spacing={3}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Contact Information
                </Typography>
                <Stack spacing={1}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Email
                    </Typography>
                    <Typography>john.doe@example.com</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Phone
                    </Typography>
                    <Typography>+1 (555) 123-4567</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Address
                    </Typography>
                    <Typography>123 Main St, San Francisco, CA 94105</Typography>
                  </Box>
                </Stack>
              </Box>
            </Stack>
          </Box>
        ),
      },
      {
        label: 'Settings',
        icon: <Settings />,
        content: (
          <Box>
            <Typography variant="h6" gutterBottom>
              Account Settings
            </Typography>
            <Typography>
              Manage user account settings, permissions, and preferences.
            </Typography>
          </Box>
        ),
      },
      {
        label: 'Activity',
        icon: <History />,
        content: (
          <Box>
            <Typography variant="h6" gutterBottom>
              Recent Activity
            </Typography>
            <Typography>
              View recent user activity and login history.
            </Typography>
          </Box>
        ),
      },
      {
        label: 'Security',
        icon: <Security />,
        content: (
          <Box>
            <Typography variant="h6" gutterBottom>
              Security Settings
            </Typography>
            <Typography>
              Manage security settings including password, 2FA, and sessions.
            </Typography>
          </Box>
        ),
      },
    ]}
    onEdit={() => alert('Edit user')}
    onDelete={() => alert('Delete user')}
  />
);
