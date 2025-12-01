import { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    Grid,
    Card,
    CardContent,
    Switch,
    FormControlLabel,
    TextField,
    MenuItem,
    Slider,
    Button,
    Divider,
    Alert,
    Chip,
    Stack,
    Avatar,
    alpha,
    Fade,
    Collapse
} from '@mui/material';
import {
    Celebration as CelebrationIcon,
    AcUnit as SnowIcon,
    Fireplace as FireworksIcon,
    NightsStay as CrescentIcon,
    Lightbulb as LanternIcon,
    Save as SaveIcon,
    Refresh as RefreshIcon,
    Visibility as PreviewIcon,
    Settings as SettingsIcon,
    CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { useNotification } from '../../context/NotificationContext';

const SEASONS = [
    { value: 'none', label: 'None' },
    { value: 'christmas', label: '🎄 Christmas' },
    { value: 'newyear', label: '🎆 New Year' },
    { value: 'eid-fitr', label: '🌙 Eid al-Fitr' },
    { value: 'eid-adha', label: '🕌 Eid al-Adha' }
];

function SeasonalSettingsPage() {
    const { showNotification } = useNotification();
    const [hasChanges, setHasChanges] = useState(false);
    const [saving, setSaving] = useState(false);

    // General Settings State
    const [settings, setSettings] = useState({
        enabled: true,
        autoDetect: true,
        manualSeason: 'none',
        opacity: 0.8,
        enableMobile: false,

        // Christmas
        christmas: {
            enabled: true,
            message: 'Merry Christmas! 🎄',
            snowEffect: true
        },

        // New Year
        newyear: {
            enabled: true,
            message: 'Happy New Year! 🎆',
            fireworksEffect: true
        },

        // Eid al-Fitr
        eidFitr: {
            enabled: true,
            messageEn: 'Eid Mubarak! 🌙',
            messageAr: 'عيد مبارك! 🌙',
            crescentEffect: true
        },

        // Eid al-Adha
        eidAdha: {
            enabled: true,
            messageEn: 'Eid al-Adha Mubarak! 🕌',
            messageAr: 'عيد الأضحى مبارك! 🕌',
            lanternEffect: true
        }
    });

    // Load settings from localStorage on mount
    useEffect(() => {
        const savedSettings = localStorage.getItem('seasonalSettings');
        if (savedSettings) {
            try {
                setSettings(JSON.parse(savedSettings));
            } catch (error) {
                console.error('Error loading settings:', error);
            }
        }
    }, []);

    // Handle setting changes
    const handleChange = (path, value) => {
        setSettings(prev => {
            const newSettings = { ...prev };
            const keys = path.split('.');
            let current = newSettings;

            for (let i = 0; i < keys.length - 1; i++) {
                current = current[keys[i]];
            }
            current[keys[keys.length - 1]] = value;

            // If turning OFF auto-detect and manualSeason is 'none', set a default
            if (path === 'autoDetect' && value === false && newSettings.manualSeason === 'none') {
                newSettings.manualSeason = 'christmas';
                // Use setTimeout to avoid setState during render
                setTimeout(() => {
                    showNotification('Auto-detect disabled. Christmas season selected by default.', 'info');
                }, 0);
            }

            return newSettings;
        });
        setHasChanges(true);
    };

    // Save settings
    const handleSave = async () => {
        setSaving(true);
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Save to localStorage
            localStorage.setItem('seasonalSettings', JSON.stringify(settings));

            // Dispatch custom event to notify App.js
            window.dispatchEvent(new Event('seasonalSettingsUpdated'));

            showNotification('Seasonal settings saved successfully!', 'success');
            setHasChanges(false);
        } catch (error) {
            showNotification('Failed to save settings', 'error');
        } finally {
            setSaving(false);
        }
    };

    // Reset to defaults
    const handleReset = () => {
        const defaultSettings = {
            enabled: true,
            autoDetect: true,
            manualSeason: 'none',
            opacity: 0.8,
            enableMobile: false,
            christmas: {
                enabled: true,
                message: 'Merry Christmas! 🎄',
                snowEffect: true
            },
            newyear: {
                enabled: true,
                message: 'Happy New Year! 🎆',
                fireworksEffect: true
            },
            eidFitr: {
                enabled: true,
                messageEn: 'Eid Mubarak! 🌙',
                messageAr: 'عيد مبارك! 🌙',
                crescentEffect: true
            },
            eidAdha: {
                enabled: true,
                messageEn: 'Eid al-Adha Mubarak! 🕌',
                messageAr: 'عيد الأضحى مبارك! 🕌',
                lanternEffect: true
            }
        };
        setSettings(defaultSettings);
        setHasChanges(true);
        showNotification('Settings reset to defaults', 'info');
    };

    // Get current season for preview
    const getCurrentSeason = () => {
        if (!settings.enabled) return 'none';
        if (!settings.autoDetect) return settings.manualSeason;

        // Auto-detect logic (simplified)
        const month = new Date().getMonth() + 1;
        if (month === 12) return 'christmas';
        if (month === 1) return 'newyear';
        return 'none';
    };

    const currentSeason = getCurrentSeason();

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
                    mb: 3,
                    borderRadius: 3,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white'
                }}
            >
                <Box sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 2
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{
                            bgcolor: 'rgba(255,255,255,0.2)',
                            width: 56,
                            height: 56,
                            backdropFilter: 'blur(10px)'
                        }}>
                            <CelebrationIcon sx={{ fontSize: 32 }} />
                        </Avatar>
                        <Box>
                            <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                                Seasonal Decorations
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                Configure seasonal themes and decorations for your dashboard
                            </Typography>
                        </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <Button
                            variant="outlined"
                            startIcon={<RefreshIcon />}
                            onClick={handleReset}
                            sx={{
                                bgcolor: 'rgba(255,255,255,0.1)',
                                color: 'white',
                                borderColor: 'rgba(255,255,255,0.3)',
                                '&:hover': {
                                    bgcolor: 'rgba(255,255,255,0.2)',
                                    borderColor: 'rgba(255,255,255,0.5)'
                                }
                            }}
                        >
                            Reset
                        </Button>
                        <Button
                            variant="contained"
                            startIcon={saving ? <RefreshIcon className="spin" /> : <SaveIcon />}
                            onClick={handleSave}
                            disabled={!hasChanges || saving}
                            sx={{
                                bgcolor: 'white',
                                color: 'primary.main',
                                '&:hover': {
                                    bgcolor: 'rgba(255,255,255,0.9)'
                                }
                            }}
                        >
                            {saving ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </Box>
                </Box>
            </Paper>

            {/* Changes Alert */}
            <Collapse in={hasChanges}>
                <Alert
                    severity="info"
                    sx={{ mb: 3, borderRadius: 2 }}
                    action={
                        <Button color="inherit" size="small" onClick={handleSave}>
                            Save Now
                        </Button>
                    }
                >
                    You have unsaved changes
                </Alert>
            </Collapse>

            {/* Current Season Preview */}
            {settings.enabled && currentSeason !== 'none' && (
                <Fade in>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 2,
                            mb: 3,
                            borderRadius: 2,
                            border: '2px solid',
                            borderColor: 'success.main',
                            bgcolor: alpha('#2e7d32', 0.05)
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <CheckCircleIcon sx={{ color: 'success.main' }} />
                            <Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                    Active Season: {SEASONS.find(s => s.value === currentSeason)?.label}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Decorations are currently active on your dashboard
                                </Typography>
                            </Box>
                        </Box>
                    </Paper>
                </Fade>
            )}

            {/* No Season Warning */}
            {settings.enabled && currentSeason === 'none' && (
                <Fade in>
                    <Alert
                        severity="warning"
                        sx={{ mb: 3, borderRadius: 2 }}
                    >
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                            No Season Active
                        </Typography>
                        <Typography variant="body2">
                            {settings.autoDetect
                                ? 'Auto-detect is enabled but current date does not match any seasonal period. Turn off auto-detect and select a manual season to see effects.'
                                : 'Please select a season from the dropdown below to enable decorations.'}
                        </Typography>
                    </Alert>
                </Fade>
            )}

            <Grid container spacing={3}>
                {/* General Settings */}
                <Grid item xs={12}>
                    <Card elevation={0} sx={{ borderRadius: 2.5, border: '1px solid', borderColor: 'divider' }}>
                        <CardContent sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                                <SettingsIcon sx={{ color: 'primary.main' }} />
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                    General Settings
                                </Typography>
                            </Box>

                            <Stack spacing={3}>
                                {/* Enable Decorations */}
                                <Box>
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={settings.enabled}
                                                onChange={(e) => handleChange('enabled', e.target.checked)}
                                                color="primary"
                                            />
                                        }
                                        label={
                                            <Box>
                                                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                                    Enable Seasonal Decorations
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    Master switch to enable/disable all decorations
                                                </Typography>
                                            </Box>
                                        }
                                    />
                                </Box>

                                <Divider />

                                {/* Auto-Detect Season */}
                                <Box>
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={settings.autoDetect}
                                                onChange={(e) => handleChange('autoDetect', e.target.checked)}
                                                disabled={!settings.enabled}
                                            />
                                        }
                                        label={
                                            <Box>
                                                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                                    Auto-Detect Season
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    Automatically detect and apply seasonal decorations
                                                </Typography>
                                            </Box>
                                        }
                                    />
                                </Box>

                                {/* Manual Season Override */}
                                <Collapse in={!settings.autoDetect && settings.enabled}>
                                    <TextField
                                        select
                                        fullWidth
                                        label="Manual Season Override"
                                        value={settings.manualSeason}
                                        onChange={(e) => handleChange('manualSeason', e.target.value)}
                                        helperText="Select a specific season to display"
                                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                    >
                                        {SEASONS.map((season) => (
                                            <MenuItem key={season.value} value={season.value}>
                                                {season.label}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                </Collapse>

                                <Divider />

                                {/* Opacity Slider */}
                                <Box>
                                    <Typography variant="body1" sx={{ fontWeight: 600, mb: 2 }}>
                                        Decorations Opacity: {settings.opacity.toFixed(1)}
                                    </Typography>
                                    <Slider
                                        value={settings.opacity}
                                        onChange={(e, value) => handleChange('opacity', value)}
                                        min={0.1}
                                        max={1.0}
                                        step={0.1}
                                        marks
                                        disabled={!settings.enabled}
                                        valueLabelDisplay="auto"
                                        sx={{ maxWidth: 400 }}
                                    />
                                    <Typography variant="caption" color="text.secondary">
                                        Adjust the transparency of seasonal decorations
                                    </Typography>
                                </Box>

                                <Divider />

                                {/* Enable on Mobile */}
                                <Box>
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={settings.enableMobile}
                                                onChange={(e) => handleChange('enableMobile', e.target.checked)}
                                                disabled={!settings.enabled}
                                            />
                                        }
                                        label={
                                            <Box>
                                                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                                    Enable on Mobile Devices
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    Show decorations on mobile and tablet devices
                                                </Typography>
                                            </Box>
                                        }
                                    />
                                </Box>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Christmas Settings */}
                <Grid item xs={12} md={6}>
                    <Card
                        elevation={0}
                        sx={{
                            borderRadius: 2.5,
                            border: '2px solid',
                            borderColor: settings.christmas.enabled ? '#c62828' : 'divider',
                            transition: 'all 0.3s'
                        }}
                    >
                        <CardContent sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                                <Avatar sx={{ bgcolor: alpha('#c62828', 0.1), color: '#c62828' }}>
                                    🎄
                                </Avatar>
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                    Christmas Settings
                                </Typography>
                            </Box>

                            <Stack spacing={2.5}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={settings.christmas.enabled}
                                            onChange={(e) => handleChange('christmas.enabled', e.target.checked)}
                                            disabled={!settings.enabled}
                                        />
                                    }
                                    label="Enable Christmas Decorations"
                                />

                                <TextField
                                    fullWidth
                                    label="Christmas Message"
                                    value={settings.christmas.message}
                                    onChange={(e) => handleChange('christmas.message', e.target.value)}
                                    disabled={!settings.enabled || !settings.christmas.enabled}
                                    inputProps={{ maxLength: 100 }}
                                    helperText={`${settings.christmas.message.length}/100 characters`}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                />

                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={settings.christmas.snowEffect}
                                            onChange={(e) => handleChange('christmas.snowEffect', e.target.checked)}
                                            disabled={!settings.enabled || !settings.christmas.enabled}
                                        />
                                    }
                                    label={
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <SnowIcon fontSize="small" />
                                            <span>Snow Animation Effect</span>
                                        </Box>
                                    }
                                />
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>

                {/* New Year Settings */}
                <Grid item xs={12} md={6}>
                    <Card
                        elevation={0}
                        sx={{
                            borderRadius: 2.5,
                            border: '2px solid',
                            borderColor: settings.newyear.enabled ? '#1976d2' : 'divider',
                            transition: 'all 0.3s'
                        }}
                    >
                        <CardContent sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                                <Avatar sx={{ bgcolor: alpha('#1976d2', 0.1), color: '#1976d2' }}>
                                    🎆
                                </Avatar>
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                    New Year Settings
                                </Typography>
                            </Box>

                            <Stack spacing={2.5}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={settings.newyear.enabled}
                                            onChange={(e) => handleChange('newyear.enabled', e.target.checked)}
                                            disabled={!settings.enabled}
                                        />
                                    }
                                    label="Enable New Year Decorations"
                                />

                                <TextField
                                    fullWidth
                                    label="New Year Message"
                                    value={settings.newyear.message}
                                    onChange={(e) => handleChange('newyear.message', e.target.value)}
                                    disabled={!settings.enabled || !settings.newyear.enabled}
                                    inputProps={{ maxLength: 100 }}
                                    helperText={`${settings.newyear.message.length}/100 characters`}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                />

                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={settings.newyear.fireworksEffect}
                                            onChange={(e) => handleChange('newyear.fireworksEffect', e.target.checked)}
                                            disabled={!settings.enabled || !settings.newyear.enabled}
                                        />
                                    }
                                    label={
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <FireworksIcon fontSize="small" />
                                            <span>Fireworks Animation Effect</span>
                                        </Box>
                                    }
                                />
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Eid al-Fitr Settings */}
                <Grid item xs={12} md={6}>
                    <Card
                        elevation={0}
                        sx={{
                            borderRadius: 2.5,
                            border: '2px solid',
                            borderColor: settings.eidFitr.enabled ? '#7b1fa2' : 'divider',
                            transition: 'all 0.3s'
                        }}
                    >
                        <CardContent sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                                <Avatar sx={{ bgcolor: alpha('#7b1fa2', 0.1), color: '#7b1fa2' }}>
                                    🌙
                                </Avatar>
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                    Eid al-Fitr Settings
                                </Typography>
                            </Box>

                            <Stack spacing={2.5}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={settings.eidFitr.enabled}
                                            onChange={(e) => handleChange('eidFitr.enabled', e.target.checked)}
                                            disabled={!settings.enabled}
                                        />
                                    }
                                    label="Enable Eid al-Fitr Decorations"
                                />

                                <TextField
                                    fullWidth
                                    label="English Message"
                                    value={settings.eidFitr.messageEn}
                                    onChange={(e) => handleChange('eidFitr.messageEn', e.target.value)}
                                    disabled={!settings.enabled || !settings.eidFitr.enabled}
                                    inputProps={{ maxLength: 100 }}
                                    helperText={`${settings.eidFitr.messageEn.length}/100 characters`}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                />

                                <TextField
                                    fullWidth
                                    label="Arabic Message"
                                    value={settings.eidFitr.messageAr}
                                    onChange={(e) => handleChange('eidFitr.messageAr', e.target.value)}
                                    disabled={!settings.enabled || !settings.eidFitr.enabled}
                                    inputProps={{ maxLength: 100, dir: 'rtl' }}
                                    helperText={`${settings.eidFitr.messageAr.length}/100 characters`}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                />

                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={settings.eidFitr.crescentEffect}
                                            onChange={(e) => handleChange('eidFitr.crescentEffect', e.target.checked)}
                                            disabled={!settings.enabled || !settings.eidFitr.enabled}
                                        />
                                    }
                                    label={
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <CrescentIcon fontSize="small" />
                                            <span>Crescent Moon Animation Effect</span>
                                        </Box>
                                    }
                                />
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Eid al-Adha Settings */}
                <Grid item xs={12} md={6}>
                    <Card
                        elevation={0}
                        sx={{
                            borderRadius: 2.5,
                            border: '2px solid',
                            borderColor: settings.eidAdha.enabled ? '#f57c00' : 'divider',
                            transition: 'all 0.3s'
                        }}
                    >
                        <CardContent sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                                <Avatar sx={{ bgcolor: alpha('#f57c00', 0.1), color: '#f57c00' }}>
                                    🕌
                                </Avatar>
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                    Eid al-Adha Settings
                                </Typography>
                            </Box>

                            <Stack spacing={2.5}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={settings.eidAdha.enabled}
                                            onChange={(e) => handleChange('eidAdha.enabled', e.target.checked)}
                                            disabled={!settings.enabled}
                                        />
                                    }
                                    label="Enable Eid al-Adha Decorations"
                                />

                                <TextField
                                    fullWidth
                                    label="English Message"
                                    value={settings.eidAdha.messageEn}
                                    onChange={(e) => handleChange('eidAdha.messageEn', e.target.value)}
                                    disabled={!settings.enabled || !settings.eidAdha.enabled}
                                    inputProps={{ maxLength: 100 }}
                                    helperText={`${settings.eidAdha.messageEn.length}/100 characters`}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                />

                                <TextField
                                    fullWidth
                                    label="Arabic Message"
                                    value={settings.eidAdha.messageAr}
                                    onChange={(e) => handleChange('eidAdha.messageAr', e.target.value)}
                                    disabled={!settings.enabled || !settings.eidAdha.enabled}
                                    inputProps={{ maxLength: 100, dir: 'rtl' }}
                                    helperText={`${settings.eidAdha.messageAr.length}/100 characters`}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                />

                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={settings.eidAdha.lanternEffect}
                                            onChange={(e) => handleChange('eidAdha.lanternEffect', e.target.checked)}
                                            disabled={!settings.enabled || !settings.eidAdha.enabled}
                                        />
                                    }
                                    label={
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <LanternIcon fontSize="small" />
                                            <span>Lantern Animation Effect</span>
                                        </Box>
                                    }
                                />
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Bottom Save Bar */}
            {hasChanges && (
                <Paper
                    elevation={8}
                    sx={{
                        position: 'fixed',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        p: 2,
                        display: 'flex',
                        justifyContent: 'center',
                        gap: 2,
                        bgcolor: 'background.paper',
                        borderTop: '1px solid',
                        borderColor: 'divider',
                        zIndex: 1000
                    }}
                >
                    <Button
                        variant="outlined"
                        onClick={handleReset}
                        sx={{ minWidth: 120 }}
                    >
                        Reset
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={saving ? <RefreshIcon className="spin" /> : <SaveIcon />}
                        onClick={handleSave}
                        disabled={saving}
                        sx={{ minWidth: 120 }}
                    >
                        {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </Paper>
            )}
        </Box>
    );
}

export default SeasonalSettingsPage;
