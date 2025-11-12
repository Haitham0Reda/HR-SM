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
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Download as DownloadIcon,
    Visibility as VisibilityIcon,
    Lock as LockIcon,
    LockOpen as LockOpenIcon
} from '@mui/icons-material';
import DataTable from '../../components/common/DataTable';
import Loading from '../../components/common/Loading';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import DocumentViewer from '../../components/common/DocumentViewer';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import documentService from '../../services/document.service';
import userService from '../../services/user.service';

const DocumentsPage = () => {
    const { user, isHR, isAdmin } = useAuth();
    const [documents, setDocuments] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [openConfirm, setOpenConfirm] = useState(false);
    const [openViewer, setOpenViewer] = useState(false);
    const [selectedDocument, setSelectedDocument] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        arabicTitle: '',
        type: 'contract',
        employee: '',
        fileUrl: '',
        fileName: '',
        fileSize: 0,
        expiryDate: '',
        isConfidential: false
    });
    const { showNotification } = useNotification();

    // Valid document types from backend model
    const documentTypes = [
        { value: 'contract', label: 'Contract' },
        { value: 'national-id', label: 'National ID' },
        { value: 'certificate', label: 'Certificate' },
        { value: 'offer-letter', label: 'Offer Letter' },
        { value: 'birth-certificate', label: 'Birth Certificate' },
        { value: 'other', label: 'Other' }
    ];

    const canManage = isHR || isAdmin;

    useEffect(() => {
        fetchDocuments();
        if (canManage) {
            fetchUsers();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchDocuments = async () => {
        try {
            setLoading(true);
            console.log('Current user:', user);
            console.log('User role:', user?.role);
            console.log('Is HR/Admin:', canManage);
            console.log('Fetching documents from API...');
            const data = await documentService.getAll();
            console.log('API Response:', data);
            console.log('Is Array?', Array.isArray(data));
            console.log('Document count:', data?.length);
            if (data && data.length > 0) {
                console.log('First document:', data[0]);
            }

            // Filter to show only current user's documents if not HR/Admin
            let filteredData = Array.isArray(data) ? data : [];
            if (!canManage) {
                filteredData = filteredData.filter(doc => {
                    const docUserId = doc.employee?._id || doc.employee;
                    const currentUserId = user?._id;
                    // Show documents assigned to user or public documents (no employee assigned)
                    return !docUserId || docUserId === currentUserId || String(docUserId) === String(currentUserId);
                });
            }

            setDocuments(filteredData);
        } catch (error) {
            console.error('Error fetching documents:', error);
            console.error('Error type:', typeof error);
            console.error('Error message:', error?.message || error);
            showNotification(typeof error === 'string' ? error : 'Failed to fetch documents', 'error');
            setDocuments([]);
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
                arabicTitle: document.arabicTitle || '',
                type: document.type || 'contract',
                employee: document.employee?._id || document.employee || '',
                fileUrl: document.fileUrl || '',
                fileName: document.fileName || '',
                fileSize: document.fileSize || 0,
                expiryDate: document.expiryDate ? new Date(document.expiryDate).toISOString().split('T')[0] : '',
                isConfidential: document.isConfidential || false
            });
        } else {
            setSelectedDocument(null);
            setFormData({
                title: '',
                arabicTitle: '',
                type: 'contract',
                employee: canManage ? '' : user?._id || '',
                fileUrl: '',
                fileName: '',
                fileSize: 0,
                expiryDate: '',
                isConfidential: false
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
            console.log('Submitting document:', formData);
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
            console.error('Submit error:', error);
            showNotification(typeof error === 'string' ? error : 'Operation failed', 'error');
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
            showNotification(typeof error === 'string' ? error : 'Delete failed', 'error');
        }
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return 'N/A';
        const mb = bytes / (1024 * 1024);
        return mb < 1 ? `${(bytes / 1024).toFixed(2)} KB` : `${mb.toFixed(2)} MB`;
    };

    const handleViewDocument = (doc) => {
        setSelectedDocument(doc);
        setOpenViewer(true);
    };

    const handleDownload = (doc) => {
        const link = document.createElement('a');
        link.href = doc.fileUrl;
        link.download = doc.fileName || doc.title;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showNotification('Download started', 'success');
    };

    const columns = [
        {
            field: 'title',
            headerName: 'Document Title',
            renderCell: (row) => (
                <Box>
                    <Typography variant="body2" fontWeight="600">
                        {row.title}
                    </Typography>
                    {row.arabicTitle && (
                        <Typography variant="caption" color="text.secondary">
                            {row.arabicTitle}
                        </Typography>
                    )}
                </Box>
            )
        },
        {
            field: 'type',
            headerName: 'Type',
            renderCell: (row) => (
                <Chip
                    label={row.type ? row.type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'N/A'}
                    size="small"
                    variant="outlined"
                    color="primary"
                />
            )
        },
        {
            field: 'fileSize',
            headerName: 'Size',
            renderCell: (row) => formatFileSize(row.fileSize)
        },
        {
            field: 'isConfidential',
            headerName: 'Access',
            renderCell: (row) => (
                <Chip
                    icon={row.isConfidential ? <LockIcon /> : <LockOpenIcon />}
                    label={row.isConfidential ? 'Confidential' : 'Public'}
                    color={row.isConfidential ? 'error' : 'success'}
                    size="small"
                />
            )
        },
        {
            field: 'createdAt',
            headerName: 'Uploaded',
            renderCell: (row) => new Date(row.createdAt).toLocaleDateString()
        },
        {
            field: 'actions',
            headerName: 'Actions',
            renderCell: (row) => (
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <IconButton
                        size="small"
                        onClick={() => handleViewDocument(row)}
                        color="primary"
                        title="View"
                    >
                        <VisibilityIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                        size="small"
                        onClick={() => handleDownload(row)}
                        color="success"
                        title="Download"
                    >
                        <DownloadIcon fontSize="small" />
                    </IconButton>
                    {canManage && (
                        <>
                            <IconButton
                                size="small"
                                onClick={() => handleOpenDialog(row)}
                                color="primary"
                                title="Edit"
                            >
                                <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                                size="small"
                                onClick={() => {
                                    setSelectedDocument(row);
                                    setOpenConfirm(true);
                                }}
                                color="error"
                                title="Delete"
                            >
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </>
                    )}
                </Box>
            )
        }
    ];

    if (loading) return <Loading />;

    return (
        <Box sx={{
            p: 3,
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            gap: 3
        }}>
            {/* Header Section */}
            <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 2
            }}>
                <Typography variant="h4" fontWeight="600">
                    My Documents
                </Typography>
                {canManage && (
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => handleOpenDialog()}
                        sx={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            fontWeight: 600,
                            '&:hover': {
                                background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)'
                            }
                        }}
                    >
                        Upload Document
                    </Button>
                )}
            </Box>

            {/* Table Container */}
            <Box sx={{
                bgcolor: 'background.paper',
                borderRadius: 2,
                boxShadow: 2,
                overflow: 'hidden',
                border: '1px solid',
                borderColor: 'divider'
            }}>
                {documents.length === 0 ? (
                    <Box sx={{
                        textAlign: 'center',
                        py: 12,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 2
                    }}>
                        <Box sx={{
                            width: 80,
                            height: 80,
                            borderRadius: '50%',
                            bgcolor: 'grey.100',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mb: 2
                        }}>
                            <Typography variant="h2">📄</Typography>
                        </Box>
                        <Typography variant="h6" color="text.secondary" fontWeight="600">
                            No documents found
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Your documents will appear here once uploaded
                        </Typography>
                    </Box>
                ) : (
                    <DataTable
                        data={documents}
                        columns={columns}
                    />
                )}
            </Box>

            <Dialog
                open={openDialog}
                onClose={handleCloseDialog}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
                    }
                }}
            >
                <DialogTitle sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '1.3rem',
                    py: 2.5
                }}>
                    {selectedDocument ? '✏️ Edit Document' : '📤 Upload Document'}
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    <Box sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2.5,
                        '& .MuiTextField-root': {
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 2,
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                                },
                                '&.Mui-focused': {
                                    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.15)'
                                }
                            }
                        }
                    }}>
                        <TextField
                            label="Title"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            required
                            fullWidth
                        />
                        <TextField
                            label="Arabic Title (Optional)"
                            name="arabicTitle"
                            value={formData.arabicTitle}
                            onChange={handleChange}
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
                                <MenuItem key={type.value} value={type.value}>
                                    {type.label}
                                </MenuItem>
                            ))}
                        </TextField>
                        {canManage && (
                            <TextField
                                select
                                label="Assign to Employee"
                                name="employee"
                                value={formData.employee}
                                onChange={handleChange}
                                fullWidth
                            >
                                <MenuItem value="">None</MenuItem>
                                {users.map((user) => (
                                    <MenuItem key={user._id} value={user._id}>
                                        {user.name} - {user.email}
                                    </MenuItem>
                                ))}
                            </TextField>
                        )}
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
                            label="File Name"
                            name="fileName"
                            value={formData.fileName}
                            onChange={handleChange}
                            placeholder="document.pdf"
                            fullWidth
                        />
                        <TextField
                            label="File Size (bytes)"
                            name="fileSize"
                            type="number"
                            value={formData.fileSize}
                            onChange={handleChange}
                            fullWidth
                            helperText="File size in bytes"
                        />
                        <TextField
                            label="Expiry Date (Optional)"
                            name="expiryDate"
                            type="date"
                            value={formData.expiryDate}
                            onChange={handleChange}
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                        />
                        <TextField
                            select
                            label="Confidentiality"
                            name="isConfidential"
                            value={formData.isConfidential}
                            onChange={(e) => setFormData(prev => ({ ...prev, isConfidential: e.target.value === 'true' }))}
                            fullWidth
                        >
                            <MenuItem value="false">Public (All users can view)</MenuItem>
                            <MenuItem value="true">Confidential (Restricted access)</MenuItem>
                        </TextField>
                    </Box>
                </DialogContent>
                <DialogActions sx={{
                    px: 3,
                    py: 2.5,
                    gap: 1.5,
                    borderTop: '2px solid',
                    borderColor: 'divider',
                    bgcolor: 'grey.50'
                }}>
                    <Button
                        onClick={handleCloseDialog}
                        variant="outlined"
                        sx={{
                            minWidth: 120,
                            borderRadius: 2,
                            borderWidth: 2,
                            fontWeight: 600,
                            '&:hover': {
                                borderWidth: 2
                            }
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        variant="contained"
                        sx={{
                            minWidth: 120,
                            borderRadius: 2,
                            fontWeight: 700,
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
                            '&:hover': {
                                background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                                boxShadow: '0 6px 16px rgba(102, 126, 234, 0.5)',
                                transform: 'translateY(-1px)'
                            },
                            transition: 'all 0.3s ease'
                        }}
                    >
                        {selectedDocument ? '✓ Update' : '✓ Upload'}
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

            <DocumentViewer
                open={openViewer}
                onClose={() => setOpenViewer(false)}
                document={selectedDocument}
            />
        </Box>
    );
};

export default DocumentsPage;
