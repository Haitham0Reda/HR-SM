import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    IconButton,
    Menu,
    MenuItem,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControl,
    InputLabel,
    Select,
    Grid,
    Alert,
    Tooltip,
    CircularProgress,
    Pagination
} from '@mui/material';
import {
    Add as AddIcon,
    MoreVert as MoreVertIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Visibility as ViewIcon,
    CheckCircle as ActivateIcon,
    Cancel as DeactivateIcon,
    Business as BusinessIcon,
    Phone as PhoneIcon,
    Email as EmailIcon,
    Language as WebsiteIcon,
    Star as StarIcon,
    Refresh as RefreshIcon
} from '@mui/icons-material';
import { useInsuranceProviders } from '../../hooks/useInsuranceProviders';
import { formatCurrency, formatDate } from '../../utils/formatters';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';

const ProvidersPage = () => {
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState({
        status: '',
        insuranceType: '',
        search: ''
    });
    const [selectedProvider, setSelectedProvider] = useState(null);
    const [anchorEl, setAnchorEl] = useState(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogType, setDialogType] = useState(''); // 'view', 'create', 'edit', 'delete'
    const [formData, setFormData] = useState({});

    const {
        providers,
        loading,
        error,
        pagination,
        statistics,
        statisticsLoading,
        getProviders,
        createProvider,
        updateProvider,
        deleteProvider,
        activateProvider,
        deactivateProvider
    } = useInsuranceProviders();

    useEffect(() => {
        loadProviders();
    }, [page, filters]);

    const loadProviders = () => {
        const params = {
            page,
            limit: 10,
            ...filters
        };
        getProviders(params);
    };

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({
            ...prev,
            [field]: value
        }));
        setPage(1); // Reset to first page when filtering
    };

    const handleMenuOpen = (event, provider) => {
        setAnchorEl(event.currentTarget);
        setSelectedProvider(provider);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
        setSelectedProvider(null);
    };

    const handleDialogOpen = (type, provider = null) => {
        console.log('handleDialogOpen called:', { type, provider: provider?.name, providerId: provider?._id });
        
        // Ensure we have a provider for actions that require it
        if ((type === 'edit' || type === 'view' || type === 'delete') && !provider) {
            console.error(`Cannot open ${type} dialog without a provider`);
            return;
        }
        
        // Close menu immediately
        setAnchorEl(null);
        
        // Set all dialog state at once
        setDialogType(type);
        setSelectedProvider(provider);
        setDialogOpen(true);
        
        console.log('Dialog state set:', { type, provider: provider?.name });
        
        if (type === 'create') {
            setFormData({
                name: '',
                nameArabic: '',
                code: '',
                contactInfo: {
                    email: '',
                    phone: '',
                    website: '',
                    address: {
                        street: '',
                        city: '',
                        governorate: '',
                        country: 'Egypt'
                    }
                },
                insuranceTypes: [],
                coverageAreas: [],
                status: 'active',
                rating: 3
            });
        } else if (type === 'edit' && provider) {
            setFormData({ 
                ...provider,
                contactInfo: {
                    email: provider.contactInfo?.email || '',
                    phone: provider.contactInfo?.phone || '',
                    website: provider.contactInfo?.website || '',
                    address: {
                        street: provider.contactInfo?.address?.street || '',
                        city: provider.contactInfo?.address?.city || '',
                        governorate: provider.contactInfo?.address?.governorate || '',
                        country: provider.contactInfo?.address?.country || 'Egypt'
                    }
                },
                insuranceTypes: provider.insuranceTypes || [],
                coverageAreas: provider.coverageAreas || []
            });
        }
    };

    const handleDialogClose = () => {
        setDialogOpen(false);
        setDialogType('');
        setSelectedProvider(null);
        setFormData({});
    };

    const handleSubmit = async () => {
        try {
            if (dialogType === 'create') {
                await createProvider(formData);
            } else if (dialogType === 'edit') {
                if (!selectedProvider || !selectedProvider._id) {
                    console.error('No provider selected for editing');
                    handleDialogClose();
                    return;
                }
                await updateProvider(selectedProvider._id, formData);
            }
            handleDialogClose();
            loadProviders();
        } catch (error) {
            console.error('Error submitting form:', error);
        }
    };

    const handleDelete = async () => {
        if (!selectedProvider || !selectedProvider._id) {
            console.error('No provider selected for deletion');
            handleDialogClose();
            return;
        }

        try {
            await deleteProvider(selectedProvider._id);
            handleDialogClose();
            loadProviders();
        } catch (error) {
            console.error('Error deleting provider:', error);
        }
    };

    const handleActivate = async (providerId) => {
        if (!providerId) {
            console.error('No provider ID provided for activation');
            return;
        }

        try {
            await activateProvider(providerId);
            loadProviders();
        } catch (error) {
            console.error('Error activating provider:', error);
        }
        handleMenuClose();
    };

    const handleDeactivate = async (providerId) => {
        if (!providerId) {
            console.error('No provider ID provided for deactivation');
            return;
        }

        try {
            await deactivateProvider(providerId, 'Deactivated by admin');
            loadProviders();
        } catch (error) {
            console.error('Error deactivating provider:', error);
        }
        handleMenuClose();
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'active': return 'success';
            case 'inactive': return 'default';
            case 'suspended': return 'error';
            case 'pending': return 'warning';
            default: return 'default';
        }
    };

    const renderRating = (rating) => {
        return (
            <Box display="flex" alignItems="center">
                <StarIcon color="primary" fontSize="small" />
                <Typography variant="body2" sx={{ ml: 0.5 }}>
                    {rating?.toFixed(1) || 'N/A'}
                </Typography>
            </Box>
        );
    };

    if (loading && !providers.length) {
        return <LoadingSpinner />;
    }

    return (
        <Box sx={{ 
            display: 'flex',
            flexDirection: 'column',
            minHeight: '100vh',
            margin: {
                xs: '-16px -16px', // Counteract layout padding
                sm: '-24px -24px',
                md: '-32px -32px'
            },
            padding: {
                xs: '16px',
                sm: '24px', 
                md: '32px'
            },
            boxSizing: 'border-box'
        }}>
            {/* Header */}
            <Box 
                sx={{
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    mb: 3,
                    width: '100%',
                    flexShrink: 0
                }}
            >
                <Typography variant="h4" component="h1">
                    Insurance Providers
                </Typography>
                <Box display="flex" gap={2}>
                    <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={loadProviders}
                        disabled={loading}
                    >
                        Refresh
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => handleDialogOpen('create')}
                    >
                        Add Provider
                    </Button>
                </Box>
            </Box>

            {error && (
                <ErrorAlert 
                    message={error} 
                    onClose={() => {}} 
                    sx={{ mb: 3 }} 
                />
            )}

            {/* Statistics Cards */}
            {(statistics || statisticsLoading) && (
                <Box sx={{ 
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 3,
                    mb: 3,
                    width: '100%'
                }}>
                    <Box sx={{ flex: '1 1 calc(25% - 18px)', minWidth: '200px' }}>
                        <Card sx={{ height: '100%' }}>
                            <CardContent>
                                <Typography color="textSecondary" gutterBottom>
                                    Total Providers
                                </Typography>
                                <Typography variant="h4">
                                    {statisticsLoading ? (
                                        <CircularProgress size={24} />
                                    ) : (
                                        statistics?.total || 0
                                    )}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Box>
                    <Box sx={{ flex: '1 1 calc(25% - 18px)', minWidth: '200px' }}>
                        <Card sx={{ height: '100%' }}>
                            <CardContent>
                                <Typography color="textSecondary" gutterBottom>
                                    Active Providers
                                </Typography>
                                <Typography variant="h4" color="success.main">
                                    {statisticsLoading ? (
                                        <CircularProgress size={24} />
                                    ) : (
                                        statistics?.active || 0
                                    )}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Box>
                    <Box sx={{ flex: '1 1 calc(25% - 18px)', minWidth: '200px' }}>
                        <Card sx={{ height: '100%' }}>
                            <CardContent>
                                <Typography color="textSecondary" gutterBottom>
                                    Average Rating
                                </Typography>
                                <Typography variant="h4">
                                    {statisticsLoading ? (
                                        <CircularProgress size={24} />
                                    ) : (
                                        statistics?.averageRating?.toFixed(1) || 'N/A'
                                    )}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Box>
                    <Box sx={{ flex: '1 1 calc(25% - 18px)', minWidth: '200px' }}>
                        <Card sx={{ height: '100%' }}>
                            <CardContent>
                                <Typography color="textSecondary" gutterBottom>
                                    Inactive/Suspended
                                </Typography>
                                <Typography variant="h4" color="error.main">
                                    {statisticsLoading ? (
                                        <CircularProgress size={24} />
                                    ) : (
                                        (statistics?.inactive || 0) + (statistics?.suspended || 0)
                                    )}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Box>
                </Box>
            )}

            {/* Filters */}
            <Card sx={{ mb: 3, width: '100%' }}>
                <CardContent>
                    <Box sx={{ 
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 2,
                        alignItems: 'center',
                        width: '100%'
                    }}>
                        <Box sx={{ flex: '1 1 300px', minWidth: '200px' }}>
                            <TextField
                                fullWidth
                                label="Search"
                                value={filters.search}
                                onChange={(e) => handleFilterChange('search', e.target.value)}
                                placeholder="Search by name, code, or email..."
                            />
                        </Box>
                        <Box sx={{ flex: '1 1 200px', minWidth: '150px' }}>
                            <FormControl fullWidth>
                                <InputLabel>Status</InputLabel>
                                <Select
                                    value={filters.status}
                                    onChange={(e) => handleFilterChange('status', e.target.value)}
                                    label="Status"
                                >
                                    <MenuItem value="">All</MenuItem>
                                    <MenuItem value="active">Active</MenuItem>
                                    <MenuItem value="inactive">Inactive</MenuItem>
                                    <MenuItem value="suspended">Suspended</MenuItem>
                                    <MenuItem value="pending">Pending</MenuItem>
                                </Select>
                            </FormControl>
                        </Box>
                        <Box sx={{ flex: '1 1 200px', minWidth: '150px' }}>
                            <FormControl fullWidth>
                                <InputLabel>Insurance Type</InputLabel>
                                <Select
                                    value={filters.insuranceType}
                                    onChange={(e) => handleFilterChange('insuranceType', e.target.value)}
                                    label="Insurance Type"
                                >
                                    <MenuItem value="">All</MenuItem>
                                    <MenuItem value="health">Health</MenuItem>
                                    <MenuItem value="life">Life</MenuItem>
                                    <MenuItem value="dental">Dental</MenuItem>
                                    <MenuItem value="vision">Vision</MenuItem>
                                    <MenuItem value="disability">Disability</MenuItem>
                                    <MenuItem value="accident">Accident</MenuItem>
                                    <MenuItem value="travel">Travel</MenuItem>
                                    <MenuItem value="other">Other</MenuItem>
                                </Select>
                            </FormControl>
                        </Box>
                    </Box>
                </CardContent>
            </Card>

            {/* Providers Table */}
            <Box sx={{ 
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                width: '100%'
            }}>
                <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <TableContainer component={Paper} sx={{ flex: 1 }}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Provider</TableCell>
                                <TableCell>Code</TableCell>
                                <TableCell>Contact</TableCell>
                                <TableCell>Insurance Types</TableCell>
                                <TableCell>Rating</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center">
                                        <CircularProgress />
                                    </TableCell>
                                </TableRow>
                            ) : providers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center">
                                        <Typography variant="body2" color="textSecondary">
                                            No providers found
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                providers.map((provider) => (
                                    <TableRow key={provider._id} hover>
                                        <TableCell>
                                            <Box>
                                                <Typography variant="subtitle2">
                                                    {provider.name}
                                                </Typography>
                                                {provider.nameArabic && (
                                                    <Typography variant="body2" color="textSecondary">
                                                        {provider.nameArabic}
                                                    </Typography>
                                                )}
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Chip 
                                                label={provider.code} 
                                                size="small" 
                                                variant="outlined"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Box>
                                                {provider.contactInfo?.email && (
                                                    <Box display="flex" alignItems="center" mb={0.5}>
                                                        <EmailIcon fontSize="small" sx={{ mr: 1 }} />
                                                        <Typography variant="body2">
                                                            {provider.contactInfo.email}
                                                        </Typography>
                                                    </Box>
                                                )}
                                                {provider.contactInfo?.phone && (
                                                    <Box display="flex" alignItems="center">
                                                        <PhoneIcon fontSize="small" sx={{ mr: 1 }} />
                                                        <Typography variant="body2">
                                                            {provider.contactInfo.phone}
                                                        </Typography>
                                                    </Box>
                                                )}
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Box display="flex" flexWrap="wrap" gap={0.5}>
                                                {provider.insuranceTypes?.slice(0, 2).map((type) => (
                                                    <Chip 
                                                        key={type} 
                                                        label={type} 
                                                        size="small" 
                                                        color="primary"
                                                        variant="outlined"
                                                    />
                                                ))}
                                                {provider.insuranceTypes?.length > 2 && (
                                                    <Chip 
                                                        label={`+${provider.insuranceTypes.length - 2}`} 
                                                        size="small" 
                                                        variant="outlined"
                                                    />
                                                )}
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            {renderRating(provider.rating)}
                                        </TableCell>
                                        <TableCell>
                                            <Chip 
                                                label={provider.status} 
                                                color={getStatusColor(provider.status)}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell align="right">
                                            <IconButton
                                                onClick={(e) => handleMenuOpen(e, provider)}
                                                size="small"
                                            >
                                                <MoreVertIcon />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                    <Box display="flex" justifyContent="center" p={2}>
                        <Pagination
                            count={pagination.totalPages}
                            page={page}
                            onChange={(e, newPage) => setPage(newPage)}
                            color="primary"
                        />
                    </Box>
                )}
                </Card>
            </Box>

            {/* Action Menu */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
            >
                <MenuItem onClick={() => handleDialogOpen('view', selectedProvider)}>
                    <ViewIcon sx={{ mr: 1 }} />
                    View Details
                </MenuItem>
                <MenuItem onClick={() => handleDialogOpen('edit', selectedProvider)}>
                    <EditIcon sx={{ mr: 1 }} />
                    Edit
                </MenuItem>
                {selectedProvider?.status === 'active' ? (
                    <MenuItem onClick={() => handleDeactivate(selectedProvider._id)}>
                        <DeactivateIcon sx={{ mr: 1 }} />
                        Deactivate
                    </MenuItem>
                ) : (
                    <MenuItem onClick={() => handleActivate(selectedProvider._id)}>
                        <ActivateIcon sx={{ mr: 1 }} />
                        Activate
                    </MenuItem>
                )}
                <MenuItem 
                    onClick={() => handleDialogOpen('delete', selectedProvider)}
                    sx={{ color: 'error.main' }}
                >
                    <DeleteIcon sx={{ mr: 1 }} />
                    Delete
                </MenuItem>
            </Menu>

            {/* Dialogs */}
            {/* View Provider Dialog */}
            <Dialog
                open={dialogOpen && dialogType === 'view'}
                onClose={handleDialogClose}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    Provider Details
                </DialogTitle>
                <DialogContent>
                    {selectedProvider && (
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle2" gutterBottom>
                                    Provider Name
                                </Typography>
                                <Typography variant="body1" gutterBottom>
                                    {selectedProvider.name}
                                </Typography>
                                {selectedProvider.nameArabic && (
                                    <>
                                        <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                                            Arabic Name
                                        </Typography>
                                        <Typography variant="body1" gutterBottom>
                                            {selectedProvider.nameArabic}
                                        </Typography>
                                    </>
                                )}
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle2" gutterBottom>
                                    Provider Code
                                </Typography>
                                <Chip label={selectedProvider.code} variant="outlined" />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle2" gutterBottom>
                                    Status
                                </Typography>
                                <Chip 
                                    label={selectedProvider.status} 
                                    color={getStatusColor(selectedProvider.status)}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle2" gutterBottom>
                                    Rating
                                </Typography>
                                {renderRating(selectedProvider.rating)}
                            </Grid>
                            <Grid item xs={12}>
                                <Typography variant="subtitle2" gutterBottom>
                                    Contact Information
                                </Typography>
                                <Box sx={{ pl: 2 }}>
                                    {selectedProvider.contactInfo?.email && (
                                        <Box display="flex" alignItems="center" mb={1}>
                                            <EmailIcon fontSize="small" sx={{ mr: 1 }} />
                                            <Typography variant="body2">
                                                {selectedProvider.contactInfo.email}
                                            </Typography>
                                        </Box>
                                    )}
                                    {selectedProvider.contactInfo?.phone && (
                                        <Box display="flex" alignItems="center" mb={1}>
                                            <PhoneIcon fontSize="small" sx={{ mr: 1 }} />
                                            <Typography variant="body2">
                                                {selectedProvider.contactInfo.phone}
                                            </Typography>
                                        </Box>
                                    )}
                                    {selectedProvider.contactInfo?.website && (
                                        <Box display="flex" alignItems="center" mb={1}>
                                            <WebsiteIcon fontSize="small" sx={{ mr: 1 }} />
                                            <Typography variant="body2">
                                                {selectedProvider.contactInfo.website}
                                            </Typography>
                                        </Box>
                                    )}
                                </Box>
                            </Grid>
                            <Grid item xs={12}>
                                <Typography variant="subtitle2" gutterBottom>
                                    Insurance Types
                                </Typography>
                                <Box display="flex" flexWrap="wrap" gap={1}>
                                    {selectedProvider.insuranceTypes?.map((type) => (
                                        <Chip 
                                            key={type} 
                                            label={type} 
                                            size="small" 
                                            color="primary"
                                            variant="outlined"
                                        />
                                    ))}
                                </Box>
                            </Grid>
                            {selectedProvider.coverageAreas?.length > 0 && (
                                <Grid item xs={12}>
                                    <Typography variant="subtitle2" gutterBottom>
                                        Coverage Areas
                                    </Typography>
                                    <Box display="flex" flexWrap="wrap" gap={1}>
                                        {selectedProvider.coverageAreas.map((area) => (
                                            <Chip 
                                                key={area} 
                                                label={area} 
                                                size="small" 
                                                variant="outlined"
                                            />
                                        ))}
                                    </Box>
                                </Grid>
                            )}
                        </Grid>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleDialogClose}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* Create/Edit Provider Dialog */}
            <Dialog
                open={dialogOpen && (dialogType === 'create' || dialogType === 'edit')}
                onClose={handleDialogClose}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    {dialogType === 'create' ? 'Add New Provider' : 'Edit Provider'}
                </DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Provider Name *"
                                value={formData.name || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Arabic Name"
                                value={formData.nameArabic || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, nameArabic: e.target.value }))}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Provider Code *"
                                value={formData.code || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth>
                                <InputLabel>Status</InputLabel>
                                <Select
                                    value={formData.status || 'active'}
                                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                                    label="Status"
                                >
                                    <MenuItem value="active">Active</MenuItem>
                                    <MenuItem value="inactive">Inactive</MenuItem>
                                    <MenuItem value="suspended">Suspended</MenuItem>
                                    <MenuItem value="pending">Pending</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Email"
                                type="email"
                                value={formData.contactInfo?.email || ''}
                                onChange={(e) => setFormData(prev => ({ 
                                    ...prev, 
                                    contactInfo: { ...prev.contactInfo, email: e.target.value }
                                }))}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Phone"
                                value={formData.contactInfo?.phone || ''}
                                onChange={(e) => setFormData(prev => ({ 
                                    ...prev, 
                                    contactInfo: { ...prev.contactInfo, phone: e.target.value }
                                }))}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Website"
                                value={formData.contactInfo?.website || ''}
                                onChange={(e) => setFormData(prev => ({ 
                                    ...prev, 
                                    contactInfo: { ...prev.contactInfo, website: e.target.value }
                                }))}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <FormControl fullWidth>
                                <InputLabel>Insurance Types</InputLabel>
                                <Select
                                    multiple
                                    value={formData.insuranceTypes || []}
                                    onChange={(e) => setFormData(prev => ({ ...prev, insuranceTypes: e.target.value }))}
                                    label="Insurance Types"
                                    renderValue={(selected) => (
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                            {selected.map((value) => (
                                                <Chip key={value} label={value} size="small" />
                                            ))}
                                        </Box>
                                    )}
                                >
                                    <MenuItem value="health">Health</MenuItem>
                                    <MenuItem value="life">Life</MenuItem>
                                    <MenuItem value="dental">Dental</MenuItem>
                                    <MenuItem value="vision">Vision</MenuItem>
                                    <MenuItem value="disability">Disability</MenuItem>
                                    <MenuItem value="accident">Accident</MenuItem>
                                    <MenuItem value="travel">Travel</MenuItem>
                                    <MenuItem value="other">Other</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                            <FormControl fullWidth>
                                <InputLabel>Coverage Areas</InputLabel>
                                <Select
                                    multiple
                                    value={formData.coverageAreas || []}
                                    onChange={(e) => setFormData(prev => ({ ...prev, coverageAreas: e.target.value }))}
                                    label="Coverage Areas"
                                    renderValue={(selected) => (
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                            {selected.map((value) => (
                                                <Chip key={value} label={value} size="small" />
                                            ))}
                                        </Box>
                                    )}
                                >
                                    <MenuItem value="cairo">Cairo</MenuItem>
                                    <MenuItem value="alexandria">Alexandria</MenuItem>
                                    <MenuItem value="giza">Giza</MenuItem>
                                    <MenuItem value="luxor">Luxor</MenuItem>
                                    <MenuItem value="aswan">Aswan</MenuItem>
                                    <MenuItem value="nationwide">Nationwide</MenuItem>
                                    <MenuItem value="international">International</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Street Address"
                                value={formData.contactInfo?.address?.street || ''}
                                onChange={(e) => setFormData(prev => ({ 
                                    ...prev, 
                                    contactInfo: { 
                                        ...prev.contactInfo, 
                                        address: { ...prev.contactInfo?.address, street: e.target.value }
                                    }
                                }))}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="City"
                                value={formData.contactInfo?.address?.city || ''}
                                onChange={(e) => setFormData(prev => ({ 
                                    ...prev, 
                                    contactInfo: { 
                                        ...prev.contactInfo, 
                                        address: { ...prev.contactInfo?.address, city: e.target.value }
                                    }
                                }))}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Governorate"
                                value={formData.contactInfo?.address?.governorate || ''}
                                onChange={(e) => setFormData(prev => ({ 
                                    ...prev, 
                                    contactInfo: { 
                                        ...prev.contactInfo, 
                                        address: { ...prev.contactInfo?.address, governorate: e.target.value }
                                    }
                                }))}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleDialogClose}>Cancel</Button>
                    <Button 
                        onClick={handleSubmit} 
                        variant="contained"
                        disabled={!formData.name || !formData.code}
                    >
                        {dialogType === 'create' ? 'Create' : 'Update'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            {console.log('Delete dialog render check:', { 
                dialogOpen, 
                dialogType, 
                selectedProvider: selectedProvider?.name,
                condition: dialogOpen && dialogType === 'delete'
            })}
            <Dialog
                open={dialogOpen && dialogType === 'delete'}
                onClose={handleDialogClose}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    Confirm Delete
                </DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to delete the provider "{selectedProvider?.name}"? 
                        This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleDialogClose}>Cancel</Button>
                    <Button 
                        onClick={handleDelete} 
                        variant="contained" 
                        color="error"
                        disabled={!selectedProvider}
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ProvidersPage;