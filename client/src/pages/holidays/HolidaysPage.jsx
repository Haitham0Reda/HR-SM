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
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import DataTable from '../../components/common/DataTable';
import Loading from '../../components/common/Loading';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useNotification } from '../../context/NotificationContext';
import holidayService from '../../services/holiday.service';

const HolidaysPage = () => {
    const [holidays, setHolidays] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [openConfirm, setOpenConfirm] = useState(false);
    const [selectedHoliday, setSelectedHoliday] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        date: new Date().toISOString().split('T')[0],
        type: 'public',
        description: '',
        isRecurring: false
    });
    const { showNotification } = useNotification();

    const holidayTypes = ['public', 'religious', 'national', 'company', 'other'];

    useEffect(() => {
        fetchHolidays();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchHolidays = async () => {
        try {
            setLoading(true);
            const data = await holidayService.getAll();
            setHolidays(data);
        } catch (error) {
            showNotification('Failed to fetch holidays', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (holiday = null) => {
        if (holiday) {
            setSelectedHoliday(holiday);
            setFormData({
                name: holiday.name || '',
                date: holiday.date?.split('T')[0] || new Date().toISOString().split('T')[0],
                type: holiday.type || 'public',
                description: holiday.description || '',
                isRecurring: holiday.isRecurring || false
            });
        } else {
            setSelectedHoliday(null);
            setFormData({
                name: '',
                date: new Date().toISOString().split('T')[0],
                type: 'public',
                description: '',
                isRecurring: false
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setSelectedHoliday(null);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async () => {
        try {
            if (selectedHoliday) {
                await holidayService.update(selectedHoliday._id, formData);
                showNotification('Holiday updated successfully', 'success');
            } else {
                await holidayService.create(formData);
                showNotification('Holiday created successfully', 'success');
            }
            handleCloseDialog();
            fetchHolidays();
        } catch (error) {
            showNotification(error.response?.data?.message || 'Operation failed', 'error');
        }
    };

    const handleDelete = async () => {
        try {
            await holidayService.delete(selectedHoliday._id);
            showNotification('Holiday deleted successfully', 'success');
            setOpenConfirm(false);
            setSelectedHoliday(null);
            fetchHolidays();
        } catch (error) {
            showNotification(error.response?.data?.message || 'Delete failed', 'error');
        }
    };

    const columns = [
        { field: 'name', headerName: 'Holiday Name', width: 250 },
        {
            field: 'date',
            headerName: 'Date',
            width: 150,
            renderCell: (params) => new Date(params.row.date).toLocaleDateString('en-US', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            })
        },
        {
            field: 'type',
            headerName: 'Type',
            width: 120,
            renderCell: (params) => (
                <Chip label={params.row.type} size="small" variant="outlined" color="primary" />
            )
        },
        { field: 'description', headerName: 'Description', width: 300 },
        {
            field: 'isRecurring',
            headerName: 'Recurring',
            width: 120,
            renderCell: (params) => (
                <Chip
                    label={params.row.isRecurring ? 'Yes' : 'No'}
                    color={params.row.isRecurring ? 'success' : 'default'}
                    size="small"
                />
            )
        },
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
                            setSelectedHoliday(params.row);
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
                <Typography variant="h4">Holidays Calendar</Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                >
                    Add Holiday
                </Button>
            </Box>

            <DataTable
                rows={holidays}
                columns={columns}
                getRowId={(row) => row._id}
            />

            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {selectedHoliday ? 'Edit Holiday' : 'Add Holiday'}
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                        <TextField
                            label="Holiday Name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            fullWidth
                        />
                        <TextField
                            type="date"
                            label="Date"
                            name="date"
                            value={formData.date}
                            onChange={handleChange}
                            required
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                        />
                        <TextField
                            select
                            label="Holiday Type"
                            name="type"
                            value={formData.type}
                            onChange={handleChange}
                            required
                            fullWidth
                        >
                            {holidayTypes.map((type) => (
                                <MenuItem key={type} value={type}>
                                    {type.charAt(0).toUpperCase() + type.slice(1)}
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
                            label="Recurring Annually"
                            name="isRecurring"
                            value={formData.isRecurring}
                            onChange={(e) => setFormData(prev => ({ ...prev, isRecurring: e.target.value === 'true' }))}
                            fullWidth
                            helperText="If yes, this holiday will repeat every year"
                        >
                            <MenuItem value="true">Yes</MenuItem>
                            <MenuItem value="false">No</MenuItem>
                        </TextField>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleSubmit} variant="contained">
                        {selectedHoliday ? 'Update' : 'Add'}
                    </Button>
                </DialogActions>
            </Dialog>

            <ConfirmDialog
                open={openConfirm}
                title="Delete Holiday"
                message={`Are you sure you want to delete "${selectedHoliday?.name}"?`}
                onConfirm={handleDelete}
                onCancel={() => {
                    setOpenConfirm(false);
                    setSelectedHoliday(null);
                }}
            />
        </Box>
    );
};

export default HolidaysPage;
