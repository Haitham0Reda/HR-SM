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
    Grid,
    CircularProgress
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Download as DownloadIcon,
    Visibility as VisibilityIcon,
    Lock as LockIcon,
    LockOpen as LockOpenIcon,
    Description as DescriptionIcon,
    CloudUpload as UploadIcon,
    AttachFile as AttachFileIcon,
    Clear as ClearIcon
} from '@mui/icons-material';
import Loading from '../../components/common/Loading';
import DateInput from '../../components/common/DateInput';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import DocumentViewer from '../../components/common/DocumentViewer';
import { useNotification } from '../../store/providers/ReduxNotificationProvider';
import { useAuth } from '../../store/providers/ReduxAuthProvider';
import documentService from '../../services/document.service';
import userService from '../../services/user.service';
import { formatFileSize } from '../../utils/formatters';

const DocumentsPage = () => {
    const { user, isHR, isAdmin } = useAuth();
    const [documents, setDocuments] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [openConfirm, setOpenConfirm] = useState(false);
    const [openViewer, setOpenViewer] = useState(false);
    const [selectedDocument, setSelectedDocument] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
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
            console.log('Current user:', user);
            console.log('Can manage:', canManage);

            const response = await documentService.getAll();
            console.log('Documents received:', response);

            // Extract the actual data array from the response
            const data = response.data || response;
            console.log('Extracted data:', data);
            console.log('Data is array:', Array.isArray(data));
            console.log('Data length:', data?.length);

            // Filter to show only current user's documents if not HR/Admin
            let filteredData = Array.isArray(data) ? data : [];
            if (!canManage) {
                console.log('Filtering for non-admin user:', user?._id);
                console.log('Documents before filtering:', filteredData.map(doc => ({
                    id: doc._id,
                    title: doc.title,
                    employee: doc.employee,
                    uploadedBy: doc.uploadedBy
                })));

                filteredData = filteredData.filter(doc => {
                    const docUserId = doc.employee?._id || doc.employee;
                    const currentUserId = user?._id;
                    const isAssignedToUser = docUserId === currentUserId || String(docUserId) === String(currentUserId);
                    const isUploadedByUser = doc.uploadedBy?._id === currentUserId || doc.uploadedBy === currentUserId;
                    const isPublic = !docUserId;

                    console.log('Document filter check:', {
                        docId: doc._id,
                        title: doc.title,
                        docUserId,
                        currentUserId,
                        isAssignedToUser,
                        isUploadedByUser,
                        isPublic,
                        shouldShow: isAssignedToUser || isUploadedByUser || isPublic
                    });

                    // Show documents assigned to user, uploaded by user, or public documents (no employee assigned)
                    return isAssignedToUser || isUploadedByUser || isPublic;
                });
                console.log('Filtered documents:', filteredData.length);
            }

            console.log('Setting documents:', filteredData);
            setDocuments(filteredData);
        } catch (error) {
            console.error('Error fetching documents:', error);
            showNotification(error.message || 'Failed to fetch documents', 'error');
            setDocuments([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const data = await userService.getAll();
            // Handle both array response and object with data property
            const usersArray = Array.isArray(data) ? data : (data?.data || []);
            setUsers(usersArray);
        } catch (error) {
            console.error('Error fetching users:', error);
            setUsers([]); // Set empty array on error to prevent map error
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
        setSelectedFile(null);
        setUploading(false);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            showNotification('File size must be less than 10MB', 'error');
            return;
        }

        // Validate file type
        const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'image/jpeg',
            'image/png',
            'image/jpg',
            'text/plain'
        ];

        if (!allowedTypes.includes(file.type)) {
            showNotification('Please select a valid file type (PDF, DOC, DOCX, JPG, PNG, TXT)', 'error');
            return;
        }

        setSelectedFile(file);

        // Auto-fill file name if title is empty
        if (!formData.title) {
            const fileName = file.name.split('.').slice(0, -1).join('.');
            setFormData(prev => ({
                ...prev,
                title: fileName,
                fileName: file.name,
                fileSize: file.size
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                fileName: file.name,
                fileSize: file.size
            }));
        }
    };

    const handleRemoveFile = () => {
        setSelectedFile(null);
        setFormData(prev => ({
            ...prev,
            fileName: '',
            fileSize: 0
        }));
    };

    const handleSubmit = async () => {
        try {
            setUploading(true);

            let finalFormData = { ...formData };

            // If we have a selected file, we need to upload it first
            if (selectedFile) {
                console.log('Uploading file:', selectedFile.name);

                try {
                    // Create FormData for file upload
                    const uploadFormData = new FormData();
                    uploadFormData.append('file', selectedFile);

                    // Upload file using the document service
                    const uploadResult = await documentService.upload(uploadFormData);
                    console.log('Upload result:', uploadResult);

                    if (uploadResult && uploadResult.data && uploadResult.data.fileUrl) {
                        finalFormData.fileUrl = uploadResult.data.fileUrl;
                    } else {
                        throw new Error('Upload failed - no file URL returned');
                    }
                } catch (uploadError) {
                    console.error('File upload error:', uploadError);

                    // For now, show an error and let user enter URL manually
                    showNotification('File upload is not available. Please enter the file URL manually.', 'warning');
                    return; // Don't proceed with document creation
                }
            }

            // Validate that we have either a file URL or this is an edit
            if (!finalFormData.fileUrl && !selectedDocument) {
                showNotification('Please select a file or enter a file URL', 'error');
                return;
            }

            console.log('Creating/updating document with data:', finalFormData);

            if (selectedDocument) {
                const result = await documentService.update(selectedDocument._id, finalFormData);
                console.log('Document updated:', result);
                showNotification('Document updated successfully', 'success');
            } else {
                const result = await documentService.create(finalFormData);
                console.log('Document created:', result);
                showNotification('Document created successfully', 'success');
            }
            handleCloseDialog();

            // Refresh the documents list
            console.log('Refreshing documents list...');
            await fetchDocuments();
        } catch (error) {
            console.error('Error submitting document:', error);
            showNotification(error.message || 'Operation failed', 'error');
        } finally {
            setUploading(false);
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
                                        sx={{
                                            flex: 1,
                                            px: 3,
                                            py: 1
                                        }}
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
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 2,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
                    }
                }}
            >
                <DialogTitle sx={{
                    pb: 1,
                    pt: 2,
                    fontWeight: 600,
                    color: 'primary.main',
                    borderBottom: `1px solid`,
                    borderColor: 'divider'
                }}>
                    {selectedDocument ? 'Edit Document' : 'Upload Document'}
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
                        {/* File Upload Section */}
                        {!selectedDocument && (
                            <>
                                <Box sx={{
                                    border: `2px dashed`,
                                    borderColor: selectedFile ? 'success.main' : 'divider',
                                    borderRadius: 2,
                                    p: 3,
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    bgcolor: selectedFile ? 'success.lighter' : 'background.default',
                                    '&:hover': {
                                        borderColor: 'primary.main',
                                        bgcolor: selectedFile ? 'success.lighter' : 'action.hover'
                                    }
                                }}>
                                    <input
                                        type="file"
                                        id="document-file-upload"
                                        style={{ display: 'none' }}
                                        onChange={handleFileSelect}
                                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                                    />
                                    <label htmlFor="document-file-upload" style={{ cursor: 'pointer', width: '100%', display: 'block' }}>
                                        {selectedFile ? (
                                            <>
                                                <AttachFileIcon sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
                                                <Typography variant="h6" sx={{ color: 'success.main', mb: 1, fontWeight: 600 }}>
                                                    {selectedFile.name}
                                                </Typography>
                                                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                                                    Size: {formatFileSize(selectedFile.size)}
                                                </Typography>
                                                <Button
                                                    size="small"
                                                    startIcon={<ClearIcon />}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handleRemoveFile();
                                                    }}
                                                    sx={{ mt: 1, textTransform: 'none' }}
                                                >
                                                    Remove file
                                                </Button>
                                            </>
                                        ) : (
                                            <>
                                                <UploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                                                <Typography variant="h6" sx={{ color: 'primary.main', mb: 1, fontWeight: 600 }}>
                                                    Click to select file
                                                </Typography>
                                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                                    Supported formats: PDF, DOC, DOCX, JPG, PNG, TXT (Max 10MB)
                                                </Typography>
                                            </>
                                        )}
                                    </label>
                                </Box>

                                {/* OR Divider */}
                                <Box sx={{ display: 'flex', alignItems: 'center', my: 2 }}>
                                    <Box sx={{ flex: 1, height: '1px', bgcolor: 'divider' }} />
                                    <Typography variant="body2" sx={{ px: 2, color: 'text.secondary' }}>
                                        OR
                                    </Typography>
                                    <Box sx={{ flex: 1, height: '1px', bgcolor: 'divider' }} />
                                </Box>
                            </>
                        )}

                        {/* Show file URL field for editing or if no file is selected */}
                        <TextField
                            label="File URL"
                            name="fileUrl"
                            value={formData.fileUrl}
                            onChange={handleChange}
                            placeholder="https://example.com/document.pdf"
                            required={!selectedFile && !selectedDocument}
                            fullWidth
                            helperText={selectedFile ? "File will be uploaded automatically" : "Enter the URL of the document"}
                            disabled={!!selectedFile}
                        />

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
                                {Array.isArray(users) && users.map((user) => (
                                    <MenuItem key={user._id} value={user._id}>
                                        {user.name} - {user.email}
                                    </MenuItem>
                                ))}
                            </TextField>
                        )}

                        <DateInput
                            label="Expiry Date (Optional)"
                            name="expiryDate"
                            value={formData.expiryDate}
                            onChange={handleChange}
                            fullWidth
                            slotProps={{ inputLabel: { shrink: true } }}
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
                <DialogActions sx={{ p: 2 }}>
                    <Button
                        onClick={handleCloseDialog}
                        variant="outlined"
                        disabled={uploading}
                        sx={{
                            minWidth: 100,
                            borderRadius: 1,
                            textTransform: 'none'
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        variant="contained"
                        color="primary"
                        disabled={uploading || (!selectedFile && !formData.fileUrl && !selectedDocument)}
                        startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : null}
                        sx={{
                            minWidth: 100,
                            borderRadius: 1,
                            textTransform: 'none',
                            fontWeight: 600
                        }}
                    >
                        {uploading ? 'Uploading...' : (selectedDocument ? 'Update' : 'Upload')}
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


