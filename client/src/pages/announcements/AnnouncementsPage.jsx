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
    Card,
    CardContent,
    CardActions,
    Divider
} from '@mui/material';
<<<<<<< HEAD
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Visibility as VisibilityIcon } from '@mui/icons-material';
import DataTable from '../../components/common/DataTable';
=======
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Visibility as ViewIcon } from '@mui/icons-material';
>>>>>>> d93211611f4a47689b466866f76db5ab2a5fe742
import Loading from '../../components/common/Loading';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import announcementService from '../../services/announcement.service';
import notificationService from '../../services/notification.service';

const AnnouncementsPage = () => {
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
<<<<<<< HEAD
    const [openViewDialog, setOpenViewDialog] = useState(false);
=======
    const [viewDialogOpen, setViewDialogOpen] = useState(false);
>>>>>>> d93211611f4a47689b466866f76db5ab2a5fe742
    const [openConfirm, setOpenConfirm] = useState(false);
    const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
    const [viewAnnouncement, setViewAnnouncement] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        priority: 'medium',
        targetAudience: 'all',
        isActive: true,
        startDate: '',
        endDate: ''
    });
    const { showNotification } = useNotification();
    const { user } = useAuth(); // Added destructuring

    const priorities = ['low', 'medium', 'high']; // Match database model
    const audiences = ['all', 'department', 'specific']; // Match database model

    useEffect(() => {
        fetchAnnouncements();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchAnnouncements = async () => {
        try {
            setLoading(true);
            console.log('=== FETCHING ANNOUNCEMENTS ===');

            // Test direct axios call
            const token = localStorage.getItem('token');
            console.log('Token from localStorage:', token);

            if (!token) {
                console.log('No token found, cannot fetch announcements');
                setAnnouncements([]);
                setLoading(false);
                return;
            }

            // Try the service call first (this should work better)
            console.log('Calling announcementService.getAll()...');
            const serviceResponse = await announcementService.getAll();
            console.log('Service response:', serviceResponse);
            console.log('Service response type:', typeof serviceResponse);

            // Process the data
            let data = [];
            if (Array.isArray(serviceResponse)) {
                data = serviceResponse;
            } else if (serviceResponse && Array.isArray(serviceResponse.data)) {
                data = serviceResponse.data;
            } else if (serviceResponse && Array.isArray(serviceResponse.announcements)) {
                data = serviceResponse.announcements;
            } else {
                data = [];
            }

            console.log('Final processed data:', data);
            console.log('Data length:', data.length);

            // Log the first item to see its structure
            if (data.length > 0) {
                console.log('First announcement:', data[0]);
                console.log('First announcement priority:', data[0].priority);
            }

            setAnnouncements(data);
        } catch (error) {
            console.error('=== ERROR FETCHING ANNOUNCEMENTS ===');
            console.error('Error:', error);
            console.error('Error message:', error.message);
            if (error.response) {
                console.error('Error response:', error.response);
            }
            showNotification('Failed to fetch announcements: ' + error.message, 'error');
            setAnnouncements([]);
        } finally {
            setLoading(false);
        }
    };

    const getAnnouncementStatus = (announcement) => {
        if (!announcement.isActive) {
            return { label: 'Inactive', color: 'default' };
        }

        const now = new Date();
        const startDate = announcement.startDate ? new Date(announcement.startDate) : null;
        const endDate = announcement.endDate ? new Date(announcement.endDate) : null;

        if (startDate && now < startDate) {
            return { label: 'Upcoming', color: 'info' };
        }

        if (endDate && now > endDate) {
            return { label: 'Expired', color: 'error' };
        }

        return { label: 'Active', color: 'success' };
    };

    const handleOpenDialog = (announcement = null) => {
        if (announcement) {
            setSelectedAnnouncement(announcement);
            setFormData({
                title: announcement.title || '',
                content: announcement.content || '',
                priority: announcement.priority || 'medium',
                targetAudience: announcement.targetAudience || 'all',
                isActive: announcement.isActive !== false,
                startDate: announcement.startDate ? new Date(announcement.startDate).toISOString().split('T')[0] : '',
                endDate: announcement.endDate ? new Date(announcement.endDate).toISOString().split('T')[0] : ''
            });
        } else {
            setSelectedAnnouncement(null);
            setFormData({
                title: '',
                content: '',
                priority: 'medium',
                targetAudience: 'all',
                isActive: true,
                startDate: '',
                endDate: ''
            });
        }
        setOpenDialog(true);
    };

    const handleViewDialogOpen = (announcement) => {
        setViewAnnouncement(announcement);
        setViewDialogOpen(true);
    };

    const handleViewDialogClose = () => {
        setViewDialogOpen(false);
        setViewAnnouncement(null);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setSelectedAnnouncement(null);
    };

    const handleViewAnnouncement = async (announcement) => {
        setSelectedAnnouncement(announcement);
        setOpenViewDialog(true);

        // Mark related notification as read
        try {
            // Find and mark notification related to this announcement
            const notifications = await notificationService.getAll({ type: 'announcement', relatedId: announcement._id });
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
            console.error('Error marking notification as read:', error);
        }
    };

    const handleCloseViewDialog = () => {
        setOpenViewDialog(false);
        setSelectedAnnouncement(null);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async () => {
        try {
            if (selectedAnnouncement) {
                await announcementService.update(selectedAnnouncement._id, formData);
                showNotification('Announcement updated successfully', 'success');
            } else {
                await announcementService.create(formData);
                showNotification('Announcement created successfully', 'success');
            }
            handleCloseDialog();
            fetchAnnouncements();
        } catch (error) {
            showNotification(error.response?.data?.message || 'Operation failed', 'error');
        }
    };

    const handleDelete = async () => {
        try {
            await announcementService.delete(selectedAnnouncement._id);
            showNotification('Announcement deleted successfully', 'success');
            setOpenConfirm(false);
            setSelectedAnnouncement(null);
            fetchAnnouncements();
        } catch (error) {
            showNotification(error.response?.data?.message || 'Delete failed', 'error');
        }
    };

    const getPriorityColor = (priority) => {
        const colors = {
            low: 'success',
            medium: 'warning',
            high: 'error'
        };
        return colors[priority] || 'default';
    };

<<<<<<< HEAD
    const columns = [
        { field: 'title', headerName: 'Title', width: 250, align: 'left' },
        { field: 'content', headerName: 'Content', width: 350, align: 'left' },
        {
            field: 'priority',
            headerName: 'Priority',
            width: 120,
            align: 'center',
            renderCell: (row) => {
                try {
                    if (!row) return null;
                    const priority = row.priority || 'medium';

                    // Define background colors based on priority
                    let backgroundColor = '#e0e0e0'; // default
                    let textColor = '#000000'; // default

                    if (priority === 'high') {
                        backgroundColor = '#f44336'; // red
                        textColor = '#ffffff';
                    } else if (priority === 'medium') {
                        backgroundColor = '#ffeb3b'; // yellow
                        textColor = '#000000';
                    } else if (priority === 'low') {
                        backgroundColor = '#4caf50'; // green
                        textColor = '#ffffff';
                    }

                    return (
                        <Chip
                            label={priority.charAt(0).toUpperCase() + priority.slice(1)}
                            size="small"
                            sx={{
                                backgroundColor: backgroundColor,
                                color: textColor,
                                fontWeight: 'bold'
                            }}
                        />
                    );
                } catch (error) {
                    console.error('Error rendering priority cell:', error);
                    console.error('Row:', row);
                    return null;
                }
            }
        },
        {
            field: 'targetAudience',
            headerName: 'Audience',
            width: 120,
            align: 'center',
            renderCell: (row) => {
                try {
                    if (!row) return null;
                    const audience = row.targetAudience || 'all';
                    return (
                        <Chip label={audience} size="small" variant="outlined" />
                    );
                } catch (error) {
                    console.error('Error rendering targetAudience cell:', error);
                    console.error('Row:', row);
                    return null;
                }
            }
        },
        {
            field: 'isActive',
            headerName: 'Status',
            width: 150,
            align: 'center',
            renderCell: (row) => {
                try {
                    if (!row) return null;
                    const status = getAnnouncementStatus(row);

                    // Add date information to the status display
                    let dateInfo = '';
                    const now = new Date();

                    if (status.label === 'Upcoming' && row.startDate) {
                        const startDate = new Date(row.startDate);
                        dateInfo = ` (${startDate.toLocaleDateString()})`;
                    } else if (status.label === 'Expired' && row.endDate) {
                        const endDate = new Date(row.endDate);
                        dateInfo = ` (${endDate.toLocaleDateString()})`;
                    } else if (status.label === 'Active' && (row.startDate || row.endDate)) {
                        if (row.endDate) {
                            const endDate = new Date(row.endDate);
                            dateInfo = ` (Until ${endDate.toLocaleDateString()})`;
                        }
                    }

                    return (
                        <Chip
                            label={status.label + dateInfo}
                            color={status.color}
                            size="small"
                        />
                    );
                } catch (error) {
                    console.error('Error rendering isActive cell:', error);
                    console.error('Row:', row);
                    return null;
                }
            }
        },
        {
            field: 'createdAt',
            headerName: 'Created',
            width: 120,
            align: 'center',
            renderCell: (row) => {
                try {
                    if (!row || !row.createdAt) return 'N/A';
                    try {
                        return new Date(row.createdAt).toLocaleDateString();
                    } catch (e) {
                        return 'N/A';
                    }
                } catch (error) {
                    console.error('Error rendering createdAt cell:', error);
                    console.error('Row:', row);
                    return 'N/A';
                }
            }
        },
        {
            field: 'actions',
            headerName: 'Actions',
            width: 120,
            align: 'center',
            renderCell: (row) => {
                try {
                    if (!row) return null;
                    return (
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <IconButton
                                size="small"
                                onClick={() => handleViewAnnouncement(row)}
                                color="info"
                            >
                                <VisibilityIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                                size="small"
                                onClick={() => handleOpenDialog(row)}
                                color="primary"
                                disabled={!user || (user.role !== 'hr' && user.role !== 'admin')}
                            >
                                <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                                size="small"
                                onClick={() => {
                                    setSelectedAnnouncement(row);
                                    setOpenConfirm(true);
                                }}
                                color="error"
                                disabled={!user || (user.role !== 'hr' && user.role !== 'admin')}
                            >
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </Box>
                    );
                } catch (error) {
                    console.error('Error rendering actions cell:', error);
                    console.error('Row:', row);
                    return null;
                }
            }
        }
    ];

=======
>>>>>>> d93211611f4a47689b466866f76db5ab2a5fe742
    if (loading) return <Loading />;

    return (
        <Box sx={{
            p: 3,
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden'
        }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">Announcements</Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                    disabled={!user || (user.role !== 'hr' && user.role !== 'admin')}
                >
                    New Announcement
                </Button>
            </Box>

<<<<<<< HEAD
            <Box sx={{ flex: 1, overflow: 'hidden' }}>
                <DataTable
                    data={announcements}
                    columns={columns}
                    getRowId={(row) => row._id}
                />
            </Box>
=======
            {announcements.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 5 }}>
                    <Typography variant="h6" color="text.secondary">
                        No announcements available
                    </Typography>
                </Box>
            ) : (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                    {announcements.map((announcement) => (
                        <Box key={announcement._id} sx={{ flex: '1 1 300px', minWidth: 300 }}>
                            <Card 
                                sx={{ 
                                    height: '100%', 
                                    display: 'flex', 
                                    flexDirection: 'column',
                                    borderLeft: '4px solid',
                                    borderLeftColor: announcement.priority === 'urgent' ? 'error.main' : 
                                                    announcement.priority === 'high' ? 'warning.main' : 
                                                    announcement.priority === 'normal' ? 'info.main' : 'grey.400'
                                }}
                            >
                                <CardContent sx={{ flexGrow: 1 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                        <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
                                            {announcement.title}
                                        </Typography>
                                        <Chip 
                                            label={announcement.priority} 
                                            color={getPriorityColor(announcement.priority)} 
                                            size="small" 
                                            sx={{ ml: 1 }}
                                        />
                                    </Box>
                                    
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                        {announcement.content.substring(0, 100)}...
                                    </Typography>
                                    
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                                        <Chip 
                                            label={announcement.targetAudience} 
                                            size="small" 
                                            variant="outlined" 
                                        />
                                        <Chip 
                                            label={announcement.isActive ? 'Active' : 'Inactive'} 
                                            color={announcement.isActive ? 'success' : 'default'} 
                                            size="small" 
                                        />
                                    </Box>
                                    
                                    <Typography variant="caption" color="text.secondary">
                                        Created: {new Date(announcement.createdAt).toLocaleDateString()}
                                    </Typography>
                                </CardContent>
                                
                                <CardActions sx={{ justifyContent: 'space-between', p: 2, pt: 0 }}>
                                    <Button 
                                        size="small" 
                                        startIcon={<ViewIcon />}
                                        onClick={() => handleViewDialogOpen(announcement)}
                                    >
                                        View
                                    </Button>
                                    <Box>
                                        <IconButton 
                                            size="small" 
                                            onClick={() => handleOpenDialog(announcement)}
                                            color="primary"
                                        >
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                        <IconButton 
                                            size="small" 
                                            onClick={() => {
                                                setSelectedAnnouncement(announcement);
                                                setOpenConfirm(true);
                                            }}
                                            color="error"
                                        >
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </Box>
                                </CardActions>
                            </Card>
                        </Box>
                    ))}
                </Box>
            )}
>>>>>>> d93211611f4a47689b466866f76db5ab2a5fe742

            {/* View Announcement Dialog */}
            <Dialog open={viewDialogOpen} onClose={handleViewDialogClose} maxWidth="md" fullWidth>
                <DialogTitle>
                    {viewAnnouncement?.title}
                    <Chip 
                        label={viewAnnouncement?.priority} 
                        color={getPriorityColor(viewAnnouncement?.priority)} 
                        size="small" 
                        sx={{ ml: 2 }}
                    />
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ py: 2 }}>
                        <Typography variant="body1" sx={{ whiteSpace: 'pre-line', mb: 3 }}>
                            {viewAnnouncement?.content}
                        </Typography>
                        
                        <Divider sx={{ my: 2 }} />
                        
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
                            <Box>
                                <Typography variant="subtitle2" color="text.secondary">
                                    Target Audience
                                </Typography>
                                <Chip 
                                    label={viewAnnouncement?.targetAudience} 
                                    size="small" 
                                    variant="outlined" 
                                />
                            </Box>
                            
                            <Box>
                                <Typography variant="subtitle2" color="text.secondary">
                                    Status
                                </Typography>
                                <Chip 
                                    label={viewAnnouncement?.isActive ? 'Active' : 'Inactive'} 
                                    color={viewAnnouncement?.isActive ? 'success' : 'default'} 
                                    size="small" 
                                />
                            </Box>
                        </Box>
                        
                        <Typography variant="caption" color="text.secondary">
                            Published: {viewAnnouncement?.createdAt ? new Date(viewAnnouncement.createdAt).toLocaleString() : ''}
                        </Typography>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleViewDialogClose} variant="contained">
                        Close
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Create/Edit Announcement Dialog */}
            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
                <DialogTitle>
                    {selectedAnnouncement ? 'Edit Announcement' : 'New Announcement'}
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                        <TextField
                            label="Title"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            required
                            fullWidth
                        />
                        <TextField
                            label="Content"
                            name="content"
                            value={formData.content}
                            onChange={handleChange}
                            multiline
                            rows={6}
                            required
                            fullWidth
                        />
                        <TextField
                            select
                            label="Priority"
                            name="priority"
                            value={formData.priority}
                            onChange={handleChange}
                            fullWidth
                        >
                            {priorities.map((priority) => (
                                <MenuItem key={priority} value={priority}>
                                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            select
                            label="Target Audience"
                            name="targetAudience"
                            value={formData.targetAudience}
                            onChange={handleChange}
                            fullWidth
                        >
                            {audiences.map((audience) => (
                                <MenuItem key={audience} value={audience}>
                                    {audience.charAt(0).toUpperCase() + audience.slice(1)}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            select
                            label="Status"
                            name="isActive"
                            value={formData.isActive}
                            onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.value === 'true' }))}
                            fullWidth
                        >
                            <MenuItem value="true">Active</MenuItem>
                            <MenuItem value="false">Inactive</MenuItem>
                        </TextField>
                        <TextField
                            label="Start Date"
                            name="startDate"
                            type="date"
                            value={formData.startDate}
                            onChange={handleChange}
                            fullWidth
                            InputLabelProps={{
                                shrink: true,
                            }}
                            helperText="Optional: When the announcement becomes active"
                        />
                        <TextField
                            label="End Date"
                            name="endDate"
                            type="date"
                            value={formData.endDate}
                            onChange={handleChange}
                            fullWidth
                            InputLabelProps={{
                                shrink: true,
                            }}
                            helperText="Optional: When the announcement expires"
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleSubmit} variant="contained">
                        {selectedAnnouncement ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openViewDialog} onClose={handleCloseViewDialog} maxWidth="md" fullWidth>
                <DialogTitle>View Announcement</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                        <Box>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                Title
                            </Typography>
                            <Typography variant="body1">
                                {selectedAnnouncement?.title || 'N/A'}
                            </Typography>
                        </Box>
                        <Box>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                Content
                            </Typography>
                            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                                {selectedAnnouncement?.content || 'N/A'}
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    Priority
                                </Typography>
                                <Chip
                                    label={selectedAnnouncement?.priority?.charAt(0).toUpperCase() + selectedAnnouncement?.priority?.slice(1) || 'N/A'}
                                    size="small"
                                    sx={{
                                        backgroundColor: selectedAnnouncement?.priority === 'high' ? '#f44336' :
                                            selectedAnnouncement?.priority === 'medium' ? '#ffeb3b' :
                                                selectedAnnouncement?.priority === 'low' ? '#4caf50' : '#e0e0e0',
                                        color: selectedAnnouncement?.priority === 'medium' ? '#000000' : '#ffffff',
                                        fontWeight: 'bold'
                                    }}
                                />
                            </Box>
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    Target Audience
                                </Typography>
                                <Chip
                                    label={selectedAnnouncement?.targetAudience || 'N/A'}
                                    size="small"
                                    variant="outlined"
                                />
                            </Box>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    Status
                                </Typography>
                                {selectedAnnouncement && (
                                    <Chip
                                        label={getAnnouncementStatus(selectedAnnouncement).label}
                                        color={getAnnouncementStatus(selectedAnnouncement).color}
                                        size="small"
                                    />
                                )}
                            </Box>
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    Created
                                </Typography>
                                <Typography variant="body1">
                                    {selectedAnnouncement?.createdAt ? new Date(selectedAnnouncement.createdAt).toLocaleDateString() : 'N/A'}
                                </Typography>
                            </Box>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    Start Date
                                </Typography>
                                <Typography variant="body1">
                                    {selectedAnnouncement?.startDate ? new Date(selectedAnnouncement.startDate).toLocaleDateString() : 'N/A'}
                                </Typography>
                            </Box>
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    End Date
                                </Typography>
                                <Typography variant="body1">
                                    {selectedAnnouncement?.endDate ? new Date(selectedAnnouncement.endDate).toLocaleDateString() : 'N/A'}
                                </Typography>
                            </Box>
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseViewDialog}>Close</Button>
                </DialogActions>
            </Dialog>

            <ConfirmDialog
                open={openConfirm}
                title="Delete Announcement"
                message={`Are you sure you want to delete "${selectedAnnouncement?.title}"?`}
                onConfirm={handleDelete}
                onCancel={() => {
                    setOpenConfirm(false);
                    setSelectedAnnouncement(null);
                }}
            />
        </Box>
    );
};

export default AnnouncementsPage;