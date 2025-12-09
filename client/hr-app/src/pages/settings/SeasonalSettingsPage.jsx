import { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
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
    Collapse,
    IconButton,
    Tooltip
} from '@mui/material';
import {
    AcUnit as SnowIcon,
    Fireplace as FireworksIcon,
    NightsStay as CrescentIcon,
    Pets as SheepIcon,
    Save as SaveIcon,
    Refresh as RefreshIcon,
    CheckCircle as CheckCircleIcon,
    AutoAwesome as AutoAwesomeIcon,
    Tune as TuneIcon
} from '@mui/icons-material';
import { useNotification } from '../../context/NotificationContext';

const SEASONS = [
    { value: 'none', label: 'None' },
    { value: 'christmas', label: '🎄 Christmas' },
    { value: 'newyear', label: '🎆 New Year' },
    { value: 'eid-fitr', label: '🌙 Eid al-Fitr' },
    { value: 'eid-adha', label: '🕌 Eid al-Adha' }
];

const SEASON_CONFIGS = {
    christmas: {
        emoji: '🎄',
        title: 'Christmas',
        subtitle: 'Winter celebration',
        colorKey: 'error', // Red theme color
        icon: SnowIcon,
        effectLabel: 'Snow Animation Effect'
    },
    newyear: {
        emoji: '🎆',
        title: 'New Year',
        subtitle: 'Fresh start celebration',
        colorKey: 'info', // Blue theme color
        icon: FireworksIcon,
        effectLabel: 'Fireworks Animation Effect'
    },
    eidFitr: {
        emoji: '🌙',
        title: 'Eid al-Fitr',
        subtitle: 'Festival of breaking fast',
        colorKey: 'secondary', // Purple theme color
        icon: CrescentIcon,
        effectLabel: 'Crescent Moon Animation Effect'
    },
    eidAdha: {
        emoji: '🕌',
        title: 'Eid al-Adha',
        subtitle: 'Festival of sacrifice',
        colorKey: 'warning', // Orange theme color
        icon: SheepIcon,
        effectLabel: 'Sheep Animation Effect 🐑'
    }
};

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
            sheepEffect: true
        }
    });

    // Load settings from localStorage on mount
    useEffect(() => {
        const savedSettings = localStorage.getItem('seasonalSettings');
        if (savedSettings) {
            try {
                setSettings(JSON.parse(savedSettings));
            } catch (error) {

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

            if (path === 'autoDetect' && value === false && newSettings.manualSeason === 'none') {
                newSettings.manualSeason = 'christmas';
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
            await new Promise(resolve => setTimeout(resolve, 1000));
            localStorage.setItem('seasonalSettings', JSON.stringify(settings));
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
                sheepEffect: true
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
            display: 'flex',
            flexDirection: 'column',
            p: { xs: 2, sm: 3, md: 4 }
        }}>
            {/* Header */}
            <Paper
                elevation={0}
                sx={{
                    p: 4,
                    borderRadius: 3,
                    background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                    color: 'white',
                    mb: 3,
                    position: 'relative',
                    overflow: 'hidden'
                }}
            >
                <Box sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },
                    alignItems: { xs: 'flex-start', md: 'center' },
                    justifyContent: 'space-between',
                    gap: 3,
                    position: 'relative',
                    zIndex: 1
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{
                            width: 64,
                            height: 64,
                            borderRadius: 2,
                            bgcolor: 'rgba(255,255,255,0.15)',
                            backdropFilter: 'blur(10px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '32px'
                        }}>
                            🎉
                        </Box>
                        <Box>
                            <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                                Seasonal Decorations
                            </Typography>
                            <Typography variant="body1" sx={{ opacity: 0.95 }}>
                                Bring festive joy to your dashboard
                            </Typography>
                        </Box>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <Button
                            variant="outlined"
                            size="large"
                            startIcon={<RefreshIcon />}
                            onClick={handleReset}
                            sx={{
                                borderColor: 'rgba(255,255,255,0.4)',
                                color: 'white',
                                fontWeight: 600,
                                '&:hover': {
                                    borderColor: 'rgba(255,255,255,0.6)',
                                    bgcolor: 'rgba(255,255,255,0.1)'
                                }
                            }}
                        >
                            Reset
                        </Button>
                        <Button
                            variant="contained"
                            size="large"
                            startIcon={saving ? <RefreshIcon className="spin" /> : <SaveIcon />}
                            onClick={handleSave}
                            disabled={!hasChanges || saving}
                            sx={{
                                bgcolor: 'white',
                                color: 'primary.main',
                                fontWeight: 600,
                                px: 4,
                                '&:hover': {
                                    bgcolor: 'rgba(255,255,255,0.95)',
                                    transform: 'translateY(-2px)',
                                    boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
                                },
                                transition: 'all 0.3s'
                            }}
                        >
                            {saving ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </Box>
                </Box>
            </Paper>

            {/* Status Alerts */}
            <Stack spacing={2} sx={{ mb: 3 }}>
                <Collapse in={hasChanges}>
                    <Alert
                        severity="info"
                        icon={<AutoAwesomeIcon />}
                        sx={{ borderRadius: 2 }}
                        action={
                            <Button color="inherit" size="small" variant="outlined" onClick={handleSave}>
                                Save Now
                            </Button>
                        }
                    >
                        You have unsaved changes
                    </Alert>
                </Collapse>

                {settings.enabled && currentSeason !== 'none' && (
                    <Alert severity="success" icon={<CheckCircleIcon />} sx={{ borderRadius: 2 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            🎊 Active Season: {SEASONS.find(s => s.value === currentSeason)?.label}
                        </Typography>
                    </Alert>
                )}

                {settings.enabled && currentSeason === 'none' && (
                    <Alert severity="warning" sx={{ borderRadius: 2 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                            No Season Active
                        </Typography>
                        <Typography variant="body2">
                            {settings.autoDetect
                                ? 'Auto-detect is enabled but current date does not match any seasonal period.'
                                : 'Please select a season from the dropdown below.'}
                        </Typography>
                    </Alert>
                )}
            </Stack>

            {/* Main Content - Two Column Flex Layout */}
            <Box sx={{
                display: 'flex',
                flexDirection: { xs: 'column', lg: 'row' },
                gap: 3,
                flex: 1
            }}>
                {/* Left Column - General Settings (Large) */}
                <Paper
                    elevation={0}
                    sx={{
                        flex: { xs: '1 1 100%', lg: '0 0 45%' },
                        borderRadius: 3,
                        overflow: 'hidden',
                        border: '1px solid',
                        borderColor: 'divider',
                        display: 'flex',
                        flexDirection: 'column',
                        height: 'fit-content'
                    }}
                >
                    <Box sx={{
                        p: 3,
                        bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(77, 163, 255, 0.1)' : 'primary.main',
                        color: (theme) => theme.palette.mode === 'dark' ? 'text.primary' : 'white',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        borderBottom: '1px solid',
                        borderColor: 'divider'
                    }}>
                        <Box sx={{
                            width: 48,
                            height: 48,
                            borderRadius: 2,
                            bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(77, 163, 255, 0.15)' : 'rgba(255,255,255,0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <TuneIcon sx={{ fontSize: 28, color: (theme) => theme.palette.mode === 'dark' ? 'primary.main' : 'inherit' }} />
                        </Box>
                        <Box>
                            <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                General Settings
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                Configure global preferences
                            </Typography>
                        </Box>
                    </Box>

                    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {/* Enable Decorations */}
                        <Box sx={{
                            p: 2.5,
                            borderRadius: 2,
                            border: '2px solid',
                            borderColor: settings.enabled ? 'primary.main' : 'divider',
                            bgcolor: settings.enabled ? (theme) => theme.palette.mode === 'dark' ? 'rgba(77, 163, 255, 0.05)' : 'rgba(37, 99, 235, 0.05)' : 'transparent',
                            transition: 'all 0.3s'
                        }}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={settings.enabled}
                                        onChange={(e) => handleChange('enabled', e.target.checked)}
                                        size="medium"
                                    />
                                }
                                label={
                                    <Box>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                            🎨 Enable Seasonal Decorations
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Master switch to enable/disable all decorations
                                        </Typography>
                                    </Box>
                                }
                            />
                        </Box>

                        <Divider />

                        {/* Auto-Detect */}
                        <Box sx={{
                            p: 2.5,
                            borderRadius: 2,
                            border: '2px solid',
                            borderColor: settings.autoDetect && settings.enabled ? 'info.main' : 'divider',
                            bgcolor: settings.autoDetect && settings.enabled ? (theme) => theme.palette.mode === 'dark' ? 'rgba(69, 181, 198, 0.05)' : 'rgba(59, 130, 246, 0.05)' : 'transparent',
                            transition: 'all 0.3s'
                        }}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={settings.autoDetect}
                                        onChange={(e) => handleChange('autoDetect', e.target.checked)}
                                        disabled={!settings.enabled}
                                        size="medium"
                                    />
                                }
                                label={
                                    <Box>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                            🤖 Auto-Detect Season
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Automatically detect and apply seasonal decorations
                                        </Typography>
                                    </Box>
                                }
                            />
                        </Box>

                        {/* Manual Season Override */}
                        <Collapse in={!settings.autoDetect && settings.enabled}>
                            <Box sx={{
                                p: 2.5,
                                borderRadius: 2,
                                border: '2px dashed',
                                borderColor: 'warning.main',
                                bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 205, 57, 0.05)' : 'rgba(245, 158, 11, 0.05)'
                            }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                                    🎯 Manual Season Selection
                                </Typography>
                                <TextField
                                    select
                                    fullWidth
                                    label="Choose Season"
                                    value={settings.manualSeason}
                                    onChange={(e) => handleChange('manualSeason', e.target.value)}
                                    helperText="Select a specific season to display"
                                >
                                    {SEASONS.map((season) => (
                                        <MenuItem key={season.value} value={season.value}>
                                            {season.label}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Box>
                        </Collapse>

                        <Divider />

                        {/* Opacity Slider */}
                        <Box sx={{
                            p: 2.5,
                            borderRadius: 2,
                            border: '1px solid',
                            borderColor: 'divider',
                            bgcolor: 'background.default'
                        }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                                ✨ Decorations Opacity
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Adjust the transparency of seasonal decorations
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Slider
                                    value={settings.opacity}
                                    onChange={(e, value) => handleChange('opacity', value)}
                                    min={0.1}
                                    max={1.0}
                                    step={0.1}
                                    marks
                                    disabled={!settings.enabled}
                                    valueLabelDisplay="auto"
                                    sx={{ flex: 1 }}
                                />
                                <Chip
                                    label={`${Math.round(settings.opacity * 100)}%`}
                                    color="primary"
                                    sx={{ fontWeight: 700, minWidth: 70 }}
                                />
                            </Box>
                        </Box>

                        <Divider />

                        {/* Enable on Mobile */}
                        <Box sx={{
                            p: 2.5,
                            borderRadius: 2,
                            border: '2px solid',
                            borderColor: settings.enableMobile && settings.enabled ? 'success.main' : 'divider',
                            bgcolor: settings.enableMobile && settings.enabled ? (theme) => theme.palette.mode === 'dark' ? 'rgba(92, 184, 92, 0.05)' : 'rgba(16, 185, 129, 0.05)' : 'transparent',
                            transition: 'all 0.3s'
                        }}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={settings.enableMobile}
                                        onChange={(e) => handleChange('enableMobile', e.target.checked)}
                                        disabled={!settings.enabled}
                                        size="medium"
                                    />
                                }
                                label={
                                    <Box>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                            📱 Enable on Mobile Devices
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Show decorations on mobile and tablet devices
                                        </Typography>
                                    </Box>
                                }
                            />
                        </Box>
                    </Box>
                </Paper>

                {/* Right Column - Seasonal Cards (2x2 Grid) */}
                <Box sx={{
                    flex: { xs: '1 1 100%', lg: '1 1 55%' },
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 3,
                    alignContent: 'flex-start'
                }}>
                    {/* Christmas Card */}
                    <SeasonCard
                        seasonKey="christmas"
                        config={SEASON_CONFIGS.christmas}
                        settings={settings.christmas}
                        enabled={settings.enabled}
                        onChange={handleChange}
                        messageField="message"
                        effectField="snowEffect"
                    />

                    {/* New Year Card */}
                    <SeasonCard
                        seasonKey="newyear"
                        config={SEASON_CONFIGS.newyear}
                        settings={settings.newyear}
                        enabled={settings.enabled}
                        onChange={handleChange}
                        messageField="message"
                        effectField="fireworksEffect"
                    />

                    {/* Eid al-Fitr Card */}
                    <SeasonCard
                        seasonKey="eidFitr"
                        config={SEASON_CONFIGS.eidFitr}
                        settings={settings.eidFitr}
                        enabled={settings.enabled}
                        onChange={handleChange}
                        messageFields={['messageEn', 'messageAr']}
                        effectField="crescentEffect"
                    />

                    {/* Eid al-Adha Card */}
                    <SeasonCard
                        seasonKey="eidAdha"
                        config={SEASON_CONFIGS.eidAdha}
                        settings={settings.eidAdha}
                        enabled={settings.enabled}
                        onChange={handleChange}
                        messageFields={['messageEn', 'messageAr']}
                        effectField="sheepEffect"
                    />
                </Box>
            </Box>

            {/* Floating Save Bar */}
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
                        alignItems: 'center',
                        gap: 2,
                        bgcolor: 'background.paper',
                        borderTop: '2px solid',
                        borderColor: 'primary.main',
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

// Season Card Component - Compact for 2x2 Grid
function SeasonCard({ seasonKey, config, settings, enabled, onChange, messageField, messageFields, effectField }) {
    const EffectIcon = config.icon;

    return (
        <Paper
            elevation={0}
            sx={{
                flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)' },
                minWidth: { xs: '100%', sm: '280px' },
                borderRadius: 3,
                border: '2px solid',
                borderColor: settings.enabled ? `${config.colorKey}.main` : 'divider',
                overflow: 'hidden',
                transition: 'all 0.3s',
                display: 'flex',
                flexDirection: 'column',
                '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: settings.enabled 
                        ? (theme) => `0 12px 40px ${theme.palette[config.colorKey].main}33`
                        : '0 8px 32px rgba(0,0,0,0.08)'
                }
            }}
        >
            {/* Card Header - Compact */}
            <Box sx={{
                p: 2.5,
                background: settings.enabled
                    ? (theme) => theme.palette.mode === 'dark'
                        ? `rgba(${config.colorKey === 'error' ? '228, 96, 109' : config.colorKey === 'info' ? '69, 181, 198' : config.colorKey === 'secondary' ? '156, 163, 168' : '255, 205, 57'}, 0.15)`
                        : `linear-gradient(135deg, ${theme.palette[config.colorKey].main} 0%, ${theme.palette[config.colorKey].light} 100%)`
                    : (theme) => theme.palette.mode === 'dark'
                        ? 'rgba(255, 255, 255, 0.03)'
                        : 'linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)',
                color: settings.enabled 
                    ? (theme) => theme.palette.mode === 'dark' ? `${config.colorKey}.light` : 'white'
                    : 'text.primary',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                borderBottom: '1px solid',
                borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'divider'
            }}>
                <Box sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    bgcolor: settings.enabled 
                        ? 'rgba(255,255,255,0.2)' 
                        : (theme) => theme.palette.mode === 'dark' 
                            ? 'rgba(255,255,255,0.05)' 
                            : 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '28px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                    {config.emoji}
                </Box>
                <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                        {config.title}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.85, fontSize: '0.75rem' }}>
                        {config.subtitle}
                    </Typography>
                </Box>
            </Box>

            {/* Card Content - Compact */}
            <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
                {/* Enable Toggle */}
                <FormControlLabel
                    control={
                        <Switch
                            checked={settings.enabled}
                            onChange={(e) => onChange(`${seasonKey}.enabled`, e.target.checked)}
                            disabled={!enabled}
                            size="small"
                        />
                    }
                    label={
                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                            Enable Decorations
                        </Typography>
                    }
                />

                {/* Message Field(s) - Compact */}
                {messageField && (
                    <TextField
                        fullWidth
                        size="small"
                        label="Message"
                        value={settings[messageField]}
                        onChange={(e) => onChange(`${seasonKey}.${messageField}`, e.target.value)}
                        disabled={!enabled || !settings.enabled}
                        inputProps={{ maxLength: 100 }}
                        helperText={`${settings[messageField].length}/100`}
                    />
                )}

                {messageFields && messageFields.map((field, index) => (
                    <TextField
                        key={field}
                        fullWidth
                        size="small"
                        label={field.includes('En') ? 'English' : 'العربية'}
                        value={settings[field]}
                        onChange={(e) => onChange(`${seasonKey}.${field}`, e.target.value)}
                        disabled={!enabled || !settings.enabled}
                        inputProps={{
                            maxLength: 100,
                            dir: field.includes('Ar') ? 'rtl' : 'ltr'
                        }}
                        helperText={`${settings[field].length}/100`}
                    />
                ))}

                {/* Effect Toggle - Compact */}
                <FormControlLabel
                    control={
                        <Switch
                            checked={settings[effectField]}
                            onChange={(e) => onChange(`${seasonKey}.${effectField}`, e.target.checked)}
                            disabled={!enabled || !settings.enabled}
                            size="small"
                        />
                    }
                    label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <EffectIcon sx={{ fontSize: 18 }} />
                            <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                                Animation
                            </Typography>
                        </Box>
                    }
                />
            </Box>
        </Paper>
    );
}

export default SeasonalSettingsPage;
