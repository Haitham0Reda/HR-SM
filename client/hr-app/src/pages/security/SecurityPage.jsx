import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Switch,
    FormControlLabel,
    Button,
    TextField,
    Paper,
    Stack,
    alpha,
    Avatar,
    Fade,
    Grid
} from '@mui/material';
import { 
    Security as SecurityIcon, 
    VpnKey as VpnKeyIcon, 
    Lock as LockIcon,
    Shield as ShieldIcon,
    Save as SaveIcon
} from '@mui/icons-material';
import { useNotification } from '../../context/NotificationContext';
import securityService from '../../services/security.service';
import Loading from '../../components/common/Loading';

const SecurityPage = () => {
    const [settings, setSettings] = useState({
        twoFactorAuth: {
            enabled: false,
            enforced: false
        },
        passwordPolicy: {
            minLength: 8,
            requireUppercase: true,
            requireLowercase: true,
            requireNumbers: true,
            requireSpecialChars: true,
            expirationDays: 90
        },
        accountLockout: {
            enabled: true,
            maxAttempts: 5,
            lockoutDuration: 30
        },
        ipWhitelist: {
            enabled: false,
            allowedIPs: []
        },
        sessionManagement: {
            timeout: 30,
            maxConcurrentSessions: 3
        },
        auditLog: {
            enabled: true,
            retentionDays: 90
        }
    });

    const { showNotification } = useNotification();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Fetch settings on component mount
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                setLoading(true);
                const response = await securityService.getSettings();
                const data = response.settings || response;
                
                if (data) {
                    setSettings({
                        twoFactorAuth: {
                            enabled: data.twoFactorAuth?.enabled ?? false,
                            enforced: data.twoFactorAuth?.enforced ?? false
                        },
                        passwordPolicy: {
                            minLength: data.passwordPolicy?.minLength ?? 8,
                            requireUppercase: data.passwordPolicy?.requireUppercase ?? true,
                            requireLowercase: data.passwordPolicy?.requireLowercase ?? true,
                            requireNumbers: data.passwordPolicy?.requireNumbers ?? true,
                            requireSpecialChars: data.passwordPolicy?.requireSpecialChars ?? true,
                            expirationDays: data.passwordPolicy?.expirationDays ?? 90
                        },
                        accountLockout: {
                            enabled: data.accountLockout?.enabled ?? true,
                            maxAttempts: data.accountLockout?.maxAttempts ?? 5,
                            lockoutDuration: data.accountLockout?.lockoutDuration ?? 30
                        },
                        ipWhitelist: {
                            enabled: data.ipWhitelist?.enabled ?? false,
                            allowedIPs: data.ipWhitelist?.allowedIPs ?? []
                        },
                        sessionManagement: {
                            timeout: data.sessionManagement?.timeout ?? 30,
                            maxConcurrentSessions: data.sessionManagement?.maxConcurrentSessions ?? 3
                        },
                        auditLog: {
                            enabled: data.auditLog?.enabled ?? true,
                            retentionDays: data.auditLog?.retentionDays ?? 90
                        }
                    });
                }
            } catch (error) {

                showNotification('Failed to load security settings', 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, [showNotification]);

    const handleSettingChange = (path) => (event) => {
        const value = event.target.checked;
        const keys = path.split('.');
        const newSettings = { ...settings };
        
        let current = newSettings;
        for (let i = 0; i < keys.length - 1; i++) {
            current[keys[i]] = { ...current[keys[i]] };
            current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = value;
        
        setSettings(newSettings);
    };

    const handleNumberChange = (path) => (event) => {
        const value = parseInt(event.target.value) || 0;
        const keys = path.split('.');
        const newSettings = { ...settings };
        
        let current = newSettings;
        for (let i = 0; i < keys.length - 1; i++) {
            current[keys[i]] = { ...current[keys[i]] };
            current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = value;
        
        setSettings(newSettings);
    };

    const handleSaveSettings = async () => {
        try {
            setSaving(true);
            await securityService.updateSettings(settings);
            showNotification('Security settings saved successfully', 'success');
        } catch (error) {
            const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to save settings';
            showNotification(errorMessage, 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <Loading />;

    return (
        <Box sx={{ 
            minHeight: '100vh',
            bgcolor: 'background.default',
            p: { xs: 2, sm: 3, md: 4 }
        }}>
            {/* Header */}
            <Paper 
                elevation={0}
                sx={{ 
                    p: 3,
                    mb: 4,
                    borderRadius: 3,
                    background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                    color: 'white'
                }}
            >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ 
                            bgcolor: 'rgba(255,255,255,0.2)', 
                            width: 56, 
                            height: 56,
                            backdropFilter: 'blur(10px)'
                        }}>
                            <ShieldIcon sx={{ fontSize: 32 }} />
                        </Avatar>
                        <Box>
                            <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                                Security Settings
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                Configure system security and authentication policies
                            </Typography>
                        </Box>
                    </Box>
                    <Button
                        variant="contained"
                        startIcon={<SaveIcon />}
                        onClick={handleSaveSettings}
                        disabled={saving}
                        sx={{ 
                            bgcolor: 'white',
                            color: 'primary.main',
                            borderRadius: 2.5,
                            textTransform: 'none',
                            px: 3,
                            py: 1.2,
                            fontSize: '1rem',
                            fontWeight: 600,
                            boxShadow: 3,
                            '&:hover': {
                                bgcolor: 'rgba(255,255,255,0.9)',
                                boxShadow: 4
                            }
                        }}
                    >
                        {saving ? 'Saving...' : 'Save Settings'}
                    </Button>
                </Box>
            </Paper>

            <Grid container spacing={3}>
                {/* Authentication */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Fade in timeout={300}>
                        <Card elevation={0} sx={{ borderRadius: 2.5, border: '1px solid', borderColor: 'divider', height: '100%' }}>
                            <CardContent sx={{ p: 3 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                                    <Avatar sx={{ bgcolor: alpha('#1976d2', 0.1), color: 'primary.main' }}>
                                        <VpnKeyIcon />
                                    </Avatar>
                                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                        Authentication
                                    </Typography>
                                </Box>

                                <Stack spacing={2.5}>
                                    <Box>
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={settings.twoFactorAuth.enabled}
                                                    onChange={handleSettingChange('twoFactorAuth.enabled')}
                                                />
                                            }
                                            label={<Typography sx={{ fontWeight: 500 }}>Two-Factor Authentication</Typography>}
                                        />
                                        <Typography variant="caption" display="block" color="text.secondary" sx={{ ml: 4 }}>
                                            Require 2FA for all users
                                        </Typography>
                                    </Box>

                                    <Box>
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={settings.passwordPolicy.expirationDays > 0}
                                                    onChange={(e) => {
                                                        const newSettings = { ...settings };
                                                        newSettings.passwordPolicy = { ...newSettings.passwordPolicy };
                                                        newSettings.passwordPolicy.expirationDays = e.target.checked ? 90 : 0;
                                                        setSettings(newSettings);
                                                    }}
                                                />
                                            }
                                            label={<Typography sx={{ fontWeight: 500 }}>Password Expiry</Typography>}
                                        />
                                        <Typography variant="caption" display="block" color="text.secondary" sx={{ ml: 4 }}>
                                            Force password change every 90 days
                                        </Typography>
                                    </Box>

                                    <TextField
                                        label="Max Login Attempts"
                                        type="number"
                                        value={settings.accountLockout.maxAttempts}
                                        onChange={handleNumberChange('accountLockout.maxAttempts')}
                                        size="small"
                                        fullWidth
                                        helperText="Lock account after failed attempts"
                                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                    />

                                    <TextField
                                        label="Session Timeout (minutes)"
                                        type="number"
                                        value={settings.sessionManagement.timeout}
                                        onChange={handleNumberChange('sessionManagement.timeout')}
                                        size="small"
                                        fullWidth
                                        helperText="Auto logout after inactivity"
                                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                    />
                                </Stack>
                            </CardContent>
                        </Card>
                    </Fade>
                </Grid>

                {/* Password Policy */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Fade in timeout={400}>
                        <Card elevation={0} sx={{ borderRadius: 2.5, border: '1px solid', borderColor: 'divider', height: '100%' }}>
                            <CardContent sx={{ p: 3 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                                    <Avatar sx={{ bgcolor: alpha('#d32f2f', 0.1), color: 'error.main' }}>
                                        <LockIcon />
                                    </Avatar>
                                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                        Password Policy
                                    </Typography>
                                </Box>

                                <Stack spacing={2.5}>
                                    <TextField
                                        label="Minimum Password Length"
                                        type="number"
                                        value={settings.passwordPolicy.minLength}
                                        onChange={handleNumberChange('passwordPolicy.minLength')}
                                        size="small"
                                        fullWidth
                                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                    />

                                    <Box>
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={settings.passwordPolicy.requireUppercase}
                                                    onChange={handleSettingChange('passwordPolicy.requireUppercase')}
                                                />
                                            }
                                            label={<Typography sx={{ fontWeight: 500 }}>Require Uppercase Letter</Typography>}
                                        />
                                        <Typography variant="caption" display="block" color="text.secondary" sx={{ ml: 4 }}>
                                            At least one uppercase letter (A-Z)
                                        </Typography>
                                    </Box>

                                    <Box>
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={settings.passwordPolicy.requireNumbers}
                                                    onChange={handleSettingChange('passwordPolicy.requireNumbers')}
                                                />
                                            }
                                            label={<Typography sx={{ fontWeight: 500 }}>Require Number</Typography>}
                                        />
                                        <Typography variant="caption" display="block" color="text.secondary" sx={{ ml: 4 }}>
                                            At least one number (0-9)
                                        </Typography>
                                    </Box>

                                    <Box>
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={settings.passwordPolicy.requireSpecialChars}
                                                    onChange={handleSettingChange('passwordPolicy.requireSpecialChars')}
                                                />
                                            }
                                            label={<Typography sx={{ fontWeight: 500 }}>Require Special Character</Typography>}
                                        />
                                        <Typography variant="caption" display="block" color="text.secondary" sx={{ ml: 4 }}>
                                            At least one special character (!@#$%^&*)
                                        </Typography>
                                    </Box>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Fade>
                </Grid>

                {/* System Security */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Fade in timeout={500}>
                        <Card elevation={0} sx={{ borderRadius: 2.5, border: '1px solid', borderColor: 'divider', height: '100%' }}>
                            <CardContent sx={{ p: 3 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                                    <Avatar sx={{ bgcolor: alpha('#2e7d32', 0.1), color: 'success.main' }}>
                                        <SecurityIcon />
                                    </Avatar>
                                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                        System Security
                                    </Typography>
                                </Box>

                                <Stack spacing={2.5}>
                                    <Box>
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={settings.ipWhitelist.enabled}
                                                    onChange={handleSettingChange('ipWhitelist.enabled')}
                                                />
                                            }
                                            label={<Typography sx={{ fontWeight: 500 }}>IP Whitelist</Typography>}
                                        />
                                        <Typography variant="caption" display="block" color="text.secondary" sx={{ ml: 4 }}>
                                            Restrict access to specific IP addresses
                                        </Typography>
                                    </Box>

                                    <Box>
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={settings.auditLog.enabled}
                                                    onChange={handleSettingChange('auditLog.enabled')}
                                                />
                                            }
                                            label={<Typography sx={{ fontWeight: 500 }}>Audit Logging</Typography>}
                                        />
                                        <Typography variant="caption" display="block" color="text.secondary" sx={{ ml: 4 }}>
                                            Track all system activities
                                        </Typography>
                                    </Box>

                                    <Box>
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={settings.accountLockout.enabled}
                                                    onChange={handleSettingChange('accountLockout.enabled')}
                                                />
                                            }
                                            label={<Typography sx={{ fontWeight: 500 }}>Account Lockout</Typography>}
                                        />
                                        <Typography variant="caption" display="block" color="text.secondary" sx={{ ml: 4 }}>
                                            Lock accounts after failed login attempts
                                        </Typography>
                                    </Box>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Fade>
                </Grid>
            </Grid>
        </Box>
    );
};

export default SecurityPage;
