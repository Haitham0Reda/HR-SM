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
    MenuItem
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import DataTable from '../../components/common/DataTable';
import Loading from '../../components/common/Loading';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext'; // Added import
import announcementService from '../../services/announcement.service';

const AnnouncementsPage = () => {
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [openConfirm, setOpenConfirm] = useState(false);
    const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        priority: 'medium',
        targetAudience: 'all',
        isActive: true
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

    const handleOpenDialog = (announcement = null) => {
        if (announcement) {
            setSelectedAnnouncement(announcement);
            setFormData({
                title: announcement.title || '',
                content: announcement.content || '',
                priority: announcement.priority || 'medium',
                targetAudience: announcement.targetAudience || 'all',
                isActive: announcement.isActive !== false
            });
        } else {
            setSelectedAnnouncement(null);
            setFormData({
                title: '',
                content: '',
                priority: 'medium',
                targetAudience: 'all',
                isActive: true
            });
        }
        setOpenDialog(true);
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

    const createTestAnnouncement = async () => {
        try {
            const testData = {
                title: 'Test Announcement',
                content: 'This is a test announcement created for debugging purposes',
                priority: 'medium',
                targetAudience: 'all',
                isActive: true
            };
            
            console.log('Creating test announcement:', testData);
            const response = await announcementService.create(testData);
            console.log('Test announcement created:', response);
            showNotification('Test announcement created successfully', 'success');
            fetchAnnouncements(); // Refresh the list
        } catch (error) {
            console.error('Error creating test announcement:', error);
            showNotification('Failed to create test announcement: ' + error.message, 'error');
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

    const columns = [
        { field: 'title', headerName: 'Title', width: 250 },
        { field: 'content', headerName: 'Content', width: 350 },
        {
            field: 'priority',
            headerName: 'Priority',
            width: 120,
            renderCell: (params) => {
                try {
                    // Add null check
                    if (!params || !params.row) return null;
                    const priority = params.row.priority || 'medium';
                    
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
                            color={getPriorityColor(priority)}
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
                    console.error('Params:', params);
                    return null;
                }
            }
        },
        {
            field: 'targetAudience',
            headerName: 'Audience',
            width: 120,
            renderCell: (params) => {
                try {
                    // Add null check
                    if (!params || !params.row) return null;
                    const audience = params.row.targetAudience || 'all';
                    return (
                        <Chip label={audience} size="small" variant="outlined" />
                    );
                } catch (error) {
                    console.error('Error rendering targetAudience cell:', error);
                    console.error('Params:', params);
                    return null;
                }
            }
        },
        {
            field: 'isActive',
            headerName: 'Status',
            width: 100,
            renderCell: (params) => {
                try {
                    // Add null check
                    if (!params || !params.row) return null;
                    const isActive = params.row.isActive !== undefined ? params.row.isActive : true;
                    return (
                        <Chip
                            label={isActive ? 'Active' : 'Inactive'}
                            color={isActive ? 'success' : 'default'}
                            size="small"
                        />
                    );
                } catch (error) {
                    console.error('Error rendering isActive cell:', error);
                    console.error('Params:', params);
                    return null;
                }
            }
        },
        {
            field: 'createdAt',
            headerName: 'Created',
            width: 120,
            renderCell: (params) => {
                try {
                    // Add null check
                    if (!params || !params.row || !params.row.createdAt) return 'N/A';
                    try {
                        return new Date(params.row.createdAt).toLocaleDateString();
                    } catch (e) {
                        return 'N/A';
                    }
                } catch (error) {
                    console.error('Error rendering createdAt cell:', error);
                    console.error('Params:', params);
                    return 'N/A';
                }
            }
        },
        {
            field: 'actions',
            headerName: 'Actions',
            width: 120,
            renderCell: (params) => {
                try {
                    // Add null check
                    if (!params || !params.row) return null;
                    return (
                        <Box>
                            <IconButton
                                size="small"
                                onClick={() => handleOpenDialog(params.row)}
                                color="primary"
                                disabled={!user || (user.role !== 'hr' && user.role !== 'admin')}
                            >
                                <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                                size="small"
                                onClick={() => {
                                    setSelectedAnnouncement(params.row);
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
                    console.error('Params:', params);
                    return null;
                }
            }
        }
    ];

    if (loading) return <Loading />;

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">Announcements</Typography>
                <Box>
                    <Button
                        variant="outlined"
                        onClick={createTestAnnouncement}
                        sx={{ mr: 2 }}
                    >
                        Create Test
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => handleOpenDialog()}
                        disabled={!user || (user.role !== 'hr' && user.role !== 'admin')}
                    >
                        New Announcement
                    </Button>
                </Box>
            </Box>

            <DataTable
                data={announcements}
                columns={columns}
                getRowId={(row) => row._id}
            />

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
