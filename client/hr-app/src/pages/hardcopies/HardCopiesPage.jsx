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
    FormControl,
    InputLabel,
    Select,
    Card,
    CardContent,
    CardActions,
    Grid,
    useTheme
} from '@mui/material';
import {
    Delete as DeleteIcon,
    Download as DownloadIcon,
    Upload as UploadIcon
} from '@mui/icons-material';
import Loading from '../../components/common/Loading';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useNotification } from '../../store/providers/ReduxNotificationProvider';
import { useAuth } from '../../store/providers/ReduxAuthProvider';
import hardCopyService from '../../services/hardcopy.service';

const HardCopiesPage = () => {
    const theme = useTheme();
    const { user, isHR, isAdmin } = useAuth();

    // Common styles using theme
    const textFieldStyles = {
        '& .MuiOutlinedInput-root': {
            '& fieldset': {
                borderColor: theme.palette.divider
            },
            '&:hover fieldset': {
                borderColor: theme.palette.primary.main
            },
            '&.Mui-focused fieldset': {
                borderColor: theme.palette.primary.main
            }
        },
        '& .MuiInputLabel-root': {
            color: theme.palette.text.secondary
        },
        '& .MuiInputLabel-root.Mui-focused': {
            color: theme.palette.primary.main
        }
    };

    const selectStyles = {
        '& .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.palette.divider
        },
        '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.palette.primary.main
        },
        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.palette.primary.main
        }
    };
    const [hardCopies, setHardCopies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openConfirm, setOpenConfirm] = useState(false);
    const [selectedHardCopy, setSelectedHardCopy] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: 'general'
    });
    const [openUploadDialog, setOpenUploadDialog] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [newCategory, setNewCategory] = useState('');
    const [showAddCategory, setShowAddCategory] = useState(false);
    const { showNotification } = useNotification();

    // Hard copy categories - dynamic list
    const [categories, setCategories] = useState([
        { value: 'general', label: 'General' },
        { value: 'contract', label: 'Contract' },
        { value: 'certificate', label: 'Certificate' },
        { value: 'id-card', label: 'ID Card' },
        { value: 'payroll', label: 'Payroll' },
        { value: 'attendance', label: 'Attendance' },
        { value: 'other', label: 'Other' }
    ]);

    const canManage = isHR || isAdmin;

    useEffect(() => {
        fetchHardCopies();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchHardCopies = async () => {
        try {
            setLoading(true);
            const response = await hardCopyService.getAll();
            console.log('Hardcopies API response:', response);
            
            // Handle the response format: { success: true, data: [...] }
            const hardcopiesData = response.data || response || [];
            console.log('Hardcopies data:', hardcopiesData);
            
            setHardCopies(Array.isArray(hardcopiesData) ? hardcopiesData : []);
        } catch (error) {
            console.error('Error fetching hardcopies:', error);
            showNotification('Failed to fetch hard copies', 'error');
            setHardCopies([]);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddCategory = () => {
        if (newCategory.trim() && !categories.find(cat => cat.value === newCategory.toLowerCase().replace(/\s+/g, '-'))) {
            const categoryValue = newCategory.toLowerCase().replace(/\s+/g, '-');
            const categoryLabel = newCategory.trim();
            
            setCategories(prev => [...prev, { value: categoryValue, label: categoryLabel }]);
            setFormData(prev => ({ ...prev, category: categoryValue }));
            setNewCategory('');
            setShowAddCategory(false);
            showNotification('Category added successfully', 'success');
        } else {
            showNotification('Category already exists or is invalid', 'error');
        }
    };

    const handleDelete = async () => {
        try {
            await hardCopyService.delete(selectedHardCopy._id);
            showNotification('Hard copy deleted successfully', 'success');
            setOpenConfirm(false);
            setSelectedHardCopy(null);
            fetchHardCopies();
        } catch (error) {
            showNotification('Delete failed', 'error');
        }
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return 'N/A';
        const mb = bytes / (1024 * 1024);
        return mb < 1 ? `${(bytes / 1024).toFixed(2)} KB` : `${mb.toFixed(2)} MB`;
    };

    const handleDownload = (hardCopy) => {
        const link = document.createElement('a');
        link.href = hardCopy.fileUrl;
        link.download = hardCopy.fileName || hardCopy.title;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showNotification('Download started', 'success');
    };

    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        if (file) {
            setSelectedFile(file);
            setFormData(prev => ({
                ...prev,
                title: file.name.split('.')[0] // Use filename without extension as default title
            }));
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            showNotification('Please select a file to upload', 'error');
            return;
        }

        if (!formData.title.trim()) {
            showNotification('Please enter a title for the hard copy', 'error');
            return;
        }

        try {
            setUploading(true);
            
            // Create FormData for file upload
            const uploadFormData = new FormData();
            uploadFormData.append('file', selectedFile);
            uploadFormData.append('title', formData.title);
            uploadFormData.append('description', formData.description);
            uploadFormData.append('category', formData.category);

            await hardCopyService.upload(uploadFormData);
            showNotification('Hard copy uploaded successfully', 'success');
            setOpenUploadDialog(false);
            setSelectedFile(null);
            setFormData({
                title: '',
                description: '',
                category: 'general'
            });
            fetchHardCopies();
        } catch (error) {
            console.error('Upload error:', error);
            const errorMessage = error.response?.data?.message || 'Upload failed';
            showNotification(errorMessage, 'error');
        } finally {
            setUploading(false);
        }
    };

    if (loading) return <Loading />;

    return (
        <Box sx={{
            p: 3,
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            backgroundColor: theme.palette.background.default
        }}>
            {/* Header Section */}
            <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 2,
                pb: 1,
                borderBottom: `1px solid ${theme.palette.divider}`
            }}>
                <Typography variant="h4" fontWeight="600" sx={{ color: 'primary.main' }}>
                    Hard Copies
                </Typography>
                {canManage && (
                    <Button
                        variant="contained"
                        startIcon={<UploadIcon />}
                        onClick={() => setOpenUploadDialog(true)}
                        sx={{
                            backgroundColor: theme.palette.primary.main,
                            color: theme.palette.primary.contrastText,
                            fontWeight: 600,
                            '&:hover': {
                                backgroundColor: theme.palette.primary.dark,
                                boxShadow: `0 4px 12px ${theme.palette.action.hover}`
                            }
                        }}
                    >
                        Upload Hard Copy
                    </Button>
                )}
            </Box>

            {/* Cards Container */}
            {hardCopies.length === 0 ? (
                <Box sx={{
                    textAlign: 'center',
                    py: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 2,
                    backgroundColor: theme.palette.background.paper,
                    borderRadius: 2,
                    border: `1px dashed ${theme.palette.divider}`
                }}>
                    <Box sx={{
                        width: 80,
                        height: 80,
                        borderRadius: '50%',
                        backgroundColor: theme.palette.action.hover,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 2
                    }}>
                        <Typography variant="h2">📄</Typography>
                    </Box>
                    <Typography variant="h6" sx={{ color: theme.palette.primary.main, fontWeight: 600 }}>
                        No hard copies found
                    </Typography>
                    <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                        Hard copies will appear here once added
                    </Typography>
                </Box>
            ) : (
                <Grid container spacing={3}>
                    {hardCopies.map((hardCopy) => (
                        <Grid size={{ xs: 12, sm: 4, md: 4 }} key={hardCopy._id}>
                            <Card
                                sx={{
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    boxShadow: theme.shadows[4],
                                    borderRadius: 3,
                                    transition: 'all 0.3s ease',
                                    border: `1px solid ${theme.palette.divider}`,
                                    backgroundColor: theme.palette.background.paper,
                                    '&:hover': {
                                        transform: 'translateY(-6px)',
                                        boxShadow: theme.shadows[12],
                                        borderColor: theme.palette.primary.main
                                    },
                                    width: '100%',
                                    maxWidth: 300,
                                    margin: '0 auto'
                                }}
                            >
                                <CardContent sx={{
                                    flexGrow: 1,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    p: 2.5
                                }}>
                                    <Box sx={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'flex-start',
                                        mb: 2
                                    }}>
                                        <Typography variant="h6" fontWeight="600" noWrap sx={{ color: theme.palette.primary.main }}>
                                            {hardCopy.title}
                                        </Typography>
                                    </Box>

                                    {hardCopy.description && (
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                color: theme.palette.text.secondary,
                                                mb: 2,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                display: '-webkit-box',
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: 'vertical'
                                            }}
                                        >
                                            {hardCopy.description}
                                        </Typography>
                                    )}

                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                                        <Chip
                                            label={hardCopy.category ? hardCopy.category.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'N/A'}
                                            size="small"
                                            variant="filled"
                                            sx={{
                                                fontWeight: 500,
                                                fontSize: '0.75rem',
                                                height: 24,
                                                borderRadius: 1.5,
                                                backgroundColor: theme.palette.primary.main,
                                                color: theme.palette.primary.contrastText
                                            }}
                                        />
                                    </Box>

                                    <Box sx={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        mt: 2,
                                        pt: 1.5,
                                        borderTop: `1px solid ${theme.palette.divider}`
                                    }}>
                                        <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                                            Size: {formatFileSize(hardCopy.fileSize)}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                                            By: {hardCopy.uploadedBy ? 
                                                `${hardCopy.uploadedBy.firstName} ${hardCopy.uploadedBy.lastName}` : 
                                                'N/A'}
                                        </Typography>
                                    </Box>
                                </CardContent>

                                <CardActions sx={{
                                    justifyContent: 'flex-end',
                                    px: 2,
                                    pb: 2
                                }}>
                                    <IconButton
                                        size="small"
                                        onClick={() => handleDownload(hardCopy)}
                                        sx={{
                                            color: theme.palette.success.main,
                                            '&:hover': {
                                                backgroundColor: theme.palette.action.hover
                                            }
                                        }}
                                        title="Download"
                                    >
                                        <DownloadIcon fontSize="small" />
                                    </IconButton>
                                    {canManage && (
                                        <IconButton
                                            size="small"
                                            onClick={() => {
                                                setSelectedHardCopy(hardCopy);
                                                setOpenConfirm(true);
                                            }}
                                            sx={{
                                                color: theme.palette.error.main,
                                                '&:hover': {
                                                    backgroundColor: theme.palette.action.hover
                                                }
                                            }}
                                            title="Delete"
                                        >
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    )}
                                </CardActions>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}



            {/* Upload Dialog */}
            <Dialog open={openUploadDialog} onClose={() => setOpenUploadDialog(false)} maxWidth="sm" fullWidth
                PaperProps={{
                    sx: {
                        backgroundColor: theme.palette.background.paper,
                        borderRadius: 2
                    }
                }}
            >
                <DialogTitle sx={{
                    pb: 1,
                    pt: 2,
                    fontWeight: 600,
                    color: theme.palette.primary.main,
                    borderBottom: `1px solid ${theme.palette.divider}`
                }}>
                    Upload Hard Copy
                </DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                        <Box sx={{
                            border: `2px dashed ${theme.palette.divider}`,
                            borderRadius: 2,
                            p: 3,
                            textAlign: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                                borderColor: theme.palette.primary.main,
                                backgroundColor: theme.palette.action.hover
                            }
                        }}>
                            <input
                                type="file"
                                id="file-upload"
                                style={{ display: 'none' }}
                                onChange={handleFileSelect}
                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                            />
                            <label htmlFor="file-upload" style={{ cursor: 'pointer', width: '100%', display: 'block' }}>
                                <UploadIcon sx={{ fontSize: 48, color: theme.palette.primary.main, mb: 1 }} />
                                <Typography variant="h6" sx={{ color: theme.palette.primary.main, mb: 1 }}>
                                    {selectedFile ? selectedFile.name : 'Click to select file'}
                                </Typography>
                                <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                                    Supported formats: PDF, DOC, DOCX, JPG, PNG, TXT
                                </Typography>
                                {selectedFile && (
                                    <Typography variant="caption" sx={{ color: theme.palette.primary.main, mt: 1, display: 'block' }}>
                                        Size: {formatFileSize(selectedFile.size)}
                                    </Typography>
                                )}
                            </label>
                        </Box>
                        
                        <TextField
                            label="Title"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            required
                            fullWidth
                            variant="outlined"
                        />
                        
                        <TextField
                            label="Description"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            multiline
                            rows={3}
                            fullWidth
                            variant="outlined"
                        />
                        
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <FormControl fullWidth variant="outlined">
                                <InputLabel>Category</InputLabel>
                                <Select
                                    name="category"
                                    value={formData.category}
                                    onChange={handleChange}
                                    label="Category"
                                >
                                    {categories.map((cat) => (
                                        <MenuItem key={cat.value} value={cat.value}>
                                            {cat.label}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            
                            {(isHR || isAdmin) && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    {!showAddCategory ? (
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            onClick={() => setShowAddCategory(true)}
                                            sx={{
                                                borderColor: theme.palette.primary.main,
                                                color: theme.palette.primary.main,
                                                '&:hover': {
                                                    borderColor: theme.palette.primary.dark,
                                                    backgroundColor: theme.palette.action.hover
                                                }
                                            }}
                                        >
                                            Add New Category
                                        </Button>
                                    ) : (
                                        <Box sx={{ display: 'flex', gap: 1, width: '100%' }}>
                                            <TextField
                                                label="New Category"
                                                value={newCategory}
                                                onChange={(e) => setNewCategory(e.target.value)}
                                                size="small"
                                                sx={{ flexGrow: 1 }}
                                                onKeyPress={(e) => {
                                                    if (e.key === 'Enter') {
                                                        handleAddCategory();
                                                    }
                                                }}
                                            />
                                            <Button
                                                variant="contained"
                                                size="small"
                                                onClick={handleAddCategory}
                                                disabled={!newCategory.trim()}
                                                sx={{
                                                    backgroundColor: theme.palette.success.main,
                                                    '&:hover': { backgroundColor: theme.palette.success.dark }
                                                }}
                                            >
                                                Add
                                            </Button>
                                            <Button
                                                variant="outlined"
                                                size="small"
                                                onClick={() => {
                                                    setShowAddCategory(false);
                                                    setNewCategory('');
                                                }}
                                            >
                                                Cancel
                                            </Button>
                                        </Box>
                                    )}
                                </Box>
                            )}
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setOpenUploadDialog(false)} disabled={uploading}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleUpload} 
                        variant="contained" 
                        disabled={!selectedFile || uploading}
                        sx={{ 
                            backgroundColor: theme.palette.primary.main,
                            color: theme.palette.primary.contrastText,
                            '&:hover': { backgroundColor: theme.palette.primary.dark },
                            '&:disabled': { backgroundColor: theme.palette.action.disabled }
                        }}
                    >
                        {uploading ? 'Uploading...' : 'Upload'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                open={openConfirm}
                title="Delete Hard Copy"
                message={`Are you sure you want to delete "${selectedHardCopy?.title}"?`}
                onConfirm={handleDelete}
                onCancel={() => {
                    setOpenConfirm(false);
                    setSelectedHardCopy(null);
                }}
            />
        </Box>
    );
};

export default HardCopiesPage;

