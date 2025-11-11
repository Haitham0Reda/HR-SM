import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Typography,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Grid,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import DataTable from '../../components/common/DataTable';
import Loading from '../../components/common/Loading';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { schoolService } from '../../services';
import { useNotification } from '../../context/NotificationContext';

const SchoolsPage = () => {
    const [schools, setSchools] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedSchool, setSelectedSchool] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        schoolCode: '',
        arabicName: '',
        address: '',
        phoneNumber: '',
        email: '',
    });
    const { showSuccess, showError } = useNotification();

    useEffect(() => {
        fetchSchools();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchSchools = async () => {
        try {
            setLoading(true);
            const data = await schoolService.getAll();
            setSchools(data);
        } catch (error) {
            showError('Failed to load schools');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (school = null) => {
        if (school) {
            setSelectedSchool(school);
            setFormData({
                name: school.name || '',
                schoolCode: school.schoolCode || '',
                arabicName: school.arabicName || '',
                address: school.address || '',
                phoneNumber: school.phoneNumber || '',
                email: school.email || '',
            });
        } else {
            setSelectedSchool(null);
            setFormData({
                name: '',
                schoolCode: '',
                arabicName: '',
                address: '',
                phoneNumber: '',
                email: '',
            });
        }
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setSelectedSchool(null);
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async () => {
        try {
            if (selectedSchool) {
                await schoolService.update(selectedSchool._id, formData);
                showSuccess('School updated successfully');
            } else {
                await schoolService.create(formData);
                showSuccess('School created successfully');
            }
            handleCloseDialog();
            fetchSchools();
        } catch (error) {
            showError(error || 'Failed to save school');
        }
    };

    const handleDelete = async () => {
        try {
            await schoolService.delete(selectedSchool._id);
            showSuccess('School deleted successfully');
            setDeleteDialogOpen(false);
            setSelectedSchool(null);
            fetchSchools();
        } catch (error) {
            showError('Failed to delete school');
        }
    };

    const columns = [
        { field: 'schoolCode', headerName: 'Code' },
        { field: 'name', headerName: 'Name' },
        { field: 'arabicName', headerName: 'Arabic Name' },
        { field: 'email', headerName: 'Email' },
        { field: 'phoneNumber', headerName: 'Phone' },
    ];

    if (loading) return <Loading />;

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" fontWeight="bold">
                    Schools
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                >
                    Add School
                </Button>
            </Box>

            <DataTable
                columns={columns}
                data={schools}
                onEdit={handleOpenDialog}
                onDelete={(school) => {
                    setSelectedSchool(school);
                    setDeleteDialogOpen(true);
                }}
                emptyMessage="No schools found. Click 'Add School' to create one."
            />

            <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
                <DialogTitle>{selectedSchool ? 'Edit School' : 'Create School'}</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="School Code"
                                name="schoolCode"
                                value={formData.schoolCode}
                                onChange={handleChange}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Arabic Name"
                                name="arabicName"
                                value={formData.arabicName}
                                onChange={handleChange}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Address"
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                multiline
                                rows={2}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Email"
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Phone Number"
                                name="phoneNumber"
                                value={formData.phoneNumber}
                                onChange={handleChange}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleSubmit} variant="contained">
                        {selectedSchool ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            <ConfirmDialog
                open={deleteDialogOpen}
                title="Delete School"
                message={`Are you sure you want to delete ${selectedSchool?.name}? This action cannot be undone.`}
                onConfirm={handleDelete}
                onCancel={() => {
                    setDeleteDialogOpen(false);
                    setSelectedSchool(null);
                }}
                confirmText="Delete"
                confirmColor="error"
            />
        </Box>
    );
};

export default SchoolsPage;
