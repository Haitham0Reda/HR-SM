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
        <Box
            sx={{
                p: { xs: 2, sm: 3 },
                maxWidth: 1600,
                mx: 'auto',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 3,
                    flexWrap: 'wrap',
                    gap: 2,
                }}
            >
                <Box sx={{ flex: 1, minWidth: 200 }}>
                    <Typography
                        variant="h4"
                        component="h1"
                        sx={{ 
                            fontWeight: 700, 
                            mb: 1, 
                            color: 'text.primary',
                            fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' }
                        }}
                    >
                        Schools
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                    size="large"
                    sx={{ 
                        px: { xs: 2, sm: 3 },
                        py: { xs: 1, sm: 1.5 },
                        flexShrink: 0,
                        minWidth: { xs: 120, sm: 140 }
                    }}
                >
                    Add School
                </Button>
            </Box>

            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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
            </Box>

            <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
                <DialogTitle>{selectedSchool ? 'Edit School' : 'Create School'}</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                            <TextField
                                sx={{ flex: 1, minWidth: 200 }}
                                label="School Code"
                                name="schoolCode"
                                value={formData.schoolCode}
                                onChange={handleChange}
                                required
                            />
                            <TextField
                                sx={{ flex: 1, minWidth: 200 }}
                                label="Name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                            />
                        </Box>
                        
                        <TextField
                            fullWidth
                            label="Arabic Name"
                            name="arabicName"
                            value={formData.arabicName}
                            onChange={handleChange}
                        />
                        
                        <TextField
                            fullWidth
                            label="Address"
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            multiline
                            rows={2}
                        />
                        
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                            <TextField
                                sx={{ flex: 1, minWidth: 200 }}
                                label="Email"
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                            />
                            <TextField
                                sx={{ flex: 1, minWidth: 200 }}
                                label="Phone Number"
                                name="phoneNumber"
                                value={formData.phoneNumber}
                                onChange={handleChange}
                            />
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, width: '100%' }}>
                        <Button 
                            onClick={handleCloseDialog}
                            sx={{ minWidth: 100 }}
                        >
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleSubmit} 
                            variant="contained"
                            sx={{ minWidth: 100 }}
                        >
                            {selectedSchool ? 'Update' : 'Create'}
                        </Button>
                    </Box>
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
