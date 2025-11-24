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
import positionService from '../../services/position.service';
import departmentService from '../../services/department.service';

const PositionsPage = () => {
    const [positions, setPositions] = useState([]);
    const [departments, setDepartments] = useState([]);
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
            console.error('Failed to fetch departments:', error);
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
            // Validate required fields
            if (!formData.department) {
                showNotification('Please select a department', 'error');
                return;
            }

            // Clean up the data before sending
            const submitData = {
                ...formData,
                // Remove empty strings for optional fields
                level: formData.level || undefined,
                description: formData.description || undefined,
                arabicTitle: formData.arabicTitle || undefined,
            };

            // Remove code field for new positions (let backend generate it)
            if (!selectedPosition) {
                delete submitData.code;
            }

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

    const columns = [
        { 
            field: 'no', 
            headerName: 'No',
            renderCell: (row, index) => index + 1
        },
        { field: 'code', headerName: 'Code' },
        { field: 'title', headerName: 'Name (English)' },
        {
            field: 'arabicTitle',
            headerName: 'Name (Arabic)',
            renderCell: (row) => row.arabicTitle || 'N/A'
        },
        {
            field: 'department',
            headerName: 'Department',
            renderCell: (row) => row.department?.name || 'N/A'
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
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">Positions</Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                >
                    Add Position
                </Button>
            </Box>

            <DataTable
                data={positions}
                columns={columns}
                onEdit={handleOpenDialog}
                onDelete={(position) => {
                    setSelectedPosition(position);
                    setOpenConfirm(true);
                }}
            />

            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {selectedPosition ? 'Edit Position' : 'Add Position'}
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                        {selectedPosition && (
                            <TextField
                                label="Position Code"
                                name="code"
                                value={formData.code}
                                disabled
                                fullWidth
                                helperText="Auto-generated"
                            />
                        )}
                        <TextField
                            label="Position Title (English)"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            required
                            fullWidth
                        />
                        <TextField
                            label="Position Title (Arabic)"
                            name="arabicTitle"
                            value={formData.arabicTitle}
                            onChange={handleChange}
                            fullWidth
                            dir="rtl"
                        />
                        <TextField
                            select
                            label="Department"
                            name="department"
                            value={formData.department}
                            onChange={handleChange}
                            required
                            fullWidth
                        >
                            {departments.map((dept) => (
                                <MenuItem key={dept._id} value={dept._id}>
                                    {dept.name}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            select
                            label="Level"
                            name="level"
                            value={formData.level}
                            onChange={handleChange}
                            fullWidth
                        >
                            {levels.map((level) => (
                                <MenuItem key={level} value={level}>
                                    {level}
                                </MenuItem>
                            ))}
                        </TextField>
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
                        {selectedPosition ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            <ConfirmDialog
                open={openConfirm}
                title="Delete Position"
                message={`Are you sure you want to delete "${selectedPosition?.title}"?`}
                onCancel={() => {
                    setOpenConfirm(false);
                    setSelectedPosition(null);
                }}
                onConfirm={handleDelete}
            />
        </Box>
    );
};

export default PositionsPage;
