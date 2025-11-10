import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    IconButton,
    Typography,
    Chip,
    MenuItem,
    Grid
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import DataTable from '../../components/common/DataTable';
import Loading from '../../components/common/Loading';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useNotification } from '../../context/NotificationContext';
import eventService from '../../services/event.service';

const EventsPage = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [openConfirm, setOpenConfirm] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        type: 'meeting',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        location: '',
        isAllDay: false
    });
    const { showNotification } = useNotification();

    const eventTypes = ['meeting', 'training', 'conference', 'workshop', 'social', 'holiday', 'other'];

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        try {
            setLoading(true);
            const data = await eventService.getAll();
            setEvents(data);
        } catch (error) {
            showNotification('Failed to fetch events', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (event = null) => {
        if (event) {
            setSelectedEvent(event);
            setFormData({
                title: event.title || '',
                description: event.description || '',
                type: event.type || 'meeting',
                startDate: event.startDate?.split('T')[0] || new Date().toISOString().split('T')[0],
                endDate: event.endDate?.split('T')[0] || new Date().toISOString().split('T')[0],
                location: event.location || '',
                isAllDay: event.isAllDay || false
            });
        } else {
            setSelectedEvent(null);
            setFormData({
                title: '',
                description: '',
                type: 'meeting',
                startDate: new Date().toISOString().split('T')[0],
                endDate: new Date().toISOString().split('T')[0],
                location: '',
                isAllDay: false
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setSelectedEvent(null);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async () => {
        try {
            if (selectedEvent) {
                await eventService.update(selectedEvent._id, formData);
                showNotification('Event updated successfully', 'success');
            } else {
                await eventService.create(formData);
                showNotification('Event created successfully', 'success');
            }
            handleCloseDialog();
            fetchEvents();
        } catch (error) {
            showNotification(error.response?.data?.message || 'Operation failed', 'error');
        }
    };

    const handleDelete = async () => {
        try {
            await eventService.delete(selectedEvent._id);
            showNotification('Event deleted successfully', 'success');
            setOpenConfirm(false);
            setSelectedEvent(null);
            fetchEvents();
        } catch (error) {
            showNotification(error.response?.data?.message || 'Delete failed', 'error');
        }
    };

    const columns = [
        { field: 'title', headerName: 'Event Title', width: 250 },
        {
            field: 'type',
            headerName: 'Type',
            width: 120,
            renderCell: (params) => (
                <Chip label={params.row.type} size="small" variant="outlined" />
            )
        },
        {
            field: 'startDate',
            headerName: 'Start Date',
            width: 120,
            renderCell: (params) => new Date(params.row.startDate).toLocaleDateString()
        },
        {
            field: 'endDate',
            headerName: 'End Date',
            width: 120,
            renderCell: (params) => new Date(params.row.endDate).toLocaleDateString()
        },
        { field: 'location', headerName: 'Location', width: 200 },
        {
            field: 'isAllDay',
            headerName: 'All Day',
            width: 100,
            renderCell: (params) => (
                <Chip
                    label={params.row.isAllDay ? 'Yes' : 'No'}
                    color={params.row.isAllDay ? 'primary' : 'default'}
                    size="small"
                />
            )
        },
        {
            field: 'actions',
            headerName: 'Actions',
            width: 120,
            renderCell: (params) => (
                <Box>
                    <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(params.row)}
                        color="primary"
                    >
                        <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                        size="small"
                        onClick={() => {
                            setSelectedEvent(params.row);
                            setOpenConfirm(true);
                        }}
                        color="error"
                    >
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                </Box>
            )
        }
    ];

    if (loading) return <Loading />;

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">Events</Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                >
                    Create Event
                </Button>
            </Box>

            <DataTable
                rows={events}
                columns={columns}
                getRowId={(row) => row._id}
            />

            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {selectedEvent ? 'Edit Event' : 'Create Event'}
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                        <TextField
                            label="Event Title"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            required
                            fullWidth
                        />
                        <TextField
                            select
                            label="Event Type"
                            name="type"
                            value={formData.type}
                            onChange={handleChange}
                            required
                            fullWidth
                        >
                            {eventTypes.map((type) => (
                                <MenuItem key={type} value={type}>
                                    {type.charAt(0).toUpperCase() + type.slice(1)}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            label="Description"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            multiline
                            rows={3}
                            fullWidth
                        />
                        <Grid container spacing={2}>
                            <Grid item xs={6}>
                                <TextField
                                    type="date"
                                    label="Start Date"
                                    name="startDate"
                                    value={formData.startDate}
                                    onChange={handleChange}
                                    required
                                    fullWidth
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <TextField
                                    type="date"
                                    label="End Date"
                                    name="endDate"
                                    value={formData.endDate}
                                    onChange={handleChange}
                                    required
                                    fullWidth
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                        </Grid>
                        <TextField
                            label="Location"
                            name="location"
                            value={formData.location}
                            onChange={handleChange}
                            fullWidth
                        />
                        <TextField
                            select
                            label="All Day Event"
                            name="isAllDay"
                            value={formData.isAllDay}
                            onChange={(e) => setFormData(prev => ({ ...prev, isAllDay: e.target.value === 'true' }))}
                            fullWidth
                        >
                            <MenuItem value="true">Yes</MenuItem>
                            <MenuItem value="false">No</MenuItem>
                        </TextField>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleSubmit} variant="contained">
                        {selectedEvent ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            <ConfirmDialog
                open={openConfirm}
                title="Delete Event"
                message={`Are you sure you want to delete "${selectedEvent?.title}"?`}
                onConfirm={handleDelete}
                onCancel={() => {
                    setOpenConfirm(false);
                    setSelectedEvent(null);
                }}
            />
        </Box>
    );
};

export default EventsPage;
