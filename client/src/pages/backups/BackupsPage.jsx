import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Typography,
    Grid,
    TextField,
    MenuItem,
    IconButton,
    Chip,
    LinearProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Paper,
    Divider,
    Tooltip,
    Alert,
    Stack,
    Tab,
    Tabs
} from '@mui/material';
import {
    Backup,
    CloudDownload,
    Restore,
    Schedule,
    Storage,
    CheckCircle,
    Error as ErrorIcon,
    PlayArrow,
    History,
    Settings,
    Info,
    Refresh,
    ToggleOn,
    ToggleOff,
    Close
} from '@mui/icons-material';
import DataTable from '../../components/common/DataTable';
import Loading from '../../components/common/Loading';
import { useNotification } from '../../context/NotificationContext';
import backupService from '../../services/backup.service';

const BackupsPage = () => {
    const [backups, setBackups] = useState([]);
    const [executions, setExecutions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [openSchedule, setOpenSchedule] = useState(false);
    const [openDetails, setOpenDetails] = useState(false);
    const [selectedBackup, setSelectedBackup] = useState(null);
    const [activeTab, setActiveTab] = useState(0);
    const [statistics, setStatistics] = useState({
        totalBackups: 0,
        successCount: 0,
        failureCount: 0,
        totalSize: 0,
        lastSuccess: null
    });
    const [scheduleSettings, setScheduleSettings] = useState({
        frequency: 'daily',
        time: '02:00',
        retention: 30,
        autoBackup: true
    });
    const { showNotification } = useNotification();

    useEffect(() => {
        fetchBackups();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchBackups = async () => {
        try {
            setLoading(true);
            const response = await backupService.getAll();
            
            console.log('Fetch backups response:', response); // Debug log
            console.log('Response type:', typeof response, 'Is array:', Array.isArray(response));
            
            // Handle response structure from backend
            if (response && response.success && response.backups) {
                console.log('Setting backups from response.backups:', response.backups);
                // Filter out any invalid entries
                const validBackups = Array.isArray(response.backups) 
                    ? response.backups.filter(b => b && typeof b === 'object' && b._id)
                    : [];
                console.log('Valid backups after filtering:', validBackups);
                setBackups(validBackups);
                
                // Calculate statistics from backups
                const stats = validBackups.reduce((acc, backup) => {
                    acc.totalBackups += backup.stats?.totalBackups || 0;
                    acc.successCount += backup.stats?.successCount || 0;
                    acc.failureCount += backup.stats?.failureCount || 0;
                    acc.totalSize += backup.stats?.totalSize || 0;
                    if (backup.stats?.lastSuccess && (!acc.lastSuccess || new Date(backup.stats.lastSuccess) > new Date(acc.lastSuccess))) {
                        acc.lastSuccess = backup.stats.lastSuccess;
                    }
                    return acc;
                }, {
                    totalBackups: 0,
                    successCount: 0,
                    failureCount: 0,
                    totalSize: 0,
                    lastSuccess: null
                });
                
                setStatistics(stats);
            } else if (Array.isArray(response)) {
                // Fallback for direct array response
                console.log('Setting backups from array response:', response);
                const validBackups = response.filter(b => b && typeof b === 'object' && b._id);
                console.log('Valid backups after filtering:', validBackups);
                setBackups(validBackups);
            } else {
                console.warn('Unexpected response format:', response);
                console.warn('Response keys:', response ? Object.keys(response) : 'null');
                setBackups([]);
            }
        } catch (error) {
            console.error('Fetch backups error:', error);
            showNotification(error.response?.data?.error || 'Failed to fetch backups', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchExecutionHistory = async (backupId) => {
        try {
            const response = await backupService.getHistory(backupId);
            if (response.success && response.history) {
                setExecutions(response.history);
            }
        } catch (error) {
            console.error('Fetch execution history error:', error);
            showNotification('Failed to fetch execution history', 'error');
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchBackups();
        setRefreshing(false);
    };

    const handleCreateBackup = async (backupType = 'full') => {
        try {
            setLoading(true);
            const timestamp = new Date().toISOString().split('T')[0];
            const response = await backupService.create({ 
                name: `Manual Backup ${timestamp}`,
                backupType: backupType, 
                description: 'Manual backup created from UI',
                schedule: {
                    enabled: false
                },
                settings: {
                    encryption: { enabled: true },
                    compression: { enabled: true },
                    retention: { enabled: true, days: 30 },
                    notification: { enabled: true, onFailure: true }
                },
                sources: {
                    databases: [{ name: 'hrsm_db', collections: [] }], // Empty array = backup all collections
                    filePaths: ['./uploads'],
                    configFiles: ['.env']
                },
                storage: {
                    location: './backups'
                }
            });
            
            console.log('Create backup response:', response); // Debug log
            
            // Check if response has success field or if response exists (successful API call)
            if (response && (response.success || response.backup)) {
                const backupId = response.backup?._id || response.backup?.id;
                
                if (backupId) {
                    showNotification('Backup configuration created. Executing backup...', 'info');
                    
                    // Execute the backup immediately
                    try {
                        const executeResponse = await backupService.execute(backupId);
                        if (executeResponse && (executeResponse.success || executeResponse.executionId)) {
                            showNotification('Backup created and execution started successfully', 'success');
                        } else {
                            showNotification('Backup created but execution may have failed', 'warning');
                        }
                    } catch (execError) {
                        console.error('Execute backup error:', execError);
                        showNotification('Backup created but failed to execute automatically', 'warning');
                    }
                    
                    // Wait a moment for execution to start, then refresh
                    setTimeout(() => fetchBackups(), 2000);
                } else {
                    showNotification(response.message || 'Backup configuration created successfully', 'success');
                    await fetchBackups();
                }
            } else if (response) {
                // Response exists but format is unexpected - still try to refresh
                console.warn('Unexpected create response format:', response);
                showNotification('Backup created but response format unexpected', 'warning');
                await fetchBackups();
            } else {
                throw new Error('No response received from server');
            }
        } catch (error) {
            console.error('Create backup error:', error);
            console.error('Error details:', error.response);
            showNotification(error.response?.data?.error || error.message || 'Failed to create backup', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleExecuteBackup = async (backupId) => {
        try {
            setLoading(true);
            const response = await backupService.execute(backupId);
            
            if (response && (response.success || response.executionId)) {
                showNotification(response.message || 'Backup execution started', 'success');
                setTimeout(() => fetchBackups(), 2000); // Refresh after 2 seconds
            } else {
                showNotification('Backup execution initiated', 'info');
                setTimeout(() => fetchBackups(), 2000);
            }
        } catch (error) {
            console.error('Execute backup error:', error);
            showNotification(error.response?.data?.error || 'Failed to execute backup', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetails = async (backup) => {
        setSelectedBackup(backup);
        await fetchExecutionHistory(backup._id);
        setOpenDetails(true);
    };

    const handleToggleActive = async (backup) => {
        try {
            const newStatus = !backup.isActive;
            const response = await backupService.update(backup._id, {
                isActive: newStatus
            });
            
            if (response && (response.success || response.backup)) {
                showNotification(
                    `Backup ${newStatus ? 'activated' : 'deactivated'} successfully`, 
                    'success'
                );
                await fetchBackups();
            } else {
                showNotification(`Backup ${newStatus ? 'activated' : 'deactivated'}`, 'success');
                await fetchBackups();
            }
        } catch (error) {
            console.error('Toggle active error:', error);
            showNotification(error.response?.data?.error || 'Failed to toggle backup status', 'error');
        }
    };

    const handleSaveSchedule = async () => {
        try {
            if (!selectedBackup) {
                showNotification('No backup selected', 'error');
                return;
            }
            
            const response = await backupService.updateSchedule(selectedBackup._id, scheduleSettings);
            
            if (response && (response.success || response.backup)) {
                showNotification(response.message || 'Backup schedule updated successfully', 'success');
                setOpenSchedule(false);
                setSelectedBackup(null);
                await fetchBackups();
            } else {
                showNotification('Schedule updated', 'success');
                setOpenSchedule(false);
                setSelectedBackup(null);
                await fetchBackups();
            }
        } catch (error) {
            console.error('Update schedule error:', error);
            showNotification(error.response?.data?.error || 'Failed to update schedule', 'error');
        }
    };

    const formatSize = (bytes) => {
        if (!bytes || bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    const formatDuration = (ms) => {
        if (!ms) return 'N/A';
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    };

    const columns = [
        {
            field: 'name',
            headerName: 'Backup Configuration',
            width: 250,
            renderCell: (params) => {
                if (!params || !params.row) return <Box>-</Box>;
                return (
                    <Box>
                        <Typography variant="body2" fontWeight="medium">
                            {params.row.name || 'Unnamed'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {params.row.description || 'No description'}
                        </Typography>
                    </Box>
                );
            }
        },
        {
            field: 'backupType',
            headerName: 'Type',
            width: 130,
            renderCell: (params) => {
                if (!params || !params.row) return <Box>-</Box>;
                const backupType = params.row.backupType || 'unknown';
                return (
                    <Chip
                        label={backupType}
                        size="small"
                        color={
                            backupType === 'full' ? 'primary' :
                            backupType === 'incremental' ? 'secondary' :
                            'default'
                        }
                        variant="outlined"
                    />
                );
            }
        },
        {
            field: 'schedule',
            headerName: 'Schedule',
            width: 150,
            renderCell: (params) => {
                if (!params || !params.row) return <Box>-</Box>;
                return (
                    <Box>
                        {params.row.schedule?.enabled ? (
                            <>
                                <Chip
                                    icon={<Schedule fontSize="small" />}
                                    label={params.row.schedule.frequency || 'N/A'}
                                    size="small"
                                    color="success"
                                />
                                <Typography variant="caption" display="block" color="text.secondary">
                                    {params.row.schedule.time || 'N/A'}
                                </Typography>
                            </>
                        ) : (
                            <Chip label="Manual" size="small" variant="outlined" />
                        )}
                    </Box>
                );
            }
        },
        {
            field: 'stats',
            headerName: 'Statistics',
            width: 180,
            renderCell: (params) => {
                if (!params || !params.row) return <Box>-</Box>;
                return (
                    <Box>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Tooltip title="Success">
                                <Chip
                                    icon={<CheckCircle fontSize="small" />}
                                    label={params.row.stats?.successCount || 0}
                                    size="small"
                                    color="success"
                                    variant="outlined"
                                />
                            </Tooltip>
                            <Tooltip title="Failed">
                                <Chip
                                    icon={<ErrorIcon fontSize="small" />}
                                    label={params.row.stats?.failureCount || 0}
                                    size="small"
                                    color="error"
                                    variant="outlined"
                                />
                            </Tooltip>
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                            Total: {formatSize(params.row.stats?.totalSize || 0)}
                        </Typography>
                    </Box>
                );
            }
        },
        {
            field: 'isActive',
            headerName: 'Status',
            width: 100,
            renderCell: (params) => {
                if (!params || !params.row) return <Box>-</Box>;
                return (
                    <Chip
                        label={params.row.isActive ? 'Active' : 'Inactive'}
                        size="small"
                        color={params.row.isActive ? 'success' : 'default'}
                    />
                );
            }
        },
        {
            field: 'actions',
            headerName: 'Actions',
            width: 200,
            renderCell: (params) => (
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title="Execute Backup">
                        <IconButton
                            size="small"
                            onClick={() => handleExecuteBackup(params.row._id)}
                            color="primary"
                            disabled={!params.row.isActive}
                        >
                            <PlayArrow fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="View Details">
                        <IconButton
                            size="small"
                            onClick={() => handleViewDetails(params.row)}
                            color="info"
                        >
                            <Info fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Settings">
                        <IconButton
                            size="small"
                            onClick={() => {
                                setSelectedBackup(params.row);
                                setScheduleSettings({
                                    frequency: params.row.schedule?.frequency || 'daily',
                                    time: params.row.schedule?.time || '02:00',
                                    retention: params.row.settings?.retention?.days || 30,
                                    autoBackup: params.row.schedule?.enabled || false
                                });
                                setOpenSchedule(true);
                            }}
                            color="default"
                        >
                            <Settings fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>
            )
        }
    ];

    if (loading && backups.length === 0) return <Loading />;

    const storageUsedGB = statistics.totalSize / (1024 * 1024 * 1024);
    const storageMaxGB = 10;
    const storagePercentage = (storageUsedGB / storageMaxGB) * 100;

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4" fontWeight="bold">Backup Management</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Manage system backups, schedules, and restore operations
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="Refresh">
                        <IconButton onClick={handleRefresh} disabled={refreshing}>
                            <Refresh />
                        </IconButton>
                    </Tooltip>
                    <Button
                        variant="contained"
                        startIcon={<Backup />}
                        onClick={() => handleCreateBackup('full')}
                        disabled={loading}
                    >
                        Create New Backup
                    </Button>
                </Box>
            </Box>

            {/* Statistics Cards */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} md={3}>
                    <Card elevation={2}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <Storage sx={{ mr: 1, fontSize: 32 }} color="primary" />
                                <Typography variant="h6">Storage Usage</Typography>
                            </Box>
                            <Typography variant="h4" sx={{ mb: 1 }}>
                                {formatSize(statistics.totalSize)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                of {storageMaxGB} GB used
                            </Typography>
                            <LinearProgress 
                                variant="determinate" 
                                value={Math.min(storagePercentage, 100)} 
                                sx={{ 
                                    height: 8, 
                                    borderRadius: 1,
                                    backgroundColor: 'rgba(0,0,0,0.1)',
                                    '& .MuiLinearProgress-bar': {
                                        backgroundColor: storagePercentage > 80 ? 'error.main' : 'primary.main'
                                    }
                                }} 
                            />
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={3}>
                    <Card elevation={2}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <Backup sx={{ mr: 1, fontSize: 32 }} color="info" />
                                <Typography variant="h6">Total Backups</Typography>
                            </Box>
                            <Typography variant="h4" sx={{ mb: 1 }}>{backups.length}</Typography>
                            <Typography variant="body2" color="text.secondary">
                                Configurations
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={3}>
                    <Card elevation={2}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <CheckCircle sx={{ mr: 1, fontSize: 32 }} color="success" />
                                <Typography variant="h6">Success Rate</Typography>
                            </Box>
                            <Typography variant="h4" sx={{ mb: 1 }}>
                                {statistics.totalBackups > 0 
                                    ? Math.round((statistics.successCount / statistics.totalBackups) * 100)
                                    : 0}%
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {statistics.successCount} of {statistics.totalBackups} successful
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={3}>
                    <Card elevation={2}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <History sx={{ mr: 1, fontSize: 32 }} color="secondary" />
                                <Typography variant="h6">Last Backup</Typography>
                            </Box>
                            <Typography variant="h4" sx={{ mb: 1 }}>
                                {statistics.lastSuccess 
                                    ? new Date(statistics.lastSuccess).toLocaleDateString()
                                    : 'Never'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {statistics.lastSuccess 
                                    ? new Date(statistics.lastSuccess).toLocaleTimeString()
                                    : 'No backups yet'}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Quick Actions */}
            <Card elevation={2} sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" sx={{ mb: 2 }}>Quick Actions</Typography>
                    <Stack direction="row" spacing={2} flexWrap="wrap">
                        <Button
                            variant="contained"
                            startIcon={<Backup />}
                            onClick={() => handleCreateBackup('full')}
                            disabled={loading}
                        >
                            Full Backup
                        </Button>
                        <Button
                            variant="outlined"
                            startIcon={<Backup />}
                            onClick={() => handleCreateBackup('database')}
                            disabled={loading}
                        >
                            Database Only
                        </Button>
                        <Button
                            variant="outlined"
                            startIcon={<Backup />}
                            onClick={() => handleCreateBackup('files')}
                            disabled={loading}
                        >
                            Files Only
                        </Button>
                        <Button
                            variant="outlined"
                            startIcon={<Backup />}
                            onClick={() => handleCreateBackup('incremental')}
                            disabled={loading}
                        >
                            Incremental
                        </Button>
                    </Stack>
                </CardContent>
            </Card>

            {/* Backups List */}
            <Card elevation={2}>
                <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6">Backup Configurations</Typography>
                        {backups.length > 0 && (
                            <Chip 
                                label={`${backups.filter(b => b.isActive).length} Active`} 
                                color="success" 
                                size="small" 
                            />
                        )}
                    </Box>
                    {backups.length === 0 ? (
                        <Alert severity="info">
                            No backup configurations found. Create your first backup to get started.
                        </Alert>
                    ) : (
                        <Box>
                            <Alert severity="success" sx={{ mb: 2 }}>
                                Found {backups.length} backup configuration(s)
                            </Alert>
                            {backups.map((backup, index) => (
                                <Card key={backup._id || index} sx={{ mb: 2 }}>
                                    <CardContent>
                                        <Grid container spacing={2}>
                                            <Grid item xs={12} md={6}>
                                                <Typography variant="h6">{backup.name}</Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {backup.description || 'No description'}
                                                </Typography>
                                            </Grid>
                                            <Grid item xs={12} md={6}>
                                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                                    <Chip label={backup.backupType} size="small" color="primary" />
                                                    <Chip 
                                                        label={backup.isActive ? 'Active' : 'Inactive'} 
                                                        size="small" 
                                                        color={backup.isActive ? 'success' : 'default'} 
                                                    />
                                                    {backup.schedule?.enabled && (
                                                        <Chip 
                                                            label={`Scheduled: ${backup.schedule.frequency}`} 
                                                            size="small" 
                                                            color="info" 
                                                        />
                                                    )}
                                                </Box>
                                                <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                                    <Button
                                                        size="small"
                                                        variant="contained"
                                                        startIcon={<PlayArrow />}
                                                        onClick={() => handleExecuteBackup(backup._id)}
                                                        disabled={!backup.isActive}
                                                    >
                                                        Execute
                                                    </Button>
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        startIcon={<Info />}
                                                        onClick={() => handleViewDetails(backup)}
                                                    >
                                                        Details
                                                    </Button>
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        color={backup.isActive ? 'warning' : 'success'}
                                                        startIcon={backup.isActive ? <ToggleOff /> : <ToggleOn />}
                                                        onClick={() => handleToggleActive(backup)}
                                                    >
                                                        {backup.isActive ? 'Deactivate' : 'Activate'}
                                                    </Button>
                                                </Box>
                                            </Grid>
                                        </Grid>
                                    </CardContent>
                                </Card>
                            ))}
                        </Box>
                    )}
                </CardContent>
            </Card>

            {/* Schedule Dialog */}
            <Dialog open={openSchedule} onClose={() => setOpenSchedule(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Schedule sx={{ mr: 1 }} />
                        Backup Schedule Settings
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                        <TextField
                            select
                            label="Backup Frequency"
                            value={scheduleSettings.frequency}
                            onChange={(e) => setScheduleSettings({ ...scheduleSettings, frequency: e.target.value })}
                            fullWidth
                        >
                            <MenuItem value="daily">Daily</MenuItem>
                            <MenuItem value="weekly">Weekly</MenuItem>
                            <MenuItem value="monthly">Monthly</MenuItem>
                            <MenuItem value="custom">Custom</MenuItem>
                        </TextField>
                        <TextField
                            type="time"
                            label="Backup Time"
                            value={scheduleSettings.time}
                            onChange={(e) => setScheduleSettings({ ...scheduleSettings, time: e.target.value })}
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                        />
                        <TextField
                            type="number"
                            label="Retention Period (days)"
                            value={scheduleSettings.retention}
                            onChange={(e) => setScheduleSettings({ ...scheduleSettings, retention: parseInt(e.target.value) })}
                            fullWidth
                            helperText="Automatically delete backups older than this"
                            inputProps={{ min: 1, max: 365 }}
                        />
                        <TextField
                            select
                            label="Auto Backup"
                            value={scheduleSettings.autoBackup}
                            onChange={(e) => setScheduleSettings({ ...scheduleSettings, autoBackup: e.target.value === 'true' })}
                            fullWidth
                        >
                            <MenuItem value="true">Enabled</MenuItem>
                            <MenuItem value="false">Disabled</MenuItem>
                        </TextField>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenSchedule(false)}>Cancel</Button>
                    <Button onClick={handleSaveSchedule} variant="contained">
                        Save Settings
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Details Dialog */}
            <Dialog open={openDetails} onClose={() => setOpenDetails(false)} maxWidth="md" fullWidth>
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Info sx={{ mr: 1 }} />
                            Backup Details
                        </Box>
                        <IconButton size="small" onClick={() => setOpenDetails(false)}>
                            <Close />
                        </IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    {selectedBackup && (
                        <Box>
                            <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 2 }}>
                                <Tab label="Configuration" />
                                <Tab label="Execution History" />
                                <Tab label="Statistics" />
                            </Tabs>

                            {activeTab === 0 && (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <Paper variant="outlined" sx={{ p: 2 }}>
                                        <Typography variant="subtitle2" color="text.secondary">Name</Typography>
                                        <Typography variant="body1">{selectedBackup.name}</Typography>
                                    </Paper>
                                    <Paper variant="outlined" sx={{ p: 2 }}>
                                        <Typography variant="subtitle2" color="text.secondary">Type</Typography>
                                        <Chip label={selectedBackup.backupType} size="small" />
                                    </Paper>
                                    <Paper variant="outlined" sx={{ p: 2 }}>
                                        <Typography variant="subtitle2" color="text.secondary">Schedule</Typography>
                                        <Typography variant="body1">
                                            {selectedBackup.schedule?.enabled 
                                                ? `${selectedBackup.schedule.frequency} at ${selectedBackup.schedule.time}`
                                                : 'Manual only'}
                                        </Typography>
                                    </Paper>
                                    <Paper variant="outlined" sx={{ p: 2 }}>
                                        <Typography variant="subtitle2" color="text.secondary">Settings</Typography>
                                        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                            <Chip 
                                                label={`Encryption: ${selectedBackup.settings?.encryption?.enabled ? 'On' : 'Off'}`} 
                                                size="small" 
                                                color={selectedBackup.settings?.encryption?.enabled ? 'success' : 'default'}
                                            />
                                            <Chip 
                                                label={`Compression: ${selectedBackup.settings?.compression?.enabled ? 'On' : 'Off'}`} 
                                                size="small" 
                                                color={selectedBackup.settings?.compression?.enabled ? 'success' : 'default'}
                                            />
                                        </Stack>
                                    </Paper>
                                </Box>
                            )}

                            {activeTab === 1 && (
                                <Box>
                                    {executions.length === 0 ? (
                                        <Alert severity="info">No execution history available</Alert>
                                    ) : (
                                        <Stack spacing={2}>
                                            {executions.map((exec) => (
                                                <Paper key={exec._id} variant="outlined" sx={{ p: 2 }}>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <Box>
                                                            <Typography variant="body2">
                                                                {new Date(exec.startTime).toLocaleString()}
                                                            </Typography>
                                                            <Typography variant="caption" color="text.secondary">
                                                                Duration: {formatDuration(exec.duration)}
                                                            </Typography>
                                                        </Box>
                                                        <Chip 
                                                            label={exec.status} 
                                                            size="small"
                                                            color={
                                                                exec.status === 'completed' ? 'success' :
                                                                exec.status === 'failed' ? 'error' :
                                                                exec.status === 'running' ? 'info' : 'default'
                                                            }
                                                        />
                                                    </Box>
                                                    {exec.backupSize && (
                                                        <Typography variant="caption" color="text.secondary">
                                                            Size: {formatSize(exec.backupSize)}
                                                        </Typography>
                                                    )}
                                                </Paper>
                                            ))}
                                        </Stack>
                                    )}
                                </Box>
                            )}

                            {activeTab === 2 && (
                                <Grid container spacing={2}>
                                    <Grid item xs={6}>
                                        <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                                            <Typography variant="h4" color="success.main">
                                                {selectedBackup.stats?.successCount || 0}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Successful Backups
                                            </Typography>
                                        </Paper>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                                            <Typography variant="h4" color="error.main">
                                                {selectedBackup.stats?.failureCount || 0}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Failed Backups
                                            </Typography>
                                        </Paper>
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                                            <Typography variant="h4">
                                                {formatSize(selectedBackup.stats?.totalSize || 0)}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Total Storage Used
                                            </Typography>
                                        </Paper>
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                                            <Typography variant="h4">
                                                {formatDuration(selectedBackup.stats?.averageDuration)}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Average Duration
                                            </Typography>
                                        </Paper>
                                    </Grid>
                                </Grid>
                            )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDetails(false)}>Close</Button>
                </DialogActions>
            </Dialog>

        </Box>
    );
};

export default BackupsPage;
