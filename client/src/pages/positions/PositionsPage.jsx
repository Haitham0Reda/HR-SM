import { useState, useEffect, useMemo } from 'react';
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
    Grid,
    Card,
    CardHeader,
    CardContent,
    InputAdornment,
    Fade,
    Tooltip,
    Divider,
    Paper,
    Stack,
    alpha,
    Avatar
} from '@mui/material';
import { 
    Add as AddIcon, 
    Search as SearchIcon, 
    Edit as EditIcon, 
    Delete as DeleteIcon,
    Work as WorkIcon,
    FilterList as FilterListIcon,
    Clear as ClearIcon,
    TrendingUp as TrendingUpIcon,
    Category as CategoryIcon,
    Business as BusinessIcon
} from '@mui/icons-material';
import Loading from '../../components/common/Loading';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useNotification } from '../../context/NotificationContext';
import positionService from '../../services/position.service';
import departmentService from '../../services/department.service';

const PositionsPage = () => {
    const [positions, setPositions] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [departmentFilter, setDepartmentFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [openConfirm, setOpenConfirm] = useState(false);
    const [selectedPosition, setSelectedPosition] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        arabicTitle: '',
        code: '',
        department: '',
        level: '',
        description: '',
        isActive: true
    });
    const { showNotification } = useNotification();

    const levels = ['Entry', 'Junior', 'Mid', 'Senior', 'Lead', 'Manager', 'Director', 'Executive'];

    useEffect(() => {
        fetchPositions();
        fetchDepartments();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchPositions = async () => {
        try {
            setLoading(true);
            const data = await positionService.getAll();
            setPositions(data);
        } catch (error) {
            showNotification('Failed to fetch positions', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchDepartments = async () => {
        try {
            const data = await departmentService.getAll();
            setDepartments(data);
        } catch (error) {

        }
    };

    const handleOpenDialog = (position = null) => {
        if (position) {
            setSelectedPosition(position);
            setFormData({
                title: position.title,
                arabicTitle: position.arabicTitle || '',
                code: position.code,
                department: position.department?._id || position.department || '',
                level: position.level || '',
                description: position.description || '',
                isActive: position.isActive !== false
            });
        } else {
            setSelectedPosition(null);
            setFormData({
                title: '',
                arabicTitle: '',
                code: '',
                department: '',
                level: '',
                description: '',
                isActive: true
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setSelectedPosition(null);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async () => {
        try {
            if (!formData.department) {
                showNotification('Please select a department', 'error');
                return;
            }

            const submitData = {
                ...formData,
                level: formData.level || undefined,
                description: formData.description || undefined,
                arabicTitle: formData.arabicTitle || undefined,
            };

            // Remove code field when creating new position (backend will auto-generate)
            if (!selectedPosition) {
                delete submitData.code;
            }
            
            // Remove empty string values
            Object.keys(submitData).forEach(key => {
                if (submitData[key] === '') {
                    delete submitData[key];
                }
            });

            if (selectedPosition) {
                await positionService.update(selectedPosition._id, submitData);
                showNotification('Position updated successfully', 'success');
            } else {
                await positionService.create(submitData);
                showNotification('Position created successfully', 'success');
            }
            handleCloseDialog();
            fetchPositions();
        } catch (error) {
            showNotification(error.response?.data?.message || 'Operation failed', 'error');
        }
    };

    const handleDelete = async () => {
        try {
            await positionService.delete(selectedPosition._id);
            showNotification('Position deleted successfully', 'success');
            setOpenConfirm(false);
            setSelectedPosition(null);
            fetchPositions();
        } catch (error) {
            showNotification(error.response?.data?.message || 'Delete failed', 'error');
            setOpenConfirm(false);
            setSelectedPosition(null);
        }
    };

    const filteredPositions = useMemo(() => {
        return positions.filter(pos => {
            const matchesSearch = searchTerm === '' || 
                pos.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                pos.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (pos.arabicTitle && pos.arabicTitle.includes(searchTerm));
            
            const matchesStatus = statusFilter === 'all' || 
                (statusFilter === 'active' && pos.isActive) ||
                (statusFilter === 'inactive' && !pos.isActive);
            
            const matchesDepartment = departmentFilter === 'all' ||
                (pos.department?._id === departmentFilter);
            
            return matchesSearch && matchesStatus && matchesDepartment;
        });
    }, [positions, searchTerm, statusFilter, departmentFilter]);

    const stats = useMemo(() => ({
        total: positions.length,
        active: positions.filter(p => p.isActive).length,
        inactive: positions.filter(p => !p.isActive).length
    }), [positions]);

    if (loading) return <Loading />;

    return (
        <Box sx={{ 
            minHeight: '100vh',
            bgcolor: 'background.default',
            p: { xs: 2, sm: 3, md: 4 }
        }}>
            {/* Header Section */}
            <Paper 
                elevation={0}
                sx={{ 
                    p: 3,
                    mb: 3,
                    borderRadius: 3,
                    background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                    color: 'white'
                }}
            >
                <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 2
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ 
                            bgcolor: 'rgba(255,255,255,0.2)', 
                            width: 56, 
                            height: 56,
                            backdropFilter: 'blur(10px)'
                        }}>
                            <WorkIcon sx={{ fontSize: 32 }} />
                        </Avatar>
                        <Box>
                            <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                                Positions
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                Manage and organize your positions
                            </Typography>
                        </Box>
                    </Box>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => handleOpenDialog()}
                        sx={{ 
                            bgcolor: 'white',
                            color: 'primary.main',
                            borderRadius: 2.5,
                            textTransform: 'none',
                            px: 3,
                            py: 1.2,
                            fontSize: '1rem',
                            fontWeight: 600,
                            boxShadow: 3,
                            '&:hover': {
                                bgcolor: 'rgba(255,255,255,0.9)',
                                boxShadow: 4
                            }
                        }}
                    >
                        New Position
                    </Button>
                </Box>
            </Paper>

            {/* Stats Cards */}
            <Grid container spacing={2.5} sx={{ mb: 4 }}>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 2.5,
                            borderRadius: 2.5,
                            border: '1px solid',
                            borderColor: 'divider',
                            transition: 'all 0.3s',
                            '&:hover': {
                                borderColor: 'primary.main',
                                boxShadow: 2
                            }
                        }}
                    >
                        <Stack direction="row" spacing={2} alignItems="center">
                            <Avatar sx={{ 
                                bgcolor: alpha('#1976d2', 0.1),
                                color: 'primary.main',
                                width: 48,
                                height: 48
                            }}>
                                <CategoryIcon />
                            </Avatar>
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                    Total
                                </Typography>
                                <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                                    {stats.total}
                                </Typography>
                            </Box>
                        </Stack>
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 2.5,
                            borderRadius: 2.5,
                            border: '1px solid',
                            borderColor: 'divider',
                            transition: 'all 0.3s',
                            '&:hover': {
                                borderColor: 'success.main',
                                boxShadow: 2
                            }
                        }}
                    >
                        <Stack direction="row" spacing={2} alignItems="center">
                            <Avatar sx={{ 
                                bgcolor: alpha('#2e7d32', 0.1),
                                color: 'success.main',
                                width: 48,
                                height: 48
                            }}>
                                <TrendingUpIcon />
                            </Avatar>
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                    Active
                                </Typography>
                                <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                                    {stats.active}
                                </Typography>
                            </Box>
                        </Stack>
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 2.5,
                            borderRadius: 2.5,
                            border: '1px solid',
                            borderColor: 'divider',
                            transition: 'all 0.3s',
                            '&:hover': {
                                borderColor: 'grey.400',
                                boxShadow: 2
                            }
                        }}
                    >
                        <Stack direction="row" spacing={2} alignItems="center">
                            <Avatar sx={{ 
                                bgcolor: alpha('#757575', 0.1),
                                color: 'grey.700',
                                width: 48,
                                height: 48
                            }}>
                                <WorkIcon />
                            </Avatar>
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                    Inactive
                                </Typography>
                                <Typography variant="h4" sx={{ fontWeight: 700, color: 'grey.700' }}>
                                    {stats.inactive}
                                </Typography>
                            </Box>
                        </Stack>
                    </Paper>
                </Grid>
            </Grid>

            {/* Search and Filter */}
            <Paper elevation={0} sx={{ p: 2.5, mb: 3, borderRadius: 2.5, border: '1px solid', borderColor: 'divider' }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Search positions..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            slotProps={{
                                input: {
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon sx={{ color: 'text.secondary' }} />
                                        </InputAdornment>
                                    ),
                                    endAdornment: searchTerm && (
                                        <InputAdornment position="end">
                                            <IconButton size="small" onClick={() => setSearchTerm('')}>
                                                <ClearIcon fontSize="small" />
                                            </IconButton>
                                        </InputAdornment>
                                    )
                                }
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                    bgcolor: 'background.default'
                                }
                            }}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <TextField
                            select
                            fullWidth
                            size="small"
                            value={departmentFilter}
                            onChange={(e) => setDepartmentFilter(e.target.value)}
                            slotProps={{
                                input: {
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <BusinessIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                                        </InputAdornment>
                                    )
                                }
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                    bgcolor: 'background.default'
                                }
                            }}
                        >
                            <MenuItem value="all">All Departments</MenuItem>
                            {departments.map((dept) => (
                                <MenuItem key={dept._id} value={dept._id}>
                                    {dept.name}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <TextField
                            select
                            fullWidth
                            size="small"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            slotProps={{
                                input: {
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <FilterListIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                                        </InputAdornment>
                                    )
                                }
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                    bgcolor: 'background.default'
                                }
                            }}
                        >
                            <MenuItem value="all">All Status</MenuItem>
                            <MenuItem value="active">Active</MenuItem>
                            <MenuItem value="inactive">Inactive</MenuItem>
                        </TextField>
                    </Grid>
                </Grid>
            </Paper>

            {/* Results Info */}
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                    {filteredPositions.length} {filteredPositions.length === 1 ? 'position' : 'positions'} found
                </Typography>
                {(searchTerm || statusFilter !== 'all' || departmentFilter !== 'all') && (
                    <Button
                        size="small"
                        startIcon={<ClearIcon />}
                        onClick={() => {
                            setSearchTerm('');
                            setStatusFilter('all');
                            setDepartmentFilter('all');
                        }}
                        sx={{ textTransform: 'none' }}
                    >
                        Clear filters
                    </Button>
                )}
            </Box>

            {/* Positions Grid */}
            {filteredPositions.length === 0 ? (
                <Paper
                    elevation={0}
                    sx={{ 
                        textAlign: 'center', 
                        py: 8,
                        borderRadius: 2.5,
                        border: '2px dashed',
                        borderColor: 'divider'
                    }}
                >
                    <WorkIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                        No positions found
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {searchTerm || statusFilter !== 'all' || departmentFilter !== 'all'
                            ? 'Try adjusting your filters' 
                            : 'Create your first position to get started'}
                    </Typography>
                </Paper>
            ) : (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2.5, justifyContent: 'center' }}>
                    {filteredPositions.map((position, index) => (
                        <Fade in timeout={200 + (index * 30)} key={position._id}>
                            <Card
                                elevation={0}
                                sx={{
                                    width: 300,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    borderRadius: 2.5,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    transition: 'all 0.3s',
                                    '&:hover': {
                                        borderColor: position.isActive ? 'success.main' : 'grey.400',
                                        boxShadow: 3,
                                        transform: 'translateY(-4px)'
                                    }
                                }}
                            >
                                    <CardHeader
                                        avatar={
                                            <Avatar sx={{ 
                                                bgcolor: position.isActive 
                                                    ? alpha('#2e7d32', 0.1)
                                                    : alpha('#757575', 0.1),
                                                color: position.isActive ? 'success.main' : 'grey.600'
                                            }}>
                                                <WorkIcon />
                                            </Avatar>
                                        }
                                        title={
                                            <Typography 
                                                variant="h6" 
                                                sx={{ 
                                                    fontWeight: 600, 
                                                    fontSize: '1rem',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical',
                                                    minHeight: '2.5em',
                                                    lineHeight: 1.25
                                                }}
                                            >
                                                {position.title}
                                            </Typography>
                                        }
                                        subheader={
                                            <Chip
                                                label={position.isActive ? 'Active' : 'Inactive'}
                                                size="small"
                                                sx={{
                                                    mt: 0.5,
                                                    height: 20,
                                                    fontSize: '0.7rem',
                                                    fontWeight: 600,
                                                    bgcolor: position.isActive 
                                                        ? alpha('#2e7d32', 0.1)
                                                        : alpha('#757575', 0.1),
                                                    color: position.isActive ? 'success.main' : 'grey.700',
                                                    border: '1px solid',
                                                    borderColor: position.isActive 
                                                        ? alpha('#2e7d32', 0.3)
                                                        : alpha('#757575', 0.3)
                                                }}
                                            />
                                        }
                                        sx={{ pb: 1.5, minHeight: 100 }}
                                    />
                                    <Divider />
                                    <CardContent sx={{ pt: 2, pb: 1.5, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                                        <Box sx={{ 
                                            p: 1.5,
                                            borderRadius: 1.5,
                                            bgcolor: 'background.default',
                                            mb: 1.5,
                                            minHeight: 56
                                        }}>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                                CODE
                                            </Typography>
                                            <Typography 
                                                variant="body1" 
                                                sx={{ 
                                                    fontWeight: 700,
                                                    fontFamily: 'monospace',
                                                    color: position.isActive ? 'success.main' : 'grey.700',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}
                                            >
                                                {position.code}
                                            </Typography>
                                        </Box>
                                        <Box sx={{ 
                                            p: 1.5,
                                            borderRadius: 1.5,
                                            bgcolor: 'background.default',
                                            mb: 1.5,
                                            minHeight: 56
                                        }}>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                                DEPARTMENT
                                            </Typography>
                                            <Typography 
                                                variant="body2" 
                                                sx={{ 
                                                    fontWeight: 500,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}
                                            >
                                                {position.department?.name || '-'}
                                            </Typography>
                                        </Box>
                                        <Box sx={{ 
                                            p: 1.5,
                                            borderRadius: 1.5,
                                            bgcolor: 'background.default',
                                            minHeight: 56
                                        }}>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                                ARABIC NAME
                                            </Typography>
                                            <Typography 
                                                variant="body2" 
                                                dir="rtl"
                                                sx={{ 
                                                    fontWeight: 500,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}
                                            >
                                                {position.arabicTitle || '-'}
                                            </Typography>
                                        </Box>
                                    </CardContent>
                                    <Divider />
                                    <Box sx={{ 
                                        p: 1.5,
                                        display: 'flex',
                                        justifyContent: 'flex-end',
                                        gap: 1,
                                        bgcolor: 'action.hover'
                                    }}>
                                        <Tooltip title="Edit Position" arrow>
                                            <IconButton
                                                size="small"
                                                onClick={() => handleOpenDialog(position)}
                                                sx={{
                                                    color: 'primary.main',
                                                    borderRadius: 1.5,
                                                    transition: 'all 0.2s',
                                                    '&:hover': { 
                                                        bgcolor: 'primary.main',
                                                        color: 'white',
                                                        transform: 'scale(1.1)'
                                                    }
                                                }}
                                            >
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Delete Position" arrow>
                                            <IconButton
                                                size="small"
                                                onClick={() => {
                                                    setSelectedPosition(position);
                                                    setOpenConfirm(true);
                                                }}
                                                sx={{
                                                    color: 'error.main',
                                                    borderRadius: 1.5,
                                                    transition: 'all 0.2s',
                                                    '&:hover': { 
                                                        bgcolor: 'error.main',
                                                        color: 'white',
                                                        transform: 'scale(1.1)'
                                                    }
                                                }}
                                            >
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                </Card>
                        </Fade>
                    ))}
                </Box>
            )}

            {/* Dialog */}
            <Dialog 
                open={openDialog} 
                onClose={handleCloseDialog} 
                maxWidth="sm" 
                fullWidth
                slots={{ transition: Fade }}
                slotProps={{
                    paper: {
                        sx: {
                            borderRadius: 2.5,
                            boxShadow: 8
                        }
                    }
                }}
            >
                <DialogTitle sx={{ 
                    pb: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5
                }}>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                        <WorkIcon />
                    </Avatar>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {selectedPosition ? 'Edit Position' : 'New Position'}
                    </Typography>
                </DialogTitle>
                <Divider />
                <DialogContent sx={{ pt: 3 }}>
                    <Stack spacing={2.5}>
                        {selectedPosition && (
                            <TextField
                                label="Position Code"
                                name="code"
                                value={formData.code}
                                disabled
                                fullWidth
                                helperText="Auto-generated"
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                            />
                        )}
                        <TextField
                            label="Position Title (English)"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            required
                            fullWidth
                            placeholder="e.g., Software Engineer"
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        />
                        <TextField
                            label="Position Title (Arabic)"
                            name="arabicTitle"
                            value={formData.arabicTitle}
                            onChange={handleChange}
                            fullWidth
                            dir="rtl"
                            placeholder="المسمى الوظيفي بالعربية"
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        />
                        <TextField
                            select
                            label="Department"
                            name="department"
                            value={formData.department}
                            onChange={handleChange}
                            required
                            fullWidth
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        >
                            {departments.map((dept) => (
                                <MenuItem key={dept._id} value={dept._id}>
                                    {dept.name}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            select
                            label="Level (Optional)"
                            name="level"
                            value={formData.level}
                            onChange={handleChange}
                            fullWidth
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        >
                            <MenuItem value="">None</MenuItem>
                            {levels.map((level) => (
                                <MenuItem key={level} value={level}>
                                    {level}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            label="Description (Optional)"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            multiline
                            rows={3}
                            fullWidth
                            placeholder="Position description..."
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        />
                        <TextField
                            select
                            label="Status"
                            name="isActive"
                            value={formData.isActive}
                            onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.value === 'true' }))}
                            fullWidth
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        >
                            <MenuItem value="true">
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main' }} />
                                    <span>Active</span>
                                </Stack>
                            </MenuItem>
                            <MenuItem value="false">
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'grey.400' }} />
                                    <span>Inactive</span>
                                </Stack>
                            </MenuItem>
                        </TextField>
                    </Stack>
                </DialogContent>
                <Divider />
                <DialogActions sx={{ p: 2.5 }}>
                    <Button 
                        onClick={handleCloseDialog}
                        sx={{ textTransform: 'none', borderRadius: 2 }}
                    >
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleSubmit} 
                        variant="contained"
                        sx={{ 
                            textTransform: 'none',
                            borderRadius: 2,
                            px: 3,
                            fontWeight: 600
                        }}
                    >
                        {selectedPosition ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            <ConfirmDialog
                open={openConfirm}
                title="Delete Position"
                message={`Are you sure you want to delete "${selectedPosition?.title}"?`}
                onConfirm={handleDelete}
                onCancel={() => {
                    setOpenConfirm(false);
                    setSelectedPosition(null);
                }}
            />
        </Box>
    );
};

export default PositionsPage;
