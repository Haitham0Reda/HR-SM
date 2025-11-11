import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    Box,
    TextField,
    Button,
    Typography,
    InputAdornment,
    IconButton,
    Alert,
    CircularProgress,
} from '@mui/material';
import {
    Lock as LockIcon,
    Visibility,
    VisibilityOff,
    CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import axios from 'axios';

const ResetPassword = () => {
    const { token } = useParams();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        password: '',
        confirmPassword: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [tokenValid, setTokenValid] = useState(false);

    useEffect(() => {
        verifyToken();
    }, [token]);

    const verifyToken = async () => {
        try {
            await axios.get(`/api/auth/verify-reset-token/${token}`);
            setTokenValid(true);
        } catch (err) {
            setError('Invalid or expired reset link. Please request a new one.');
            setTokenValid(false);
        } finally {
            setVerifying(false);
        }
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.password || !formData.confirmPassword) {
            setError('Please fill in all fields');
            return;
        }

        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters long');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        try {
            setLoading(true);
            setError('');
            await axios.post(`/api/auth/reset-password/${token}`, {
                password: formData.password,
            });
            setSuccess(true);
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to reset password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (verifying) {
        return (
            <Box
                sx={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                }}
            >
                <CircularProgress size={60} sx={{ color: '#3b82f6' }} />
            </Box>
        );
    }

    if (success) {
        return (
            <Box
                sx={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                    padding: 2,
                }}
            >
                <Box
                    sx={{
                        maxWidth: 480,
                        width: '100%',
                        backgroundColor: 'rgba(30, 41, 59, 0.8)',
                        backdropFilter: 'blur(20px)',
                        borderRadius: 4,
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
                        p: { xs: 3, sm: 5 },
                        textAlign: 'center',
                    }}
                >
                    <Box
                        sx={{
                            width: 80,
                            height: 80,
                            borderRadius: '50%',
                            backgroundColor: 'rgba(34, 197, 94, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 24px',
                        }}
                    >
                        <CheckCircleIcon sx={{ fontSize: 48, color: '#22c55e' }} />
                    </Box>

                    <Typography
                        variant="h4"
                        sx={{
                            color: 'white',
                            fontWeight: 700,
                            mb: 2,
                        }}
                    >
                        Password Reset Successful!
                    </Typography>

                    <Typography
                        variant="body1"
                        sx={{
                            color: 'rgba(255, 255, 255, 0.7)',
                            mb: 3,
                        }}
                    >
                        Your password has been reset successfully. You will be redirected to the login page shortly.
                    </Typography>

                    <Button
                        component={Link}
                        to="/login"
                        fullWidth
                        variant="contained"
                        sx={{
                            py: 1.5,
                            fontSize: '1rem',
                            fontWeight: 600,
                            textTransform: 'none',
                            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                            borderRadius: 2,
                            '&:hover': {
                                background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                            },
                        }}
                    >
                        Go to Login
                    </Button>
                </Box>
            </Box>
        );
    }

    if (!tokenValid) {
        return (
            <Box
                sx={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                    padding: 2,
                }}
            >
                <Box
                    sx={{
                        maxWidth: 480,
                        width: '100%',
                        backgroundColor: 'rgba(30, 41, 59, 0.8)',
                        backdropFilter: 'blur(20px)',
                        borderRadius: 4,
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
                        p: { xs: 3, sm: 5 },
                        textAlign: 'center',
                    }}
                >
                    <Typography
                        variant="h4"
                        sx={{
                            color: 'white',
                            fontWeight: 700,
                            mb: 2,
                        }}
                    >
                        Invalid Reset Link
                    </Typography>

                    <Typography
                        variant="body1"
                        sx={{
                            color: 'rgba(255, 255, 255, 0.7)',
                            mb: 4,
                        }}
                    >
                        {error}
                    </Typography>

                    <Button
                        component={Link}
                        to="/forgot-password"
                        fullWidth
                        variant="contained"
                        sx={{
                            py: 1.5,
                            fontSize: '1rem',
                            fontWeight: 600,
                            textTransform: 'none',
                            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                            borderRadius: 2,
                            mb: 2,
                            '&:hover': {
                                background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                            },
                        }}
                    >
                        Request New Reset Link
                    </Button>

                    <Button
                        component={Link}
                        to="/login"
                        fullWidth
                        variant="outlined"
                        sx={{
                            py: 1.5,
                            fontSize: '1rem',
                            fontWeight: 600,
                            textTransform: 'none',
                            color: 'rgba(255, 255, 255, 0.7)',
                            borderColor: 'rgba(255, 255, 255, 0.3)',
                            borderRadius: 2,
                            '&:hover': {
                                borderColor: 'rgba(255, 255, 255, 0.5)',
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            },
                        }}
                    >
                        Back to Login
                    </Button>
                </Box>
            </Box>
        );
    }

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                padding: 2,
            }}
        >
            <Box
                sx={{
                    maxWidth: 480,
                    width: '100%',
                    backgroundColor: 'rgba(30, 41, 59, 0.8)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: 4,
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
                    p: { xs: 3, sm: 5 },
                }}
            >
                <Box sx={{ textAlign: 'center', mb: 4 }}>
                    <Typography
                        variant="h4"
                        sx={{
                            color: 'white',
                            fontWeight: 700,
                            mb: 1,
                        }}
                    >
                        Reset Your Password
                    </Typography>
                    <Typography
                        variant="body1"
                        sx={{
                            color: 'rgba(255, 255, 255, 0.6)',
                        }}
                    >
                        Enter your new password below
                    </Typography>
                </Box>

                {error && (
                    <Alert
                        severity="error"
                        sx={{
                            mb: 3,
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            color: '#fca5a5',
                            '& .MuiAlert-icon': {
                                color: '#ef4444',
                            },
                        }}
                    >
                        {error}
                    </Alert>
                )}

                <form onSubmit={handleSubmit}>
                    <Box sx={{ mb: 3 }}>
                        <Typography
                            variant="body1"
                            sx={{
                                color: 'rgba(255, 255, 255, 0.9)',
                                fontWeight: 600,
                                mb: 1.5,
                            }}
                        >
                            New Password
                        </Typography>
                        <TextField
                            fullWidth
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Enter new password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            autoFocus
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                width: 40,
                                                height: 40,
                                                borderRadius: 1,
                                                backgroundColor: 'rgba(71, 85, 105, 0.5)',
                                                mr: 1,
                                            }}
                                        >
                                            <LockIcon sx={{ color: 'rgba(255, 255, 255, 0.7)' }} />
                                        </Box>
                                    </InputAdornment>
                                ),
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            onClick={() => setShowPassword(!showPassword)}
                                            edge="end"
                                            sx={{ color: 'rgba(255, 255, 255, 0.5)' }}
                                        >
                                            {showPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    backgroundColor: 'rgba(51, 65, 85, 0.5)',
                                    borderRadius: 2,
                                    color: 'white',
                                    border: '1px solid rgba(59, 130, 246, 0.3)',
                                    '& fieldset': {
                                        border: 'none',
                                    },
                                    '&:hover': {
                                        backgroundColor: 'rgba(51, 65, 85, 0.7)',
                                        border: '1px solid rgba(59, 130, 246, 0.5)',
                                    },
                                    '&.Mui-focused': {
                                        backgroundColor: 'rgba(51, 65, 85, 0.7)',
                                        border: '1px solid #3b82f6',
                                        boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
                                    },
                                },
                                '& .MuiInputBase-input': {
                                    color: 'white',
                                    '&::placeholder': {
                                        color: 'rgba(255, 255, 255, 0.4)',
                                        opacity: 1,
                                    },
                                },
                            }}
                        />
                        <Typography
                            variant="caption"
                            sx={{
                                color: 'rgba(255, 255, 255, 0.5)',
                                display: 'block',
                                mt: 1,
                            }}
                        >
                            Password must be at least 6 characters long
                        </Typography>
                    </Box>

                    <Box sx={{ mb: 3 }}>
                        <Typography
                            variant="body1"
                            sx={{
                                color: 'rgba(255, 255, 255, 0.9)',
                                fontWeight: 600,
                                mb: 1.5,
                            }}
                        >
                            Confirm Password
                        </Typography>
                        <TextField
                            fullWidth
                            name="confirmPassword"
                            type={showConfirmPassword ? 'text' : 'password'}
                            placeholder="Confirm new password"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            required
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                width: 40,
                                                height: 40,
                                                borderRadius: 1,
                                                backgroundColor: 'rgba(71, 85, 105, 0.5)',
                                                mr: 1,
                                            }}
                                        >
                                            <LockIcon sx={{ color: 'rgba(255, 255, 255, 0.7)' }} />
                                        </Box>
                                    </InputAdornment>
                                ),
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            edge="end"
                                            sx={{ color: 'rgba(255, 255, 255, 0.5)' }}
                                        >
                                            {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    backgroundColor: 'rgba(51, 65, 85, 0.5)',
                                    borderRadius: 2,
                                    color: 'white',
                                    border: '1px solid rgba(59, 130, 246, 0.3)',
                                    '& fieldset': {
                                        border: 'none',
                                    },
                                    '&:hover': {
                                        backgroundColor: 'rgba(51, 65, 85, 0.7)',
                                        border: '1px solid rgba(59, 130, 246, 0.5)',
                                    },
                                    '&.Mui-focused': {
                                        backgroundColor: 'rgba(51, 65, 85, 0.7)',
                                        border: '1px solid #3b82f6',
                                        boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
                                    },
                                },
                                '& .MuiInputBase-input': {
                                    color: 'white',
                                    '&::placeholder': {
                                        color: 'rgba(255, 255, 255, 0.4)',
                                        opacity: 1,
                                    },
                                },
                            }}
                        />
                    </Box>

                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        size="large"
                        disabled={loading}
                        sx={{
                            py: 1.8,
                            fontSize: '1.1rem',
                            fontWeight: 600,
                            textTransform: 'none',
                            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                            borderRadius: 2,
                            mb: 2,
                            boxShadow: '0 4px 20px rgba(59, 130, 246, 0.4)',
                            '&:hover': {
                                background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                                boxShadow: '0 6px 25px rgba(59, 130, 246, 0.5)',
                            },
                            '&:disabled': {
                                background: 'rgba(59, 130, 246, 0.3)',
                            },
                        }}
                    >
                        {loading ? <CircularProgress size={24} color="inherit" /> : 'Reset Password'}
                    </Button>

                    <Button
                        component={Link}
                        to="/login"
                        fullWidth
                        variant="outlined"
                        sx={{
                            py: 1.5,
                            fontSize: '1rem',
                            fontWeight: 600,
                            textTransform: 'none',
                            color: 'rgba(255, 255, 255, 0.7)',
                            borderColor: 'rgba(255, 255, 255, 0.3)',
                            borderRadius: 2,
                            '&:hover': {
                                borderColor: 'rgba(255, 255, 255, 0.5)',
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            },
                        }}
                    >
                        Back to Login
                    </Button>
                </form>
            </Box>
        </Box>
    );
};

export default ResetPassword;
