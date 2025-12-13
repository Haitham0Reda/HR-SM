import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  IconButton,
  InputAdornment,
  Alert,
  CircularProgress,
  Divider,
  Stack,
  Avatar,
  Checkbox,
  FormControlLabel,
  Link
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Login as LoginIcon,
  AdminPanelSettings as AdminIcon,
  Security as SecurityIcon,
  Business as BusinessIcon,
  Dashboard as DashboardIcon,
  Email as EmailIcon,
  Lock as LockIcon
} from '@mui/icons-material';



const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const handleInputChange = (field) => (event) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    if (error) setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock validation
      if (formData.email === 'admin@platform.com' && formData.password === 'admin123') {
        // Success - redirect to dashboard
        console.log('Login successful');
      } else {
        setError('Invalid email or password');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
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
        p: 2,
        backgroundColor: 'background.default'
      }}
    >
      {/* Main Login Container */}
        <Box
          sx={{
            display: 'flex',
            maxWidth: 1200,
            width: '100%',
            minHeight: 600,
            borderRadius: 2,
            overflow: 'hidden',
            boxShadow: 4
          }}
        >
          {/* Left Side - Branding */}
          <Box
            sx={{
              flex: 1,
              bgcolor: 'primary.main',
              display: { xs: 'none', md: 'flex' },
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'primary.contrastText'
            }}
          >
            <Box sx={{ textAlign: 'center' }}>
              <Avatar
                sx={{
                  width: 120,
                  height: 120,
                  mb: 4,
                  mx: 'auto',
                  bgcolor: 'rgba(255, 255, 255, 0.2)'
                }}
              >
                <AdminIcon sx={{ fontSize: 60 }} />
              </Avatar>
              
              <Typography variant="h3" fontWeight="bold" gutterBottom>
                Platform Admin
              </Typography>
              
              <Typography variant="h6" sx={{ opacity: 0.9, mb: 4 }}>
                HRMS Administration Center
              </Typography>
              
              <Box>
                <Typography variant="body1" sx={{ mb: 2, opacity: 0.8 }}>
                  Manage your entire HRMS platform
                </Typography>
                <Stack direction="row" spacing={2} justifyContent="center">
                  <Box sx={{ textAlign: 'center' }}>
                    <BusinessIcon sx={{ fontSize: 32, mb: 1 }} />
                    <Typography variant="caption" display="block">
                      Multi-Tenant
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <SecurityIcon sx={{ fontSize: 32, mb: 1 }} />
                    <Typography variant="caption" display="block">
                      Secure
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <DashboardIcon sx={{ fontSize: 32, mb: 1 }} />
                    <Typography variant="caption" display="block">
                      Analytics
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            </Box>
          </Box>

          {/* Right Side - Login Form */}
          <Card
            elevation={0}
            sx={{
              flex: 1,
              borderRadius: 0,
              backgroundColor: 'background.paper',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <CardContent sx={{ 
              width: '100%', 
              p: { xs: 3, sm: 6 }
            }}>
              <Box>
                  <Box sx={{ textAlign: 'center', mb: 4 }}>
                    <Typography variant="h4" fontWeight="bold" gutterBottom color="text.primary">
                      Welcome Back
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      Sign in to your admin account
                    </Typography>
                  </Box>

                  {error && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                      {error}
                    </Alert>
                  )}

                  <Box component="form" onSubmit={handleSubmit}>
                    <TextField
                      fullWidth
                      label="Email Address"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange('email')}
                      required
                      sx={{ mb: 3 }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <EmailIcon />
                          </InputAdornment>
                        )
                      }}
                    />

                    <TextField
                      fullWidth
                      label="Password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={handleInputChange('password')}
                      required
                      sx={{ mb: 3 }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <LockIcon />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowPassword(!showPassword)}
                              edge="end"
                            >
                              {showPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        )
                      }}
                    />

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                          />
                        }
                        label={
                          <Typography variant="body2" color="text.secondary">
                            Remember me
                          </Typography>
                        }
                      />
                      <Link href="#" variant="body2">
                        Forgot password?
                      </Link>
                    </Box>

                    <Button
                      type="submit"
                      fullWidth
                      variant="contained"
                      size="large"
                      disabled={loading}
                      startIcon={loading ? <CircularProgress size={20} /> : <LoginIcon />}
                      sx={{ py: 1.5 }}
                    >
                      {loading ? 'Signing In...' : 'Sign In'}
                    </Button>
                  </Box>

                  <Divider sx={{ my: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      Demo Credentials
                    </Typography>
                  </Divider>

                  <Box
                    sx={{
                      textAlign: 'center',
                      p: 2,
                      bgcolor: 'background.default',
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider'
                    }}
                  >
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      <strong>Email:</strong> admin@platform.com
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Password:</strong> admin123
                    </Typography>
                  </Box>
                </Box>
            </CardContent>
          </Card>
        </Box>
    </Box>
  );
};

export default Login;