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
    Business as BusinessIcon,
    FilterList as FilterListIcon,
    Clear as ClearIcon,
    TrendingUp as TrendingUpIcon,
    Category as CategoryIcon
} from '@mui/icons-material';
import Loading from '../../components/common/Loading';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useNotification } from '../../context/NotificationContext';
import departmentService from '../../services/department.service';


const DepartmentsPage = () => {
    const [departments, setDepartments] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [openConfirm, setOpenConfirm] = useState(false);
    const [selectedDepartment, setSelectedDepartment] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        arabicName: '',
        code: '',
        isActive: true
    });
    const { showNotification } = useNotification();

    useEffect(() => {
        fetchDepartments();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchDepartments = async () => {
        try {
            setLoading(true);
            const response = await departmentService.getAll();
            // Handle the response format { success: true, data: departments }
            const departments = response?.data || response || [];
            setDepartments(Array.isArray(departments) ? departments : []);
        } catch (error) {
            console.error('Failed to fetch departments:', error);
            showNotification('Failed to fetch departments', 'error');
            setDepartments([]); // Ensure departments is always an array
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (department = null) => {
        if (department) {
            setSelectedDepartment(department);
            setFormData({
                name: department.name,
                arabicName: department.arabicName || '',
                code: department.code,
                isActive: department.isActive !== false
            });
        } else {
            setSelectedDepartment(null);
            setFormData({
                name: '',
                arabicName: '',
                code: '',
                isActive: true
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setSelectedDepartment(null);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async () => {
        try {
            if (selectedDepartment) {
                await departmentService.update(selectedDepartment._id, formData);
                showNotification('Department updated successfully', 'success');
            } else {
                await departmentService.create(formData);
                showNotification('Department created successfully', 'success');
            }
            handleCloseDialog();
            fetchDepartments();
        } catch (error) {
            showNotification(error.response?.data?.message || 'Operation failed', 'error');
        }
    };

    const handleDelete = async () => {
        try {
            await departmentService.delete(selectedDepartment._id);
            showNotification('Department deleted successfully', 'success');
            setOpenConfirm(false);
            setSelectedDepartment(null);
            fetchDepartments();
        } catch (error) {
            showNotification(error.response?.data?.message || 'Delete failed', 'error');
        }
    };

    const filteredDepartments = useMemo(() => {
        return (Array.isArray(departments) ? departments : []).filter(dept => {
            const matchesSearch = searchTerm === '' ||
                dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                dept.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (dept.arabicName && dept.arabicName.includes(searchTerm));

            const matchesStatus = statusFilter === 'all' ||
                (statusFilter === 'active' && dept.isActive) ||
                (statusFilter === 'inactive' && !dept.isActive);

            return matchesSearch && matchesStatus;
        });
    }, [departments, searchTerm, statusFilter]);

    const stats = useMemo(() => {
        const deptArray = Array.isArray(departments) ? departments : [];
        return {
            total: deptArray.length,
            active: deptArray.filter(d => d.isActive).length,
            inactive: deptArray.filter(d => !d.isActive).length
        };
    }, [departments]);

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
                            <BusinessIcon sx={{ fontSize: 32 }} />
                        </Avatar>
                        <Box>
                            <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                                Departments
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                Manage and organize your departments
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
                        New Department
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
                                borderColor: 'divider',
                                boxShadow: 2
                            }
                        }}
                    >
                        <Stack direction="row" spacing={2} alignItems="center">
                            <Avatar sx={{
                                bgcolor: 'action.hover',
                                color: 'text.secondary',
                                width: 48,
                                height: 48
                            }}>
                                <BusinessIcon />
                            </Avatar>
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                    Inactive
                                </Typography>
                                <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.secondary' }}>
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
                    <Grid size={{ xs: 12, md: 8 }}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Search departments..."
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
                    <Grid size={{ xs: 12, md: 4 }}>
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
                    {filteredDepartments.length} {filteredDepartments.length === 1 ? 'department' : 'departments'} found
                </Typography>
                {(searchTerm || statusFilter !== 'all') && (
                    <Button
                        size="small"
                        startIcon={<ClearIcon />}
                        onClick={() => {
                            setSearchTerm('');
                            setStatusFilter('all');
                        }}
                        sx={{ textTransform: 'none' }}
                    >
                        Clear filters
                    </Button>
                )}
            </Box>

            {/* Departments Grid */}
            {filteredDepartments.length === 0 ? (
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
                    <BusinessIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                        No departments found
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {searchTerm || statusFilter !== 'all'
                            ? 'Try adjusting your filters'
                            : 'Create your first department to get started'}
                    </Typography>
                </Paper>
            ) : (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2.5, justifyContent: 'center' }}>
                    {filteredDepartments.map((department, index) => (
                        <Fade in timeout={200 + (index * 30)} key={department._id}>
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
                                        borderColor: department.isActive ? 'success.main' : 'divider',
                                        boxShadow: 3,
                                        transform: 'translateY(-4px)'
                                    }
                                }}
                            >
                                <CardHeader
                                    avatar={
                                        <Avatar sx={{
                                            bgcolor: department.isActive
                                                ? alpha('#2e7d32', 0.1)
                                                : 'action.hover',
                                            color: department.isActive ? 'success.main' : 'text.secondary'
                                        }}>
                                            <BusinessIcon />
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
                                            {department.name}
                                        </Typography>
                                    }
                                    subheader={
                                        <Chip
                                            label={department.isActive ? 'Active' : 'Inactive'}
                                            size="small"
                                            sx={{
                                                mt: 0.5,
                                                height: 20,
                                                fontSize: '0.7rem',
                                                fontWeight: 600,
                                                bgcolor: department.isActive
                                                    ? alpha('#2e7d32', 0.1)
                                                    : 'action.hover',
                                                color: department.isActive ? 'success.main' : 'text.secondary',
                                                border: '1px solid',
                                                borderColor: department.isActive
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
                                                color: department.isActive ? 'success.main' : 'text.secondary',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            {department.code}
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
                                            {department.arabicName || '-'}
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
                                    <Tooltip title="Edit Department" arrow>
                                        <IconButton
                                            size="small"
                                            onClick={() => handleOpenDialog(department)}
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
                                    <Tooltip title="Delete Department" arrow>
                                        <IconButton
                                            size="small"
                                            onClick={() => {
                                                setSelectedDepartment(department);
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
                        <BusinessIcon />
                    </Avatar>
                    <Typography variant="h6" component="span" sx={{ fontWeight: 600 }}>
                        {selectedDepartment ? 'Edit Department' : 'New Department'}
                    </Typography>
                </DialogTitle>
                <Divider />
                <DialogContent sx={{ pt: 3 }}>
                    <Stack spacing={2.5}>
                        {selectedDepartment && (
                            <TextField
                                label="Department Code"
                                name="code"
                                value={formData.code}
                                onChange={handleChange}
                                fullWidth
                                placeholder="e.g., 001, 002"
                                helperText="Leave empty to auto-generate"
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                            />
                        )}
                        <TextField
                            label="Department Name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            fullWidth
                            placeholder="e.g., Information Technology"
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        />
                        <TextField
                            label="Arabic Name (Optional)"
                            name="arabicName"
                            value={formData.arabicName}
                            onChange={handleChange}
                            fullWidth
                            dir="rtl"
                            placeholder="الاسم بالعربية"
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
                                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'action.disabled' }} />
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
                        {selectedDepartment ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            <ConfirmDialog
                open={openConfirm}
                title="Delete Department"
                message={`Are you sure you want to delete "${selectedDepartment?.name}"?`}
                onConfirm={handleDelete}
                onCancel={() => {
                    setOpenConfirm(false);
                    setSelectedDepartment(null);
                }}
            />
        </Box>
    );
};

export default DepartmentsPage;
