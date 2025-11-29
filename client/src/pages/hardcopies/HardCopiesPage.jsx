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
    Paper
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Download as DownloadIcon,
    Lock as LockIcon,
    LockOpen as LockOpenIcon
} from '@mui/icons-material';
import Loading from '../../components/common/Loading';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import hardCopyService from '../../services/hardcopy.service';

const HardCopiesPage = () => {
    const { user, isHR, isAdmin } = useAuth();
    const [hardCopies, setHardCopies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [openConfirm, setOpenConfirm] = useState(false);
    const [selectedHardCopy, setSelectedHardCopy] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: 'general',
        location: '',
        fileUrl: '',
        fileName: '',
        fileSize: 0
    });
    const { showNotification } = useNotification();

    // Hard copy categories
    const categories = [
        { value: 'general', label: 'General' },
        { value: 'contract', label: 'Contract' },
        { value: 'certificate', label: 'Certificate' },
        { value: 'id-card', label: 'ID Card' },
        { value: 'payroll', label: 'Payroll' },
        { value: 'attendance', label: 'Attendance' },
        { value: 'other', label: 'Other' }
    ];

    const canManage = isHR || isAdmin;

    useEffect(() => {
        fetchHardCopies();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchHardCopies = async () => {
        try {
            setLoading(true);
            const data = await hardCopyService.getAll();
            setHardCopies(data);
        } catch (error) {
            console.error('Error fetching hard copies:', error);
            showNotification('Failed to fetch hard copies', 'error');
            setHardCopies([]);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (hardCopy = null) => {
        if (hardCopy) {
            setSelectedHardCopy(hardCopy);
            setFormData({
                title: hardCopy.title || '',
                description: hardCopy.description || '',
                category: hardCopy.category || 'general',
                location: hardCopy.location || '',
                fileUrl: hardCopy.fileUrl || '',
                fileName: hardCopy.fileName || '',
                fileSize: hardCopy.fileSize || 0
            });
        } else {
            setSelectedHardCopy(null);
            setFormData({
                title: '',
                description: '',
                category: 'general',
                location: '',
                fileUrl: '',
                fileName: '',
                fileSize: 0
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setSelectedHardCopy(null);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async () => {
        try {
            if (selectedHardCopy) {
                await hardCopyService.update(selectedHardCopy._id, formData);
                showNotification('Hard copy updated successfully', 'success');
            } else {
                await hardCopyService.create(formData);
                showNotification('Hard copy created successfully', 'success');
            }
            handleCloseDialog();
            fetchHardCopies();
        } catch (error) {
            console.error('Submit error:', error);
            showNotification('Operation failed', 'error');
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

    if (loading) return <Loading />;

    return (
        <Box sx={{
            p: 3,
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            background: 'var(--mui-palette-background-default)'
        }}>
            {/* Header Section */}
            <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 2,
                pb: 1,
                borderBottom: '1px solid var(--mui-palette-divider)'
            }}>
                <Typography variant="h4" fontWeight="600" sx={{ color: 'primary.main' }}>
                    Hard Copies
                </Typography>
                {canManage && (
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => handleOpenDialog()}
                        sx={{
                            background: 'primary.main',
                            fontWeight: 600,
                            '&:hover': {
                                background: 'primary.dark',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
                            }
                        }}
                    >
                        Add Hard Copy
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
                    background: 'var(--mui-palette-background-paper)',
                    borderRadius: 2,
                    border: '1px dashed var(--mui-palette-divider)'
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
                    <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 600 }}>
                        No hard copies found
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Hard copies will appear here once added
                    </Typography>
                </Box>
            ) : (
                <Grid container spacing={3}>
                    {hardCopies.map((hardCopy) => (
                        <Grid item xs={12} sm={4} md={4} key={hardCopy._id}>
                            <Card 
                                sx={{ 
                                    height: '100%', 
                                    display: 'flex', 
                                    flexDirection: 'column',
                                    boxShadow: 4,
                                    borderRadius: 3,
                                    transition: 'all 0.3s ease',
                                    border: '1px solid var(--mui-palette-divider)',
                                    background: 'var(--mui-palette-background-paper)',
                                    '&:hover': {
                                        transform: 'translateY(-6px)',
                                        boxShadow: '0 12px 24px rgba(0, 0, 0, 0.15)',
                                        border: '1px solid var(--mui-palette-primary-main)'
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
                                        <Typography variant="h6" fontWeight="600" noWrap sx={{ color: 'primary.main' }}>
                                            {hardCopy.title}
                                        </Typography>
                                    </Box>
                                    
                                    {hardCopy.description && (
                                        <Typography 
                                            variant="body2" 
                                            sx={{ 
                                                color: 'text.secondary',
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
                                                backgroundColor: 'primary.main',
                                                color: 'primary.contrastText'
                                            }}
                                        />
                                    </Box>
                                    
                                    <Box sx={{ 
                                        display: 'flex', 
                                        justifyContent: 'space-between', 
                                        alignItems: 'center',
                                        mt: 2,
                                        pt: 1.5,
                                        borderTop: '1px solid var(--mui-palette-divider)'
                                    }}>
                                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                            Size: {formatFileSize(hardCopy.fileSize)}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                            By: {hardCopy.uploadedBy?.personalInfo?.fullName || 
                                                hardCopy.uploadedBy?.username?.substring(0, 10) || 'N/A'}
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
                                            color: 'success.main',
                                            '&:hover': {
                                                backgroundColor: 'rgba(0, 0, 0, 0.04)'
                                            }
                                        }}
                                        title="Download"
                                    >
                                        <DownloadIcon fontSize="small" />
                                    </IconButton>
                                    {canManage && (
                                        <>
                                            <IconButton
                                                size="small"
                                                onClick={() => handleOpenDialog(hardCopy)}
                                                sx={{
                                                    color: 'primary.main',
                                                    '&:hover': {
                                                        backgroundColor: 'rgba(0, 0, 0, 0.04)'
                                                    }
                                                }}
                                                title="Edit"
                                            >
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                onClick={() => {
                                                    setSelectedHardCopy(hardCopy);
                                                    setOpenConfirm(true);
                                                }}
                                                sx={{
                                                    color: 'error.main',
                                                    '&:hover': {
                                                        backgroundColor: 'rgba(0, 0, 0, 0.04)'
                                                    }
                                                }}
                                                title="Delete"
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

            {/* Add/Edit Dialog */}
            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth
                PaperProps={{
                    sx: {
                        background: 'var(--mui-palette-background-paper)',
                        borderRadius: 2
                    }
                }}
            >
                <DialogTitle sx={{ 
                    pb: 1,
                    pt: 2,
                    fontWeight: 600,
                    color: 'primary.main',
                    borderBottom: '1px solid var(--mui-palette-divider)'
                }}>
                    {selectedHardCopy ? 'Edit Hard Copy' : 'Add Hard Copy'}
                </DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                        <TextField
                            label="Title"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            required
                            fullWidth
                            variant="outlined"
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    '& fieldset': {
                                        borderColor: 'var(--mui-palette-divider)'
                                    },
                                    '&:hover fieldset': {
                                        borderColor: 'primary.main'
                                    },
                                    '&.Mui-focused fieldset': {
                                        borderColor: 'primary.main'
                                    }
                                },
                                '& .MuiInputLabel-root': {
                                    color: 'text.secondary'
                                },
                                '& .MuiInputLabel-root.Mui-focused': {
                                    color: 'primary.main'
                                }
                            }}
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
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    '& fieldset': {
                                        borderColor: 'var(--mui-palette-divider)'
                                    },
                                    '&:hover fieldset': {
                                        borderColor: 'primary.main'
                                    },
                                    '&.Mui-focused fieldset': {
                                        borderColor: 'primary.main'
                                    }
                                },
                                '& .MuiInputLabel-root': {
                                    color: 'text.secondary'
                                },
                                '& .MuiInputLabel-root.Mui-focused': {
                                    color: 'primary.main'
                                }
                            }}
                        />
                        <FormControl fullWidth variant="outlined">
                            <InputLabel sx={{ 
                                color: 'text.secondary',
                                '&.Mui-focused': {
                                    color: 'primary.main'
                                }
                            }}>
                                Category
                            </InputLabel>
                            <Select
                                name="category"
                                value={formData.category}
                                onChange={handleChange}
                                label="Category"
                                sx={{ 
                                    '& .MuiOutlinedInput-notchedOutline': {
                                        borderColor: 'var(--mui-palette-divider)'
                                    },
                                    '&:hover .MuiOutlinedInput-notchedOutline': {
                                        borderColor: 'primary.main'
                                    },
                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                        borderColor: 'primary.main'
                                    }
                                }}
                            >
                                {categories.map((cat) => (
                                    <MenuItem key={cat.value} value={cat.value}>
                                        {cat.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <TextField
                            label="Physical Location"
                            name="location"
                            value={formData.location}
                            onChange={handleChange}
                            fullWidth
                            variant="outlined"
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    '& fieldset': {
                                        borderColor: 'var(--mui-palette-divider)'
                                    },
                                    '&:hover fieldset': {
                                        borderColor: 'primary.main'
                                    },
                                    '&.Mui-focused fieldset': {
                                        borderColor: 'primary.main'
                                    }
                                },
                                '& .MuiInputLabel-root': {
                                    color: 'text.secondary'
                                },
                                '& .MuiInputLabel-root.Mui-focused': {
                                    color: 'primary.main'
                                }
                            }}
                        />
                        <TextField
                            label="File URL"
                            name="fileUrl"
                            value={formData.fileUrl}
                            onChange={handleChange}
                            fullWidth
                            variant="outlined"
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    '& fieldset': {
                                        borderColor: 'var(--mui-palette-divider)'
                                    },
                                    '&:hover fieldset': {
                                        borderColor: 'primary.main'
                                    },
                                    '&.Mui-focused fieldset': {
                                        borderColor: 'primary.main'
                                    }
                                },
                                '& .MuiInputLabel-root': {
                                    color: 'text.secondary'
                                },
                                '& .MuiInputLabel-root.Mui-focused': {
                                    color: 'primary.main'
                                }
                            }}
                        />
                        <TextField
                            label="File Name"
                            name="fileName"
                            value={formData.fileName}
                            onChange={handleChange}
                            fullWidth
                            variant="outlined"
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    '& fieldset': {
                                        borderColor: 'var(--mui-palette-divider)'
                                    },
                                    '&:hover fieldset': {
                                        borderColor: 'primary.main'
                                    },
                                    '&.Mui-focused fieldset': {
                                        borderColor: 'primary.main'
                                    }
                                },
                                '& .MuiInputLabel-root': {
                                    color: 'text.secondary'
                                },
                                '& .MuiInputLabel-root.Mui-focused': {
                                    color: 'primary.main'
                                }
                            }}
                        />
                        <TextField
                            label="File Size (bytes)"
                            name="fileSize"
                            type="number"
                            value={formData.fileSize}
                            onChange={handleChange}
                            fullWidth
                            variant="outlined"
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    '& fieldset': {
                                        borderColor: 'var(--mui-palette-divider)'
                                    },
                                    '&:hover fieldset': {
                                        borderColor: 'primary.main'
                                    },
                                    '&.Mui-focused fieldset': {
                                        borderColor: 'primary.main'
                                    }
                                },
                                '& .MuiInputLabel-root': {
                                    color: 'text.secondary'
                                },
                                '& .MuiInputLabel-root.Mui-focused': {
                                    color: 'primary.main'
                                }
                            }}
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleSubmit} variant="contained" sx={{ background: 'primary.main', '&:hover': { background: 'primary.dark' } }}>
                        {selectedHardCopy ? 'Update' : 'Create'}
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