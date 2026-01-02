import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Box,
    TextField,
    Button,
    Typography,
    InputAdornment,
    Alert,
    CircularProgress,
} from '@mui/material';
import {
    Email as EmailIcon,
    ArrowBack as ArrowBackIcon,
    CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import api from '../../services/api';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!email) {
            setError('Please enter your email address');
            return;
        }

        try {
            setLoading(true);
            setError('');
            await api.post('/auth/forgot-password', { email });
            setSuccess(true);
        } catch (err) {
            // Ensure we're setting a string value for the error
            const errorMessage = err.message || err.response?.data?.error || (err.data?.error) || 'Failed to send reset email. Please try again.';
            setError(typeof errorMessage === 'string' ? errorMessage : 'An unexpected error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

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
                        Check Your Email
                    </Typography>

                    <Typography
                        variant="body1"
                        sx={{
                            color: 'rgba(255, 255, 255, 0.7)',
                            mb: 4,
                        }}
                    >
                        If an account exists with <strong>{email}</strong>, you will receive a password reset link shortly.
                    </Typography>

                    <Button
                        component={Link}
                        to="/"
                        fullWidth
                        variant="contained"
                        startIcon={<ArrowBackIcon />}
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
                        Forgot Password?
                    </Typography>
                    <Typography
                        variant="body1"
                        sx={{
                            color: 'rgba(255, 255, 255, 0.6)',
                        }}
                    >
                        Enter your email address and we'll send you a link to reset your password
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
                        {typeof error === 'string' ? error : 'An error occurred. Please try again.'}
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
                            Email Address
                        </Typography>
                        <TextField
                            id="forgot-password-email"
                            fullWidth
                            name="email"
                            type="email"
                            placeholder="Enter your email address"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                setError('');
                            }}
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
                                            <EmailIcon sx={{ color: 'rgba(255, 255, 255, 0.7)' }} />
                                        </Box>
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
                        {loading ? <CircularProgress size={24} color="inherit" /> : 'Send Reset Link'}
                    </Button>

                    <Button
                        component={Link}
                        to="/"
                        fullWidth
                        variant="outlined"
                        startIcon={<ArrowBackIcon />}
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

export default ForgotPassword;
