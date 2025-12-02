import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { themeService } from '../services';
import { designTokens, applyCSSVariables } from '../theme/designTokens';
import { validateThemeConfig, validateAccessibility, sanitizeThemeConfig } from '../theme/themeValidation';

const ThemeContext = createContext();

export const useThemeConfig = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useThemeConfig must be used within ThemeProvider');
    }
    return context;
};

export const ThemeConfigProvider = ({ children }) => {
    const [themeConfig, setThemeConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [colorMode, setColorMode] = useState(() => {
        // Load saved theme mode from localStorage
        const savedMode = localStorage.getItem('themeMode');
        return savedMode || 'light';
    });

    // Fetch theme configuration from API
    useEffect(() => {
        const fetchTheme = async () => {
            try {
                const config = await themeService.getTheme();
                
                // Validate theme configuration
                const validation = validateThemeConfig(config);
                if (!validation.isValid) {

                }
                
                // Check accessibility
                const accessibility = validateAccessibility(config);
                if (!accessibility.isAccessible) {

                }
                
                // Sanitize theme to fill in any missing values
                const sanitizedConfig = sanitizeThemeConfig(config, getDefaultTheme());
                setThemeConfig(sanitizedConfig);
            } catch (error) {

                // Use default theme if fetch fails
                setThemeConfig(getDefaultTheme());
            } finally {
                setLoading(false);
            }
        };

        fetchTheme();
    }, []);

    // Apply CSS variables when color mode changes
    useEffect(() => {
        const isDark = colorMode === 'dark';
        applyCSSVariables(isDark);
        
        // Save theme mode to localStorage
        localStorage.setItem('themeMode', colorMode);
    }, [colorMode]);

    // Create Material-UI theme from configuration
    const theme = useMemo(() => {
        if (!themeConfig) return createTheme();

        const isDark = colorMode === 'dark';
        const currentPalette = isDark ? themeConfig.dark : themeConfig.light;

        return createTheme({
            palette: {
                mode: colorMode,
                primary: currentPalette.primary,
                secondary: currentPalette.secondary,
                success: currentPalette.success,
                error: currentPalette.error,
                warning: currentPalette.warning,
                info: currentPalette.info,
                background: currentPalette.background,
                text: currentPalette.text,
                divider: isDark ? '#495057' : '#dee2e6',
            },
            typography: {
                fontFamily: themeConfig.typography?.fontFamily || '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
                fontSize: themeConfig.typography?.fontSize || 14,
                h1: {
                    fontSize: '2.5rem',
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    lineHeight: 1.2,
                },
                h2: {
                    fontSize: '2rem',
                    fontWeight: 700,
                    letterSpacing: '-0.01em',
                    lineHeight: 1.3,
                },
                h3: {
                    fontSize: '1.75rem',
                    fontWeight: 600,
                    letterSpacing: '-0.01em',
                    lineHeight: 1.3,
                },
                h4: {
                    fontSize: '1.5rem',
                    fontWeight: 600,
                    letterSpacing: '-0.01em',
                    lineHeight: 1.4,
                },
                h5: {
                    fontSize: '1.25rem',
                    fontWeight: 600,
                    lineHeight: 1.4,
                },
                h6: {
                    fontSize: '1rem',
                    fontWeight: 600,
                    lineHeight: 1.5,
                },
                body1: {
                    fontSize: '1rem',
                    lineHeight: 1.6,
                },
                body2: {
                    fontSize: '0.875rem',
                    lineHeight: 1.6,
                },
                button: {
                    fontWeight: 500,
                    letterSpacing: '0.02em',
                },
            },
            shape: {
                borderRadius: themeConfig.shape?.borderRadius || 12,
            },
            spacing: themeConfig.spacing || 8,
            components: {
                MuiButton: {
                    styleOverrides: {
                        root: {
                            textTransform: 'none',
                            borderRadius: (themeConfig.shape?.borderRadius || 12) * 0.67,
                            fontWeight: 500,
                            padding: '8px 16px',
                            boxShadow: 'none',
                            '&:hover': {
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                            },
                        },
                        contained: {
                            '&:hover': {
                                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
                            },
                        },
                        sizeLarge: {
                            padding: '12px 24px',
                            fontSize: '1rem',
                        },
                    },
                },
                MuiCard: {
                    styleOverrides: {
                        root: {
                            borderRadius: themeConfig.shape?.borderRadius || 12,
                            boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
                            border: '1px solid',
                            borderColor: 'var(--mui-palette-divider)',
                        },
                    },
                },
                MuiCardContent: {
                    styleOverrides: {
                        root: {
                            padding: '24px',
                            '&:last-child': {
                                paddingBottom: '24px',
                            },
                        },
                    },
                },
                MuiTextField: {
                    defaultProps: {
                        variant: 'outlined',
                    },
                    styleOverrides: {
                        root: {
                            '& .MuiOutlinedInput-root': {
                                borderRadius: (themeConfig.shape?.borderRadius || 12) * 0.67,
                            },
                        },
                    },
                },
                MuiPaper: {
                    styleOverrides: {
                        root: {
                            backgroundImage: 'none',
                        },
                        elevation1: {
                            boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                        },
                        elevation2: {
                            boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
                        },
                    },
                },
                MuiChip: {
                    styleOverrides: {
                        root: {
                            borderRadius: (themeConfig.shape?.borderRadius || 12) * 0.5,
                            fontWeight: 500,
                        },
                    },
                },
            },
        });
    }, [themeConfig, colorMode]);

    // Memoize the update function to prevent unnecessary re-renders
    const updateThemeConfig = useCallback((newConfig) => {
        setThemeConfig(newConfig);
    }, []);

    // Memoize the toggle function to prevent unnecessary re-renders
    const toggleColorMode = useCallback(() => {
        setColorMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
    }, []);

    // Memoize context value to prevent unnecessary re-renders
    const value = useMemo(() => ({
        themeConfig,
        setThemeConfig: updateThemeConfig,
        colorMode,
        setColorMode,
        toggleColorMode,
        loading,
        designTokens, // Expose design tokens via context
    }), [themeConfig, colorMode, loading, updateThemeConfig, toggleColorMode]);

    if (loading) {
        return null; // Or a loading spinner
    }

    return (
        <ThemeContext.Provider value={value}>
            <MuiThemeProvider theme={theme}>
                {children}
            </MuiThemeProvider>
        </ThemeContext.Provider>
    );
};

// Default theme configuration
const getDefaultTheme = () => ({
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
});
