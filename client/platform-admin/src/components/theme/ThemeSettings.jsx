import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
  Switch,
  Grid,
  Avatar,
  Chip,
  Button,
  Divider,
  Alert,
  Stack,
} from '@mui/material';
import {
  Palette as PaletteIcon,
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useTheme } from '../../contexts/ThemeContext';

const ThemeSettings = () => {
  const { 
    currentTheme, 
    changeTheme, 
    resetTheme, 
    getAvailableThemes, 
    isCustomTheme
  } = useTheme();
  
  const [showAdvanced, setShowAdvanced] = useState(false);
  const availableThemes = getAvailableThemes();

  const themeInfo = {
    light: {
      name: 'Light Theme',
      description: 'Modern and vibrant interface with gradient accents',
      icon: <LightModeIcon />,
      color: '#6366f1',
      gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    },
    dark: {
      name: 'Dark Theme',
      description: 'Sleek dark interface with modern gradient elements',
      icon: <DarkModeIcon />,
      color: '#1f2937',
      gradient: 'linear-gradient(135deg, #1f2937 0%, #374151 100%)',
    },
  };

  const handleThemeChange = (event) => {
    changeTheme(event.target.value);
  };

  const handleReset = () => {
    resetTheme();
    setShowAdvanced(false);
  };

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PaletteIcon />
          Theme Settings
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Customize the appearance of your platform interface
        </Typography>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        The platform features a modern design system with gradient accents and contemporary colors for a fresh, professional look.
      </Alert>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card elevation={0}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Theme Selection
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Choose from our carefully crafted theme presets
              </Typography>

              <FormControl component="fieldset" fullWidth>
                <RadioGroup
                  value={isCustomTheme ? '' : currentTheme}
                  onChange={handleThemeChange}
                >
                  <Grid container spacing={2}>
                    {availableThemes.map((themeName) => {
                      const info = themeInfo[themeName];
                      if (!info) return null;

                      return (
                        <Grid item xs={12} key={themeName}>
                          <FormControlLabel
                            value={themeName}
                            control={<Radio />}
                            label={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1 }}>
                                <Avatar 
                                  sx={{ 
                                    background: info.gradient || info.color, 
                                    width: 40, 
                                    height: 40,
                                    boxShadow: '0 4px 12px -2px rgba(99, 102, 241, 0.25)'
                                  }}
                                >
                                  {info.icon}
                                </Avatar>
                                <Box>
                                  <Typography variant="body1" fontWeight="600">
                                    {info.name}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {info.description}
                                  </Typography>
                                </Box>
                              </Box>
                            }
                            sx={{
                              m: 0,
                              p: 2,
                              border: '1px solid',
                              borderColor: 'divider',
                              borderRadius: 2,
                              '&:hover': {
                                bgcolor: 'action.hover',
                              },
                              '& .MuiFormControlLabel-label': {
                                flex: 1,
                              },
                            }}
                          />
                        </Grid>
                      );
                    })}
                  </Grid>
                </RadioGroup>
              </FormControl>

              <Divider sx={{ my: 4 }} />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" fontWeight="bold">
                  Advanced Options
                </Typography>
                <Switch
                  checked={showAdvanced}
                  onChange={(e) => setShowAdvanced(e.target.checked)}
                />
              </Box>

              {showAdvanced && (
                <Box sx={{ mt: 3 }}>
                  <Alert severity="info" sx={{ mb: 3 }}>
                    The platform features modern gradient designs and contemporary colors. 
                    Advanced customization includes glass morphism effects and smooth animations.
                  </Alert>
                  
                  <Stack direction="row" spacing={2}>
                    <Button
                      variant="outlined"
                      startIcon={<RefreshIcon />}
                      onClick={handleReset}
                    >
                      Reset to Light Theme
                    </Button>
                  </Stack>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card elevation={0}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Current Theme
              </Typography>
              
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <Avatar 
                  sx={{ 
                    background: themeInfo[currentTheme]?.gradient || themeInfo[currentTheme]?.color || '#6366f1',
                    width: 80, 
                    height: 80,
                    mx: 'auto',
                    mb: 2,
                    boxShadow: '0 8px 20px -5px rgba(99, 102, 241, 0.25)'
                  }}
                >
                  {themeInfo[currentTheme]?.icon || <LightModeIcon sx={{ fontSize: 40 }} />}
                </Avatar>
                
                <Typography variant="h6" fontWeight="bold">
                  {themeInfo[currentTheme]?.name || 'Light Theme'}
                </Typography>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {themeInfo[currentTheme]?.description || 'Clean and bright interface'}
                </Typography>

                <Chip 
                  label={currentTheme}
                  color="primary"
                  variant="outlined"
                />
              </Box>

              <Divider sx={{ my: 3 }} />

              <Typography variant="body2" color="text.secondary">
                <strong>Theme Features:</strong>
              </Typography>
              <Box component="ul" sx={{ mt: 1, pl: 2, '& li': { mb: 0.5 } }}>
                <li>
                  <Typography variant="body2" color="text.secondary">
                    Modern gradient design
                  </Typography>
                </li>
                <li>
                  <Typography variant="body2" color="text.secondary">
                    Glass morphism effects
                  </Typography>
                </li>
                <li>
                  <Typography variant="body2" color="text.secondary">
                    Light and dark modes
                  </Typography>
                </li>
                <li>
                  <Typography variant="body2" color="text.secondary">
                    Accessibility compliant
                  </Typography>
                </li>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ThemeSettings;