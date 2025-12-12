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
    Grid,
    Card,
    CardContent,
    CardActions
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Visibility as VisibilityIcon,
    CalendarToday as CalendarIcon,
    LocationOn as LocationIcon
} from '@mui/icons-material';
import Loading from '../../components/common/Loading';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import eventService from '../../services/event.service';
import notificationService from '../../services/notification.service';

const EventsPage = () => {
    const { isHR, isAdmin } = useAuth();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [openViewDialog, setOpenViewDialog] = useState(false);
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

    const canManage = isHR || isAdmin;

    const eventTypes = ['meeting', 'training', 'conference', 'workshop', 'social', 'holiday', 'other'];

    useEffect(() => {
        fetchEvents();
        // eslint-disable-next-line react-hooks/exhaustive-deps
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

    const handleViewEvent = async (event) => {
        setSelectedEvent(event);
        setOpenViewDialog(true);

        // Mark related notification as read
        try {
            // Find and mark notification related to this event
            const notifications = await notificationService.getAll({ type: 'event', relatedId: event._id });
            if (notifications && notifications.length > 0) {
                for (const notification of notifications) {
                    if (!notification.isRead) {
                        await notificationService.markAsRead(notification._id);
                    }
                }
                // Trigger notification refresh in header
                window.dispatchEvent(new CustomEvent('notificationUpdate'));
            }
        } catch (error) {

        }
    };

    const getEventTypeColor = (type) => {
        const colors = {
            meeting: '#3498db',
            training: '#9b59b6',
            conference: '#e74c3c',
            workshop: '#f39c12',
            social: '#1abc9c',
            holiday: '#e67e22',
            other: '#95a5a6'
        };
        return colors[type] || '#95a5a6';
    };

    if (loading) return <Loading />;

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">Events</Typography>
                {canManage && (
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => handleOpenDialog()}
                    >
                        Create Event
                    </Button>
                )}
            </Box>

            {events.length === 0 ? (
                <Box sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: '400px'
                }}>
                    <Typography variant="h6" color="text.secondary">
                        No events found
                    </Typography>
                </Box>
            ) : (
                <Box sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 3,
                    pb: 3
                }}>
                    {events.map((event) => {
                        const eventTypeColor = getEventTypeColor(event.type || 'other');

                        return (
                            <Card
                                key={event._id}
                                sx={{
                                    flex: '1 1 calc(33.333% - 24px)',
                                    minWidth: '300px',
                                    maxWidth: 'calc(33.333% - 24px)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    boxShadow: 3,
                                    borderLeft: `6px solid ${eventTypeColor}`,
                                    '&:hover': {
                                        boxShadow: 6,
                                        transform: 'translateY(-4px)',
                                        transition: 'all 0.3s ease'
                                    }
                                }}
                            >
                                <CardContent sx={{ flex: 1 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                        <Typography variant="h6" component="div" sx={{ fontWeight: 600, flex: 1 }}>
                                            {event.title}
                                        </Typography>
                                        <Chip
                                            label={event.type ? event.type.charAt(0).toUpperCase() + event.type.slice(1) : 'Other'}
                                            size="small"
                                            sx={{
                                                bgcolor: eventTypeColor,
                                                color: 'white',
                                                fontWeight: 600,
                                                ml: 1
                                            }}
                                        />
                                    </Box>

                                    {event.description && (
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                            sx={{
                                                mb: 2,
                                                display: '-webkit-box',
                                                WebkitLineClamp: 3,
                                                WebkitBoxOrient: 'vertical',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                minHeight: '60px'
                                            }}
                                        >
                                            {event.description}
                                        </Typography>
                                    )}

                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <CalendarIcon fontSize="small" color="action" />
                                            <Typography variant="body2" color="text.secondary">
                                                {new Date(event.startDate).toLocaleDateString()} - {new Date(event.endDate).toLocaleDateString()}
                                            </Typography>
                                        </Box>

                                        {event.location && (
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <LocationIcon fontSize="small" color="action" />
                                                <Typography variant="body2" color="text.secondary">
                                                    {event.location}
                                                </Typography>
                                            </Box>
                                        )}

                                        {event.isAllDay && (
                                            <Chip
                                                label="All Day Event"
                                                size="small"
                                                color="primary"
                                                variant="outlined"
                                                sx={{ width: 'fit-content' }}
                                            />
                                        )}
                                    </Box>
                                </CardContent>

                                <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 2 }}>
                                    <IconButton
                                        size="small"
                                        onClick={() => handleViewEvent(event)}
                                        color="info"
                                        title="View Details"
                                    >
                                        <VisibilityIcon fontSize="small" />
                                    </IconButton>
                                    {canManage && (
                                        <>
                                            <IconButton
                                                size="small"
                                                onClick={() => handleOpenDialog(event)}
                                                color="primary"
                                                title="Edit"
                                            >
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                onClick={() => {
                                                    setSelectedEvent(event);
                                                    setOpenConfirm(true);
                                                }}
                                                color="error"
                                                title="Delete"
                                            >
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </>
                                    )}
                                </CardActions>
                            </Card>
                        );
                    })}
                </Box>
            )
            }

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
                            <Grid size={{ xs: 6 }}>
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
                            <Grid size={{ xs: 6 }}>
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

            {/* View Event Dialog */}
            <Dialog open={openViewDialog} onClose={() => setOpenViewDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Event Details</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
                        <Box>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                Event Title
                            </Typography>
                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                {selectedEvent?.title}
                            </Typography>
                        </Box>

                        <Box>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                Type
                            </Typography>
                            <Chip
                                label={selectedEvent?.type ? selectedEvent.type.charAt(0).toUpperCase() + selectedEvent.type.slice(1) : 'Other'}
                                size="small"
                                sx={{
                                    bgcolor: getEventTypeColor(selectedEvent?.type || 'other'),
                                    color: 'white',
                                    fontWeight: 600
                                }}
                            />
                        </Box>

                        {selectedEvent?.description && (
                            <Box>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    Description
                                </Typography>
                                <Typography variant="body1">
                                    {selectedEvent.description}
                                </Typography>
                            </Box>
                        )}

                        <Box>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                Date
                            </Typography>
                            <Typography variant="body1">
                                {selectedEvent && `${new Date(selectedEvent.startDate).toLocaleDateString()} - ${new Date(selectedEvent.endDate).toLocaleDateString()}`}
                            </Typography>
                        </Box>

                        {selectedEvent?.location && (
                            <Box>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    Location
                                </Typography>
                                <Typography variant="body1">
                                    {selectedEvent.location}
                                </Typography>
                            </Box>
                        )}

                        <Box>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                All Day Event
                            </Typography>
                            <Chip
                                label={selectedEvent?.isAllDay ? 'Yes' : 'No'}
                                size="small"
                                color={selectedEvent?.isAllDay ? 'primary' : 'default'}
                            />
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenViewDialog(false)}>Close</Button>
                </DialogActions>
            </Dialog>

            <ConfirmDialog
                open={openConfirm}
                title="Delete Event"
                message={`Are you sure you want to delete "${selectedEvent?.title}"? This action cannot be undone.`}
                confirmText="Delete"
                cancelText="Cancel"
                confirmColor="error"
                onConfirm={handleDelete}
                onCancel={() => {
                    setOpenConfirm(false);
                    setSelectedEvent(null);
                }}
            />
        </Box >
    );
};

export default EventsPage;
