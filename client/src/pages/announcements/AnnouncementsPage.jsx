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
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Visibility as ViewIcon } from '@mui/icons-material';
import Loading from '../../components/common/Loading';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useNotification } from '../../context/NotificationContext';
import announcementService from '../../services/announcement.service';

const AnnouncementsPage = () => {
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [viewDialogOpen, setViewDialogOpen] = useState(false);
    const [openConfirm, setOpenConfirm] = useState(false);
    const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
    const [viewAnnouncement, setViewAnnouncement] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        priority: 'normal',
        targetAudience: 'all',
        isActive: true
    });
    const { showNotification } = useNotification();

    const priorities = ['low', 'normal', 'high', 'urgent'];
    const audiences = ['all', 'employees', 'hr', 'admin'];

    useEffect(() => {
        fetchAnnouncements();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchAnnouncements = async () => {
        try {
            setLoading(true);
            const data = await announcementService.getAll();
            setAnnouncements(data);
        } catch (error) {
            showNotification('Failed to fetch announcements', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (announcement = null) => {
        if (announcement) {
            setSelectedAnnouncement(announcement);
            setFormData({
                title: announcement.title || '',
                content: announcement.content || '',
                priority: announcement.priority || 'normal',
                targetAudience: announcement.targetAudience || 'all',
                isActive: announcement.isActive !== false
            });
        } else {
            setSelectedAnnouncement(null);
            setFormData({
                title: '',
                content: '',
                priority: 'normal',
                targetAudience: 'all',
                isActive: true
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
            low: 'default',
            normal: 'info',
            high: 'warning',
            urgent: 'error'
        };
        return colors[priority] || 'default';
    };

    if (loading) return <Loading />;

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">Announcements</Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                >
                    New Announcement
                </Button>
            </Box>

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
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleSubmit} variant="contained">
                        {selectedAnnouncement ? 'Update' : 'Create'}
                    </Button>
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