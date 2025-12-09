import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    MenuItem,
    CircularProgress,
    Alert,
    Tooltip
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Sync as SyncIcon,
    CheckCircle as CheckCircleIcon,
    Error as ErrorIcon,
    Cable as CableIcon
} from '@mui/icons-material';
import attendanceDeviceService from '../../services/attendanceDevice.service';
import PageContainer from '../../components/PageContainer';

const DeviceManagement = () => {
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [openDialog, setOpenDialog] = useState(false);
    const [editingDevice, setEditingDevice] = useState(null);
    const [syncing, setSyncing] = useState({});
    const [formData, setFormData] = useState({
        deviceName: '',
        deviceType: 'biometric-generic',
        ipAddress: '',
        port: '',
        apiKey: '',
        token: '',
        apiUrl: '',
        syncInterval: 5,
        autoSync: true,
        notes: ''
    });

    useEffect(() => {
        fetchDevices();
    }, []);

    const fetchDevices = async () => {
        try {
            setLoading(true);
            const response = await attendanceDeviceService.getAllDevices();
            setDevices(response.data || []);
            setError(null);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to fetch devices');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (device = null) => {
        if (device) {
            setEditingDevice(device);
            setFormData({
                deviceName: device.deviceName,
                deviceType: device.deviceType,
                ipAddress: device.ipAddress || '',
                port: device.port || '',
                apiKey: device.apiKey || '',
                token: device.token || '',
                apiUrl: device.apiUrl || '',
                syncInterval: device.syncInterval || 5,
                autoSync: device.autoSync !== false,
                notes: device.notes || ''
            });
        } else {
            setEditingDevice(null);
            setFormData({
                deviceName: '',
                deviceType: 'biometric-generic',
                ipAddress: '',
                port: '',
                apiKey: '',
                token: '',
                apiUrl: '',
                syncInterval: 5,
                autoSync: true,
                notes: ''
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setEditingDevice(null);
    };

    const handleSubmit = async () => {
        try {
            if (editingDevice) {
                await attendanceDeviceService.updateDevice(editingDevice._id, formData);
            } else {
                await attendanceDeviceService.registerDevice(formData);
            }
            handleCloseDialog();
            fetchDevices();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to save device');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this device?')) {
            try {
                await attendanceDeviceService.deleteDevice(id);
                fetchDevices();
            } catch (err) {
                setError(err.response?.data?.error || 'Failed to delete device');
            }
        }
    };

    const handleSync = async (id) => {
        try {
            setSyncing({ ...syncing, [id]: true });
            await attendanceDeviceService.syncDevice(id);
            fetchDevices();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to sync device');
        } finally {
            setSyncing({ ...syncing, [id]: false });
        }
    };

    const handleTestConnection = async (id) => {
        try {
            const response = await attendanceDeviceService.testConnection(id);
            alert(response.message);
        } catch (err) {
            alert(err.response?.data?.error || 'Connection test failed');
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            active: 'success',
            inactive: 'default',
            error: 'error',
            syncing: 'info'
        };
        return colors[status] || 'default';
    };

    const deviceTypes = [
        { value: 'zkteco', label: 'ZKTeco' },
        { value: 'cloud', label: 'Cloud Service' },
        { value: 'mobile', label: 'Mobile App' },
        { value: 'qr', label: 'QR Code' },
        { value: 'csv', label: 'CSV Import' },
        { value: 'biometric-generic', label: 'Generic Biometric' },
        { value: 'manual', label: 'Manual Entry' }
    ];

    if (loading) {
        return (
            <PageContainer title="Device Management">
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                    <CircularProgress />
                </Box>
            </PageContainer>
        );
    }

    return (
        <PageContainer title="Device Management">
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h5">Attendance Devices</Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                >
                    Add Device
                </Button>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            <Card>
                <CardContent>
                    <TableContainer component={Paper} variant="outlined">
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Device Name</TableCell>
                                    <TableCell>Type</TableCell>
                                    <TableCell>IP Address</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Last Sync</TableCell>
                                    <TableCell>Auto Sync</TableCell>
                                    <TableCell>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {devices.length > 0 ? (
                                    devices.map((device) => (
                                        <TableRow key={device._id}>
                                            <TableCell>{device.deviceName}</TableCell>
                                            <TableCell>
                                                <Chip label={device.deviceType} size="small" />
                                            </TableCell>
                                            <TableCell>{device.ipAddress || '-'}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={device.status}
                                                    color={getStatusColor(device.status)}
                                                    size="small"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                {device.lastSync
                                                    ? new Date(device.lastSync).toLocaleString()
                                                    : 'Never'}
                                            </TableCell>
                                            <TableCell>
                                                {device.autoSync ? (
                                                    <CheckCircleIcon color="success" />
                                                ) : (
                                                    <ErrorIcon color="disabled" />
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Tooltip title="Test Connection">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleTestConnection(device._id)}
                                                    >
                                                        <CableIcon />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Sync Now">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleSync(device._id)}
                                                        disabled={syncing[device._id]}
                                                    >
                                                        {syncing[device._id] ? (
                                                            <CircularProgress size={20} />
                                                        ) : (
                                                            <SyncIcon />
                                                        )}
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Edit">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleOpenDialog(device)}
                                                    >
                                                        <EditIcon />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Delete">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleDelete(device._id)}
                                                        color="error"
                                                    >
                                                        <DeleteIcon />
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center">
                                            No devices found. Add a device to get started.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>

            {/* Add/Edit Device Dialog */}
            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>{editingDevice ? 'Edit Device' : 'Add Device'}</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                        <TextField
                            label="Device Name"
                            value={formData.deviceName}
                            onChange={(e) => setFormData({ ...formData, deviceName: e.target.value })}
                            required
                            fullWidth
                        />
                        <TextField
                            label="Device Type"
                            select
                            value={formData.deviceType}
                            onChange={(e) => setFormData({ ...formData, deviceType: e.target.value })}
                            required
                            fullWidth
                        >
                            {deviceTypes.map((option) => (
                                <MenuItem key={option.value} value={option.value}>
                                    {option.label}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            label="IP Address"
                            value={formData.ipAddress}
                            onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                            fullWidth
                        />
                        <TextField
                            label="Port"
                            type="number"
                            value={formData.port}
                            onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                            fullWidth
                        />
                        <TextField
                            label="API URL"
                            value={formData.apiUrl}
                            onChange={(e) => setFormData({ ...formData, apiUrl: e.target.value })}
                            fullWidth
                        />
                        <TextField
                            label="API Key"
                            value={formData.apiKey}
                            onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                            fullWidth
                        />
                        <TextField
                            label="Sync Interval (minutes)"
                            type="number"
                            value={formData.syncInterval}
                            onChange={(e) => setFormData({ ...formData, syncInterval: e.target.value })}
                            fullWidth
                        />
                        <TextField
                            label="Notes"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            multiline
                            rows={3}
                            fullWidth
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleSubmit} variant="contained">
                        {editingDevice ? 'Update' : 'Add'}
                    </Button>
                </DialogActions>
            </Dialog>
        </PageContainer>
    );
};

export default DeviceManagement;
