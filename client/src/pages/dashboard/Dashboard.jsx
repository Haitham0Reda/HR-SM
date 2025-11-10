import React from 'react';
import {
    Box,
    Grid,
    Card,
    CardContent,
    Typography,
    Paper,
} from '@mui/material';
import {
    People as PeopleIcon,
    EventNote as EventNoteIcon,
    Assignment as AssignmentIcon,
    TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';

const StatCard = ({ title, value, icon: Icon, color }) => (
    <Card>
        <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                    <Typography color="text.secondary" gutterBottom variant="body2">
                        {title}
                    </Typography>
                    <Typography variant="h4" component="div">
                        {value}
                    </Typography>
                </Box>
                <Box
                    sx={{
                        backgroundColor: `${color}.light`,
                        borderRadius: 2,
                        p: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Icon sx={{ color: `${color}.main`, fontSize: 32 }} />
                </Box>
            </Box>
        </CardContent>
    </Card>
);

const Dashboard = () => {
    const { user } = useAuth();

    return (
        <Box>
            <Typography variant="h4" gutterBottom fontWeight="bold">
                Welcome back, {user?.profile?.firstName || user?.username}!
            </Typography>
            <Typography variant="body1" color="text.secondary" mb={4}>
                Here's what's happening with your HR system today.
            </Typography>

            <Grid container spacing={3}>
                {/* Stat Cards */}
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Total Employees"
                        value="0"
                        icon={PeopleIcon}
                        color="primary"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Pending Requests"
                        value="0"
                        icon={AssignmentIcon}
                        color="warning"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Today's Attendance"
                        value="0%"
                        icon={EventNoteIcon}
                        color="success"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="This Month"
                        value="0"
                        icon={TrendingUpIcon}
                        color="info"
                    />
                </Grid>

                {/* Recent Activity */}
                <Grid item xs={12} md={8}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom fontWeight="bold">
                            Recent Activity
                        </Typography>
                        <Typography color="text.secondary">
                            No recent activity to display.
                        </Typography>
                    </Paper>
                </Grid>

                {/* Quick Actions */}
                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom fontWeight="bold">
                            Quick Actions
                        </Typography>
                        <Typography color="text.secondary">
                            Quick action buttons will appear here.
                        </Typography>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default Dashboard;
