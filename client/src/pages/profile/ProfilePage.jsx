import React, { useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Avatar,
    Button,
    TextField,
    Grid,
    Stack,
    Divider,
} from '@mui/material';
import { PhotoCamera, Save } from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';

export default function ProfilePage() {
    const { user, updateUser } = useAuth();
    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        department: user?.department || '',
        position: user?.position || '',
    });
    const [profilePicture, setProfilePicture] = useState(user?.profilePicture || '');
    const [previewUrl, setPreviewUrl] = useState(user?.profilePicture || '');

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Create preview URL
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewUrl(reader.result);
                setProfilePicture(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Update user data including profile picture
            const updatedUser = {
                ...user,
                ...formData,
                profilePicture: profilePicture,
            };
            updateUser(updatedUser);
            alert('Profile updated successfully!');
        } catch (error) {
            console.error('Error updating profile:', error);
            alert('Failed to update profile');
        }
    };

    return (
        <Box sx={{ p: { xs: 2, sm: 3, md: 4 }, maxWidth: 1400, mx: 'auto' }}>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, mb: 1 }}>
                    My Profile
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Manage your personal information and profile picture
                </Typography>
            </Box>

            <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <Stack spacing={3} alignItems="center">
                                <Box
                                    sx={{
                                        position: 'relative',
                                        '&:hover .upload-overlay': {
                                            opacity: 1,
                                        },
                                    }}
                                >
                                    <Avatar
                                        src={previewUrl}
                                        alt={formData.name}
                                        sx={{
                                            width: 160,
                                            height: 160,
                                            fontSize: '3rem',
                                            border: '4px solid',
                                            borderColor: 'primary.main',
                                            boxShadow: 3,
                                        }}
                                    >
                                        {!previewUrl && formData.name
                                            ? formData.name.charAt(0).toUpperCase()
                                            : ''}
                                    </Avatar>
                                    <Box
                                        className="upload-overlay"
                                        sx={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            right: 0,
                                            bottom: 0,
                                            borderRadius: '50%',
                                            backgroundColor: 'rgba(0, 0, 0, 0.6)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            opacity: 0,
                                            transition: 'opacity 0.3s',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <PhotoCamera sx={{ color: 'white', fontSize: 40 }} />
                                    </Box>
                                </Box>
                                <Box sx={{ textAlign: 'center', width: '100%' }}>
                                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                                        {formData.name || 'User Name'}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                        {formData.position || 'Position'}
                                    </Typography>
                                </Box>
                                <input
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                    id="profile-picture-upload"
                                    type="file"
                                    onChange={handleImageChange}
                                />
                                <label htmlFor="profile-picture-upload" style={{ width: '100%' }}>
                                    <Button
                                        variant="outlined"
                                        component="span"
                                        startIcon={<PhotoCamera />}
                                        fullWidth
                                        sx={{ borderRadius: 2 }}
                                    >
                                        Change Photo
                                    </Button>
                                </label>
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ textAlign: 'center' }}
                                >
                                    JPG, PNG or GIF. Max size 2MB
                                </Typography>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={8}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 1 }}>
                                Personal Information
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                Update your personal details and contact information
                            </Typography>
                            <Divider sx={{ mb: 4 }} />
                            <form onSubmit={handleSubmit}>
                                <Grid container spacing={3}>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            label="Full Name"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleInputChange}
                                            required
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    backgroundColor: 'background.default',
                                                },
                                            }}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            label="Email Address"
                                            name="email"
                                            type="email"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            required
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    backgroundColor: 'background.default',
                                                },
                                            }}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            label="Phone Number"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleInputChange}
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    backgroundColor: 'background.default',
                                                },
                                            }}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            label="Department"
                                            name="department"
                                            value={formData.department}
                                            onChange={handleInputChange}
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    backgroundColor: 'background.default',
                                                },
                                            }}
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth
                                            label="Position / Job Title"
                                            name="position"
                                            value={formData.position}
                                            onChange={handleInputChange}
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    backgroundColor: 'background.default',
                                                },
                                            }}
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Stack direction="row" spacing={2}>
                                            <Button
                                                type="submit"
                                                variant="contained"
                                                startIcon={<Save />}
                                                size="large"
                                                sx={{ px: 4 }}
                                            >
                                                Save Changes
                                            </Button>
                                            <Button
                                                variant="outlined"
                                                size="large"
                                                onClick={() =>
                                                    setFormData({
                                                        name: user?.name || '',
                                                        email: user?.email || '',
                                                        phone: user?.phone || '',
                                                        department: user?.department || '',
                                                        position: user?.position || '',
                                                    })
                                                }
                                            >
                                                Cancel
                                            </Button>
                                        </Stack>
                                    </Grid>
                                </Grid>
                            </form>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}
