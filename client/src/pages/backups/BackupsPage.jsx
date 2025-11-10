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
    DialogActions
} from '@mui/material';
import {
    Backup,
    CloudDownload,
    Restore,
    Delete,
    Schedule,
    Storage
} from '@mui/icons-material';
import DataTable from '../../components/common/DataTable';
import Loading from '../../components/common/Loading';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useNotification } from '../../context/NotificationContext';
import backupService from '../../services/backup.service';

const BackupsPage = () => {
    const [backups, setBackups] = useState([]);
    const [loading, setLoading] = useState(false);
    const [openSchedule, setOpenSchedule] = useState(false);
    const [openConfirm, setOpenConfirm] = useState(false);
    const [selectedBackup, setSelectedBackup] = useState(null);
    const [scheduleSettings, setScheduleSettings] = useState({
        frequency: 'daily',
        time: '02:00',
        retention: 30,
        autoBackup: true
    });
    const { showNotification } = useNotification();

    useEffect(() => {
        fetchBackups();
    }, []);

    const fetchBackups = async () => {
        try {
            setLoading(true);
            const data = await backupService.getAll();
            setBackups(data);
        } catch (error) {
            showNotification('Failed to fetch backups', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateBackup = async () => {
        try {
            setLoading(true);
            await backupService.create({ type: 'manual', description: 'Manual backup' });
            showNotification('Backup created successfully', 'success');
            fetchBackups();
        } catch (error) {
            showNotification('Failed to create backup', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async (backupId) => {
        try {
            setLoading(true);
            await backupService.restore(backupId);
            showNotification('System restored successfully', 'success');
        } catch (error) {
            showNotification('Failed to restore backup', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        try {
            await backupService.delete(selectedBackup._id);
            showNotification('Backup deleted successfully', 'success');
            setOpenConfirm(false);
            setSelectedBackup(null);
            fetchBackups();
        } catch (error) {
            showNotification('Failed to delete backup', 'error');
        }
    };

    const handleDownload = async (backupId) => {
        try {
            await backupService.download(backupId);
            showNotification('Backup download started', 'success');
        } catch (error) {
            showNotification('Failed to download backup', 'error');
        }
    };

    const handleSaveSchedule = async () => {
        try {
            await backupService.updateSchedule(scheduleSettings);
            showNotification('Backup schedule updated successfully', 'success');
            setOpenSchedule(false);
        } catch (error) {
            showNotification('Failed to update schedule', 'error');
        }
    };

    const formatSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    const columns = [
        {
            field: 'name',
            headerName: 'Backup Name',
            width: 250,
            renderCell: (params) => params.row.name || `Backup_${new Date(params.row.createdAt).toISOString().split('T')[0]}`
        },
        {
            field: 'type',
            headerName: 'Type',
            width: 120,
            renderCell: (params) => (
                <Chip
                    label={params.row.type || 'manual'}
                    size="small"
                    color={params.row.type === 'automatic' ? 'primary' : 'default'}
                />
            )
        },
        {
            field: 'size',
            headerName: 'Size',
            width: 120,
            renderCell: (params) => formatSize(params.row.size || 0)
        },
        {
            field: 'createdAt',
            headerName: 'Created',
            width: 180,
            renderCell: (params) => new Date(params.row.createdAt).toLocaleString()
        },
        {
            field: 'status',
            headerName: 'Status',
            width: 120,
            renderCell: (params) => (
                <Chip
                    label={params.row.status || 'completed'}
                    size="small"
                    color={params.row.status === 'completed' ? 'success' : 'warning'}
                />
            )
        },
        {
            field: 'actions',
            headerName: 'Actions',
            width: 180,
            renderCell: (params) => (
                <Box>
                    <IconButton
                        size="small"
                        onClick={() => handleDownload(params.row._id)}
                        color="primary"
                        title="Download"
                    >
                        <CloudDownload fontSize="small" />
                    </IconButton>
                    <IconButton
                        size="small"
                        onClick={() => handleRestore(params.row._id)}
                        color="success"
                        title="Restore"
                    >
                        <Restore fontSize="small" />
                    </IconButton>
                    <IconButton
                        size="small"
                        onClick={() => {
                            setSelectedBackup(params.row);
                            setOpenConfirm(true);
                        }}
                        color="error"
                        title="Delete"
                    >
                        <Delete fontSize="small" />
                    </IconButton>
                </Box>
            )
        }
    ];

    if (loading && backups.length === 0) return <Loading />;

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" sx={{ mb: 3 }}>Backup Management</Typography>

            <Grid container spacing={3}>
                {/* Quick Actions */}
                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" sx={{ mb: 2 }}>Quick Actions</Typography>
                            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                <Button
                                    variant="contained"
                                    startIcon={<Backup />}
                                    onClick={handleCreateBackup}
                                    disabled={loading}
                                >
                                    Create Backup Now
                                </Button>
                                <Button
                                    variant="outlined"
                                    startIcon={<Schedule />}
                                    onClick={() => setOpenSchedule(true)}
                                >
                                    Schedule Settings
                                </Button>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Storage Info */}
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <Storage sx={{ mr: 1 }} color="primary" />
                                <Typography variant="h6">Storage Usage</Typography>
                            </Box>
                            <Typography variant="h3" sx={{ mb: 1 }}>2.4 GB</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                of 10 GB used
                            </Typography>
                            <LinearProgress variant="determinate" value={24} sx={{ height: 8, borderRadius: 1 }} />
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" sx={{ mb: 2 }}>Total Backups</Typography>
                            <Typography variant="h3" sx={{ mb: 1 }}>{backups.length}</Typography>
                            <Typography variant="body2" color="text.secondary">
                                Last backup: {backups[0] ? new Date(backups[0].createdAt).toLocaleDateString() : 'Never'}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" sx={{ mb: 2 }}>Auto Backup</Typography>
                            <Chip label={scheduleSettings.autoBackup ? 'Enabled' : 'Disabled'} color={scheduleSettings.autoBackup ? 'success' : 'default'} />
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                                Frequency: {scheduleSettings.frequency}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Time: {scheduleSettings.time}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Backups List */}
                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" sx={{ mb: 2 }}>Backup History</Typography>
                            <DataTable
                                rows={backups}
                                columns={columns}
                                getRowId={(row) => row._id}
                            />
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Schedule Dialog */}
            <Dialog open={openSchedule} onClose={() => setOpenSchedule(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Backup Schedule Settings</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                        <TextField
                            select
                            label="Backup Frequency"
                            value={scheduleSettings.frequency}
                            onChange={(e) => setScheduleSettings({ ...scheduleSettings, frequency: e.target.value })}
                            fullWidth
                        >
                            <MenuItem value="hourly">Hourly</MenuItem>
                            <MenuItem value="daily">Daily</MenuItem>
                            <MenuItem value="weekly">Weekly</MenuItem>
                            <MenuItem value="monthly">Monthly</MenuItem>
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

            {/* Confirm Dialog */}
            <ConfirmDialog
                open={openConfirm}
                title="Delete Backup"
                message="Are you sure you want to delete this backup? This action cannot be undone."
                onConfirm={handleDelete}
                onCancel={() => {
                    setOpenConfirm(false);
                    setSelectedBackup(null);
                }}
            />
        </Box>
    );
};

export default BackupsPage;
