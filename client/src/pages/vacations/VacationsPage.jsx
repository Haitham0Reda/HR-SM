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
    Grid,
    Alert
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import DataTable from '../../components/common/DataTable';
import Loading from '../../components/common/Loading';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useNotification } from '../../context/NotificationContext';
import vacationService from '../../services/vacation.service';
import userService from '../../services/user.service';

const VacationsPage = () => {
    const [vacations, setVacations] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [openConfirm, setOpenConfirm] = useState(false);
    const [selectedVacation, setSelectedVacation] = useState(null);
    const [formData, setFormData] = useState({
        user: '',
        year: new Date().getFullYear(),
        totalDays: 0,
        usedDays: 0,
        remainingDays: 0,
        carryOverDays: 0,
        notes: ''
    });
    const { showNotification } = useNotification();

    useEffect(() => {
        fetchVacations();
        fetchUsers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchVacations = async () => {
        try {
            setLoading(true);
            const data = await vacationService.getAll();
            // Filter to show only annual, casual, sick, and unpaid vacation types
            const filteredData = data.filter(vacation => 
                ['annual', 'casual', 'sick', 'unpaid'].includes(vacation.type)
            );
            setVacations(filteredData);
        } catch (error) {
            showNotification('Failed to fetch vacation records', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const data = await userService.getAll();
            setUsers(data);
        } catch (error) {
            console.error('Failed to fetch users:', error);
        }
    };

    const calculateRemainingDays = (total, used, carryOver) => {
        return parseFloat(total || 0) + parseFloat(carryOver || 0) - parseFloat(used || 0);
    };

    const handleOpenDialog = (vacation = null) => {
        if (vacation) {
            setSelectedVacation(vacation);
            setFormData({
                user: vacation.user?._id || vacation.user || '',
                year: vacation.year || new Date().getFullYear(),
                totalDays: vacation.totalDays || 0,
                usedDays: vacation.usedDays || 0,
                remainingDays: vacation.remainingDays || 0,
                carryOverDays: vacation.carryOverDays || 0,
                notes: vacation.notes || ''
            });
        } else {
            setSelectedVacation(null);
            setFormData({
                user: '',
                year: new Date().getFullYear(),
                totalDays: 0,
                usedDays: 0,
                remainingDays: 0,
                carryOverDays: 0,
                notes: ''
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setSelectedVacation(null);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        const newFormData = { ...formData, [name]: value };

        // Auto-calculate remaining days
        if (name === 'totalDays' || name === 'usedDays' || name === 'carryOverDays') {
            newFormData.remainingDays = calculateRemainingDays(
                newFormData.totalDays,
                newFormData.usedDays,
                newFormData.carryOverDays
            );
        }

        setFormData(newFormData);
    };

    const handleSubmit = async () => {
        try {
            const submitData = {
                ...formData,
                remainingDays: calculateRemainingDays(formData.totalDays, formData.usedDays, formData.carryOverDays)
            };

            if (selectedVacation) {
                await vacationService.update(selectedVacation._id, submitData);
                showNotification('Vacation record updated successfully', 'success');
            } else {
                await vacationService.create(submitData);
                showNotification('Vacation record created successfully', 'success');
            }
            handleCloseDialog();
            fetchVacations();
        } catch (error) {
            showNotification(error.response?.data?.message || 'Operation failed', 'error');
        }
    };

    const handleDelete = async () => {
        try {
            await vacationService.delete(selectedVacation._id);
            showNotification('Vacation record deleted successfully', 'success');
            setOpenConfirm(false);
            setSelectedVacation(null);
            fetchVacations();
        } catch (error) {
            showNotification(error.response?.data?.message || 'Delete failed', 'error');
        }
    };

    const columns = [
        {
            field: 'user',
            headerName: 'Employee',
            width: 200,
            renderCell: (params) => params.row.user?.name || 'N/A'
        },
        { field: 'year', headerName: 'Year', width: 100 },
        {
            field: 'type',
            headerName: 'Type',
            width: 120,
            renderCell: (params) => (
                <Chip 
                    label={params.row.type || 'annual'} 
                    size="small" 
                    variant="outlined" 
                />
            )
        },
        {
            field: 'totalDays',
            headerName: 'Total Days',
            width: 120,
            renderCell: (params) => `${params.row.totalDays} days`
        },
        {
            field: 'carryOverDays',
            headerName: 'Carry Over',
            width: 120,
            renderCell: (params) => `${params.row.carryOverDays || 0} days`
        },
        {
            field: 'usedDays',
            headerName: 'Used Days',
            width: 120,
            renderCell: (params) => `${params.row.usedDays} days`
        },
        {
            field: 'remainingDays',
            headerName: 'Remaining',
            width: 120,
            renderCell: (params) => (
                <Chip
                    label={`${params.row.remainingDays} days`}
                    color={params.row.remainingDays > 5 ? 'success' : params.row.remainingDays > 0 ? 'warning' : 'error'}
                    size="small"
                />
            )
        },
        { field: 'notes', headerName: 'Notes', width: 200 },
        {
            field: 'actions',
            headerName: 'Actions',
            width: 120,
            renderCell: (params) => (
                <Box>
                    <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(params.row)}
                        color="primary"
                    >
                        <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                        size="small"
                        onClick={() => {
                            setSelectedVacation(params.row);
                            setOpenConfirm(true);
                        }}
                        color="error"
                    >
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                </Box>
            )
        }
    ];

    if (loading) return <Loading />;

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">Annual, Casual, Sick & Unpaid Vacation</Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                >
                    Add Vacation Record
                </Button>
            </Box>

            <Box sx={{ mb: 3 }}>
                <Alert severity="warning">
                    <Typography variant="body2">
                        <strong>Important:</strong> Sick vacation requests must be approved by a doctor.
                        HR can view sick vacation requests but cannot approve or reject them.
                    </Typography>
                </Alert>
            </Box>

            <DataTable
                data={vacations}
                columns={columns}
            />

            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {selectedVacation ? 'Edit Vacation Record' : 'Add Vacation Record'}
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                        <TextField
                            select
                            label="Employee"
                            name="user"
                            value={formData.user}
                            onChange={handleChange}
                            required
                            fullWidth
                        >
                            {users.map((user) => (
                                <MenuItem key={user._id} value={user._id}>
                                    {user.name} - {user.email}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            type="number"
                            label="Year"
                            name="year"
                            value={formData.year}
                            onChange={handleChange}
                            required
                            fullWidth
                        />
                        <TextField
                            select
                            label="Vacation Type"
                            name="type"
                            value={formData.type || 'annual'}
                            onChange={handleChange}
                            required
                            fullWidth
                        >
                            <MenuItem value="annual">Annual</MenuItem>
                            <MenuItem value="casual">Casual</MenuItem>
                            <MenuItem value="sick">Sick</MenuItem>
                            <MenuItem value="unpaid">Unpaid</MenuItem>
                        </TextField>
                        <Grid container spacing={2}>
                            <Grid item xs={6}>
                                <TextField
                                    type="number"
                                    label="Total Days Allocated"
                                    name="totalDays"
                                    value={formData.totalDays}
                                    onChange={handleChange}
                                    required
                                    fullWidth
                                    inputProps={{ step: '0.5', min: '0' }}
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <TextField
                                    type="number"
                                    label="Carry Over Days"
                                    name="carryOverDays"
                                    value={formData.carryOverDays}
                                    onChange={handleChange}
                                    fullWidth
                                    inputProps={{ step: '0.5', min: '0' }}
                                    helperText="From previous year"
                                />
                            </Grid>
                        </Grid>
                        <TextField
                            type="number"
                            label="Used Days"
                            name="usedDays"
                            value={formData.usedDays}
                            onChange={handleChange}
                            fullWidth
                            inputProps={{ step: '0.5', min: '0' }}
                        />
                        <TextField
                            label="Remaining Days"
                            value={`${calculateRemainingDays(formData.totalDays, formData.usedDays, formData.carryOverDays)} days`}
                            disabled
                            fullWidth
                            sx={{ bgcolor: 'action.hover' }}
                        />
                        <TextField
                            label="Notes"
                            name="notes"
                            value={formData.notes}
                            onChange={handleChange}
                            multiline
                            rows={2}
                            fullWidth
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleSubmit} variant="contained">
                        {selectedVacation ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            <ConfirmDialog
                open={openConfirm}
                title="Delete Vacation Record"
                message="Are you sure you want to delete this vacation record?"
                onConfirm={handleDelete}
                onCancel={() => {
                    setOpenConfirm(false);
                    setSelectedVacation(null);
                }}
            />
        </Box>
    );
};

export default VacationsPage;