import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    Avatar,
    IconButton,
    Tooltip,
    Switch,
    FormControlLabel,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    TextField,
    Button,
    Alert,
    CircularProgress,
    Badge,
    Tabs,
    Tab,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from '@mui/material';
import {
    Refresh as RefreshIcon,
    Timeline as TimelineIcon,
    Search as SearchIcon
} from '@mui/icons-material';
import { useAuth } from '../../store/providers/ReduxAuthProvider';

/**
 * User Activity Tracker Page
 * Allows admin users to monitor and track user activities within their company
 */
const UserActivityTracker = () => {
    const { user, tenant } = useAuth();
    const [activeTab, setActiveTab] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [autoRefresh, setAutoRefresh] = useState(true);
    
    // Data states
    const [userActivities, setUserActivities] = useState(null);
    const [realTimeSessions, setRealTimeSessions] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null);
    const [userTimeline, setUserTimeline] = useState(null);
    
    // Filter states
    const [filters, setFilters] = useState({
        days: 7,
        activityType: '',
        userId: '',
        searchTerm: ''
    });
    
    // Dialog states
    const [timelineDialogOpen, setTimelineDialogOpen] = useState(false);

    /**
     * Fetch user activities data
     */
    const fetchUserActivities = useCallback(async () => {
        if (!tenant?.tenantId) return;
        
        try {
            setLoading(true);
            setError(null);
            
            const params = new URLSearchParams({
                days: filters.days.toString(),
                includeRealTime: 'true',
                limit: '1000'
            });
            
            if (filters.activityType) params.append('activityType', filters.activityType);
            if (filters.userId) params.append('userId', filters.userId);
            
            const response = await fetch(`/api/v1/platform/company-logs/${tenant.tenantId}/user-activities?${params}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                if (response.status === 404) {
                    console.warn('User activity tracking API not available yet');
                    setUserActivities({
                        totalActivities: 0,
                        usersList: [],
                        recentActivities: [],
                        activitySummary: { byType: {}, byUser: {}, byHour: {}, byDay: {} }
                    });
                    return;
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                console.warn('API returned non-JSON response, user activity tracking not available');
                setUserActivities({
                    totalActivities: 0,
                    usersList: [],
                    recentActivities: [],
                    activitySummary: { byType: {}, byUser: {}, byHour: {}, byDay: {} }
                });
                return;
            }
            
            const data = await response.json();
            setUserActivities(data.data);
        } catch (err) {
            console.error('Error fetching user activities:', err);
            // Set empty data instead of showing error to user
            setUserActivities({
                totalActivities: 0,
                usersList: [],
                recentActivities: [],
                activitySummary: { byType: {}, byUser: {}, byHour: {}, byDay: {} }
            });
        } finally {
            setLoading(false);
        }
    }, [tenant?.tenantId, filters]);

    /**
     * Fetch real-time sessions data
     */
    const fetchRealTimeSessions = useCallback(async () => {
        if (!tenant?.tenantId) return;
        
        try {
            const response = await fetch(`/api/v1/platform/company-logs/${tenant.tenantId}/real-time-sessions`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                if (response.status === 404) {
                    console.warn('User activity tracking API not available yet');
                    setRealTimeSessions({
                        totalActiveUsers: 0,
                        activeUsers: [],
                        sessionSummary: { currentActivities: {} }
                    });
                    return;
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                console.warn('API returned non-JSON response, user activity tracking not available');
                setRealTimeSessions({
                    totalActiveUsers: 0,
                    activeUsers: [],
                    sessionSummary: { currentActivities: {} }
                });
                return;
            }
            
            const data = await response.json();
            setRealTimeSessions(data.data);
        } catch (err) {
            console.error('Error fetching real-time sessions:', err);
            // Set empty data instead of showing error to user
            setRealTimeSessions({
                totalActiveUsers: 0,
                activeUsers: [],
                sessionSummary: { currentActivities: {} }
            });
        }
    }, [tenant?.tenantId]);

    /**
     * Fetch user timeline
     */
    const fetchUserTimeline = async (userId, days = 1) => {
        if (!tenant?.tenantId || !userId) return;
        
        try {
            setLoading(true);
            const response = await fetch(`/api/v1/platform/company-logs/${tenant.tenantId}/user-timeline/${userId}?days=${days}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                if (response.status === 404) {
                    console.warn('User timeline API not available yet');
                    setUserTimeline({
                        timeline: [],
                        summary: { totalActivities: 0, mostUsedFeatures: {} }
                    });
                    return;
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                console.warn('API returned non-JSON response, user timeline not available');
                setUserTimeline({
                    timeline: [],
                    summary: { totalActivities: 0, mostUsedFeatures: {} }
                });
                return;
            }
            
            const data = await response.json();
            setUserTimeline(data.data);
        } catch (err) {
            console.error('Error fetching user timeline:', err);
            setUserTimeline({
                timeline: [],
                summary: { totalActivities: 0, mostUsedFeatures: {} }
            });
        } finally {
            setLoading(false);
        }
    };

    /**
     * Handle view user timeline
     */
    const handleViewTimeline = async (userId) => {
        setSelectedUser(userId);
        await fetchUserTimeline(userId);
        setTimelineDialogOpen(true);
    };

    /**
     * Auto-refresh effect
     */
    useEffect(() => {
        if (autoRefresh) {
            const interval = setInterval(() => {
                if (activeTab === 0) {
                    fetchRealTimeSessions();
                } else if (activeTab === 1) {
                    fetchUserActivities();
                }
            }, 30000); // Refresh every 30 seconds
            
            return () => clearInterval(interval);
        }
    }, [autoRefresh, activeTab, fetchRealTimeSessions, fetchUserActivities]);

    /**
     * Initial data fetch
     */
    useEffect(() => {
        if (activeTab === 0) {
            fetchRealTimeSessions();
        } else if (activeTab === 1) {
            fetchUserActivities();
        }
    }, [activeTab, fetchRealTimeSessions, fetchUserActivities]);

    /**
     * Get activity type color
     */
    const getActivityTypeColor = (activityType) => {
        const colors = {
            'dashboard_view': 'primary',
            'user_create': 'success',
            'user_update': 'warning',
            'user_delete': 'error',
            'login': 'info',
            'logout': 'default'
        };
        return colors[activityType] || 'default';
    };

    /**
     * Format activity type for display
     */
    const formatActivityType = (activityType) => {
        return activityType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    /**
     * Format time distance
     */
    const formatTimeDistance = (timestamp) => {
        const now = new Date();
        const time = new Date(timestamp);
        const diffMs = now - time;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins} minutes ago`;
        if (diffHours < 24) return `${diffHours} hours ago`;
        return `${diffDays} days ago`;
    };

    /**
     * Format date
     */
    const formatDate = (timestamp) => {
        return new Date(timestamp).toLocaleString();
    };

    /**
     * Render real-time sessions tab
     */
    const renderRealTimeSessions = () => (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6">
                    Real-Time User Sessions
                </Typography>
                <Box display="flex" alignItems="center" gap={2}>
                    <FormControlLabel
                        control={
                            <Switch
                                checked={autoRefresh}
                                onChange={(e) => setAutoRefresh(e.target.checked)}
                            />
                        }
                        label="Auto Refresh"
                    />
                    <IconButton onClick={fetchRealTimeSessions} disabled={loading}>
                        <RefreshIcon />
                    </IconButton>
                </Box>
            </Box>

            {realTimeSessions && (
                <Grid container spacing={3} mb={3}>
                    <Grid item xs={12} md={3}>
                        <Card>
                            <CardContent>
                                <Typography variant="h4" color="primary">
                                    {realTimeSessions.totalActiveUsers}
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                    Active Users
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <Card>
                            <CardContent>
                                <Typography variant="h4" color="success.main">
                                    {Object.keys(realTimeSessions.sessionSummary?.currentActivities || {}).length}
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                    Active Features
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardContent>
                                <Typography variant="body2" color="textSecondary" gutterBottom>
                                    Most Active User
                                </Typography>
                                {realTimeSessions.sessionSummary?.mostActiveUser ? (
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <Avatar sx={{ width: 24, height: 24 }}>
                                            {realTimeSessions.sessionSummary.mostActiveUser.userName?.charAt(0)}
                                        </Avatar>
                                        <Typography variant="body1">
                                            {realTimeSessions.sessionSummary.mostActiveUser.userName}
                                        </Typography>
                                        <Chip 
                                            size="small" 
                                            label={`${realTimeSessions.sessionSummary.mostActiveUser.activitiesCount} activities`}
                                        />
                                    </Box>
                                ) : (
                                    <Typography variant="body1">No active users</Typography>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}

            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Currently Active Users
                    </Typography>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>User</TableCell>
                                    <TableCell>Current Activity</TableCell>
                                    <TableCell>Current Path</TableCell>
                                    <TableCell>Last Activity</TableCell>
                                    <TableCell>Activities Count</TableCell>
                                    <TableCell>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {realTimeSessions?.activeUsers?.map((session) => (
                                    <TableRow key={session.userId}>
                                        <TableCell>
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <Badge
                                                    color="success"
                                                    variant="dot"
                                                    overlap="circular"
                                                >
                                                    <Avatar sx={{ width: 32, height: 32 }}>
                                                        {session.userName?.charAt(0)}
                                                    </Avatar>
                                                </Badge>
                                                <Box>
                                                    <Typography variant="body2" fontWeight="bold">
                                                        {session.userName}
                                                    </Typography>
                                                    <Typography variant="caption" color="textSecondary">
                                                        {session.userEmail}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                size="small"
                                                label={formatActivityType(session.currentActivity)}
                                                color={getActivityTypeColor(session.currentActivity)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" fontFamily="monospace">
                                                {session.currentPath}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">
                                                {formatTimeDistance(session.lastActivity)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">
                                                {session.activitiesCount}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Tooltip title="View Timeline">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleViewTimeline(session.userId)}
                                                >
                                                    <TimelineIcon />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {(!realTimeSessions?.activeUsers || realTimeSessions.activeUsers.length === 0) && (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center">
                                            <Box py={4}>
                                                <Typography variant="body2" color="textSecondary" gutterBottom>
                                                    No active users at the moment
                                                </Typography>
                                                <Typography variant="caption" color="textSecondary">
                                                    User sessions will appear here as people use the HR system
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>
        </Box>
    );

    /**
     * Render user activities tab
     */
    const renderUserActivities = () => (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6">
                    User Activity History
                </Typography>
                <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={fetchUserActivities}
                    disabled={loading}
                >
                    Refresh
                </Button>
            </Box>

            {/* Filters */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={2}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Days</InputLabel>
                                <Select
                                    value={filters.days}
                                    label="Days"
                                    onChange={(e) => setFilters(prev => ({ ...prev, days: e.target.value }))}
                                >
                                    <MenuItem value={1}>1 Day</MenuItem>
                                    <MenuItem value={7}>7 Days</MenuItem>
                                    <MenuItem value={30}>30 Days</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Activity Type</InputLabel>
                                <Select
                                    value={filters.activityType}
                                    label="Activity Type"
                                    onChange={(e) => setFilters(prev => ({ ...prev, activityType: e.target.value }))}
                                >
                                    <MenuItem value="">All Activities</MenuItem>
                                    <MenuItem value="dashboard_view">Dashboard View</MenuItem>
                                    <MenuItem value="user_create">User Create</MenuItem>
                                    <MenuItem value="user_update">User Update</MenuItem>
                                    <MenuItem value="user_delete">User Delete</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <TextField
                                fullWidth
                                size="small"
                                label="Search User"
                                value={filters.searchTerm}
                                onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                                InputProps={{
                                    startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} md={2}>
                            <Button
                                fullWidth
                                variant="contained"
                                onClick={fetchUserActivities}
                                disabled={loading}
                            >
                                Apply Filters
                            </Button>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {/* Activity Summary */}
            {userActivities && (
                <Grid container spacing={3} mb={3}>
                    <Grid item xs={12} md={3}>
                        <Card>
                            <CardContent>
                                <Typography variant="h4" color="primary">
                                    {userActivities.totalActivities}
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                    Total Activities
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <Card>
                            <CardContent>
                                <Typography variant="h4" color="success.main">
                                    {userActivities.usersList?.length || 0}
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                    Active Users
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <Card>
                            <CardContent>
                                <Typography variant="h4" color="warning.main">
                                    {Object.keys(userActivities.activitySummary?.byType || {}).length}
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                    Activity Types
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <Card>
                            <CardContent>
                                <Typography variant="h4" color="info.main">
                                    {userActivities.usersList?.filter(u => u.isOnline).length || 0}
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                    Online Now
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}

            {/* Recent Activities */}
            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Recent Activities
                    </Typography>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>User</TableCell>
                                    <TableCell>Activity</TableCell>
                                    <TableCell>Path</TableCell>
                                    <TableCell>Time</TableCell>
                                    <TableCell>IP Address</TableCell>
                                    <TableCell>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {userActivities?.recentActivities
                                    ?.filter(activity => 
                                        !filters.searchTerm || 
                                        activity.userName?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
                                        activity.userEmail?.toLowerCase().includes(filters.searchTerm.toLowerCase())
                                    )
                                    ?.slice(0, 50)
                                    ?.map((activity, index) => (
                                    <TableRow key={index}>
                                        <TableCell>
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <Avatar sx={{ width: 24, height: 24 }}>
                                                    {activity.userName?.charAt(0)}
                                                </Avatar>
                                                <Box>
                                                    <Typography variant="body2" fontWeight="bold">
                                                        {activity.userName}
                                                    </Typography>
                                                    <Typography variant="caption" color="textSecondary">
                                                        {activity.userEmail}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                size="small"
                                                label={formatActivityType(activity.activityType)}
                                                color={getActivityTypeColor(activity.activityType)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" fontFamily="monospace">
                                                {activity.internalPath}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">
                                                {formatDate(activity.timestamp)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" fontFamily="monospace">
                                                {activity.ip}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Tooltip title="View Timeline">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleViewTimeline(activity.userId)}
                                                >
                                                    <TimelineIcon />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {(!userActivities?.recentActivities || userActivities.recentActivities.length === 0) && (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center">
                                            <Box py={4}>
                                                <Typography variant="body2" color="textSecondary" gutterBottom>
                                                    No activities found
                                                </Typography>
                                                <Typography variant="caption" color="textSecondary">
                                                    Activities will appear here as users navigate through the HR system.<br />
                                                    Try navigating to different pages and return to see the activity log.
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>
        </Box>
    );

    /**
     * Render user timeline dialog
     */
    const renderTimelineDialog = () => (
        <Dialog
            open={timelineDialogOpen}
            onClose={() => setTimelineDialogOpen(false)}
            maxWidth="md"
            fullWidth
        >
            <DialogTitle>
                User Activity Timeline
                {userTimeline?.user && (
                    <Typography variant="subtitle2" color="textSecondary">
                        {userTimeline.user.userName} ({userTimeline.user.userEmail})
                    </Typography>
                )}
            </DialogTitle>
            <DialogContent>
                {loading ? (
                    <Box display="flex" justifyContent="center" p={3}>
                        <CircularProgress />
                    </Box>
                ) : userTimeline ? (
                    <Box>
                        {/* Timeline Summary */}
                        <Grid container spacing={2} mb={3}>
                            <Grid item xs={6} md={3}>
                                <Typography variant="h6" color="primary">
                                    {userTimeline.summary?.totalActivities || 0}
                                </Typography>
                                <Typography variant="caption">Total Activities</Typography>
                            </Grid>
                            <Grid item xs={6} md={3}>
                                <Typography variant="h6" color="success.main">
                                    {Object.keys(userTimeline.summary?.mostUsedFeatures || {}).length}
                                </Typography>
                                <Typography variant="caption">Features Used</Typography>
                            </Grid>
                        </Grid>

                        {/* Timeline */}
                        <Box maxHeight={400} overflow="auto">
                            {userTimeline.timeline?.map((activity, index) => (
                                <Box key={index} display="flex" alignItems="center" gap={2} mb={2}>
                                    <Box
                                        width={8}
                                        height={8}
                                        borderRadius="50%"
                                        bgcolor="primary.main"
                                        flexShrink={0}
                                    />
                                    <Box flex={1}>
                                        <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                                            <Chip
                                                size="small"
                                                label={formatActivityType(activity.activityType)}
                                                color={getActivityTypeColor(activity.activityType)}
                                            />
                                            <Typography variant="body2" fontFamily="monospace">
                                                {activity.internalPath}
                                            </Typography>
                                        </Box>
                                        <Typography variant="caption" color="textSecondary">
                                            {formatDate(activity.timestamp)}
                                        </Typography>
                                    </Box>
                                </Box>
                            ))}
                            {(!userTimeline.timeline || userTimeline.timeline.length === 0) && (
                                <Typography variant="body2" color="textSecondary" align="center">
                                    No activities found for this user
                                </Typography>
                            )}
                        </Box>
                    </Box>
                ) : null}
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setTimelineDialogOpen(false)}>
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );

    // Check if user has admin permissions
    if (!user || (user.role !== 'admin' && user.role !== 'platform_admin')) {
        return (
            <Box p={3}>
                <Alert severity="error">
                    Access denied. This page is only available to admin users.
                </Alert>
            </Box>
        );
    }

    return (
        <Box p={3}>
            <Typography variant="h4" gutterBottom>
                User Activity Tracker
            </Typography>
            <Typography variant="body1" color="textSecondary" gutterBottom>
                Monitor and track user activities within {tenant?.name || 'your company'}
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2">
                    <strong>User Activity Tracking System</strong><br />
                    This page will display real-time user activities and analytics once the backend logging system starts collecting data.
                    The system will automatically populate as users navigate through the HR system.
                </Typography>
            </Alert>

            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
                    <Tab label="Real-Time Sessions" />
                    <Tab label="Activity History" />
                </Tabs>
            </Box>

            {activeTab === 0 && renderRealTimeSessions()}
            {activeTab === 1 && renderUserActivities()}

            {renderTimelineDialog()}
        </Box>
    );
};

export default UserActivityTracker;
