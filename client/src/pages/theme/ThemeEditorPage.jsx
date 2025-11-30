/**
 * Theme Editor Page
 * 
 * Admin page for customizing the application theme and color palette:
 * - Primary, Secondary, Success, Error, Warning, Info colors
 * - Light and Dark mode color schemes
 * - Typography settings
 * - Border radius and spacing
 * - Live preview of changes
 */

import React, { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    TextField,
    Button,
    Grid,
    Tabs,
    Tab,
    Card,
    CardContent,
    Divider,
    Chip,
    Avatar,
    Alert,
    Switch,
    FormControlLabel,
    Slider,
} from '@mui/material';
import {
    Save as SaveIcon,
    Cancel as CancelIcon,
    Palette as PaletteIcon,
    Brightness4 as DarkModeIcon,
    Brightness7 as LightModeIcon,
    Refresh as ResetIcon,
    Visibility as PreviewIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../../context/NotificationContext';
import { useThemeConfig } from '../../context/ThemeContext';
import { themeService } from '../../services';

const ThemeEditorPage = () => {
    const navigate = useNavigate();
    const { showSuccess, showError } = useNotification();
    const { themeConfig: globalThemeConfig, setThemeConfig: setGlobalThemeConfig } = useThemeConfig();
    const [activeTab, setActiveTab] = useState(0);
    const [colorMode, setColorMode] = useState('light');
    const [saving, setSaving] = useState(false);

    // Local theme configuration state (for live preview)
    const [themeConfig, setThemeConfig] = useState(globalThemeConfig);

    // Update local state when global theme changes
    useEffect(() => {
        if (globalThemeConfig) {
            setThemeConfig(globalThemeConfig);
        }
    }, [globalThemeConfig]);

    const handleColorChange = (mode, colorType, shade, value) => {
        const newConfig = {
            ...themeConfig,
            [mode]: {
                ...themeConfig[mode],
                [colorType]: {
                    ...themeConfig[mode][colorType],
                    [shade]: value,
                },
            },
        };
        setThemeConfig(newConfig);
        // Apply live preview
        setGlobalThemeConfig(newConfig);
    };

    const handleTypographyChange = (field, value) => {
        const newConfig = {
            ...themeConfig,
            typography: {
                ...themeConfig.typography,
                [field]: value,
            },
        };
        setThemeConfig(newConfig);
        // Apply live preview
        setGlobalThemeConfig(newConfig);
    };

    const handleShapeChange = (field, value) => {
        const newConfig = {
            ...themeConfig,
            shape: {
                ...themeConfig.shape,
                [field]: value,
            },
        };
        setThemeConfig(newConfig);
        // Apply live preview
        setGlobalThemeConfig(newConfig);
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            // Save theme configuration to API
            await themeService.updateTheme(themeConfig);
            showSuccess('Theme configuration saved successfully');
            navigate('/app/dashboard');
        } catch (error) {
            showError('Failed to save theme configuration');
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        // Reset to default theme
        const defaultConfig = {
            light: {
                primary: { main: '#007bff', light: '#4da3ff', dark: '#0056b3' },
                secondary: { main: '#6c757d', light: '#9ca3a8', dark: '#495057' },
                success: { main: '#28a745', light: '#5cb85c', dark: '#1e7e34' },
                error: { main: '#dc3545', light: '#e4606d', dark: '#bd2130' },
                warning: { main: '#ffc107', light: '#ffcd39', dark: '#d39e00' },
                info: { main: '#17a2b8', light: '#45b5c6', dark: '#117a8b' },
                background: { default: '#f8f9fa', paper: '#ffffff' },
                text: { primary: '#212529', secondary: '#6c757d' },
            },
            dark: {
                primary: { main: '#4da3ff', light: '#80bdff', dark: '#007bff' },
                secondary: { main: '#9ca3a8', light: '#c1c6ca', dark: '#6c757d' },
                success: { main: '#5cb85c', light: '#7ec87e', dark: '#28a745' },
                error: { main: '#e4606d', light: '#ea8089', dark: '#dc3545' },
                warning: { main: '#ffcd39', light: '#ffd966', dark: '#ffc107' },
                info: { main: '#45b5c6', light: '#6dc5d3', dark: '#17a2b8' },
                background: { default: '#1a1d23', paper: '#25282e' },
                text: { primary: '#f8f9fa', secondary: '#adb5bd' },
            },
            typography: {
                fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
                fontSize: 14,
            },
            shape: {
                borderRadius: 12,
            },
            spacing: 8,
        };
        setThemeConfig(defaultConfig);
        // Apply live preview
        setGlobalThemeConfig(defaultConfig);
        showSuccess('Theme reset to defaults');
    };

    const ColorPicker = ({ label, value, onChange, description }) => (
        <Box sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight="600" sx={{ mb: 1 }}>
                {label}
            </Typography>
            {description && (
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                    {description}
                </Typography>
            )}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Box
                    sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 2,
                        bgcolor: value,
                        border: '2px solid',
                        borderColor: 'divider',
                        cursor: 'pointer',
                    }}
                    component="label"
                >
                    <input
                        type="color"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        style={{ opacity: 0, width: 0, height: 0 }}
                    />
                </Box>
                <TextField
                    size="small"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    sx={{ flex: 1 }}
                    placeholder="#000000"
                />
            </Box>
        </Box>
    );

    const ColorSection = ({ title, colors, mode }) => (
        <Paper sx={{ p: 3, mb: 3, borderRadius: 3, boxShadow: 2 }}>
            <Typography variant="h6" fontWeight="600" sx={{ mb: 3 }}>
                {title}
            </Typography>
            <Grid container spacing={3}>
                {Object.entries(colors).map(([colorType, shades]) => (
                    <Grid size={{ xs: 12, md: 6 }} key={colorType}>
                        <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                            <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 2, textTransform: 'capitalize' }}>
                                {colorType}
                            </Typography>
                            {typeof shades === 'object' && !Array.isArray(shades) ? (
                                Object.entries(shades).map(([shade, value]) => (
                                    <ColorPicker
                                        key={shade}
                                        label={shade.charAt(0).toUpperCase() + shade.slice(1)}
                                        value={value}
                                        onChange={(newValue) => handleColorChange(mode, colorType, shade, newValue)}
                                    />
                                ))
                            ) : null}
                        </Box>
                    </Grid>
                ))}
            </Grid>
        </Paper>
    );

    return (
        <Box
            sx={{
                p: { xs: 2, sm: 3, md: 4 },
                maxWidth: 1600,
                mx: 'auto',
            }}
        >
            {/* Header */}
            <Box sx={{ mb: 4 }}>
                <Typography
                    variant="h4"
                    component="h1"
                    sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}
                >
                    Theme & Color Palette Editor
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                    Customize the application's colors, typography, and visual style
                </Typography>
            </Box>

            {/* Alert */}
            <Alert severity="info" sx={{ mb: 3 }} icon={<PreviewIcon />}>
                <strong>Live Preview Active:</strong> All changes are previewed in real-time. Click "Save Theme" to apply them permanently across the system.
            </Alert>

            {/* Tabs */}
            <Paper sx={{ mb: 3, borderRadius: 3, boxShadow: 2 }}>
                <Tabs
                    value={activeTab}
                    onChange={(e, newValue) => setActiveTab(newValue)}
                    sx={{ borderBottom: 1, borderColor: 'divider' }}
                >
                    <Tab label="Color Palette" icon={<PaletteIcon />} iconPosition="start" />
                    <Tab label="Typography" />
                    <Tab label="Layout" />
                    <Tab label="Preview" icon={<PreviewIcon />} iconPosition="start" />
                </Tabs>
            </Paper>

            {/* Tab Content */}
            {activeTab === 0 && (
                <Box>
                    {/* Mode Toggle */}
                    <Paper sx={{ p: 3, mb: 3, borderRadius: 3, boxShadow: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography variant="h6" fontWeight="600">
                                Color Mode
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button
                                    variant={colorMode === 'light' ? 'contained' : 'outlined'}
                                    startIcon={<LightModeIcon />}
                                    onClick={() => setColorMode('light')}
                                >
                                    Light Mode
                                </Button>
                                <Button
                                    variant={colorMode === 'dark' ? 'contained' : 'outlined'}
                                    startIcon={<DarkModeIcon />}
                                    onClick={() => setColorMode('dark')}
                                >
                                    Dark Mode
                                </Button>
                            </Box>
                        </Box>
                    </Paper>

                    {/* Color Sections */}
                    <ColorSection
                        title={`${colorMode === 'light' ? 'Light' : 'Dark'} Mode - Brand Colors`}
                        colors={{
                            primary: themeConfig[colorMode].primary,
                            secondary: themeConfig[colorMode].secondary,
                        }}
                        mode={colorMode}
                    />

                    <ColorSection
                        title={`${colorMode === 'light' ? 'Light' : 'Dark'} Mode - Status Colors`}
                        colors={{
                            success: themeConfig[colorMode].success,
                            error: themeConfig[colorMode].error,
                            warning: themeConfig[colorMode].warning,
                            info: themeConfig[colorMode].info,
                        }}
                        mode={colorMode}
                    />

                    <ColorSection
                        title={`${colorMode === 'light' ? 'Light' : 'Dark'} Mode - Background & Text`}
                        colors={{
                            background: themeConfig[colorMode].background,
                            text: themeConfig[colorMode].text,
                        }}
                        mode={colorMode}
                    />
                </Box>
            )}

            {activeTab === 1 && (
                <Paper sx={{ p: 3, borderRadius: 3, boxShadow: 2 }}>
                    <Typography variant="h6" fontWeight="600" sx={{ mb: 3 }}>
                        Typography Settings
                    </Typography>
                    <Grid container spacing={3}>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                                fullWidth
                                label="Font Family"
                                value={themeConfig.typography.fontFamily}
                                onChange={(e) => handleTypographyChange('fontFamily', e.target.value)}
                                helperText="CSS font-family value"
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Typography variant="body2" fontWeight="600" sx={{ mb: 1 }}>
                                Base Font Size: {themeConfig.typography.fontSize}px
                            </Typography>
                            <Slider
                                value={themeConfig.typography.fontSize}
                                onChange={(e, value) => handleTypographyChange('fontSize', value)}
                                min={12}
                                max={18}
                                step={1}
                                marks
                                valueLabelDisplay="auto"
                            />
                        </Grid>
                    </Grid>

                    <Divider sx={{ my: 3 }} />

                    <Typography variant="h6" fontWeight="600" sx={{ mb: 2 }}>
                        Typography Preview
                    </Typography>
                    <Box sx={{ p: 3, bgcolor: 'background.default', borderRadius: 2 }}>
                        <Typography variant="h1" gutterBottom>Heading 1</Typography>
                        <Typography variant="h2" gutterBottom>Heading 2</Typography>
                        <Typography variant="h3" gutterBottom>Heading 3</Typography>
                        <Typography variant="h4" gutterBottom>Heading 4</Typography>
                        <Typography variant="h5" gutterBottom>Heading 5</Typography>
                        <Typography variant="h6" gutterBottom>Heading 6</Typography>
                        <Typography variant="body1" gutterBottom>Body 1 - Regular paragraph text</Typography>
                        <Typography variant="body2" gutterBottom>Body 2 - Smaller paragraph text</Typography>
                        <Typography variant="caption" display="block">Caption text</Typography>
                    </Box>
                </Paper>
            )}

            {activeTab === 2 && (
                <Paper sx={{ p: 3, borderRadius: 3, boxShadow: 2 }}>
                    <Typography variant="h6" fontWeight="600" sx={{ mb: 3 }}>
                        Layout Settings
                    </Typography>
                    <Grid container spacing={3}>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Typography variant="body2" fontWeight="600" sx={{ mb: 1 }}>
                                Border Radius: {themeConfig.shape.borderRadius}px
                            </Typography>
                            <Slider
                                value={themeConfig.shape.borderRadius}
                                onChange={(e, value) => handleShapeChange('borderRadius', value)}
                                min={0}
                                max={24}
                                step={2}
                                marks
                                valueLabelDisplay="auto"
                            />
                            <Typography variant="caption" color="text.secondary">
                                Controls the roundness of corners for cards, buttons, and inputs
                            </Typography>
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Typography variant="body2" fontWeight="600" sx={{ mb: 1 }}>
                                Spacing Unit: {themeConfig.spacing}px
                            </Typography>
                            <Slider
                                value={themeConfig.spacing}
                                onChange={(e, value) => {
                                    const newConfig = { ...themeConfig, spacing: value };
                                    setThemeConfig(newConfig);
                                    setGlobalThemeConfig(newConfig);
                                }}
                                min={4}
                                max={16}
                                step={2}
                                marks
                                valueLabelDisplay="auto"
                            />
                            <Typography variant="caption" color="text.secondary">
                                Base spacing unit for margins and padding
                            </Typography>
                        </Grid>
                    </Grid>

                    <Divider sx={{ my: 3 }} />

                    <Typography variant="h6" fontWeight="600" sx={{ mb: 2 }}>
                        Layout Preview
                    </Typography>
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>Card Example</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        This card uses the current border radius setting
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <Button variant="contained">Primary Button</Button>
                                <Button variant="outlined">Outlined Button</Button>
                            </Box>
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                <Chip label="Chip 1" />
                                <Chip label="Chip 2" color="primary" />
                                <Chip label="Chip 3" color="success" />
                            </Box>
                        </Grid>
                    </Grid>
                </Paper>
            )}

            {activeTab === 3 && (
                <Paper sx={{ p: 3, borderRadius: 3, boxShadow: 2 }}>
                    <Typography variant="h6" fontWeight="600" sx={{ mb: 3 }}>
                        Theme Preview
                    </Typography>
                    <Grid container spacing={3}>
                        {/* Color Swatches */}
                        <Grid size={{ xs: 12 }}>
                            <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 2 }}>
                                Color Palette
                            </Typography>
                            <Grid container spacing={2}>
                                {['primary', 'secondary', 'success', 'error', 'warning', 'info'].map((color) => (
                                    <Grid size={{ xs: 6, sm: 4, md: 2 }} key={color}>
                                        <Box sx={{ textAlign: 'center' }}>
                                            <Box
                                                sx={{
                                                    width: '100%',
                                                    height: 80,
                                                    bgcolor: themeConfig[colorMode][color].main,
                                                    borderRadius: 2,
                                                    mb: 1,
                                                    border: '1px solid',
                                                    borderColor: 'divider',
                                                }}
                                            />
                                            <Typography variant="caption" fontWeight="600" sx={{ textTransform: 'capitalize' }}>
                                                {color}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                ))}
                            </Grid>
                        </Grid>

                        {/* Component Examples */}
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Card>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                        <Avatar sx={{ bgcolor: 'primary.main' }}>JD</Avatar>
                                        <Box>
                                            <Typography variant="h6">John Doe</Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                john.doe@example.com
                                            </Typography>
                                        </Box>
                                    </Box>
                                    <Divider sx={{ my: 2 }} />
                                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                        <Chip label="Active" color="success" size="small" />
                                        <Chip label="Employee" color="primary" size="small" />
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid size={{ xs: 12, md: 6 }}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <Button variant="contained" color="primary" fullWidth>
                                    Primary Action
                                </Button>
                                <Button variant="contained" color="success" fullWidth>
                                    Success Action
                                </Button>
                                <Button variant="contained" color="error" fullWidth>
                                    Delete Action
                                </Button>
                                <Button variant="outlined" fullWidth>
                                    Secondary Action
                                </Button>
                            </Box>
                        </Grid>
                    </Grid>
                </Paper>
            )}

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mt: 4 }}>
                <Button
                    variant="outlined"
                    startIcon={<ResetIcon />}
                    onClick={handleReset}
                    color="warning"
                >
                    Reset to Defaults
                </Button>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                        variant="outlined"
                        startIcon={<CancelIcon />}
                        onClick={() => navigate('/app/dashboard')}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<SaveIcon />}
                        onClick={handleSave}
                        disabled={saving}
                    >
                        {saving ? 'Saving...' : 'Save Theme'}
                    </Button>
                </Box>
            </Box>
        </Box>
    );
};

export default ThemeEditorPage;
