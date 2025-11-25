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
import { Add as AddIcon } from '@mui/icons-material';
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
            const data = await departmentService.getAll();
            setDepartments(data);
        } catch (error) {
            showNotification('Failed to fetch departments', 'error');
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

    const columns = [
        { field: 'code', headerName: 'Code' },
        { field: 'name', headerName: 'Department Name' },
        { field: 'arabicName', headerName: 'Arabic Name', renderCell: (row) => row.arabicName || 'N/A' },
        {
            field: 'isActive',
            headerName: 'Status',
            renderCell: (row) => (
                <Chip
                    label={row.isActive ? 'Active' : 'Inactive'}
                    color={row.isActive ? 'success' : 'default'}
                    size="small"
                />
            )
        }
    ];

    if (loading) return <Loading />;

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">Departments</Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                >
                    Add Department
                </Button>
            </Box>

            <DataTable
                data={departments}
                columns={columns}
                onEdit={handleOpenDialog}
                onDelete={(department) => {
                    setSelectedDepartment(department);
                    setOpenConfirm(true);
                }}
                emptyMessage="No departments found. Click 'Add Department' to create one."
            />

            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {selectedDepartment ? 'Edit Department' : 'Add Department'}
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                        <TextField
                            label="Department Code"
                            name="code"
                            value={formData.code}
                            onChange={handleChange}
                            required
                            fullWidth
                        />
                        <TextField
                            label="Department Name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            fullWidth
                        />
                        <TextField
                            label="Arabic Name"
                            name="arabicName"
                            value={formData.arabicName}
                            onChange={handleChange}
                            fullWidth
                            dir="rtl"
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
