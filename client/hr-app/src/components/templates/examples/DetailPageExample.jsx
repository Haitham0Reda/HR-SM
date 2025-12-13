/**
 * DetailPage Template Example
 * 
 * Demonstrates how to use the DetailPage template for creating detail/show pages.
 */

import React, { useState } from 'react';
import DetailPage from '../DetailPage';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Avatar,
  Stack,
  Button,
  Chip,
} from '@mui/material';
import {
  Person as PersonIcon,
  Work as WorkIcon,
  History as HistoryIcon,
  Settings as SettingsIcon,
  Download as DownloadIcon,
  Share as ShareIcon,
} from '@mui/icons-material';

const DetailPageExample = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Mock user data
  const user = {
    id: 1,
    name: 'John Doe',
    email: 'john.doe@example.com',
    role: 'Senior Developer',
    department: 'Engineering',
    status: 'Active',
    joinDate: '2020-01-15',
    phone: '+1 (555) 123-4567',
    location: 'New York, NY',
    manager: 'Jane Smith',
    skills: ['React', 'Node.js', 'TypeScript', 'AWS'],
    projects: [
      { name: 'Project Alpha', role: 'Lead Developer', status: 'Active' },
      { name: 'Project Beta', role: 'Developer', status: 'Completed' },
    ],
    recentActivity: [
      { action: 'Updated profile', date: '2024-01-15 10:30 AM' },
      { action: 'Completed training', date: '2024-01-10 2:15 PM' },
      { action: 'Submitted timesheet', date: '2024-01-08 4:45 PM' },
    ],
  };

  // Define breadcrumbs
  const breadcrumbs = [
    { label: 'Dashboard', path: '/company/techcorp-solutions/dashboard' },
    { label: 'Users', path: '/company/techcorp-solutions/users' },
    { label: user.name },
  ];

  // Define tabs
  const tabs = [
    {
      label: 'Overview',
      icon: <PersonIcon />,
      content: (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Personal Information
                </Typography>
                <List>
                  <ListItem>
                    <ListItemText primary="Email" secondary={user.email} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Phone" secondary={user.phone} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Location" secondary={user.location} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Join Date" secondary={user.joinDate} />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Work Information
                </Typography>
                <List>
                  <ListItem>
                    <ListItemText primary="Role" secondary={user.role} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Department" secondary={user.department} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Manager" secondary={user.manager} />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Skills"
                      secondary={
                        <Stack direction="row" spacing={1} sx={{ marginTop: 1 }}>
                          {user.skills.map((skill) => (
                            <Chip key={skill} label={skill} size="small" />
                          ))}
                        </Stack>
                      }
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      ),
    },
    {
      label: 'Projects',
      icon: <WorkIcon />,
      content: (
        <Box>
          <Typography variant="h6" gutterBottom>
            Assigned Projects
          </Typography>
          <Grid container spacing={2}>
            {user.projects.map((project, index) => (
              <Grid size={{ xs: 12, md: 6 }} key={index}>
                <Card>
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="h6">{project.name}</Typography>
                      <Chip
                        label={project.status}
                        color={project.status === 'Active' ? 'success' : 'default'}
                        size="small"
                      />
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ marginTop: 1 }}>
                      Role: {project.role}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      ),
    },
    {
      label: 'Activity',
      icon: <HistoryIcon />,
      content: (
        <Box>
          <Typography variant="h6" gutterBottom>
            Recent Activity
          </Typography>
          <List>
            {user.recentActivity.map((activity, index) => (
              <ListItem key={index}>
                <ListItemText
                  primary={activity.action}
                  secondary={activity.date}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      ),
    },
    {
      label: 'Settings',
      icon: <SettingsIcon />,
      content: (
        <Box>
          <Typography variant="h6" gutterBottom>
            User Settings
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure user preferences and permissions here.
          </Typography>
        </Box>
      ),
    },
  ];

  // Define metadata
  const metadata = [
    { label: 'Employee ID', value: `#${user.id}` },
    { label: 'Department', value: user.department },
    { label: 'Manager', value: user.manager },
    { label: 'Join Date', value: user.joinDate },
  ];

  // Handle actions
  const handleEdit = () => {
    console.log('Edit user:', user);
    // Navigate to edit page
  };

  const handleDelete = () => {
    console.log('Delete user:', user);
    // Show confirmation dialog
  };

  const handleExport = () => {
    console.log('Export user data');
  };

  const handleShare = () => {
    console.log('Share user profile');
  };

  // Custom actions
  const actions = (
    <>
      <Button
        variant="outlined"
        startIcon={<DownloadIcon />}
        onClick={handleExport}
      >
        Export
      </Button>
      <Button
        variant="outlined"
        startIcon={<ShareIcon />}
        onClick={handleShare}
      >
        Share
      </Button>
    </>
  );

  return (
    <DetailPage
      title={user.name}
      subtitle={user.role}
      breadcrumbs={breadcrumbs}
      tabs={tabs}
      defaultTab={0}
      actions={actions}
      onEdit={handleEdit}
      onDelete={handleDelete}
      loading={loading}
      error={error}
      status={{
        label: user.status,
        color: user.status === 'Active' ? 'success' : 'default',
      }}
      metadata={metadata}
    />
  );
};

export default DetailPageExample;
