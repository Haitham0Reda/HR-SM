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

    const columns = [
        { field: 'title', headerName: 'Title', width: 250 },
        { field: 'content', headerName: 'Content', width: 350 },
        {
            field: 'priority',
            headerName: 'Priority',
            width: 120,
            renderCell: (params) => (
                <Chip
                    label={params.row.priority}
                    color={getPriorityColor(params.row.priority)}
                    size="small"
                />
            )
        },
        {
            field: 'targetAudience',
            headerName: 'Audience',
            width: 120,
            renderCell: (params) => (
                <Chip label={params.row.targetAudience} size="small" variant="outlined" />
            )
        },
        {
            field: 'isActive',
            headerName: 'Status',
            width: 100,
            renderCell: (params) => (
                <Chip
                    label={params.row.isActive ? 'Active' : 'Inactive'}
                    color={params.row.isActive ? 'success' : 'default'}
                    size="small"
                />
            )
        },
        {
            field: 'createdAt',
            headerName: 'Created',
            width: 120,
            renderCell: (params) => new Date(params.row.createdAt).toLocaleDateString()
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
                            setSelectedAnnouncement(params.row);
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
                <Typography variant="h4">Announcements</Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                >
                    New Announcement
                </Button>
            </Box>

            <DataTable
                rows={announcements}
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
