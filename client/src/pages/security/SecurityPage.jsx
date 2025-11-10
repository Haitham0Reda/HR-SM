import React, { useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    Switch,
    FormControlLabel,
    Button,
    TextField,
    Divider,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    IconButton,
    Chip
} from '@mui/material';
import { Delete, Refresh, Security, VpnKey, History } from '@mui/icons-material';
import { useNotification } from '../../context/NotificationContext';
import securityService from '../../services/security.service';

const SecurityPage = () => {
    const [settings, setSettings] = useState({
        twoFactorAuth: false,
        passwordExpiry: true,
        sessionTimeout: 30,
        ipWhitelist: false,
        auditLog: true,
        loginAttempts: 5,
        passwordMinLength: 8,
        requireSpecialChar: true,
        requireNumber: true,
        requireUppercase: true
    });

    const [activeSessions, setActiveSessions] = useState([
        { id: 1, user: 'admin@example.com', ip: '192.168.1.100', device: 'Chrome on Windows', lastActive: '2 mins ago' },
        { id: 2, user: 'hr@example.com', ip: '192.168.1.101', device: 'Safari on MacOS', lastActive: '15 mins ago' },
        { id: 3, user: 'employee@example.com', ip: '192.168.1.102', device: 'Firefox on Linux', lastActive: '1 hour ago' }
    ]);

    const [recentActivity, setRecentActivity] = useState([
        { action: 'User Login', user: 'admin@example.com', time: '2 mins ago', status: 'success' },
        { action: 'Password Changed', user: 'hr@example.com', time: '1 hour ago', status: 'success' },
        { action: 'Failed Login Attempt', user: 'unknown@example.com', time: '2 hours ago', status: 'failed' },
        { action: 'User Created', user: 'admin@example.com', time: '3 hours ago', status: 'success' },
        { action: 'Permission Updated', user: 'hr@example.com', time: '5 hours ago', status: 'success' }
    ]);

    const { showNotification } = useNotification();

    const handleSettingChange = (setting) => (event) => {
        setSettings({ ...settings, [setting]: event.target.checked });
        showNotification(`${setting} ${event.target.checked ? 'enabled' : 'disabled'}`, 'success');
    };

    const handleNumberChange = (setting) => (event) => {
        setSettings({ ...settings, [setting]: parseInt(event.target.value) || 0 });
    };

    const handleSaveSettings = async () => {
        try {
            await securityService.updateSettings(settings);
            showNotification('Security settings saved successfully', 'success');
        } catch (error) {
            showNotification('Failed to save settings', 'error');
        }
    };

    const handleTerminateSession = (sessionId) => {
        setActiveSessions(activeSessions.filter(s => s.id !== sessionId));
        showNotification('Session terminated successfully', 'success');
    };

    const handleClearAuditLog = () => {
        setRecentActivity([]);
        showNotification('Audit log cleared', 'success');
    };

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" sx={{ mb: 3 }}>Security Settings</Typography>

            <Grid container spacing={3}>
                {/* Authentication Settings */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <VpnKey sx={{ mr: 1 }} color="primary" />
                                <Typography variant="h6">Authentication</Typography>
                            </Box>
                            <Divider sx={{ mb: 2 }} />

                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={settings.twoFactorAuth}
                                        onChange={handleSettingChange('twoFactorAuth')}
                                    />
                                }
                                label="Two-Factor Authentication"
                            />
                            <Typography variant="caption" display="block" color="text.secondary" sx={{ ml: 4, mb: 2 }}>
                                Require 2FA for all users
                            </Typography>

                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={settings.passwordExpiry}
                                        onChange={handleSettingChange('passwordExpiry')}
                                    />
                                }
                                label="Password Expiry"
                            />
                            <Typography variant="caption" display="block" color="text.secondary" sx={{ ml: 4, mb: 2 }}>
                                Force password change every 90 days
                            </Typography>

                            <TextField
                                label="Max Login Attempts"
                                type="number"
                                value={settings.loginAttempts}
                                onChange={handleNumberChange('loginAttempts')}
                                size="small"
                                fullWidth
                                sx={{ mb: 2 }}
                                helperText="Lock account after failed attempts"
                            />

                            <TextField
                                label="Session Timeout (minutes)"
                                type="number"
                                value={settings.sessionTimeout}
                                onChange={handleNumberChange('sessionTimeout')}
                                size="small"
                                fullWidth
                                helperText="Auto logout after inactivity"
                            />
                        </CardContent>
                    </Card>
                </Grid>

                {/* Password Policy */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <Security sx={{ mr: 1 }} color="primary" />
                                <Typography variant="h6">Password Policy</Typography>
                            </Box>
                            <Divider sx={{ mb: 2 }} />

                            <TextField
                                label="Minimum Password Length"
                                type="number"
                                value={settings.passwordMinLength}
                                onChange={handleNumberChange('passwordMinLength')}
                                size="small"
                                fullWidth
                                sx={{ mb: 2 }}
                            />

                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={settings.requireUppercase}
                                        onChange={handleSettingChange('requireUppercase')}
                                    />
                                }
                                label="Require Uppercase Letter"
                            />
                            <Typography variant="caption" display="block" color="text.secondary" sx={{ ml: 4, mb: 2 }}>
                                At least one uppercase letter (A-Z)
                            </Typography>

                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={settings.requireNumber}
                                        onChange={handleSettingChange('requireNumber')}
                                    />
                                }
                                label="Require Number"
                            />
                            <Typography variant="caption" display="block" color="text.secondary" sx={{ ml: 4, mb: 2 }}>
                                At least one number (0-9)
                            </Typography>

                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={settings.requireSpecialChar}
                                        onChange={handleSettingChange('requireSpecialChar')}
                                    />
                                }
                                label="Require Special Character"
                            />
                            <Typography variant="caption" display="block" color="text.secondary" sx={{ ml: 4 }}>
                                At least one special character (!@#$%^&*)
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                {/* System Security */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" sx={{ mb: 2 }}>System Security</Typography>
                            <Divider sx={{ mb: 2 }} />

                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={settings.ipWhitelist}
                                        onChange={handleSettingChange('ipWhitelist')}
                                    />
                                }
                                label="IP Whitelist"
                            />
                            <Typography variant="caption" display="block" color="text.secondary" sx={{ ml: 4, mb: 2 }}>
                                Restrict access to specific IP addresses
                            </Typography>

                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={settings.auditLog}
                                        onChange={handleSettingChange('auditLog')}
                                    />
                                }
                                label="Audit Logging"
                            />
                            <Typography variant="caption" display="block" color="text.secondary" sx={{ ml: 4, mb: 3 }}>
                                Track all system activities
                            </Typography>

                            <Button
                                variant="contained"
                                fullWidth
                                onClick={handleSaveSettings}
                            >
                                Save Security Settings
                            </Button>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Active Sessions */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="h6">Active Sessions</Typography>
                                <IconButton size="small" onClick={() => showNotification('Sessions refreshed', 'info')}>
                                    <Refresh />
                                </IconButton>
                            </Box>
                            <Divider sx={{ mb: 2 }} />

                            <List dense>
                                {activeSessions.map((session) => (
                                    <ListItem
                                        key={session.id}
                                        sx={{
                                            border: 1,
                                            borderColor: 'divider',
                                            borderRadius: 1,
                                            mb: 1
                                        }}
                                    >
                                        <ListItemText
                                            primary={session.user}
                                            secondary={
                                                <>
                                                    <Typography variant="caption" display="block">
                                                        {session.device}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        IP: {session.ip} • {session.lastActive}
                                                    </Typography>
                                                </>
                                            }
                                        />
                                        <ListItemSecondaryAction>
                                            <IconButton
                                                edge="end"
                                                size="small"
                                                onClick={() => handleTerminateSession(session.id)}
                                                color="error"
                                            >
                                                <Delete fontSize="small" />
                                            </IconButton>
                                        </ListItemSecondaryAction>
                                    </ListItem>
                                ))}
                            </List>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Recent Activity */}
                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <History sx={{ mr: 1 }} color="primary" />
                                    <Typography variant="h6">Recent Security Activity</Typography>
                                </Box>
                                <Button
                                    size="small"
                                    startIcon={<Delete />}
                                    onClick={handleClearAuditLog}
                                >
                                    Clear Log
                                </Button>
                            </Box>
                            <Divider sx={{ mb: 2 }} />

                            <List dense>
                                {recentActivity.map((activity, index) => (
                                    <ListItem
                                        key={index}
                                        sx={{
                                            border: 1,
                                            borderColor: 'divider',
                                            borderRadius: 1,
                                            mb: 1
                                        }}
                                    >
                                        <ListItemText
                                            primary={
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Typography variant="subtitle2">{activity.action}</Typography>
                                                    <Chip
                                                        label={activity.status}
                                                        size="small"
                                                        color={activity.status === 'success' ? 'success' : 'error'}
                                                    />
                                                </Box>
                                            }
                                            secondary={`${activity.user} • ${activity.time}`}
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default SecurityPage;
