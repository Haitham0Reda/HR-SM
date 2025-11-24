import React, { useState, useEffect, useMemo } from 'react';
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
    InputAdornment
} from '@mui/material';
import { Add as AddIcon, Search as SearchIcon } from '@mui/icons-material';
import DataTable from '../../components/common/DataTable';
import Loading from '../../components/common/Loading';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useNotification } from '../../context/NotificationContext';
import departmentService from '../../services/department.service';

const DepartmentsPage = () => {
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [openConfirm, setOpenConfirm] = useState(false);
    const [selectedDepartment, setSelectedDepartment] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [formData, setFormData] = useState({
        name: '',
        arabicName: '',
        code: '',
        description: '',
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
            const data = await departmentService.getAll();
            setDepartments(data);
        } catch (error) {
            console.error('Fetch departments error:', error);
            showNotification(error?.message || 'Failed to fetch departments', 'error');
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
                description: department.description || '',
                isActive: department.isActive !== false
            });
        } else {
            setSelectedDepartment(null);
            setFormData({
                name: '',
                arabicName: '',
                code: '',
                description: '',
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
            console.error('Submit error:', error);
            const errorMessage = error?.message || error?.response?.data?.message || 'Operation failed';
            showNotification(errorMessage, 'error');
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
            console.error('Delete error:', error);
            const errorMessage = error?.message || error?.response?.data?.message || 'Delete failed';
            showNotification(errorMessage, 'error');
        }
    };

    // Filter and search departments
    const filteredDepartments = useMemo(() => {
        return departments.filter(dept => {
            // Status filter
            if (statusFilter === 'active' && !dept.isActive) return false;
            if (statusFilter === 'inactive' && dept.isActive) return false;

            // Search filter
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                return (
                    dept.name?.toLowerCase().includes(query) ||
                    dept.arabicName?.toLowerCase().includes(query) ||
                    dept.code?.toLowerCase().includes(query)
                );
            }

            return true;
        });
    }, [departments, searchQuery, statusFilter]);

    const columns = [
        { 
            field: 'no', 
            headerName: 'No',
            renderCell: (row, index) => index + 1
        },
        { field: 'code', headerName: 'Code' },
        { field: 'name', headerName: 'Name (English)' },
        {
            field: 'arabicName',
            headerName: 'Name (Arabic)',
            renderCell: (row) => row.arabicName || 'N/A'
        },
        {
            field: 'isActive',
            headerName: 'Status',
            renderCell: (row) => (
                <Chip
                    label={row.isActive ? 'Active' : 'Inactive'}
                    color={row.isActive ? 'success' : 'error'}
                    size="small"
                />
            )
        }
    ];

    if (loading) return <Loading />;

    return (
        <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            height: 'calc(100vh - 100px)',
            p: 3,
            gap: 2
        }}>
            <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                flexShrink: 0
            }}>
                <Typography variant="h4" sx={{ fontWeight: 600 }}>Departments</Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                    sx={{ px: 3 }}
                >
                    Add Department
                </Button>
            </Box>

            <Box sx={{ 
                flex: 1, 
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 2
            }}>
                {/* Search and Filter Bar */}
                <Box sx={{ 
                    display: 'flex', 
                    gap: 2,
                    px: 2,
                    flexShrink: 0
                }}>
                    <TextField
                        placeholder="Search by name, code..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        size="small"
                        sx={{ flex: 1, maxWidth: 400 }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon />
                                </InputAdornment>
                            ),
                        }}
                    />
                    <TextField
                        select
                        label="Status"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        size="small"
                        sx={{ minWidth: 150 }}
                    >
                        <MenuItem value="all">All</MenuItem>
                        <MenuItem value="active">Active</MenuItem>
                        <MenuItem value="inactive">Inactive</MenuItem>
                    </TextField>
                </Box>

                <DataTable
                    data={filteredDepartments}
                    columns={columns}
                    onEdit={handleOpenDialog}
                    onDelete={(dept) => {
                        setSelectedDepartment(dept);
                        setOpenConfirm(true);
                    }}
                    defaultRowsPerPage={8}
                    rowsPerPageOptions={[8, 16, 24]}
                />
            </Box>

            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {selectedDepartment ? 'Edit Department' : 'Add Department'}
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                        {selectedDepartment && (
                            <TextField
                                label="Department Code"
                                name="code"
                                value={formData.code}
                                disabled
                                fullWidth
                                helperText="Auto-generated"
                            />
                        )}
                        <TextField
                            label="Department Name (English)"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            fullWidth
                        />
                        <TextField
                            label="Department Name (Arabic)"
                            name="arabicName"
                            value={formData.arabicName}
                            onChange={handleChange}
                            fullWidth
                            dir="rtl"
                        />
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
