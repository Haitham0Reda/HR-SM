import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCompanyRouting } from '../../hooks/useCompanyRouting';
import {
    Box,
    TextField,
    Button,
    Typography,
    InputAdornment,
    IconButton,
    Alert,
    CircularProgress,
    Container,
    Paper,
    Divider,
    Stack,
    Chip,
} from '@mui/material';
import {
    Person as PersonIcon,
    Lock as LockIcon,
    Visibility,
    VisibilityOff,
    Login as LoginIcon,
    Business as BusinessIcon,
    Security as SecurityIcon,
    CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { generateCompanyRoute } from '../../utils/companySlug';

const Login = () => {
    const navigate = useNavigate();
    const { getCompanyRoute } = useCompanyRouting();
    const { login } = useAuth();
    const { showSuccess, showError } = useNotification();

    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.email || !formData.password) {
            setError('Please fill in all fields');
            return;
        }

        try {
            setLoading(true);
            setError('');
            
            // For now, use TechCorp tenant ID since the login form doesn't have tenant selection
            // TODO: Add tenant selection to login form if needed
            const result = await login(formData.email, formData.password, '693db0e2ccc5ea08aeee120c');
            
            if (result.success) {
                showSuccess('Login successful!');
                
                // Always redirect to TechCorp company route after login
                // The CompanyRouteHandler will handle any further redirects if needed
                const companyRoute = '/company/techcorp-solutions/dashboard';
                navigate(companyRoute);
            } else {
                setError(result.message || 'Login failed. Please check your credentials.');
                showError(result.message || 'Login failed. Please check your credentials.');
            }
        } catch (err) {
            // Ensure we're setting a string value for the error
            const errorMessage = err?.message || err?.response?.data?.error || (typeof err === 'string' ? err : 'Login failed. Please check your credentials.');
            setError(typeof errorMessage === 'string' ? errorMessage : 'An unexpected error occurred. Please try again.');
            showError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#ffffff',
                position: 'relative',
                py: 4,
                overflow: 'hidden',
            }}
        >
            {/* Animated Lines Background */}
            <Box
                sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '100%',
                    margin: 'auto',
                    width: '90vw',
                    zIndex: 0,
                }}
            >
                {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((index) => {
                    const positions = ['-40%', '-30%', '-20%', '-10%', '0%', '10%', '20%', '30%', '40%'];
                    const delays = ['0s', '1s', '2s', '0.5s', '1.5s', '2.5s', '3s', '1.8s', '2.2s'];

                    return (
                        <Box
                            key={index}
                            sx={{
                                position: 'absolute',
                                width: '1px',
                                height: '100%',
                                top: 0,
                                left: '50%',
                                background: 'rgba(0, 0, 0, 0.08)',
                                overflow: 'hidden',
                                marginLeft: positions[index],
                                '&::after': {
                                    content: '""',
                                    display: 'block',
                                    position: 'absolute',
                                    height: '15vh',
                                    width: '100%',
                                    top: '-50%',
                                    left: 0,
                                    background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0) 0%, #000000 75%, #000000 100%)',
                                    animation: `drop 7s ${delays[index]} infinite`,
                                    animationFillMode: 'forwards',
                                    animationTimingFunction: 'cubic-bezier(0.4, 0.26, 0, 0.97)',
                                },
                                '@keyframes drop': {
                                    '0%': {
                                        top: '-50%',
                                    },
                                    '100%': {
                                        top: '110%',
                                    },
                                },
                            }}
                        />
                    );
                })}
            </Box>
            <Container maxWidth="md" sx={{ position: 'relative', zIndex: 10 }}>
                <Box sx={{ display: 'flex', gap: 0, boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)' }}>
                    {/* Left Side - Branding */}
                    <Box
                        sx={{
                            display: { xs: 'none', md: 'flex' },
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            width: '45%',
                            background: 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
                            p: 5,
                            color: 'white',
                            borderRadius: '16px 0 0 16px',
                            position: 'relative',
                            overflow: 'hidden',
                            '&::before': {
                                content: '""',
                                position: 'absolute',
                                top: '-50%',
                                right: '-50%',
                                width: '100%',
                                height: '100%',
                                background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
                                borderRadius: '50%',
                            },
                        }}
                    >
                        <Box sx={{ position: 'relative', zIndex: 1 }}>
                            <Box
                                sx={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: 70,
                                    height: 70,
                                    borderRadius: 2,
                                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                    backdropFilter: 'blur(10px)',
                                    mb: 3,
                                    border: '2px solid rgba(255, 255, 255, 0.3)',
                                }}
                            >
                                <BusinessIcon sx={{ fontSize: 40, color: 'white' }} />
                            </Box>
                            <Typography
                                variant="h4"
                                sx={{
                                    fontWeight: 700,
                                    mb: 2,
                                    letterSpacing: '-0.5px',
                                }}
                            >
                                Welcome Back
                            </Typography>
                            <Typography
                                variant="body1"
                                sx={{
                                    opacity: 0.95,
                                    lineHeight: 1.7,
                                    mb: 4,
                                }}
                            >
                                Access your HR Management System to manage employees, track attendance, and streamline your workforce operations.
                            </Typography>

                            <Stack spacing={2}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <CheckCircleIcon sx={{ fontSize: 20 }} />
                                    <Typography variant="body2">Secure & Encrypted Connection</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <CheckCircleIcon sx={{ fontSize: 20 }} />
                                    <Typography variant="body2">24/7 System Availability</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <CheckCircleIcon sx={{ fontSize: 20 }} />
                                    <Typography variant="body2">Real-time Data Synchronization</Typography>
                                </Box>
                            </Stack>
                        </Box>

                        <Box sx={{ position: 'relative', zIndex: 1 }}>
                            <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.2)', mb: 2 }} />
                            <Typography variant="caption" sx={{ opacity: 0.8 }}>
                                © 2025 HR Management System
                            </Typography>
                        </Box>
                    </Box>

                    {/* Right Side - Login Form */}
                    <Paper
                        elevation={0}
                        sx={{
                            width: { xs: '100%', md: '55%' },
                            backgroundColor: '#ffffff',
                            borderRadius: { xs: 4, md: '0 16px 16px 0' },
                            overflow: 'hidden',
                            border: '1px solid #e0e0e0',
                        }}
                    >
                        {/* Header */}
                        <Box
                            sx={{
                                px: { xs: 3, sm: 5 },
                                pt: { xs: 4, sm: 5 },
                                pb: 3,
                            }}
                        >
                            <Box sx={{ display: { xs: 'flex', md: 'none' }, justifyContent: 'center', mb: 3 }}>
                                <Box
                                    sx={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: 60,
                                        height: 60,
                                        borderRadius: 2,
                                        backgroundColor: '#007bff',
                                        boxShadow: '0 4px 20px rgba(0, 123, 255, 0.3)',
                                    }}
                                >
                                    <BusinessIcon sx={{ fontSize: 36, color: 'white' }} />
                                </Box>
                            </Box>

                            <Typography
                                variant="h5"
                                sx={{
                                    fontWeight: 700,
                                    color: '#212529',
                                    mb: 1,
                                    textAlign: { xs: 'center', md: 'left' },
                                }}
                            >
                                Sign In
                            </Typography>
                            <Typography
                                variant="body2"
                                sx={{
                                    color: '#6c757d',
                                    textAlign: { xs: 'center', md: 'left' },
                                }}
                            >
                                Enter your credentials to access your account
                            </Typography>
                        </Box>

                        {/* Form */}
                        <Box sx={{ px: { xs: 3, sm: 5 }, pb: { xs: 4, sm: 5 } }}>
                            {error && (
                                <Alert
                                    severity="error"
                                    sx={{
                                        mb: 3,
                                        borderRadius: 2,
                                        backgroundColor: '#fff5f5',
                                        border: '1px solid #dc3545',
                                        color: '#dc3545',
                                        '& .MuiAlert-icon': {
                                            color: '#dc3545',
                                        },
                                    }}
                                    onClose={() => setError('')}
                                >
                                    {typeof error === 'string' ? error : 'An error occurred. Please try again.'}
                                </Alert>
                            )}

                            <form onSubmit={handleSubmit}>
                                <Stack spacing={3}>
                                    <Box>
                                        <Typography
                                            variant="subtitle2"
                                            sx={{
                                                color: '#212529',
                                                fontWeight: 600,
                                                mb: 1,
                                                fontSize: '0.875rem',
                                            }}
                                        >
                                            Username or Email Address
                                        </Typography>
                                        <TextField
                                            fullWidth
                                            name="email"
                                            type="text"
                                            placeholder="Enter your username or email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            required
                                            autoFocus
                                            autoComplete="username"
                                            InputProps={{
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <PersonIcon sx={{ color: '#007bff', fontSize: 22 }} />
                                                    </InputAdornment>
                                                ),
                                            }}
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    backgroundColor: '#ffffff',
                                                    transition: 'all 0.2s ease',
                                                    '& fieldset': {
                                                        borderColor: '#dee2e6',
                                                        borderWidth: '1.5px',
                                                    },
                                                    '&:hover': {
                                                        backgroundColor: '#ffffff',
                                                        '& fieldset': {
                                                            borderColor: '#007bff',
                                                        },
                                                    },
                                                    '&.Mui-focused': {
                                                        backgroundColor: '#ffffff',
                                                        '& fieldset': {
                                                            borderColor: '#007bff',
                                                            borderWidth: '2px',
                                                        },
                                                    },
                                                },
                                                '& .MuiInputBase-input': {
                                                    color: '#212529',
                                                    fontSize: '0.95rem',
                                                    py: 1.75,
                                                    pl: 1.5,
                                                    pr: 2,
                                                    '&::placeholder': {
                                                        color: '#6c757d',
                                                        opacity: 0.6,
                                                    },
                                                },
                                                '& .MuiInputAdornment-root': {
                                                    ml: 1,
                                                },
                                            }}
                                        />
                                    </Box>

                                    <Box>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                            <Typography
                                                variant="subtitle2"
                                                sx={{
                                                    color: '#212529',
                                                    fontWeight: 600,
                                                    fontSize: '0.875rem',
                                                }}
                                            >
                                                Password
                                            </Typography>
                                            <Button
                                                component={Link}
                                                to="/forgot-password"
                                                sx={{
                                                    textTransform: 'none',
                                                    color: '#007bff',
                                                    fontWeight: 600,
                                                    fontSize: '0.8rem',
                                                    minWidth: 'auto',
                                                    p: 0,
                                                    '&:hover': {
                                                        backgroundColor: 'transparent',
                                                        textDecoration: 'underline',
                                                    },
                                                }}
                                            >
                                                Forgot password?
                                            </Button>
                                        </Box>
                                        <TextField
                                            fullWidth
                                            name="password"
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="Enter your password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            required
                                            autoComplete="current-password"
                                            InputProps={{
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <LockIcon sx={{ color: '#007bff', fontSize: 22, border: '0.5px solid #007bff', borderRadius: 1, p: 0.3 }} />
                                                    </InputAdornment>
                                                ),
                                                endAdornment: (
                                                    <InputAdornment position="end">
                                                        <IconButton
                                                            onClick={() => setShowPassword(!showPassword)}
                                                            edge="end"
                                                            size="small"
                                                            sx={{
                                                                color: '#007bff',
                                                                '&:hover': {
                                                                    color: '#0056b3',
                                                                    backgroundColor: 'rgba(0, 123, 255, 0.08)',
                                                                },
                                                            }}
                                                        >
                                                            {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                                                        </IconButton>
                                                    </InputAdornment>
                                                ),
                                            }}
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    backgroundColor: '#ffffff',
                                                    transition: 'all 0.2s ease',
                                                    '& fieldset': {
                                                        borderColor: '#dee2e6',
                                                        borderWidth: '1.5px',
                                                    },
                                                    '&:hover': {
                                                        backgroundColor: '#ffffff',
                                                        '& fieldset': {
                                                            borderColor: '#007bff',
                                                        },
                                                    },
                                                    '&.Mui-focused': {
                                                        backgroundColor: '#ffffff',
                                                        '& fieldset': {
                                                            borderColor: '#007bff',
                                                            borderWidth: '2px',
                                                        },
                                                    },
                                                },
                                                '& .MuiInputBase-input': {
                                                    color: '#212529',
                                                    fontSize: '0.95rem',
                                                    py: 1.75,
                                                    pl: 1.5,
                                                    pr: 2,
                                                    '&::placeholder': {
                                                        color: '#6c757d',
                                                        opacity: 0.6,
                                                    },
                                                },
                                                '& .MuiInputAdornment-root': {
                                                    ml: 1,
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
                                        startIcon={loading ? null : <LoginIcon />}
                                        sx={{
                                            py: 1.75,
                                            fontSize: '1rem',
                                            fontWeight: 600,
                                            textTransform: 'none',
                                            backgroundColor: '#007bff',
                                            color: '#ffffff',
                                            boxShadow: '0 4px 12px rgba(0, 123, 255, 0.25)',
                                            transition: 'all 0.2s ease',
                                            '&:hover': {
                                                backgroundColor: '#0056b3',
                                                boxShadow: '0 6px 16px rgba(0, 123, 255, 0.35)',
                                                transform: 'translateY(-1px)',
                                            },
                                            '&:active': {
                                                transform: 'translateY(0)',
                                            },
                                            '&:disabled': {
                                                backgroundColor: '#6c757d',
                                                color: '#ffffff',
                                                boxShadow: 'none',
                                            },
                                        }}
                                    >
                                        {loading ? (
                                            <CircularProgress size={24} sx={{ color: 'white' }} />
                                        ) : (
                                            'Sign In to Your Account'
                                        )}
                                    </Button>
                                </Stack>
                            </form>

                            <Divider sx={{ my: 4, borderColor: '#dee2e6' }}>
                                <Chip
                                    label="Secure Login"
                                    size="small"
                                    icon={<SecurityIcon sx={{ fontSize: 16 }} />}
                                    sx={{
                                        backgroundColor: '#f8f9fa',
                                        color: '#6c757d',
                                        fontWeight: 600,
                                        fontSize: '0.75rem',
                                        border: '1px solid #dee2e6',
                                    }}
                                />
                            </Divider>

                            <Box sx={{ textAlign: 'center' }}>
                                <Typography
                                    variant="caption"
                                    sx={{
                                        color: '#6c757d',
                                        fontSize: '0.8rem',
                                        display: 'block',
                                        mb: 1,
                                    }}
                                >
                                    Protected by enterprise-level security
                                </Typography>
                                <Typography
                                    variant="caption"
                                    sx={{
                                        color: '#adb5bd',
                                        fontSize: '0.75rem',
                                    }}
                                >
                                    Need assistance? Contact your system administrator
                                </Typography>
                            </Box>
                        </Box>
                    </Paper>
                </Box>

                {/* Mobile Copyright */}
                <Typography
                    variant="body2"
                    sx={{
                        display: { xs: 'block', md: 'none' },
                        color: '#6c757d',
                        textAlign: 'center',
                        mt: 3,
                        fontSize: '0.875rem',
                    }}
                >
                    © 2025 HR Management System. All rights reserved.
                </Typography>
            </Container>
        </Box>
    );
};

export default Login;
