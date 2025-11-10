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
    MenuItem,
    Grid,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import DataTable from '../../components/common/DataTable';
import Loading from '../../components/common/Loading';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { userService } from '../../services';
import { useNotification } from '../../context/NotificationContext';

const UsersPage = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        role: 'employee',
        employeeId: '',
        profile: {
            firstName: '',
            lastName: '',
            phoneNumber: '',
        },
    });
    const { showSuccess, showError } = useNotification();

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const data = await userService.getAll();
            setUsers(data);
        } catch (error) {
            showError('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (user = null) => {
        if (user) {
            setSelectedUser(user);
            setFormData({
                username: user.username || '',
                email: user.email || '',
                password: '',
                role: user.role || 'employee',
                employeeId: user.employeeId || '',
                profile: {
                    firstName: user.profile?.firstName || '',
                    lastName: user.profile?.lastName || '',
                    phoneNumber: user.profile?.phoneNumber || '',
                },
            });
        } else {
            setSelectedUser(null);
            setFormData({
                username: '',
                email: '',
                password: '',
                role: 'employee',
                employeeId: '',
                profile: {
                    firstName: '',
                    lastName: '',
                    phoneNumber: '',
                },
            });
        }
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setSelectedUser(null);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name.startsWith('profile.')) {
            const field = name.split('.')[1];
            setFormData((prev) => ({
                ...prev,
                profile: {
                    ...prev.profile,
                    [field]: value,
                },
            }));
        } else {
            setFormData((prev) => ({
                ...prev,
                [name]: value,
            }));
        }
    };

    const handleSubmit = async () => {
        try {
            if (selectedUser) {
                await userService.update(selectedUser._id, formData);
                showSuccess('User updated successfully');
            } else {
                await userService.create(formData);
                showSuccess('User created successfully');
            }
            handleCloseDialog();
            fetchUsers();
        } catch (error) {
            showError(error || 'Failed to save user');
        }
    };

    const handleDelete = async () => {
        try {
            await userService.delete(selectedUser._id);
            showSuccess('User deleted successfully');
            setDeleteDialogOpen(false);
            setSelectedUser(null);
            fetchUsers();
        } catch (error) {
            showError('Failed to delete user');
        }
    };

    const columns = [
        { field: 'username', headerName: 'Username' },
        { field: 'email', headerName: 'Email' },
        { field: 'employeeId', headerName: 'Employee ID' },
        { field: 'role', headerName: 'Role' },
        {
            field: 'profile',
            headerName: 'Name',
            renderCell: (row) =>
                `${row.profile?.firstName || ''} ${row.profile?.lastName || ''}`.trim() || 'N/A',
        },
    ];

    if (loading) return <Loading />;

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" fontWeight="bold">
                    Users
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                >
                    Add User
                </Button>
            </Box>

            <DataTable
                columns={columns}
                data={users}
                onEdit={handleOpenDialog}
                onDelete={(user) => {
                    setSelectedUser(user);
                    setDeleteDialogOpen(true);
                }}
                emptyMessage="No users found. Click 'Add User' to create one."
            />

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
                <DialogTitle>{selectedUser ? 'Edit User' : 'Create User'}</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Username"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                required
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
                                required
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Password"
                                name="password"
                                type="password"
                                value={formData.password}
                                onChange={handleChange}
                                required={!selectedUser}
                                helperText={selectedUser ? 'Leave blank to keep current password' : ''}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                select
                                label="Role"
                                name="role"
                                value={formData.role}
                                onChange={handleChange}
                                required
                            >
                                <MenuItem value="employee">Employee</MenuItem>
                                <MenuItem value="manager">Manager</MenuItem>
                                <MenuItem value="hr">HR</MenuItem>
                                <MenuItem value="admin">Admin</MenuItem>
                            </TextField>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Employee ID"
                                name="employeeId"
                                value={formData.employeeId}
                                onChange={handleChange}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="First Name"
                                name="profile.firstName"
                                value={formData.profile.firstName}
                                onChange={handleChange}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Last Name"
                                name="profile.lastName"
                                value={formData.profile.lastName}
                                onChange={handleChange}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Phone Number"
                                name="profile.phoneNumber"
                                value={formData.profile.phoneNumber}
                                onChange={handleChange}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleSubmit} variant="contained">
                        {selectedUser ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                open={deleteDialogOpen}
                title="Delete User"
                message={`Are you sure you want to delete ${selectedUser?.username}? This action cannot be undone.`}
                onConfirm={handleDelete}
                onCancel={() => {
                    setDeleteDialogOpen(false);
                    setSelectedUser(null);
                }}
                confirmText="Delete"
                confirmColor="error"
            />
        </Box>
    );
};

export default UsersPage;
