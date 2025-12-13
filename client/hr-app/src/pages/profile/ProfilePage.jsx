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
    Alert,
    CircularProgress,
    Dialog,
    DialogContent,
    IconButton,
} from '@mui/material';
import { PhotoCamera, Save, Close } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import userService from '../../services/user.service';
import { getUserProfilePicture } from '../../utils/profilePicture';

export default function ProfilePage() {
    const { user, updateUser } = useAuth();
    const [formData, setFormData] = useState({
        name: user?.personalInfo?.fullName || user?.name || '',
        email: user?.email || '',
        phone: user?.personalInfo?.phone || user?.phone || '',
        department: user?.department?.name || '',
        position: user?.position?.title || '',
    });
    const [profilePicture, setProfilePicture] = useState(user?.personalInfo?.profilePicture || user?.profilePicture || '');
    const [previewUrl, setPreviewUrl] = useState(getUserProfilePicture(user));
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [openPreview, setOpenPreview] = useState(false);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const [profilePictureFile, setProfilePictureFile] = useState(null);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file size (2MB limit)
            if (file.size > 2 * 1024 * 1024) {
                setMessage({ type: 'error', text: 'File size must be less than 2MB' });
                return;
            }

            // Validate file type
            if (!file.type.startsWith('image/')) {
                setMessage({ type: 'error', text: 'Please select an image file' });
                return;
            }

            setProfilePictureFile(file);

            // Create preview URL
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewUrl(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            let profilePictureUrl = user?.personalInfo?.profilePicture || '';

            // Upload profile picture if a new file was selected
            if (profilePictureFile) {
                const formData = new FormData();
                formData.append('profilePicture', profilePictureFile);
                
                const uploadResponse = await userService.uploadProfilePicture(user._id, formData);
                profilePictureUrl = uploadResponse.profilePicture;
            }

            // Prepare data for update - only send fields that can be updated
            const updateData = {
                personalInfo: {
                    ...user?.personalInfo,
                    phone: formData.phone,
                    profilePicture: profilePictureUrl,
                }
            };

            // Call API to update user profile in database
            await userService.updateProfile(updateData);

            // Update local user state and localStorage
            const updatedUser = {
                ...user,
                ...updateData,
            };
            updateUser(updatedUser);

            setMessage({ type: 'success', text: 'Profile updated successfully!' });
        } catch (error) {


            setMessage({
                type: 'error',
                text: error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to update profile. Please try again.'
            });
        } finally {
            setLoading(false);
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
                <Grid size={{ xs: 12, md: 4 }}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <Stack spacing={3} alignItems="center">
                                <Box
                                    onClick={() => previewUrl && setOpenPreview(true)}
                                    sx={{
                                        position: 'relative',
                                        cursor: previewUrl ? 'pointer' : 'default',
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
                                    {previewUrl && (
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
                                            <Typography variant="body2" sx={{ color: 'white', fontWeight: 600 }}>
                                                View Photo
                                            </Typography>
                                        </Box>
                                    )}
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

                <Grid size={{ xs: 12, md: 8 }}>
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
                                {message.text && (
                                    <Alert severity={message.type} sx={{ mb: 3 }}>
                                        {message.text}
                                    </Alert>
                                )}
                                <Grid container spacing={3}>
                                    <Grid size={{ xs: 12, sm: 6 }}>
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
                                    <Grid size={{ xs: 12, sm: 6 }}>
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
                                    <Grid size={{ xs: 12, sm: 6 }}>
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
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <TextField
                                            fullWidth
                                            label="Department"
                                            name="department"
                                            value={formData.department}
                                            InputProps={{
                                                readOnly: true,
                                            }}
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    backgroundColor: 'action.hover',
                                                },
                                            }}
                                            helperText="Managed by HR"
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 12 }}>
                                        <TextField
                                            fullWidth
                                            label="Position / Job Title"
                                            name="position"
                                            value={formData.position}
                                            InputProps={{
                                                readOnly: true,
                                            }}
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    backgroundColor: 'action.hover',
                                                },
                                            }}
                                            helperText="Managed by HR"
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 12 }}>
                                        <Stack direction="row" spacing={2}>
                                            <Button
                                                type="submit"
                                                variant="contained"
                                                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Save />}
                                                size="large"
                                                disabled={loading}
                                                sx={{ px: 4 }}
                                            >
                                                {loading ? 'Saving...' : 'Save Changes'}
                                            </Button>
                                            <Button
                                                variant="outlined"
                                                size="large"
                                                onClick={() =>
                                                    setFormData({
                                                        name: user?.name || '',
                                                        email: user?.email || '',
                                                        phone: user?.phone || '',
                                                        department: user?.department?.name || '',
                                                        position: user?.position?.title || '',
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

            {/* Profile Picture Preview Dialog */}
            <Dialog
                open={openPreview}
                onClose={() => setOpenPreview(false)}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        bgcolor: 'transparent',
                        boxShadow: 'none',
                        overflow: 'visible',
                    },
                }}
            >
                <DialogContent
                    sx={{
                        position: 'relative',
                        p: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'transparent',
                    }}
                >
                    <IconButton
                        onClick={() => setOpenPreview(false)}
                        sx={{
                            position: 'absolute',
                            top: -50,
                            right: -10,
                            color: 'white',
                            bgcolor: 'rgba(0, 0, 0, 0.5)',
                            '&:hover': {
                                bgcolor: 'rgba(0, 0, 0, 0.7)',
                            },
                        }}
                    >
                        <Close />
                    </IconButton>
                    <Box
                        component="img"
                        src={previewUrl}
                        alt={formData.name}
                        sx={{
                            maxWidth: '100%',
                            maxHeight: '80vh',
                            borderRadius: 2,
                            boxShadow: 24,
                        }}
                    />
                </DialogContent>
            </Dialog>
        </Box>
    );
}
