/**
 * DashboardPage Template Example
 * 
 * Demonstrates how to use the DashboardPage template for creating dashboard pages.
 */

import React, { useState } from 'react';
import DashboardPage from '../DashboardPage';
import ActionCard from '../../composite/ActionCard';
import {
  People as PeopleIcon,
  Assignment as AssignmentIcon,
  EventNote as EventNoteIcon,
  TrendingUp as TrendingUpIcon,
  PersonAdd as PersonAddIcon,
  Description as DescriptionIcon,
  CalendarToday as CalendarTodayIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import {
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Box,
  LinearProgress,
} from '@mui/material';
import { designTokens } from '../../../theme/designTokens';

const DashboardPageExample = () => {
  const [loading, setLoading] = useState(false);

  // Define stats
  const stats = [
    {
      id: 'total-employees',
      icon: <PeopleIcon />,
      label: 'Total Employees',
      value: '1,234',
      trend: {
        value: 12,
        direction: 'up',
      },
      color: 'primary',
      size: 'small',
    },
    {
      id: 'pending-requests',
      icon: <AssignmentIcon />,
      label: 'Pending Requests',
      value: '45',
      trend: {
        value: 8,
        direction: 'down',
      },
      color: 'warning',
      size: 'small',
    },
    {
      id: 'upcoming-events',
      icon: <EventNoteIcon />,
      label: 'Upcoming Events',
      value: '12',
      color: 'info',
      size: 'small',
    },
    {
      id: 'attendance-rate',
      icon: <TrendingUpIcon />,
      label: 'Attendance Rate',
      value: '94.5%',
      trend: {
        value: 2.3,
        direction: 'up',
      },
      color: 'success',
      size: 'small',
    },
  ];

  // Define quick action cards
  const quickActions = [
    {
      id: 'add-employee',
      title: 'Add New Employee',
      icon: <PersonAddIcon />,
      description: 'Register a new employee in the system with their details and role.',
      buttonText: 'Add Employee',
      buttonColor: 'primary',
      route: '/employees/create',
      badge: 'Quick',
    },
    {
      id: 'create-document',
      title: 'Create Document',
      icon: <DescriptionIcon />,
      description: 'Generate official documents, letters, or certificates for employees.',
      buttonText: 'Create Document',
      buttonColor: 'secondary',
      route: '/documents/create',
    },
    {
      id: 'schedule-event',
      title: 'Schedule Event',
      icon: <CalendarTodayIcon />,
      description: 'Plan and schedule company events, meetings, or training sessions.',
      buttonText: 'Schedule Event',
      buttonColor: 'info',
      route: '/events/create',
    },
  ];

  // Recent activity widget
  const recentActivityWidget = (
    <Card sx={{ height: '100%', borderRadius: designTokens.borderRadius.lg }}>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: designTokens.typography.fontWeight.semibold }}>
          Recent Activity
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Employee</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Time</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>John Doe</TableCell>
                <TableCell>Vacation Request</TableCell>
                <TableCell>
                  <Chip label="Pending" size="small" color="warning" />
                </TableCell>
                <TableCell align="right">2h ago</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Jane Smith</TableCell>
                <TableCell>Document Upload</TableCell>
                <TableCell>
                  <Chip label="Completed" size="small" color="success" />
                </TableCell>
                <TableCell align="right">4h ago</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Bob Johnson</TableCell>
                <TableCell>Profile Update</TableCell>
                <TableCell>
                  <Chip label="Completed" size="small" color="success" />
                </TableCell>
                <TableCell align="right">1d ago</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Alice Williams</TableCell>
                <TableCell>Leave Request</TableCell>
                <TableCell>
                  <Chip label="Approved" size="small" color="success" />
                </TableCell>
                <TableCell align="right">2d ago</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );

  // Department overview widget
  const departmentOverviewWidget = (
    <Card sx={{ height: '100%', borderRadius: designTokens.borderRadius.lg }}>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: designTokens.typography.fontWeight.semibold }}>
          Department Overview
        </Typography>
        <Box sx={{ mt: 3 }}>
          {[
            { name: 'Engineering', count: 45, total: 50, color: 'primary' },
            { name: 'Sales', count: 32, total: 40, color: 'success' },
            { name: 'Marketing', count: 18, total: 25, color: 'info' },
            { name: 'HR', count: 8, total: 10, color: 'warning' },
          ].map((dept) => (
            <Box key={dept.name} sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: designTokens.typography.fontWeight.medium }}>
                  {dept.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {dept.count}/{dept.total}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={(dept.count / dept.total) * 100}
                color={dept.color}
                sx={{ height: 8, borderRadius: designTokens.borderRadius.sm }}
              />
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );

  // Upcoming events widget
  const upcomingEventsWidget = (
    <Card sx={{ height: '100%', borderRadius: designTokens.borderRadius.lg }}>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: designTokens.typography.fontWeight.semibold }}>
          Upcoming Events
        </Typography>
        <Box sx={{ mt: 2 }}>
          {[
            { title: 'Team Building', date: 'Dec 15, 2025', type: 'Social' },
            { title: 'Annual Review', date: 'Dec 20, 2025', type: 'Meeting' },
            { title: 'Training Session', date: 'Dec 22, 2025', type: 'Training' },
            { title: 'Holiday Party', date: 'Dec 24, 2025', type: 'Social' },
          ].map((event, index) => (
            <Box
              key={index}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                py: 2,
                borderBottom: index < 3 ? '1px solid' : 'none',
                borderColor: 'divider',
              }}
            >
              <Box>
                <Typography variant="body2" sx={{ fontWeight: designTokens.typography.fontWeight.medium }}>
                  {event.title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {event.date}
                </Typography>
              </Box>
              <Chip
                label={event.type}
                size="small"
                variant="outlined"
                sx={{ fontSize: designTokens.typography.fontSize.xs }}
              />
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );

  // Define widgets
  const widgets = [
    // Quick Actions
    ...quickActions.map((action) => ({
      id: action.id,
      content: <ActionCard {...action} />,
      size: 'medium',
    })),
    // Recent Activity
    {
      id: 'recent-activity',
      content: recentActivityWidget,
      size: 'large',
    },
    // Department Overview
    {
      id: 'department-overview',
      content: departmentOverviewWidget,
      size: 'medium',
    },
    // Upcoming Events
    {
      id: 'upcoming-events',
      content: upcomingEventsWidget,
      size: 'medium',
    },
  ];

  // Handle refresh
  const handleRefresh = () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      console.log('Dashboard data refreshed');
    }, 1500);
  };

  // Handle settings
  const handleSettings = () => {
    console.log('Open dashboard settings');
    // Navigate to settings or open modal
  };

  return (
    <DashboardPage
      title="HR Dashboard"
      subtitle="Welcome back! Here's what's happening today."
      stats={stats}
      widgets={widgets}
      loading={loading}
      onRefresh={handleRefresh}
      onSettings={handleSettings}
      emptyMessage="No dashboard data available. Please check back later."
      showStats={true}
      statsSpacing={3}
      widgetsSpacing={3}
    />
  );
};

export default DashboardPageExample;
