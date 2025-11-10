import React, { useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    TextField,
    Button,
    Grid,
    Divider,
    Stack,
} from '@mui/material';
import { Save, Lock } from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';

export default function SettingsPage() {
    const { user } = useAuth();
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            alert('New passwords do not match!');
            return;
        }
        try {
            // Add password change logic here
            console.log('Changing password...');
            alert('Password changed successfully!');
            setPasswordData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: '',
            });
        } catch (error) {
            console.error('Error changing password:', error);
            alert('Failed to change password');
        }
    };

    return (
        <Box sx={{ p: { xs: 2, sm: 3, md: 4 }, maxWidth: 1400, mx: 'auto' }}>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, mb: 1 }}>
                    Settings
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Manage your account settings and security preferences
                </Typography>
            </Box>

            <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
                                <Box
                                    sx={{
                                        p: 1,
                                        borderRadius: 2,
                                        backgroundColor: 'primary.main',
                                        color: 'primary.contrastText',
                                        display: 'flex',
                                    }}
                                >
                                    <Lock />
                                </Box>
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                    Change Password
                                </Typography>
                            </Stack>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                Ensure your account is using a strong password
                            </Typography>
                            <Divider sx={{ mb: 4 }} />
                            <form onSubmit={handlePasswordSubmit}>
                                <Stack spacing={3}>
                                    <TextField
                                        fullWidth
                                        label="Current Password"
                                        name="currentPassword"
                                        type="password"
                                        value={passwordData.currentPassword}
                                        onChange={handlePasswordChange}
                                        required
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                backgroundColor: 'background.default',
                                            },
                                        }}
                                    />
                                    <TextField
                                        fullWidth
                                        label="New Password"
                                        name="newPassword"
                                        type="password"
                                        value={passwordData.newPassword}
                                        onChange={handlePasswordChange}
                                        required
                                        helperText="Must be at least 8 characters"
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                backgroundColor: 'background.default',
                                            },
                                        }}
                                    />
                                    <TextField
                                        fullWidth
                                        label="Confirm New Password"
                                        name="confirmPassword"
                                        type="password"
                                        value={passwordData.confirmPassword}
                                        onChange={handlePasswordChange}
                                        required
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                backgroundColor: 'background.default',
                                            },
                                        }}
                                    />
                                    <Stack direction="row" spacing={2}>
                                        <Button
                                            type="submit"
                                            variant="contained"
                                            startIcon={<Save />}
                                            size="large"
                                            sx={{ px: 4 }}
                                        >
                                            Update Password
                                        </Button>
                                        <Button
                                            variant="outlined"
                                            size="large"
                                            onClick={() =>
                                                setPasswordData({
                                                    currentPassword: '',
                                                    newPassword: '',
                                                    confirmPassword: '',
                                                })
                                            }
                                        >
                                            Cancel
                                        </Button>
                                    </Stack>
                                </Stack>
                            </form>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}
