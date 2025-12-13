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
    Grid
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Download as DownloadIcon,
    Visibility as VisibilityIcon,
    Lock as LockIcon,
    LockOpen as LockOpenIcon,
    Description as DescriptionIcon
} from '@mui/icons-material';
import Loading from '../../components/common/Loading';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import DocumentViewer from '../../components/common/DocumentViewer';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
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
            console.log('Fetching documents...');
            const data = await documentService.getAll();
            console.log('Documents received:', data);
            console.log('Data is array:', Array.isArray(data));
            console.log('Data length:', data?.length);

            // Filter to show only current user's documents if not HR/Admin
            let filteredData = Array.isArray(data) ? data : [];
            if (!canManage) {
                console.log('Filtering for non-admin user:', user?._id);
                filteredData = filteredData.filter(doc => {
                    const docUserId = doc.employee?._id || doc.employee;
                    const currentUserId = user?._id;
                    // Show documents assigned to user or public documents (no employee assigned)
                    return !docUserId || docUserId === currentUserId || String(docUserId) === String(currentUserId);
                });
                console.log('Filtered documents:', filteredData.length);
            }

            console.log('Setting documents:', filteredData);
            setDocuments(filteredData);
        } catch (error) {
            console.error('Error fetching documents:', error);
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
            console.error('Error fetching users:', error);
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
            console.error('Error submitting document:', error);
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

    const getDocumentTypeLabel = (type) => {
        return type ? type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'N/A';
    };

    if (loading) return <Loading />;

    return (
        <Box sx={{
            p: 3,
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            maxWidth: '1400px',
            mx: 'auto',
            width: '100%'
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
                        color="primary"
                        startIcon={<AddIcon />}
                        onClick={() => handleOpenDialog()}
                        sx={{
                            fontWeight: 600
                        }}
                    >
                        Upload Document
                    </Button>
                )}
            </Box>

            {/* Documents Grid */}
            {documents.length === 0 ? (
                <Box sx={{
                    textAlign: 'center',
                    py: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 2,
                    bgcolor: 'background.paper',
                    borderRadius: 2,
                    boxShadow: 2,
                    border: '1px solid',
                    borderColor: 'divider'
                }}>
                    <Box sx={{
                        width: 80,
                        height: 80,
                        borderRadius: '50%',
                        bgcolor: 'action.hover',
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
                <Grid container spacing={3}>
                    {documents.map((doc) => (
                        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={doc._id}>
                            <Card
                                elevation={0}
                                sx={{
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    borderRadius: 2.5,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        transform: 'translateY(-4px)',
                                        boxShadow: 3,
                                        borderColor: 'primary.main'
                                    }
                                }}
                            >
                                <CardContent sx={{ flexGrow: 1, pb: 1, p: 3 }}>
                                    {/* Document Icon */}
                                    <Box sx={{
                                        display: 'flex',
                                        justifyContent: 'center',
                                        mb: 2
                                    }}>
                                        <Box sx={{
                                            width: 64,
                                            height: 64,
                                            borderRadius: 2,
                                            bgcolor: (theme) => `${theme.palette.primary.main}15`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'primary.main'
                                        }}>
                                            <DescriptionIcon sx={{ fontSize: 36 }} />
                                        </Box>
                                    </Box>

                                    {/* Title */}
                                    <Typography
                                        variant="h6"
                                        fontWeight="600"
                                        gutterBottom
                                        sx={{
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                            minHeight: '3.6em',
                                            textAlign: 'center'
                                        }}
                                    >
                                        {doc.title}
                                    </Typography>

                                    {/* Arabic Title */}
                                    {doc.arabicTitle && (
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                            gutterBottom
                                            sx={{
                                                textAlign: 'center',
                                                mb: 2
                                            }}
                                        >
                                            {doc.arabicTitle}
                                        </Typography>
                                    )}

                                    {/* Document Info */}
                                    <Box sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 1.5,
                                        mt: 2
                                    }}>
                                        {/* Type */}
                                        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                                            <Chip
                                                label={getDocumentTypeLabel(doc.type)}
                                                size="small"
                                                color="primary"
                                                variant="outlined"
                                            />
                                        </Box>

                                        {/* Confidentiality */}
                                        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                                            <Chip
                                                icon={doc.isConfidential ? <LockIcon /> : <LockOpenIcon />}
                                                label={doc.isConfidential ? 'Confidential' : 'Public'}
                                                color={doc.isConfidential ? 'error' : 'success'}
                                                size="small"
                                            />
                                        </Box>

                                        {/* File Size & Date */}
                                        <Box sx={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            mt: 1,
                                            pt: 1.5,
                                            borderTop: '1px solid',
                                            borderColor: 'divider'
                                        }}>
                                            <Typography variant="caption" color="text.secondary">
                                                {formatFileSize(doc.fileSize)}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {new Date(doc.createdAt).toLocaleDateString()}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </CardContent>

                                {/* Action Buttons */}
                                <CardActions sx={{
                                    justifyContent: 'center',
                                    gap: 1,
                                    p: 2,
                                    pt: 1.5,
                                    bgcolor: 'action.hover'
                                }}>
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        onClick={() => handleViewDocument(doc)}
                                        color="primary"
                                        startIcon={<VisibilityIcon />}
                                        sx={{ flex: 1 }}
                                    >
                                        View
                                    </Button>
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        onClick={() => handleDownload(doc)}
                                        color="success"
                                        startIcon={<DownloadIcon />}
                                        sx={{ flex: 1 }}
                                    >
                                        Download
                                    </Button>
                                    {canManage && (
                                        <>
                                            <IconButton
                                                size="small"
                                                onClick={() => handleOpenDialog(doc)}
                                                color="primary"
                                                title="Edit"
                                                sx={{
                                                    border: '1px solid',
                                                    borderColor: 'primary.main',
                                                    '&:hover': {
                                                        bgcolor: 'primary.main',
                                                        color: 'primary.contrastText'
                                                    }
                                                }}
                                            >
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                onClick={() => {
                                                    setSelectedDocument(doc);
                                                    setOpenConfirm(true);
                                                }}
                                                color="error"
                                                title="Delete"
                                                sx={{
                                                    border: '1px solid',
                                                    borderColor: 'error.main',
                                                    '&:hover': {
                                                        bgcolor: 'error.main',
                                                        color: 'error.contrastText'
                                                    }
                                                }}
                                            >
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </>
                                    )}
                                </CardActions>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}

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
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
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
                    bgcolor: 'action.hover'
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
                        color="primary"
                        sx={{
                            minWidth: 120,
                            borderRadius: 2,
                            fontWeight: 700,
                            '&:hover': {
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
