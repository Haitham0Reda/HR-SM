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
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Download, Visibility } from '@mui/icons-material';
import DataTable from '../../components/common/DataTable';
import Loading from '../../components/common/Loading';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useNotification } from '../../context/NotificationContext';
import documentService from '../../services/document.service';
import userService from '../../services/user.service';

const DocumentsPage = () => {
    const [documents, setDocuments] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [openConfirm, setOpenConfirm] = useState(false);
    const [selectedDocument, setSelectedDocument] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        type: 'contract',
        description: '',
        user: '',
        fileUrl: '',
        isPublic: false
    });
    const { showNotification } = useNotification();

    const documentTypes = ['contract', 'certificate', 'policy', 'form', 'report', 'other'];

    useEffect(() => {
        fetchDocuments();
        fetchUsers();
    }, []);

    const fetchDocuments = async () => {
        try {
            setLoading(true);
            const data = await documentService.getAll();
            setDocuments(data);
        } catch (error) {
            showNotification('Failed to fetch documents', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const data = await userService.getAll();
            setUsers(data);
        } catch (error) {
            console.error('Failed to fetch users:', error);
        }
    };

    const handleOpenDialog = (document = null) => {
        if (document) {
            setSelectedDocument(document);
            setFormData({
                title: document.title || '',
                type: document.type || 'contract',
                description: document.description || '',
                user: document.user?._id || document.user || '',
                fileUrl: document.fileUrl || '',
                isPublic: document.isPublic || false
            });
        } else {
            setSelectedDocument(null);
            setFormData({
                title: '',
                type: 'contract',
                description: '',
                user: '',
                fileUrl: '',
                isPublic: false
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setSelectedDocument(null);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async () => {
        try {
            if (selectedDocument) {
                await documentService.update(selectedDocument._id, formData);
                showNotification('Document updated successfully', 'success');
            } else {
                await documentService.create(formData);
                showNotification('Document created successfully', 'success');
            }
            handleCloseDialog();
            fetchDocuments();
        } catch (error) {
            showNotification(error.response?.data?.message || 'Operation failed', 'error');
        }
    };

    const handleDelete = async () => {
        try {
            await documentService.delete(selectedDocument._id);
            showNotification('Document deleted successfully', 'success');
            setOpenConfirm(false);
            setSelectedDocument(null);
            fetchDocuments();
        } catch (error) {
            showNotification(error.response?.data?.message || 'Delete failed', 'error');
        }
    };

    const columns = [
        { field: 'title', headerName: 'Title', width: 250 },
        {
            field: 'type',
            headerName: 'Type',
            width: 120,
            renderCell: (params) => (
                <Chip label={params.row.type} size="small" variant="outlined" />
            )
        },
        { field: 'description', headerName: 'Description', width: 250 },
        {
            field: 'user',
            headerName: 'Owner',
            width: 180,
            renderCell: (params) => params.row.user?.name || 'Public'
        },
        {
            field: 'isPublic',
            headerName: 'Visibility',
            width: 120,
            renderCell: (params) => (
                <Chip
                    label={params.row.isPublic ? 'Public' : 'Private'}
                    color={params.row.isPublic ? 'success' : 'default'}
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
            width: 150,
            renderCell: (params) => (
                <Box>
                    <IconButton
                        size="small"
                        onClick={() => window.open(params.row.fileUrl, '_blank')}
                        color="primary"
                        title="View"
                    >
                        <Visibility fontSize="small" />
                    </IconButton>
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
                            setSelectedDocument(params.row);
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
                <Typography variant="h4">Documents</Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                >
                    Upload Document
                </Button>
            </Box>

            <DataTable
                rows={documents}
                columns={columns}
                getRowId={(row) => row._id}
            />

            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {selectedDocument ? 'Edit Document' : 'Upload Document'}
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
                            select
                            label="Document Type"
                            name="type"
                            value={formData.type}
                            onChange={handleChange}
                            required
                            fullWidth
                        >
                            {documentTypes.map((type) => (
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
                        <TextField
                            select
                            label="Assign to User (Optional)"
                            name="user"
                            value={formData.user}
                            onChange={handleChange}
                            fullWidth
                        >
                            <MenuItem value="">None (Public)</MenuItem>
                            {users.map((user) => (
                                <MenuItem key={user._id} value={user._id}>
                                    {user.name} - {user.email}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            label="File URL"
                            name="fileUrl"
                            value={formData.fileUrl}
                            onChange={handleChange}
                            placeholder="https://example.com/document.pdf"
                            required
                            fullWidth
                            helperText="Enter the URL of the uploaded document"
                        />
                        <TextField
                            select
                            label="Visibility"
                            name="isPublic"
                            value={formData.isPublic}
                            onChange={(e) => setFormData(prev => ({ ...prev, isPublic: e.target.value === 'true' }))}
                            fullWidth
                        >
                            <MenuItem value="true">Public (All users can view)</MenuItem>
                            <MenuItem value="false">Private (Assigned user only)</MenuItem>
                        </TextField>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleSubmit} variant="contained">
                        {selectedDocument ? 'Update' : 'Upload'}
                    </Button>
                </DialogActions>
            </Dialog>

            <ConfirmDialog
                open={openConfirm}
                title="Delete Document"
                message={`Are you sure you want to delete "${selectedDocument?.title}"?`}
                onConfirm={handleDelete}
                onCancel={() => {
                    setOpenConfirm(false);
                    setSelectedDocument(null);
                }}
            />
        </Box>
    );
};

export default DocumentsPage;
